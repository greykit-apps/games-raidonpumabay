#!/usr/bin/env node
/*
 * Raid on Puma Bay's icons, from one pixel drawing: the puma's helicopter,
 * seen from above over the bay, a beach in the corner.
 *
 *   node tools/make-icons.js
 *
 * Writes icon.svg (crisp rects), favicon-16x16.png, favicon-32x32.png,
 * apple-touch-icon.png (180, also the GitLab project's avatar) and
 * favicon.ico (16, 32, 48, each a PNG inside). No dependencies: the PNG and
 * ICO writers are below. The share card is tools/og.html, rendered in a
 * browser.
 */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const ROOT = path.join(__dirname, "..");

/* the drawing, 40 x 40: K.spr("heli") from js/art/sprites.js with its
 * rotor and shadow, over the sea's own colours, composed in the browser and
 * kept here as pixels, so this tool needs nothing but node. Redraw the
 * sprite there, then paste the new pixels over PAL and ART. */
const PAL = { "0": "#339db6", "1": "#257ca0", "2": "#1d6189", "3": "#4891af", "4": "#427b9c", "5": "#194d74", "6": "#3b404a", "7": "#e3fafd", "8": "#a8e8f3", "9": "#5494ae", "a": "#3e6a8b", "b": "#70c0d7", "c": "#436d84", "d": "#a8b2c0", "e": "#ebc28e", "f": "#9cacbd", "g": "#6f7886", "h": "#262b33", "i": "#f9e8c7", "j": "#cf9d68", "k": "#c2cdda", "l": "#7a889d", "m": "#5a626e", "n": "#a97e54", "o": "#785b42", "p": "#8893a2", "q": "#5f6b7c", "r": "#3a637b", "s": "#4a5059", "t": "#38576e", "u": "#163f62", "v": "#e8eef4", "w": "#151a24", "x": "#effbfa", "y": "#f0c185", "z": "#ecd8a0", "A": "#d99f60", "B": "#61728a", "C": "#a7afaf", "D": "#f2b76c", "E": "#8b9db1", "F": "#a59770", "G": "#6b9a3f", "H": "#86b44e", "I": "#d58e40", "J": "#113651", "K": "#414e62", "L": "#4b6b2c", "M": "#0f2c44", "N": "#5e7e36" };
const ART = [
  "0000000000010101011111111111111212121222",
  "0010101010111111111111212121212222222222",
  "0000010101010101111111111212121212122222",
  "1010101011111111111121212121222222222222",
  "0000000101010111111111111112121212222222",
  "1010101111111111334343434122222222222252",
  "0101010101011133333334343432121222222222",
  "1010111111113333434343434444422222225252",
  "0001010101133333333333343434342222222222",
  "1011111113333343434343444444444422525252",
  "0101010113333336666434343434444422222525",
  "11111111333343678896466444444444a2525252",
  "010101133333367778bc6dd63444444444222225",
  "11111113334367888e9cffgd644444a4a4525255",
  "010111h3333368e8ij9ckflm644444444a452525",
  "1111113hhh4368jejnocffllp644a4a4a4a25555",
  "0111113333hh69b9oocckfflpd64444444452525",
  "111113434346hhhcccckffllqm6ra4a4a4aa5555",
  "11111333346ddfkhhkkddpllqgd64a4a4a4a2525",
  "111123434346pffkfhhdppglqqmd64a4aaaa5555",
  "111113333336dgffffdhhhgmqq6p6r4a4a4a2555",
  "1121234343446dlflfppmghhsq66traaaaaa5555",
  "11111434343436dlllgggsmshh6trtra4a4a5555",
  "21212343444446ppqlsmmmsssqhhhtttaaaa5555",
  "111111343434346ppqqsssssqq6trhht4aa55555",
  "2121214444444446p6qqqssqqf6tttthhha555u5",
  "1212123434344446dd66qqqqkfl6rt4aaah55555",
  "21212224444444446d6r666ffkf6ttaaaa55u5u5",
  "111212143444444446rrrrr6kkkl6t66aa555555",
  "21222222444444a4a4trtrt6fkffq6kv65u5u5u5",
  "12121212244444444artrtrt6fkkfvklw555xxxx",
  "222222222444a4a4a4arttatt6fvykl6u5xxxzzz",
  "1212122222244444444ara4a66vyyABwxCCzzzzz",
  "222222222252a4a4a4aaaaa6kvllyDEwCFFFzzzz",
  "121222222222254a4a4a4a46vl6wDDDBwFFFGHGH",
  "2222222252525252aaaaaaaa6w5wEDDIwFFGHGHG",
  "122222222222222525252555555JwKDIwFLHGHGH",
  "22222252525252555555555555MJMwwwFLNGHGHG",
  "22222222252525252525555555JJCCFFLNLNGHGH",
  "222252525252555555555555u5uJCzFFNLNLHGHG",
];
const N = ART.length, R = 4;   /* the plate's corner radius, in cells */

