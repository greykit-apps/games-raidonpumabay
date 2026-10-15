/* Raid on Puma Bay -- the screens with words on them: flat dark panels
 * over the bay (css/raidonpumabay.css). How hard, before a game; the pause;
 * the report after a round; the end of a game and the high scores; and
 * Settings, Help and About from the title. */
"use strict";
(() => {
  const esc = PB.esc, C = PB.C, ART = PB.ART;
  const UI = PB.UI = { sheet: null, aidOpen: false };
  const CREDIT = UI.CREDIT = 'Built by <a href="https://greykit.com/" target="_blank" rel="noopener">greykit.com</a>';
  const ICON_BACK = '<svg class="ic" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M7.5 2 L3.5 6 L7.5 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
  const ICON_X = '<svg class="ic" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 3 L9 9 M9 3 L3 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
  const num = n => Number(n).toLocaleString("en-US");

  /* ---- the sheet: a panel of its own over whatever was showing; popup, a window to one side ---- */
  UI.open = (title, { tabs, html, onClick, onClose, onKey, back, tab = 0, wide = false, closable = true, popup = false }) => {
    UI.close(true);
    const el = document.createElement("div");
    el.className = "pb-sheet " + (popup ? "pb-pop" : "full") + (wide ? " wide" : "");
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    const draw = () => {
      el.innerHTML = '<div class="' + (popup ? "pb-win" : "sh-box") + '"><header class="sh-head">' + (back ? '<button data-back title="Back (Esc)">' + ICON_BACK + "Back</button>" : "") + "<h2>" + esc(title) + "</h2>" +
        (closable && !back && !popup ? '<button data-x title="Close (Esc)">' + ICON_X + "Close</button>" : "") + "</header>" +
        (tabs ? '<div class="sh-tabs" role="tablist" aria-label="' + esc(title) + '">' + tabs.map(([t], i) => '<button role="tab" id="tab-' + i + '" data-tab="' + i + '" aria-selected="' + (i === tab) + '" aria-controls="tabpanel" tabindex="' + (i === tab ? 0 : -1) + '">' + esc(t) + "</button>").join("") + "</div>" : "") +
        '<div class="sh-body"' + (tabs ? ' id="tabpanel" role="tabpanel" aria-labelledby="tab-' + tab + '" tabindex="0"' : "") + '><div class="sh-in">' + (tabs ? tabs[tab][1] : html()) + "</div></div></div>";
    };
    draw();
    const api = { refresh: () => { const b = el.querySelector(".sh-body"), y = b.scrollTop, f = document.activeElement && document.activeElement.dataset; draw(); el.querySelector(".sh-body").scrollTop = y; if (f) for (const k of ["set", "act", "d"]) if (f[k]) { const n = el.querySelector(`[data-${k}="${f[k]}"]`); if (n) n.focus({ preventScroll: true }); } }, close: () => UI.close(), el };
    const setTab = i => { tab = (i + tabs.length) % tabs.length; draw(); el.querySelector('[data-tab="' + tab + '"]').focus(); };
    el.addEventListener("click", ev => {
      if (popup && ev.target === el && closable) return UI.close();
      const b = ev.target.closest("button"); if (!b) return;
      PB.SFX.play("menu");
      if (b.hasAttribute("data-x")) return UI.close();
      if (b.hasAttribute("data-back")) return goBack();
      if (b.dataset.tab !== undefined) return setTab(+b.dataset.tab);
      if (onClick) onClick(b, api, ev);
    });
    el.addEventListener("toggle", ev => { if (ev.target.classList && ev.target.classList.contains("aid-list")) UI.aidOpen = ev.target.open; }, true);
    function goBack() { UI.close(true); back(); }
    document.body.appendChild(el);
    UI.sheet = { el, onClose, onKey, closable, back: back ? goBack : null, tabs: tabs ? setTab : null, tabAt: () => tab };
    for (const id of ["game", "title"]) { const n = document.getElementById(id); if (n) n.inert = true; }
    (el.querySelector("[autofocus]") || el.querySelector(".sh-body .primary") || el.querySelector('[role="tab"][aria-selected="true"]') || el.querySelector(".sh-body button") || el.querySelector("button")).focus({ preventScroll: true });
    return api;
  };
  UI.close = quiet => {
    if (!UI.sheet) return;
    const s = UI.sheet; UI.sheet = null;
    s.el.remove();
    for (const id of ["game", "title"]) { const n = document.getElementById(id); if (n) n.inert = false; }
    if (s.onClose && !quiet) s.onClose();
    if (!quiet && PB.game.mode === "title") PB.game.refreshTitle();
  };
  /* the arrows walk the buttons by where they sit on the screen */
  UI.walk = (root, key) => {
    const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[key], a = document.activeElement;
    if (!d || !a || !root.contains(a)) return false;
    const box = n => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; }, o = box(a);
    let best = null, bestS = Infinity;
    for (const n of root.querySelectorAll("button:not(:disabled), summary, input")) {
      if (n === a || n.offsetParent === null || n.getAttribute("role") === "tab" || n.closest(".sh-head")) continue;
      const b = box(n), dx = b.x - o.x, dy = b.y - o.y, along = dx * d[0] + dy * d[1];
      if (along <= (d[0] ? o.r.width : o.r.height) / 4) continue;
      const s = along + Math.abs(d[0] ? dy : dx) * 3;
      if (s < bestS) { bestS = s; best = n; }
    }
    if (!best) return false;
    best.focus({ preventScroll: true }); best.scrollIntoView({ block: "nearest" });
    return true;
  };
  UI.key = ev => {
    const s = UI.sheet;
    if (s.onKey && s.onKey(ev)) return;
    if (ev.key === "Escape") { ev.preventDefault(); if (s.back) s.back(); else if (s.closable) UI.close(); return; }
    if (s.tabs && document.activeElement && document.activeElement.getAttribute("role") === "tab" && (ev.key === "ArrowRight" || ev.key === "ArrowLeft")) { ev.preventDefault(); s.tabs(s.tabAt() + (ev.key === "ArrowRight" ? 1 : -1)); return; }
    const inInput = ev.target.closest && ev.target.closest("input");
    if (ev.key.startsWith("Arrow") && !(inInput && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) && UI.walk(s.el, ev.key)) { ev.preventDefault(); return; }
    if (ev.key === "Tab") {
      const f = [...s.el.querySelectorAll('button:not(:disabled), input, summary, a[href], [tabindex]:not([tabindex="-1"])')].filter(n => n.offsetParent !== null);
      if (!f.length) return;
      ev.preventDefault();
      const i = f.indexOf(document.activeElement), d = ev.shiftKey ? -1 : 1;
      f[i < 0 ? 0 : (i + d + f.length) % f.length].focus();
    }
  };
  /* a question before something that cannot be undone: Cancel has the focus */
  UI.ask = (question, yes, title = yes + "?") => new Promise(resolve => {
    const back = document.activeElement, el = document.createElement("div");
    el.className = "pb-ask";
    el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    el.innerHTML = '<div class="pb-win"><header class="sh-head"><h2>' + esc(title) + '</h2></header><div class="sh-body"><p>' + esc(question) +
      '</p><div class="row end"><button data-no class="primary">Cancel</button><button data-yes class="danger">' + esc(yes) + "</button></div></div></div>";
    const done = v => { document.removeEventListener("keydown", onKey, true); el.remove(); if (back && back.isConnected && back.focus) back.focus({ preventScroll: true }); resolve(v); };
    const onKey = ev => {
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); done(false); return; }
      if (ev.key === "Tab" || ev.key === "ArrowLeft" || ev.key === "ArrowRight") { const bs = [...el.querySelectorAll("button")], i = bs.indexOf(document.activeElement); ev.preventDefault(); bs[(i + (ev.shiftKey || ev.key === "ArrowLeft" ? -1 : 1) + bs.length) % bs.length].focus(); }
      ev.stopPropagation();
    };
    el.addEventListener("click", ev => { if (ev.target === el) return done(false); const b = ev.target.closest("button"); if (b) done(b.hasAttribute("data-yes")); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(el);
    el.querySelector("[data-no]").focus();
  });

  /* ---- a new game: how hard ---- */
  UI.newGame = () => {
    const last = PB.store.get("raidonpumabay_diff_v1", 1);
    UI.open("New game", { back: () => PB.game.toTitle(),
      html: () => `<p class="lede">The Wolf Empire has six factories on the islands of Puma Bay, and a battleship building in a secret yard. You have a carrier, a helicopter, and nine bombs at a time.</p>
        <div class="diffs">${C.DIFF.map((d, i) => `<button data-d="${i}" class="${i === last ? "primary" : ""}"${i === last ? " autofocus" : ""}><b><kbd>${i + 1}</kbd>${esc(d.name)}</b><span>${esc(d.note)}</span></button>`).join("")}</div>
        <p class="note">Aids: <b>${esc(PB.aidsLabel())}</b>. Change them in Settings, or with <kbd>L</kbd> in the air.</p>`,
      onKey: ev => { const n = +ev.key; if (n >= 1 && n <= 3) { ev.preventDefault(); go(n - 1); return true; } return false; },
      onClick: b => { if (b.dataset.d !== undefined) go(+b.dataset.d); },
    });
    function go(d) { PB.store.set("raidonpumabay_diff_v1", d); UI.close(true); PB.game.start(d); }
  };

  /* ---- pause ---- */
  UI.pause = () => {
    const S = PB.game.S, alive = S.factories.filter(f => !f.dead).length;
    UI.open("Paused", { popup: true,
      html: () => `<h3 class="mname">Round ${S.round} · ${esc(S.D.name)}</h3>
        <p class="meta">${num(S.score)} points · ${alive} of 6 factories standing · battleship ${S.ship.launched ? (S.ship.sunk ? "sunk" : "at sea") : Math.floor(S.ship.progress * 100) + "% built"}</p>
        <div class="col"><button data-act="resume" class="primary">Resume</button>
        <button data-act="map">Chart of the bay <kbd>Tab</kbd></button>
        <button data-act="settings">Settings</button><button data-act="help">Help</button>
        <button data-act="leave">${PB.aid("resume") ? "Leave: resume it later" : "Abandon the game"}</button></div>
        <p class="note keys">${(PB.aid("direct") ? [["Arrows", "fly that way"], ["Shift", "brake"]] : [["← →", "turn"], ["↑", "forward"], ["↓", "brake"]]).concat([["Space", "gun"], ["B", "bomb"], ["Tab", "chart"], ["L", "aids"]]).map(([k, w]) => `<span><kbd>${k}</kbd> ${w}</span>`).join(" · ")}</p>`,
      onClick: async b => {
        const a = b.dataset.act;
        if (a === "resume") UI.close();
        if (a === "map") { UI.close(); PB.game.openMap(); }
        if (a === "settings") { UI.close(true); UI.settings(() => UI.pause()); }
        if (a === "help") { UI.close(true); UI.help(0, () => UI.pause()); }
        if (a === "leave") {
          if (PB.aid("resume")) { UI.close(true); PB.game.leave(); return; }
          if (await UI.ask("Abandon this game? Its score still counts for the high scores.", "Abandon")) { UI.close(true); PB.game.abandon(); }
        }
      },
      onClose: () => PB.game.unpause(),
    });
  };

  /* ---- after a round ---- */
  const TALLY = [["factories", "Factories destroyed"], ["sections", "Factory buildings knocked down"], ["battleship", "Battleships sunk"], ["yard", "Hits on the shipyard"], ["fighters", "Fighters shot down"], ["bombers", "Bombers shot down"], ["tanks", "Tanks"], ["aa", "Flak guns"], ["radar", "Radar towers"], ["cargo", "Cargo ships sunk"], ["gunboats", "Gunboats sunk"], ["hangars", "Hangars"]];
  const tally = st => `<table class="tally">${TALLY.filter(([k]) => st[k]).map(([k, n]) => `<tr><td>${esc(n)}</td><td class="num">${st[k]}</td></tr>`).join("")}</table>`;
  UI.report = S => {
    const bonus = PB.Engine.roundBonus(S), total = bonus.reduce((s, l) => s + l[1], 0);
    UI.open(`Round ${S.round}: the bay is quiet`, { wide: true, closable: false,
      html: () => `<div class="report">
        <div><h3 class="mname big ok">All six factories down</h3>
        <p class="meta">${num(S.roundScore)} points this round · ${esc(S.D.name)}</p>${tally(S.roundStats)}</div>
        <div><h3>The round's bonus</h3><table class="tally">${bonus.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="num">+${num(v)}</td></tr>`).join("")}
        <tr class="sum"><td>Bonus</td><td class="num">+${num(total)}</td></tr></table>
        <p>Every factory will be rebuilt for round ${S.round + 1}, further along than before. The carrier is refitted, and a helicopter joins the air group.</p></div></div>
        <div class="row end"><button data-act="next" class="primary">Round ${S.round + 1}</button><button data-act="leave">${PB.aid("resume") ? "Leave: resume it later" : "End here"}</button></div>`,
      onClick: async b => {
        if (b.dataset.act === "next") { UI.close(true); PB.game.nextRound(); }
        if (b.dataset.act === "leave") {
          if (PB.aid("resume")) { UI.close(true); PB.game.nextRound(true); return; }
          if (await UI.ask("End the game here? The score so far goes to the high scores.", "End the game")) { UI.close(true); PB.game.nextRound(); PB.game.abandon(); }
        }
      },
    });
  };

  /* ---- the end ---- */
  const WHY = { helis: "The last helicopter is down.", carrier: "The carrier is sunk, and there is no deck to come back to.", abandon: "Abandoned." };
  UI.gameOver = S => {
    const rank = C.rankFor(S.score), can = PB.qualifies(S.score);
    let placed = -1, naming = can;
    UI.open("The raid is over", { wide: true, closable: false,
      html: () => `<div class="report">
        <div><h3 class="mname big ${S.end && S.end.why === "abandon" ? "dim" : "danger"}">${num(S.score)} points</h3>
        <p class="meta">${esc(WHY[S.end ? S.end.why : "helis"])} Round ${S.round} · ${esc(S.D.name)}</p>
        <p class="rank">Rated <b>${esc(rank)}</b></p>${tally(S.stats)}</div>
        <div>${naming ? `<h3>A high score</h3><p>Your name for the table:</p><div class="row"><label class="sr" for="pb-name">Your name</label><input id="pb-name" maxlength="14" value="${esc(PB.lastName())}" placeholder="Name" autocomplete="off" autofocus><button data-act="save" class="primary">Save</button><button data-act="skip">Skip</button></div>` :
          `<h3>High scores</h3>${scoresTable(PB.scores(), placed)}`}</div></div>
        ${naming ? "" : `<div class="row end"><button data-act="again" class="primary">Fly again</button><button data-act="title">Title</button></div>`}`,
      onKey: ev => { if (naming && ev.key === "Enter" && document.activeElement && document.activeElement.id === "pb-name") { ev.preventDefault(); save(); return true; } return false; },
      onClick: (b, api) => {
        const a = b.dataset.act;
        if (a === "save") save(api);
        if (a === "skip") { naming = false; api.refresh(); }
        if (a === "again") { UI.close(true); PB.game.start(S.diff); }
        if (a === "title") { UI.close(true); PB.game.toTitle(); }
      },
    });
    function save() {
      const i = document.getElementById("pb-name"), name = (i && i.value.trim().slice(0, 14)) || "Puma";
      PB.setLastName(name);
      placed = PB.addScore({ name, score: S.score, round: S.round, diff: S.D.name, rank, at: Date.now() });
      naming = false;
      UI.close(true);
      reopen();
    }
    function reopen() {
      UI.open("The raid is over", { wide: true, closable: false,
        html: () => `<div class="report"><div><h3 class="mname big danger">${num(S.score)} points</h3><p class="meta">Round ${S.round} · ${esc(S.D.name)}</p><p class="rank">Rated <b>${esc(rank)}</b></p>${tally(S.stats)}</div>
          <div><h3>High scores</h3>${scoresTable(PB.scores(), placed)}</div></div>
          <div class="row end"><button data-act="again" class="primary">Fly again</button><button data-act="title">Title</button></div>`,
        onClick: b => { if (b.dataset.act === "again") { UI.close(true); PB.game.start(S.diff); } if (b.dataset.act === "title") { UI.close(true); PB.game.toTitle(); } },
      });
    }
  };
  const scoresTable = (list, mark = -1) => list.length ? `<table class="scores"><tr><th></th><th>Name</th><th class="num">Score</th><th>Round</th><th>Rated</th></tr>${list.map((e, i) => `<tr${i === mark ? ' class="mine"' : ""}><td class="num">${i + 1}</td><td>${esc(e.name)}</td><td class="num">${num(e.score)}</td><td>${e.round}, ${esc(e.diff)}</td><td>${esc(e.rank || "")}</td></tr>`).join("")}</table>` : `<p class="note">No scores yet. They are kept in this browser.</p>`;
  UI.scores = () => UI.open("High scores", { wide: true, html: () => scoresTable(PB.scores()) + `<p class="note">The best ten, kept in this browser.</p>` });

  /* ---- Settings (greykit.games STANDARD.md §7: the game's own, Sound, speed, This browser) ---- */
  function showSettings() {
    const pill = (on, label, act) => `<button data-set="${act}" class="pill${on ? " on" : ""}" aria-pressed="${on}">${label}</button>`;
    const sw = (k, n) => `<button data-set="aidt:${k}" role="switch" aria-checked="${PB.aid(k)}" aria-label="${esc(n)}" class="pill switch${PB.aid(k) ? " on" : ""}">${PB.aid(k) ? "On" : "Off"}</button>`;
    UI.open("Settings", { wide: true,
      html: () => { const changed = Object.keys(PB.prefs.over).length, adj = changed ? ", adjusted" : ""; return `
        <h3>Aids</h3>
        <div class="row">${pill(PB.prefs.aids === "classic", "Classic" + (PB.prefs.aids === "classic" ? adj : ""), "aids:classic")}${pill(PB.prefs.aids === "field", "Field" + (PB.prefs.aids === "field" ? adj : ""), "aids:field")}</div>
        <p class="note">Classic flies as 1984 did: turn and thrust, the gauges, and your eyes. Field adds the helps below. <kbd>L</kbd> switches between them in the air.</p>
        <details class="aid-list"${UI.aidOpen ? " open" : ""}><summary>Set each aid on its own${changed ? ` (${changed} changed)` : ""}</summary>
        <table class="aids">${PB.AID_LIST.map(([k, n, note]) => `<tr><td><b>${esc(n)}</b><br><span class="note">${esc(note)}</span></td><td class="act">${sw(k, n)}</td></tr>`).join("")}</table></details>
        <h3>Look</h3>
        <div class="row">${pill(!PB.prefs.scanlines, "No scanlines", "scan:0")}${pill(PB.prefs.scanlines, "Scanlines", "scan:1")}</div>
        <div class="row">${pill(PB.prefs.shake, "Screen shake", "shake:1")}${pill(!PB.prefs.shake, "Steady screen", "shake:0")}</div>
        <h3>Sound</h3>
        <div class="row">${pill(!PB.SFX.muted, "On", "mute:0")}${pill(PB.SFX.muted, "Off", "mute:1")}</div>
        <p class="note">The rotor, the guns, the bombs, the klaxon; the march on the title. <kbd>M</kbd> switches it anywhere.</p>
        <h3>Game speed</h3>
        <div class="row">${Object.entries(PB.SPEEDS).map(([k, [n, hz]]) => pill(PB.prefs.speed === k, `${n} (${hz})`, "speed:" + k)).join("")}</div>
        <p class="note">Steps of the game each second. Every speed in it is in steps, so a slower clock changes nothing but time.</p>
        <h3>This browser</h3>
        <div class="row"><button data-set="forget" class="danger">Forget everything</button></div>
        <p class="note">Clears everything Raid on Puma Bay keeps in this browser: the high scores, a game in progress, and these settings.</p>`; },
      onClick: async (b, api) => {
        const v = b.dataset.set; if (!v) return;
        if (v === "forget") {
          if (await UI.ask("Forget everything Raid on Puma Bay has saved in this browser: the high scores, a game in progress, and your settings? This cannot be undone.", "Forget everything")) PB.forgetEverything();
          return;
        }
        const [k, a] = v.split(":");
        if (k === "aids") PB.setAids(a);
        else if (k === "aidt") PB.setAid(a, !PB.aid(a));
        else if (k === "scan") { PB.prefs.scanlines = a === "1"; PB.savePrefs(); PB.game.applyLook(); }
        else if (k === "shake") { PB.prefs.shake = a === "1"; PB.savePrefs(); }
        else if (k === "mute") { if ((a === "1") !== PB.SFX.muted) PB.game.toggleMute(); }
        else if (k === "speed") { PB.prefs.speed = a; PB.savePrefs(); PB.game.applySpeed(); }
        PB.game.syncAids();
        api.refresh();
      },
      onClose: () => { const f = UI.settingsAfter; UI.settingsAfter = null; if (f) f(); },
    });
  }
  UI.settings = after => { UI.settingsAfter = after; showSettings(); };

  /* ---- Help and About ---- */
  const glyph = k => `<img class="px glyph" src="${ART.url(ART.glyph(k, "#e9e4d8"))}" width="18" height="18" alt="">`;
  UI.helpTabs = () => [
    ["The raid", `<p><b>The Wolf Empire has taken Puma Bay.</b> On six of its islands stand six factories, each feeding one part of its war; in a yard on a seventh, a battleship is building. You fly a helicopter off a carrier at the south-west of the bay, and you are a puma.</p>
      <p>Knock down all four buildings of a factory and it is gone; leave one standing and the enemy rebuilds the rest. Destroy all six and the round is won. Every round after is the same bay, rebuilt, with an enemy further along.</p>
      <p>Bring the helicopter back to the <b>carrier</b> to load nine bombs and be patched up: slow down over the deck and it settles on the yellow paw. Push forward to lift off. Lose every helicopter, or the carrier, and the raid is over.</p>
      <p>While a factory stands, its line of the war gets better, a level at a time. The longer you leave the battleship, the closer it is to sailing; once it does it comes for your carrier.</p>
      <p class="gk-credit">${CREDIT}</p>`],
    ["Keys", `<table class="keys">
      <tr><td>Fly (Classic)</td><td><kbd>←</kbd> <kbd>→</kbd> turn, <kbd>↑</kbd> forward, <kbd>↓</kbd> brake and back off; or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></td></tr>
      <tr><td>Fly (Direct)</td><td>the arrows point the way to fly, eight ways; <kbd>Shift</kbd> brakes</td></tr>
      <tr><td>Gun</td><td><kbd>Space</kbd> or <kbd>J</kbd>, held: it fires where the nose points</td></tr>
      <tr><td>Bomb</td><td><kbd>B</kbd>, <kbd>X</kbd> or <kbd>K</kbd>; hold it for a stick of bombs</td></tr>
      <tr><td>Land</td><td>slow down over the carrier's deck and let go: it settles on its own</td></tr>
      <tr><td>Chart</td><td><kbd>Tab</kbd>: the whole bay, and the game waits</td></tr>
      <tr><td>Pause</td><td><kbd>Esc</kbd> or <kbd>P</kbd></td></tr>
      <tr><td>Aids</td><td><kbd>L</kbd> Classic or Field</td></tr>
      <tr><td>Sound</td><td><kbd>M</kbd></td></tr></table>
      <p class="note">A gamepad works too: the stick flies, A or the right trigger fires the gun, B, X or the left trigger drops a bomb, a bumper brakes, Back is the chart, Start pauses.</p>`],
    ["Flying", `<p>The helicopter keeps its way: let go and it drifts to a stop. A bomb carries on the way it was going, so it lands ahead of you: the faster you fly, the further ahead. Slow down to aim. The Field <b>bomb sight</b> shows where it will land, and lights up over something worth hitting.</p>
      <p>Damage slows you down past six bars, and smoke pours out. At ten, the helicopter goes down. Land and the deck crew patch it up; bombs are loaded one at a time while you wait.</p>
      <p>The bay wraps round: fly off one edge and you come in at the other.</p>`],
    ["The enemy", `<p><b>Flak guns</b> ring every island. They lead their shots, so a helicopter that changes speed and course is hard to hit and one that hangs still is easy. Bomb them, or shoot them at close range.</p>
      <p><b>Radar</b> towers see you coming, and then the <b>airfield</b> scrambles fighters. Bomb the radar and they come later; bomb all three hangars and none come at all until one is rebuilt. Fighters come in shooting; better electronics give them <b>homing missiles</b>, which you can dodge by turning hard across their path.</p>
      <p>Now and then <b>bombers</b> take off for your carrier, and its klaxon sounds. The carrier's own guns will try, but go and meet them. <b>Tanks</b> drive the island roads and shoot up at you; <b>gunboats</b> patrol the sea lanes.</p>
      <p><b>Cargo ships</b> carry parts from every factory's dock to the shipyard. Each one that arrives brings the battleship closer: sink them. Bombs on the yard while the ship is on the slip set the work back.</p>`],
    ["Factories", `<table>${PB.C.KIND_ORDER.map(k => `<tr><td>${glyph(k)}</td><td><b>${esc(C.KINDS[k].name)}</b></td><td>${esc(C.KINDS[k].what)}</td></tr>`).join("")}</table>
      <p>The pips by each factory in the corner are how far along its line is. A factory you have destroyed stays destroyed for the round, and its line stops where it was.</p>`],
    ["Classic and Field", `<p><b>Classic</b> flies as the 1984 game did: turn and thrust, the gauges in the corner, and nothing else. A game is played through.</p>
      <p><b>Field</b>, the default, adds the radar chart, arrows at the screen's edge toward the carrier, the battleship and enemy aircraft, the bomb sight, the landing guide, Direct steering, and leaving a game to come back to it.</p>
      <p>Settings has each on its own. <kbd>L</kbd> switches between the two sets in the air.</p>`],
  ];
  UI.help = (tab = 0, after) => UI.open("Help", { wide: true, tab, tabs: UI.helpTabs(), onClose: after });
  UI.aboutHTML = () => `<p><b>Raid on Puma Bay</b> is a remake of <i>Raid on Bungeling Bay</i> (Broderbund, 1984) for the Commodore 64: a helicopter off a carrier against an empire's factories, its fighters and flak, and the battleship it is building in secret.</p>
    <p>The original was designed and drawn by Will Wright, his first game. This is not affiliated with Broderbund; no code, art or sound from the original is used. Everything here is drawn and synthesised in the page, the title march included, and the pilot is a puma.</p>
    <p>The map, the numbers and the rules where the original is silent are ours.</p>
    <p class="gk-credit">${CREDIT}</p>`;
  UI.about = after => UI.open("About", { html: UI.aboutHTML, onClose: after });
})();
