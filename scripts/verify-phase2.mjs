import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await context.newPage();
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
await page.addInitScript(() => { if (!localStorage.getItem("blocksystem:language")) localStorage.setItem("blocksystem:language", "en-GB"); });
await page.goto("http://localhost:3010", { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: "Workspace" }).waitFor();

const viewportFits = async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
if (!await viewportFits()) throw new Error("Phase 2 introduces horizontal overflow at 390px");

await page.keyboard.press("Control+K");
await page.getByRole("dialog", { name: "Search" }).waitFor();
await page.getByPlaceholder("Search projects, rooms, walls and saved records").fill("missing record");
await page.getByText("No matching workspace records").waitFor();
await page.keyboard.press("Escape");
await page.getByRole("dialog", { name: "Search" }).waitFor({ state: "detached" });

await page.getByText("Project information", { exact: false }).first().click();
const projectInput = page.getByLabel("Project name");
await projectInput.fill("Phase 2 browser validation");
await page.locator("#room-room-1-length").fill("4");
await page.locator("#room-room-1-width").fill("3");
await page.locator("#room-room-1-height").fill("2.8");
await page.waitForTimeout(1200);
await page.getByText("Saved", { exact: true }).first().waitFor();
const storage = await page.evaluate(() => JSON.parse(localStorage.getItem("yek-block-projects-v1") ?? "[]"));
if (storage.length !== 1) throw new Error("Autosave did not persist exactly one project");
await page.keyboard.press("Control+S");
await page.waitForTimeout(100);
await page.getByRole("button", { name: "History" }).click();
await page.getByText(/Revision/).first().waitFor();
await projectInput.fill("Phase 2 revised");
await page.waitForTimeout(1200);
const restoreButtons = page.getByRole("button", { name: "Restore" });
const restoreCount = await restoreButtons.count();
if (restoreCount < 2) throw new Error("Version history did not retain a prior autosave");
page.once("dialog", (dialog) => dialog.accept());
await restoreButtons.nth(restoreCount - 1).click();
await page.locator("#project-projectName").waitFor({ state: "visible" });
if (await projectInput.inputValue() !== "Phase 2 browser validation") throw new Error("Safe restore did not load the selected version");

const favorite = page.getByRole("button", { name: "Add to favorites" }).first();
await favorite.click();
await page.getByText("Phase 2 browser validation").first().waitFor();

await page.getByRole("button", { name: "Open 3D preview" }).click();
await page.locator(".three-workspace").waitFor();
const threeBounds = await page.locator(".three-scene-slot").evaluate((element) => { const box = element.getBoundingClientRect(); return { width: box.width, height: box.height }; });
if (threeBounds.width !== 390 || threeBounds.height !== 844) throw new Error(`3D viewport mismatch: ${threeBounds.width}x${threeBounds.height}`);
await page.locator("[data-preview-close]").click();
await page.locator(".three-workspace").waitFor({ state: "detached" });

await page.setViewportSize({ width: 844, height: 390 });
await page.getByRole("button", { name: "Open 3D preview" }).click();
await page.locator(".three-workspace").waitFor();
const landscapeFits = await page.locator(".three-scene-slot").evaluate((element) => { const box = element.getBoundingClientRect(); return box.width === 844 && box.height === 390; });
if (!landscapeFits) throw new Error("3D landscape viewport mismatch");
await page.locator("[data-preview-close]").click();

await page.evaluate(() => localStorage.setItem("blocksystem:language", "ar"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator("html[dir=rtl]").waitFor();
await page.evaluate(() => localStorage.setItem("blocksystem:language", "en-GB"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator("html[dir=ltr]").waitFor();
for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1920]) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(80);
  if (!await viewportFits()) throw new Error(`Horizontal overflow at ${width}px`);
}
if (errors.length) throw new Error(errors.join("\n"));
console.log("Phase 2 browser validation passed");
await browser.close();
