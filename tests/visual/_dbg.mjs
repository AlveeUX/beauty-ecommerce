import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const out = await page.evaluate(() => {
  const r = (e) => {
    const b = e.getBoundingClientRect();
    return [b.x, b.y, b.width, b.height].map((v) => +v.toFixed(1)).join(",");
  };
  const o = [];
  document
    .querySelectorAll("nav[aria-label=Primary] > ul > li > a")
    .forEach((a) =>
      o.push(
        "nav a " +
          a.textContent +
          " " +
          r(a) +
          " span " +
          r(a.querySelector("span")) +
          " svg " +
          (a.querySelector("svg") ? r(a.querySelector("svg")) : ""),
      ),
    );
  document.querySelectorAll("header > div:first-child *").forEach((e) => {
    if (e.children.length === 0 || e.tagName === "svg")
      o.push("bar " + e.tagName + " '" + (e.textContent || "").slice(0, 20) + "' " + r(e));
  });
  return o;
});
console.log(out.join("\n"));
await browser.close();
