/* Raid on Puma Bay -- the helicopter and the carrier it flies from.
 *
 * The helicopter turns and thrusts as the 1984 one did, and keeps its way
 * on: let go of the stick and it drifts to a stop. Fly over the carrier's
 * deck slowly enough and it settles there, to be patched up and loaded with
 * nine bombs again. Lift off by pushing forward. A bomb falls for a moment
 * after it leaves, carried on by the helicopter's way, so it lands ahead.
 *
 * Direct steering (a Field aid) points the helicopter where the stick
 * points instead: the engine turns it that way and flies. */
"use strict";
(() => {
  const C = PB.C, H = C.HELI;
  const E = PB.Engine = PB.Engine || {};

  /* ---- the carrier ---- */
  /* a point on the carrier, u to starboard and w forward, in pixels */
  E.onCarrier = (cv, u, w) => {
    const rx = Math.cos(cv.a), ry = Math.sin(cv.a), fx = Math.sin(cv.a), fy = -Math.cos(cv.a);
    return { x: PB.wrap(cv.x + rx * u + fx * w), y: PB.wrap(cv.y + ry * u + fy * w) };
  };
  /* a world point in the carrier's frame */
  E.carrierLocal = (cv, x, y) => {
    const dx = PB.wd(cv.x, x), dy = PB.wd(cv.y, y);
    return { u: dx * Math.cos(cv.a) + dy * Math.sin(cv.a), w: dx * Math.sin(cv.a) - dy * Math.cos(cv.a) };
  };
  E.CARRIER_HULL = { u: 21, w: 74 };
  E.DECK_SPOT = { u: -3, w: -36 };
  E.overDeck = (cv, x, y) => { const l = E.carrierLocal(cv, x, y); return Math.abs(l.u) < 17 && Math.abs(l.w) < 62; };
  E.onHull = (cv, x, y, pad = 0) => { const l = E.carrierLocal(cv, x, y); return Math.abs(l.u) < E.CARRIER_HULL.u + pad && Math.abs(l.w) < E.CARRIER_HULL.w + pad - Math.max(0, Math.abs(l.u) - 12) * 2; };

  E.newCarrier = () => {
    const p = PB.MAP.carrierPath;
    const a = PB.angTo(p[0][0], p[0][1], p[1][0], p[1][1]);
    return { x: p[0][0], y: p[0][1], a, seg: 1, hp: C.CARRIER.hp, sunk: false, sinkT: 0, vx: 0, vy: 0, ciws: 0 };
  };
  E.tickCarrier = (S, ev) => {
    const cv = S.carrier;
    if (cv.sunk) { cv.sinkT++; cv.vx = cv.vy = 0; return; }
    const p = PB.MAP.carrierPath, [tx, ty] = p[cv.seg];
    if (PB.dist(cv.x, cv.y, tx, ty) < 24) cv.seg = (cv.seg + 1) % p.length;
    const want = PB.angTo(cv.x, cv.y, tx, ty);
    cv.a = PB.turnToward(cv.a, want, 0.0016);
    cv.vx = PB.hx(cv.a) * C.CARRIER.speed; cv.vy = PB.hy(cv.a) * C.CARRIER.speed;
    cv.x = PB.wrap(cv.x + cv.vx); cv.y = PB.wrap(cv.y + cv.vy);
    /* close-in guns: a burst at the nearest enemy aircraft over the ship */
    if (cv.ciws > 0) cv.ciws--;
    else {
      let best = null, bd = 125;
      for (const f of S.fighters) { const d = PB.dist(cv.x, cv.y, f.x, f.y); if (f.hp > 0 && f.st !== "taxi" && d < bd) { bd = d; best = f; } }
      for (const b of S.bombers) { const d = PB.dist(cv.x, cv.y, b.x, b.y); if (b.hp > 0 && d < bd) { bd = d; best = b; } }
      if (best) {
        cv.ciws = 34;
        const from = E.onCarrier(cv, 15, 4);
        ev.push({ t: "ciws", x: from.x, y: from.y, tx: best.x, ty: best.y });
        if (PB.rand(S) < 0.55) E.hitAircraft(S, best, 1, ev, "ciws");
      }
    }
  };
  E.hurtCarrier = (S, n, ev) => {
    const cv = S.carrier;
    if (cv.sunk) return;
    cv.hp = Math.max(0, cv.hp - n * S.D.dmg);
    ev.push({ t: "carrierHit", x: cv.x, y: cv.y, hp: cv.hp });
    if (cv.hp <= 0) {
      cv.sunk = true; cv.sinkT = 0;
      ev.push({ t: "carrierSunk", x: cv.x, y: cv.y });
      const h = S.heli;
      if (h.state === "deck" || h.state === "landing" || h.state === "takeoff") E.heliDown(S, "carrier", ev);
    }
  };

  /* ---- the helicopter ---- */
  E.newHeli = S => {
    const cv = S.carrier, p = E.onCarrier(cv, E.DECK_SPOT.u, E.DECK_SPOT.w);
    return { x: p.x, y: p.y, vx: cv.vx, vy: cv.vy, a: cv.a, rel: 0, alt: 0, state: "deck", away: false, dmg: 0, bombs: H.bombs, gunCd: 0, bombCd: 0, reload: 0, downT: 0, spin: 0, inv: 60 };
  };
  E.heliSpeed = h => Math.hypot(h.vx, h.vy);
  /* where a bomb dropped now would land */
  E.bombLanding = h => {
    let x = h.x, y = h.y, vx = h.vx * 0.92, vy = h.vy * 0.92;
    for (let i = 0; i < H.bombFall; i++) { x += vx; y += vy; vx *= 0.975; vy *= 0.975; }
    return { x: PB.wrap(x), y: PB.wrap(y) };
  };

  E.tickHeli = (S, cmd, ev) => {
    const h = S.heli, cv = S.carrier;
    if (h.inv > 0) h.inv--;
    if (h.gunCd > 0) h.gunCd--;
    if (h.bombCd > 0) h.bombCd--;

    if (h.state === "down") {
      /* spinning down into the sea, or onto whatever is below */
      h.downT++; h.spin += 0.18; h.a = PB.normAng(h.a + 0.18);
      h.alt = Math.max(0, 1 - h.downT / 70);
      h.vx *= 0.97; h.vy *= 0.97;
      h.x = PB.wrap(h.x + h.vx); h.y = PB.wrap(h.y + h.vy);
      if (h.downT === 70) ev.push({ t: "heliCrash", x: h.x, y: h.y, water: PB.isWater(PB.MAP.tileAt(h.x, h.y)) });
      if (h.downT >= 150) E.nextHeli(S, ev);
      return;
    }
    if (h.state === "gone") return;

    if (h.state === "deck") {
      const p = E.onCarrier(cv, E.DECK_SPOT.u, E.DECK_SPOT.w);
      h.x = p.x; h.y = p.y; h.vx = cv.vx; h.vy = cv.vy; h.alt = 0;
      /* the deck crew turns the helicopter as you ask, and patches it up */
      if (cmd.steer != null) h.rel = PB.turnToward(h.rel, PB.angDiff(cv.a, cmd.steer), H.turn * 0.5);
      else if (cmd.turn) h.rel += cmd.turn * H.turn * 0.5;
      h.a = PB.normAng(cv.a + h.rel);
      if (h.dmg > 0) { h.dmg = Math.max(0, h.dmg - H.repairPerStep); if (h.dmg === 0) ev.push({ t: "repaired" }); }
      if (h.bombs < H.bombs) { if (++h.reload >= H.reloadEvery) { h.reload = 0; h.bombs++; ev.push({ t: "reload", n: h.bombs }); } }
      if (cmd.thrust > 0 && !cv.sunk) { h.state = "takeoff"; h.away = false; ev.push({ t: "takeoff" }); }
      return;
    }
    if (h.state === "takeoff") {
      h.alt = Math.min(1, h.alt + H.climb);
      const p = E.onCarrier(cv, E.DECK_SPOT.u, E.DECK_SPOT.w);
      /* still over the spot until it is clear of the deck */
      h.x = PB.wrap(p.x + PB.wd(p.x, h.x) * 0.9); h.y = PB.wrap(p.y + PB.wd(p.y, h.y) * 0.9);
      h.vx = cv.vx; h.vy = cv.vy;
      steer(h, cmd, 0.6);
      if (h.alt >= 1) h.state = "fly";
      return;
    }
    if (h.state === "landing") {
      h.alt = Math.max(0, h.alt - H.climb);
      const p = E.onCarrier(cv, E.DECK_SPOT.u, E.DECK_SPOT.w);
      h.x = PB.wrap(h.x + PB.wd(h.x, p.x) * 0.08 + cv.vx); h.y = PB.wrap(h.y + PB.wd(h.y, p.y) * 0.08 + cv.vy);
      h.vx = cv.vx; h.vy = cv.vy;
      if (cmd.thrust > 0 && h.alt > 0.15) { h.state = "fly"; return; }
      if (h.alt <= 0) { h.state = "deck"; h.rel = PB.angDiff(cv.a, h.a); h.reload = 0; ev.push({ t: "landed", dmg: h.dmg, bombs: h.bombs }); }
      return;
    }

    /* ---- flying ---- */
    h.alt = Math.min(1, h.alt + H.climb);
    const hurt = h.dmg >= H.hurtAt;
    const max = hurt ? H.hurtMax : H.max;
    let thrust = cmd.thrust;
    if (cmd.steer != null) {
      /* direct: turn toward the stick, and fly once roughly that way */
      h.a = PB.turnToward(h.a, cmd.steer, H.turn);
      if (thrust > 0 && Math.abs(PB.angDiff(h.a, cmd.steer)) > 1.3) thrust = 0;
    } else if (cmd.turn) h.a = PB.normAng(h.a + cmd.turn * H.turn);
    if (thrust > 0) { h.vx += PB.hx(h.a) * H.accel; h.vy += PB.hy(h.a) * H.accel; }
    else if (thrust < 0) {
      /* back on the stick: brake, then back away slowly */
      const fwd = h.vx * PB.hx(h.a) + h.vy * PB.hy(h.a);
      const k = fwd > 0.05 ? H.accel * 1.3 : H.reverse;
      h.vx -= PB.hx(h.a) * k; h.vy -= PB.hy(h.a) * k;
    }
    h.vx *= H.drag; h.vy *= H.drag;
    const sp = Math.hypot(h.vx, h.vy), fwd = h.vx * PB.hx(h.a) + h.vy * PB.hy(h.a);
    const lim = fwd < -0.05 ? H.maxBack : max;
    if (sp > lim) { h.vx *= lim / sp; h.vy *= lim / sp; }
    if (sp < 0.004 && !thrust) { h.vx = 0; h.vy = 0; }
    h.x = PB.wrap(h.x + h.vx); h.y = PB.wrap(h.y + h.vy);

    /* settle on the deck: slow, over it, not pushing on -- once it has been away from it */
    const over = !cv.sunk && E.overDeck(cv, h.x, h.y);
    if (!over) h.away = true;
    if (over && h.away && thrust <= 0 && Math.hypot(h.vx - cv.vx, h.vy - cv.vy) < H.landSpeed) {
      h.state = "landing"; ev.push({ t: "landing" });
      return;
    }

    /* the gun: from the nose, along the heading, carried on by the way */
    if (cmd.fire && h.gunCd <= 0) {
      h.gunCd = H.gunEvery;
      const nx = PB.hx(h.a), ny = PB.hy(h.a), side = (S.t / H.gunEvery & 1) ? 2.5 : -2.5;
      const ox = h.x + nx * 11 + Math.cos(h.a) * side, oy = h.y + ny * 11 + Math.sin(h.a) * side;
      S.shots.push({ k: "bullet", by: "p", x: PB.wrap(ox), y: PB.wrap(oy), vx: nx * H.bulletSpeed + h.vx * 0.5, vy: ny * H.bulletSpeed + h.vy * 0.5, life: H.bulletLife, dmg: 1 });
      S.stats.shots++;
      ev.push({ t: "gun", x: ox, y: oy, a: h.a });
    }
    if (cmd.bomb && h.bombCd <= 0) {
      if (h.bombs > 0) {
        h.bombs--; h.bombCd = 10;
        S.bombs.push({ by: "p", x: h.x, y: h.y, vx: h.vx * 0.92, vy: h.vy * 0.92, t: 0 });
        S.stats.bombs++;
        ev.push({ t: "bombDrop", x: h.x, y: h.y, n: h.bombs });
      } else { h.bombCd = 12; ev.push({ t: "noBombs" }); }
    }
    if (hurt && S.t % 9 === 0) ev.push({ t: "smoke", x: h.x, y: h.y, dark: h.dmg > 80 });
  };
  function steer(h, cmd, k) {
    if (cmd.steer != null) h.a = PB.turnToward(h.a, cmd.steer, H.turn * k);
    else if (cmd.turn) h.a = PB.normAng(h.a + cmd.turn * H.turn * k);
  }

  E.hurtHeli = (S, n, cause, ev, x, y) => {
    const h = S.heli;
    if (h.state === "down" || h.state === "gone" || h.inv > 0) return;
    h.dmg = Math.min(100, h.dmg + n * S.D.dmg);
    ev.push({ t: "hit", x: x == null ? h.x : x, y: y == null ? h.y : y, n, cause, dmg: h.dmg });
    if (h.dmg >= 100) E.heliDown(S, cause, ev);
  };
  E.heliDown = (S, cause, ev) => {
    const h = S.heli;
    if (h.state === "down" || h.state === "gone") return;
    if (h.state === "deck" || h.state === "landing" || h.state === "takeoff") { h.alt = Math.max(h.alt, 0.3); h.vx = S.carrier.vx; h.vy = S.carrier.vy; }
    h.state = "down"; h.downT = 0; h.dmg = 100; h.cause = cause;
    S.stats.lost++;
    ev.push({ t: "heliDown", x: h.x, y: h.y, cause });
  };
  /* the next helicopter up from the hangar deck, if there is one, and a deck to put it on */
  E.nextHeli = (S, ev) => {
    if (S.helis > 0 && !S.carrier.sunk) {
      S.helis--;
      S.heli = E.newHeli(S);
      ev.push({ t: "newHeli", left: S.helis });
    } else {
      S.heli.state = "gone";
      E.gameOver(S, S.carrier.sunk ? "carrier" : "helis", ev);
    }
  };
})();
