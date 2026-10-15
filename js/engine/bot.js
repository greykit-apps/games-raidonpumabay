/* Raid on Puma Bay -- a pilot that flies itself, for tools/sim-check.js
 * (every round can be won, and a game replays step for step) and for the
 * title screen, where it flies the raid behind the menu.
 *
 * It flies as a careful player would: off the deck with nine bombs, to the
 * nearest factory still standing, slow over it, a bomb when the landing
 * point is on a building, and home to the carrier when the bombs are gone
 * or the damage is bad. Anything in the air close by, it turns and shoots. */
"use strict";
(() => {
  const E = PB.Engine;
  PB.Bot = {
    make: (opts = {}) => {
      const mem = { stuck: 0, last: null, tgt: null, skill: opts.skill || 1 };
      return { mem, cmd: S => cmd(S, mem) };
    },
  };
  const none = () => ({ turn: 0, thrust: 0, steer: null, fire: false, bomb: false });
  function cmd(S, mem) {
    const c = none(), h = S.heli, cv = S.carrier;
    if (h.state === "deck") {
      const urgent = S.bombers.length > 0 || (S.ship.launched && !S.ship.sunk);
      if ((h.dmg <= 0 && h.bombs >= 9) || (urgent && h.dmg < 30 && h.bombs >= 5)) c.thrust = 1;
      return c;
    }
    if (h.state !== "fly" && h.state !== "takeoff") return c;
    if (h.state === "takeoff") { c.steer = h.a; return c; }

    const sp = Math.hypot(h.vx, h.vy);
    const go = (x, y, want) => {
      c.steer = PB.angTo(h.x, h.y, x, y);
      const d = PB.dist(h.x, h.y, x, y), v = PB.clamp(d / want, 0.35, 2.1);
      const off = Math.abs(PB.angDiff(h.a, c.steer));
      c.thrust = off > 1.3 ? 0 : sp < v ? 1 : sp > v + 0.3 ? -1 : 0;
      return d;
    };

    /* a missile coming: turn across its path, flat out */
    for (const s of S.shots) {
      if (s.k !== "missile" || !s.lock) continue;
      const d = PB.dist(h.x, h.y, s.x, s.y);
      if (d < 130 && Math.abs(PB.angDiff(s.a, PB.angTo(s.x, s.y, h.x, h.y))) < 0.6) {
        c.steer = PB.normAng(s.a + Math.PI / 2 * (PB.angDiff(s.a, h.a) > 0 ? 1 : -1)); c.thrust = 1;
        return c;
      }
    }
    /* something in the air close by: turn on it and shoot */
    let air = null, ad = 170;
    for (const f of S.fighters) { const d = PB.dist(h.x, h.y, f.x, f.y); if (f.st !== "taxi" && d < ad) { ad = d; air = f; } }
    /* a bomber on its run at the carrier: go and meet it, wherever it is */
    for (const b of S.bombers) { const d = PB.dist(h.x, h.y, b.x, b.y); if (b.t >= 0 && b.st !== "taxi" && (d < ad || b.st === "run")) { ad = d; air = b; } }
    const hurt = h.dmg > 55;
    if (air && !hurt && (h.bombs > 0 || air.st === "run" || ad < 90)) {
      const lead = ad / 5.2;
      c.steer = PB.angTo(h.x, h.y, air.x + PB.hx(air.a) * air.v * lead, air.y + PB.hy(air.a) * air.v * lead);
      c.thrust = sp < (ad > 200 ? 2.1 : 1.1) ? 1 : 0;
      c.fire = Math.abs(PB.angDiff(h.a, c.steer)) < 0.16 && ad < 160;
      return c;
    }

    /* home: out of bombs, or hurt */
    if (h.bombs === 0 || hurt || cv.sunk === false && targetFor(S, mem) === null) {
      /* on the way home, shoot whatever crosses the nose */
      if (air && Math.abs(PB.angDiff(h.a, PB.angTo(h.x, h.y, air.x, air.y))) < 0.15 && ad < 150) c.fire = true;
      if (cv.sunk) return c;
      const spot = E.onCarrier(cv, E.DECK_SPOT.u, E.DECK_SPOT.w + 8);
      const d = PB.dist(h.x, h.y, spot.x, spot.y);
      if (d > 90) { go(spot.x, spot.y, 50); return c; }
      /* close: match the carrier's way, and close the gap gently */
      const k = Math.min(0.9, d / 60) / Math.max(1, d);
      const dvx = cv.vx + PB.wd(h.x, spot.x) * k - h.vx, dvy = cv.vy + PB.wd(h.y, spot.y) * k - h.vy;
      c.steer = Math.atan2(dvx, -dvy);
      c.thrust = Math.hypot(dvx, dvy) > 0.12 && Math.abs(PB.angDiff(h.a, c.steer)) < 0.9 ? 1 : 0;
      return c;
    }

    /* the target: a building, the yard, or the battleship */
    const t = targetFor(S, mem);
    if (!t) return c;
    const land = E.bombLanding(h), miss = PB.dist(land.x, land.y, t.x, t.y);
    const d = PB.dist(h.x, h.y, t.x, t.y);
    if (d > 40) go(t.x, t.y, 60);
    else { c.steer = PB.angTo(h.x, h.y, t.x, t.y); c.thrust = sp < 0.5 ? 1 : sp > 0.9 ? -1 : 0; }
    if (miss < 8 * mem.skill) { c.bomb = true; mem.stuck = 0; }
    else if (d < 30) { if (++mem.stuck > 240) { c.bomb = true; mem.stuck = 0; } }
    /* shoot whatever is dead ahead on the way */
    for (const g of S.aa) if (g.hp > 0 && PB.dist(h.x, h.y, g.x, g.y) < 120 && Math.abs(PB.angDiff(h.a, PB.angTo(h.x, h.y, g.x, g.y))) < 0.12) c.fire = true;
    return c;
  }
  /* the battleship if it is near the carrier; else a building of the
   * factory it is working on, finished before it starts another */
  function targetFor(S, mem = {}) {
    const m = PB.MAP, h = S.heli, sh = S.ship;
    if (sh.launched && !sh.sunk && PB.dist(sh.x, sh.y, S.carrier.x, S.carrier.y) < 700) return { x: sh.x, y: sh.y };
    let f = mem.fid != null ? S.factories[mem.fid] : null;
    if (!f || f.dead) {
      /* the aircraft plant and the electronics works first, as a wise pilot would */
      const first = { air: 500, radio: 350 };
      let bd = 1e9; f = null;
      for (const q of S.factories) {
        if (q.dead) continue;
        const mf = m.factories[q.id], d = PB.dist(h.x, h.y, mf.x, mf.y) - (first[q.kind] || 0);
        if (d < bd) { bd = d; f = q; }
      }
      if (!f) return null;
      mem.fid = f.id;
    }
    let best = null, bd = 1e9;
    m.factories[f.id].sections.forEach((sc, i) => {
      if (f.hp[i] <= 0) return;
      const x = sc.x + sc.w / 2, y = sc.y + sc.h / 2, d = PB.dist(h.x, h.y, x, y);
      if (d < bd) { bd = d; best = { x, y }; }
    });
    return best;
  }
})();
