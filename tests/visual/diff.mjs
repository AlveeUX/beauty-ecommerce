// Mean absolute per-channel difference of a region between the Figma reference and the capture.
// Usage: node tests/visual/diff.mjs <x> <y> <w> <h> [implOffsetY=0] [impl=baselines/home-impl.png] [figma=references/home-figma.png]
import sharp from "sharp";
const [
  x,
  y,
  w,
  h,
  off = "0",
  impl = "tests/visual/baselines/home-impl.png",
  fig = "tests/visual/references/home-figma.png",
] = process.argv.slice(2);
const [X, Y, W, H, O] = [x, y, w, h, off].map(Number);
const a = await sharp(fig)
  .extract({ left: X, top: Y, width: W, height: H })
  .removeAlpha()
  .raw()
  .toBuffer();
const b = await sharp(impl)
  .extract({ left: X, top: Y + O, width: W, height: H })
  .removeAlpha()
  .raw()
  .toBuffer();
let d = 0;
for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
console.log((d / a.length).toFixed(2));
