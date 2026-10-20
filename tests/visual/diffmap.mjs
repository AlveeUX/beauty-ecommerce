// Amplified difference image. Usage: node tests/visual/diffmap.mjs <y> <h> <out.png> [implOffsetY=0] [gain=4]
import sharp from "sharp";
const [y, h, out, off = "0", gain = "4"] = process.argv.slice(2);
const [Y, H, O, G] = [y, h, off, gain].map(Number);
const W = 1920;
const a = await sharp("tests/visual/references/home-figma.png")
  .extract({ left: 0, top: Y, width: W, height: H })
  .removeAlpha()
  .raw()
  .toBuffer();
const b = await sharp("tests/visual/baselines/home-impl.png")
  .extract({ left: 0, top: Y + O, width: W, height: H })
  .removeAlpha()
  .raw()
  .toBuffer();
const o = Buffer.alloc(a.length);
for (let i = 0; i < a.length; i++) o[i] = Math.min(255, Math.abs(a[i] - b[i]) * G);
await sharp(o, { raw: { width: W, height: H, channels: 3 } })
  .resize({ width: 1400 })
  .png()
  .toFile(out);
console.log("ok");
