import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({
  content: "*,*::before,*::after{animation:none!important;transition:none!important}",
});
const card = page.locator("article[data-testid=product-card]").first();
const r = async (sel) => {
  const b = await card.locator(sel).first().boundingBox();
  return b ? [b.x, b.y, b.width, b.height].map((v) => v.toFixed(1)).join(" ") : "NF";
};
console.log("card   ", await r("xpath=."), " exp 300 1939 308 509");
console.log("stars  ", await r("svg"), " exp 325 2315 71.8 12.9");
console.log("[count]", await r("[class*=count]"), " exp 403 2316");
console.log("name   ", await r("h3"), " exp 325 2343");
console.log("label  ", await r("p[class*=stdLabel]"), " exp 325 2373");
console.log(
  "price  ",
  await r("p[class*=stdPrice] > span:first-child"),
  " exp 325 2408 (right 359)",
);
console.log("strike ", await r("s"), " exp (right 392) 2410");
const arrows = page.locator(
  "button[aria-label^='Previous Trending'], button[aria-label^='Next Trending']",
);
for (let i = 0; i < (await arrows.count()); i++) {
  const b = await arrows.nth(i).boundingBox();
  console.log("arrow", i, [b.x, b.y, b.width, b.height].join(" "));
}
await browser.close();
