/* Raid on Puma Bay -- what flashes, burns and drifts: explosions, flak,
 * splashes, smoke, sparks and wakes. The engine says what happened (its
 * events); this keeps a list of particles that play it out on the screen
 * and are gone. Nothing here touches the game's state, so it can never
 * change how a game goes. */
"use strict";
(() => {
  const K = PB.K;
  const FX = PB.FX = { list: [], decals: [] };
  const FIRE = ["#fffbe0", "#ffe27a", "#ffb03a", "#f0702a", "#b83a1c", "#5e2416"];
  const SMOKE = ["#d8d4cf", "#aeaaa5", "#86827e", "#5e5b58", "#3c3a38"];
  const FOAM = ["#ffffff", "#e3f4f8", "#b9e2ec"];

  /* a dithered disc, cached by radius, colour and how much of it is there */
  const puff = (r, col, fillK = 1) => K.get(`puff:${r}:${col}:${fillK}`, () => {
    const s = r * 2 + 1, c = K.mk(s, s), g = c.getContext("2d");
    g.fillStyle = col;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y) / (r + 0.5);
      if (d > 1) continue;
      /* thinner toward the edge, by the dither */
      if (d > 0.55 && K.bayer(x + 8, y + 8) + 0.5 > fillK * (1.6 - d * 1.1)) continue;
      g.fillRect(x + r, y + r, 1, 1);
    }
    return c;
  });
  const ring = (r, col) => K.get(`ring:${r}:${col}`, () => {
    const s = r * 2 + 3, c = K.mk(s, s), g = c.getContext("2d");
    g.fillStyle = col;
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const d = Math.hypot(x, y); if (d <= r + 0.5 && d >= r - 0.8) g.fillRect(x + r + 1, y + r + 1, 1, 1); }
    return c;
  });

  const add = p => { FX.list.push(p); return p; };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---- what the events make ---- */
  FX.explode = (x, y, r = 16, opts = {}) => {
    add({ k: "flash", x, y, r: r * 1.4, t: 0, life: 6 });
    add({ k: "ball", x, y, r, t: 0, life: 26 + r });
    const n = Math.round(r * 0.9);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = rnd(0.4, 1.4) * r / 10;
      add({ k: "debris", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, z: 0, vz: rnd(0.6, 1.8), t: 0, life: rnd(30, 60), col: opts.water ? FOAM[1] : Math.random() < 0.5 ? "#2a2420" : "#ffb03a" });
    }
    for (let i = 0; i < Math.round(r / 4); i++) FX.smoke(x + rnd(-r, r) * 0.4, y + rnd(-r, r) * 0.4, rnd(3, 6), true, rnd(10, 40));
    if (opts.scorch && !opts.water) FX.decals.push({ x, y, r: Math.round(r * 0.55), v: Math.floor(Math.random() * 3), t: 0 });
  };
  FX.splash = (x, y, r = 12) => {
    add({ k: "splash", x, y, r, t: 0, life: 34 });
    for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28, s = rnd(0.3, 1.1); add({ k: "drop", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, z: 0, vz: rnd(1, 2.4), t: 0, life: 40 }); }
  };
  FX.flak = (x, y, r = 12) => {
    add({ k: "flak", x, y, r: Math.max(5, Math.round(r * 0.55)), t: 0, life: 46 });
    for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28; add({ k: "spark", x, y, vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.4, t: 0, life: 10, col: "#ffd27a" }); }
  };
  FX.smoke = (x, y, r = 4, dark = false, delay = 0, alt = 0) => add({ k: "smoke", x, y, r, t: -delay, life: 70 + r * 8, dark, vx: rnd(0.08, 0.22), vy: rnd(0.03, 0.12), alt });
  FX.spark = (x, y, n = 5, col = "#fff2a8") => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = rnd(0.6, 1.8); add({ k: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: rnd(6, 14), col }); } };
  FX.muzzle = (x, y, a) => add({ k: "muzzle", x, y, a, t: 0, life: 3 });
  FX.tracer = (x0, y0, x1, y1) => add({ k: "tracer", x: x0, y: y0, x1, y1, t: 0, life: 5 });
  FX.wake = (x, y, s = 1) => add({ k: "wake", x, y, t: 0, life: 70 + s * 40, s });
  FX.trail = (x, y) => add({ k: "trail", x, y, t: 0, life: 26 });
  FX.score = (x, y, n) => add({ k: "score", x, y, n, t: 0, life: 60 });
  FX.ripple = (x, y) => add({ k: "ripple", x, y, t: 0, life: 40 });

  /* ---- a frame of it ---- */
  FX.step = () => {
    const keep = [];
    for (const p of FX.list) {
      p.t++;
      if (p.t >= p.life) continue;
      if (p.vx !== undefined) { p.x += p.vx; p.y += p.vy; if (p.k === "smoke") { p.vx *= 0.995; } else { p.vx *= 0.96; p.vy *= 0.96; } }
      if (p.vz !== undefined) { p.z += p.vz; p.vz -= 0.1; if (p.z < 0) { p.z = 0; p.vz = 0; p.vx *= 0.5; p.vy *= 0.5; } }
      keep.push(p);
    }
    FX.list = keep;
    for (const d of FX.decals) d.t++;
    if (FX.decals.length > 90) FX.decals.splice(0, FX.decals.length - 90);
  };
  FX.clear = () => { FX.list = []; FX.decals = []; };

  /* draw: sx, sy turn a world point into a screen point (the bay wraps) */
  FX.drawLow = (g, sx, sy) => {
    for (const p of FX.list) {
      if (p.k !== "wake" && p.k !== "ripple" && p.k !== "splash" && p.k !== "drop") continue;
      const x = sx(p.x), y = sy(p.y), f = p.t / p.life;
      if (x < -40 || y < -40 || x > K.VW + 40 || y > K.VH + 40) continue;
      if (p.k === "wake") { const r = Math.round(1 + f * 3 * p.s); g.globalAlpha = 0.7 * (1 - f); g.drawImage(puff(r, FOAM[1], 0.7 - f * 0.4), x - r, y - r); g.globalAlpha = 1; }
      else if (p.k === "ripple") { const r = Math.round(2 + f * 9); g.globalAlpha = 1 - f; g.drawImage(ring(r, FOAM[0]), x - r - 1, y - r - 1); g.globalAlpha = 1; }
      else if (p.k === "splash") {
        const r = Math.round(p.r * (0.3 + f * 0.9));
        g.globalAlpha = 1 - f; g.drawImage(ring(r, FOAM[0]), x - r - 1, y - r - 1);
        if (f < 0.5) { const c = Math.round(p.r * 0.5 * (1 - f * 2)) + 1; g.drawImage(puff(c, FOAM[0]), x - c, y - c - Math.round(f * 6)); }
        g.globalAlpha = 1;
      } else if (p.k === "drop") { g.fillStyle = FOAM[0]; g.fillRect(Math.round(x), Math.round(y - p.z), 1, 1); }
    }
  };
  FX.drawHigh = (g, sx, sy) => {
    for (const p of FX.list) {
      const x = sx(p.x), y = sy(p.y), f = p.t / p.life;
      if (x < -60 || y < -60 || x > K.VW + 60 || y > K.VH + 60) continue;
      switch (p.k) {
        case "flash": { const r = Math.round(p.r * (1 - f * 0.4)); g.globalAlpha = 0.85 * (1 - f); g.drawImage(puff(r, FIRE[0], 0.9), x - r, y - r); g.globalAlpha = 1; break; }
        case "ball": {
          /* a fireball: white at the heart, then yellow, orange, red, into smoke */
          const grow = Math.min(1, f * 3.5), r = Math.round(p.r * (0.45 + grow * 0.55));
          const k = Math.min(5, Math.floor(f * 6.5));
          if (f < 0.75) {
            g.drawImage(puff(r, FIRE[Math.min(5, k + 2)], 1 - f * 0.6), x - r, y - r);
            const r2 = Math.round(r * (0.75 - f * 0.5)); if (r2 > 0) g.drawImage(puff(r2, FIRE[Math.min(5, k + 1)], 1), x - r2 - 1, y - r2 - 1);
            const r3 = Math.round(r * (0.45 - f * 0.4)); if (r3 > 0) g.drawImage(puff(r3, FIRE[k]), x - r3 - 2, y - r3 - 2);
          } else { g.globalAlpha = (1 - f) * 3; g.drawImage(puff(r, SMOKE[3], 0.6), x - r, y - r - Math.round(f * 6)); g.globalAlpha = 1; }
          break;
        }
        case "flak": {
          const r = Math.round(p.r * (0.6 + Math.min(1, f * 4) * 0.4));
          if (f < 0.12) g.drawImage(puff(Math.round(r * 0.7), FIRE[1]), x - Math.round(r * 0.7), y - Math.round(r * 0.7));
          g.globalAlpha = Math.min(1, (1 - f) * 1.6);
          g.drawImage(puff(r, "#2b2a2c", 0.85 - f * 0.4), x - r + Math.round(f * 4), y - r - Math.round(f * 2));
          g.drawImage(puff(Math.max(1, r - 3), "#4a4847", 0.7), x - r + 2 + Math.round(f * 4), y - r + 1 - Math.round(f * 2));
          g.globalAlpha = 1; break;
        }
        case "smoke": {
          if (p.t < 0) break;
          const r = Math.round(p.r * (0.6 + f * 1.1)), ramp = p.dark ? [SMOKE[3], SMOKE[4]] : [SMOKE[1], SMOKE[2]];
          g.globalAlpha = 0.75 * (1 - f);
          g.drawImage(puff(r, ramp[1], 0.8 - f * 0.4), x - r, y - r - (p.alt || 0));
          if (r > 2) g.drawImage(puff(r - 2, ramp[0], 0.6 - f * 0.3), x - r + 1, y - r - (p.alt || 0));
          g.globalAlpha = 1; break;
        }
        case "debris": { g.fillStyle = p.col; g.fillRect(Math.round(x), Math.round(y - p.z), 1, 1); if (p.z > 0) { g.fillStyle = "rgba(10,18,38,.4)"; g.fillRect(Math.round(x + 1), Math.round(y + 1), 1, 1); } break; }
        case "spark": { g.fillStyle = p.col; g.fillRect(Math.round(x), Math.round(y), 1, 1); break; }
        case "muzzle": { g.fillStyle = FIRE[1]; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); g.fillStyle = FIRE[0]; g.fillRect(Math.round(x), Math.round(y), 1, 1); break; }
        case "tracer": { g.globalAlpha = 1 - f; K.line(g, x, y, sx(p.x1), sy(p.y1), "#ffe27a"); g.globalAlpha = 1; break; }
        case "trail": { const r = Math.round(1 + f * 3); g.globalAlpha = 0.6 * (1 - f); g.drawImage(puff(r, SMOKE[1], 0.8 - f * 0.5), x - r, y - r); g.globalAlpha = 1; break; }
        case "score": { const s = "+" + p.n; g.globalAlpha = f > 0.7 ? (1 - f) / 0.3 : 1; K.text3(g, s, Math.round(x - K.text3w(s) / 2), Math.round(y - 8 - f * 14), "#fff2a8"); g.globalAlpha = 1; break; }
      }
    }
  };
  FX.drawDecals = (g, sx, sy) => {
    for (const d of FX.decals) {
      const x = sx(d.x), y = sy(d.y);
      if (x < -30 || y < -30 || x > K.VW + 30 || y > K.VH + 30) continue;
      const c = PB.ART.crater(Math.max(3, Math.min(12, d.r)), d.v);
      g.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
    }
  };
  /* fire on a hit building: a flicker and a column of smoke */
  FX.burn = (g, x, y, t, big) => {
    const k = (t >> 2) & 3, r = big ? 3 : 2;
    g.drawImage(puff(r + (k & 1), FIRE[2 + (k >> 1)], 0.9), Math.round(x - r), Math.round(y - r - (k & 1)));
    g.drawImage(puff(Math.max(1, r - 1), FIRE[1], 1), Math.round(x - r + 1), Math.round(y - r));
  };
})();
