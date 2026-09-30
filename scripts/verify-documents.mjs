/** Real browser/API/PDF tests. Starts an isolated development server; all artifacts stay in OS temp. */
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import jsQR from "jsqr";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createDefaultProject } from "../src/features/calculator/lib/project-state.ts";
import { createScenarioFromProject } from "../src/features/calculator/lib/scenario-engine.ts";
import { documentMessages } from "../src/lib/document-messages.ts";

const output = await mkdtemp(join(tmpdir(), "blocksystem-documents-"));
const base = `http://localhost:${process.env.TEST_PORT ?? 3010}`;
const secret = randomBytes(32).toString("hex");
const env = {
  ...process.env,
  VERIFICATION_ADMIN_SECRET: secret,
  VERIFICATION_PUBLIC_ORIGIN: base,
  VERIFICATION_DEV_DIRECTORY: join(output, "store"),
};
delete env.UPSTASH_REDIS_REST_URL;
delete env.UPSTASH_REDIS_REST_TOKEN;
delete env.VERCEL;
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", new URL(base).port],
  { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
server.stdout.on("data", (v) => {
  logs += v;
});
server.stderr.on("data", (v) => {
  logs += v;
});
const results = [];
const pass = (name) => {
  results.push(name);
  console.log(`PASS ${name}`);
};
let browser;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function pdfCheck(buffer, url, name) {
  const task = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: false,
    standardFontDataUrl:
      join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts").replaceAll(
        "\\",
        "/",
      ) + "/",
  });
  const pdf = await task.promise;
  let found = false;
  let text = "";
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: 2 });
    assert.ok(Math.abs(viewport.width / viewport.height - 210 / 297) < 0.002);
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport }).promise;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const decoded = jsQR(
      new Uint8ClampedArray(pixels.data),
      canvas.width,
      canvas.height,
      { inversionAttempts: "dontInvert" },
    );
    if (decoded) {
      assert.equal(decoded.data, url);
      found = true;
    }
    const content = await page.getTextContent();
    text += content.items.map((v) => v.str ?? "").join(" ");
    if (n === 1 || decoded)
      await writeFile(
        join(output, `${name}-${n}.png`),
        canvas.toBuffer("image/png"),
      );
  }
  assert.ok(found, `${name}: QR must decode after A4 rendering`);
  assert.ok(!text.includes("\ufffd"));
  assert.ok(!text.includes("\u0000"));
  assert.ok(text.includes("PRIVATE CLIENT"));
  assert.ok(text.includes("²"), "Area unit glyph must be present");
  await writeFile(join(output, `${name}.pdf`), buffer);
  await task.destroy();
  pass(`A4 PDF ${name}: embedded font, text and decoded verification QR`);
}
try {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(logs);
    try {
      const r = await fetch(`${base}/verify/malformed`);
      if (r.ok) break;
    } catch {}
    if (attempt === 119) throw new Error("Server start timeout");
    await delay(500);
  }
  browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ??
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--enable-webgl", "--use-angle=swiftshader-webgl"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  const data = createDefaultProject();
  data.metadata.projectName = "Document test project";
  data.metadata.clientName = "PRIVATE CLIENT";
  data.metadata.location = "PRIVATE LOCATION";
  Object.assign(data.rooms[0], {
    name: "ژووری تاقیکردنەوە",
    length: "5",
    width: "4",
    height: "3",
  });
  data.settings.unitPrice = "1000";
  data.documentSettings = {
    kind: "quotation",
    issuer: "BlockSystem / RekApps",
    notes: "تێبینی • ملاحظات • Document notes",
    terms: "Terms and conditions",
  };
  const a = createScenarioFromProject(data, "baseline", "Baseline");
  const b = {
    ...a,
    id: "alternate",
    name: "Alternative",
    wastePercentage: "10",
  };
  data.scenarioComparison = { scenarios: [a, b], baselineScenarioId: a.id };
  await context.addInitScript(
    ({ data }) => {
      if (!localStorage.getItem("document-test-seeded")) {
        localStorage.setItem("document-test-seeded", "true");
        localStorage.setItem("blocksystem:language", "en-GB");
        localStorage.setItem(
          "yek-block-projects-v1",
          JSON.stringify([
            {
              id: "legacy-test-project",
              version: 1,
              name: data.metadata.projectName,
              data,
              savedAt: "2026-09-30T12:00:00Z",
            },
          ]),
        );
      }
    },
    { data },
  );
  const request = context.request;
  const headers = { origin: base };
  assert.equal(
    (
      await request.delete(`${base}/api/verification/records`, {
        headers,
        data: { token: "a".repeat(48) },
      })
    ).status(),
    401,
  );
  assert.equal(
    (
      await request.post(`${base}/api/verification/session`, {
        headers: { origin: "https://evil.example" },
        data: { password: secret },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await request.post(`${base}/api/verification/session`, {
        headers,
        data: { password: "wrong" },
      })
    ).status(),
    401,
  );
  assert.equal(
    (
      await request.post(`${base}/api/verification/session`, {
        headers,
        data: { password: secret },
      })
    ).status(),
    200,
  );
  pass("protected administration and CSRF checks");
  await page.goto(base, { waitUntil: "networkidle" });
  await page
    .locator("#projects")
    .getByRole("button", { name: "Open", exact: true })
    .click();
  const panel = page.locator("#project-documents");
  await panel
    .getByRole("button", {
      name: documentMessages["en-GB"]["documents.issue"],
      exact: true,
    })
    .click();
  await panel
    .getByText(/^QT-\d{4}-\d{6}/)
    .first()
    .waitFor();
  let records = await (
    await request.get(
      `${base}/api/verification/records?projectId=legacy-test-project`,
    )
  ).json();
  const quote = records.find((r) => r.kind === "quotation");
  assert.ok(quote?.snapshot);
  assert.match(quote.url, new RegExp(`^${base}/verify/[a-f0-9]{48}$`));
  pass("legacy saved project issues a persistent quotation through actual UI");
  const png = panel.locator(".verification-qr img").first();
  await png.waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector("#project-documents .verification-qr img")
        ?.complete,
  );
  const src = await png.getAttribute("src");
  const qrImage = await loadImage(src);
  const canvas = createCanvas(qrImage.width, qrImage.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(qrImage, 0, 0);
  assert.equal(
    jsQR(
      new Uint8ClampedArray(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      ),
      canvas.width,
      canvas.height,
    ).data,
    quote.url,
  );
  await panel
    .getByRole("button", {
      name: documentMessages["en-GB"]["documents.copy"],
      exact: true,
    })
    .first()
    .click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    quote.url,
  );
  for (const format of ["png", "svg"]) {
    const download = page.waitForEvent("download");
    await panel
      .getByRole("link", {
        name: documentMessages["en-GB"][`documents.${format}`],
        exact: true,
      })
      .first()
      .click();
    assert.ok((await download).suggestedFilename().endsWith(`.${format}`));
  }
  pass("QR payload, clipboard and PNG/SVG downloads");
  const uiDownload = page.waitForEvent("download");
  await panel
    .getByRole("button", {
      name: documentMessages["en-GB"]["documents.pdf"],
      exact: true,
    })
    .first()
    .click();
  assert.ok((await uiDownload).suggestedFilename().endsWith(".pdf"));
  pass("actual document PDF download button");
  for (const kind of ["estimate", "detailed", "scenarios"]) {
    const response = await request.post(`${base}/api/verification/records`, {
      headers,
      data: {
        projectId: "legacy-test-project",
        data,
        options: {
          ...data.documentSettings,
          kind,
          notes:
            kind === "detailed"
              ? "تێبینی ملاحظات Professional document notes. ".repeat(180)
              : data.documentSettings.notes,
        },
      },
    });
    assert.equal(response.status(), 201, await response.text());
  }
  records = await (
    await request.get(
      `${base}/api/verification/records?projectId=legacy-test-project`,
    )
  ).json();
  assert.equal(records.length, 5);
  for (const record of records.filter((r) => r.snapshot))
    for (const language of ["ku", "ar", "en-GB"]) {
      const response = await request.post(`${base}/api/project-documents`, {
        headers,
        data: { token: record.verificationToken, language },
      });
      assert.equal(
        response.status(),
        200,
        await response.text().then((v) => v.slice(0, 100)),
      );
      await pdfCheck(
        await response.body(),
        record.url,
        `${record.kind}-${language}`,
      );
    }
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator("#document-print-root").isVisible(), true);
  assert.equal(await page.locator("#project-documents").isVisible(), false);
  await page.pdf({
    path: join(output, "browser-print.pdf"),
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  pass("print isolates document from application chrome");
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  for (const language of ["ku", "ar", "en-GB"]) {
    await page.evaluate(
      (lang) => localStorage.setItem("blocksystem:language", lang),
      language,
    );
    await page.reload({ waitUntil: "networkidle" });
    await panel
      .getByRole("button", {
        name: documentMessages[language]["documents.preview"],
        exact: true,
      })
      .nth(1)
      .click();
    await panel.locator(".verification-qr img").first().waitFor();
    await publicPage.goto(quote.url);
    await publicPage
      .getByRole("button")
      .filter({ has: publicPage.locator(`:scope[lang="${language}"]`) })
      .count();
    await publicPage.locator(`button[lang="${language}"]`).click();
    for (const width of [320, 360, 375, 390, 393, 414, 430]) {
      for (const p of [page, publicPage]) {
        await p.setViewportSize({ width, height: 850 });
        await p.waitForTimeout(40);
        const dimensions = await p.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          width: innerWidth,
        }));
        assert.ok(
          dimensions.scroll <= dimensions.width,
          `${language} ${width} overflow ${JSON.stringify(dimensions)}`,
        );
      }
      assert.equal(
        await panel.getAttribute("dir"),
        language === "en-GB" ? "ltr" : "rtl",
      );
      assert.equal(
        await publicPage.locator("main").getAttribute("dir"),
        language === "en-GB" ? "ltr" : "rtl",
      );
      const box = await panel
        .locator(".verification-qr img")
        .first()
        .boundingBox();
      assert.ok(
        box &&
          Math.abs(box.width - box.height) < 1 &&
          box.x >= 0 &&
          box.x + box.width <= width,
      );
      const transforms = await panel
        .locator(".verification-qr img")
        .first()
        .evaluate((el) => {
          const values = [];
          for (let p = el; p; p = p.parentElement)
            values.push(getComputedStyle(p).transform);
          return values;
        });
      assert.ok(
        transforms.every((v) => v === "none"),
        "No ancestor mirrors QR",
      );
      assert.equal(
        await publicPage
          .locator("[data-verification-state]")
          .getAttribute("data-verification-state"),
        "valid",
      );
      pass(
        `documents + public verification ${language} ${width}px, direction, square unmirrored QR`,
      );
    }
    await panel.screenshot({ path: join(output, `mobile-${language}.png`) });
    await publicPage.screenshot({
      path: join(output, `verification-${language}.png`),
    });
  }
  const publicHtml = await (await request.get(quote.url)).text();
  for (const privateValue of [
    "PRIVATE CLIENT",
    "PRIVATE LOCATION",
    "private-id",
    secret,
    "snapshot",
  ]) {
    assert.ok(
      !publicHtml.includes(privateValue),
      `Public route leaked ${privateValue}`,
    );
  }
  pass(
    "public page works in fresh unauthenticated browser and excludes private snapshot",
  );
  assert.equal(
    (
      await publicContext.request.delete(`${base}/api/verification/records`, {
        headers,
        data: { token: quote.verificationToken },
      })
    ).status(),
    401,
  );
  assert.equal(
    (
      await request.delete(`${base}/api/verification/records`, {
        headers,
        data: { token: quote.verificationToken },
      })
    ).status(),
    200,
  );
  await publicPage.reload();
  assert.equal(
    await publicPage
      .locator("[data-verification-state]")
      .getAttribute("data-verification-state"),
    "revoked",
  );
  for (const token of ["malformed", "e".repeat(48)]) {
    await publicPage.goto(`${base}/verify/${token}`);
    assert.equal(
      await publicPage
        .locator("[data-verification-state]")
        .getAttribute("data-verification-state"),
      "invalid",
    );
  }
  pass("persistent revoked state and malformed/unknown invalid states");
  const storeFile = join(output, "store", "records.json");
  const original = await readFile(storeFile);
  try {
    await writeFile(storeFile, "unavailable-test");
    await publicPage.goto(quote.url);
    assert.equal(
      await publicPage
        .locator("[data-verification-state]")
        .getAttribute("data-verification-state"),
      "unavailable",
    );
  } finally {
    await writeFile(storeFile, original);
  }
  pass("storage failure is unavailable, never falsely invalid");
  assert.deepEqual(pageErrors, []);
  await publicContext.close();
  await context.close();
  if (process.env.VERIFY_3D === "1") {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/verify-3d.mjs"], {
        env: { ...process.env, BASE_URL: base },
        windowsHide: true,
        stdio: "inherit",
      });
      child.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`3D verification exited ${code}`)),
      );
    });
    pass("existing desktop and fullscreen mobile 3D regression suite");
  }
} finally {
  await browser?.close();
  if (process.platform === "win32")
    await new Promise((resolve) => {
      const stop = spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
        windowsHide: true,
        stdio: "ignore",
      });
      stop.on("exit", resolve);
    });
  else server.kill("SIGTERM");
  await writeFile(join(output, "server.log"), logs);
  await writeFile(
    join(output, "results.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(`Artifacts: ${output}`);
}
