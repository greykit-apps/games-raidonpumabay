/* Raid on Puma Bay -- the HUD: flat dark panels at the edges of the bay.
 *
 * Top left, the helicopter: score, round, the airframe's damage, the bombs
 * aboard, the helicopters in reserve, the carrier. Top centre, the clock the
 * whole round runs against: the battleship on its slip, filling in as it is
 * built, and the words in the middle under it, now and then. Top right (a
 * Field aid), the chart of the whole bay. Bottom left, the enemy's six
 * factories by name: the buildings each still has standing, and how far
 * along its line is. Tab opens the chart full size, and the game waits.
 * Nothing here is told by colour alone: a shape or a word says it too.
 * Written to the page only when something has changed. */
"use strict";
(() => {
  const C = PB.C, ART = PB.ART, K = PB.K, esc = PB.esc;
  const HUD = PB.HUD = { el: null, toasts: [], last: {}, built: false };
  const $ = id => document.getElementById(id);
  const set = (el, k, v, f) => { if (HUD.last[k] !== v) { HUD.last[k] = v; f(el, v); } };

  /* the battleship, side on, cropped to its hull: the gauge is drawn from it */
  let SHIP = null;
  const ship = () => {
    if (SHIP) return SHIP;
    const c = K.spr("ship4", Math.PI / 2), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    /* what is not built yet is drawn as the yard's plan: a faint fill inside a pale line */
    const ring = K.silhouette(c, "#000"), ghost = K.mk(c.width, c.height), gg = ghost.getContext("2d");
    K.outline(ring, "#c9ccd2");
    { const rg = ring.getContext("2d"); rg.globalCompositeOperation = "destination-out"; rg.drawImage(c, 0, 0); }
    gg.drawImage(K.silhouette(c, "rgba(233,228,216,.07)"), 0, 0); gg.globalAlpha = 0.5; gg.drawImage(ring, 0, 0);
    return (SHIP = { c, ghost, x0: x0 - 1, y0: y0 - 1, w: x1 - x0 + 3, h: y1 - y0 + 3 });
  };

  HUD.build = () => {
    const el = HUD.el = $("hud"), sp = ship();
    const off = ART.url(ART.bombIcon(false));
    const bombs = Array.from({ length: C.HELI.bombs }, (_, i) => `<img class="bomb" data-i="${i}" src="${off}" width="14" height="24" alt="">`).join("");
    const facs = C.KIND_ORDER.map(k => `<div class="fac" data-k="${k}"><img src="${ART.url(ART.glyph(k, "#e9e4d8"))}" width="18" height="18" alt=""><span class="fn">${esc(C.KINDS[k].name)}</span><span class="fs" aria-hidden="true"><i></i><i></i><i></i><i></i></span><b class="fl num">0</b></div>`).join("");
    el.innerHTML = `
      <div class="hp" id="h-status">
        <div class="h-top"><span class="num h-score">0</span><span class="h-code" hidden title="Konami code: bombs and armour without end until the round is won">Code</span><span class="h-round"><span class="lbl">Round</span> <b class="num">1</b></span></div>
        <div class="h-row"><span class="lbl">Damage</span><span class="h-bar">${"<i></i>".repeat(10)}</span></div>
        <div class="h-row"><span class="lbl">Bombs</span><span class="h-bombs">${bombs}</span></div>
        <div class="h-row"><span class="lbl">Reserve</span><span class="h-helis"></span><span class="h-carrier"><span class="lbl">Carrier</span> <b class="num">100%</b></span></div>
      </div>
      <div class="h-mid">
        <div class="hp" id="h-ship" data-st="build">
          <div class="hs-top"><span class="lbl">Battleship</span><span class="hs-cap"></span><b class="hs-st num">0%</b></div>
          <canvas id="h-shipc" width="${sp.w + 2}" height="${sp.h + 6}" style="--sw:${sp.w + 2}"></canvas>
        </div>
        <div class="h-toasts"></div>
      </div>
      <div class="hp" id="h-radar"><canvas id="h-mini" width="160" height="160"></canvas></div>
      <div class="hp" id="h-front"><div class="hf-head"><span class="lbl">Wolf factories</span><span class="lbl">Level</span></div>${facs}</div>
      <div class="hp h-hint" hidden></div>
      <div class="hp h-end" hidden></div>
      <div class="h-flash"></div>
      <div class="h-mapview" hidden><div class="hp"><canvas id="h-big" width="640" height="640"></canvas><div class="h-intel"></div></div></div>`;
    HUD.heliImg = ART.url(PB.K.spr("spare", 0));
    HUD.last = {};
    HUD.built = true;
  };

  HUD.toast = (text, tone = "", ms = 2600) => {
    const box = HUD.el && HUD.el.querySelector(".h-toasts");
    if (!box) return;
    if (HUD.toasts.some(t => t.text === text && t.until > performance.now())) return;
    const d = document.createElement("div");
    d.className = "hp h-toast " + tone; d.textContent = text;
    box.appendChild(d);
    const t = { text, d, until: performance.now() + ms };
    HUD.toasts.push(t);
    while (HUD.toasts.length > 3) HUD.toasts.shift().d.remove();
    const live = $("live"); if (live) live.textContent = text;
  };
  HUD.flash = () => { const f = HUD.el && HUD.el.querySelector(".h-flash"); if (!f) return; f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); };
  /* the gauge marks a cargo ship arriving (tick) and a hit on the yard (set) */
  HUD.pulse = kind => {
    const g = HUD.el && $("h-ship"); if (!g) return;
    g.classList.remove("tick", "set"); void g.offsetWidth; g.classList.add(kind);
    clearTimeout(HUD.pulseT); HUD.pulseT = setTimeout(() => g.classList.remove(kind), 900);
  };
  HUD.hint = html => { const h = HUD.el.querySelector(".h-hint"); if (!html) { h.hidden = true; HUD.hintNow = ""; return; } if (HUD.hintNow !== html) { HUD.hintNow = html; h.innerHTML = html; } h.hidden = false; };
  HUD.end = (title, sub, tone, more = "") => { const e = HUD.el.querySelector(".h-end"); if (!title) { e.hidden = true; return; } e.dataset.tone = tone; e.innerHTML = `<b>${esc(title)}</b><span>${esc(sub || "")}</span>${more}`; e.hidden = false; };
  /* a round won: the six factories, every one of them struck off */
  HUD.won = (S, round) => HUD.end(`Round ${round} won`, `All six factories are down · ${S.roundScore.toLocaleString("en-US")} points this round`, "ok",
    `<span class="h-down">${C.KIND_ORDER.map(k => `<i><img src="${ART.url(ART.glyph(k, "#8f8b82"))}" width="27" height="27" alt=""></i>`).join("")}</span>`);
  HUD.clear = () => { HUD.toasts.forEach(t => t.d.remove()); HUD.toasts = []; HUD.end(null); HUD.hint(null); };

  /* ---- every frame ---- */
  HUD.draw = (S, ui) => {
    if (!HUD.built) HUD.build();
    const el = HUD.el, h = S.heli, now = performance.now();
    HUD.toasts = HUD.toasts.filter(t => { if (t.until > now) return true; t.d.remove(); return false; });
    set(el.querySelector(".h-score"), "score", S.score, (e, v) => { e.textContent = v.toLocaleString("en-US"); });
    set(el.querySelector(".h-round b"), "round", S.round, (e, v) => { e.textContent = v; });
    set($("h-status"), "konami", !!S.konami, (e, v) => { e.classList.toggle("konami", v); e.querySelector(".h-code").hidden = !v; });
    const dmg = h.state === "gone" ? 10 : Math.ceil(h.dmg / 10);
    set(el.querySelector(".h-bar"), "dmg", dmg, (e, v) => {
      e.className = "h-bar" + (v >= 8 ? " crit" : v >= 6 ? " high" : "");
      [...e.children].forEach((i, k) => i.classList.toggle("on", k < v));
    });
    set(el.querySelector(".h-bombs"), "bombs", h.bombs, (e, v) => { [...e.children].forEach((img, k) => { img.src = ART.url(ART.bombIcon(k < v)); }); });
    set(el.querySelector(".h-helis"), "helis", S.helis, (e, v) => { e.innerHTML = v ? Array.from({ length: v }, () => `<img src="${HUD.heliImg}" width="20" height="20" alt="">`).join("") : `<span class="none">none</span>`; e.setAttribute("aria-label", `${v} in reserve`); });
    const cv = S.carrier, ch = cv.sunk ? "sunk" : Math.ceil(cv.hp) + "%";
    set(el.querySelector(".h-carrier b"), "carrier", ch, (e, v) => { e.textContent = v; e.parentNode.className = "h-carrier" + (cv.sunk || cv.hp < 35 ? " crit" : cv.hp < 65 ? " high" : ""); });
    /* the enemy's factories: a square for each building standing, the level of its line */
    S.factories.forEach(f => {
      const key = `f${f.id}`, v = `${f.dead ? "d" : f.hp.join("")}:${S.lv[f.kind]}`;
      set(el.querySelector(`.fac[data-k="${f.kind}"]`), key, v, e => {
        e.className = "fac" + (f.dead ? " dead" : f.hp.some(x => x < C.FACTORY.sectionHp) ? " hit" : "");
        [...e.querySelectorAll(".fs i")].forEach((i, k) => i.classList.toggle("on", !f.dead && f.hp[k] > 0));
        e.querySelector(".fl").textContent = S.lv[f.kind];
      });
    });
    gauge(el, S);
    if (now - (HUD.keptAt || 0) > 250) { HUD.keptAt = now; keepOut(); }
    /* the chart in the corner */
    const showRadar = !!ui.aids.radar;
    set($("h-radar"), "radar", showRadar, (e, v) => { e.hidden = !v; });
    if (showRadar && (PB.Render.frame % 3 === 0)) chart($("h-mini").getContext("2d"), S, 160, PB.Terrain.mini, PB.Render.frame);
    const mv = el.querySelector(".h-mapview");
    set(mv, "map", !!ui.mapView, (e, v) => { e.hidden = !v; if (v) intel(S); });
    if (ui.mapView) chart($("h-big").getContext("2d"), S, 640, PB.Terrain.map, PB.Render.frame);
  };

  /* where the edge arrows must not go: under the battleship's gauge, and the key strip */
  function keepOut() {
    const sc = $("screen"), k = sc.getBoundingClientRect().width / sc.width, out = [];
    for (const n of [$("h-ship"), HUD.el.querySelector(".h-hint")]) {
      if (!n || n.hidden) continue;
      const r = n.getBoundingClientRect();
      out.push({ x0: r.left / k - 4, x1: r.right / k + 4, y0: r.top / k - 4, y1: r.bottom / k + 4 });
    }
    PB.Render.keepOut = out;
  }

  /* the battleship's clock: the hull fills in from the stern as it is built,
   * amber from half way, red from three quarters; at sea, its hits left */
  function gauge(el, S) {
    const sh = S.ship, p = sh.launched ? 1 : PB.clamp(sh.progress, 0, 1), pc = Math.floor(p * 100);
    const st = sh.sunk ? "sunk" : sh.launched ? "out" : p >= 0.75 ? "danger" : p >= 0.5 ? "near" : "build";
    set($("h-ship"), "ship", `${st}:${pc}:${sh.launched ? sh.hp : ""}`, e => {
      e.dataset.st = st;
      e.querySelector(".hs-st").textContent = st === "sunk" ? "sunk" : st === "out" ? `${sh.hp} hits` : pc + "%";
      e.querySelector(".hs-cap").textContent = { build: "sink its cargo ships, bomb its yard", near: "half built: hit the yard", danger: "nearly ready to sail", out: "at sea, after your carrier", sunk: "on the bottom of the bay" }[st];
      const sp = ship(), cv = $("h-shipc"), g = cv.getContext("2d"), W = cv.width;
      g.clearRect(0, 0, W, cv.height);
      g.drawImage(sp.ghost, sp.x0, sp.y0, sp.w, sp.h, 1, 1, sp.w, sp.h);
      const fill = st === "sunk" ? 0 : st === "out" ? 1 : p;
      if (fill > 0) { const fw = Math.max(1, Math.round(sp.w * fill)); g.drawImage(sp.c, sp.x0, sp.y0, fw, sp.h, 1, 1, fw, sp.h); }
      /* the quarters, marked under the keel */
      const y = sp.h + 3;
      g.fillStyle = "rgba(233,228,216,.16)"; g.fillRect(1, y + 1, sp.w, 1);
      g.fillStyle = st === "danger" || st === "out" ? "#ff9a80" : st === "near" ? "#f0a43c" : "#e9e4d8";
      g.fillRect(1, y + 1, Math.round(sp.w * fill), 1);
      g.fillStyle = "rgba(233,228,216,.5)";
      for (const q of [0.25, 0.5, 0.75]) g.fillRect(1 + Math.round(sp.w * q), y, 1, 3);
    });
  }

  /* ---- the chart: a mark for each thing, told apart by shape as well as colour ---- */
  const OUT = "#0b0f16";
  const COL = { fac: "#e4572e", hit: "#f0a43c", dead: "#8f8b82", yard: "#c9a26a", ship: "#ffb03a", carrier: "#7fe08a", air: "#ff8a70", heli: "#ffffff" };
  /* one mark, centred on x, y; d is the chart's unit */
  function mark(g, what, x, y, d) {
    x = Math.round(x); y = Math.round(y);
    const box = (w, h, col, hollow) => {
      const l = x - (w >> 1), t = y - (h >> 1);
      g.fillStyle = OUT; g.fillRect(l - 1, t - 1, w + 2, h + 2);
      g.fillStyle = col; g.fillRect(l, t, w, h);
      if (hollow && w > 2 && h > 2) { g.fillStyle = OUT; g.fillRect(l + 1, t + 1, w - 2, h - 2); }
    };
    switch (what) {
      case "fac": box(d * 2 + 1, d * 2 + 1, COL.fac); break;                       /* a solid square */
      case "hit": box(d * 2 + 1, d * 2 + 1, COL.hit, true); break;                 /* a hollow square */
      case "dead": g.fillStyle = COL.dead; for (let i = -d; i <= d; i++) { g.fillRect(x + i, y + i, 1, 1); g.fillRect(x + i, y - i, 1, 1); } break;   /* a cross */
      case "yard": box(d + 2, d * 3, COL.yard, true); break;                       /* the slip, hollow and long */
      case "carrier": box(d + 1, d * 3 + 1, COL.carrier); break;                   /* a solid bar */
      case "ship": for (let i = -d - 1; i <= d + 1; i++) { const w = d + 1 - Math.abs(i); g.fillStyle = OUT; g.fillRect(x - w - 1, y + i, w * 2 + 3, 1); } /* a diamond */
        for (let i = -d; i <= d; i++) { const w = d - Math.abs(i); g.fillStyle = COL.ship; g.fillRect(x - w, y + i, w * 2 + 1, 1); } break;
      case "air": { const r = Math.max(1, d - 1); g.fillStyle = OUT; g.fillRect(x - r - 1, y - 1, r * 2 + 3, 3); g.fillRect(x - 1, y - r - 1, 3, r * 2 + 3);   /* a plus */
        g.fillStyle = COL.air; g.fillRect(x - r, y, r * 2 + 1, 1); g.fillRect(x, y - r, 1, r * 2 + 1); break; }
      case "heli": box(d, d, COL.heli); g.fillStyle = COL.heli; { const r = d + 2; for (let i = -r; i <= r; i += 2) { g.fillRect(x + i, y - r, 1, 1); g.fillRect(x + i, y + r, 1, 1); g.fillRect(x - r, y + i, 1, 1); g.fillRect(x + r, y + i, 1, 1); } } break;   /* a pip in a ring */
    }
  }
  function chart(g, S, size, base, t) {
    const k = size / PB.WORLD, m = PB.MAP, d = Math.max(2, Math.round(size / 80)), big = size >= 400, calm = PB.calm();
    g.imageSmoothingEnabled = false;
    g.drawImage(base, 0, 0, base.width, base.height, 0, 0, size, size);
    g.fillStyle = "rgba(6,14,28,.28)"; g.fillRect(0, 0, size, size);
    S.factories.forEach(f => {
      const mf = m.factories[f.id], x = mf.x * k, y = mf.y * k, hit = f.hp.some(v => v < C.FACTORY.sectionHp);
      mark(g, f.dead ? "dead" : hit ? "hit" : "fac", x, y, d);
      /* on the big chart, which factory it is */
      if (big && !f.dead) { const gl = ART.glyph(f.kind, hit ? COL.hit : OUT); g.drawImage(gl, Math.round(x) - 4, Math.round(y) - 4); }
    });
    const sh = S.ship;
    if (m.yard && !sh.launched) mark(g, "yard", m.yard.ship.x * k, m.yard.ship.y * k, d);
    if (sh.launched && !sh.sunk) mark(g, "ship", sh.x * k, sh.y * k, d);
    if (!S.carrier.sunk) mark(g, "carrier", S.carrier.x * k, S.carrier.y * k, d);
    for (const f of S.fighters) mark(g, "air", f.x * k, f.y * k, d);
    for (const b of S.bombers) if (b.t >= 0) mark(g, "air", b.x * k, b.y * k, d);
    const h = S.heli;
    if (h.state !== "gone" && (calm || (t >> 3) % 4)) mark(g, "heli", h.x * k, h.y * k, Math.max(2, d - 1));
  }
  /* the legend's marks: the same drawing, on its own small canvas */
  const legendMark = what => K.get("lg:" + what, () => { const c = K.mk(13, 13); mark(c.getContext("2d"), what, 6, 6, what === "heli" ? 2 : 3); return c; });
  const LEGEND = [["heli", "you"], ["carrier", "carrier"], ["fac", "factory"], ["hit", "factory, hit"], ["dead", "factory, destroyed"], ["yard", "shipyard"], ["ship", "battleship"], ["air", "aircraft"]];
  /* what is known about the enemy, beside the big chart */
  function intel(S) {
    const box = HUD.el.querySelector(".h-intel"), sh = S.ship;
    box.innerHTML = `<h2>Puma Bay</h2><p class="h-mvst">Round ${S.round}, ${esc(S.D.name)}. ${E_ALIVE(S)} of 6 factories standing.</p>` +
      S.factories.map(f => `<div class="h-kr${f.dead ? " dead" : ""}"><span><img src="${ART.url(ART.glyph(f.kind, f.dead ? "#8f8b82" : "#e9e4d8"))}" width="18" height="18" alt=""> ${esc(C.KINDS[f.kind].name)}</span><b>${f.dead ? "destroyed" : `level ${S.lv[f.kind]}`}</b></div>`).join("") +
      `<div class="h-kr"><span>Battleship</span><b>${sh.launched ? (sh.sunk ? "sunk" : "at sea") : Math.floor(sh.progress * 100) + "% built"}</b></div>` +
      `<div class="h-legend">${LEGEND.map(([w, n]) => `<span><img class="lg" src="${ART.url(legendMark(w))}" width="26" height="26" alt="">${n}</span>`).join("")}</div>` +
      `<p class="h-mvkeys"><kbd>Tab</kbd> or <kbd>Esc</kbd> back to the bay</p>`;
  }
  const E_ALIVE = S => S.factories.filter(f => !f.dead).length;
})();
