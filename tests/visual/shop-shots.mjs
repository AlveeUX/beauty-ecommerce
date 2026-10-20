import { chromium } from "@playwright/test";
// Usage: node tests/visual/shop-shots.mjs <outDir> [baseUrl]. Prints measured boxes next to the Figma numbers.
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
const height = () => page.evaluate(() => document.documentElement.scrollHeight);
async function open(path, name) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
  if (name) await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
const log = (label, got, want) => console.log(label.padEnd(18), JSON.stringify(got), "figma", want);
const card = "[data-testid='product-card']";
// the frames show five applied filters, so every page is measured in that state
const F = "&availability=in-stock";

await open(`/shop?layout=right${F}`, "right");
log("right height", await height(), 4263);
log("right sidebar", await box("aside[aria-label='Product filters']"), "[1312,690,308,?]");
log("right card0", await box(card), "[300,820,308,509]");

await open(`/shop?layout=list-left${F}`, "list-left");
log("list height", await height(), 6786);
log("list sidebar", await box("aside[aria-label='Product filters']"), "[300,690,308,1551]");
log("toolbar toggle", await box("[role=group][aria-label='Product view']"), "[636,690,81,44]");
log("summary", await box("[data-testid='results-summary']"), "x727 cap-top 706");
log("row0", await box(card), "[636,820,982,359]");
log("row1", await box(card, 1), "[636,1209,982,359]");
log("row11", await box(card, 11), "[636,5110,982,359]");
log("row0 rating", await box(`${card} [class*='rating']`), "x974 y883");
log("row0 name", await box(`${card} h3`), "cap-top 911 x974");
log("row0 desc", await box(`${card} p[class*='rowText']`), "cap-top 981 w613 h64");
log("row0 button", await box(`${card} a[class*='shopNow']`), "[974,1075,139,42]");
log("row0 price", await box(`${card} [data-testid='card-price']`), "x1128 cap-top 1090");
log("pagination", await box("nav[aria-label='Pagination']"), "[1380,5519,240,40]");

await open(`/shop?layout=load-more${F}`, "load-more");
log("loadmore height", await height(), 4267);
log("load more btn", await box("[data-testid='load-more']"), "centered under grid");

await open(`/shop?layout=top-filter${F}`, "top-filter");
log("top height", await height(), 4587);
log("filter button", await box("[data-testid='filter-button']"), "[1481,690,139,44]");
log("panel", await box("section[aria-label='Product filters']"), "[300,764,1320,294]");
log("chips", await box("[class*='ActiveFilters'], ul[aria-label*='filters']"), "y1088");
log("card0", await box(card), "[301,1144,308,509]");
log("card3", await box(card, 3), "[1313,1144,308,509]");
log("footer", await box("footer"), "?");

await open(`/shop?layout=list-top-filter${F}`, "list-top-filter");
log("list-top height", await height(), 7110);

await open(`/shop?layout=horizontal${F}`, "horizontal");
log("horiz height", await height(), 4393);
log("bar", await box("section[aria-label='Product filters']"), "[300,764,1320,70]");
log("card0", await box(card), "[301,950,308,509]");
await page.getByRole("button", { name: "Color" }).click();
await page.waitForTimeout(300);
log("popover", await box("[class*='popover']:not([hidden])"), "[1090,834,262,248]");
await page.screenshot({
  path: `${out}/horizontal-open.png`,
  clip: { x: 0, y: 600, width: 1920, height: 700 },
});

await open(`/shop?layout=list-horizontal${F}`, "list-horizontal");
log("list-horiz height", await height(), 6916);

await open(`/shop?layout=filter-drawer${F}`, "filter-drawer");
log("drawer btn", await box("[data-testid='filter-button']"), "[1507,690,113,44]");
log("card0", await box(card), "[300,820,308,509]");
await page.getByTestId("filter-button").click();
await page.waitForTimeout(400);
log("drawer", await box("[role=dialog][aria-label='Filter']"), "[0,0,368,1649?]");
await page.screenshot({ path: `${out}/filter-drawer-open.png` });
await b.close();
