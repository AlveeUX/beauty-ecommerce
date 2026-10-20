import { chromium } from "@playwright/test";
// Usage: node tests/visual/blog-shots.mjs <outDir> [baseUrl]. Prints measured boxes next to the Figma numbers.
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
  // lazy images load only once scrolled into view
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    scrollTo(0, 0);
  });
  const sel = '[data-testid=blog-index] img, article img, aside[aria-label="Blog sidebar"] img';
  await page
    .waitForFunction((q) => [...document.querySelectorAll(q)].every((i) => i.complete), sel, {
      timeout: 8000,
    })
    .catch(async () =>
      console.log(
        "images still loading:",
        await page.evaluate(
          (q) => [...document.querySelectorAll(q)].filter((i) => !i.complete).map((i) => i.src),
          sel,
        ),
      ),
    );
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
const log = (label, got, want) => console.log(label.padEnd(16), JSON.stringify(got), "figma", want);

await open("/blog", "grid");
log("grid height", await height(), 3689);
log("card 0", await box("[data-testid='blog-card']"), "[300,690,420,515]");
log("card 1", await box("[data-testid='blog-card']", 1), "[750,690,420,515]");
log("card 3", await box("[data-testid='blog-card']", 3), "[300,1235,420,515]");
log("card 11", await box("[data-testid='blog-card']", 11), "[1200,2325,420,515]");
log("image 0", await box("[data-testid='blog-card'] a[class*='image']"), "[315,705,390,246]");
log("meta 0", await box("[data-testid='blog-card'] p[class*='meta']"), "cap-top 981 x315");
log("title 0", await box("[data-testid='blog-card'] h2"), "cap-top 1016 x315");
log("excerpt 0", await box("[data-testid='blog-card'] p[class*='excerpt']"), "cap-top 1094 w345");
log("more 0", await box("[data-testid='blog-card'] a[class*='more']"), "top 1154 (label cap 1157)");
log("pagination", await box("nav[aria-label='Pagination']"), "[840,2890,240,40]");
log("footer", await box("footer"), "y 3030");

await open("/blog?layout=list", "list");
log("list height", await height(), 3399);
log("sidebar", await box("aside[aria-label='Blog sidebar']"), "[300,690,390,1764]");
log("row 0", await box("[data-testid='blog-card']"), "[750,690,870,285]");
log("row 5", await box("[data-testid='blog-card']", 5), "[750,2265,870,285]");
log("row image", await box("[data-testid='blog-card'] a[class*='image']"), "[765,705,405,255]");
log("row meta", await box("[data-testid='blog-card'] p[class*='meta']"), "cap-top 736 x1200");
log("row title", await box("[data-testid='blog-card'] h2"), "cap-top 771 x1200");
log("row excerpt", await box("[data-testid='blog-card'] p[class*='excerpt']"), "cap-top 849");
log("row more", await box("[data-testid='blog-card'] a[class*='more']"), "top 912");
log("pagination", await box("nav[aria-label='Pagination']"), "[750,2600,240,40]");
log("footer", await box("footer"), "y 2740");
log("search widget", await box("section[class*='search']"), "[300,690,390,164]");
log("promo", await box("section[aria-label='Mid year sale']"), "[300,884,390,420]");
log("categories", await box("aside section:nth-of-type(3)"), "[300,1334,390,428]");
log("recent", await box("aside section:nth-of-type(4)"), "[300,1792,390,419]");
log("tags", await box("aside section:nth-of-type(5)"), "[300,2241,390,213]");
log("tag 0", await box("aside section:nth-of-type(5) a"), "[330,2315,59,28]");

await open("/blog?layout=sidebar-left", "left");
log("left height", await height(), 3689);
log("left card 0", await box("[data-testid='blog-card']"), "[750,690,420,515]");
log("left pagination", await box("nav[aria-label='Pagination']"), "y 2890 ?");
await open("/blog?layout=sidebar-right", "right");
log("right height", await height(), 3689);
log("right card 0", await box("[data-testid='blog-card']"), "[300,690,420,515]");
log("right sidebar", await box("aside[aria-label='Blog sidebar']"), "[1230,690,390,1764]");
await open("/blog?layout=standard", "standard");
log("standard height", await height(), 4083);
log("large 0", await box("[data-testid='blog-card']"), "[300,690,870,?]");

await open("/blog/inside-the-formula-behind-beautiful-skin", "detail");
log("detail height", await height(), 5060);
log("hero", await box("article > div[class*='hero']"), "[300,690,870,549]");
log("meta", await box("article > p[class*='meta']"), "[300,1264,408,24]");
log("title", await box("article h1"), "cap-top 1318 w870");
const p = (n) => box("article [class*='body'] > p", n);
log("p1", await p(0), "cap-top 1382 h90");
log("p2", await p(1), "cap-top 1507 h64");
log("checks", await box("article ul[class*='checks']"), "[300,1606,601,132]");
log("quote", await box("figure[class*='quote']"), "[300,1773,870,226]");
log("p3", await p(2), "cap-top 2034 h90");
log("pair 0", await box("div[class*='pairImage']"), "[300,2159,420,330]");
log("pair 1", await box("div[class*='pairImage']", 1), "[750,2159,420,330]");
log("p4", await p(3), "cap-top 2524 h90");
log("note", await box("aside[class*='note']"), "[300,2649,870,102]");
log("p5", await p(4), "cap-top 2786 h64");
log("foot", await box("div[class*='foot']"), "y 2885");
log("neighbours", await box("nav[aria-label='More posts']"), "y 2991 h73");
log("heading", await box("article h2"), "cap-top 3135");
log("thread 0", await box("div[class$='thread']"), "[300,3191,870,405]");
log("thread 1", await box("div[class$='thread']", 1), "[300,3626,870,209]");
log("leave", await box("article h2[class*='leave']"), "cap-top 3870");
log("textarea", await box("textarea"), "[299,3950,870,160]");
log("name", await box("input[name='name']"), "[299,4167,276,52]");
log("submit", await box("button[data-testid='submit-comment']"), "[300,4249,170,52]");
log("sidebar", await box("aside[aria-label='Blog sidebar']"), "[1230,690,390,?]");
log("footer", await box("footer"), "y 4401");
await b.close();
