// Content pages visual helper: prints key boxes (page coordinates) next to the Figma numbers and saves a capture.
// Usage: node tests/visual/content-shots.mjs <outDir> [baseUrl]
import { chromium } from "@playwright/test";
const out = process.argv[2];
const base = process.argv[3] ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
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

await page.goto(`${base}/policy/privacy`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({
  content: "*,*::before,*::after{animation:none!important;transition:none!important}",
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/policy-privacy.png`, fullPage: true });
console.log(
  "height",
  await page.evaluate(() => document.documentElement.scrollHeight),
  "figma 3906",
);
console.log("toc", await box("[data-testid='policy-toc']"), "figma [300,690,405,322]");
console.log("updated", await box("p[class*='updated']"), "figma cap-top 690");
console.log("intro", await box("p[class*='intro']"), "figma cap-top 732 x765");
for (const [i, y] of [820, 1365, 1667, 2060, 2369].entries())
  console.log(`h2 #${i + 1}`, await box("article h2", i), `figma cap-top ${y}`);
console.log("note", await box("aside[class*='note']"), "figma [765,1217,855,98]");
console.log("table th", await box("table th"), "figma cap-top 1808 x765");
console.log("contact", await box("[data-testid='policy-contact']"), "figma [765,2573,855,106]");
console.log("strip", await box("section[aria-label='Why shop with us']"), "figma y=2779");
await browser.close();
