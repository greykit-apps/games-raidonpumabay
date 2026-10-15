#!/usr/bin/env node
/*
 * Raid on Puma Bay, played headless by the bot (js/engine/bot.js).
 *
 *   node tools/sim-check.js [--seeds N] [--verbose]
 *
 * Fails if the map is broken (a factory with no sea lane to the yard, the
 * carrier's oval or a dock on land), if a step throws or leaves a number
 * that is not one, if the bot cannot win round one on Easy every time and on
 * Normal at least once, or if a game played twice from the same seed
 * and commands comes out different. Hard is played for the errors alone: the
 * bot is a fair pilot, not a great one.
 */
"use strict";
const { load } = require("./lib.js");
const PB = load();
const args = process.argv.slice(2);
const seeds = +(args[args.indexOf("--seeds") + 1] || 2) || 2;
const verbose = args.includes("--verbose");
let fail = 0;
const bad = msg => { console.log("FAIL " + msg); fail++; };

/* ---- the map ---- */
const m = PB.buildMap(), N = PB.TILES;
for (const f of m.factories) if (!m.routes[f.id]) bad(`map: the ${f.kind} factory's dock has no sea lane to the yard`);
for (const [x, y] of m.carrierPath) if (m.clear[Math.floor(y / 16) * N + Math.floor(x / 16)] < 4) bad(`map: the carrier's oval runs within 4 tiles of land at ${x},${y}`);
for (const f of m.factories) if (!PB.isWater(m.tile(f.dock.berth.tx, f.dock.berth.ty))) bad(`map: the ${f.kind} berth is on land`);
if (!m.runway || m.hangars.length !== 3) bad("map: no airfield");
console.log(`map: ${m.factories.length} factories, ${m.aa.length} flak guns, ${m.radars.length} radars, ${m.decor.length} decor`);

/* ---- a game ---- */
const finite = (o, path = "S", depth = 0) => {
  if (depth > 5 || o == null) return null;
  if (typeof o === "number") return Number.isFinite(o) ? null : path;
  if (typeof o !== "object") return null;
  for (const k of Object.keys(o)) { const r = finite(o[k], path + "." + k, depth + 1); if (r) return r; }
  return null;
};
function play(diff, seed, maxSteps, rec) {
  const S = PB.Engine.newGame({ diff, seed });
  const bot = PB.Bot.make();
  let won = 0, steps = 0, evs = 0;
  const cmds = [];
  for (; steps < maxSteps; steps++) {
    const c = rec ? rec[steps] : bot.cmd(S);
    if (!rec) cmds.push(c);
    const ev = PB.Engine.tick(S, c);
    evs += ev.length;
    if (ev.some(e => e.t === "roundWon")) won = steps;
    if (S.phase === "report") break;
    if (S.phase === "over") break;
    if (steps % 500 === 0) { const nf = finite(S); if (nf) throw new Error(`not a number: ${nf} at step ${steps}`); }
  }
  return { S, won, steps, evs, cmds };
}
const hash = S => { const s = JSON.stringify(S); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(16); };

const wins = [0, 0, 0];
for (const diff of [0, 1, 2]) for (let seed = 1; seed <= seeds; seed++) {
  const name = PB.C.DIFF[diff].name;
  let r;
  try { r = play(diff, seed, 50 * 60 * 25); } catch (e) { bad(`${name} seed ${seed}: ${e.stack}`); continue; }
  const S = r.S, mins = (r.steps / 50 / 60).toFixed(1);
  const line = `${name} seed ${seed}: ${S.phase === "report" ? "round won" : S.phase} in ${mins} min, score ${S.score}, ${S.stats.factories} factories, ${S.stats.fighters} fighters, ${S.stats.lost} helicopters lost, carrier ${Math.round(S.carrier.hp)}%, battleship ${S.ship.launched ? "launched" : Math.round(S.ship.progress * 100) + "%"}`;
  if (S.phase === "report") wins[diff]++;
  if (S.phase !== "report" && diff === 0) bad(line); else console.log((S.phase === "report" ? "ok   " : "lost ") + line);
  if (verbose) console.log("     levels", JSON.stringify(S.lv));
  /* the same again from the recording: the same game */
  if (seed === 1) {
    const again = play(diff, seed, r.steps + 1, r.cmds);
    if (hash(again.S) !== hash(S)) bad(`${name} seed ${seed}: the replay came out different`);
    else console.log(`ok   ${name} seed ${seed}: the replay matches, step for step`);
  }
  /* and round two starts cleanly */
  if (S.phase === "report") {
    PB.Engine.nextRound(S);
    for (let i = 0; i < 3000; i++) PB.Engine.tick(S, { turn: 0, thrust: 0, steer: null, fire: false, bomb: false });
    const nf = finite(S);
    if (nf) bad(`${name} seed ${seed}: round two left ${nf} not a number`);
    else if (S.round !== 2) bad(`${name} seed ${seed}: round two did not start`);
  }
}
if (wins[1] === 0) bad(`Normal: the bot never won round one in ${seeds} games`);
if (fail) { console.log(`sim-check: FAILED (${fail})`); process.exit(1); }
console.log("sim-check: every check passed");
