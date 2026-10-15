/* Raid on Puma Bay -- the Wolf Empire: what it has, and how it uses it.
 *
 * Six factories feed six lines of its war (js/engine/const.js, C.KINDS):
 * while a factory stands its line gets better, a level every half minute
 * or so. Flak guns ring every island; radar watches the sea and, once it has
 * the helicopter, the airfield scrambles fighters; bombers go for the
 * carrier now and then; tanks drive the island roads; cargo ships carry
 * parts from the factories' docks to the shipyard, where the battleship is
 * building. Finished, it sails out to find the carrier. */
"use strict";
(() => {
  const C = PB.C, E = PB.Engine = PB.Engine || {};
  const lv = (S, k) => S.lv[k] || 0;
  const by = (a, b, t) => a + (b - a) * PB.clamp(t, 0, 1);
  /* is the helicopter something to shoot at? */
  const airborne = h => h.state === "fly" || h.state === "takeoff" || h.state === "landing";
  const target = h => h.state !== "down" && h.state !== "gone";
  E.airborne = airborne;

  E.score = (S, n, x, y, ev) => { S.score += n; S.roundScore += n; ev.push({ t: "score", n, x, y }); };

  /* ---- the enemy at the start of a round ---- */
  E.newEnemy = S => {
    const m = PB.MAP, start = S.D.start + (S.round - 1) * 2;
    S.lv = {};
    for (const k of C.KIND_ORDER) S.lv[k] = Math.min(C.FACTORY.maxLevel, start);
    S.factories = m.factories.map(f => ({ id: f.id, kind: f.kind, hp: f.sections.map(() => C.FACTORY.sectionHp), dead: false, prodT: 0, repT: 0 }));
    S.aa = m.aa.map(a => ({ id: a.id, x: a.x, y: a.y, hp: C.AA.hp, ta: PB.rand(S) * 6.28, cd: 60 + PB.ri(() => PB.rand(S), 120) }));
    S.radars = m.radars.map(r => ({ id: r.id, x: r.x, y: r.y, hp: C.RADAR.hp, a: PB.rand(S) * 6.28 }));
    S.hangars = m.hangars.map(h => ({ id: h.id, hp: C.HANGAR.hp, reT: 0 }));
    S.tanks = []; S.fighters = []; S.bombers = []; S.cargo = []; S.gunboats = [];
    S.alert = { seen: 0, scrT: 0, rest: 600, idle: 0, wave: 0, waveT: 0 };
    S.bomberT = 0; S.cargoT = 400; S.boatT = 300; S.tankT = 0;
    if (!S.ship || !S.ship.launched || S.ship.sunk) S.ship = newShip();
  };
  const newShip = () => ({ progress: 0, launched: false, sunk: false, said: 0, hp: 0, x: 0, y: 0, a: Math.PI, sp: 0, path: null, pi: 0, pathT: 0, cd: [40, 80], st: "yard" });
  E.newShip = newShip;

  /* ---- the factories: production, and rebuilding what was knocked down ---- */
  E.tickFactories = (S, ev) => {
    const F = C.FACTORY;
    for (const f of S.factories) {
      if (f.dead) continue;
      const up = f.hp.filter(h => h > 0).length / f.hp.length;
      f.prodT += up;
      if (f.prodT >= F.prodEvery) {
        f.prodT = 0;
        if (S.lv[f.kind] < F.maxLevel) { S.lv[f.kind]++; ev.push({ t: "levelUp", kind: f.kind, lv: S.lv[f.kind], f: f.id }); }
      }
      if (f.hp.some(h => h < F.sectionHp)) {
        f.repT++;
        const every = F.repairEvery * (1 - 0.04 * lv(S, "steel"));
        if (f.repT >= every) {
          f.repT = 0;
          const i = f.hp.indexOf(Math.min(...f.hp));
          f.hp[i]++;
          ev.push({ t: "rebuilt", f: f.id, i });
        }
      } else f.repT = 0;
    }
  };
  E.factoryAlive = S => S.factories.filter(f => !f.dead).length;

  /* ---- flak ---- */
  E.tickAA = (S, ev) => {
    const h = S.heli, A = C.AA;
    for (const g of S.aa) {
      if (g.hp <= 0) continue;
      const d = PB.dist(g.x, g.y, h.x, h.y);
      if (target(h) && d < A.range * 1.3) g.ta = PB.turnToward(g.ta, PB.angTo(g.x, g.y, h.x, h.y), 0.07);
      else g.ta = PB.normAng(g.ta + 0.004);
      if (g.cd > 0) { g.cd--; continue; }
      if (!airborne(h) || d > A.range) continue;
      /* lead the helicopter by the shell's flight, and miss a little */
      const tf = d / A.flakSpeed;
      const sp = (A.spread + d * A.spreadPerPx) * 2;
      const tx = h.x + h.vx * tf * 0.85 + (PB.rand(S) - 0.5) * sp, ty = h.y + h.vy * tf * 0.85 + (PB.rand(S) - 0.5) * sp;
      const a = PB.angTo(g.x, g.y, tx, ty), n = PB.dist(g.x, g.y, tx, ty) / A.flakSpeed;
      S.shots.push({ k: "flak", by: "e", x: g.x, y: g.y, vx: PB.hx(a) * A.flakSpeed, vy: PB.hy(a) * A.flakSpeed, life: Math.max(8, Math.round(n)), burst: A.burst + lv(S, "arms") * 0.8, dmg: A.dmg });
      g.cd = Math.round(by(A.every, A.everyMin, lv(S, "arms") / 9) * (0.8 + PB.rand(S) * 0.4));
      ev.push({ t: "flakFire", x: g.x, y: g.y });
    }
  };

  /* ---- radar, and the scramble it calls ---- */
  E.tickRadar = (S, ev) => {
    const h = S.heli, R = C.RADAR, al = S.alert;
    let seen = false;
    for (const r of S.radars) {
      if (r.hp <= 0) continue;
      r.a = PB.normAng(r.a + 0.045);
      if (airborne(h) && PB.dist(r.x, r.y, h.x, h.y) < R.range + lv(S, "radio") * R.rangePerLevel) seen = true;
    }
    const hangars = S.hangars.some(g => g.hp > 0);
    for (const g of S.hangars) if (g.hp <= 0 && ++g.reT >= C.HANGAR.rebuild) { g.hp = C.HANGAR.hp; g.reT = 0; ev.push({ t: "hangarBack", i: g.id }); }
    if (seen && !al.seen) ev.push({ t: "radarSees" });
    al.seen = seen ? 1 : 0;
    if (al.rest > 0) al.rest--;
    /* a wave in the air: the next of it off the runway */
    if (al.wave > 0) {
      if (--al.waveT <= 0) { al.wave--; al.waveT = 45; launchFighter(S, ev); }
      return;
    }
    if (!hangars || S.phase !== "play") return;
    const cap = Math.min(6, 2 + Math.floor(lv(S, "air") / 2));
    const up = S.fighters.length;
    if (seen && al.rest <= 0) {
      al.scrT++;
      if (al.scrT >= C.SCRAMBLE.delay / S.D.fighters && up < cap) {
        al.scrT = 0; al.rest = Math.round(C.SCRAMBLE.rest / S.D.fighters);
        al.wave = Math.min(cap - up, Math.max(1, Math.round((1 + Math.floor(lv(S, "air") / 3)) * S.D.fighters)));
        al.waveT = 1;
        ev.push({ t: "scramble", n: al.wave });
      }
    } else al.scrT = Math.max(0, al.scrT - 1);
    /* a patrol now and then whether radar sees anything or not */
    if (airborne(S.heli) && ++al.idle >= C.SCRAMBLE.idle / S.D.fighters && up < cap) { al.idle = 0; al.wave = 1; al.waveT = 1; ev.push({ t: "patrol" }); }
  };
  function launchFighter(S, ev) {
    const rw = PB.MAP.runway;
    S.fighters.push({ x: rw.start.x, y: rw.start.y, a: rw.ang, v: 0.6, hp: C.FIGHTER.hp, st: "taxi", t: 0, fuel: C.FIGHTER.fuel, cd: 60, burst: 0, bcd: 0, mcd: 200, alt: 0 });
    ev.push({ t: "fighterUp", x: rw.start.x, y: rw.start.y });
  }

  /* ---- fighters ---- */
  E.tickFighters = (S, ev) => {
    const h = S.heli, F = C.FIGHTER, rw = PB.MAP.runway;
    const speed = (F.speed + lv(S, "air") * F.speedPerLevel) * (0.9 + 0.1 * S.D.fighters);
    for (const f of S.fighters) {
      f.t++;
      if (f.st === "taxi") {
        /* the roll down the runway */
        f.v = Math.min(speed, f.v + 0.045); f.alt = Math.min(F.alt, f.alt + 0.03);
        if (f.t > 70) f.st = "fight";
      } else if (f.st === "fight") {
        f.fuel--;
        if (!target(h) || f.fuel <= 0) { f.st = "leave"; f.t = 0; }
        else {
          const d = PB.dist(f.x, f.y, h.x, h.y), lead = Math.min(40, d / (speed + 2));
          const want = PB.angTo(f.x, f.y, h.x + h.vx * lead, h.y + h.vy * lead), off = Math.abs(PB.angDiff(f.a, want));
          /* too close: break off and hold the line a moment before coming round */
          if (d < 40 && !f.brk) { f.brk = 55; f.bd = PB.angDiff(f.a, want) > 0 ? -1 : 1; }
          if (f.brk > 0) { f.brk--; if (f.brk > 35) f.a = PB.normAng(f.a + f.bd * F.turn * 1.4); }
          else f.a = PB.turnToward(f.a, want, F.turn * (d > 240 ? 1.3 : 1));
          if (f.bcd > 0) f.bcd--;
          if (f.burst > 0 && f.bcd <= 0) {
            f.burst--; f.bcd = 6;
            const ba = f.a + (PB.rand(S) - 0.5) * 0.2;
            S.shots.push({ k: "bullet", by: "e", x: PB.wrap(f.x + PB.hx(f.a) * 10), y: PB.wrap(f.y + PB.hy(f.a) * 10), vx: PB.hx(ba) * 4.6, vy: PB.hy(ba) * 4.6, life: 34, dmg: F.dmg });
            ev.push({ t: "eGun", x: f.x, y: f.y });
          }
          if (f.cd > 0) f.cd--;
          else if (airborne(h) && d < F.range && off < 0.2) { f.burst = 3; f.cd = F.burstEvery; }
          if (f.mcd > 0) f.mcd--;
          else if (airborne(h) && lv(S, "radio") >= 4 && d < 220 && d > 70 && off < 0.5) {
            f.mcd = 560 - lv(S, "radio") * 25;
            S.shots.push({ k: "missile", by: "e", x: f.x, y: f.y, vx: PB.hx(f.a) * F.missileSpeed, vy: PB.hy(f.a) * F.missileSpeed, a: f.a, life: 115, dmg: F.missileDmg, lock: true });
            ev.push({ t: "missile", x: f.x, y: f.y });
          }
          if (airborne(h) && d < 7) {
            E.hurtHeli(S, 15, "collision", ev);
            E.hitAircraft(S, f, f.hp, ev, "p");
          }
        }
      } else {
        /* out of fuel, or nothing to chase: home, and gone */
        f.a = PB.turnToward(f.a, PB.angTo(f.x, f.y, rw.start.x, rw.start.y), F.turn * 0.6);
        if (f.t > 360 || (f.t > 60 && PB.dist(f.x, f.y, h.x, h.y) > 420)) f.hp = -1;
      }
      f.x = PB.wrap(f.x + PB.hx(f.a) * f.v); f.y = PB.wrap(f.y + PB.hy(f.a) * f.v);
    }
    S.fighters = S.fighters.filter(f => f.hp > 0);
  };

  /* ---- bombers, for the carrier ---- */
  E.tickBombers = (S, ev) => {
    const B = C.BOMBER, cv = S.carrier, h = S.heli, rw = PB.MAP.runway;
    if (S.phase === "play" && S.hangars.some(g => g.hp > 0) && !cv.sunk) {
      const every = by(B.every, B.everyMin, lv(S, "air") / 9) / S.D.fighters;
      if (++S.bomberT >= every && S.t > 2400 / S.D.fighters) {
        S.bomberT = 0;
        const n = lv(S, "air") >= 6 ? 2 : 1;
        for (let i = 0; i < n; i++) S.bombers.push({ x: rw.start.x - i * 30, y: rw.start.y + i * 14, a: rw.ang, v: 0.5, hp: B.hp, st: "taxi", t: -i * 40, bombs: B.bombs, bcd: 0, gcd: 30, alt: 0, warned: false });
        ev.push({ t: "bomberUp", n });
      }
    }
    for (const b of S.bombers) {
      b.t++;
      if (b.t < 0) continue;
      if (b.st === "taxi") { b.v = Math.min(B.speed, b.v + 0.02); b.alt = Math.min(2.4, b.alt + 0.025); if (b.t > 90) b.st = "run"; }
      else if (b.st === "run") {
        if (cv.sunk) b.st = "home";
        const d = PB.dist(b.x, b.y, cv.x, cv.y);
        b.a = PB.turnToward(b.a, PB.angTo(b.x, b.y, cv.x, cv.y), 0.012);
        if (!b.warned && d < 420) { b.warned = true; ev.push({ t: "carrierWarn", x: b.x, y: b.y }); }
        if (d < 60 && b.bombs > 0) {
          if (--b.bcd <= 0) { b.bcd = 13; b.bombs--; S.bombs.push({ by: "e", x: b.x, y: b.y, vx: PB.hx(b.a) * b.v * 0.8, vy: PB.hy(b.a) * b.v * 0.8, t: 0 }); ev.push({ t: "eBomb", x: b.x, y: b.y }); }
        }
        if (b.bombs <= 0) { b.st = "home"; b.t = 0; }
      } else {
        b.a = PB.turnToward(b.a, PB.angTo(b.x, b.y, rw.start.x, rw.start.y), 0.014);
        if (b.t > 200 && (PB.dist(b.x, b.y, rw.start.x, rw.start.y) < 60 || b.t > 2400)) b.hp = -1;
      }
      /* the tail gunner */
      if (b.gcd > 0) b.gcd--;
      else if (airborne(h) && PB.dist(b.x, b.y, h.x, h.y) < B.gunRange) {
        b.gcd = 36;
        const a = PB.angTo(b.x, b.y, h.x + h.vx * 12, h.y + h.vy * 12);
        S.shots.push({ k: "bullet", by: "e", x: b.x, y: b.y, vx: PB.hx(a) * 4, vy: PB.hy(a) * 4, life: 30, dmg: B.gunDmg });
        ev.push({ t: "eGun", x: b.x, y: b.y });
      }
      b.x = PB.wrap(b.x + PB.hx(b.a) * b.v); b.y = PB.wrap(b.y + PB.hy(b.a) * b.v);
    }
    S.bombers = S.bombers.filter(b => b.hp > 0);
  };

  /* ---- tanks, on the island roads ---- */
  E.tickTanks = (S, ev) => {
    const m = PB.MAP, h = S.heli, K = C.TANK, T = PB.TILE;
    if (++S.tankT >= 700 && S.phase === "play") {
      S.tankT = 0;
      const want = 1 + Math.floor(lv(S, "tanks") / 3);
      for (const f of S.factories) {
        if (f.dead) continue;
        const mf = m.factories[f.id], road = m.roads.find(r => r.island === mf.island);
        if (!road || !road.tiles.length) continue;
        const n = S.tanks.filter(t => t.island === mf.island).length, cap = Math.min(3, want + (f.kind === "tanks" ? 1 : 0));
        if (n >= cap) continue;
        const [tx, ty] = road.tiles[PB.ri(() => PB.rand(S), road.tiles.length)];
        S.tanks.push({ x: (tx + 0.5) * T, y: (ty + 0.5) * T, tx, ty, px: tx, py: ty, a: 0, ta: 0, hp: K.hp, cd: 120, island: mf.island });
        ev.push({ t: "tankOut", x: (tx + 0.5) * T, y: (ty + 0.5) * T });
      }
    }
    const N = PB.TILES, tc = v => ((v % N) + N) % N;
    for (const k of S.tanks) {
      const gx = (k.tx + 0.5) * T, gy = (k.ty + 0.5) * T, d = PB.dist(k.x, k.y, gx, gy);
      if (d < 0.6) {
        /* at a tile's middle: on to a neighbouring road, not back unless it must */
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [tc(k.tx + dx), tc(k.ty + dy)]).filter(([x, y]) => m.isRoad(x, y));
        const fwd = nb.filter(([x, y]) => x !== k.px || y !== k.py);
        const pick = fwd.length ? fwd[PB.ri(() => PB.rand(S), fwd.length)] : nb[0];
        k.px = k.tx; k.py = k.ty;
        if (pick) { k.tx = pick[0]; k.ty = pick[1]; }
      } else {
        const a = PB.angTo(k.x, k.y, gx, gy);
        k.a = PB.turnToward(k.a, a, 0.12);
        if (Math.abs(PB.angDiff(k.a, a)) < 0.4) { const s = Math.min(K.speed, d); k.x = PB.wrap(k.x + PB.hx(a) * s); k.y = PB.wrap(k.y + PB.hy(a) * s); }
      }
      const hd = PB.dist(k.x, k.y, h.x, h.y);
      if (target(h) && hd < K.range * 1.3) k.ta = PB.turnToward(k.ta, PB.angTo(k.x, k.y, h.x, h.y), 0.05);
      if (k.cd > 0) k.cd--;
      else if (airborne(h) && hd < K.range && Math.abs(PB.angDiff(k.ta, PB.angTo(k.x, k.y, h.x, h.y))) < 0.25) {
        const tf = hd / K.shellSpeed, e = 10 + hd * 0.12, a = PB.angTo(k.x, k.y, h.x + h.vx * tf * 0.7 + (PB.rand(S) - 0.5) * e * 2, h.y + h.vy * tf * 0.7 + (PB.rand(S) - 0.5) * e * 2);
        S.shots.push({ k: "shell", by: "e", x: PB.wrap(k.x + PB.hx(a) * 8), y: PB.wrap(k.y + PB.hy(a) * 8), vx: PB.hx(a) * K.shellSpeed, vy: PB.hy(a) * K.shellSpeed, life: Math.round(K.range / K.shellSpeed) + 10, dmg: K.dmg });
        k.cd = Math.round(by(K.every, K.everyMin, lv(S, "tanks") / 9) * (0.85 + PB.rand(S) * 0.3));
        ev.push({ t: "tankFire", x: k.x, y: k.y });
      }
    }
    S.tanks = S.tanks.filter(k => k.hp > 0);
  };

  /* ---- the sea: cargo for the yard, gunboats on patrol ---- */
  const follow = (o, pts, speed, turn) => {
    const [tx, ty] = pts[o.pi];
    const a = PB.angTo(o.x, o.y, tx, ty);
    o.a = PB.turnToward(o.a, a, turn);
    const s = speed * (0.35 + 0.65 * Math.max(0, Math.cos(PB.angDiff(o.a, a))));
    o.x = PB.wrap(o.x + PB.hx(o.a) * s); o.y = PB.wrap(o.y + PB.hy(o.a) * s);
    return PB.dist(o.x, o.y, tx, ty) < 14;
  };
  E.tickBoats = (S, ev) => {
    const m = PB.MAP, h = S.heli, G = C.GUNBOAT;
    if (S.phase === "play" && !S.ship.launched && ++S.cargoT >= C.CARGO.every && S.cargo.length < 4) {
      S.cargoT = 0;
      const live = S.factories.filter(f => !f.dead && m.routes[f.id]);
      if (live.length) {
        const f = live[PB.ri(() => PB.rand(S), live.length)], r = m.routes[f.id];
        S.cargo.push({ f: f.id, x: r[0][0], y: r[0][1], a: PB.angTo(r[0][0], r[0][1], r[1][0], r[1][1]), pi: 1, hp: C.CARGO.hp });
        ev.push({ t: "cargoOut", kind: f.kind });
      }
    }
    for (const c of S.cargo) {
      const r = m.routes[c.f];
      if (follow(c, r, C.CARGO.speed, 0.03)) {
        c.pi++;
        if (c.pi >= r.length) {
          c.hp = -1;
          if (!S.ship.launched) { S.ship.progress = Math.min(1, S.ship.progress + C.CARGO.deliver * S.D.build); ev.push({ t: "delivered", x: c.x, y: c.y }); }
        }
      }
    }
    S.cargo = S.cargo.filter(c => c.hp > 0);

    const cap = S.D.id === "hard" ? 3 : 2;
    if (S.phase === "play" && ++S.boatT >= 2600 && S.gunboats.length < cap) {
      S.boatT = 0;
      const ids = Object.keys(m.routes).filter(k => m.routes[k]);
      const id = +ids[PB.ri(() => PB.rand(S), ids.length)], r = m.routes[id];
      const end = r[r.length - 1];
      S.gunboats.push({ r: id, dir: -1, pi: r.length - 2, x: end[0], y: end[1], a: 0, hp: G.hp, cd: 120 });
      ev.push({ t: "boatOut" });
    }
    for (const g of S.gunboats) {
      const r = m.routes[g.r];
      if (follow(g, r, G.speed, 0.05)) {
        g.pi += g.dir;
        if (g.pi < 0 || g.pi >= r.length) { g.dir = -g.dir; g.pi += g.dir * 2; }
      }
      const d = PB.dist(g.x, g.y, h.x, h.y);
      if (g.cd > 0) g.cd--;
      else if (airborne(h) && d < G.range) {
        g.cd = Math.round(G.every * (0.8 + PB.rand(S) * 0.4));
        const tf = d / 3, e = 10 + d * 0.12, a = PB.angTo(g.x, g.y, h.x + h.vx * tf * 0.7 + (PB.rand(S) - 0.5) * e * 2, h.y + h.vy * tf * 0.7 + (PB.rand(S) - 0.5) * e * 2);
        S.shots.push({ k: "shell", by: "e", x: g.x, y: g.y, vx: PB.hx(a) * 3, vy: PB.hy(a) * 3, life: Math.round(G.range / 3) + 8, dmg: G.dmg });
        ev.push({ t: "tankFire", x: g.x, y: g.y });
      }
    }
    S.gunboats = S.gunboats.filter(g => g.hp > 0);
  };

  /* ---- the battleship ---- */
  const SAY = [[0.25, "shipQuarter"], [0.5, "shipHalf"], [0.75, "shipThree"], [0.9, "shipNear"]];
  E.tickShip = (S, ev) => {
    const B = C.BATTLESHIP, sh = S.ship, m = PB.MAP, cv = S.carrier, h = S.heli;
    if (sh.sunk) return;
    if (!sh.launched) {
      if (S.phase !== "play") return;
      const alive = E.factoryAlive(S);
      sh.progress += (1 / B.build) * S.D.build * (0.35 + 0.65 * alive / 6) * (1 + 0.06 * lv(S, "engines"));
      for (let i = sh.said; i < SAY.length; i++) if (sh.progress >= SAY[i][0]) { sh.said = i + 1; ev.push({ t: SAY[i][1], p: sh.progress }); }
      if (sh.progress >= 1) {
        Object.assign(sh, { launched: true, hp: B.hp + Math.floor(lv(S, "steel") * B.hpPerSteel), x: m.yard.ship.x, y: m.yard.ship.y, a: Math.PI, sp: 0, st: "out", path: null, pi: 0, pathT: 0 });
        sh.max = sh.hp;
        ev.push({ t: "shipLaunched", x: sh.x, y: sh.y });
      }
      return;
    }
    /* down the channel and out of the dock's mouth, then after the carrier */
    if (sh.st === "out") {
      sh.sp = Math.min(B.speed, sh.sp + 0.004);
      sh.y = PB.wrap(sh.y + sh.sp);
      if (PB.dist(sh.x, sh.y, m.yard.mouth.x, m.yard.mouth.y) < 12 || PB.wd(m.yard.mouth.y, sh.y) > 0) sh.st = "hunt";
    } else {
      const T = PB.TILE;
      if (--sh.pathT <= 0 && !cv.sunk) {
        sh.pathT = 320;
        const p = m.path(Math.floor(sh.x / T), Math.floor(sh.y / T), Math.floor(cv.x / T), Math.floor(cv.y / T), 2);
        if (p && p.length > 1) { sh.path = p.map(([x, y]) => [(x + 0.5) * T, (y + 0.5) * T]); sh.pi = 1; }
      }
      const dc = PB.dist(sh.x, sh.y, cv.x, cv.y), want = dc < 120 ? 0.08 : B.speed;
      sh.sp += PB.clamp(want - sh.sp, -0.004, 0.004);
      if (sh.path && sh.pi < sh.path.length) {
        const [tx, ty] = sh.path[sh.pi], a = PB.angTo(sh.x, sh.y, tx, ty);
        sh.a = PB.turnToward(sh.a, a, 0.011);
        if (PB.dist(sh.x, sh.y, tx, ty) < 18) sh.pi++;
      } else if (!cv.sunk) sh.a = PB.turnToward(sh.a, PB.angTo(sh.x, sh.y, cv.x, cv.y) + Math.PI / 2, 0.006);
      sh.x = PB.wrap(sh.x + PB.hx(sh.a) * sh.sp); sh.y = PB.wrap(sh.y + PB.hy(sh.a) * sh.sp);
    }
    /* two turrets, fore and aft: the helicopter if it is in reach, the carrier if that is */
    for (let i = 0; i < 2; i++) {
      if (sh.cd[i] > 0) { sh.cd[i]--; continue; }
      const off = i ? -30 : 30, gx = PB.wrap(sh.x + PB.hx(sh.a) * off), gy = PB.wrap(sh.y + PB.hy(sh.a) * off);
      const dh = PB.dist(gx, gy, h.x, h.y), dc = PB.dist(gx, gy, cv.x, cv.y);
      let tx = null, ty = null, carrier = false;
      if (airborne(h) && dh < B.gunRange) { const tf = dh / B.shellSpeed; tx = h.x + h.vx * tf * 0.8 + (PB.rand(S) - 0.5) * 30; ty = h.y + h.vy * tf * 0.8 + (PB.rand(S) - 0.5) * 30; }
      else if (!cv.sunk && dc < 270) { const tf = dc / B.shellSpeed, e = 30 + dc * 0.15; tx = cv.x + cv.vx * tf + (PB.rand(S) - 0.5) * e * 2; ty = cv.y + cv.vy * tf + (PB.rand(S) - 0.5) * e * 2; carrier = true; }
      if (tx === null) continue;
      const a = PB.angTo(gx, gy, tx, ty), n = PB.dist(gx, gy, tx, ty) / B.shellSpeed;
      S.shots.push({ k: "heavy", by: "e", x: gx, y: gy, vx: PB.hx(a) * B.shellSpeed, vy: PB.hy(a) * B.shellSpeed, life: Math.max(10, Math.round(n)), burst: B.burst, dmg: B.dmg, carrier });
      sh.cd[i] = Math.round(B.gunEvery * (0.85 + PB.rand(S) * 0.3));
      ev.push({ t: "shipFire", x: gx, y: gy });
    }
  };
  /* the battleship's hull, for a bomb */
  E.onShip = (sh, x, y, pad = 0) => {
    const dx = PB.wd(sh.x, x), dy = PB.wd(sh.y, y);
    const w = dx * PB.hx(sh.a) + dy * PB.hy(sh.a), u = dx * Math.cos(sh.a) + dy * Math.sin(sh.a);
    return Math.abs(u) < 14 + pad && Math.abs(w) < 56 + pad - Math.max(0, Math.abs(u) - 8) * 3;
  };

  /* ---- anything in the air, hit ---- */
  E.hitAircraft = (S, a, n, ev, src) => {
    if (a.hp <= 0) return;
    a.hp -= n;
    const kind = S.fighters.includes(a) ? "fighter" : "bomber";
    if (a.hp <= 0) {
      ev.push({ t: "kill", k: kind, x: a.x, y: a.y, air: true, src });
      const st = kind === "fighter" ? "fighters" : "bombers";
      S.stats[st]++; S.roundStats[st]++;
      E.score(S, C.SCORE[kind], a.x, a.y, ev);
    } else ev.push({ t: "spark", x: a.x, y: a.y, air: true });
  };
})();
