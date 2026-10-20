// Side-by-side zoom of a region: Figma (top) vs capture (bottom). Usage: node tests/visual/zoom.mjs <x> <y> <w> <h> <out.png> [scale=3] [implOffsetY=0]
import sharp from "sharp";
const [x, y, w, h, out, scale = "3", off = "0"] = process.argv.slice(2);
const [X, Y, W, H, S, O] = [x, y, w, h, scale, off].map((v, i) => (i === 4 ? v : Number(v)));
const crop = async (f, top) =>
  sharp(f)
    .extract({ left: X, top, width: W, height: H })
    .resize({ width: W * S, kernel: "nearest" })
    .png()
    .toBuffer();
const a = await crop("tests/visual/references/home-figma.png", Y);
const b = await crop("tests/visual/baselines/home-impl.png", Y + O);
await sharp({ create: { width: W * S, height: H * S * 2 + 8, channels: 3, background: "#f0f" } })
  .composite([
    { input: a, left: 0, top: 0 },
    { input: b, left: 0, top: H * S + 8 },
  ])
  .png()
  .toFile(out);
console.log("ok");
