/* Raid on Puma Bay -- the settings, the high scores, a game left to come
 * back to, and nothing else. Every key begins raidonpumabay_ (greykit.games
 * STANDARD.md §5), so Settings can forget them by that prefix and leave the
 * rest of greykit.com alone (§2). */
"use strict";
(() => {
  const KEY_PREFS = "raidonpumabay_prefs_v1", KEY_SCORES = "raidonpumabay_scores_v1", KEY_GAME = "raidonpumabay_game_v1", KEY_NAME = "raidonpumabay_name_v1";
  PB.KEY_MUTED = "raidonpumabay_muted_v1";

  /* ---- the aids: Classic is 1984, Field is a modern helping hand ---- */
  PB.AID_LIST = [
    ["radar", "Corner chart", "The whole bay in the corner: the factories standing and down, the carrier, the battleship, enemy aircraft."],
    ["arrows", "Edge markers", "Arrows at the edge of the screen toward the nearest factory, the carrier, the battleship and enemy aircraft."],
    ["reticle", "Bomb sight", "Where a bomb dropped now would land. It lights up over something worth hitting."],
    ["landing", "Landing guide", "The carrier's landing spot blinks as you come in with bombs to load."],
    ["resume", "Resume a game", "Leave mid-game and come back to it. Classic: a game is played through."],
  ];
  PB.AIDS = { field: {}, classic: {} };
  for (const [k] of PB.AID_LIST) { PB.AIDS.field[k] = true; PB.AIDS.classic[k] = false; }

  /* the system's "reduce motion": screen shake starts off, and nothing on the HUD blinks */
  const CALM = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  PB.calm = () => CALM.matches;

  /* ---- the controls: Classic turns and thrusts as 1984 did; Modern flies where the stick points ---- */
  PB.STEER = { classic: "Classic", modern: "Modern" };

  PB.SPEEDS = { classic: ["Classic", 50], relaxed: ["Relaxed", 40], brisk: ["Brisk", 60] };
  /* learned: the first bomb and the first landing are done, so the key strip need not wait for them */
  PB.prefs = Object.assign({ aids: "field", over: {}, steer: "classic", speed: "classic", scanlines: false, shake: !CALM.matches, learned: false }, PB.store.get(KEY_PREFS, {}));
  if (!PB.AIDS[PB.prefs.aids]) PB.prefs.aids = "field";
  if (!PB.STEER[PB.prefs.steer]) PB.prefs.steer = "classic";
  delete PB.prefs.over.direct; /* steering was a Field aid once; it is the Controls setting now */
  PB.modern = () => PB.prefs.steer === "modern";
  PB.savePrefs = () => PB.store.set(KEY_PREFS, PB.prefs);
  PB.aid = name => { const o = PB.prefs.over[name]; return o === undefined ? !!PB.AIDS[PB.prefs.aids][name] : !!o; };
  PB.setAids = set => { PB.prefs.aids = set; PB.prefs.over = {}; PB.savePrefs(); };
  PB.setAid = (name, on) => { if (on === !!PB.AIDS[PB.prefs.aids][name]) delete PB.prefs.over[name]; else PB.prefs.over[name] = on; PB.savePrefs(); };
  PB.aidsLabel = () => (PB.prefs.aids === "field" ? "Field" : "Classic") + (Object.keys(PB.prefs.over).length ? ", adjusted" : "");

  /* ---- a game left in the middle ---- */
  PB.loadGame = () => { const g = PB.store.get(KEY_GAME, null); return g && g.S && g.S.v === 1 ? g : null; };
  PB.saveGame = S => PB.store.set(KEY_GAME, { S, at: Date.now() });
  PB.clearGame = () => PB.store.del(KEY_GAME);

  /* ---- the high scores: the best ten, in this browser ---- */
  PB.scores = () => { const s = PB.store.get(KEY_SCORES, []); return Array.isArray(s) ? s : []; };
  PB.qualifies = score => score > 0 && (PB.scores().length < 10 || score > PB.scores()[9].score);
  PB.addScore = e => {
    const s = PB.scores().concat([e]).sort((a, b) => b.score - a.score).slice(0, 10);
    PB.store.set(KEY_SCORES, s);
    return s.indexOf(e);
  };
  PB.lastName = () => PB.store.get(KEY_NAME, "");
  PB.setLastName = n => PB.store.set(KEY_NAME, n);

  /* ---- Forget everything (STANDARD.md §2): this game's keys, by prefix ---- */
  PB.forgetEverything = () => {
    for (const area of ["localStorage", "sessionStorage"]) {
      try {
        const s = globalThis[area];
        for (let i = s.length - 1; i >= 0; i--) { const k = s.key(i); if (k && k.startsWith("raidonpumabay")) s.removeItem(k); }
      } catch (e) { /* no storage */ }
    }
    location.reload();
  };
})();
