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
await page.goto(`${base}/no-such-page`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/not-found.png`, fullPage: true });
console.log(
  "height",
  await page.evaluate(() => document.documentElement.scrollHeight),
  "figma 1454",
);
console.log("digits", await box("[data-testid='not-found'] div"), "figma [681,212,558,240]");
console.log("h1", await box("[data-testid='not-found'] h1"), "figma cap-top 511");
console.log("p", await box("[data-testid='not-found'] p"), "figma cap-top 575 w609");
console.log("button", await box("[data-testid='not-found'] a"), "figma [846,643,228,52]");
console.log("footer", await box("footer"), "figma y=795");
await b.close();
