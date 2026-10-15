/* Raid on Puma Bay -- boot, title, the loop, and everything between.
 *
 * The greykit.games boot (the canon @gk-title block, STANDARD.md §3) while
 * the bay is painted, then the game's own title: the bay behind it with the
 * bot flying a raid, the name, the menu (§6's items and keys, read by the
 * block's own key lookup), the credit. Then a game. The engine runs at
 * fifty steps a second (or forty, or sixty: Settings), whatever the
 * screen's rate. */
"use strict";
(() => {
  const E = PB.Engine, C = PB.C, K = PB.K, UI = PB.UI, R = PB.Render, HUD = PB.HUD, SFX = PB.SFX, esc = PB.esc, $ = id => document.getElementById(id);
  const game = PB.game = { mode: "boot", S: null, demo: null, bot: null, ui: { mapView: false, aids: {} }, step: 20, acc: 0, last: 0, warned: 0, hintUntil: 0 };

  /* ---- sound on and off (STANDARD.md §8) ---- */
  const readMuted = () => { try { return globalThis.localStorage.getItem(PB.KEY_MUTED) === "1"; } catch (e) { return false; } };
  SFX.muted = readMuted();
  game.toggleMute = () => {
    SFX.unlock();
    SFX.setMuted(!SFX.muted);
    try { globalThis.localStorage.setItem("raidonpumabay_muted_v1", SFX.muted ? "1" : "0"); } catch (e) { /* no storage */ }
    syncSound();
    if (!SFX.muted) { SFX.play("menu"); if (game.mode === "title" && !SMALL.matches) SFX.startTune(); }
    if (game.mode === "play") HUD.toast(SFX.muted ? "Sound off" : "Sound on", "", 1200);
  };
  function syncSound() { const b = $("snd"); if (b) { b.setAttribute("aria-pressed", String(!SFX.muted)); b.classList.toggle("muted", SFX.muted); } }
  const SMALL = matchMedia("(max-width: 759px), (max-height: 479px)");

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
  function titleHTML(cfg) {
    const items = cfg.items.filter(Boolean), gap = items.indexOf("gap");
    const main = items.slice(0, gap), util = items.slice(gap + 1);
    let i = 0;
    const btn = (it, big) => `<button data-act="${it.act}" class="pr${it.act === cfg.primary ? " dflt" : ""}" style="--i:${i++}"><kbd>${esc(it.key)}</kbd><span class="lbl">${esc(it.label)}</span>` +
      (big && it.meta ? `<span class="meta">${esc(it.meta)}</span>` : "") + "</button>";
    return `<div class="pb-title">
      <canvas class="pb-scene" aria-hidden="true"></canvas><div class="pb-shade" aria-hidden="true"></div>
      <main>
        <h1 class="pb-mark" aria-label="${esc(cfg.name)}"><span class="raid">Raid on</span><span><span class="puma">Puma</span> Bay</span></h1>
        <p class="pb-sub">Six factories · one battleship · nine bombs at a time</p>
        <nav class="pb-menu" aria-label="Main menu">${main.map(it => btn(it, true)).join("")}<div class="util">${util.map(it => btn(it, false)).join("")}</div></nav>
      </main>
      <footer class="pb-foot"><span class="gk-credit">${UI.CREDIT}</span></footer>
    </div>`;
  }
  function openTitle() {
    game.mode = "title";
    const el = $("title");
    el.innerHTML = titleHTML(titleCfg());
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
  function revealTitle(print = true) {
    const t = document.querySelector("#title .pb-title");
    if (!t) return;
    if (print) t.classList.add("pb-print");
    const b = t.querySelector(".pb-menu .dflt") || t.querySelector(".pb-menu button");
    if (b) b.focus({ preventScroll: true });
  }
  game.refreshTitle = () => { if (game.mode !== "title") return; openTitle(); revealTitle(false); };
  game.toTitle = () => {
    UI.close(true);
    game.S = null; game.ui.mapView = false;
    SFX.stopLoops();
    PB.Input.clear(); HUD.clear(); PB.FX.clear();
    openTitle(); revealTitle();
    if (!SMALL.matches) SFX.startTune();
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
    const menu = document.querySelector("#title .pb-menu"), hit = menu && titleKeyButton(menu, k);
    if (hit) { ev.preventDefault(); titleAct(hit.dataset.act); return; }
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
    if (fresh) {
      game.hintUntil = performance.now() + 14000;
      HUD.hint(keysHint());
      HUD.toast(`Round ${S.round}: six factories to go`, "", 3000);
    } else HUD.toast(`Round ${S.round}, back in the air`, "", 2000);
  }
  const keysHint = () => (PB.aid("direct") ? "<kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> fly that way" : "<kbd>←</kbd><kbd>→</kbd> turn <kbd>↑</kbd> fly") +
    " <span class=\"sep\"></span> <kbd>Space</kbd> gun <span class=\"sep\"></span> <kbd>B</kbd> bomb <span class=\"sep\"></span> slow down over the deck to land";
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
    game.acc = 0; game.last = performance.now();
    checkpoint();
  };
  function checkpoint(force) {
    const S = game.S;
    if (!S || game.mode !== "play" || S.phase === "over" || S.phase === "lost") return;
    if (PB.aid("resume") || force) PB.saveGame(S);
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
        case "bombDrop": SFX.play("bombDrop"); break;
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
        case "landed": SFX.play("landed"); game.warned = 0; if (e.dmg > 0 || e.bombs < C.HELI.bombs) toast("On deck: repairs and bombs", "green", 2000); break;
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
        case "factoryDown": SFX.play("factory"); toast(e.left ? `${KIND(e.kind)} destroyed: ${e.left} to go` : `${KIND(e.kind)} destroyed: that's all six`, "green", 3200); break;
        case "rebuilt": break;
        case "levelUp":
          if (e.kind === "radio" && e.lv === 4) toast("Their fighters now carry homing missiles", "amber", 3200);
          if (e.kind === "air" && e.lv === 6) toast("Their bombers now fly in pairs", "amber", 3200);
          break;
        case "hangarDown": toast(e.left ? "A hangar is down" : "The airfield is out of action", "green"); break;
        case "hangarBack": toast("A hangar is back in service", "amber"); break;
        case "delivered": break;
        case "yardHit": toast(`The battleship's work set back: ${Math.floor(e.p * 100)}%`, "green", 1800); break;
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
        case "roundWon": SFX.play("won"); HUD.end(`Round ${e.round} won`, "All six factories are down", "ok"); break;
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
      if (!UI.sheet) {
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
    const VW = K.VW, VH = K.VH, g = R.g, rcv = R.cv;
    K.VW = cv.width; K.VH = cv.height;
    R.init(cv);
    if (!game.demoCam) { R.snap(D); game.demoCam = true; }
    R.follow(D, dt * 0.5);
    R.alpha = PB.clamp(titleAcc / 20, 0, 1);
    R.draw(D, { aids: {} });
    K.VW = VW; K.VH = VH; R.g = g; R.cv = rcv;
  }
  function toggleMap() {
    if (!game.S) return;
    game.ui.mapView = !game.ui.mapView;
    SFX.play("menu");
    if (!game.ui.mapView) game.acc = 0;
  }

  /* ---- keys ---- */
  document.addEventListener("keydown", ev => {
    SFX.unlock();
    if (game.mode === "title" && !SFX.tune && !SMALL.matches) SFX.startTune();
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (UI.sheet) { UI.key(ev); return; }
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "m" && !(ev.target.closest && ev.target.closest("input"))) { ev.preventDefault(); game.toggleMute(); return; }
    if (game.mode === "title") { titleKey(ev); return; }
    if (game.mode !== "play") return;
    const a = PB.Input.actionFor(ev.code);
    if (a) ev.preventDefault();
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
  document.addEventListener("pointerdown", () => { SFX.unlock(); if (game.mode === "title" && !SFX.tune && !SMALL.matches) SFX.startTune(); }, true);
  /* the pointer moves the focus, so the lit control is the one under it */
  document.addEventListener("pointerover", ev => {
    if (ev.pointerType !== "mouse") return;
    const b = ev.target.closest && ev.target.closest("button:not(:disabled), summary");
    if (!b || b === document.activeElement || !b.closest(".pb-sheet, .pb-ask, #title") || b.closest(".sh-head")) return;
    const a = document.activeElement;
    if (a && a.matches("input")) return;
    if (document.querySelector(".pb-ask") && !b.closest(".pb-ask")) return;
    b.focus({ preventScroll: true });
  });
  $("title").addEventListener("click", ev => { const b = ev.target.closest("[data-act]"); if (b) titleAct(b.dataset.act); });
  $("snd").addEventListener("click", () => game.toggleMute());
  $("pausebtn").addEventListener("click", () => game.pause());
  $("screen").addEventListener("contextmenu", ev => ev.preventDefault());

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
    game.applySpeed(); game.applyLook(); game.syncAids(); syncSound();
    injectTitleCSS();     /* the boot's; the title and the sheets are css/raidonpumabay.css */
    fit();
    const q = new URLSearchParams(location.search);
    const run = SMALL.matches || q.has("play") ? { finish: async () => {}, cancel() {} } : runBoot({ lines: [bootReloadLine(), "charting the bay"] });
    /* the boot is on screen: now the slow part, painting the bay */
    setTimeout(() => {
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
        openTitle();
        const saved = PB.loadGame(), best = PB.scores()[0];
        run.finish(["six factories sighted", saved ? "a raid in progress" : best ? `best: ${best.score.toLocaleString("en-US")}` : "carrier on station"]).then(() => {
          /* debug, for screenshots: ?shot=1 shows the menu without its entrance */
          revealTitle(!q.has("shot"));
          const sheet = q.get("sheet");
          if (sheet && UI[sheet]) UI[sheet]();
        });
      }
      game.last = performance.now();
      requestAnimationFrame(frame);
    }, 60);
  }
  boot();
})();
