/* Raid on Puma Bay -- the game: a state you can save, and one step of it.
 *
 * PB.Engine.newGame makes the state; PB.Engine.tick(S, cmd) moves it on by
 * one step and returns what happened (events), which the page turns into
 * sound, smoke and words. The state is plain data, so a game in progress is
 * saved as it stands and picked up again later.
 *
 * A round is won when all six factories are down: the next is the same bay
 * with every factory rebuilt and the enemy further along. The game is over
 * when the last helicopter is lost, or the carrier goes down with none in
 * the air. */
"use strict";
(() => {
  const C = PB.C, E = PB.Engine = PB.Engine || {};

  E.newGame = ({ diff = 1, seed = 1 } = {}) => {
    PB.buildMap();
    const D = C.DIFF[diff] || C.DIFF[1];
    const S = {
      v: 1, seed, rs: seed | 0, t: 0, diff, D, round: 1, score: 0, roundScore: 0, phase: "play", endT: 0, end: null,
      helis: D.helis - 1, shots: [], bombs: [], craters: [], stats: newStats(), roundStats: null, ship: null,
    };
    S.carrier = E.newCarrier();
    E.newEnemy(S);
    S.heli = E.newHeli(S);
    S.roundStats = newStats();
    return S;
  };
  const newStats = () => ({ fighters: 0, bombers: 0, tanks: 0, aa: 0, radar: 0, cargo: 0, gunboats: 0, hangars: 0, sections: 0, factories: 0, yard: 0, battleship: 0, bombs: 0, shots: 0, lost: 0 });

  /* ---- one step ---- */
  E.tick = (S, cmd) => {
    const ev = [];
    S.t++;
    if (S.phase === "over") { tickShots(S, ev); return ev; }
    E.tickCarrier(S, ev);
    E.tickHeli(S, cmd, ev);
    E.tickFactories(S, ev);
    E.tickAA(S, ev);
    E.tickRadar(S, ev);
    E.tickFighters(S, ev);
    E.tickBombers(S, ev);
    E.tickTanks(S, ev);
    E.tickBoats(S, ev);
    E.tickShip(S, ev);
    tickShots(S, ev);
    tickBombs(S, ev);
    for (const c of S.craters) c.t++;
    if (S.craters.length > 140) S.craters.splice(0, S.craters.length - 140);
    /* the round won: a moment for the last smoke, then the report */
    if (S.phase === "won" && ++S.endT >= 180) { S.phase = "report"; ev.push({ t: "roundReport" }); }
    if (S.phase === "lost" && ++S.endT >= 120) { S.phase = "over"; ev.push({ t: "gameOver", why: S.end.why }); }
    return ev;
  };

  /* ---- shots in the air ---- */
  function tickShots(S, ev) {
    const h = S.heli, live = [];
    for (const s of S.shots) {
      if (s.k === "missile") {
        /* homing, but not well: it turns slowly, loses its lock once the
           helicopter is off to one side, and runs out */
        if (s.lock && E.airborne(h)) {
          const want = PB.angTo(s.x, s.y, h.x, h.y);
          if (Math.abs(PB.angDiff(s.a, want)) > 1.25) s.lock = false;
          else s.a = PB.turnToward(s.a, want, C.FIGHTER.missileTurn);
        }
        s.vx = PB.hx(s.a) * C.FIGHTER.missileSpeed; s.vy = PB.hy(s.a) * C.FIGHTER.missileSpeed;
        if (S.t % 3 === 0) ev.push({ t: "trail", x: s.x, y: s.y });
      }
      s.x = PB.wrap(s.x + s.vx); s.y = PB.wrap(s.y + s.vy); s.life--;
      if (s.by === "p") { if (playerShot(S, s, ev)) continue; }
      else if (s.k === "flak" || s.k === "heavy") {
        if (s.life <= 0) {
          ev.push({ t: s.k === "heavy" ? "heavyBurst" : "flak", x: s.x, y: s.y, r: s.burst });
          if (E.airborne(h) && PB.dist(s.x, s.y, h.x, h.y) < s.burst) E.hurtHeli(S, s.dmg * (1 - 0.5 * PB.dist(s.x, s.y, h.x, h.y) / s.burst), s.k === "heavy" ? "battleship" : "flak", ev, s.x, s.y);
          if (s.carrier && E.onHull(S.carrier, s.x, s.y, 6)) E.hurtCarrier(S, C.BATTLESHIP.carrierDmg, ev);
          continue;
        }
      } else if ((E.airborne(h) || h.state === "deck") && PB.dist(s.x, s.y, h.x, h.y) < (s.k === "missile" ? 8 : 6)) {
        E.hurtHeli(S, s.dmg, s.k === "missile" ? "missile" : s.k === "shell" ? "shell" : "guns", ev, s.x, s.y);
        if (s.k === "missile") ev.push({ t: "boomSmall", x: s.x, y: s.y });
        continue;
      }
      if (s.life > 0) live.push(s);
      else if (s.k === "missile") ev.push({ t: "boomSmall", x: s.x, y: s.y });
    }
    S.shots = live;
  }
  /* the helicopter's bullet: true when it hit something and is spent */
  function playerShot(S, s, ev) {
    const near = (x, y, r) => PB.dist(s.x, s.y, x, y) < r;
    for (const f of S.fighters) if (f.hp > 0 && f.st !== "taxi" && near(f.x, f.y, 9)) { E.hitAircraft(S, f, 1, ev, "p"); return true; }
    for (const b of S.bombers) if (b.hp > 0 && b.t >= 0 && near(b.x, b.y, 13)) { E.hitAircraft(S, b, 1, ev, "p"); return true; }
    /* low enough to hit what is on the ground or the water, near the end of its run */
    if (s.life > 16) return false;
    const ground = (o, r, kind, hp) => {
      if (o.hp <= 0 || !near(o.x, o.y, r)) return false;
      o.hp -= 1;
      if (o.hp <= 0) kill(S, o, kind, ev); else ev.push({ t: "spark", x: s.x, y: s.y });
      void hp;
      return true;
    };
    for (const k of S.tanks) if (ground(k, 8, "tank")) return true;
    for (const g of S.aa) if (ground(g, 8, "aa")) return true;
    for (const r of S.radars) if (ground(r, 8, "radar")) return true;
    for (const c of S.cargo) if (ground(c, 11, "cargo")) return true;
    for (const g of S.gunboats) if (ground(g, 9, "gunboat")) return true;
    return false;
  }
  function kill(S, o, kind, ev) {
    o.hp = 0;
    const st = { tank: "tanks", aa: "aa", radar: "radar", cargo: "cargo", gunboat: "gunboats" }[kind];
    S.stats[st]++; S.roundStats[st]++;
    E.score(S, C.SCORE[kind], o.x, o.y, ev);
    ev.push({ t: "kill", k: kind, x: o.x, y: o.y, water: kind === "cargo" || kind === "gunboat" });
    if (kind === "aa" || kind === "radar" || kind === "tank") crater(S, o.x, o.y, 9);
  }
  function crater(S, x, y, r) { S.craters.push({ x, y, r, t: 0 }); }

  /* ---- bombs ---- */
  function tickBombs(S, ev) {
    const H = C.HELI, live = [];
    for (const b of S.bombs) {
      b.t++;
      b.x = PB.wrap(b.x + b.vx); b.y = PB.wrap(b.y + b.vy); b.vx *= 0.975; b.vy *= 0.975;
      if (b.t < H.bombFall) { live.push(b); continue; }
      if (b.by === "e") enemyBomb(S, b, ev); else playerBomb(S, b, ev);
    }
    S.bombs = live;
  }
  function enemyBomb(S, b, ev) {
    const cv = S.carrier, h = S.heli;
    const onShip = !cv.sunk && E.onHull(cv, b.x, b.y, 3);
    ev.push({ t: onShip ? "boom" : "splash", x: b.x, y: b.y, r: 12 });
    if (onShip) {
      E.hurtCarrier(S, C.BOMBER.dmg, ev);
      if ((h.state === "deck" || h.state === "landing" || h.state === "takeoff") && PB.dist(b.x, b.y, h.x, h.y) < 26) E.hurtHeli(S, 10, "bomber", ev);
    }
  }
  function playerBomb(S, b, ev) {
    const m = PB.MAP, R = C.HELI.bombRadius, x = b.x, y = b.y;
    const water = PB.isWater(m.tileAt(x, y));
    let hit = false;
    /* a factory section: the bomb has to come down on the building */
    for (const f of S.factories) {
      if (f.dead) continue;
      const mf = m.factories[f.id];
      if (PB.dist(x, y, mf.x, mf.y) > 70) continue;
      let best = -1, bd = 1e9;
      mf.sections.forEach((sc, i) => {
        if (f.hp[i] <= 0) return;
        const dx = Math.max(Math.abs(PB.wd(sc.x + sc.w / 2, x)) - sc.w / 2, 0), dy = Math.max(Math.abs(PB.wd(sc.y + sc.h / 2, y)) - sc.h / 2, 0), d = Math.hypot(dx, dy);
        if (d < 7 && d < bd) { bd = d; best = i; }
      });
      if (best >= 0) {
        hit = true;
        f.hp[best]--;
        ev.push({ t: "sectionHit", f: f.id, i: best, hp: f.hp[best], x, y });
        if (f.hp[best] <= 0) {
          S.stats.sections++; S.roundStats.sections++;
          E.score(S, C.SCORE.section, x, y, ev);
          ev.push({ t: "sectionDown", f: f.id, i: best });
        }
        if (f.hp.every(v => v <= 0)) {
          f.dead = true;
          S.stats.factories++; S.roundStats.factories++;
          E.score(S, C.SCORE.factory, mf.x, mf.y, ev);
          ev.push({ t: "factoryDown", f: f.id, kind: f.kind, x: mf.x, y: mf.y, left: E.factoryAlive(S) });
          if (E.factoryAlive(S) === 0) roundWon(S, ev);
        }
      }
    }
    const nearDo = (list, r, kind) => { for (const o of list) if (o.hp > 0 && PB.dist(x, y, o.x, o.y) < R + r) { hit = true; kill(S, o, kind, ev); } };
    nearDo(S.aa, 3, "aa"); nearDo(S.radars, 3, "radar"); nearDo(S.tanks, 2, "tank"); nearDo(S.cargo, 6, "cargo"); nearDo(S.gunboats, 4, "gunboat");
    m.hangars.forEach((hg, i) => {
      const g = S.hangars[i];
      if (g.hp > 0 && Math.abs(PB.wd(hg.x + hg.w / 2, x)) < hg.w / 2 + 6 && Math.abs(PB.wd(hg.y + hg.h / 2, y)) < hg.h / 2 + 6) {
        hit = true; g.hp--;
        if (g.hp <= 0) { g.reT = 0; S.stats.hangars++; S.roundStats.hangars++; E.score(S, C.SCORE.hangar, x, y, ev); ev.push({ t: "hangarDown", i, left: S.hangars.filter(q => q.hp > 0).length }); }
        else ev.push({ t: "spark", x, y });
      }
    });
    /* the battleship: in its dock, every bomb sets the work back; at sea, it sinks it a bomb at a time */
    const sh = S.ship, yd = m.yard;
    if (!sh.launched && yd && Math.abs(PB.wd(yd.dock.x + yd.dock.w / 2, x)) < yd.dock.w / 2 + 4 && Math.abs(PB.wd(yd.dock.y + yd.dock.h / 2, y)) < yd.dock.h / 2 + 4) {
      hit = true;
      if (sh.progress > 0.02) {
        sh.progress = Math.max(0, sh.progress - C.SHIPYARD.setback);
        S.stats.yard++; S.roundStats.yard++;
        E.score(S, C.SCORE.yard, x, y, ev);
        ev.push({ t: "yardHit", x, y, p: sh.progress });
      }
    }
    if (sh.launched && !sh.sunk && E.onShip(sh, x, y, 4)) {
      hit = true;
      sh.hp--;
      ev.push({ t: "shipHit", x, y, hp: sh.hp });
      if (sh.hp <= 0) {
        sh.sunk = true;
        S.stats.battleship++; S.roundStats.battleship++;
        E.score(S, C.SCORE.battleship, sh.x, sh.y, ev);
        ev.push({ t: "shipSunk", x: sh.x, y: sh.y });
        /* the yard starts on the next one */
        const prev = sh;
        S.ship = E.newShip();
        S.ship.wreck = { x: prev.x, y: prev.y, a: prev.a, t: S.t };
      }
    }
    ev.push({ t: water ? "splash" : "boom", x, y, r: R, hit, bomb: true });
    if (!water) crater(S, x, y, hit ? 12 : 10);
  }

  /* ---- the end of a round, and of the game ---- */
  function roundWon(S, ev) {
    if (S.phase !== "play") return;
    S.phase = "won"; S.endT = 0;
    ev.push({ t: "roundWon", round: S.round });
  }
  E.gameOver = (S, why, ev) => {
    if (S.phase === "lost" || S.phase === "over") return;
    S.phase = "lost"; S.endT = 0; S.end = { why };
    ev.push({ t: "lastHeli", why });
  };
  /* what the round earned, before the next begins */
  E.roundBonus = S => {
    const sc = C.SCORE, h = S.heli;
    const lines = [["Round won", sc.round], ["Carrier afloat, " + Math.round(S.carrier.hp) + "%", Math.round(S.carrier.hp) * sc.carrierHp], ["Helicopters in reserve: " + S.helis, S.helis * sc.heliLeft]];
    if (h.state !== "down" && h.state !== "gone") lines.push(["Not a scratch on the helicopter", h.dmg < 1 ? 500 : 0]);
    return lines.filter(l => l[1] > 0);
  };
  E.nextRound = S => {
    if (S.phase !== "report") return;
    const bonus = E.roundBonus(S).reduce((s, l) => s + l[1], 0);
    S.score += bonus;
    S.round++; S.roundScore = 0; S.phase = "play"; S.endT = 0; S.konami = false;
    S.roundStats = newStats();
    S.shots = []; S.bombs = [];
    /* the carrier is refitted, and a helicopter joins the air group */
    const cv = S.carrier;
    if (cv.sunk) { Object.assign(cv, E.newCarrier(), { hp: 60 }); }
    else cv.hp = Math.min(C.CARRIER.hp, cv.hp + 50);
    S.helis = Math.min(C.HELI.maxHelis - 1, S.helis + 1);
    E.newEnemy(S);
    S.heli = E.newHeli(S);
    S.craters = [];
    return bonus;
  };
  E.rank = S => C.rankFor(S.score);

  /* a summary for the page: what is standing, what is left */
  E.summary = S => ({
    round: S.round, score: S.score, diff: S.D.name, helis: S.helis,
    factories: S.factories.map(f => ({ kind: f.kind, dead: f.dead, hp: f.hp.slice(), lv: S.lv[f.kind] })),
    ship: S.ship.launched ? (S.ship.sunk ? "sunk" : "at sea") : Math.floor(S.ship.progress * 100) + "%",
  });
})();
