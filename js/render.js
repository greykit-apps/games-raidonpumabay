/* Raid on Puma Bay -- a frame of the bay, drawn.
 *
 * The play screen is as wide as the window and about three hundred pixels
 * high, scaled up by a whole number (js/main.js sets K.VW and K.VH). The
 * camera follows the helicopter and looks ahead of it. Bottom to top: the
 * bay, the surf, craters, what stands on the islands, the ships and their
 * wakes, cloud shadows, the shadows of whatever flies, bombs on their way
 * down, shots, the helicopter, the jets, then fire and smoke, and the
 * Field aids over all of it. Between the game's steps, things that move
 * are drawn a fraction of a step on, so the picture is smooth at any rate. */
"use strict";
(() => {
  const K = PB.K, E = PB.Engine, FX = PB.FX, ART = PB.ART, TR = PB.Terrain, C = PB.C;
  /* padT, padB: how much of the screen the HUD covers above and below the helicopter (js/hud.js);
     the camera centres the helicopter in what is left, easing there (mid) */
  const R = PB.Render = { g: null, cv: null, cam: { x: 0, y: 0 }, alpha: 0, frame: 0, rotor: 0, shake: 0, flashT: 0, keepOut: [], padT: 0, padB: 0, mid: null };
  const SHADOW_A = 0.32;

  R.init = cv => { R.cv = cv; R.g = cv.getContext("2d"); R.g.imageSmoothingEnabled = false; };
  /* the camera's aim: the helicopter, a little ahead of where it is going */
  const aim = S => {
    const h = S.heli;
    if (h.state === "deck" || h.state === "takeoff") return { x: h.x, y: h.y - 20 };
    return { x: h.x + h.vx * 34, y: h.y + h.vy * 30 };
  };
  /* where on the screen the aim sits, down from the top: the middle of the clear band, never far from the true middle */
  const midWant = () => PB.clamp((R.padT + K.VH - R.padB) / 2, K.VH * 0.5, K.VH * 0.62);
  R.snap = S => { const a = aim(S); R.mid = midWant(); R.cam.x = PB.wrap(a.x - K.VW / 2); R.cam.y = PB.wrap(a.y - R.mid); R.cx = a.x; R.cy = a.y; };
  R.follow = (S, dt) => {
    const a = aim(S), k = 1 - Math.pow(0.9, dt / 16.7);
    R.cx = PB.wrap(R.cx + PB.wd(R.cx, a.x) * k); R.cy = PB.wrap(R.cy + PB.wd(R.cy, a.y) * k);
    const want = midWant(); R.mid = R.mid === null ? want : R.mid + (want - R.mid) * k * 0.3;
    R.cam.x = PB.wrap(R.cx - K.VW / 2); R.cam.y = PB.wrap(R.cy - R.mid);
  };

  /* world to screen, the short way round the bay */
  let ox = 0, oy = 0;
  const sx = wx => PB.wd(ox, wx), sy = wy => PB.wd(oy, wy);
  R.sx = sx; R.sy = sy;
  const onScreen = (x, y, m = 40) => x > -m && y > -m && x < K.VW + m && y < K.VH + m;
  const blit = (g, c, x, y) => g.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
  const blitShadow = (g, name, a, x, y, alt) => {
    g.globalAlpha = SHADOW_A;
    blit(g, K.shadowOf(name, a), x + alt * 7, y + alt * 9);
    g.globalAlpha = 1;
  };

  /* ---- a frame ---- */
  R.draw = (S, ui = {}) => {
    const g = R.g, t = R.frame++, al = R.alpha;
    let shx = 0, shy = 0;
    if (R.shake > 0.3) { shx = Math.round((Math.random() - 0.5) * R.shake); shy = Math.round((Math.random() - 0.5) * R.shake); R.shake *= 0.86; } else R.shake = 0;
    ox = Math.floor(R.cam.x) + shx; oy = Math.floor(R.cam.y) + shy;
    const m = PB.MAP, h = S.heli, calm = PB.calm();
    const ip = (o, vx, vy) => [sx(o.x + vx * al), sy(o.y + vy * al)];

    TR.draw(g, ox, oy);
    TR.animate(g, ox, oy, t, sx, sy);

    /* craters */
    for (const c of S.craters) { const x = sx(c.x), y = sy(c.y); if (onScreen(x, y)) blit(g, ART.crater(c.r, (c.x * 7 + c.y) % 3 | 0), x, y); }

    /* ---- the islands' works ---- */
    S.factories.forEach(f => {
      const mf = m.factories[f.id];
      if (!onScreen(sx(mf.x), sy(mf.y), 90)) return;
      mf.sections.forEach((sc, i) => {
        const x = sx(sc.x), y = sy(sc.y);
        g.drawImage(ART.section(f.kind, i, f.hp[i]), Math.round(x), Math.round(y));
        if (f.hp[i] === 1) {
          /* burning */
          const fx = x + 10 + (i * 7) % 12, fy = y + 9 + (i * 5) % 14;
          FX.burn(g, fx, fy, t + i * 5, false);
          if (t % 9 === i) FX.smoke(sc.x + 10 + (i * 7) % 12, sc.y + 6 + (i * 5) % 14, 4, true);
        } else if (f.hp[i] === 0 && !f.dead && t % 30 === i) FX.smoke(sc.x + 16, sc.y + 16, 3, true);
      });
      if (f.dead) { if (t % 24 === f.id) FX.smoke(mf.x + (t % 7 - 3) * 6, mf.y, 5, true); return; }
      for (const st of mf.stacks) {
        blit(g, ART.stack(), sx(st.x) + 2, sy(st.y) + 2);
        if (t % 14 === (st.x | 0) % 14) FX.smoke(st.x, st.y, 3 + (S.lv[f.kind] || 0) / 4, f.kind === "steel");
      }
    });
    m.hangars.forEach((hg, i) => { const x = sx(hg.x), y = sy(hg.y); if (onScreen(x, y, 70)) g.drawImage(ART.hangar(S.hangars[i].hp > 0), Math.round(x), Math.round(y)); });
    for (const a of S.aa) {
      const x = sx(a.x), y = sy(a.y);
      if (!onScreen(x, y)) continue;
      blit(g, ART.pit(a.hp > 0), x, y);
      if (a.hp > 0) blit(g, K.spr("flak", a.ta), x, y);
    }
    for (const r of S.radars) {
      const x = sx(r.x), y = sy(r.y);
      if (!onScreen(x, y)) continue;
      blit(g, ART.tower(r.hp > 0), x, y);
      if (r.hp > 0) { blit(g, K.spr("dish", r.a), x - 1, y - 2); }
    }
    /* the battleship on the slip */
    const sh = S.ship, yd = m.yard;
    if (yd && !sh.launched && sh.progress > 0.02) {
      const x = sx(yd.ship.x), y = sy(yd.ship.y);
      if (onScreen(x, y, 90)) {
        const stage = sh.progress < 0.25 ? 1 : sh.progress < 0.5 ? 2 : sh.progress < 0.75 ? 3 : 4;
        blit(g, K.spr("ship" + stage, Math.PI), x, y);
        /* welding */
        if (S.phase === "play" && t % 6 === 0) FX.spark(yd.ship.x + (Math.random() - 0.5) * 18, yd.ship.y + (Math.random() - 0.5) * 90, 3, "#cdf6ff");
      }
    }
    /* tanks */
    for (const k of S.tanks) {
      const [x, y] = ip(k, 0, 0);
      if (!onScreen(x, y)) continue;
      blit(g, K.spr("tank", k.a), x, y);
      blit(g, K.spr("turret", k.ta), x, y);
    }

    FX.drawLow(g, sx, sy);

    /* ---- on the water ---- */
    const wake = (o, back, s, every) => { if (t % every === 0) FX.wake(o.x - PB.hx(o.a) * back + (Math.random() - 0.5) * 3, o.y - PB.hy(o.a) * back + (Math.random() - 0.5) * 3, s); };
    for (const c of S.cargo) { const [x, y] = ip(c, PB.hx(c.a) * C.CARGO.speed, PB.hy(c.a) * C.CARGO.speed); if (onScreen(x, y, 60)) { wake(c, 19, 1, 6); blit(g, K.spr("cargo", c.a), x, y); } }
    for (const b of S.gunboats) { const [x, y] = ip(b, PB.hx(b.a) * C.GUNBOAT.speed, PB.hy(b.a) * C.GUNBOAT.speed); if (onScreen(x, y, 60)) { wake(b, 13, 1, 4); blit(g, K.spr("gunboat", b.a), x, y); } }
    if (sh.launched && !sh.sunk) {
      const [x, y] = ip(sh, PB.hx(sh.a) * sh.sp, PB.hy(sh.a) * sh.sp);
      if (onScreen(x, y, 120)) { wake(sh, 54, 2, 4); blit(g, K.spr("ship4", sh.a), x, y); }
    }
    if (sh.wreck && S.t - sh.wreck.t < 2400) {
      const x = sx(sh.wreck.x), y = sy(sh.wreck.y), f = (S.t - sh.wreck.t) / 2400;
      if (onScreen(x, y, 120)) { g.globalAlpha = 1 - f; blit(g, K.spr("wreck", sh.wreck.a), x, y); g.globalAlpha = 1; if (t % 10 === 0) FX.smoke(sh.wreck.x + (Math.random() - 0.5) * 30, sh.wreck.y + (Math.random() - 0.5) * 60, 6, true); }
    }
    /* the carrier, and the spare helicopters on its deck */
    const cv = S.carrier;
    {
      const [x, y] = ip(cv, cv.vx, cv.vy);
      if (onScreen(x, y, 140)) {
        if (cv.sunk) {
          const f = Math.min(1, cv.sinkT / 1500);
          g.globalAlpha = 1 - f * 0.85; blit(g, K.spr("carrier", cv.a), x, y); g.globalAlpha = 1;
          if (t % 6 === 0 && f < 1) FX.smoke(cv.x + (Math.random() - 0.5) * 40, cv.y + (Math.random() - 0.5) * 100, 7, true);
        } else {
          wake(cv, 76, 3, 3);
          blit(g, K.spr("carrier", cv.a), x, y);
          for (let i = 0; i < Math.min(S.helis, 4); i++) {
            const p = E.onCarrier(cv, -12 + (i % 2) * 9, 22 + Math.floor(i / 2) * 15);
            blit(g, K.spr("spare", cv.a + 0.3), sx(p.x), sy(p.y));
          }
          /* the landing spot blinks when the helicopter is coming in to it */
          if (ui.aids && ui.aids.landing && h.state === "fly" && h.bombs < C.HELI.bombs && PB.dist(h.x, h.y, cv.x, cv.y) < 220 && (calm || (t >> 4) % 2 === 0)) {
            const p = E.onCarrier(cv, E.DECK_SPOT.u, E.DECK_SPOT.w);
            g.globalAlpha = 0.85; g.drawImage(ring(11, "#9fffb0"), Math.round(sx(p.x) - 12), Math.round(sy(p.y) - 12)); g.globalAlpha = 1;
          }
        }
      }
    }

    TR.drawClouds(g, S.t, sx, sy, true);

    /* ---- shadows of whatever flies ---- */
    const hAng = h.a;
    if (h.state !== "gone") { const [x, y] = ip(h, h.vx, h.vy); blitShadow(g, "heli", hAng, x, y, 0.4 + h.alt * 1.6); }
    for (const f of S.fighters) { const [x, y] = ip(f, PB.hx(f.a) * f.v, PB.hy(f.a) * f.v); if (onScreen(x + 20, y + 20)) blitShadow(g, "fighter", f.a, x, y, 0.4 + f.alt * 1.5); }
    for (const b of S.bombers) { if (b.t < 0) continue; const [x, y] = ip(b, PB.hx(b.a) * b.v, PB.hy(b.a) * b.v); if (onScreen(x + 30, y + 30, 60)) blitShadow(g, "bomber", b.a, x, y, 0.4 + b.alt * 1.5); }

    /* bombs on the way down: smaller as they fall, their shadow closing on them */
    for (const b of S.bombs) {
      const x = sx(b.x + b.vx * al), y = sy(b.y + b.vy * al), f = b.t / C.HELI.bombFall;
      if (!onScreen(x, y)) continue;
      g.fillStyle = "rgba(10,18,38,.4)"; g.fillRect(Math.round(x + (1 - f) * 8), Math.round(y + (1 - f) * 10), 2, 2);
      const s = f < 0.4 ? 2 : 1;
      g.fillStyle = b.by === "p" ? "#e9eef2" : "#2c2e32"; g.fillRect(Math.round(x) - (s >> 1), Math.round(y) - s, s + 1, s * 2 + 1);
      g.fillStyle = b.by === "p" ? "#e64c34" : "#6a6d73"; g.fillRect(Math.round(x) - (s >> 1), Math.round(y) - s, s + 1, 1);
    }
    /* shots */
    for (const s of S.shots) {
      const x = sx(s.x + s.vx * al), y = sy(s.y + s.vy * al);
      if (!onScreen(x, y, 10)) continue;
      switch (s.k) {
        case "bullet":
          K.line(g, x, y, x - s.vx * 0.9, y - s.vy * 0.9, s.by === "p" ? "#fff6c4" : "#ff8a5c");
          g.fillStyle = s.by === "p" ? "#ffffff" : "#ffd0a0"; g.fillRect(Math.round(x), Math.round(y), 1, 1); break;
        case "shell": g.fillStyle = "#1d1f22"; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); g.fillStyle = "#ffb03a"; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 1, 1); break;
        case "flak": g.fillStyle = "#3c3a38"; g.fillRect(Math.round(x), Math.round(y), 1, 1); break;
        case "heavy": g.fillStyle = "#1d1f22"; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); g.fillStyle = "#ffe27a"; g.fillRect(Math.round(x), Math.round(y), 1, 1); break;
        case "missile":
          K.line(g, x, y, x - PB.hx(s.a) * 4, y - PB.hy(s.a) * 4, "#e9eef2");
          g.fillStyle = "#e64c34"; g.fillRect(Math.round(x), Math.round(y), 1, 1);
          g.fillStyle = (t & 2) ? "#ffe27a" : "#ff9a3c"; g.fillRect(Math.round(x - PB.hx(s.a) * 5), Math.round(y - PB.hy(s.a) * 5), 1, 1);
          break;
      }
    }

    /* ---- the helicopter ---- */
    if (h.state !== "gone") {
      const [x, y] = ip(h, h.vx, h.vy);
      const spin = h.state === "deck" ? (S.phase === "play" ? 0.08 : 0) : 0.62;
      R.rotor += spin;
      if (h.state === "down" && h.alt <= 0.05) { /* in the water: gone under */ }
      else {
        blit(g, K.spr("heli", hAng), x, y);
        drawRotor(g, x, y, hAng, h.state === "deck" ? 0.25 : 1);
        if (h.inv > 0 && (calm || (t >> 2) % 2)) { g.globalAlpha = calm ? 0.2 : 0.35; blit(g, K.silhouette(K.spr("heli", hAng), "#ffffff"), x, y); g.globalAlpha = 1; }
      }
    }
    /* ---- the jets ---- */
    for (const f of S.fighters) {
      const [x, y] = ip(f, PB.hx(f.a) * f.v, PB.hy(f.a) * f.v);
      if (!onScreen(x, y)) continue;
      blit(g, K.spr("fighter", f.a), x, y);
      if (f.st !== "taxi" && (t & 2)) { g.fillStyle = "#ffb03a"; g.fillRect(Math.round(x - PB.hx(f.a) * 12), Math.round(y - PB.hy(f.a) * 12), 1, 1); }
    }
    for (const b of S.bombers) {
      if (b.t < 0) continue;
      const [x, y] = ip(b, PB.hx(b.a) * b.v, PB.hy(b.a) * b.v);
      if (!onScreen(x, y, 60)) continue;
      blit(g, K.spr("bomber", b.a), x, y);
      for (const s of [-10, 10]) { const px = x + Math.cos(b.a) * s - PB.hx(b.a) * 9, py = y + Math.sin(b.a) * s - PB.hy(b.a) * 9; g.fillStyle = (t + s) & 2 ? "#3a3d42" : "#8c9096"; g.fillRect(Math.round(px - Math.cos(b.a) * 3), Math.round(py - Math.sin(b.a) * 3), 1, 1); g.fillRect(Math.round(px + Math.cos(b.a) * 3), Math.round(py + Math.sin(b.a) * 3), 1, 1); }
    }

    FX.drawHigh(g, sx, sy);

    /* ---- the Field aids ---- */
    const aids = ui.aids || {};
    if (aids.reticle && h.state === "fly" && h.bombs > 0) {
      const p = E.bombLanding(h), x = sx(p.x), y = sy(p.y), on = targetUnder(S, p.x, p.y);
      const col = on ? "#ffd84d" : "rgba(255,255,255,.75)", r = on ? 4 + (calm ? 1 : (t >> 3) & 1) : 4;
      g.fillStyle = col;
      /* four corners round where it will land, and a dot in the middle */
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cx = Math.round(x + dx * r), cy = Math.round(y + dy * r);
        g.fillRect(dx < 0 ? cx : cx - 1, cy, 2, 1);
        g.fillRect(cx, dy < 0 ? cy : cy - 1, 1, 2);
      }
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    if (aids.arrows) {
      /* the point on the screen's edge toward x, y, drawn back toward the middle out of the HUD's way */
      const edge = (x, y, m) => {
        const cx = K.VW / 2, cy = K.VH / 2, dx = x - cx, dy = y - cy, k = Math.min((cx - m) / Math.abs(dx || 1e-6), (cy - m) / Math.abs(dy || 1e-6));
        let f = 1;
        const inside = f => R.keepOut.some(r => { const px = cx + dx * k * f, py = cy + dy * k * f; return px > r.x0 && px < r.x1 && py > r.y0 && py < r.y1; });
        while (f > 0.4 && inside(f)) f -= 0.02;
        return [cx + dx * k * f, cy + dy * k * f, Math.atan2(dy, dx)];
      };
      const arrow = (wx, wy, col, big) => {
        const x = sx(wx), y = sy(wy);
        if (onScreen(x, y, -8)) return;
        const [ax, ay, a] = edge(x, y, 12);
        drawArrow(g, ax, ay, a, col, big);
      };
      /* the nearest factory still standing, with its mark beside the arrow: the way to the work */
      let near = null, nd = Infinity;
      S.factories.forEach(f => { if (f.dead) return; const mf = m.factories[f.id], dd = PB.dist(h.x, h.y, mf.x, mf.y); if (dd < nd) { nd = dd; near = { f, mf }; } });
      if (near) {
        const x = sx(near.mf.x), y = sy(near.mf.y);
        if (!onScreen(x, y, -8)) {
          const [ax, ay, a] = edge(x, y, 14);
          drawArrow(g, ax, ay, a, "#e4572e", true);
          const gx = Math.round(ax - Math.cos(a) * 12 - 4), gy = Math.round(ay - Math.sin(a) * 12 - 4);
          g.fillStyle = K.OUT; g.fillRect(gx - 2, gy - 2, 13, 13); g.fillStyle = "#e4572e"; g.fillRect(gx - 1, gy - 1, 11, 11); g.drawImage(ART.glyph(near.f.kind, K.OUT), gx, gy);
        }
      }
      if (!cv.sunk && h.state !== "deck") arrow(cv.x, cv.y, "#7fe08a", true);
      if (sh.launched && !sh.sunk) arrow(sh.x, sh.y, "#ffb03a", true);
      for (const f of S.fighters) if (f.st !== "taxi" && PB.dist(h.x, h.y, f.x, f.y) < 700) arrow(f.x, f.y, "#ff6b52", false);
      for (const b of S.bombers) if (b.t >= 0 && b.st !== "taxi") arrow(b.x, b.y, "#ff6b52", true);
    }
  };

  /* is there something a bomb landing here would hit? */
  function targetUnder(S, x, y) {
    const m = PB.MAP;
    for (const f of S.factories) {
      if (f.dead) continue;
      const mf = m.factories[f.id];
      if (PB.dist(x, y, mf.x, mf.y) > 70) continue;
      for (let i = 0; i < mf.sections.length; i++) { const sc = mf.sections[i]; if (f.hp[i] > 0 && Math.abs(PB.wd(sc.x + 16, x)) < 22 && Math.abs(PB.wd(sc.y + 16, y)) < 22) return true; }
    }
    if (S.ship.launched && !S.ship.sunk && E.onShip(S.ship, x, y, 4)) return true;
    const yd = m.yard;
    if (yd && !S.ship.launched && S.ship.progress > 0.02 && Math.abs(PB.wd(yd.dock.x + yd.dock.w / 2, x)) < yd.dock.w / 2 + 4 && Math.abs(PB.wd(yd.dock.y + yd.dock.h / 2, y)) < yd.dock.h / 2 + 4) return true;
    for (const list of [S.aa, S.radars, S.tanks, S.cargo, S.gunboats]) for (const o of list) if (o.hp > 0 && PB.dist(x, y, o.x, o.y) < C.HELI.bombRadius + 3) return true;
    for (let i = 0; i < m.hangars.length; i++) { const hg = m.hangars[i]; if (S.hangars[i].hp > 0 && Math.abs(PB.wd(hg.x + hg.w / 2, x)) < hg.w / 2 + 6 && Math.abs(PB.wd(hg.y + hg.h / 2, y)) < hg.h / 2 + 6) return true; }
    return false;
  }
  R.targetUnder = targetUnder;

  /* the rotor: a faint disc and two blades, turning */
  function drawRotor(g, x, y, a, k) {
    const r = 15, ang = R.rotor;
    if (k > 0.5) { g.globalAlpha = 0.16; g.drawImage(disc(r, "#e8eef4"), Math.round(x - r), Math.round(y - r)); g.globalAlpha = 1; }
    for (let i = 0; i < (k > 0.5 ? 3 : 1); i++) {
      const b = ang - i * 0.22;
      g.globalAlpha = i === 0 ? 0.95 : 0.4 / i;
      K.line(g, x - Math.cos(b) * r, y - Math.sin(b) * r, x + Math.cos(b) * r, y + Math.sin(b) * r, "#262b33");
    }
    g.globalAlpha = 1;
    /* the tail rotor */
    const tx = x - PB.hx(a) * 18 + Math.cos(a) * 1.5, ty = y - PB.hy(a) * 18 + Math.sin(a) * 1.5, s = (R.frame >> 1) & 1;
    K.line(g, tx - PB.hx(a) * (s ? 3 : 0) - Math.cos(a) * (s ? 0 : 0.5), ty - PB.hy(a) * (s ? 3 : 0), tx + PB.hx(a) * (s ? 3 : 0), ty + PB.hy(a) * (s ? 3 : 0) + (s ? 0 : 0), "#3a4150");
  }
  const disc = (r, col) => K.get(`rdisc:${r}:${col}`, () => { const c = K.mk(r * 2 + 1, r * 2 + 1); K.disc(c.getContext("2d"), r, r, r, r, col); return c; });
  const ring = (r, col) => K.get(`rring:${r}:${col}`, () => {
    const s = r * 2 + 3, c = K.mk(s, s), g = c.getContext("2d"); g.fillStyle = col;
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const d = Math.hypot(x, y); if (d <= r + 0.5 && d >= r - 0.6) g.fillRect(x + r + 1, y + r + 1, 1, 1); }
    return c;
  });
  function drawArrow(g, x, y, a, col, big) {
    const L = big ? 8 : 6, W2 = big ? 5 : 4;
    const tip = [x + Math.cos(a) * L, y + Math.sin(a) * L], l = [x + Math.cos(a + 2.5) * W2, y + Math.sin(a + 2.5) * W2], r = [x + Math.cos(a - 2.5) * W2, y + Math.sin(a - 2.5) * W2];
    g.fillStyle = K.OUT;
    tri(g, tip[0] + 1, tip[1] + 1, l[0] + 1, l[1] + 1, r[0] + 1, r[1] + 1);
    g.fillStyle = col;
    tri(g, tip[0], tip[1], l[0], l[1], r[0], r[1]);
  }
  function tri(g, x0, y0, x1, y1, x2, y2) {
    const minY = Math.floor(Math.min(y0, y1, y2)), maxY = Math.ceil(Math.max(y0, y1, y2));
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (const [ax, ay, bx, by] of [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]]) if ((ay <= y + 0.5) !== (by <= y + 0.5)) xs.push(ax + (y + 0.5 - ay) * (bx - ax) / (by - ay));
      if (xs.length >= 2) { const a = Math.min(...xs), b = Math.max(...xs); g.fillRect(Math.round(a), y, Math.max(1, Math.round(b - a)), 1); }
    }
  }

  /* ---- what the events look like ---- */
  R.events = (S, evs) => {
    const h = S.heli;
    for (const e of evs) {
      switch (e.t) {
        case "boom": FX.explode(e.x, e.y, e.bomb ? (e.hit ? 18 : 13) : 12, {}); if (PB.dist(e.x, e.y, h.x, h.y) < 260) R.shake = Math.max(R.shake, e.bomb ? 4 : 2.5); break;
        case "splash": FX.splash(e.x, e.y, e.r || 12); break;
        case "flak": FX.flak(e.x, e.y, e.r); break;
        case "heavyBurst": FX.flak(e.x, e.y, e.r * 1.2); FX.splash(e.x, e.y, 10); break;
        case "boomSmall": FX.explode(e.x, e.y, 7); break;
        case "kill": FX.explode(e.x, e.y, e.air ? 14 : 11, { water: e.water }); if (e.water) FX.splash(e.x, e.y, 16); break;
        case "spark": FX.spark(e.x, e.y, 4); break;
        case "hit": FX.spark(e.x, e.y, 6, "#ffd27a"); R.shake = Math.max(R.shake, 3); R.flashT = 10; break;
        case "gun": FX.muzzle(e.x, e.y, e.a); break;
        case "ciws": FX.tracer(e.x, e.y, e.tx, e.ty); break;
        case "trail": FX.trail(e.x, e.y); break;
        case "smoke": FX.smoke(e.x, e.y, e.dark ? 4 : 3, e.dark); break;
        case "score": FX.score(e.x, e.y, e.n); break;
        case "heliDown": FX.explode(e.x, e.y, 10); R.shake = 6; break;
        case "heliCrash": FX.explode(e.x, e.y, 20); if (e.water) FX.splash(e.x, e.y, 20); R.shake = 7; break;
        case "sectionDown": { const mf = PB.MAP.factories[e.f], sc = mf.sections[e.i]; FX.explode(sc.x + 16, sc.y + 16, 22); R.shake = Math.max(R.shake, 5); break; }
        case "factoryDown": FX.explode(e.x, e.y, 34); R.shake = 8; break;
        case "shipSunk": FX.explode(e.x, e.y, 40); for (let i = 0; i < 5; i++) FX.explode(e.x + (Math.random() - 0.5) * 30, e.y + (Math.random() - 0.5) * 90, 18); R.shake = 9; break;
        case "carrierSunk": for (let i = 0; i < 5; i++) FX.explode(e.x + (Math.random() - 0.5) * 30, e.y + (Math.random() - 0.5) * 110, 20); break;
        case "carrierHit": FX.explode(e.x + (Math.random() - 0.5) * 20, e.y + (Math.random() - 0.5) * 80, 9); break;
        case "flakFire": case "tankFire": case "shipFire": FX.muzzle(e.x, e.y, 0); break;
        case "delivered": FX.ripple(e.x, e.y); break;
      }
    }
  };
})();
