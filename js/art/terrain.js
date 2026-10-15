/* Raid on Puma Bay -- the bay, painted once: every island to the pixel from
 * the land field (PB.landAt), sand and grass and woods, the slopes lit from
 * the north-west, the sea shallow by the coast and deep away from it, the
 * pads, roads, runway, piers and the shipyard's dock, and the trees and
 * rocks. Then, every frame: the surf on the beaches, glints on the open
 * sea, and cloud shadows drifting over all of it. */
"use strict";
(() => {
  const K = PB.K, T = PB.TILE, N = PB.TILES, W = PB.WORLD, TL = PB.TL;
  const TR = PB.Terrain = { world: null, mini: null, map: null, foam: [], ready: false };
  const SEA = ["#86ddd0", "#55c0c4", "#339db6", "#257ca0", "#1d6189", "#194d74", "#163f62"];
  const SAND = ["#f6e7bb", "#ecd8a0", "#dcc286", "#c5a76c", "#a68955"];
  const WETSAND = ["#d9c895", "#c4b07c", "#a99567"];
  const GRASS = ["#c2dd84", "#a3ca64", "#86b44e", "#6b9a3f", "#537f33", "#406629"];
  const WOOD = ["#6f9a45", "#557f36", "#41672b", "#315221", "#233d18"];
  const ROCK = ["#cfccc4", "#aeaaa1", "#8d8981", "#6c6962", "#4e4b46"];
  const CONC = ["#d4d0c5", "#bfbaad", "#a9a497", "#918c80", "#77736a"];
  const ASPH = ["#6b6d72", "#585a60", "#4a4c51", "#3e4044", "#323438"];
  const FOAM = "#effbfa";

  /* the field at every other pixel, to be read between */
  function field() {
    const S = W / 2, f = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) f[y * S + x] = Math.min(3, PB.landAt(x * 2 + 1, y * 2 + 1));
    return { S, f, at(px, py) {
      const gx = (px - 1) / 2, gy = (py - 1) / 2, x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0;
      const w = v => ((v % S) + S) % S, A = f[w(y0) * S + w(x0)], B = f[w(y0) * S + w(x0 + 1)], C = f[w(y0 + 1) * S + w(x0)], D = f[w(y0 + 1) * S + w(x0 + 1)];
      return A + (B - A) * tx + (C - A) * ty + (A - B - C + D) * tx * ty;
    } };
  }
  /* a slow noise, worked out every step pixels and read between */
  function grid(step, fn) {
    const S = W / step, f = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) f[y * S + x] = fn(x * step, y * step);
    return (px, py) => {
      const gx = px / step, gy = py / step, x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0, w = v => ((v % S) + S) % S;
      const A = f[w(y0) * S + w(x0)], B = f[w(y0) * S + w(x0 + 1)], C = f[w(y0 + 1) * S + w(x0)], D = f[w(y0 + 1) * S + w(x0 + 1)];
      return A + (B - A) * tx + (C - A) * ty + (A - B - C + D) * tx * ty;
    };
  }
  const pick = (ramp, t, x, y, k = 0.7) => ramp[PB.clamp(Math.round(t * (ramp.length - 1) + K.bayer(x, y) * k), 0, ramp.length - 1)];
  const hx = K.hex, rgb = K.rgb;

  TR.build = () => {
    if (TR.ready) return;
    const m = PB.buildMap(), F = field();
    const seaN = grid(32, (x, y) => PB.noise(x / T * 0.3, y / T * 0.3, 1200)), landN = grid(4, (x, y) => PB.noise(x / T * 1.6, y / T * 1.6, 900));
    /* the woods, by the same noise the map's forest tiles were found by, read to the pixel */
    const woodN = grid(4, (x, y) => PB.noise((x - 8) / T * 1.3, (y - 8) / T * 1.3, 501));
    const chanNear = (px, py) => { for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1]]) if (tile(px + dx, py + dy) === TL.CHANNEL) return true; return false; };
    const c = K.mk(W, W), g = c.getContext("2d"), img = g.createImageData(W, W), D = img.data;
    const tile = (px, py) => m.tiles[Math.floor(py / T) * N + Math.floor(px / T)];
    const isRoad = (tx, ty) => m.tiles[(((ty % N) + N) % N) * N + (((tx % N) + N) % N)] === TL.ROAD;
    const isChan = (tx, ty) => m.tiles[(((ty % N) + N) % N) * N + (((tx % N) + N) % N)] === TL.CHANNEL;
    const put = (i, col) => { const [r, gg, b] = typeof col === "string" ? rgb(col) : col; D[i] = r; D[i + 1] = gg; D[i + 2] = b; D[i + 3] = 255; };
    for (let py = 0; py < W; py++) for (let px = 0; px < W; px++) {
      const i = (py * W + px) * 4, t = tile(px, py), tx = Math.floor(px / T), ty = Math.floor(py / T), lx = px - tx * T, ly = py - ty * T;
      const v = t === TL.CHANNEL ? 2 : F.at(px, py);
      /* ---- the made things first ---- */
      if (t === TL.PAD || t === TL.RUNWAY || (t === TL.ROAD && roadHere(lx, ly, tx, ty))) {
        if (t === TL.RUNWAY) {
          const rw = m.runway, ry = py - rw.y, rx = px - rw.x;
          let col = pick(ASPH, 0.55 + K.hash(px >> 1, py >> 1, 4) * 0.25, px, py, 0.5);
          if (ry === 2 || ry === rw.h - 3) col = "#e9e6dc";
          if (Math.abs(ry - rw.h / 2 + 0.5) < 1 && rx % 24 < 12 && rx > 30 && rx < rw.w - 30) col = "#e9e6dc";
          if ((rx < 14 || rx > rw.w - 15) && ry > 4 && ry < rw.h - 5 && (ry >> 1) % 2 === 0 && (rx % 14) > 2) col = "#e9e6dc";
          put(i, col); continue;
        }
        if (t === TL.ROAD) {
          const along = roadAxis(lx, ly, tx, ty);
          let col = pick(ASPH, 0.5 + K.hash(px, py, 5) * 0.3, px, py, 0.5);
          if (along === "edge") col = ASPH[0];
          else if (along === "dashV" && (py >> 2) % 2 === 0) col = "#e2c55a";
          else if (along === "dashH" && (px >> 2) % 2 === 0) col = "#e2c55a";
          put(i, col); continue;
        }
        /* concrete: slabs, seams at the tiles, a stain here and there; a wall where it meets the dock */
        const nearChan = isChan(tx + (lx < 2 ? -1 : lx > 13 ? 1 : 0), ty) || isChan(tx, ty + (ly < 2 ? -1 : ly > 13 ? 1 : 0));
        let s = 0.3 + K.hash(px >> 4, py >> 4, 6) * 0.14 + (K.hash(px >> 1, py >> 1, 7) < 0.05 ? 0.22 : 0);
        if ((px & 31) === 0 || (py & 31) === 0) s += 0.22;
        if ((px & 31) === 31 || (py & 31) === 31) s -= 0.08;
        const edgeT = [tile(px - 1, py), tile(px + 1, py), tile(px, py - 1), tile(px, py + 1)].some(q => q !== TL.PAD && q !== TL.ROAD && q !== TL.RUNWAY);
        if (edgeT) s += 0.45;
        put(i, nearChan ? "#5f5c56" : pick(CONC, PB.clamp(s, 0, 1), px, py, 0.4)); continue;
      }
      if (t === TL.DOCK) {
        /* a concrete pier: a lit edge, bollards */
        let s = 0.25 + K.hash(px >> 2, py >> 2, 8) * 0.2;
        if (lx < 2 || ly < 2) s = 0.05; if (lx > 13 || ly > 13) s = 0.7;
        put(i, (lx === 3 || lx === 12) && (ly === 3 || ly === 12) ? "#2c2a28" : pick(CONC, s, px, py, 0.4)); continue;
      }
      if (t === TL.CHANNEL) {
        /* the dock's water: deep, still, the wall's shadow on its western side */
        const wl = tile(px - 3, py) !== TL.CHANNEL || tile(px - 3, py - 3) !== TL.CHANNEL;
        put(i, wl ? pick(SEA, 0.95, px, py, 0.6) : pick(SEA, 0.7 + K.hash(px >> 2, py >> 2, 17) * 0.1, px, py, 0.6)); continue;
      }
      if (v < 1 && chanNear(px, py)) { put(i, (px + py) % 9 === 0 ? "#4a4741" : "#6f6b63"); continue; }
      if (v >= 1) {
        /* ---- the sea ---- */
        if (v < 1.022 && t !== TL.CHANNEL) { put(i, FOAM); continue; }
        const deep = t === TL.CHANNEL ? 0.55 : PB.clamp((v - 1) / 0.6, 0, 1);
        const patch = (seaN(px, py) - 0.5) * 0.34;
        put(i, pick(SEA, PB.clamp(0.08 + deep * 0.92 + patch * deep, 0, 1), px, py, 0.8)); continue;
      }
      /* ---- the land: lit by its slope ---- */
      const gxv = F.at(px + 2, py) - F.at(px - 2, py), gyv = F.at(px, py + 2) - F.at(px, py - 2);
      const lit = PB.clamp((gxv * -0.52 + gyv * -0.66) * -5.5, -0.35, 0.35);
      if (v > 0.86) {
        const wet = v > 0.965;
        put(i, wet ? pick(WETSAND, 0.3 + (v - 0.965) * 18 * 0.5, px, py) : pick(SAND, PB.clamp(0.35 - lit + K.hash(px >> 1, py >> 1, 10) * 0.15, 0, 1), px, py));
        continue;
      }
      const n = landN(px, py), wn = woodN(px, py);
      if (wn > 0.6 && v < 0.84) { put(i, pick(WOOD, PB.clamp(0.45 - lit + (n - 0.5) * 0.6 - (wn - 0.6) * 0.8, 0, 1), px, py)); continue; }
      if (wn > 0.57 && v < 0.86) { put(i, pick(GRASS, PB.clamp(0.75 - lit, 0, 1), px, py)); continue; }
      put(i, pick(GRASS, PB.clamp(0.42 - lit + (n - 0.5) * 0.7 + (v > 0.8 ? 0.08 : 0), 0, 1), px, py));
    }
    function roadHere(lx, ly, tx, ty) { return roadAxis(lx, ly, tx, ty) !== null; }
    /* a road tile: a band to each neighbouring road, 10 pixels wide */
    function roadAxis(lx, ly, tx, ty) {
      const n = isRoad(tx, ty - 1), s = isRoad(tx, ty + 1), w = isRoad(tx - 1, ty), e = isRoad(tx + 1, ty);
      const inV = lx >= 3 && lx <= 12, inH = ly >= 3 && ly <= 12;
      const vert = inV && ((n && ly <= 12) || (s && ly >= 3) || (inH)), hor = inH && ((w && lx <= 12) || (e && lx >= 3) || inV);
      if (!vert && !hor) return null;
      if ((vert && (lx === 3 || lx === 12) && !(hor && inH && (w || e))) || (hor && (ly === 3 || ly === 12) && !(vert && inV && (n || s)))) return "edge";
      if ((n || s) && !(w || e) && lx >= 7 && lx <= 8) return "dashV";
      if ((w || e) && !(n || s) && ly >= 7 && ly <= 8) return "dashH";
      return "body";
    }
    g.putImageData(img, 0, 0);

    /* ---- what stands on the land: trees, palms, bushes, rocks; the yard's sheds and cranes ---- */
    const decor = m.decor.slice().sort((a, b) => a.y - b.y);
    for (const d of decor) drawDecor(g, d);
    if (m.yard) {
      for (const s of m.yard.sheds) g.drawImage(PB.ART.shed(), s.x, s.y);
      m.yard.cranes.forEach((cr, i) => g.drawImage(PB.ART.crane(i % 2 === 1), cr.x - (i % 2 ? 50 : 2), cr.y - 8));
    }
    TR.world = c;

    /* ---- the surf: two bands a little way out from each beach, faded in and out by turns ---- */
    TR.foam = [];
    for (const is of m.islands) {
      const rx = Math.ceil(is.r * is.sx * 1.7 * T), ry = Math.ceil(is.r * is.sy * 1.7 * T);
      const x0 = Math.round(is.x * T - rx), y0 = Math.round(is.y * T - ry), w = rx * 2, h = ry * 2;
      const a = K.mk(w, h), b = K.mk(w, h), ga = a.getContext("2d"), gb = b.getContext("2d");
      const ia = ga.createImageData(w, h), ib = gb.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const wx = PB.wrap(x0 + x), wy = PB.wrap(y0 + y);
        if (m.tiles[Math.floor(wy / T) * N + Math.floor(wx / T)] === TL.CHANNEL) continue;
        const v = F.at(wx, wy);
        if (v < 1.02 || v > 1.16) continue;
        const o = (y * w + x) * 4, n = K.hash(wx, wy, 12);
        if (v < 1.075 && n < 0.8) { ia.data[o] = ia.data[o + 1] = ia.data[o + 2] = 245; ia.data[o + 3] = v < 1.045 ? 230 : 150; }
        else if (v >= 1.07 && v < 1.13 && n < 0.55) { ib.data[o] = 235; ib.data[o + 1] = 250; ib.data[o + 2] = 250; ib.data[o + 3] = 120; }
      }
      ga.putImageData(ia, 0, 0); gb.putImageData(ib, 0, 0);
      TR.foam.push({ x: x0, y: y0, w, h, a, b, ph: is.n * 1.7 });
    }

    /* ---- the bay small: for the radar panel and the map ---- */
    TR.map = K.mk(640, 640);
    const gm = TR.map.getContext("2d"); gm.imageSmoothingEnabled = true; gm.imageSmoothingQuality = "high";
    gm.drawImage(c, 0, 0, W, W, 0, 0, 640, 640);
    TR.mini = K.mk(160, 160);
    const gn = TR.mini.getContext("2d"); gn.imageSmoothingEnabled = true; gn.imageSmoothingQuality = "high";
    gn.drawImage(TR.map, 0, 0, 640, 640, 0, 0, 160, 160);

    /* ---- clouds, high over the bay, and their shadows ---- */
    TR.clouds = [];
    const cr = PB.mulberry(77);
    for (let i = 0; i < 14; i++) TR.clouds.push({ x: cr() * W, y: cr() * W, s: 0.6 + cr() * 0.9, v: PB.ri(cr, 3) });
    TR.ready = true;
  };

  function drawDecor(g, d) {
    const x = Math.round(d.x), y = Math.round(d.y);
    if (d.k === "tree") {
      const r = 3 + d.v % 3, R = [WOOD[0], GRASS[3], WOOD[1], WOOD[2], WOOD[3]];
      g.fillStyle = "rgba(14,30,18,.45)"; K.disc(g, x + 2, y + 2, r + 0.5, r);
      for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
        const q = (xx * xx + yy * yy) / (r * r + r);
        if (q > 1 || K.hash(x + xx, y + yy, 13) < (q > 0.7 ? 0.35 : 0)) continue;
        const I = -(xx / r) * 0.55 - (yy / r) * 0.6 + Math.sqrt(1 - q) * 0.5;
        g.fillStyle = R[PB.clamp(Math.round((1 - PB.clamp(I, 0, 1)) * 4 + K.bayer(x + xx, y + yy) * 0.8), 0, 4)];
        g.fillRect(x + xx, y + yy, 1, 1);
      }
    } else if (d.k === "palm") {
      g.fillStyle = "rgba(60,46,20,.35)";
      for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28 + d.v; K.line(g, x + 3, y + 3, x + 3 + Math.cos(a) * 5, y + 3 + Math.sin(a) * 5); }
      for (let k = 0; k < 5; k++) {
        const a = k / 5 * 6.28 + d.v, ex = x + Math.cos(a) * 5.5, ey = y + Math.sin(a) * 5.5;
        K.line(g, x, y, ex, ey, Math.cos(a) * -0.5 + Math.sin(a) * -0.6 > 0 ? "#8fbf4c" : "#4f7a2c");
        K.px(g, ex + Math.cos(a + 1.6), ey + Math.sin(a + 1.6), "#5f8d33");
      }
      K.px(g, x, y, "#7a5a32");
    } else if (d.k === "bush") {
      g.fillStyle = "rgba(14,30,18,.4)"; K.disc(g, x + 1, y + 1, 2, 2);
      K.disc(g, x, y, 2, 2, GRASS[4]); K.px(g, x - 1, y - 1, GRASS[1]); K.px(g, x, y - 1, GRASS[2]);
    } else if (d.k === "rock") {
      g.fillStyle = "rgba(20,24,30,.4)"; K.disc(g, x + 2, y + 2, 3, 2.4);
      for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) {
        const q = (xx * xx) / 10 + (yy * yy) / 7;
        if (q > 1) continue;
        g.fillStyle = ROCK[PB.clamp(Math.round(2 + xx * 0.45 + yy * 0.45 + K.bayer(x + xx, y + yy) * 0.8), 0, 4)];
        g.fillRect(x + xx, y + yy, 1, 1);
      }
    }
  }

  /* ---- a frame: the bay under the camera (cx, cy is the screen's top left, in the world) ---- */
  TR.draw = (g, cx, cy) => {
    const VW = K.VW, VH = K.VH;
    const x0 = PB.wrap(Math.floor(cx)), y0 = PB.wrap(Math.floor(cy));
    /* up to four pieces where the view crosses the bay's seams */
    const wA = Math.min(VW, W - x0), hA = Math.min(VH, W - y0);
    g.drawImage(TR.world, x0, y0, wA, hA, 0, 0, wA, hA);
    if (wA < VW) g.drawImage(TR.world, 0, y0, VW - wA, hA, wA, 0, VW - wA, hA);
    if (hA < VH) g.drawImage(TR.world, x0, 0, wA, VH - hA, 0, hA, wA, VH - hA);
    if (wA < VW && hA < VH) g.drawImage(TR.world, 0, 0, VW - wA, VH - hA, wA, hA, VW - wA, VH - hA);
  };
  /* the surf breathing, and glints on the open sea */
  TR.animate = (g, cx, cy, t, sx, sy) => {
    const VW = K.VW, VH = K.VH, m = PB.MAP;
    for (const f of TR.foam) {
      const x = sx(f.x), y = sy(f.y);
      if (x > VW || y > VH || x + f.w < 0 || y + f.h < 0) continue;
      const p = t / 70 + f.ph;
      g.globalAlpha = 0.35 + 0.65 * Math.max(0, Math.sin(p)); g.drawImage(f.a, Math.round(x), Math.round(y));
      g.globalAlpha = 0.55 * Math.max(0, Math.sin(p - 1.9)); g.drawImage(f.b, Math.round(x), Math.round(y));
    }
    g.globalAlpha = 1;
    const tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1;
    for (let ty = ty0; ty < ty0 + VH / T + 3; ty++) for (let tx = tx0; tx < tx0 + VW / T + 3; tx++) {
      const wx = ((tx % N) + N) % N, wy = ((ty % N) + N) % N;
      if (m.tiles[wy * N + wx] !== TL.DEEP) continue;
      const h = K.hash(wx, wy, 14);
      if (h > 0.3) continue;
      const s = Math.sin(t / 34 + h * 40);
      if (s < 0.55) continue;
      const px = Math.round(tx * T + K.hash(wx, wy, 15) * 12 - cx), py = Math.round(ty * T + K.hash(wx, wy, 16) * 14 - cy);
      g.fillStyle = s > 0.86 ? "#d8f6fb" : "#7cc6dc";
      g.fillRect(px, py, s > 0.75 ? 3 : 2, 1);
      if (s > 0.86) { g.fillStyle = "#ffffff"; g.fillRect(px + 1, py, 1, 1); }
    }
  };
  /* cloud shadows, and the clouds themselves when high is asked for */
  const cloud = (v, shadow) => K.get(`cloud:${v}:${shadow}`, () => {
    const R = [[70, 36], [96, 46], [58, 30]][v], c = K.mk(R[0] * 2 + 8, R[1] * 2 + 8), g = c.getContext("2d");
    const r = PB.mulberry(31 + v);
    const blobs = Array.from({ length: 7 }, () => [R[0] + (r() - 0.5) * R[0] * 1.1, R[1] + 4 + (r() - 0.5) * R[1] * 0.8, 14 + r() * R[1] * 0.6]);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      let d = 9;
      for (const [bx, by, br] of blobs) d = Math.min(d, Math.hypot(x - bx, (y - by) * 1.3) / br);
      if (d > 1) continue;
      if (d > 0.7 && K.bayer(x, y) + 0.5 > (1 - d) * 3.3) continue;
      if (shadow) g.fillStyle = "#0b1a33";
      else { const I = 1 - d + (y < c.height / 2 ? 0.2 : -0.1); g.fillStyle = I > 0.55 ? "#ffffff" : I > 0.3 ? "#e6edf4" : "#c7d2de"; }
      g.fillRect(x, y, 1, 1);
    }
    return c;
  });
  TR.clouds = [];
  TR.drawClouds = (g, t, sx, sy, shadow) => {
    for (const c of TR.clouds) {
      const img = cloud(c.v, shadow), wx = PB.wrap(c.x + t * 0.06 * c.s), wy = PB.wrap(c.y + t * 0.025 * c.s);
      const x = Math.round(sx(wx) - img.width / 2 + (shadow ? 0 : -60)), y = Math.round(sy(wy) - img.height / 2 + (shadow ? 0 : -70));
      if (x > K.VW || y > K.VH || x + img.width < 0 || y + img.height < 0) continue;
      g.globalAlpha = shadow ? 0.16 : 0.5;
      g.drawImage(img, x, y);
    }
    g.globalAlpha = 1;
  };
})();
