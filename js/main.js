/* Raid on Puma Bay -- boot, title, the loop, and everything between.
 *
 * The greykit.games integrated intro (games-meta STANDARD.md §14, the shared
 * gk-intro.js over the canon @gk-title boot): the boot while the bay is
 * painted, a press to let the sound in where the browser wants one, then the
 * block's default title over the bay with the bot flying a raid: the name,
 * the menu (§6's items and keys, read by the block's own key lookup), the
 * credit under it, the Sound and Music switches. Then a game. The engine runs at
 * fifty steps a second (or forty, or sixty: Settings), whatever the
 * screen's rate. */
"use strict";
(() => {
  const E = PB.Engine, C = PB.C, K = PB.K, UI = PB.UI, R = PB.Render, HUD = PB.HUD, SFX = PB.SFX, esc = PB.esc, $ = id => document.getElementById(id);
  const game = PB.game = { mode: "boot", S: null, demo: null, bot: null, ui: { mapView: false, aids: {} }, step: 20, acc: 0, last: 0, warned: 0, hintUntil: 0, teach: null, goalAt: 0 };

  /* ---- sound on and off (STANDARD.md §8), and the music on its own (§14) ---- */
  const readFlag = (k, d) => { try { const v = globalThis.localStorage.getItem(k); return v === null ? d : v === "1"; } catch (e) { return d; } };
  const writeFlag = (k, on) => { try { globalThis.localStorage.setItem(k, on ? "1" : "0"); } catch (e) { /* no storage */ } };
  SFX.muted = readFlag(PB.KEY_MUTED, false);
  SFX.musicOn = readFlag(PB.KEY_MUSIC, true);
  game.toggleMute = () => {
    SFX.unlock();
    SFX.setMuted(!SFX.muted);
    writeFlag(PB.KEY_MUTED, SFX.muted);
    syncSound();
    if (!SFX.muted) { SFX.play("menu"); titleTune(); }
    if (game.mode === "play") HUD.toast(SFX.muted ? "Sound off" : "Sound on", "", 1200);
  };
  game.setMusic = on => {
    SFX.unlock();
    SFX.setMusic(on);
    writeFlag(PB.KEY_MUSIC, on);
    syncSound();
    if (on) titleTune();
  };
  /* the corner's Sound in a game, and the title's switches */
  function syncSound() { const b = $("snd"); if (b) { b.setAttribute("aria-pressed", String(!SFX.muted)); b.classList.toggle("muted", SFX.muted); } if (game.sw) game.sw.refresh(); }
  const SMALL = matchMedia("(max-width: 639px), (max-height: 299px)");
  /* the title theme: on the title, never ahead of its entrance (gk-intro's onTitle starts it then, as the
     title fades up), and not on a small screen. wake() lets the browser's sound go on any key or click, and starts
     the theme where the title is up without it */
  const theme = () => { if (game.mode === "title" && !SFX.tune && !SMALL.matches) SFX.startTune(); };
  const titleTune = () => { if (!game.entering) theme(); };
  const wake = () => { SFX.unlock(); titleTune(); };

  game.applySpeed = () => { game.step = 1000 / (PB.SPEEDS[PB.prefs.speed] || PB.SPEEDS.classic)[1]; };
  game.applyLook = () => { $("stage").classList.toggle("scan", !!PB.prefs.scanlines); };
  game.syncAids = () => { for (const [k] of PB.AID_LIST) game.ui.aids[k] = PB.aid(k); };

  /* ---- the title ---- */
  function titleCfg() {
    const saved = PB.loadGame(), best = PB.scores()[0], d = C.DIFF[PB.store.get("raidonpumabay_diff_v1", 1)] || C.DIFF[1];
    return {
      name: "Raid on Puma Bay",
      primary: saved ? "resume" : "new",
      items: [
        saved && { act: "resume", label: "Resume game", key: "R", meta: `round ${saved.S.round}, ${saved.S.score.toLocaleString("en-US")} points` },
        { act: "new", label: "New game", key: "N", meta: d.name },
        { act: "scores", label: "High scores", key: "O", meta: best ? best.score.toLocaleString("en-US") : "" },
        "gap",
        { act: "settings", label: "Settings", key: "S" },
        { act: "help", label: "Help", key: "?" },
        { act: "about", label: "About", key: "A" },
      ],
    };
  }
  /* the title: the canon default (@gk-title v0.4, which was this game's own made the default) over the bay,
   * in css/raidonpumabay.css's colours. Its markup is the block's, with no line under the name; the name's
   * words are wrapped here so "Puma" can take the puma's colour */
  function words(line) { line.innerHTML = line.dataset.t.split(" ").map(w => `<span class="gki-w">${esc(w)}</span>`).join(" "); }
  function openTitle() {
    game.mode = "title";
    const el = $("title");
    el.innerHTML = titleHTML(Object.assign(titleCfg(), { scene: true }));
    el.querySelector(".scene").innerHTML = '<canvas class="pb-scene"></canvas>';
    el.querySelectorAll("h1 span[data-t]").forEach(words);
    el.hidden = false;
    $("game").hidden = true;
    document.body.classList.add("on-title");
    sizeScene();
    if (!game.demo) newDemo();
  }
  /* the picture behind the title: whole screen pixels to one of the bay's */
  function sizeScene() {
    const cv = document.querySelector("#title .pb-scene");
    if (!cv) return;
    const k = Math.max(2, Math.round(innerHeight / 300));
    cv.width = Math.ceil(innerWidth / k); cv.height = Math.ceil(innerHeight / k);
  }
  /* a raid flown by the bot, behind the menu; never saved */
  function newDemo() {
    game.demo = E.newGame({ diff: 0, seed: 1 + Math.floor(Math.random() * 1e6) });
    game.demo.heli.inv = 1e9;
    game.bot = PB.Bot.make();
    for (let i = 0; i < 400; i++) E.tick(game.demo, game.bot.cmd(game.demo));
    game.demoCam = null;
  }
  /* back on the title: the menu prints in (the name stays put, as it always has here), or, redrawn in
     place, only the focus */
  function showTitle(print = true) {
    const t = document.querySelector("#title .gk-title");
    if (!t) return;
    if (print) t.classList.add("gk-rise");
    const b = t.querySelector(".gk-primary") || t.querySelector(".gk-menu button");
    if (b) b.focus({ preventScroll: true });
  }
  /* the opening, the first time the title shows (gk-intro's finish): the bay alone with the bot's raid,
     the theme starting with it, "Raid" arriving on its first chord (after its 0.1 s lead) and "on", "Puma",
     "Bay" every other beat after, and the menu landing on the third bar (two bars at 152, 3.16 s).
     A key or a click skips to the end of it */
  const BEAT = SFX.BEAT * 1000, MENU_AT = Math.round(100 + BEAT * 8);
  const INTRO = { name: 100, step: Math.round(BEAT * 2), menu: MENU_AT, done: MENU_AT + 1200 };
  /* the integrated title (§14): the credit under the menu, the switches top right, a tick on every row the
     pointer or the arrows reach. finish() does it the first time; each later mount of the title does it again */
  const toggles = { sound: { get: () => !SFX.muted, set: on => { if (on === SFX.muted) game.toggleMute(); } },
    music: { get: () => SFX.musicOn, set: on => game.setMusic(on) } };
  const tick = () => gkTick(SFX.ctx, SFX.comp);
  function integrate() { const t = document.querySelector("#title .gk-title"); if (t) game.sw = gkIntegrate(t, { toggles, tick }); }
  game.refreshTitle = () => { if (game.mode !== "title") return; openTitle(); integrate(); showTitle(false); };
  game.toTitle = () => {
    UI.close(true);
    game.S = null; game.ui.mapView = false;
    SFX.stopLoops();
    PB.Input.clear(); HUD.clear(); PB.FX.clear();
    openTitle(); integrate(); showTitle();
    theme();
  };
  async function titleAct(a) {
    SFX.unlock();
    if (a === "resume") return resume();
    if (a === "new") return UI.newGame();
    if (a === "scores") return UI.scores();
    if (a === "settings") return UI.settings();
    if (a === "help") return UI.help();
    if (a === "about") return UI.about();
  }
  function titleKey(ev) {
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "Enter" || k === " " || k === "Tab" || k === "Shift") return;
    const menu = document.querySelector("#title .gk-menu"), hit = menu && titleKeyButton(menu, k);
    if (hit) { ev.preventDefault(); titleAct(hit.dataset.act); return; }
    /* the row of Settings, Help and About walks left and right as well */
    const row = (k === "ArrowLeft" || k === "ArrowRight") && document.activeElement && document.activeElement.closest(".gk-menu .gk-util");
    if (row) {
      const bs = [...row.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
      ev.preventDefault(); bs[(i + (k === "ArrowRight" ? 1 : -1) + bs.length) % bs.length].focus(); return;
    }
    if (menu) titleArrow(menu, ev);
  }

  /* ---- a game ---- */
  game.start = diff => {
    PB.clearGame();
    startPlay(E.newGame({ diff, seed: 1 + Math.floor(Math.random() * 2 ** 30) }), true);
  };
  function startPlay(S, fresh) {
    UI.close(true);
    game.S = S; game.mode = "play"; game.ui.mapView = false; game.warned = 0;
    SFX.stopTune();
    $("title").hidden = true; $("title").innerHTML = "";
    document.body.classList.remove("on-title");
    $("game").hidden = false;
    PB.Input.clear(); HUD.clear(); PB.FX.clear();
    game.syncAids(); fit();
    R.init($("screen"));
    R.snap(S);
    game.acc = 0;
    game.teach = null; game.goalAt = 0;
    if (fresh) {
      /* a first game keeps the keys up until the first bomb and the first landing; after that, fourteen seconds */
      if (PB.prefs.learned) { game.hintUntil = performance.now() + 14000; HUD.hint(keysHint()); }
      else { game.hintUntil = 0; game.teach = { bombed: false, landed: false }; }
      HUD.toast(`Round ${S.round}: six factories to go`, "", 3000);
      game.goalAt = performance.now() + 3200;
    } else HUD.toast(`Round ${S.round}, back in the air`, "", 2000);
  }
  const SEP = " <span class=\"sep\"></span> ";
  const keysHint = () => (PB.modern() ? "<kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> fly that way" : "<kbd>←</kbd><kbd>→</kbd> turn <kbd>↑</kbd> fly") +
    SEP + "<kbd>Space</kbd> gun" + SEP + "<kbd>B</kbd> bomb" + SEP + "slow down over the deck to land";
  const landHint = () => "Back to the carrier for bombs and repairs" + SEP + (PB.modern() ? "<kbd>Shift</kbd>" : "<kbd>↓</kbd>") + " slow down over the deck to land";
  /* the first game's key strip: the keys until a bomb is away, then landing when it is needed */
  function teachHint(S) {
    const t = game.teach, h = S.heli;
    if (!t) return;
    if (!t.bombed) HUD.hint(keysHint());
    else if (h.state === "fly" && (h.bombs <= 3 || h.dmg >= 40)) HUD.hint(landHint());
    else HUD.hint(null);
  }
  /* which way the work is: the nearest factory still standing, told by the compass */
  const COMPASS = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];
  function goalToast(S) {
    if (!PB.aid("arrows")) return;
    const h = S.heli, m = PB.MAP;
    let best = null, bd = Infinity;
    for (const f of S.factories) { if (f.dead) continue; const mf = m.factories[f.id], d = PB.dist(h.x, h.y, mf.x, mf.y); if (d < bd) { bd = d; best = { f, mf }; } }
    if (!best) return;
    const i = Math.round(Math.atan2(PB.wd(h.y, best.mf.y), PB.wd(h.x, best.mf.x)) / (Math.PI / 4));
    HUD.toast(`Nearest factory: the ${KIND(best.f.kind)}, to the ${COMPASS[(i + 8) % 8]}`, "", 3600);
  }
  function resume() {
    const g = PB.loadGame();
    if (!g) return;
    startPlay(g.S, false);
    if (g.S.phase === "report") UI.report(g.S); else game.pause();
  }
  game.openMap = () => { if (!game.ui.mapView) toggleMap(); };
  game.pause = () => { if (game.mode !== "play" || UI.sheet) return; PB.Input.clear(); checkpoint(); UI.pause(); };
  game.unpause = () => { game.acc = 0; game.last = performance.now(); };
  game.leave = () => { checkpoint(true); game.toTitle(); };
  game.abandon = () => { const S = game.S; if (!S) return; S.phase = "over"; S.end = { why: "abandon" }; PB.clearGame(); finish(); };
  game.nextRound = leave => {
    const S = game.S; if (!S) return;
    E.nextRound(S);
    HUD.end(null);
    if (leave) { checkpoint(true); game.toTitle(); return; }
    R.snap(S); PB.FX.clear();
    HUD.toast(`Round ${S.round}: the factories are rebuilt`, "amber", 3200);
    game.goalAt = performance.now() + 3400;
    game.acc = 0; game.last = performance.now();
    checkpoint();
  };
  function checkpoint(force) {
    const S = game.S;
    if (!S || game.mode !== "play" || S.phase === "over" || S.phase === "lost") return;
    if (PB.prefs.resume || force) PB.saveGame(S);
  }
  function finish() {
    const S = game.S;
    SFX.stopLoops();
    PB.clearGame();
    game.mode = "over";
    UI.gameOver(S);
  }

  /* ---- what happened this step: sounds, and a word on the screen ---- */
  const KIND = k => C.KINDS[k].name;
  const toast = (t, tone, ms) => HUD.toast(t, tone, ms);
  function events(S, evs, demo) {
    R.events(S, evs);
    if (demo) return;
    const h = S.heli, at = e => e.x === undefined ? null : PB.dist(e.x, e.y, h.x, h.y);
    for (const e of evs) {
      switch (e.t) {
        case "gun": SFX.play("gun"); break;
        case "eGun": SFX.play("eGun", at(e)); break;
        case "bombDrop": SFX.play("bombDrop"); if (game.teach) game.teach.bombed = true; break;
        case "noBombs": SFX.play("noBombs"); toast("No bombs left: back to the carrier", "amber"); break;
        case "boom": SFX.play("boom", at(e)); break;
        case "splash": SFX.play("splash", at(e)); break;
        case "flak": SFX.play("flak", at(e)); break;
        case "flakFire": SFX.play("flakFire", at(e)); break;
        case "heavyBurst": SFX.play("heavy", at(e)); break;
        case "shipFire": SFX.play("shipFire", at(e)); break;
        case "tankFire": SFX.play("tankFire", at(e)); break;
        case "missile": SFX.play("missile", at(e)); if (at(e) < 300) toast("Missile!", "red", 1200); break;
        case "kill": SFX.play("kill", at(e)); break;
        case "boomSmall": SFX.play("flak", at(e)); break;
        case "hit":
          SFX.play("hit"); HUD.flash();
          if (h.dmg >= 60 && game.warned < 1) { game.warned = 1; toast("Heavy damage: get back to the carrier", "amber", 3200); }
          if (h.dmg >= 80 && game.warned < 2) { game.warned = 2; SFX.play("warn"); toast("She won't take much more", "red", 2600); }
          break;
        case "landed": SFX.play("landed"); game.warned = 0;
          if (game.teach && game.teach.bombed) { game.teach = null; HUD.hint(null); PB.prefs.learned = true; PB.savePrefs(); } if (e.dmg > 0 || e.bombs < C.HELI.bombs) toast("On deck: repairs and bombs", "green", 2000); break;
        case "reload": SFX.play("reload"); break;
        case "repaired": SFX.play("repaired"); break;
        case "takeoff": if (performance.now() > game.hintUntil) HUD.hint(null); break;
        case "radarSees": SFX.play("radar"); toast("Their radar has you", "amber", 1800); break;
        case "scramble": toast(e.n > 1 ? `${e.n} fighters scrambled` : "A fighter scrambled", "red"); break;
        case "patrol": toast("A fighter patrol is up", "amber"); break;
        case "bomberUp": toast(e.n > 1 ? "Two bombers are up" : "A bomber is up", "amber"); break;
        case "carrierWarn": SFX.play("klaxon"); toast("Bombers are going for the carrier!", "red", 3200); break;
        case "carrierHit": SFX.play("boom", at(e)); if (e.hp < 35 && e.hp > 0) toast(`The carrier is badly hit: ${Math.ceil(e.hp)}%`, "red"); break;
        case "carrierSunk": SFX.play("bigBoom"); toast("The carrier is sunk", "red", 4000); break;
        case "sectionDown": SFX.play("bigBoom", at(e)); break;
        case "factoryDown": SFX.play("factory"); toast(e.left ? `${KIND(e.kind)} destroyed: ${e.left} to go` : `${KIND(e.kind)} destroyed: that's all six`, "green", 3200); if (e.left) game.goalAt = performance.now() + 3400; break;
        case "rebuilt": break;
        case "levelUp":
          if (e.kind === "radio" && e.lv === 4) toast("Their fighters now carry homing missiles", "amber", 3200);
          if (e.kind === "air" && e.lv === 6) toast("Their bombers now fly in pairs", "amber", 3200);
          break;
        case "hangarDown": toast(e.left ? "A hangar is down" : "The airfield is out of action", "green"); break;
        case "hangarBack": toast("A hangar is back in service", "amber"); break;
        case "delivered": HUD.pulse("tick"); break;
        case "yardHit": HUD.pulse("set"); toast(`The battleship's work set back: ${Math.floor(e.p * 100)}%`, "green", 1800); break;
        case "shipQuarter": toast("The battleship is a quarter built", "amber", 3000); break;
        case "shipHalf": SFX.play("shipWarn"); toast("The battleship is half built", "amber", 3200); break;
        case "shipThree": SFX.play("shipWarn"); toast("The battleship is three-quarters built", "red", 3200); break;
        case "shipNear": SFX.play("shipWarn"); toast("The battleship is nearly ready to sail", "red", 3600); break;
        case "shipLaunched": SFX.play("klaxon"); toast("The battleship has sailed! It is after the carrier", "red", 4200); break;
        case "shipHit": SFX.play("boom", at(e)); break;
        case "shipSunk": SFX.play("factory"); toast("The battleship is sunk!", "green", 3600); break;
        case "heliDown": SFX.play("kill"); toast("Going down!", "red", 2000); break;
        case "heliCrash": SFX.play(e.water ? "splash" : "boom"); break;
        case "newHeli": SFX.play("newHeli"); toast(e.left ? `A new helicopter on deck: ${e.left} left in reserve` : "The last helicopter is on deck", e.left ? "" : "amber", 3200); break;
        case "roundWon": SFX.play("won"); game.goalAt = 0; HUD.won(S, e.round); break;
        case "roundReport": HUD.end(null); checkpoint(); UI.report(S); break;
        case "lastHeli": SFX.play("over"); HUD.end("The raid is over", e.why === "carrier" ? "No carrier, and no helicopter in the air" : "No helicopters left", "danger"); break;
        case "gameOver": HUD.end(null); finish(); break;
      }
    }
  }
  /* the sounds that go on: the rotor, and the jets */
  function loops(S) {
    if (SFX.muted || !SFX.ctx) return;
    const h = S.heli;
    const rotor = h.state === "gone" ? 0 : h.state === "deck" ? 0.25 : h.state === "down" ? 0.5 * (1 - h.downT / 70) : 0.55 + 0.45 * Math.min(1, Math.hypot(h.vx, h.vy) / C.HELI.max);
    SFX.loop("rotor", rotor, h.state === "deck" ? 0.2 : Math.min(1, Math.hypot(h.vx, h.vy) / C.HELI.max));
    let jet = 0;
    for (const f of S.fighters) jet = Math.max(jet, 1 - PB.dist(f.x, f.y, h.x, h.y) / 360);
    for (const b of S.bombers) jet = Math.max(jet, 0.6 * (1 - PB.dist(b.x, b.y, h.x, h.y) / 360));
    SFX.loop("jet", jet, jet);
  }

  /* ---- the loop ---- */
  function step() {
    const S = game.S;
    const cmd = PB.Input.cmd(S);
    const evs = E.tick(S, cmd);
    events(S, evs, false);
    PB.Input.endTick();
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(100, now - game.last); game.last = now;
    if (game.mode === "title") { titleFrame(dt); return; }
    if (!game.S || (game.mode !== "play" && game.mode !== "over")) return;
    const S = game.S;
    if (game.mode === "play") {
      const fresh = PB.Input.pollPad();
      if ((fresh.length || PB.Input.stick) && touchAway) touchAway(true);
      if (!UI.sheet) {
        for (const a of fresh) konamiStep("pad", a);
        if (fresh.includes("pause")) { game.pause(); return; }
        if (fresh.includes("map")) toggleMap();
      }
      if (!UI.sheet && !game.ui.mapView && S.phase !== "report" && S.phase !== "over") {
        game.acc += dt;
        let n = 0;
        while (game.acc >= game.step && n++ < 6) { game.acc -= game.step; step(); if (game.mode !== "play") break; }
        if (n >= 6) game.acc = 0;
        PB.FX.step();
        if (n > 1) PB.FX.step();
      }
      R.alpha = UI.sheet || game.ui.mapView ? 0 : PB.clamp(game.acc / game.step, 0, 1);
      loops(S);
      if (game.hintUntil && now > game.hintUntil && S.heli.state !== "deck") { HUD.hint(null); game.hintUntil = 0; }
      if (game.teach && S.phase === "play") teachHint(S);
      if (game.goalAt && now > game.goalAt && !UI.sheet && !game.ui.mapView) { game.goalAt = 0; if (S.phase === "play") goalToast(S); }
    }
    if (!UI.sheet) R.follow(S, dt);
    if (!PB.prefs.shake) R.shake = 0;
    R.draw(S, game.ui);
    HUD.draw(S, game.ui);
    $("stage").classList.toggle("hurt", S.heli.dmg >= 80 && S.heli.state !== "gone");
  }
  /* the title: the bot's raid, at the title canvas's own size */
  let titleAcc = 0;
  function titleFrame(dt) {
    const cv = document.querySelector("#title .pb-scene");
    if (!cv || UI.sheet && UI.sheet.el.classList.contains("full")) return;
    const D = game.demo;
    titleAcc += dt;
    let n = 0;
    while (titleAcc >= 20 && n++ < 4) {
      titleAcc -= 20;
      const evs = E.tick(D, game.bot.cmd(D));
      events(D, evs, true);
    }
    if (n >= 4) titleAcc = 0;
    PB.FX.step();
    if (D.phase === "over" || D.phase === "report" || D.phase === "lost") { newDemo(); PB.FX.clear(); }
    /* the title has no HUD over the bay: its camera keeps to the true middle, and leaves the game's alone */
    const VW = K.VW, VH = K.VH, g = R.g, rcv = R.cv, pads = [R.padT, R.padB, R.mid];
    K.VW = cv.width; K.VH = cv.height; R.padT = R.padB = 0; R.mid = null;
    R.init(cv);
    if (!game.demoCam) { R.snap(D); game.demoCam = true; }
    R.follow(D, dt * 0.5);
    R.alpha = PB.clamp(titleAcc / 20, 0, 1);
    R.draw(D, { aids: {} });
    K.VW = VW; K.VH = VH; R.g = g; R.cv = rcv; [R.padT, R.padB, R.mid] = pads;
  }
  function toggleMap() {
    if (!game.S) return;
    game.ui.mapView = !game.ui.mapView;
    SFX.play("menu");
    if (!game.ui.mapView) game.acc = 0;
  }

  /* ---- the Konami code: up up down down left right left right B A, on the
     keys or on a pad's buttons (B is the bomb, A the gun) ---- */
  const KONAMI = { keys: ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"],
    pad: ["up", "up", "down", "down", "left", "right", "left", "right", "bomb", "fire"] };
  const konamiAt = { keys: 0, pad: 0 };
  function konamiStep(src, x) {
    const seq = KONAMI[src], i = konamiAt[src];
    /* a wrong press starts it over; a third up still leaves two in hand */
    konamiAt[src] = x === seq[i] ? i + 1 : x === seq[0] ? (i === 2 ? 2 : 1) : 0;
    if (konamiAt[src] < seq.length) return;
    konamiAt.keys = konamiAt.pad = 0;
    if (!game.S || !E.konami(game.S)) return;
    game.warned = 0;
    SFX.play("repaired");
    toast("Konami code: bombs and armour without end, for the rest of this round", "green", 4000);
  }

  /* ---- keys ---- */
  /* on the window, ahead of the boot, which keeps the key that skips it from the document */
  addEventListener("keydown", wake, true);
  /* a click that skips the entrance is spent on it (gk-intro keeps it from the page); note when it came, so the
     click it makes cannot land on a row that was not there when it was pressed */
  addEventListener("pointerdown", () => { if (game.entering) game.skippedAt = performance.now(); }, true);
  document.addEventListener("keydown", ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (UI.sheet) { UI.key(ev); return; }
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "m" && !(ev.target.closest && ev.target.closest("input"))) { ev.preventDefault(); game.toggleMute(); return; }
    if (game.mode === "title") { titleKey(ev); return; }
    if (game.mode !== "play") return;
    const a = PB.Input.actionFor(ev.code);
    if (a) ev.preventDefault();
    if (!ev.repeat) konamiStep("keys", ev.code);
    if (game.ui.mapView) { if (a === "map" || a === "pause") toggleMap(); return; }
    if (a === "pause") { game.pause(); return; }
    if (a === "map") { toggleMap(); return; }
    if (a === "aids") {
      PB.setAids(PB.prefs.aids === "field" ? "classic" : "field"); game.syncAids();
      HUD.toast(PB.prefs.aids === "field" ? "Field aids" : "Classic", "", 1400);
      return;
    }
    PB.Input.down(ev);
  });
  document.addEventListener("keyup", ev => PB.Input.up(ev));
  addEventListener("blur", () => { PB.Input.clear(); if (game.mode === "play") game.pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { checkpoint(); if (game.mode === "play") game.pause(); } });
  addEventListener("pagehide", () => checkpoint());
  document.addEventListener("pointerdown", wake, true);
  /* the pointer moves the focus, so the lit control is the one under it */
  /* but not in a question before something that cannot be undone: there Enter stays on Cancel, and the pointer only lights what it is over */
  document.addEventListener("pointerover", ev => {
    if (ev.pointerType !== "mouse") return;
    const b = ev.target.closest && ev.target.closest("button:not(:disabled), summary");
    if (!b || b === document.activeElement || !b.closest(".pb-sheet, #title") || b.closest(".sh-head")) return;
    const a = document.activeElement;
    if (a && a.matches("input")) return;
    if (document.querySelector(".pb-ask")) return;
    b.focus({ preventScroll: true });
  });
  $("title").addEventListener("click", ev => { const b = ev.target.closest("[data-act]"); if (b && !(performance.now() - (game.skippedAt || 0) < 600)) titleAct(b.dataset.act); });
  $("snd").addEventListener("click", () => game.toggleMute());
  $("pausebtn").addEventListener("click", () => game.pause());
  $("screen").addEventListener("contextmenu", ev => ev.preventDefault());

  /* ---- touch: a standard cross d-pad over the bay's left edge, the face buttons over its right (gun at the
     foot, bomb right, brake left, map at the head), fed to the input the keys and the pad feed. Shown on a
     touchscreen only, away once a key or a pad is used, back at the next touch ---- */
  let touchAway = null;
  function setupTouch() {
    const pad = $("touch");
    if (!pad || (!("ontouchstart" in window) && !navigator.maxTouchPoints)) return;
    pad.hidden = false;
    const I = PB.Input, T = I.touch;
    for (const b of pad.querySelectorAll("[data-a]")) {
      const a = b.dataset.a;
      b.addEventListener("pointerdown", ev => {
        ev.preventDefault(); SFX.unlock();
        if (game.mode !== "play" || UI.sheet) return;
        if (a === "map") { toggleMap(); return; }
        if (game.ui.mapView) return;
        T.add(a); I.pressed.add(a); b.classList.add("on");
      });
      const off = ev => { ev.preventDefault(); T.delete(a); b.classList.remove("on"); };
      for (const e of ["pointerup", "pointercancel", "pointerleave"]) b.addEventListener(e, off);
    }
    /* the d-pad is one piece, as a pad's is: the thumb's place on the cross is the direction, so it rolls from
       arm to arm, and between two arms is the diagonal */
    const dpad = pad.querySelector(".dpad"), DIRS = ["up", "down", "left", "right"];
    const tri = Object.fromEntries(DIRS.map(d => [d, dpad.querySelector(".tri." + d)]));
    const EIGHT = { 0: ["right"], 1: ["right", "down"], 2: ["down"], 3: ["down", "left"], 4: ["left"], "-4": ["left"], "-3": ["left", "up"], "-2": ["up"], "-1": ["up", "right"] };
    let dirs = new Set(), pid = null;
    const setDirs = next => {
      for (const d of DIRS) {
        const was = dirs.has(d), now = next.has(d);
        if (now && !was) { T.add(d); I.pressed.add(d); }
        if (was && !now) T.delete(d);
        tri[d].classList.toggle("on", now);
      }
      dirs = next;
    };
    const read = ev => {
      const r = dpad.getBoundingClientRect(), dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < r.width * 0.12) return new Set();
      return new Set(EIGHT[Math.round(Math.atan2(dy, dx) * 180 / Math.PI / 45)]);
    };
    dpad.addEventListener("pointerdown", ev => {
      ev.preventDefault(); SFX.unlock();
      pid = ev.pointerId; try { dpad.setPointerCapture(pid); } catch (e) { /* fine */ }
      setDirs(read(ev));
    });
    dpad.addEventListener("pointermove", ev => { if (ev.pointerId === pid) { ev.preventDefault(); setDirs(read(ev)); } });
    const lift = ev => { if (ev.pointerId === pid) { pid = null; setDirs(new Set()); } };
    dpad.addEventListener("pointerup", lift); dpad.addEventListener("pointercancel", lift);
    touchAway = on => {
      if (pad.classList.contains("away") === on) return;
      pad.classList.toggle("away", on);
      if (on) { pid = null; setDirs(new Set()); T.clear(); for (const b of pad.querySelectorAll(".on")) b.classList.remove("on"); }
    };
    addEventListener("keydown", ev => { if (ev.isTrusted) touchAway(true); }, true);
    addEventListener("pointerdown", ev => { if (ev.pointerType === "touch") touchAway(false); }, true);
  }

  /* ---- the stage: the whole window, about three hundred pixels high, square pixels ---- */
  function fit() {
    const k = Math.max(2, Math.round(innerHeight / 300));
    K.VW = Math.ceil(innerWidth / k); K.VH = Math.ceil(innerHeight / k);
    const cv = $("screen");
    cv.width = K.VW; cv.height = K.VH;
    const st = $("stage");
    st.style.width = K.VW * k + "px"; st.style.height = K.VH * k + "px";
    if (R.g && game.mode === "play") R.init(cv);
  }
  addEventListener("resize", () => { fit(); sizeScene(); });

  /* ---- boot ---- */
  function boot() {
    game.applySpeed(); game.applyLook(); game.syncAids(); syncSound(); setupTouch();
    injectTitleCSS();     /* the boot's and the title's; the title's colours and the sheets are css/raidonpumabay.css */
    fit();
    const q = new URLSearchParams(location.search);
    const lines = [bootReloadLine(), "charting the bay"];
    /* the integrated intro, but not on a small screen (the page asks for a desktop), a debug game (?play), or a
       picture (?shot, ?sheet): those keep the plain boot, and ?play none at all */
    const plain = SMALL.matches || q.has("play") || q.has("shot") || q.has("sheet");
    const intro = plain ? null : startIntro({ lines, audio: () => { SFX.unlock(); return SFX.ctx; } });
    const run = intro ? null : SMALL.matches || q.has("play") ? { finish: async () => {}, cancel() {} } : runBoot({ lines });
    /* the boot is on screen: now the slow part, painting the bay, which holds the page a second or two. Where
       the browser will play sound, the meow is placed on the audio clock first, or it would come too late to
       end with the logo and be dropped; finding out takes a quarter of a second at most */
    const settle = intro ? gkSoundAllowed(SFX.ctx).then(ok => ok ? gkMeowBuffer(SFX.ctx) : null) : Promise.resolve();
    settle.then(() => setTimeout(() => {
      PB.Terrain.build();
      R.init($("screen"));
      HUD.build();
      if (q.has("play")) {
        /* debug: ?play=<0-2>&seed=<n>&at=<x>,<y> straight into a game; &map=1 opens the chart, &pause=1 the pause menu */
        const S = E.newGame({ diff: +(q.get("play") || 1), seed: +(q.get("seed") || 1) });
        if (q.has("at")) { const [x, y] = q.get("at").split(",").map(Number); if (isFinite(x) && isFinite(y)) Object.assign(S.heli, { x, y, state: "fly", alt: 1, away: true }); }
        startPlay(S, true);
        if (q.has("map")) game.ui.mapView = true;
        if (q.has("pause")) game.pause();
      } else {
        /* the title's entrance is gk-intro's until the menu is in; debug: &hold=always holds for the press even
           where the browser would play sound already (the in-app browser, a launch from the arcade) */
        if (intro) game.entering = true;
        openTitle();
        const saved = PB.loadGame(), best = PB.scores()[0];
        const more = ["six factories sighted", saved ? "a raid in progress" : best ? `best: ${best.score.toLocaleString("en-US")}` : "carrier on station"];
        /* a moment first for the boot's own lines, which the painting held up, so they print ahead of these */
        setTimeout(() => intro ? enter(more) : run.finish(more).then(() => {
          /* debug, for screenshots: ?shot=1 shows the menu without its entrance */
          showTitle(!q.has("shot"));
          const sheet = q.get("sheet");
          if (sheet && UI[sheet]) UI[sheet]();
        }), 20);
        if (!intro) integrate();
      }
      game.last = performance.now();
      requestAnimationFrame(frame);
    }, 60));
    /* the integrated intro's end: the hold if the browser wants one, then the title's entrance */
    function enter(more) {
      intro.finish({ more, name: "words", timing: INTRO, hold: q.get("hold") === "always" ? "always" : "auto", toggles, tick,
        onContinue: wake,
        /* the title fades up, and the theme starts with it */
        onTitle: theme,
        onDone: () => { game.entering = false; titleTune(); } }).then(r => { game.sw = r.toggles; });
    }
  }
  boot();
})();