/* ---- icon.svg: one rect per run of a colour along a row ---- */
const rects = [];
ART.forEach((row, y) => {
  for (let x = 0; x < N;) {
    let e = x + 1;
    while (e < N && row[e] === row[x]) e++;
    rects.push(`<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${PAL[row[x]]}"/>`);
    x = e;
  }
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" role="img" aria-label="Raid on Puma Bay">
<title>Raid on Puma Bay</title>
<!-- The puma's helicopter over the bay. Written by tools/make-icons.js; edit the drawing there, not this file. -->
<clipPath id="p"><rect width="${N}" height="${N}" rx="${R}"/></clipPath>
<g clip-path="url(#p)">
${rects.join("\n")}
</g>
</svg>
`;
fs.writeFileSync(path.join(ROOT, "icon.svg"), svg);

/* ---- rasters. Small ones average 4x4 samples of the drawing per pixel, so
 * 16 and 32 keep the canopy's stripes as colour rather than losing every
 * other row; big ones take the nearest cell, so the pixels stay pixels. ---- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const cellAt = (gx, gy) => {
  const cx = Math.min(Math.max(gx, R), N - R), cy = Math.min(Math.max(gy, R), N - R);
  if (Math.hypot(gx - cx, gy - cy) > R) return null;
  return hex(PAL[ART[Math.min(N - 1, Math.floor(gy))][Math.min(N - 1, Math.floor(gx))]]);
};
function raster(size) {
  const px = Buffer.alloc(size * size * 4), S = size >= 2 * N ? 1 : 4;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const c = cellAt((x + (sx + 0.5) / S) / size * N, (y + (sy + 0.5) / S) / size * N);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
    }
    const i = (y * size + x) * 4;
    if (a) { px[i] = r / a; px[i + 1] = g / a; px[i + 2] = b / a; px[i + 3] = 255 * a / (S * S); }
  }
  return png(size, size, px);
}

/* ---- a minimal PNG writer: RGBA, no filtering ---- */
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
/* ---- ICO: a directory of PNGs ---- */
function ico(images) {
  const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let off = 6 + 16 * images.length;
  const dir = images.map(([size, data]) => {
    const e = Buffer.alloc(16);
    e[0] = size % 256; e[1] = size % 256; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(off, 12); off += data.length;
    return e;
  });
  return Buffer.concat([head, ...dir, ...images.map(([, d]) => d)]);
}

fs.writeFileSync(path.join(ROOT, "favicon-16x16.png"), raster(16));
fs.writeFileSync(path.join(ROOT, "favicon-32x32.png"), raster(32));
fs.writeFileSync(path.join(ROOT, "apple-touch-icon.png"), raster(180));
fs.writeFileSync(path.join(ROOT, "favicon.ico"), ico([[16, raster(16)], [32, raster(32)], [48, raster(48)]]));
console.log("wrote icon.svg, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, favicon.ico");
