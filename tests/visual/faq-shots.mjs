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
await page.goto(`${base}/faqs`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/faqs.png`, fullPage: true });
console.log(
  "height",
  await page.evaluate(() => document.documentElement.scrollHeight),
  "figma 3809",
);
console.log("band", await box("section[aria-labelledby='faq-title']"), "figma [0,591,1920,445]");
console.log("h2", await box("#faq-title"), "figma cap-top 730");
console.log("sub", await box("p[class*='sub']"), "figma cap-top 798");
console.log("search", await box("[data-testid='faq-search']"), "figma input box [560,876,800,60]");
for (const [i, y] of [1136, 1211, 1286, 1361].entries())
  console.log("tab", i, await box("nav[aria-label='Topics'] a", i), `figma [300,${y},278,60]`);
console.log("stuck", await box("div[class*='stuck']"), "figma [300,1471,278,217]");
console.log("stuck button", await box("a[class*='contact']"), "figma [325,1606,228,52]");
for (const [i, y] of [1136, 1627, 2118, 2609].entries())
  console.log("section", i, await box("[data-testid='faq-section']", i), `figma y=${y} h441`);
console.log("h2 sec1", await box("#orders-shipping-title"), "figma cap-top 1150 x700");
console.log("footer", await box("footer"), "figma y=3150");
await b.close();
