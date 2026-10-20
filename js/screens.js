/* Raid on Puma Bay -- the screens with words on them: flat dark panels
 * over the bay (css/raidonpumabay.css). How hard, before a game; the pause;
 * the report after a round; the end of a game and the high scores; and
 * Settings, Help and About from the title. */
"use strict";
(() => {
  const esc = PB.esc, C = PB.C, ART = PB.ART, K = PB.K;
  const UI = PB.UI = { sheet: null, aidOpen: false };
  const CREDIT = UI.CREDIT = 'Built by <a href="https://greykit.com/" target="_blank" rel="noopener">greykit.com</a>';
  const ICON_BACK = '<svg class="ic" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M7.5 2 L3.5 6 L7.5 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
  const ICON_X = '<svg class="ic" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 3 L9 9 M9 3 L3 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
  const num = n => Number(n).toLocaleString("en-US");

  /* ---- the sheet: a panel of its own over whatever was showing; popup, a window to one side ---- */
  UI.open = (title, { tabs, html, onClick, onClose, onKey, back, tab = 0, wide = false, closable = true, popup = false }) => {
    UI.close(true);
    const el = document.createElement("div");
    el.className = "pb-sheet " + (popup ? "pb-pop" : "full") + (wide ? " wide" : "") + (tabs ? " tabbed" : "");
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
  /* the first time, the controls are asked for here too; Classic stays chosen unless Modern is */
  UI.newGame = () => {
    const last = PB.store.get("raidonpumabay_diff_v1", 1), ask = !PB.prefs.steerAsked && !PB.prefs.learned;
    UI.open("New game", { back: () => PB.game.toTitle(),
      html: () => `<p class="lede">The Wolf Empire has six factories on the islands of Puma Bay, and a battleship building in a secret yard. You have a carrier, a helicopter, and nine bombs at a time.</p>
        <div class="diffs">${C.DIFF.map((d, i) => `<button data-d="${i}"${i === last ? " autofocus" : ""}><b><kbd>${i + 1}</kbd>${esc(d.name)}${i === last ? '<em class="last">last flown</em>' : ""}</b><span>${esc(d.note)}</span></button>`).join("")}</div>
        ${ask ? `<h3>Controls</h3><div class="row">${Object.entries(PB.STEER).map(([k, n]) => `<button data-steer="${k}" class="pill${PB.prefs.steer === k ? " on" : ""}" aria-pressed="${PB.prefs.steer === k}">${n}</button>`).join("")}</div>
        <p class="note">${PB.modern() ? "Modern: the arrows point the way to fly." : "Classic, as 1984 flew: <kbd>←</kbd> <kbd>→</kbd> turn, <kbd>↑</kbd> forward."} Change it any time in Settings.</p>` : ""}
        <p class="note">Aids: <b>${esc(PB.aidsLabel())}</b>. Change them in Settings, or with <kbd>L</kbd> in the air.</p>`,
      onKey: ev => { const n = +ev.key; if (n >= 1 && n <= 3) { ev.preventDefault(); go(n - 1); return true; } return false; },
      onClick: (b, api) => {
        if (b.dataset.d !== undefined) go(+b.dataset.d);
        if (b.dataset.steer) { PB.prefs.steer = b.dataset.steer; PB.savePrefs(); api.refresh(); api.el.querySelector(`[data-steer="${b.dataset.steer}"]`).focus({ preventScroll: true }); }
      },
    });
    function go(d) {
      PB.store.set("raidonpumabay_diff_v1", d);
      if (ask) { PB.prefs.steerAsked = true; PB.savePrefs(); }
      UI.close(true); PB.game.start(d);
    }
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
        <button data-act="leave">Main menu</button></div>
        <div class="note keys legend">${(PB.modern() ? [["Arrows", "fly that way"], ["Shift", "brake"]] : [["← →", "turn"], ["↑", "forward"], ["↓", "brake"]]).concat([["Space", "gun"], ["B", "bomb"], ["Tab", "chart"], ["L", "aids"]]).map(([k, w]) => `<span class="k">${k.split(" ").map(x => `<kbd>${x}</kbd>`).join(" ")}</span><span>${w}</span>`).join("")}</div>`,
      onClick: async b => {
        const a = b.dataset.act;
        if (a === "resume") UI.close();
        if (a === "map") { UI.close(); PB.game.openMap(); }
        if (a === "settings") { UI.close(true); UI.settings(() => UI.pause()); }
        if (a === "help") { UI.close(true); UI.help(0, () => UI.pause()); }
        if (a === "leave") {
          if (PB.prefs.resume) { UI.close(true); PB.game.leave(); return; }
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
        <div class="row end"><button data-act="next" class="primary">Round ${S.round + 1}</button><button data-act="leave">${PB.prefs.resume ? "Leave: resume it later" : "End here"}</button></div>`,
      onClick: async b => {
        if (b.dataset.act === "next") { UI.close(true); PB.game.nextRound(); }
        if (b.dataset.act === "leave") {
          if (PB.prefs.resume) { UI.close(true); PB.game.nextRound(true); return; }
          if (await UI.ask("End the game here? The score so far goes to the high scores.", "End the game")) { UI.close(true); PB.game.nextRound(); PB.game.abandon(); }
        }
      },
    });
  };

  /* ---- the end ---- */
  const WHY = { helis: "The last helicopter is down.", carrier: "The carrier is sunk, and there is no deck to come back to.", abandon: "Abandoned." };
  UI.gameOver = S => {
    const rank = C.rankFor(S.score), next = C.RANKS.find(([at]) => at > S.score), can = PB.qualifies(S.score);
    const pos = PB.scores().filter(e => e.score >= S.score).length, abandoned = S.end && S.end.why === "abandon";
    const place = can ? (pos === 0 ? "A new best score" : `Number ${pos + 1} on the table`) : "";
    let placed = -1, naming = can, skipped = false;
    /* how close it came: the round's factories, and the battleship */
    const down = S.factories.filter(f => f.dead).length, sh = S.ship;
    const close = `${down} of 6 factories down · battleship ${sh.sunk ? "sunk" : sh.launched ? "at sea" : Math.floor(sh.progress * 100) + "% built"}`;
    /* the left half is the same before the name and after it: the score, why it ended, how close, the rank, the tally */
    const left = () => `<div><h3 class="mname big${abandoned ? " dim" : ""}">${num(S.score)} points</h3>
        <p class="meta">${esc(WHY[S.end ? S.end.why : "helis"])} Round ${S.round} · ${esc(S.D.name)}</p>
        <p class="closeby">${close}</p>
        <p class="rank">Rated <b>${esc(rank)}</b></p>${next ? `<p class="note nextrank">Next: ${esc(next[1])}, at ${num(next[0])} points</p>` : ""}${tally(S.stats)}</div>`;
    const ends = `<div class="row end"><button data-act="again" class="primary">Fly again</button><button data-act="title">Title</button></div>`;
    UI.open("The raid is over", { wide: true, closable: false,
      html: () => `<div class="report">${left()}
        <div>${naming ? `<p class="placed">${place}</p><p>Your name for the table:</p><div class="row"><label class="sr" for="pb-name">Your name</label><input id="pb-name" maxlength="14" value="${esc(PB.lastName())}" placeholder="Puma" autocomplete="off" autofocus><button data-act="save" class="primary">Save</button><button data-act="skip">Skip</button></div><p class="note">Left blank, it is saved as Puma.</p>` :
          `${skipped ? `<p class="placed">${place}</p><p class="note">Not saved to the table.</p>` : ""}${!skipped || PB.scores().length ? `<h3>High scores</h3>${scoresTable(PB.scores(), placed)}` : ""}`}</div></div>
        ${naming ? "" : ends}`,
      onKey: ev => { if (naming && ev.key === "Enter" && document.activeElement && document.activeElement.id === "pb-name") { ev.preventDefault(); save(); return true; } return false; },
      onClick: (b, api) => {
        const a = b.dataset.act;
        if (a === "save") save(api);
        if (a === "skip") { naming = false; skipped = true; api.refresh(); }
        if (a === "again") { UI.close(true); PB.game.start(S.diff); }
        if (a === "title") { UI.close(true); PB.game.toTitle(); }
      },
    });
    function save() {
      const i = document.getElementById("pb-name"), name = (i && i.value.trim().slice(0, 14)) || "Puma";
      PB.setLastName(name);
      placed = PB.addScore({ name, score: S.score, round: S.round, diff: S.D.name, rank, at: Date.now(), code: !!S.cheated });
      naming = false;
      UI.close(true);
      reopen();
    }
    function reopen() {
      UI.open("The raid is over", { wide: true, closable: false,
        html: () => `<div class="report">${left()}
          <div>${place ? `<p class="placed">${place}</p>` : ""}<h3>High scores</h3>${scoresTable(PB.scores(), placed)}</div></div>${ends}`,
        onClick: b => { if (b.dataset.act === "again") { UI.close(true); PB.game.start(S.diff); } if (b.dataset.act === "title") { UI.close(true); PB.game.toTitle(); } },
      });
    }
  };
  const scoresTable = (list, mark = -1) => list.length ? `<table class="scores"><tr><th></th><th>Name</th><th class="num">Score</th><th>Round</th><th>Rated</th></tr>${list.map((e, i) => `<tr${i === mark ? ' class="mine"' : ""}><td class="num">${i + 1}</td><td>${esc(e.name)}</td><td class="num">${num(e.score)}</td><td>${e.round}, ${esc(e.diff)}${e.code ? " · code" : ""}</td><td>${esc(e.rank || "")}</td></tr>`).join("")}</table>` : `<p class="note">No scores yet: fly a raid, and the best ten are kept here, in this browser.</p>`;
  UI.scores = () => UI.open("High scores", {
    html: () => scoresTable(PB.scores()) + (PB.scores().length ? `<p class="note">The best ten, kept in this browser.</p>` : `<div class="row end"><button data-act="new" class="primary">New game</button></div>`),
    onClick: b => { if (b.dataset.act === "new") { UI.close(true); UI.newGame(); } },
  });

  /* ---- Settings (greykit.games STANDARD.md §7: the game's own, Sound, speed, This browser) ---- */
  function showSettings() {
    const pill = (on, label, act) => `<button data-set="${act}" class="pill${on ? " on" : ""}" aria-pressed="${on}">${label}</button>`;
    const toggle = (act, on, n) => `<button data-set="${act}" role="switch" aria-checked="${on}" aria-label="${esc(n)}" class="pill switch${on ? " on" : ""}">${on ? "On" : "Off"}</button>`;
    const sw = (k, n) => toggle("aidt:" + k, PB.aid(k), n);
    const line = (n, note, ctl) => `<tr><td><b>${esc(n)}</b><br><span class="note">${note}</span></td><td class="act">${ctl}</td></tr>`;
    UI.open("Settings", { wide: true,
      html: () => { const changed = Object.keys(PB.prefs.over).length, adj = changed ? ", adjusted" : ""; return `
        <h3>Controls</h3>
        <div class="row">${Object.entries(PB.STEER).map(([k, n]) => pill(PB.prefs.steer === k, n, "steer:" + k)).join("")}</div>
        <p class="note">${PB.modern() ? "<b>Modern</b>: the helicopter flies the way the arrows or the stick point, eight ways; <kbd>Shift</kbd> or a bumper brakes." : "<b>Classic</b>, as 1984 flew: <kbd>←</kbd> <kbd>→</kbd> turn the helicopter, <kbd>↑</kbd> flies forward, <kbd>↓</kbd> brakes and backs off."}</p>
        <h3>Aids</h3>
        <div class="row">${pill(PB.prefs.aids === "classic", "Classic" + (PB.prefs.aids === "classic" ? adj : ""), "aids:classic")}${pill(PB.prefs.aids === "field", "Field" + (PB.prefs.aids === "field" ? adj : ""), "aids:field")}</div>
        <p class="note">Classic flies as 1984 did: the gauges and your eyes. Field adds the helps below. <kbd>L</kbd> switches between them in the air.</p>
        <details class="aid-list"${UI.aidOpen ? " open" : ""}><summary>Set each aid on its own${changed ? ` (${changed} changed)` : ""}</summary>
        <table class="aids">${PB.AID_LIST.map(([k, n, note]) => `<tr><td><b>${esc(n)}</b><br><span class="note">${esc(note)}</span></td><td class="act">${sw(k, n)}</td></tr>`).join("")}</table></details>
        <h3>Look</h3>
        <table class="aids">${line("Scanlines", "Fine dark lines over the bay, like an old television.", toggle("scan", PB.prefs.scanlines, "Scanlines"))}
        ${line("Screen shake", "The screen jolts with big explosions and hits." + (PB.calm() ? " Off to begin with, as this computer asks for less motion." : ""), toggle("shake", PB.prefs.shake, "Screen shake"))}</table>
        <h3>Sound</h3>
        <table class="aids">${line("Sound", "The rotor, the guns, the bombs, the klaxon; the theme on the title. <kbd>M</kbd> switches it anywhere.", toggle("mute", !PB.SFX.muted, "Sound"))}
        ${line("Music", "The theme on the title. Off, the bay still sounds." + (PB.SFX.muted ? " Silent while Sound is off." : ""), toggle("music", PB.SFX.musicOn, "Music"))}</table>
        <h3>Game speed</h3>
        <div class="row">${Object.entries(PB.SPEEDS).map(([k, [n]]) => pill(PB.prefs.speed === k, n, "speed:" + k)).join("")}</div>
        <p class="note">Relaxed slows the whole game down, Brisk speeds it up. Nothing else changes.</p>
        <h3>This browser</h3>
        <table class="aids">${line("Resume a game", "Leave a game in the middle and come back to it. Off, a game is played through.", toggle("resume", PB.prefs.resume, "Resume a game"))}</table>
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
        else if (k === "steer") { PB.prefs.steer = a; PB.savePrefs(); }
        else if (k === "scan") { PB.prefs.scanlines = !PB.prefs.scanlines; PB.savePrefs(); PB.game.applyLook(); }
        else if (k === "shake") { PB.prefs.shake = !PB.prefs.shake; PB.savePrefs(); }
        else if (k === "resume") { PB.prefs.resume = !PB.prefs.resume; PB.savePrefs(); }
        else if (k === "mute") PB.game.toggleMute();
        else if (k === "music") PB.game.setMusic(!PB.SFX.musicOn);
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
  /* the enemy as it looks in the bay: its sprites laid over each other, cropped, at twice size,
     or at its own size when twice would not fit the column or the row */
  const fig = (key, parts) => {
    const c = K.get("fig:" + key, () => {
      const W = Math.max(...parts.map(p => p.width)), H = Math.max(...parts.map(p => p.height)), a = K.mk(W, H), g = a.getContext("2d");
      parts.forEach(p => g.drawImage(p, (W - p.width) >> 1, (H - p.height) >> 1));
      const d = g.getImageData(0, 0, W, H).data;
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 30) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const o = K.mk(x1 - x0 + 1, y1 - y0 + 1); o.getContext("2d").drawImage(a, -x0, -y0); return o;
    });
    const s = c.width * 2 > 112 || c.height * 2 > 60 ? 1 : 2;
    return `<img class="px fig" src="${ART.url(c)}" width="${c.width * s}" height="${c.height * s}" alt="">`;
  };
  const enemy = () => {
    const R = Math.PI / 2, row = (f, html) => `<tr><td class="figc">${f}</td><td>${html}</td></tr>`;
    return `<table class="enemy">
      ${row(fig("flak", [ART.pit(true), K.spr("flak", 0.6)]), `<p><b>Flak guns</b> lead their shots. Keep moving.</p>`)}
      ${row(fig("radar", [ART.tower(true), K.spr("dish", 0.4)]), `<p><b>Radar</b> calls up fighters. Bomb it to slow them, or the hangars to stop them.</p>`)}
      ${row(fig("fighter", [K.spr("fighter", 0)]), `<p><b>Fighters</b> later carry homing missiles. Turn hard across their path.</p>`)}
      ${row(fig("bomber", [K.spr("bomber", 0)]), `<p><b>Bombers</b> go for your carrier. The klaxon warns you.</p>`)}
      ${row(fig("tank", [K.spr("tank", 0), K.spr("turret", 0)]), `<p><b>Tanks</b> drive the island roads.</p>`)}
      ${row(fig("gunboat", [K.spr("gunboat", R)]), `<p><b>Gunboats</b> patrol the sea lanes.</p>`)}
      ${row(fig("cargo", [K.spr("cargo", R)]), `<p><b>Cargo ships</b> carry parts to the shipyard. Sink them to slow the battleship.</p>`)}
      ${row(fig("ship", [K.spr("ship4", R)]), `<p><b>The battleship</b> builds in a secret yard. Bomb the yard to set it back. Once it sails, it hunts your carrier.</p>`)}
    </table>`;
  };
  UI.helpTabs = () => [
    ["The raid", `<p><b>Destroy all six Wolf factories before the battleship is built.</b> A factory falls when all four of its buildings are down.</p>
      <p>Land on the <b>carrier</b> to repair and load nine bombs. Lose every helicopter, or the carrier, and the raid is over.</p>
      <p>The gun hits anything but factories and the battleship: those take bombs. Bombs land ahead of you, further the faster you fly.</p>
      <p class="gk-credit">${CREDIT}</p>`],
    ["Keys", `<table class="keys">
      <tr><td>Fly</td><td><kbd>←</kbd> <kbd>→</kbd> turn, <kbd>↑</kbd> forward, <kbd>↓</kbd> brake, or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></td></tr>
      <tr><td>Fly (Modern)</td><td>arrows point the way, <kbd>Shift</kbd> brakes</td></tr>
      <tr><td>Gun</td><td><kbd>Space</kbd> or <kbd>J</kbd></td></tr>
      <tr><td>Bomb</td><td><kbd>B</kbd>, <kbd>X</kbd> or <kbd>K</kbd></td></tr>
      <tr><td>Land</td><td>slow down over the deck</td></tr>
      <tr><td>Chart</td><td><kbd>Tab</kbd></td></tr>
      <tr><td>Pause</td><td><kbd>Esc</kbd> or <kbd>P</kbd></td></tr>
      <tr><td>Aids</td><td><kbd>L</kbd></td></tr>
      <tr><td>Sound</td><td><kbd>M</kbd></td></tr></table>
      <p class="note">Gamepad: stick flies, A gun, B bomb, bumper brakes, Back chart, Start pause.</p>`],
    ["The enemy", enemy()],
    ["Factories", `<table>${PB.C.KIND_ORDER.map(k => `<tr><td>${glyph(k)}</td><td><b>${esc(C.KINDS[k].name)}</b></td><td>${esc(C.KINDS[k].what)}</td></tr>`).join("")}</table>
      <p>The longer a factory stands, the higher its level, from 0 to 9.</p>`],
  ];
  UI.help = (tab = 0, after) => UI.open("Help", { wide: true, tab, tabs: UI.helpTabs(), onClose: after });
  UI.aboutHTML = () => `<p><b>Raid on Puma Bay</b> is a heavily modified remake of <i>Raid on Bungeling Bay</i> (Broderbund, 1984) for the Commodore 64. Raid the Empire's manufacturing capability before they build a Super Battleship.</p>
    <p>I hated every "remake" of RoBB because they always made the game soft and easy. Now that it's my turn... I get it. I love it, but I get it.</p>
    <p class="gk-credit">${CREDIT}</p>`;
  UI.about = after => UI.open("About", { html: UI.aboutHTML, onClose: after });
})();
