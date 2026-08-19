const QRCode = require("qrcode");
const fs = require("fs");

const url = "exp://k2kxblk-anonymous-8081.exp.direct";
const out = "expo-qr.png";
QRCode.toFile(out, url, { width: 400, margin: 2 })
  .then(() => {
    const size = fs.statSync(out).size;
    console.log("QR written:", out, size, "bytes");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });