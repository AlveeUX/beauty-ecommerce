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
await page.goto(`${base}/about`, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) {
    scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 80));
  }
  scrollTo(0, 0);
});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/about.png`, fullPage: true });
console.log(
  "height",
  await page.evaluate(() => document.documentElement.scrollHeight),
  "figma 5313",
);
console.log("hero", await box("section[aria-labelledby='about-title']"), "figma [0,111,1920,810]");
console.log("label", await box("section[aria-labelledby='about-title'] p"), "figma cap-top 211");
console.log("h1", await box("#about-title"), "figma cap-top 251 w533");
console.log("lead", await box("section[aria-labelledby='about-title'] p", 1), "figma cap-top 435");
console.log("cta", await box("section[aria-labelledby='about-title'] a"), "figma [300,529,200,50]");
console.log("stats", await box("[data-testid='about-stats']"), "figma [300,684,581,138]");
console.log("reasons h2", await box("#reasons-title"), "figma cap-top 1061");
console.log("card img", await box("ol li div", 0), "figma [300,1207,420,420]");
console.log("card img3", await box("ol li div", 2), "figma [1200,1207,420,420]");
console.log(
  "quote band",
  await box("section[aria-label='From our founder']"),
  "figma [30,1855,1860,774]",
);
console.log("quote text", await box("blockquote"), "figma cap-top 2085 w780");
console.log(
  "portrait",
  await box("section[aria-label='From our founder'] figure > div"),
  "figma [910,2353,100,100]",
);
console.log("expert", await box("section[aria-labelledby='expert-title']"), "figma y2729 h570");
console.log("expert h2", await box("#expert-title"), "figma cap-top 2840 x1031");
console.log("trace", await box("section[aria-labelledby='trace-title']"), "figma y3349 h570");
console.log(
  "origins",
  await box("section[aria-labelledby='origins-title']"),
  "figma [0,4019,1920,635]",
);
console.log("origins h2", await box("#origins-title"), "figma cap-top 4159");
console.log(
  "step 1",
  await box("section[aria-labelledby='origins-title'] li", 0),
  "figma x335 y4325",
);
console.log("footer", await box("footer"), "figma y=4654 h659");
await b.close();
