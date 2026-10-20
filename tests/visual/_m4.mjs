import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.addStyleTag({
  content: "*,*::before,*::after{animation:none!important;transition:none!important}",
});
const li = p.locator("section[aria-labelledby=loved-title] li").first();
const r = async (sel, exp) => {
  const bb = await li.locator(sel).first().boundingBox();
  console.log(
    sel.padEnd(28),
    [bb.x, bb.y, bb.width, bb.height].map((v) => v.toFixed(1)).join(" "),
    " exp",
    exp,
  );
};
await r("xpath=.", "300 4906 308 536");
await r("h3", "325 5282");
await r("p[class*=ctaPrice]", "right 583 y 5282");
await r("p[class*=ctaLabel]", "325 5312");
await r("[class*=ctaRating] svg", "325 5339");
await r("button[class*=addBar]", "325 5374 258 43");
const e = async (sel, exp) => {
  const bb = await p.locator(sel).first().boundingBox();
  console.log(
    sel.padEnd(34),
    [bb.x, bb.y, bb.width, bb.height].map((v) => v.toFixed(1)).join(" "),
    " exp",
    exp,
  );
};
await e("text=Hall of frame", "~895 4710");
await e("h2:has-text('Most loved product')", "~736 4750");
await e("section[aria-labelledby=loved-title] header p >> nth=1", "~758 4818");
await b.close();
