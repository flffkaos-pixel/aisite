const fs = require("fs");
const jsQR = require("jsqr");
const pngjs = require("pngjs").PNG;

const png = pngjs.sync.read(fs.readFileSync("expo-qr.png"));
const code = jsQR(new Uint8ClampedArray(png.data.buffer), png.width, png.height);
if (!code) {
  console.error("NO QR CODE FOUND");
  process.exit(1);
}
console.log("DECODED:", code.data);
if (code.data !== "exp://k2kxblk-anonymous-8081.exp.direct") {
  console.error("MISMATCH!");
  process.exit(1);
}
console.log("OK");