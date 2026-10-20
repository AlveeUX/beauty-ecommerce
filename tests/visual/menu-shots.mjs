import { chromium } from "@playwright/test";
// Usage: node tests/visual/menu-shots.mjs <outDir> [baseUrl]. Hovers the Pages dropdown on Home and on a standard page.
const out = process.argv[2];
const base = process.argv[3] ?? "http://localhost:3000";
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1920, height: 700 } });
for (const [path, name] of [
  ["/", "home"],
  ["/about", "inner"],
]) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Pages" }).first().hover();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${out}/menu-${name}.png`,
    clip:
      name === "home"
        ? { x: 700, y: 0, width: 700, height: 500 }
        : { x: 1300, y: 0, width: 620, height: 500 },
  });
  const panel = await page
    .locator("[data-menu-panel]:visible")
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [
        Math.round(r.left),
        Math.round(r.top),
        Math.round(r.width),
        Math.round(r.height),
        getComputedStyle(el).backgroundColor,
      ];
    });
  console.log(name, JSON.stringify(panel));
}
await b.close();
