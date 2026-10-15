/* Raid on Puma Bay -- the HUD: flat dark panels at the corners of the bay.
 *
 * Top left, the helicopter: score, round, the airframe's damage, the bombs
 * aboard, the helicopters in reserve, the carrier. Top right (a Field aid),
 * the radar chart of the whole bay. Bottom left, the enemy: its six
 * factories, how far along each one's line is, and the battleship. Words in
 * the middle, now and then. Tab opens the chart full size, and the game
 * waits. Written to the page only when something has changed. */
"use strict";
(() => {
  const C = PB.C, ART = PB.ART, esc = PB.esc;
  const HUD = PB.HUD = { el: null, toasts: [], last: {}, built: false };
  const $ = id => document.getElementById(id);
  const set = (el, k, v, f) => { if (HUD.last[k] !== v) { HUD.last[k] = v; f(el, v); } };

  HUD.build = () => {
    const el = HUD.el = $("hud");
    const off = ART.url(ART.bombIcon(false));
    const bombs = Array.from({ length: C.HELI.bombs }, (_, i) => `<img class="bomb" data-i="${i}" src="${off}" width="14" height="24" alt="">`).join("");
    const facs = C.KIND_ORDER.map(k => `<div class="fac" data-k="${k}"><img class="ico" src="${ART.url(ART.glyph(k, "#e9e4d8"))}" width="18" height="18" alt=""><span class="lv"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>`).join("");
    el.innerHTML = `
      <div class="hp" id="h-status">
        <div class="h-top"><span class="num h-score">0</span><span class="h-round"><span class="lbl">Round</span> <b class="num">1</b></span></div>
        <div class="h-row"><span class="lbl">Damage</span><span class="h-bar">${"<i></i>".repeat(10)}</span></div>
        <div class="h-row"><span class="lbl">Bombs</span><span class="h-bombs">${bombs}</span></div>
        <div class="h-row"><span class="lbl">Reserve</span><span class="h-helis"></span><span class="h-carrier"><span class="lbl">Carrier</span> <b class="num">100%</b></span></div>
      </div>
      <div class="hp" id="h-radar"><canvas id="h-mini" width="160" height="160"></canvas></div>
      <div class="hp" id="h-front"><div class="h-facs">${facs}</div><div class="h-ship"><span class="lbl">Battleship</span><span class="h-sbar"><i></i></span><b class="h-sst">0%</b></div></div>
      <div class="h-toasts"></div>
      <div class="hp h-hint" hidden></div>
      <div class="hp h-end" hidden></div>
      <div class="h-flash"></div>
      <div class="h-mapview" hidden><div class="hp"><canvas id="h-big" width="640" height="640"></canvas><div class="h-intel"></div></div></div>`;
    const heli = ART.url(PB.K.spr("spare", 0));
    el.querySelectorAll(".fac").forEach(f => { f.title = C.KINDS[f.dataset.k].name; });
    HUD.heliImg = heli;
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
  HUD.hint = html => { const h = HUD.el.querySelector(".h-hint"); if (!html) { h.hidden = true; return; } h.innerHTML = html; h.hidden = false; };
  HUD.end = (title, sub, tone) => { const e = HUD.el.querySelector(".h-end"); if (!title) { e.hidden = true; return; } e.dataset.tone = tone; e.innerHTML = `<b>${esc(title)}</b><span>${esc(sub || "")}</span>`; e.hidden = false; };
  HUD.clear = () => { HUD.toasts.forEach(t => t.d.remove()); HUD.toasts = []; HUD.end(null); HUD.hint(null); };

  /* ---- every frame ---- */
  HUD.draw = (S, ui) => {
    if (!HUD.built) HUD.build();
    const el = HUD.el, h = S.heli, now = performance.now();
    HUD.toasts = HUD.toasts.filter(t => { if (t.until > now) return true; t.d.remove(); return false; });
    set(el.querySelector(".h-score"), "score", S.score, (e, v) => { e.textContent = v.toLocaleString("en-US"); });
    set(el.querySelector(".h-round b"), "round", S.round, (e, v) => { e.textContent = v; });
    const dmg = h.state === "gone" ? 10 : Math.ceil(h.dmg / 10);
    set(el.querySelector(".h-bar"), "dmg", dmg, (e, v) => {
      e.className = "h-bar" + (v >= 8 ? " crit" : v >= 6 ? " high" : "");
      [...e.children].forEach((i, k) => i.classList.toggle("on", k < v));
    });
    set(el.querySelector(".h-bombs"), "bombs", h.bombs, (e, v) => { [...e.children].forEach((img, k) => { img.src = ART.url(ART.bombIcon(k < v)); }); });
    set(el.querySelector(".h-helis"), "helis", S.helis, (e, v) => { e.innerHTML = v ? Array.from({ length: v }, () => `<img src="${HUD.heliImg}" width="20" height="20" alt="">`).join("") : `<span class="none">none</span>`; e.setAttribute("aria-label", `${v} in reserve`); });
    const cv = S.carrier, ch = cv.sunk ? "sunk" : Math.ceil(cv.hp) + "%";
    set(el.querySelector(".h-carrier b"), "carrier", ch, (e, v) => { e.textContent = v; e.parentNode.className = "h-carrier" + (cv.sunk || cv.hp < 35 ? " crit" : cv.hp < 65 ? " high" : ""); });
    /* the enemy's factories, and its lines */
    S.factories.forEach(f => {
      const key = `f${f.id}`, v = `${f.dead ? "d" : f.hp.join("")}:${S.lv[f.kind]}`;
      set(el.querySelector(`.fac[data-k="${f.kind}"]`), key, v, e => {
        e.className = "fac" + (f.dead ? " dead" : f.hp.some(x => x < C.FACTORY.sectionHp) ? " hit" : "");
        [...e.querySelectorAll(".lv i")].forEach((i, k) => i.classList.toggle("on", k < S.lv[f.kind]));
        e.title = `${C.KINDS[f.kind].name}: ${f.dead ? "destroyed" : `${f.hp.filter(x => x > 0).length} of 4 standing`}, level ${S.lv[f.kind]}`;
      });
    });
    const sh = S.ship, sst = sh.launched ? (sh.sunk ? "sunk" : "at sea") : Math.floor(sh.progress * 100) + "%";
    set(el.querySelector(".h-ship"), "ship", sst + (sh.launched ? Math.ceil(sh.hp / (sh.max || 1) * 100) : ""), e => {
      e.querySelector(".h-sst").textContent = sh.launched && !sh.sunk ? `at sea, ${sh.hp} hits` : sst;
      e.querySelector(".h-sbar i").style.width = (sh.launched ? (sh.sunk ? 0 : sh.hp / (sh.max || 1)) : sh.progress) * 100 + "%";
      e.className = "h-ship" + (sh.launched && !sh.sunk ? " out" : sh.progress > 0.75 ? " near" : "");
    });
    /* the radar chart */
    const showRadar = !!ui.aids.radar;
    set($("h-radar"), "radar", showRadar, (e, v) => { e.hidden = !v; });
    if (showRadar && (PB.Render.frame % 3 === 0)) chart($("h-mini").getContext("2d"), S, 160, PB.Terrain.mini, PB.Render.frame);
    const mv = el.querySelector(".h-mapview");
    set(mv, "map", !!ui.mapView, (e, v) => { e.hidden = !v; if (v) intel(S); });
    if (ui.mapView) chart($("h-big").getContext("2d"), S, 640, PB.Terrain.map, PB.Render.frame);
  };

  /* the bay, small, with what is on it */
  function chart(g, S, size, base, t) {
    const k = size / PB.WORLD, m = PB.MAP, d = Math.max(2, Math.round(size / 80));
    g.imageSmoothingEnabled = false;
    g.drawImage(base, 0, 0, base.width, base.height, 0, 0, size, size);
    g.fillStyle = "rgba(6,14,28,.28)"; g.fillRect(0, 0, size, size);
    const dot = (x, y, s, col, out = true) => { const px = Math.round(x * k - s / 2), py = Math.round(y * k - s / 2); if (out) { g.fillStyle = "#0b0f16"; g.fillRect(px - 1, py - 1, s + 2, s + 2); } g.fillStyle = col; g.fillRect(px, py, s, s); };
    S.factories.forEach(f => {
      const mf = m.factories[f.id];
      if (f.dead) { g.fillStyle = "#8f8b82"; const x = Math.round(mf.x * k), y = Math.round(mf.y * k); for (let i = -d; i <= d; i++) { g.fillRect(x + i, y + i, 1, 1); g.fillRect(x + i, y - i, 1, 1); } }
      else dot(mf.x, mf.y, d * 2 + 1, f.hp.some(x => x < C.FACTORY.sectionHp) ? "#e8a33d" : "#e4572e");
    });
    const sh = S.ship;
    if (m.yard && !sh.launched) dot(m.yard.ship.x, m.yard.ship.y, d + 1, sh.progress > 0.75 && (t >> 4) % 2 ? "#ffd84d" : "#b08a5a");
    if (sh.launched && !sh.sunk) dot(sh.x, sh.y, d * 2, (t >> 3) % 2 ? "#ffb03a" : "#ff7a2a");
    if (!S.carrier.sunk) dot(S.carrier.x, S.carrier.y, d * 2, "#7fe08a");
    for (const f of S.fighters) dot(f.x, f.y, Math.max(2, d - 1), "#ff6b52", false);
    for (const b of S.bombers) if (b.t >= 0) dot(b.x, b.y, d, "#ff6b52");
    const h = S.heli;
    if (h.state !== "gone" && (t >> 3) % 3) dot(h.x, h.y, d, "#ffffff");
  }
  /* what is known about the enemy, beside the big chart */
  function intel(S) {
    const box = HUD.el.querySelector(".h-intel"), sh = S.ship;
    box.innerHTML = `<h2>Puma Bay</h2><p class="h-mvst">Round ${S.round}, ${esc(S.D.name)}. ${E_ALIVE(S)} of 6 factories standing.</p>` +
      S.factories.map(f => `<div class="h-kr${f.dead ? " dead" : ""}"><span><img src="${ART.url(ART.glyph(f.kind, f.dead ? "#8f8b82" : "#e9e4d8"))}" width="18" height="18" alt=""> ${esc(C.KINDS[f.kind].name)}</span><b>${f.dead ? "destroyed" : `level ${S.lv[f.kind]}`}</b></div>`).join("") +
      `<div class="h-kr"><span>Battleship</span><b>${sh.launched ? (sh.sunk ? "sunk" : "at sea") : Math.floor(sh.progress * 100) + "% built"}</b></div>` +
      `<div class="h-legend"><span><i class="lg" style="background:#e4572e"></i>factory</span><span><i class="lg" style="background:#7fe08a"></i>carrier</span><span><i class="lg" style="background:#ff6b52"></i>aircraft</span><span><i class="lg" style="background:#ffb03a"></i>battleship</span></div>` +
      `<p class="h-mvkeys"><kbd>Tab</kbd> or <kbd>Esc</kbd> back to the bay</p>`;
  }
  const E_ALIVE = S => S.factories.filter(f => !f.dead).length;
})();
