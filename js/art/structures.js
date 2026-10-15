/* Raid on Puma Bay -- what stands still: the factories, a section at a time
 * and in three states (standing, hit, down), the hangars, the gun pits, the
 * radar towers, the shipyard's cranes and sheds, craters, and the little
 * pictures the HUD uses. All of it lit from the north-west, every building
 * with its shadow cast to the south-east in the same sprite. */
"use strict";
(() => {
  const K = PB.K, M = K.M;
  const ART = PB.ART = PB.ART || {};
  const SHADOW = "rgba(10,18,38,.45)";
  const h01 = (x, y, s) => K.hash(x, y, s);
  /* a shade of a ramp: t 0 lit .. 1 dark, dithered */
  const sh = (ramp, t, x, y) => ramp[PB.clamp(Math.round(t * 4 + K.bayer(x, y) * 0.8), 0, 4)];
  const fill = (g, x0, y0, w, h, f) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const c = f(x, y); if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } } };
  const shadowBox = (g, x, y, w, h, d) => { g.fillStyle = SHADOW; g.fillRect(x + d, y + d, w, h); };
  const shadowDisc = (g, x, y, r, d) => { g.fillStyle = SHADOW; K.disc(g, x + d, y + d, r, r); };
  /* a dome or a disc, lit from the upper left */
  const dome = (g, cx, cy, r, ramp, dk = 0) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = (x * x + y * y) / (r * r + r);
      if (d > 1) continue;
      const nz = Math.sqrt(1 - d), I = (-(x / r) * 0.52 - (y / r) * 0.66) + nz * 0.54;
      g.fillStyle = ramp[PB.clamp(Math.round((1 - PB.clamp(I, 0, 1)) * 4 + K.bayer(cx + x, cy + y) * 0.6) + dk, 0, 4)];
      g.fillRect(cx + x, cy + y, 1, 1);
    }
  };
  const edge = (g, x, y, w, h, c = K.OUT) => { g.fillStyle = c; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); };
  const RUST = ["#e09068", "#c4643c", "#9c4628", "#713018", "#481d0e"];
  const EARTH = ["#a9b06c", "#8a9450", "#6c773c", "#4f592b", "#33391c"];
  const ROOFB = ["#c7d0d8", "#a3aeb9", "#7f8b97", "#5d6874", "#3e4751"];
  const VAULT = ["#e4e8d8", "#c4cbb4", "#a1aa8f", "#7b846b", "#565d4a"];
  const DARK = ["#77808c", "#5c646f", "#454c56", "#323840", "#22272d"];
  const GLASS = ["#c9f1f7", "#8ccfe0", "#5da4bd", "#3c768f", "#254d60"];
  const PIPE = M.yellow, WOOD = M.teak;

  /* the empire's mark, painted on its roofs: a wolf's head in a red disc, the
   * ears pricked to the rim, two dark eyes, the muzzle narrowing to its nose */
  const WOLF = ["..rrrrr..", ".wrrrrrw.", "rwwrrrwwr", "rwwwwwwwr", "rwkwwwkwr", "rrwwwwwrr", "rrrwwwrrr", ".rrrkrrr.", "..rrrrr.."];
  const WOLF_INK = { r: "#c8321f", w: "#f4ede4", k: "#2a1712" };
  ART.emblem = (g, x, y, k = 1) => {
    WOLF.forEach((row, j) => { for (let i = 0; i < 9; i++) { const c = row[i]; if (c === ".") continue; g.fillStyle = WOLF_INK[c]; g.fillRect(x + i * k, y + j * k, k, k); } });
  };

  /* ---- a factory section, 32 x 32, its shadow beyond ---- */
  const SEC = 32, PADW = SEC + 6;
  const roofs = {
    steel(g, i) {
      fill(g, 0, 0, SEC, SEC, (x, y) => {
        const b = y % 8;
        if (b < 5) return sh(RUST, 0.25 + b * 0.05 + h01(x, y, 3) * 0.15, x, y);
        if (b === 5) return sh(GLASS, 0.35 + (x % 4 === 0 ? 0.35 : 0), x, y);
        return sh(RUST, 0.75 + (b - 6) * 0.15, x, y);
      });
      if (i === 0) {
        /* the blast furnace */
        dome(g, 16, 16, 10, M.steel, 1);
        dome(g, 16, 16, 6, M.steel, 0);
        K.disc(g, 16, 16, 3, 3, "#ffd24d"); K.disc(g, 16, 16, 1.5, 1.5, "#fff4c2");
        g.fillStyle = PIPE[2]; g.fillRect(26, 14, 6, 2); g.fillStyle = PIPE[0]; g.fillRect(26, 14, 6, 1);
      }
    },
    arms(g, i) {
      fill(g, 0, 0, SEC, SEC, (x, y) => sh(M.concrete, 0.45 + h01(x >> 1, y >> 1, 5) * 0.2, x, y));
      if (i % 2 === 0) {
        /* earth-covered bunkers, end on to the yard */
        for (const bx of [2, 17]) {
          fill(g, bx, 2, 13, 27, (x, y) => {
            const nx = (x - bx - 6) / 6.5, ny = Math.max(0, Math.abs(y - 15.5) - 9) / 4.5, d = nx * nx + ny * ny;
            if (d > 1) return null;
            return sh(EARTH, 0.55 - (-nx * 0.5) * (1 - d) * 0.9 + h01(x, y, 9) * 0.15 + (ny > 0 ? (y < 15 ? -0.1 : 0.2) : 0), x, y);
          });
          g.fillStyle = DARK[3]; g.fillRect(bx + 4, 27, 5, 2);
          g.fillStyle = PIPE[1]; g.fillRect(bx + 4, 26, 5, 1);
        }
      } else {
        /* crates in stacks */
        for (let cy = 3; cy < 29; cy += 7) for (let cx = 3; cx < 29; cx += 7) {
          if (h01(cx, cy, i) < 0.22) continue;
          shadowBox(g, cx, cy, 5, 5, 1);
          fill(g, cx, cy, 5, 5, (x, y) => sh(WOOD, x === cx || y === cy ? 0.15 : x === cx + 4 || y === cy + 4 ? 0.8 : 0.45, x, y));
          g.fillStyle = WOOD[3]; g.fillRect(cx + 2, cy, 1, 5);
        }
      }
    },
    tanks(g, i) {
      if (i === 3) {
        fill(g, 0, 0, SEC, SEC, (x, y) => sh(M.concrete, 0.5 + h01(x >> 1, y >> 1, 6) * 0.2, x, y));
        for (const [x, y] of [[3, 3], [13, 3], [23, 3], [3, 18], [13, 18]]) { shadowBox(g, x, y, 7, 11, 1); g.drawImage(K.spr("tank", 0), x - 6.5 | 0, y - 4.5 | 0); g.drawImage(K.spr("turret", 0), x - 7.5 | 0, y - 5.5 | 0); }
        return;
      }
      fill(g, 0, 0, SEC, SEC, (x, y) => sh(ROOFB, (y < 16 ? 0.2 : 0.62) + (x % 2 ? 0.12 : 0) + (y === 15 ? 0.25 : 0), x, y));
      g.fillStyle = ROOFB[0]; g.fillRect(0, 16, SEC, 1);
      for (const x of [6, 20]) { g.fillStyle = GLASS[1]; g.fillRect(x, 4, 5, 3); g.fillRect(x, 23, 5, 3); }
    },
    air(g, i) {
      if (i === 2) {
        fill(g, 0, 0, SEC, SEC, (x, y) => sh(M.concrete, 0.4 + h01(x >> 2, y >> 2, 7) * 0.15, x, y));
        g.fillStyle = PIPE[1]; for (let y = 1; y < SEC; y += 4) g.fillRect(15, y, 1, 2);
        const f = K.spr("fighter", Math.PI * 0.25);
        g.drawImage(K.silhouette(f, SHADOW), 1, 1); g.drawImage(f, 0, 0);
        return;
      }
      fill(g, 0, 0, SEC, SEC, (x, y) => {
        const nx = ((x % 16) - 7.5) / 8, I = -nx * 0.6 + Math.sqrt(Math.max(0, 1 - nx * nx)) * 0.55;
        return sh(VAULT, 1 - PB.clamp(I + 0.2, 0, 1) + (y % 5 === 0 ? 0.15 : 0), x, y);
      });
      g.fillStyle = VAULT[4]; g.fillRect(15, 0, 2, SEC);
    },
    radio(g, i) {
      fill(g, 0, 0, SEC, SEC, (x, y) => sh(M.concrete, 0.3 + h01(x >> 1, y >> 1, 8) * 0.18, x, y));
      if (i === 0 || i === 3) { shadowDisc(g, 16, 16, 11, 3); dome(g, 16, 16, 11, M.white); }
      else {
        for (const [x, y] of [[4, 4], [18, 4], [4, 18], [18, 18]]) {
          shadowBox(g, x, y, 9, 9, 2);
          fill(g, x, y, 9, 9, (px, py) => sh(M.steel, px === x || py === y ? 0.15 : 0.5, px, py));
          K.disc(g, x + 4, y + 4, 3, 3, DARK[3]); K.line(g, x + 2, y + 4, x + 6, y + 4, DARK[1]); K.line(g, x + 4, y + 2, x + 4, y + 6, DARK[1]);
        }
      }
    },
    engines(g, i) {
      fill(g, 0, 0, SEC, SEC, (x, y) => sh(DARK, 0.3 + h01(x >> 1, y >> 1, 4) * 0.2, x, y));
      for (const [cx, cy] of i % 2 ? [[9, 9], [23, 23]] : [[23, 9], [9, 23]]) {
        dome(g, cx, cy, 6, M.steel, 1);
        K.disc(g, cx, cy, 3.5, 3.5, DARK[4]);
        for (let a = 0; a < 6; a++) K.line(g, cx, cy, cx + Math.cos(a) * 3.5, cy + Math.sin(a) * 3.5, DARK[1]);
      }
      for (const [x, y, w, hh] of [[1, 15, 30, 2], [15, 1, 2, 30]]) { g.fillStyle = PIPE[2]; g.fillRect(x, y, w, hh); g.fillStyle = PIPE[0]; g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, hh); }
    },
  };
  ART.section = (kind, i, state) => K.get(`sec:${kind}:${i}:${state}`, () => {
    const c = K.mk(PADW, PADW), g = c.getContext("2d");
    if (state === 0) {
      /* down: a scorched heap of what it was */
      fill(g, 0, 0, SEC, SEC, (x, y) => {
        const r = h01(x, y, 77), d = Math.hypot(x - 15.5, y - 15.5) / 18;
        if (r < 0.2) return sh(roofRamp(kind), 0.3 + r * 2, x, y);
        if (r < 0.32) return sh(M.concrete, 0.5 + r, x, y);
        return sh(["#6b5f55", "#54493f", "#3f3630", "#2c2622", "#1d1916"], 0.4 + d * 0.4 + h01(x >> 1, y >> 1, 78) * 0.3, x, y);
      });
      for (let k = 0; k < 7; k++) {
        const x = 3 + h01(k, 1, i) * 24, y = 3 + h01(k, 2, i) * 24;
        shadowBox(g, x, y, 3, 3, 1);
        fill(g, x | 0, y | 0, 3, 3, (px, py) => sh(M.concrete, px === (x | 0) || py === (y | 0) ? 0.2 : 0.6, px, py));
      }
      for (let k = 0; k < 4; k++) K.line(g, 4 + h01(k, 5, i) * 24, 4 + h01(k, 6, i) * 24, 4 + h01(k, 7, i) * 24, 4 + h01(k, 8, i) * 24, "#2a2422");
      return c;
    }
    shadowBox(g, 0, 0, SEC, SEC, 4);
    roofs[kind](g, i);
    edge(g, 0, 0, SEC, SEC, "#20252c");
    g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(1, 1, SEC - 2, 1); g.fillRect(1, 1, 1, SEC - 2);
    if (i === 1 && state === 2 && kind !== "air") ART.emblem(g, 21, 2);
    if (state === 1) {
      /* hit: holes through the roof, burnt round the edges, soot blown south-east */
      for (let k = 0; k < 3; k++) {
        const cx = 6 + h01(k, i, 31) * 20, cy = 6 + h01(i, k, 32) * 20, r = 3 + h01(k, k, 33) * 3;
        fill(g, Math.floor(cx - r - 3), Math.floor(cy - r - 3), Math.ceil(r * 2 + 9), Math.ceil(r * 2 + 9), (x, y) => {
          const d = Math.hypot(x - cx, y - cy) + (h01(x, y, 34) - 0.5) * 2.2;
          const soot = Math.hypot(x - cx - 2.5, y - cy - 2.5);
          if (d < r * 0.6) return h01(x, y, 35) < 0.12 ? "#ff9a3c" : "#16110e";
          if (d < r) return "#3a2a20";
          if (soot < r + 2.5 && h01(x, y, 36) < 0.55) return "rgba(20,14,10,.5)";
          return null;
        });
      }
    }
    return c;
  });
  const roofRamp = k => ({ steel: RUST, arms: EARTH, tanks: ROOFB, air: VAULT, radio: M.white, engines: DARK })[k];

  /* a chimney top, seen from above */
  ART.stack = () => K.get("stack", () => {
    const c = K.mk(16, 16), g = c.getContext("2d");
    shadowDisc(g, 6, 6, 5, 5);
    dome(g, 6, 6, 5, M.concrete);
    K.disc(g, 6, 6, 2.6, 2.6, "#141010");
    g.fillStyle = "#c8321f"; g.fillRect(2, 2, 2, 1);
    return c;
  });

  /* ---- the airfield's hangars ---- */
  ART.hangar = alive => K.get("hangar:" + alive, () => {
    const W = 48, H = 32, c = K.mk(W + 8, H + 8), g = c.getContext("2d");
    if (!alive) {
      fill(g, 0, 0, W, H, (x, y) => { const r = h01(x, y, 91); return r < 0.25 ? sh(VAULT, 0.4 + r, x, y) : sh(["#6b5f55", "#54493f", "#3f3630", "#2c2622", "#1d1916"], 0.4 + h01(x >> 1, y >> 1, 92) * 0.5, x, y); });
      for (let k = 0; k < 6; k++) K.line(g, h01(k, 1, 9) * W, h01(k, 2, 9) * H, h01(k, 3, 9) * W, h01(k, 4, 9) * H, "#2a2422");
      return c;
    }
    shadowBox(g, 0, 0, W, H, 5);
    fill(g, 0, 0, W, H, (x, y) => {
      const ny = (y - 15.5) / 16, I = -ny * 0.66 + Math.sqrt(Math.max(0, 1 - ny * ny)) * 0.6;
      return sh(VAULT, 1 - PB.clamp(I + 0.15, 0, 1) + (x % 6 === 0 ? 0.12 : 0), x, y);
    });
    g.fillStyle = "#2d3138"; g.fillRect(4, H - 3, W - 8, 3);
    g.fillStyle = "#50565f"; for (let x = 6; x < W - 6; x += 5) g.fillRect(x, H - 3, 1, 3);
    edge(g, 0, 0, W, H, "#20252c");
    ART.emblem(g, W / 2 - 4, 8);
    return c;
  });

  /* ---- the flak gun's pit, the radar's tower ---- */
  ART.pit = alive => K.get("pit:" + alive, () => {
    const c = K.mk(24, 24), g = c.getContext("2d");
    if (!alive) { ART.craterDraw(g, 12, 12, 9, 5); return c; }
    shadowDisc(g, 11, 11, 10, 2);
    for (let a = 0; a < 14; a++) {
      const t = a / 14 * Math.PI * 2, x = 11 + Math.cos(t) * 8, y = 11 + Math.sin(t) * 8;
      dome(g, Math.round(x), Math.round(y), 2, M.sand, a % 2);
    }
    K.disc(g, 11, 11, 5, 5, M.concrete[2]);
    K.disc(g, 11, 11, 4, 4, M.concrete[1]);
    return c;
  });
  ART.tower = alive => K.get("tower:" + alive, () => {
    const c = K.mk(22, 22), g = c.getContext("2d");
    if (!alive) { ART.craterDraw(g, 10, 10, 8, 6); return c; }
    shadowBox(g, 4, 4, 12, 12, 4);
    fill(g, 4, 4, 12, 12, (x, y) => sh(M.concrete, x === 4 || y === 4 ? 0.1 : 0.45, x, y));
    g.fillStyle = M.steel[3];
    for (const [x0, y0] of [[5, 5], [14, 5], [5, 14], [14, 14]]) K.line(g, x0, y0, 10, 10, M.steel[2]);
    edge(g, 4, 4, 12, 12, "#2a2f36");
    return c;
  });

  /* ---- the shipyard ---- */
  ART.crane = flip => K.get("crane:" + flip, () => {
    const c = K.mk(60, 20), g = c.getContext("2d"), Y = M.yellow;
    const x0 = flip ? 50 : 2, dir = flip ? -1 : 1;
    g.fillStyle = SHADOW; g.fillRect(Math.min(x0, x0 + dir * 48) + 6, 12, 48, 4);
    for (let i = 0; i < 48; i++) {
      const x = x0 + dir * i;
      g.fillStyle = Y[i % 4 === 0 ? 3 : 1]; g.fillRect(x, 6, 1, 1); g.fillRect(x, 9, 1, 1);
      g.fillStyle = Y[2]; g.fillRect(x, 7 + ((i >> 1) & 1), 1, 1);
    }
    fill(g, x0 - (flip ? 5 : 0), 3, 6, 10, (x, y) => sh(Y, x === x0 - (flip ? 5 : 0) || y === 3 ? 0.1 : 0.55, x, y));
    g.fillStyle = "#3a3f46"; g.fillRect(x0 + dir * 40, 7, 1, 6);
    return c;
  });
  ART.shed = () => K.get("shed", () => {
    const W = 48, H = 32, c = K.mk(W + 6, H + 6), g = c.getContext("2d");
    shadowBox(g, 0, 0, W, H, 4);
    fill(g, 0, 0, W, H, (x, y) => sh(ROOFB, (y < H / 2 ? 0.25 : 0.6) + (x % 3 === 0 ? 0.1 : 0), x, y));
    g.fillStyle = ROOFB[0]; g.fillRect(0, H / 2, W, 1);
    edge(g, 0, 0, W, H, "#20252c");
    return c;
  });

  /* ---- craters and scorch, left where the bombs fell ---- */
  ART.craterDraw = (g, cx, cy, r, seed) => {
    fill(g, Math.floor(cx - r - 2), Math.floor(cy - r - 2), Math.ceil(r * 2 + 5), Math.ceil(r * 2 + 5), (x, y) => {
      const d = Math.hypot(x - cx, y - cy) / r + (h01(x, y, seed) - 0.5) * 0.35;
      if (d > 1.15) return null;
      if (d > 0.95) return h01(x, y, seed + 1) < 0.5 ? "rgba(40,30,22,.55)" : null;
      if (d > 0.72) return x + y < cx + cy ? "#5d5146" : "#3a312a";
      return d < 0.4 ? "#1a1512" : (x + y < cx + cy ? "#2a221d" : "#3d342c");
    });
  };
  ART.crater = (r, v) => K.get(`crater:${r}:${v}`, () => {
    const s = r * 2 + 6, c = K.mk(s, s), g = c.getContext("2d");
    ART.craterDraw(g, s / 2, s / 2, r, 50 + v);
    return c;
  });

  /* ---- little pictures for the HUD, as images ---- */
  const GLYPH = {
    steel: ["#########", "#########", "...###...", "...###...", "...###...", "...###...", "...###...", "#########", "#########"],
    arms: ["....#....", "...###...", "...###...", "..#####..", "..#####..", "..#####..", "..#####..", "..#####..", ".#######."],
    tanks: [".........", "...###...", "..#####..", "#######..", ".#######.", "#########", "#.#.#.#.#", ".#######.", "........."],
    air: ["....#....", "...###...", "...###...", ".#######.", "#########", "...###...", "...###...", "..#####..", ".##...##."],
    radio: ["#.......#", ".#.....#.", "..#####..", "..#...#..", "...#.#...", "....#....", "....#....", "...###...", "..#####.."],
    engines: ["...#.#...", ".#######.", ".##...##.", "###.#.###", ".#.###.#.", "###.#.###", ".##...##.", ".#######.", "...#.#..."],
  };
  ART.glyph = (kind, col) => K.get(`glyph:${kind}:${col}`, () => {
    const c = K.mk(9, 9), g = c.getContext("2d");
    g.fillStyle = col;
    GLYPH[kind].forEach((row, y) => { for (let x = 0; x < 9; x++) if (row[x] === "#") g.fillRect(x, y, 1, 1); });
    return c;
  });
  ART.bombIcon = on => K.get("bombI:" + on, () => {
    const c = K.mk(7, 12), g = c.getContext("2d");
    const R = on ? ["#f4ede4", "#cfd5dc", "#9aa3ad", "#6b737d", "#454b53"] : ["#454b53", "#3a4047", "#30353b", "#272b30", "#1f2226"];
    g.fillStyle = R[3]; g.fillRect(1, 9, 5, 1); g.fillRect(3, 8, 1, 4); g.fillRect(1, 11, 5, 1);
    for (let y = 0; y < 9; y++) for (let x = 0; x < 7; x++) {
      const nx = (x - 3) / 3.2, ny = (y - 4) / 4.6;
      if (nx * nx + ny * ny > 1) continue;
      g.fillStyle = R[PB.clamp(Math.round(2 + nx * 1.6 + ny * 0.8), 0, 4)]; g.fillRect(x, y, 1, 1);
    }
    if (on) { g.fillStyle = "#e64c34"; g.fillRect(1, 2, 5, 1); }
    return c;
  });
  ART.url = c => { if (!c._url) c._url = c.toDataURL(); return c._url; };
})();
