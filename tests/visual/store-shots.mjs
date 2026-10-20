import { chromium } from "@playwright/test";
const out = process.argv[2];
const base = process.argv[3] ?? "http://localhost:3000";
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1920, height: 1000 } });
const box = (sel, n = 0) =>
  page.evaluate(
    ([s, i]) => {
      const el = document.querySelectorAll(s)[i];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [
        Math.round(r.left),
        Math.round(r.top + scrollY),
        Math.round(r.width),
        Math.round(r.height),
      ];
    },
    [sel, n],
  );
await page.goto(`${base}/store-locator`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() =>
  [...document.querySelectorAll("[data-testid='store-map'] img")].every(
    (i) => i.complete && i.naturalWidth > 0,
  ),
);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/store-locator.png`, fullPage: true });
console.log(
  "height",
  await page.evaluate(() => document.documentElement.scrollHeight),
  "figma 2632",
);
console.log("map", await box("[data-testid='store-map']"), "figma [300,690,645,715]");
for (const [i, y] of [693, 937, 1181].entries())
  console.log("card", i, await box("[data-testid='store-card']", i), `figma [975,${y},645,224]`);
console.log("h2", await box("[data-testid='store-card'] h2"), "figma cap-top 718 x1005");
console.log("address", await box("[data-testid='store-card'] address"), "figma cap-top 752");
console.log("phone", await box("[data-testid='store-card'] a[href^='tel']"), "figma cap-top 784");
console.log("status", await box("[data-testid='store-status']"), "figma cap-top 816");
console.log("button", await box("[data-testid='store-card'] a[target]"), "figma [1005,848,170,44]");
console.log("strip", await box("section[aria-label='Why shop with us']"), "figma y=1505 h468");
await b.close();
