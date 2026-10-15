/* Raid on Puma Bay -- sound, all of it synthesised: no audio files.
 *
 * The rotor is always there while you fly, a thump at the blades' pace;
 * jets howl past; the gun rattles, bombs whistle down and land, flak pops
 * dull and close. The carrier's klaxon means bombers are coming for it. On
 * the title, rock of our own: the 1984 game had no music to borrow. */
"use strict";
(() => {
  const A = PB.SFX = { ctx: null, muted: false, out: null, loops: {}, tune: null };
  let noiseBuf = null;

  A.unlock = () => {
    if (A.ctx) { if (A.ctx.state === "suspended") A.ctx.resume(); return; }
    try { const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext; A.ctx = new Ctx(); } catch (e) { A.ctx = null; return; }
    const a = A.ctx;
    A.out = a.createGain(); A.out.gain.value = A.muted ? 0 : 0.5; A.out.connect(a.destination);
    A.comp = a.createDynamicsCompressor(); A.comp.threshold.value = -16; A.comp.ratio.value = 4; A.comp.connect(A.out);
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  };
  A.setMuted = m => { A.muted = m; if (A.out) A.out.gain.value = m ? 0 : 0.5; if (m) { A.stopTune(); for (const k of Object.keys(A.loops)) A.loop(k, 0); } };

  function tone(f0, f1, ms, type, vol, dest, at = 0) {
    const a = A.ctx, o = a.createOscillator(), g = a.createGain(), t = a.currentTime + 0.005 + at;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + ms / 1000);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + ms / 1000);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + ms / 1000 + 0.02);
  }
  function hiss(ms, vol, freq, dest, q = 0.8, at = 0, type = "lowpass", f1 = null) {
    const a = A.ctx, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + 0.005 + at;
    s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + ms / 1000); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + ms / 1000);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + ms / 1000 + 0.02);
  }

  const SOUNDS = {
    gun: d => { hiss(55, 0.32, 3200, d, 0.7, 0, "bandpass"); tone(180, 90, 40, "square", 0.05, d); },
    eGun: d => { hiss(60, 0.22, 2200, d, 0.7, 0, "bandpass"); },
    bombDrop: d => { tone(1500, 520, 700, "sine", 0.06, d); hiss(80, 0.08, 900, d); },
    noBombs: d => tone(260, 240, 70, "square", 0.06, d),
    boom: d => { hiss(1100, 0.9, 420, d, 0.5, 0, "lowpass", 90); tone(80, 28, 700, "sine", 0.6, d); hiss(300, 0.35, 2600, d, 0.4, 0.02); },
    bigBoom: d => { hiss(2200, 1, 360, d, 0.5, 0, "lowpass", 60); tone(60, 22, 1500, "sine", 0.7, d); for (let i = 1; i < 4; i++) hiss(700, 0.4, 500, d, 0.5, i * 0.18, "lowpass", 100); },
    splash: d => { hiss(500, 0.4, 1600, d, 0.6, 0, "bandpass", 500); hiss(900, 0.15, 3000, d, 0.5, 0.1, "highpass"); },
    flak: d => { hiss(260, 0.42, 700, d, 0.7, 0, "lowpass", 160); tone(110, 50, 180, "sine", 0.22, d); },
    flakFire: d => { tone(140, 70, 60, "square", 0.04, d); },
    heavy: d => { hiss(700, 0.7, 500, d, 0.6, 0, "lowpass", 80); tone(70, 30, 500, "sine", 0.5, d); },
    shipFire: d => { tone(90, 40, 260, "sine", 0.4, d); hiss(200, 0.3, 600, d); },
    tankFire: d => { tone(220, 90, 90, "square", 0.05, d); hiss(70, 0.15, 1200, d); },
    missile: d => { hiss(700, 0.3, 900, d, 1.2, 0, "bandpass", 3000); tone(500, 1400, 500, "sawtooth", 0.03, d); },
    hit: d => { tone(1400, 700, 90, "square", 0.08, d); hiss(120, 0.35, 2500, d, 1, 0, "bandpass"); tone(240, 120, 160, "square", 0.08, d, 0.02); },
    kill: d => { hiss(600, 0.6, 900, d, 0.6, 0, "lowpass", 150); tone(300, 60, 400, "sawtooth", 0.08, d); },
    reload: d => { tone(1200, 1100, 25, "square", 0.05, d); tone(800, 760, 30, "square", 0.05, d, 0.05); },
    landed: d => { tone(140, 70, 140, "sine", 0.35, d); hiss(90, 0.2, 600, d); },
    repaired: d => { [784, 1047].forEach((f, i) => tone(f, f, 90, "square", 0.05, d, i * 0.09)); },
    radar: d => { tone(1760, 1760, 60, "sine", 0.08, d); tone(1760, 1760, 60, "sine", 0.08, d, 0.16); },
    klaxon: d => { for (let i = 0; i < 3; i++) { tone(520, 520, 220, "sawtooth", 0.06, d, i * 0.5); tone(390, 390, 220, "sawtooth", 0.06, d, i * 0.5 + 0.25); } },
    warn: d => { for (let i = 0; i < 3; i++) tone(1300, 1300, 70, "square", 0.06, d, i * 0.14); },
    factory: d => { SOUNDS.bigBoom(d); [523, 659, 784].forEach((f, i) => tone(f, f, 140, "square", 0.05, d, 0.6 + i * 0.12)); },
    shipWarn: d => { tone(220, 220, 400, "triangle", 0.12, d); tone(165, 165, 600, "triangle", 0.12, d, 0.45); },
    won: d => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, f, i === 6 ? 500 : 140, "square", 0.07, d, i * 0.13)); },
    over: d => { [392, 349, 330, 262].forEach((f, i) => tone(f, f, 260, "square", 0.07, d, i * 0.24)); },
    newHeli: d => { [392, 523].forEach((f, i) => tone(f, f, 120, "square", 0.05, d, i * 0.1)); },
    menu: d => tone(900, 900, 18, "square", 0.04, d),
  };

  /* name; dist in pixels from the helicopter (null: no fade) */
  A.play = (name, dist = null) => {
    if (A.muted || !A.ctx || !SOUNDS[name]) return;
    let vol = 1;
    if (dist != null) { vol = Math.max(0, 1 - dist / 620); if (vol < 0.04) return; vol *= vol; }
    const g = A.ctx.createGain(); g.gain.value = vol; g.connect(A.comp);
    SOUNDS[name](g);
    setTimeout(() => g.disconnect(), 3500);
  };

  /* what keeps sounding: the rotor and the jets; level 0 is silence */
  A.loop = (name, level, pitch = 1) => {
    if (!A.ctx) return;
    let L = A.loops[name];
    if (!L) {
      if (level <= 0 || A.muted) return;
      const a = A.ctx, g = a.createGain();
      g.gain.value = 0; g.connect(A.comp);
      if (name === "rotor") {
        /* the blades: noise, thumped by a low oscillator */
        const s = a.createBufferSource(), f = a.createBiquadFilter(), am = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
        s.buffer = noiseBuf; s.loop = true; f.type = "lowpass"; f.frequency.value = 340; f.Q.value = 0.9;
        am.gain.value = 0.5; lfo.type = "square"; lfo.frequency.value = 13; lg.gain.value = 0.48; lfo.connect(lg); lg.connect(am.gain);
        const hum = a.createOscillator(), hg = a.createGain(); hum.type = "triangle"; hum.frequency.value = 62; hg.gain.value = 0.12; hum.connect(hg); hg.connect(g);
        s.connect(f); f.connect(am); am.connect(g); s.start(); lfo.start(); hum.start();
        L = { g, set: p => { lfo.frequency.setTargetAtTime(9 + p * 5, a.currentTime, 0.2); f.frequency.setTargetAtTime(240 + p * 160, a.currentTime, 0.2); }, stop: () => { s.stop(); lfo.stop(); hum.stop(); } };
      } else {
        /* a jet: a roar and a whine */
        const s = a.createBufferSource(), f = a.createBiquadFilter(), o = a.createOscillator(), og = a.createGain();
        s.buffer = noiseBuf; s.loop = true; f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 0.6;
        o.type = "sawtooth"; o.frequency.value = 2200; og.gain.value = 0.04;
        s.connect(f); f.connect(g); o.connect(og); og.connect(g); s.start(); o.start();
        L = { g, set: p => { o.frequency.setTargetAtTime(1800 + p * 900, a.currentTime, 0.1); f.frequency.setTargetAtTime(900 + p * 1200, a.currentTime, 0.1); }, stop: () => { s.stop(); o.stop(); } };
      }
      A.loops[name] = L;
    }
    L.set(pitch);
    const v = A.muted ? 0 : Math.max(0, Math.min(1, level)) * (name === "rotor" ? 0.42 : 0.2);
    L.g.gain.setTargetAtTime(v, A.ctx.currentTime, 0.12);
  };
  A.stopLoops = () => { for (const [k, L] of Object.entries(A.loops)) { try { L.stop(); } catch (e) { /* already */ } delete A.loops[k]; } };

  /* ---- the title theme: ours, and loud. E minor at 152: a distorted rhythm
   * guitar chugging power chords, a lead with an echo, bass under the roots,
   * a rock kit. Lengths are sixteenths; "m" is palm-muted. ---- */
  const NOTE = n => { const m = /^([A-G])(b|#)?(\d)$/.exec(n); const k = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0); return 440 * Math.pow(2, (k + (+m[3] + 1) * 12 - 69) / 12); };
  const parse = s => s.split(/\s+/).filter(x => x && x !== "|").map(t => { const [n, l] = t.split(":"); return [n === "r" ? 0 : NOTE(n), parseInt(l, 10), /m$/.test(l)]; });
  const GALLOP = "E3:1m E3:1m E3:2m E3:1m E3:1m E3:2m";
  const R1 = `${GALLOP} G3:2 E3:1m E3:1m A3:2 E3:1m E3:1m`, R2 = `${GALLOP} Bb3:2 A3:2 G3:2 F#3:2`, R4 = `${GALLOP} C3:4 D3:4`;
  const CH = r => `${r}:3 ${r}:1m ${r}:2m ${r}:2 ${r}:2m ${r}:2m ${r}:2 ${r}:2m`;
  const PUSH = "C3:2 C3:1m C3:1m C3:2 C3:2m D3:2 D3:1m D3:1m D3:2 D3:2m";
  const GTR = parse(`${R1} | ${R2} | ${R1} | ${R4} | ${R1} | ${R2} | ${R1} | ${R4} |
    ${CH("E3")} | ${CH("C3")} | ${CH("G3")} | ${CH("D3")} |
    ${PUSH} | E3:6 E3:1m E3:1m E3:2m E3:2m E3:2 E3:2m | ${PUSH} | B2:2 B2:2 B2:2 B2:2 B2:1m B2:1m B2:1m B2:1m B2:1m B2:1m B2:1m B2:1m`);
  const LEAD = parse(`r:64 |
    E4:2 G4:2 A4:2 B4:6 A4:2 G4:2 | A4:2 B4:2 D5:2 E5:2 F5:2 E5:2 D5:2 B4:2 | E4:2 G4:2 A4:2 B4:4 D5:2 E5:4 | D5:2 B4:2 A4:2 G4:2 A4:8 |
    B4:4 E5:4 G5:6 F#5:2 | E5:4 D5:2 E5:2 G5:4 E5:4 | D5:4 B4:4 D5:2 G5:2 F#5:2 G5:2 | A5:8 F#5:4 D5:4 |
    E5:2 G5:2 A5:4 A5:2 B5:2 A5:2 F#5:2 | G5:8 E5:8 | E5:2 G5:2 A5:4 B5:2 D6:2 B5:2 A5:2 | B5:4 A5:2 G5:2 F#5:4 D#5:4`);
  /* the kit, a bar at a time: kick, snare, hat */
  const KIT = {
    riff: ["x.x...x.x.x...x.", "....x.......x...", "x.x.x.x.x.x.x.x."],
    chorus: ["x.....xxx.....x.", "....x.......x...", "xxxxxxxxxxxxxxxx"],
    push: ["x.x.x...x.x.x...", "....x.......x...", "x.x.x.x.x.x.x.x."],
    half: ["x.....x.x.......", "........x.......", "x...x...x...x..."],
    fill: ["x...x...x...x...", "....x.x.xxxxxxxx", "x.x.x.x........."],
  };
  const BARS = ["riff", "riff", "riff", "riff", "riff", "riff", "riff", "riff", "chorus", "chorus", "chorus", "chorus", "push", "half", "push", "fill"];
  const CRASH = [0, 4, 8, 10, 12];
  const STEP = 60 / 152 / 4, N = BARS.length * 16;
  /* the song as events per sixteenth */
  const EV = Array.from({ length: N }, () => []);
  for (const [track, k] of [[GTR, "g"], [LEAD, "l"]]) { let t = 0; for (const [f, l, m] of track) { if (f) EV[t].push([k, f, l, m]); t += l; } }
  BARS.forEach((p, b) => {
    for (let i = 0; i < 16; i++) "ksh".split("").forEach((d, j) => {
      if (KIT[p][j][i] === "x") EV[b * 16 + i].push([d, d === "h" ? (i % 2 ? 0.55 : 1) : p === "fill" && d === "s" ? 0.45 + i / 22 : 1]);
    });
    if (CRASH.includes(b)) EV[b * 16].push(["c", 1]);
  });

  A.startTune = () => {
    if (A.muted || !A.ctx || A.tune) return;
    const a = A.ctx, g = a.createGain();
    g.gain.value = 0.5; g.connect(A.comp);
    /* an amp: whatever goes in is clipped hard, then cut like a speaker cabinet */
    const amp = (k, cut, out) => {
      const inp = a.createGain(), ws = a.createWaveShaper(), hp = a.createBiquadFilter(), lp = a.createBiquadFilter(), o = a.createGain();
      const c = new Float32Array(1024);
      for (let i = 0; i < c.length; i++) c[i] = Math.tanh(k * (i / 511.5 - 1)) / Math.tanh(k);
      ws.curve = c; ws.oversample = "4x";
      hp.type = "highpass"; hp.frequency.value = 90; lp.type = "lowpass"; lp.frequency.value = cut; lp.Q.value = 0.9; o.gain.value = out;
      inp.connect(ws); ws.connect(hp); hp.connect(lp); lp.connect(o); o.connect(g);
      return { inp, o };
    };
    const gtr = amp(18, 3400, 0.15), lead = amp(9, 2900, 0.13);
    /* the lead's echo, a dotted eighth behind */
    const dl = a.createDelay(1), fb = a.createGain(), wet = a.createGain();
    dl.delayTime.value = STEP * 3; fb.gain.value = 0.32; wet.gain.value = 0.3;
    lead.o.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(g);
    const bass = a.createBiquadFilter(); bass.type = "lowpass"; bass.frequency.value = 620; bass.connect(g);

    /* a power chord: root, fifth and octave, two detuned saws each; the bass doubles the root */
    const chord = (f, at, dur, m) => {
      const end = at + (m ? Math.min(dur, STEP * 1.1) : dur * 0.92), v = m ? 0.22 : 0.26;
      const lp = a.createBiquadFilter(), e = a.createGain();
      lp.type = "lowpass"; lp.frequency.value = m ? 900 : 4200;
      e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(v, at + 0.004);
      if (m) e.gain.exponentialRampToValueAtTime(0.02, end); else e.gain.setValueAtTime(v, end - 0.03);
      e.gain.linearRampToValueAtTime(0, end + 0.01);
      lp.connect(e); e.connect(gtr.inp);
      for (const r of [1, 1.5, 2]) for (const d of [-8, 8]) {
        const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = f * r; o.detune.value = d;
        o.connect(lp); o.start(at); o.stop(end + 0.02);
      }
      const b = a.createOscillator(), be = a.createGain();
      b.type = "sawtooth"; b.frequency.value = f / 2 < 60 ? f : f / 2;
      be.gain.setValueAtTime(0, at); be.gain.linearRampToValueAtTime(0.3, at + 0.005); be.gain.setValueAtTime(0.3, end - 0.02); be.gain.linearRampToValueAtTime(0, end);
      b.connect(be); be.connect(bass); b.start(at); b.stop(end + 0.01);
    };
    /* a lead note: scooped up into pitch, vibrato on the long ones */
    const solo = (f, at, dur) => {
      const o = a.createOscillator(), e = a.createGain(), end = at + dur - 0.01;
      o.type = "sawtooth"; o.frequency.setValueAtTime(f * 0.97, at); o.frequency.exponentialRampToValueAtTime(f, at + 0.03);
      if (dur > STEP * 3) {
        const lfo = a.createOscillator(), lg = a.createGain();
        lfo.frequency.value = 5.6; lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(f * 0.012, at + Math.min(0.4, dur * 0.6));
        lfo.connect(lg); lg.connect(o.frequency); lfo.start(at); lfo.stop(end);
      }
      e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(0.5, at + 0.008); e.gain.setValueAtTime(0.5, end - 0.03); e.gain.linearRampToValueAtTime(0, end);
      o.connect(e); e.connect(lead.inp); o.start(at); o.stop(end + 0.01);
    };
    const noise = (at, type, freq, vol, dec, q = 0.7) => {
      const s = a.createBufferSource(), f = a.createBiquadFilter(), e = a.createGain();
      s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
      e.gain.setValueAtTime(vol, at); e.gain.exponentialRampToValueAtTime(0.001, at + dec);
      s.connect(f); f.connect(e); e.connect(g); s.start(at, Math.random() * 0.5); s.stop(at + dec + 0.02);
    };
    const thump = (at, f0, f1, vol, dec, type = "sine") => {
      const o = a.createOscillator(), e = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dec * 0.5);
      e.gain.setValueAtTime(vol, at); e.gain.exponentialRampToValueAtTime(0.001, at + dec);
      o.connect(e); e.connect(g); o.start(at); o.stop(at + dec + 0.02);
    };
    const DRUM = {
      k: (at, v) => { thump(at, 150, 45, 0.9 * v, 0.28); noise(at, "highpass", 3000, 0.08 * v, 0.015); },
      s: (at, v) => { noise(at, "bandpass", 1800, 0.5 * v, 0.17, 0.6); thump(at, 200, 150, 0.25 * v, 0.09, "triangle"); },
      h: (at, v) => noise(at, "highpass", 7500, 0.09 * v, 0.035),
      c: at => noise(at, "highpass", 4800, 0.22, 1.3, 0.5),
    };

    const st = { g, fb, t0: a.currentTime + 0.1, n: 0, timer: null };
    const sched = () => {
      /* a throttled background tab must not come back to a pile of overdue notes */
      const late = a.currentTime + 0.02 - st.t0;
      if (st.n * STEP < late) st.n = Math.ceil(late / STEP);
      for (let at; (at = st.t0 + st.n * STEP) < a.currentTime + 1.5; st.n++) {
        for (const [k, x, l, m] of EV[st.n % N]) {
          if (k === "g") chord(x, at, l * STEP, m);
          else if (k === "l") solo(x, at, l * STEP);
          else DRUM[k](at, x);
        }
      }
    };
    sched();
    st.timer = setInterval(sched, 250);
    A.tune = st;
  };
  A.stopTune = () => {
    if (!A.tune) return;
    clearInterval(A.tune.timer);
    const { g, fb } = A.tune;
    g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.15);
    setTimeout(() => { g.disconnect(); fb.disconnect(); }, 1800);
    A.tune = null;
  };
})();
