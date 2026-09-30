/** Run against the app: node scripts/verify-3d.mjs.
 * Options: BASE_URL, CHROME_PATH, BROWSER=webkit, VERIFY_QUICK=1.
 * Screenshots/results go to the OS temporary directory.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, webkit } from "playwright-core";

const engine = process.env.BROWSER ?? "chromium";
const output = join(tmpdir(), "blocksystem-3d-verification", engine);
const results = { engine, checks: [], consoleErrors: [], pageErrors: [], warnings: [], failedRequests: [] };
await mkdir(output, { recursive: true });
const browser = await (engine === "webkit" ? webkit.launch({ headless: true }) : chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--enable-webgl", "--use-angle=swiftshader-webgl"],
}));
const matrix = {
  phone: [[320,568],[360,800],[375,667],[375,812],[390,844],[393,852],[414,896],[430,932],[568,320],[667,375],[812,375],[844,390],[852,393],[896,414],[932,430]],
  tablet: [[768,1024],[820,1180],[1024,1366]],
  desktop: [[1280,720],[1366,768],[1440,900],[1920,1080]],
};

function record(name, evidence) {
  results.checks.push({ name, status: "PASS", evidence });
  console.log(`PASS ${name}`);
}

// Read the existing Fiber store through Canvas hooks; no production instrumentation.
function installSceneReader() {
  window.readPreviewState = () => {
    const canvas = document.querySelector("#three-canvas canvas");
    if (!canvas) return null;
    for (let fiber = canvas[Object.keys(canvas).find((key) => key.startsWith("__reactFiber"))]; fiber; fiber = fiber.return) {
      for (let hook = fiber.memoizedState; hook; hook = hook.next) {
        const current = hook.memoizedState?.current;
        if (current?.camera && current?.gl && current?.scene) return current.get?.() ?? current;
      }
    }
    return null;
  };
}

async function newPage(kind = "phone") {
  const context = await browser.newContext({
    viewport: { width: kind === "desktop" ? 1440 : 390, height: kind === "desktop" ? 900 : 844 },
    isMobile: kind !== "desktop",
    hasTouch: kind !== "desktop",
    deviceScaleFactor: kind === "desktop" ? 1 : 3,
  });
  const page = await context.newPage();
  await page.addInitScript(installSceneReader);
  page.on("console", (message) => {
    if (message.type() === "error") results.consoleErrors.push(message.text());
    if (message.type() === "warning" && !results.warnings.includes(message.text())) results.warnings.push(message.text());
  });
  page.on("pageerror", (error) => results.pageErrors.push(String(error)));
  page.on("requestfailed", (request) => results.failedRequests.push({ url: request.url(), reason: request.failure()?.errorText }));
  await page.goto(process.env.BASE_URL ?? "http://localhost:3010", { waitUntil: "networkidle" });
  await page.locator("#room-room-1-length").fill("5");
  await page.locator("#room-room-1-width").fill("4");
  await page.locator("#room-room-1-height").fill("3");
  return page;
}

async function settled(page) {
  await page.waitForFunction(() => {
    const state = window.readPreviewState();
    const canvas = document.querySelector("#three-canvas canvas");
    return state?.controls && state.scene.getObjectByName("preview-model") && canvas?.getBoundingClientRect().height > 0 && state.gl.info.render.calls > 0;
  }, null, { timeout: 25000 });
  await page.waitForTimeout(450);
}

async function open(page) {
  await page.locator("#room-preview button").click();
  await settled(page);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const state = window.readPreviewState();
    if (!state) throw new Error("Cannot inspect live R3F store");
    const { camera, gl, controls, scene, size } = state;
    const canvas = gl.domElement;
    const root = canvas.closest(".three-workspace");
    const model = scene.getObjectByName("preview-model");
    const projected = [];
    const world = [];
    let meshes = 0;
    model.updateWorldMatrix(true, true);
    model.traverseVisible((object) => {
      if (!object.isMesh || !object.geometry) return;
      meshes++;
      object.geometry.computeBoundingBox();
      const bounds = object.geometry.boundingBox;
      if (!bounds) return;
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const point = camera.position.clone().set(x, y, z).applyMatrix4(object.matrixWorld);
        world.push(point.toArray());
        projected.push(point.project(camera).toArray());
      }
    });
    const extent = (points) => ({ min: [0,1,2].map((axis) => Math.min(...points.map((point) => point[axis]))), max: [0,1,2].map((axis) => Math.max(...points.map((point) => point[axis]))) });
    const rendererSize = gl.getSize(camera.position.clone());
    return {
      viewport: { width: innerWidth, height: innerHeight, visualWidth: visualViewport?.width, visualHeight: visualViewport?.height },
      root: root.getBoundingClientRect().toJSON(), canvas: canvas.getBoundingClientRect().toJSON(), rootParent: root.parentElement.tagName,
      buffer: { width: canvas.width, height: canvas.height }, renderer: { width: rendererSize.x, height: rendererSize.y, dpr: gl.getPixelRatio(), calls: gl.info.render.calls }, r3fSize: { width: size.width, height: size.height },
      camera: { aspect: camera.aspect, position: camera.position.toArray(), target: controls.target.toArray(), distance: camera.position.distanceTo(controls.target), uuid: camera.uuid },
      model: { meshes, world: extent(world), projected: extent(projected) }, direction: document.documentElement.dir, language: document.documentElement.lang,
      body: { position: getComputedStyle(document.body).position, overflow: getComputedStyle(document.body).overflow }, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      canvasCount: document.querySelectorAll("#three-canvas canvas").length,
      visibleControls: Array.from(root.querySelectorAll("button")).filter((element) => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden").map((element) => ({ label: element.getAttribute("aria-label") || element.textContent.trim(), rect: element.getBoundingClientRect().toJSON() })),
    };
  });
}

function checkLayout(value, phone) {
  assert.equal(value.rootParent, "BODY", "Viewer escapes layout through portal");
  assert.equal(value.canvasCount, 1, "Only one shared canvas");
  assert.equal(value.body.position, "fixed", "Background page scroll lock");
  assert.equal(value.horizontalOverflow, false, "No horizontal document overflow");
  assert.ok(value.canvas.width > 0 && value.canvas.height > 0, "Visible canvas has non-zero dimensions");
  assert.ok(Math.abs(value.root.width - value.viewport.visualWidth) < 1.5, "Root uses visible width");
  assert.ok(Math.abs(value.root.height - value.viewport.visualHeight) < 1.5, "Root uses visible height");
  assert.ok(Math.abs(value.renderer.width - value.canvas.width) < 1.5 && Math.abs(value.renderer.height - value.canvas.height) < 1.5, "Renderer uses canvas dimensions");
  assert.ok(Math.abs(value.camera.aspect - value.canvas.width / value.canvas.height) < 0.01, "Camera uses canvas aspect");
  assert.ok(value.renderer.dpr <= 2, "High density display DPR capped");
  assert.ok(value.model.meshes >= 4 && value.renderer.calls > 0, "Building geometry rendered");
  assert.ok(value.model.projected.min[0] >= -1 && value.model.projected.max[0] <= 1 && value.model.projected.min[1] >= -1 && value.model.projected.max[1] <= 1, `Model inside camera bounds: ${JSON.stringify(value.model.projected)}`);
  assert.ok(value.model.projected.min[2] > -1 && value.model.projected.max[2] < 1, "Model between near/far planes");
  assert.ok(Math.max(value.model.projected.max[0] - value.model.projected.min[0], value.model.projected.max[1] - value.model.projected.min[1]) >= 0.45, "Model not microscopic");
  if (phone) {
    assert.ok(Math.abs(value.canvas.x) < 1.5 && Math.abs(value.canvas.y) < 1.5, "Canvas starts at viewport origin");
    assert.ok(Math.abs(value.canvas.width - value.root.width) < 1.5 && Math.abs(value.canvas.height - value.root.height) < 1.5, "Canvas covers phone screen");
  }
  for (const control of value.visibleControls) assert.ok(control.rect.x >= -1 && control.rect.y >= -1 && control.rect.right <= value.root.right + 1 && control.rect.bottom <= value.root.bottom + 1, `Visible control inside viewport: ${control.label}`);
}

async function gestures(page) {
  if (engine !== "chromium") {
    results.checks.push({ name: "touch orbit/pinch/pan", status: "NOT TESTABLE", evidence: "WebKit has no multi-touch injection API; Chromium CDP verifies OrbitControls response." });
    return;
  }
  const session = await page.context().newCDPSession(page);
  const send = (type, points) => session.send("Input.dispatchTouchEvent", { type, touchPoints: points.map(([id,x,y]) => ({ id, x, y, radiusX: 4, radiusY: 4, force: 1 })) });
  const drag = async (start, end) => {
    await send("touchStart", start);
    for (let step=1;step<=8;step++) {
      await send("touchMove", start.map(([id,x,y],index) => [id,x+(end[index][1]-x)*step/8,y+(end[index][2]-y)*step/8]));
      await page.waitForTimeout(25);
    }
    await send("touchEnd", []);
    await page.waitForTimeout(500);
  };
  const delta = (a,b) => Math.hypot(...a.map((value,index)=>value-b[index]));
  let before = await snapshot(page);
  await drag([[0,160,470]],[[0,245,505]]);
  let after = await snapshot(page);
  assert.ok(delta(before.camera.position,after.camera.position)>0.05,"One-finger gesture orbits camera");
  record("one-finger touch orbit", { before: before.camera.position, after: after.camera.position });
  before=after;
  await drag([[0,130,450],[1,260,450]],[[0,95,450],[1,295,450]]);
  after=await snapshot(page);
  assert.ok(Math.abs(before.camera.distance-after.camera.distance)>0.05,"Pinch changes camera distance");
  record("two-finger pinch zoom", { before: before.camera.distance, after: after.camera.distance });
  before=after;
  await drag([[0,130,430],[1,250,430]],[[0,150,485],[1,270,485]]);
  after=await snapshot(page);
  assert.ok(delta(before.camera.target,after.camera.target)>0.02,"Two-finger drag pans target");
  record("two-finger pan", { before: before.camera.target, after: after.camera.target });
  await session.detach();
}

async function close(page) {
  await page.locator("[data-preview-close]").click();
  await page.locator(".three-workspace").waitFor({ state: "detached" });
  await page.waitForTimeout(150);
}

async function changeLanguage(page, language) {
  await page.locator('[aria-controls="app-menu"]').click();
  await page.locator("#app-menu select").selectOption(language);
  await page.locator("#app-menu button[aria-label]").first().click();
  await page.waitForFunction((expected) => document.documentElement.lang === expected, language);
}

async function formState(page) {
  return page.evaluate(() => ({ values: Array.from(document.querySelectorAll("main input, main select")).map((element)=>[element.id,element.value]), language: localStorage.getItem("blocksystem:language"), bodyStyle: document.body.getAttribute("style") ?? "", htmlOverflow: document.documentElement.style.overflow }));
}

try {
  for (const [kind, sizes] of Object.entries(matrix)) {
    const page=await newPage(kind);
    await open(page);
    const firstCamera=(await snapshot(page)).camera.uuid;
    for (const [width,height] of process.env.VERIFY_QUICK ? sizes.filter((_,index)=>index===0) : sizes) {
      await page.setViewportSize({width,height});
      await settled(page);
      const value=await snapshot(page);
      checkLayout(value,kind==="phone");
      assert.equal(value.camera.uuid,firstCamera,"Resize preserves renderer/scene instance");
      record(`${kind} ${width}x${height}`,value);
      if (["390x844","844x390","768x1024","1440x900","320x568"].includes(`${width}x${height}`)) await page.screenshot({path:join(output,`${kind}-${width}x${height}.png`)});
    }
    await close(page);
    await page.context().close();
  }

  const page=await newPage();
  await changeLanguage(page,"en-GB");
  await page.getByRole("button",{name:"Add door",exact:true}).click();
  await page.locator('input[id*="-door-"][id$="-width"]').fill("0.9");
  await page.locator('input[id*="-door-"][id$="-height"]').fill("2.1");
  await page.getByRole("button",{name:"Add window",exact:true}).click();
  await page.locator('input[id*="-window-"][id$="-width"]').fill("1.2");
  await page.locator('input[id*="-window-"][id$="-height"]:not([id$="-sill-height"])').fill("1.1");
  await page.locator("#room-preview button").scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  const before=await formState(page);
  const previousScroll=await page.evaluate(()=>scrollY);
  await open(page);
  const initial=await snapshot(page);
  assert.ok(initial.model.meshes>10,"Door/window geometry included");
  await page.locator('[aria-controls="three-toolbar-panel"]').click();
  const tools=page.locator("#three-toolbar-panel");
  await tools.getByRole("button",{name:"X-ray",exact:true}).click();
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(()=>window.readPreviewState().scene.getObjectByName("preview-model").children.find((item)=>item.isGroup).children[0].material.transparent),true,"X-ray changes only rendered material transparency");
  await tools.getByRole("button",{name:"X-ray",exact:true}).click();
  await tools.getByRole("button",{name:"Wireframe",exact:true}).click();
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(()=>window.readPreviewState().scene.getObjectByName("preview-model").children.find((item)=>item.isGroup).children[0].material.wireframe),true,"Wireframe changes rendered material only");
  await tools.getByRole("button",{name:"Wireframe",exact:true}).click();
  const frontBefore=await page.evaluate(()=>window.readPreviewState().scene.getObjectByName("wall:front").position.toArray());
  await tools.getByRole("button",{name:"Exploded view",exact:true}).click();
  await page.waitForTimeout(120);
  const frontExploded=await page.evaluate(()=>window.readPreviewState().scene.getObjectByName("wall:front").position.toArray());
  assert.notDeepEqual(frontExploded,frontBefore,"Exploded view changes a visual group transform");
  await tools.getByRole("button",{name:"Reset exploded view",exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>window.readPreviewState().scene.getObjectByName("wall:front").position.toArray()),frontBefore,"Exploded reset restores canonical visual position");
  await tools.getByRole("button",{name:"Section",exact:true}).click();
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(()=>window.readPreviewState().gl.localClippingEnabled),true,"Section uses renderer clipping without changing project data");
  assert.ok(await page.locator('#three-toolbar-panel input[type="range"]').count(),"Section position control is available");
  await tools.getByRole("button",{name:"Reset section",exact:true}).click();
  await tools.getByRole("button",{name:"Perspective",exact:true}).click();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>Boolean(window.readPreviewState().camera.isOrthographicCamera)),true,"Orthographic projection is a real camera mode");
  await page.getByRole("button",{name:"Fit model",exact:true}).first().click();
  await settled(page);
  await tools.getByRole("button",{name:"Orthographic",exact:true}).click();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>Boolean(window.readPreviewState().camera.isPerspectiveCamera)),true,"Perspective projection restores the standard camera");
  const screenshotDownload=page.waitForEvent("download");
  await tools.getByRole("button",{name:"Screenshot",exact:true}).click();
  assert.match((await screenshotDownload).suggestedFilename(),/-3d\.png$/,"Screenshot export is a PNG without project identifiers");
  await page.locator('[aria-controls="three-toolbar-panel"]').click();
  record("advanced engineering viewport states",{frontBefore,frontExploded});
  await gestures(page);
  await page.getByRole("button",{name:"Fit model",exact:true}).first().click();
  await settled(page);
  checkLayout(await snapshot(page),true);
  record("fit model restores complete geometry after manipulation",(await snapshot(page)).model.projected);
  const lockedTop=await page.evaluate(()=>document.body.style.top);
  await page.mouse.wheel(0,400);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>document.body.style.top),lockedTop,"Background scroll offset unchanged");
  for(let tab=0;tab<20;tab++) {
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(()=>!!document.activeElement.closest(".three-workspace")),true,"Focus stays inside modal");
  }
  await close(page);
  assert.deepEqual(await formState(page),before,"Project inputs, openings, units, language and original styles preserved");
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-previousScroll)<=2,"Previous page scroll restored");
  await page.evaluate(()=>scrollBy(0,-150));
  assert.ok(await page.evaluate(()=>scrollY)<previousScroll-100,"Page scroll works after close");
  record("close restores project data, units, language, page styles and scrolling", { previousScroll });

  await page.locator("#room-room-1-length").fill("8");
  await open(page);
  const updated=await snapshot(page);
  assert.ok(updated.model.world.max[0]-updated.model.world.min[0]>7.9,"Edited dimensions reach scene geometry");
  checkLayout(updated,true);
  record("reopening uses edited live dimensions",updated.model.world);
  await page.keyboard.press("Escape");
  await page.locator(".three-workspace").waitFor({state:"detached"});

  for(const language of ["ku","ar","en-GB"]) {
    await changeLanguage(page,language);
    await open(page);
    const value=await snapshot(page);
    assert.equal(value.direction,language==="en-GB"?"ltr":"rtl");
    assert.equal(value.language,language);
    checkLayout(value,true);
    await page.screenshot({path:join(output,`language-${language}.png`)});
    await close(page);
    assert.equal(await page.evaluate(()=>localStorage.getItem("blocksystem:language")),language);
    record(`${language} direction, controls and persistence`,{direction:value.direction});
  }
  await page.context().close();
  assert.deepEqual(results.pageErrors,[],"No JavaScript/React runtime errors");
  assert.deepEqual(results.consoleErrors,[],"No browser console errors");
  record("no runtime or browser console errors", { warnings: results.warnings, failedRequests: results.failedRequests });
} catch(error) {
  results.failure=String(error.stack??error);
  console.error(results.failure);
  for(const context of browser.contexts()) for(const page of context.pages()) {
    await page.screenshot({path:join(output,"failure.png")}).catch(()=>{});
    await writeFile(join(output,"failure-dom.html"),await page.content()).catch(()=>{});
    results.failureState=await snapshot(page).catch(()=>null);
  }
  process.exitCode=1;
} finally {
  await writeFile(join(output,"results.json"),JSON.stringify(results,null,2));
  console.log(`Evidence: ${output}`);
  await browser.close();
}
