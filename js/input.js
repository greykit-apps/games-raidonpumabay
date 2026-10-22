/* Raid on Puma Bay -- keys and pads, turned into the engine's command for
 * the next step.
 *
 * Classic steering is 1984's: left and right turn the helicopter, up flies
 * it forward, down brakes and backs it off, and it is the default. Modern
 * steering (chosen in Settings) flies it the way the stick points: the
 * engine turns it to face that way and goes. Either way Space is the gun
 * and B drops a bomb; hold B to drop a stick of them. */
"use strict";
(() => {
  /* touch: what the on-screen pad holds (main.js setupTouch), read as the keys and the pad are */
  const I = PB.Input = { held: new Set(), pressed: new Set(), pad: new Set(), touch: new Set(), padPrev: new Set(), stick: null, bombHeld: 0, device: "keys" };
  const BIND = {
    ArrowUp: "up", KeyW: "up", Numpad8: "up", ArrowDown: "down", KeyS: "down", Numpad2: "down", Numpad5: "down",
    ArrowLeft: "left", KeyA: "left", Numpad4: "left", ArrowRight: "right", KeyD: "right", Numpad6: "right",
    Numpad7: "upleft", Numpad9: "upright", Numpad1: "downleft", Numpad3: "downright",
    Space: "fire", KeyJ: "fire", Numpad0: "fire",
    KeyB: "bomb", KeyX: "bomb", KeyK: "bomb", NumpadEnter: "bomb", NumpadDecimal: "bomb",
    ShiftLeft: "brake", ShiftRight: "brake",
    Tab: "map", Escape: "pause", KeyP: "pause", KeyL: "aids",
  };
  I.BIND = BIND;
  I.actionFor = code => BIND[code] || null;

  I.down = ev => {
    const a = BIND[ev.code];
    if (!a) return false;
    I.device = "keys";
    if (!ev.repeat) I.pressed.add(a);
    I.held.add(a);
    return true;
  };
  I.up = ev => { const a = BIND[ev.code]; if (a) I.held.delete(a); };
  I.clear = () => { I.held.clear(); I.pad.clear(); I.touch.clear(); I.pressed.clear(); I.stick = null; I.bombHeld = 0; };
  const on = a => I.held.has(a) || I.pad.has(a) || I.touch.has(a);

  /* the command for one step */
  I.cmd = () => {
    let mx = 0, my = 0;
    if (on("left") || on("upleft") || on("downleft")) mx -= 1;
    if (on("right") || on("upright") || on("downright")) mx += 1;
    if (on("up") || on("upleft") || on("upright")) my -= 1;
    if (on("down") || on("downleft") || on("downright")) my += 1;
    const c = { turn: 0, thrust: 0, steer: null, fire: on("fire"), bomb: false };
    if (PB.modern()) {
      let x = Math.sign(mx), y = Math.sign(my);
      if (I.stick) { x = I.stick.x; y = I.stick.y; }
      if (x || y) { c.steer = PB.normAng(Math.atan2(x, -y)); c.thrust = 1; }
      if (on("brake")) { c.thrust = -1; c.steer = null; }
    } else {
      if (I.stick) { mx = Math.abs(I.stick.x) > 0.35 ? Math.sign(I.stick.x) : 0; my = Math.abs(I.stick.y) > 0.35 ? Math.sign(I.stick.y) : 0; }
      c.turn = Math.sign(mx);
      c.thrust = my < 0 ? 1 : my > 0 || on("brake") ? -1 : 0;
    }
    /* a bomb on the press; held, a stick of them */
    if (I.pressed.has("bomb")) { c.bomb = true; I.bombHeld = 0; }
    else if (on("bomb")) { I.bombHeld++; if (I.bombHeld > 18 && I.bombHeld % 12 === 0) c.bomb = true; }
    else I.bombHeld = 0;
    return c;
  };
  I.endTick = () => I.pressed.clear();

  /* ---- gamepads ---- */
  I.pollPad = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set();
    let sx = 0, sy = 0;
    for (const p of pads) {
      if (!p) continue;
      const b = i => p.buttons[i] && p.buttons[i].pressed;
      sx = p.axes[0] || 0; sy = p.axes[1] || 0;
      if (b(14)) now.add("left"); if (b(15)) now.add("right"); if (b(12)) now.add("up"); if (b(13)) now.add("down");
      if (b(0) || b(7)) now.add("fire");
      if (b(1) || b(2) || b(6)) now.add("bomb");
      if (b(4) || b(5)) now.add("brake");
      if (b(8)) now.add("map");
      if (b(9)) now.add("pause");
    }
    I.stick = Math.hypot(sx, sy) > 0.35 ? { x: sx, y: sy } : null;
    const fresh = [...now].filter(a => !I.padPrev.has(a));
    for (const a of fresh) { I.device = "pad"; I.pressed.add(a); }
    if (I.stick) I.device = "pad";
    I.padPrev = now;
    I.pad = now;
    return fresh;
  };
})();
