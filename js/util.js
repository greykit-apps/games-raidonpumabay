/* Raid on Puma Bay -- the namespace and the small helpers everything shares.
 *
 * DOM-free: tools/sim-check.js loads this file, and the engine, under node.
 * Nothing here may read the clock or Math.random: the engine's dice are
 * PB.rand(S), so a raid is the same raid every time it is flown from the
 * same seed and the same commands.
 *
 * The bay wraps round, as the 1984 one did: fly off the east edge and you
 * come in at the west. Every distance and direction in the game is taken
 * the short way round, by PB.wd. */
"use strict";
var PB = globalThis.PB || {};
globalThis.PB = PB;

/* mulberry32, stepping the state it is handed: S.rs in a game */
PB.rand = o => {
  let t = (o.rs = (o.rs + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/* a private stream, for the map and the art's noise */
PB.mulberry = seed => { const o = { rs: seed | 0 }; return () => PB.rand(o); };
PB.ri = (r, n) => Math.floor(r() * n);
PB.pick = (r, a) => a[Math.floor(r() * a.length)];

PB.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
PB.lerp = (a, b, t) => a + (b - a) * t;

/* the world is PB.WORLD pixels square and wraps both ways */
PB.TILE = 16;
PB.TILES = 160;
PB.WORLD = PB.TILE * PB.TILES;
PB.wrap = v => ((v % PB.WORLD) + PB.WORLD) % PB.WORLD;
/* the short way from a to b along one axis */
PB.wd = (a, b) => { let d = (b - a) % PB.WORLD; if (d > PB.WORLD / 2) d -= PB.WORLD; else if (d < -PB.WORLD / 2) d += PB.WORLD; return d; };
PB.dist = (ax, ay, bx, by) => Math.hypot(PB.wd(ax, bx), PB.wd(ay, by));
/* headings in radians: 0 is north (up the map), growing clockwise */
PB.hx = a => Math.sin(a);
PB.hy = a => -Math.cos(a);
PB.angTo = (ax, ay, bx, by) => Math.atan2(PB.wd(ax, bx), -PB.wd(ay, by));
PB.angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2; return d; };
PB.normAng = a => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
/* one step from a toward b, no more than rate, the short way round */
PB.turnToward = (a, b, rate) => { const d = PB.angDiff(a, b); return PB.normAng(a + PB.clamp(d, -rate, rate)); };
/* a heading as one of n sprite frames */
PB.frame = (a, n = 32) => ((Math.round(PB.normAng(a) / (Math.PI * 2) * n) % n) + n) % n;

PB.esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* localStorage, tolerant of a private window or none at all */
PB.store = {
  get(k, d = null) { try { const v = globalThis.localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { globalThis.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* no storage */ } },
  del(k) { try { globalThis.localStorage.removeItem(k); } catch (e) { /* no storage */ } },
};
