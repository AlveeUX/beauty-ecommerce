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
await page.goto(`${base}/contact`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() =>
  [...document.querySelectorAll("[data-testid='contact-map'] img")].every(
    (i) => i.complete && i.naturalWidth > 0,
  ),
);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/contact.png`, fullPage: true });
console.log(
  "height",
  await page.evaluate(() => document.documentElement.scrollHeight),
  "figma 3303",
);
console.log("label", await box("#contact-title"), "figma h2 cap-top 730 w533");
console.log("lead", await box("section p[class*='lead']"), "figma cap-top 697 x1232");
for (const [i, x] of [300, 638, 976, 1312].entries())
  console.log("card", i, await box("[data-testid='contact-card']", i), `figma [${x},818,308,263]`);
console.log("card h3", await box("[data-testid='contact-card'] h3"), "figma cap-top 958");
console.log("card p", await box("[data-testid='contact-card'] p"), "figma cap-top 1002");
console.log("map", await box("[data-testid='contact-map']"), "figma [300,1161,645,715]");
console.log("form", await box("[data-testid='contact-form']"), "figma [975,1161,645,720]");
console.log("form h2", await box("[data-testid='contact-form'] h2"), "figma cap-top 1211 x1005");
console.log("hint", await box("[data-testid='contact-form'] p"), "figma cap-top 1270");
for (const [n, y] of [
  ["name", 1344],
  ["email", 1344],
  ["topic", 1448],
  ["message", 1552],
])
  console.log(n, await box(`[data-testid='field-${n}']`), `figma y=${y}`);
console.log("consent", await box("[data-testid='check-consent']"), "figma y=1738");
console.log("send", await box("[data-testid='send-message']"), "figma [1005,1778.7,180,52]");
console.log("faq h2", await box("#faq-title"), "figma cap-top 2021");
console.log("accordion", await box("[data-testid='accordion']"), "figma [525,2109,870,435]");
console.log("footer", await box("footer"), "figma y=2644");
await b.close();
