/* Raid on Puma Bay -- the art kit: what every picture on the play screen
 * shares. The play screen is 480 by 300 pixels, scaled up by whole numbers;
 * the bay is seen straight down, lit from the north-west, so shadows fall to
 * the south-east and everything round is lit on its upper left.
 *
 * Anything that turns -- the helicopter, the jets, the ships, the tanks --
 * is drawn by K.sprite: a list of shapes in the thing's own frame (nose up),
 * filled pixel by pixel at each of 32 headings, so every heading is drawn,
 * not rotated, and stays crisp. Round shapes are shaded as round, flat ones
 * get a lit edge and a shaded one; an outline goes round the lot. */
"use strict";
(() => {
  const K = PB.K = { VW: 480, VH: 300 };
  K.OUT = "#151a24";

  K.mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const cache = new Map();
  K.get = (key, make) => { let c = cache.get(key); if (!c) { c = make(); cache.set(key, c); } return c; };
  K.cache = cache;

  K.hash = (x, y, s = 0) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 974634721)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  /* a 4x4 ordered dither, -0.5..0.5 */
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  K.bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47;
  K.rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  K.hex = ([r, g, b]) => "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  K.mix = (a, b, t) => { const A = K.rgb(a), B = K.rgb(b); return K.hex(A.map((v, i) => v + (B[i] - v) * t)); };

  /* drawing, always on whole pixels */
  K.rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  K.px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
  K.disc = (g, cx, cy, rx, ry, c) => {
    if (c) g.fillStyle = c;
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      const t = 1 - (y * y) / ((ry + 0.5) * (ry + 0.5));
      if (t < 0) continue;
      const w = Math.round(rx * Math.sqrt(t));
      g.fillRect(Math.round(cx) - w, Math.round(cy) + y, w * 2 + 1, 1);
    }
  };
  K.line = (g, x0, y0, x1, y1, c) => {
    if (c) g.fillStyle = c;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let k = 0; k <= n; k++) g.fillRect(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), 1, 1);
  };
  /* a one-pixel ring round whatever is drawn on c */
  K.outline = (c, col = K.OUT) => {
    const g = c.getContext("2d"), W = c.width, H = c.height, d = g.getImageData(0, 0, W, H).data, a = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 60;
    g.fillStyle = col;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!a(x, y) && (a(x + 1, y) || a(x - 1, y) || a(x, y + 1) || a(x, y - 1))) g.fillRect(x, y, 1, 1);
    return c;
  };
  /* a sprite's silhouette, in one colour: its shadow */
  K.silhouette = (c, col = "#000") => {
    const s = K.mk(c.width, c.height), g = s.getContext("2d");
    g.drawImage(c, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, s.width, s.height);
    return s;
  };

  /* ---- the materials: five shades each, lit to dark ---- */
  K.M = {
    heli: ["#e8eef4", "#b9c6d4", "#8b9db1", "#61728a", "#414e62"],
    heliDk: ["#9aa5b4", "#737f90", "#545e6e", "#3b4350", "#272d37"],
    tawny: ["#ffdca6", "#f2b76c", "#d58e40", "#a26428", "#6c4018"],
    glass: ["#e2fdff", "#9ae6f3", "#56b6d1", "#33809f", "#1e506b"],
    puma: ["#fde6bd", "#ebb877", "#c98b49", "#9b6531", "#5f3b1b"],
    wolf: ["#d3cfca", "#aaa49e", "#817b76", "#5a5551", "#3a3735"],
    wolfDk: ["#8f8984", "#6c6763", "#4f4b48", "#373432", "#242221"],
    wolfRed: ["#ff9a82", "#e64c34", "#b52c1b", "#7d1c11", "#4c100a"],
    redGlass: ["#ffe2b8", "#ffb469", "#e1803a", "#a35324", "#653114"],
    olive: ["#c3bb84", "#a09766", "#7b744b", "#575234", "#383522"],
    tread: ["#7d7a72", "#5f5c56", "#46443f", "#302f2c", "#1f1e1c"],
    deck: ["#9aa2ab", "#828a94", "#6c737d", "#555c65", "#3f454d"],
    hull: ["#8a929c", "#6e7680", "#575e67", "#41474f", "#2d3238"],
    hullRed: ["#c77464", "#a5513f", "#82382a", "#5e261c", "#3d1812"],
    steel: ["#9d9a96", "#7f7c79", "#64625f", "#4b4947", "#333230"],
    teak: ["#d8b583", "#bd965f", "#9b7646", "#765632", "#523a21"],
    white: ["#ffffff", "#e9eef2", "#cbd3da", "#a3adb7", "#7b8590"],
    cont1: ["#f0a35c", "#d97f34", "#b25f1f", "#824313", "#552a0b"],
    cont2: ["#7fc0d8", "#4f9cbd", "#357a9b", "#245a74", "#163b4d"],
    cont3: ["#a8d07a", "#7fb04f", "#5d8b35", "#416424", "#2a4116"],
    concrete: ["#d6d2c7", "#bcb7aa", "#a09b8e", "#837e72", "#625e55"],
    sand: ["#f3e3b4", "#e6d09a", "#d4b97f", "#b99c66", "#8f774c"],
    yellow: ["#fff3a8", "#ffd84d", "#e2b22a", "#a67d18", "#6b500e"],
    black: ["#5a5d63", "#3f4247", "#2c2e32", "#1d1f22", "#121315"],
  };
  /* the light: from the upper left, a little above */
  const LX = -0.52, LY = -0.66, LZ = 0.54;

  /* ---- shapes, in the sprite's own frame: x to starboard, y aft (the nose is up) ---- */
  const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  /* a shape at a point: null outside, else the surface's normal (nx, ny) and height */
  function hit(p, x, y) {
    switch (p.k) {
      case "ell": {
        const nx = (x - p.x) / p.rx, ny = (y - p.y) / p.ry, r = nx * nx + ny * ny;
        return r <= 1 ? [nx, ny, Math.sqrt(1 - r)] : null;
      }
      case "cap": {
        const dx = p.x1 - p.x0, dy = p.y1 - p.y0, L = dx * dx + dy * dy, t = L ? PB.clamp(((x - p.x0) * dx + (y - p.y0) * dy) / L, 0, 1) : 0;
        const qx = x - (p.x0 + dx * t), qy = y - (p.y0 + dy * t), r = (qx * qx + qy * qy) / (p.r * p.r);
        return r <= 1 ? [qx / p.r, qy / p.r, Math.sqrt(1 - r)] : null;
      }
      case "rect": return x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h ? [0, 0, 1] : null;
      case "poly": return inPoly(p.pts, x, y) ? [0, 0, 1] : null;
      case "ring": { const r = Math.hypot(x - p.x, y - p.y); return r <= p.r && r >= p.r - p.t ? [(x - p.x) / p.r, (y - p.y) / p.r, 0.6] : null; }
    }
    return null;
  }

  /* draw a sprite at heading a (radians, 0 north, clockwise), size px square */
  K.drawSprite = (def, a) => {
    const N = def.size, c = K.mk(N, N), g = c.getContext("2d"), img = g.createImageData(N, N), D = img.data;
    const ca = Math.cos(a), sa = Math.sin(a), h = N / 2;
    const part = new Int16Array(N * N).fill(-1), shade = new Float32Array(N * N);
    const parts = def.parts;
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const sx = px + 0.5 - h, sy = py + 0.5 - h;
      const lx = sx * ca + sy * sa, ly = -sx * sa + sy * ca;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i], n = hit(p, lx, ly);
        if (!n) continue;
        /* a marking painted on another shape goes no further than it */
        if (p.clip != null && !hit(parts[p.clip], lx, ly)) continue;
        let I;
        if (p.round) {
          /* the normal, turned back to the screen, against the light */
          const nx = n[0] * ca - n[1] * sa, ny = n[0] * sa + n[1] * ca, nz = n[2];
          I = (nx * LX + ny * LY) * p.round + nz * LZ + (1 - p.round) * 0.62;
        } else I = 0.62;
        if (p.tone) I += p.tone;
        part[py * N + px] = i; shade[py * N + px] = I;
        break;
      }
    }
    /* flat shapes: a lit edge toward the light, a shaded one away from it */
    const at = (x, y) => x < 0 || y < 0 || x >= N || y >= N ? -1 : part[y * N + x];
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      const i = part[py * N + px];
      if (i < 0) continue;
      const p = parts[i];
      let I = shade[py * N + px];
      const up = at(px - 1, py) , ul = at(px, py - 1), dn = at(px + 1, py), dr = at(px, py + 1);
      const z = p.z || 0, lower = j => j < 0 || (parts[j].z || 0) < z;
      if (!p.round || p.bevel) {
        if (lower(up) || lower(ul)) I += 0.28;
        else if (lower(dn) || lower(dr)) I -= 0.3;
      }
      const ramp = K.M[p.m] || [p.m, p.m, p.m, p.m, p.m];
      let k = Math.round((1 - PB.clamp(I, 0, 1)) * 4 + K.bayer(px, py) * 0.55);
      if (p.flat) k = p.flat;
      k = PB.clamp(k + (p.dk || 0), 0, 4);
      const [r, gg, b] = K.rgb(ramp[k]), o = (py * N + px) * 4;
      D[o] = r; D[o + 1] = gg; D[o + 2] = b; D[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    if (def.outline !== false) K.outline(c, def.out || K.OUT);
    return c;
  };
  /* a sprite at one of 32 headings, drawn when first wanted */
  K.spr = (name, a, def) => K.get(name + ":" + PB.frame(a), () => K.drawSprite(def || PB.SPR[name], PB.frame(a) / 32 * Math.PI * 2));
  K.shadowOf = (name, a, def) => K.get("sh:" + name + ":" + PB.frame(a), () => K.silhouette(K.spr(name, a, def), "#000"));

  /* ---- a tiny pixel font for numbers on the field: 3 wide, 5 high ---- */
  const F3 = { "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001010010010", "8": "111101111101111", "9": "111101111001111", "+": "000010111010000", "-": "000000111000000", "%": "101001010100101", x: "000101010101000" };
  K.text3 = (g, s, x, y, col, shadow = K.OUT) => {
    s = String(s);
    const draw = (ox, oy, c) => {
      g.fillStyle = c;
      for (let i = 0; i < s.length; i++) { const f = F3[s[i]]; if (!f) continue; for (let k = 0; k < 15; k++) if (f[k] === "1") g.fillRect(x + ox + i * 4 + (k % 3), y + oy + Math.floor(k / 3), 1, 1); }
    };
    if (shadow) draw(1, 1, shadow);
    draw(0, 0, col);
  };
  K.text3w = s => String(s).length * 4 - 1;
})();
