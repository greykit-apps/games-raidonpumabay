/* Raid on Puma Bay -- everything that turns, as shapes for K.drawSprite:
 * the puma's helicopter, the Wolf Empire's jets, bombers, tanks, guns,
 * radar dishes and ships, and the carrier. Each is drawn nose up, in pixels
 * from its middle; later shapes lie on top of earlier ones. z orders the
 * lit and shaded edges (an edge is lit where it stands above what is next
 * to it), round shades a shape as a dome, clip keeps a marking on the shape
 * it is painted on. */
"use strict";
(() => {
  const SPR = PB.SPR = {};
  const E = PB.Engine;

  /* ---- the helicopter: steel blue, a tawny stripe, a puma at the controls ---- */
  SPR.heli = { size: 44, parts: [
    { k: "cap", x0: -6, y0: -5.5, x1: -6, y1: 4.5, r: 0.6, m: "heliDk", z: 0 },
    { k: "cap", x0: 6, y0: -5.5, x1: 6, y1: 4.5, r: 0.6, m: "heliDk", z: 0 },
    { k: "cap", x0: 0, y0: 3, x1: 0, y1: 18, r: 1.8, m: "heli", round: 0.8, z: 1 },
    { k: "rect", x: -4.8, y: 13.6, w: 9.6, h: 1.8, m: "heli", z: 1.5 },
    { k: "cap", x0: 0, y0: 15, x1: 0, y1: 19.6, r: 1.2, m: "tawny", round: 0.6, z: 2 },
    { k: "ell", x: 0, y: -1, rx: 5.5, ry: 8.6, m: "heli", round: 1, z: 2 },
    { k: "ell", x: 0, y: 3, rx: 6, ry: 0.9, m: "tawny", z: 3, clip: 7 },
    { k: "ell", x: 0, y: 2.2, rx: 3.2, ry: 4.2, m: "heliDk", round: 1, z: 3 },
    { k: "ell", x: 0, y: -6.3, rx: 3.9, ry: 3.7, m: "glass", round: 1, z: 3 },
    { k: "ell", x: 0, y: -5.6, rx: 1.75, ry: 1.6, m: "puma", round: 1, z: 4 },
    { k: "ell", x: -1.5, y: -7, rx: 0.7, ry: 0.8, m: "puma", dk: 1, z: 4 },
    { k: "ell", x: 1.5, y: -7, rx: 0.7, ry: 0.8, m: "puma", dk: 1, z: 4 },
    { k: "ell", x: 0, y: 2.2, rx: 1.2, ry: 1.2, m: "heliDk", dk: 2, z: 5 },
  ] };
  /* a spare on the deck, rotors folded: the same, smaller */
  SPR.spare = { size: 30, parts: [
    { k: "cap", x0: 0, y0: 2, x1: 0, y1: 12, r: 1.3, m: "heli", round: 0.8, z: 1 },
    { k: "ell", x: 0, y: -0.5, rx: 3.9, ry: 6, m: "heli", round: 1, z: 2 },
    { k: "ell", x: 0, y: 2, rx: 4.2, ry: 0.7, m: "tawny", z: 3, clip: 1 },
    { k: "ell", x: 0, y: -4.2, rx: 2.7, ry: 2.6, m: "glass", round: 1, z: 3 },
    { k: "cap", x0: -0.9, y0: 0, x1: -1.4, y1: 12.5, r: 0.5, m: "heliDk", z: 4 },
    { k: "cap", x0: 0.9, y0: 0, x1: 1.4, y1: 12.5, r: 0.5, m: "heliDk", z: 4 },
  ] };

  /* ---- the Wolf Empire's fighter: gunmetal and red ---- */
  SPR.fighter = { size: 32, parts: [
    { k: "poly", pts: [[-1.8, -3], [-11.5, 5.5], [-11.5, 7.6], [-2, 5.2], [2, 5.2], [11.5, 7.6], [11.5, 5.5], [1.8, -3]], m: "wolf", z: 1 },
    { k: "poly", pts: [[-1.5, 7], [-5.8, 11], [-5.8, 12.4], [0, 10.6], [5.8, 12.4], [5.8, 11], [1.5, 7]], m: "wolf", z: 1 },
    { k: "ell", x: -6.6, y: 3.9, rx: 1.4, ry: 1.4, m: "wolfRed", z: 1.5, clip: 0 },
    { k: "ell", x: 6.6, y: 3.9, rx: 1.4, ry: 1.4, m: "wolfRed", z: 1.5, clip: 0 },
    { k: "rect", x: -11.6, y: 5, w: 1.8, h: 3, m: "wolfRed", z: 1.5, clip: 0 },
    { k: "rect", x: 9.8, y: 5, w: 1.8, h: 3, m: "wolfRed", z: 1.5, clip: 0 },
    { k: "cap", x0: 0, y0: -12, x1: 0, y1: 10, r: 2.3, m: "wolf", round: 0.9, z: 2 },
    { k: "ell", x: 0, y: -11.4, rx: 1.5, ry: 1.7, m: "wolfRed", round: 1, z: 3 },
    { k: "ell", x: 0, y: -5.6, rx: 1.3, ry: 2.7, m: "redGlass", round: 1, z: 3 },
    { k: "ell", x: 0, y: 10.8, rx: 1.4, ry: 1, m: "wolfDk", dk: 1, z: 3 },
  ] };

  /* ---- the bomber: two engines, a long glass nose, a tail gunner ---- */
  SPR.bomber = { size: 58, parts: [
    { k: "poly", pts: [[-3, -6], [-25, -1.5], [-25, 2.5], [-3, 3], [3, 3], [25, 2.5], [25, -1.5], [3, -6]], m: "wolf", z: 1 },
    { k: "poly", pts: [[-2, 13], [-9.5, 17], [-9.5, 19.4], [0, 18.2], [9.5, 19.4], [9.5, 17], [2, 13]], m: "wolf", z: 1 },
    { k: "ell", x: -16.5, y: 0.4, rx: 2, ry: 2, m: "wolfRed", z: 1.5, clip: 0 },
    { k: "ell", x: 16.5, y: 0.4, rx: 2, ry: 2, m: "wolfRed", z: 1.5, clip: 0 },
    { k: "ell", x: -10, y: -4.5, rx: 2.4, ry: 5.2, m: "wolfDk", round: 1, z: 2 },
    { k: "ell", x: 10, y: -4.5, rx: 2.4, ry: 5.2, m: "wolfDk", round: 1, z: 2 },
    { k: "cap", x0: 0, y0: -19, x1: 0, y1: 18, r: 3.7, m: "wolf", round: 0.9, z: 3 },
    { k: "ell", x: 0, y: 7, rx: 4, ry: 1.1, m: "wolfRed", z: 4, clip: 6 },
    { k: "ell", x: 0, y: -16.2, rx: 2.4, ry: 3, m: "redGlass", round: 1, z: 4 },
    { k: "ell", x: 0, y: 19, rx: 1.4, ry: 1.3, m: "redGlass", round: 1, z: 4 },
  ] };

  /* ---- a tank: hull and turret drawn apart, so the turret can turn ---- */
  SPR.tank = { size: 20, parts: [
    { k: "rect", x: -5.3, y: -6.8, w: 2.4, h: 13.6, m: "tread", z: 1 },
    { k: "rect", x: 2.9, y: -6.8, w: 2.4, h: 13.6, m: "tread", z: 1 },
    ...[-5.5, -3, -0.5, 2, 4.5].flatMap(y => [{ k: "rect", x: -5.3, y, w: 2.4, h: 1, m: "tread", z: 1.1, flat: 4 }, { k: "rect", x: 2.9, y, w: 2.4, h: 1, m: "tread", z: 1.1, flat: 4 }]),
    { k: "rect", x: -3.3, y: -5.8, w: 6.6, h: 11.6, m: "olive", z: 2 },
    { k: "rect", x: -3.3, y: -6.4, w: 6.6, h: 1.2, m: "olive", dk: 1, z: 2 },
  ] };
  SPR.turret = { size: 22, outline: true, parts: [
    { k: "cap", x0: 0, y0: -1, x1: 0, y1: -9, r: 0.9, m: "olive", dk: 1, z: 1 },
    { k: "ell", x: 0, y: 0.6, rx: 3.1, ry: 3.3, m: "olive", round: 1, z: 2 },
    { k: "ell", x: 0.8, y: 1.3, rx: 0.9, ry: 0.9, m: "olive", dk: 2, z: 3 },
  ] };

  /* ---- the flak gun's twin barrels, the radar's dish ---- */
  SPR.flak = { size: 24, parts: [
    { k: "cap", x0: -1.3, y0: -1, x1: -1.3, y1: -10, r: 0.75, m: "wolfDk", z: 1 },
    { k: "cap", x0: 1.3, y0: -1, x1: 1.3, y1: -10, r: 0.75, m: "wolfDk", z: 1 },
    { k: "ell", x: 0, y: 0.5, rx: 3.7, ry: 3.5, m: "wolf", round: 1, z: 2 },
    { k: "rect", x: -3.7, y: 2, w: 7.4, h: 1, m: "wolfRed", z: 3, clip: 2 },
  ] };
  SPR.dish = { size: 26, parts: [
    { k: "cap", x0: 0, y0: 0, x1: 0, y1: -5.5, r: 0.6, m: "white", dk: 1, z: 1 },
    { k: "cap", x0: -8.5, y0: 0.6, x1: 8.5, y1: 0.6, r: 2.4, m: "white", round: 0.8, z: 2 },
    { k: "ell", x: 0, y: 1.6, rx: 1.6, ry: 1.6, m: "steel", round: 1, z: 3 },
  ] };

  /* ---- ships ---- */
  SPR.cargo = { size: 50, parts: [
    { k: "poly", pts: [[0, -21], [4.5, -14], [5.6, -6], [5.6, 15], [4.2, 19.5], [-4.2, 19.5], [-5.6, 15], [-5.6, -6], [-4.5, -14]], m: "hullRed", z: 1 },
    { k: "poly", pts: [[0, -19], [3.5, -13.4], [4.4, -6], [4.4, 14.6], [3.2, 18], [-3.2, 18], [-4.4, 14.6], [-4.4, -6], [-3.5, -13.4]], m: "steel", z: 2, flat: 2 },
    { k: "rect", x: -3.7, y: -12, w: 3.5, h: 5.4, m: "cont1", z: 3 },
    { k: "rect", x: 0.2, y: -12, w: 3.5, h: 5.4, m: "cont2", z: 3 },
    { k: "rect", x: -3.7, y: -6, w: 3.5, h: 5.4, m: "cont3", z: 3 },
    { k: "rect", x: 0.2, y: -6, w: 3.5, h: 5.4, m: "cont1", z: 3 },
    { k: "rect", x: -3.7, y: 0, w: 3.5, h: 5.4, m: "cont2", z: 3 },
    { k: "rect", x: 0.2, y: 0, w: 3.5, h: 5.4, m: "cont3", z: 3 },
    { k: "rect", x: -4, y: 8.8, w: 8, h: 5.2, m: "white", z: 3 },
    { k: "ell", x: 0, y: 15.4, rx: 1.6, ry: 1.6, m: "black", round: 1, z: 4 },
  ] };
  SPR.gunboat = { size: 34, parts: [
    { k: "poly", pts: [[0, -15], [3.6, -8.5], [3.9, 10], [2.7, 13.4], [-2.7, 13.4], [-3.9, 10], [-3.6, -8.5]], m: "hull", z: 1 },
    { k: "rect", x: -4, y: -9.6, w: 8, h: 1.1, m: "wolfRed", z: 1.5, clip: 0 },
    { k: "poly", pts: [[0, -13.4], [2.7, -8], [2.9, 9.8], [1.9, 12.2], [-1.9, 12.2], [-2.9, 9.8], [-2.7, -8]], m: "deck", z: 2, flat: 2 },
    { k: "rect", x: -2.4, y: -0.5, w: 4.8, h: 6.4, m: "white", z: 3 },
    { k: "cap", x0: 0, y0: -6, x1: 0, y1: -11.5, r: 0.55, m: "wolfDk", z: 3 },
    { k: "ell", x: 0, y: -5.6, rx: 1.9, ry: 1.9, m: "wolfDk", round: 1, z: 4 },
    { k: "ell", x: 0, y: 8.5, rx: 1.4, ry: 1.4, m: "wolfDk", round: 1, z: 4 },
  ] };

  /* ---- the battleship, in four stages: keel, hull, superstructure, guns ---- */
  const HULL = [[0, -60], [8, -48], [13.5, -30], [14.5, 0], [14, 30], [12, 46], [7, 55], [-7, 55], [-12, 46], [-14, 30], [-14.5, 0], [-13.5, -30], [-8, -48]];
  const inset = (pts, k) => pts.map(([x, y]) => [x * k, y * (k + (1 - k) * 0.6)]);
  const shipParts = stage => {
    const p = [];
    if (stage === 1) {
      p.push({ k: "cap", x0: 0, y0: -54, x1: 0, y1: 52, r: 1.8, m: "steel", round: 0.6, z: 1 });
      for (let y = -44; y <= 46; y += 7) { const w = 13 - Math.max(0, Math.abs(y) - 22) * 0.16; p.push({ k: "rect", x: -w, y, w: w * 2, h: 1.4, m: "steel", z: 0.5 }); }
      return p;
    }
    p.push({ k: "poly", pts: HULL, m: "hull", z: 1 });
    p.push({ k: "poly", pts: inset(HULL, 0.84), m: stage >= 3 ? "teak" : "deck", z: 2, flat: 2 });
    for (let x = -10; x <= 10; x += 2.5) p.push({ k: "rect", x, y: -48, w: 0.5, h: 98, m: stage >= 3 ? "teak" : "deck", z: 2.1, flat: 3, clip: 1 });
    if (stage >= 3) {
      /* the superstructure: a stepped block, the bridge, two funnels, secondary guns */
      p.push({ k: "rect", x: -8.5, y: -14, w: 17, h: 30, m: "wolf", z: 3 });
      p.push({ k: "rect", x: -6, y: -11, w: 12, h: 9, m: "wolf", z: 4, dk: -1 });
      p.push({ k: "rect", x: -3.5, y: -12, w: 7, h: 2.2, m: "glass", z: 4.5, flat: 2 });
      p.push({ k: "ell", x: 0, y: 2, rx: 3.4, ry: 3.4, m: "black", round: 1, z: 5 });
      p.push({ k: "ell", x: 0, y: 10, rx: 3, ry: 3, m: "black", round: 1, z: 5 });
      p.push({ k: "rect", x: -3.4, y: 0.6, w: 6.8, h: 1, m: "wolfRed", z: 5.5, clip: p.length - 2 });
      for (const [x, y] of [[-10.5, -8], [10.5, -8], [-10.5, 4], [10.5, 4], [-10.5, 15], [10.5, 15]]) {
        p.push({ k: "cap", x0: x, y0: y, x1: x + Math.sign(x) * 4, y1: y - 1, r: 0.5, m: "wolfDk", z: 3.5 });
        p.push({ k: "ell", x, y, rx: 1.9, ry: 1.9, m: "wolfDk", round: 1, z: 4 });
      }
    }
    if (stage >= 4) {
      const turret = (y, dir, r) => {
        for (const x of [-2, 0, 2]) p.push({ k: "cap", x0: x, y0: y, x1: x, y1: y + dir * (r + 11), r: 0.75, m: "wolfDk", z: 5 });
        p.push({ k: "ell", x: 0, y, rx: r, ry: r * 1.1, m: "wolf", round: 1, z: 6 });
        p.push({ k: "rect", x: -r, y: y + dir * 1.5 - 0.6, w: r * 2, h: 1.2, m: "wolfRed", z: 6.5, clip: p.length - 1 });
      };
      turret(-36, -1, 6); turret(-23, -1, 5.5); turret(33, 1, 6);
    }
    return p;
  };
  for (let s = 1; s <= 4; s++) SPR["ship" + s] = { size: 136, parts: shipParts(s) };
  SPR.wreck = { size: 136, parts: [
    { k: "poly", pts: HULL.map(([x, y]) => [x * 0.9, y]), m: "black", z: 1, dk: 1 },
    { k: "poly", pts: inset(HULL, 0.7), m: "hull", z: 2, dk: 2 },
  ] };

  /* ---- the carrier: an angled deck, the island to starboard, a paw on the spot ---- */
  const spot = E.DECK_SPOT, sx = spot.u, sy = -spot.w;
  const carrierParts = [
    { k: "poly", pts: [[0, -80], [10, -70], [16, -50], [17, 40], [15, 74], [-15, 74], [-17, 40], [-16, -50], [-10, -70]], m: "hull", z: 1 },
    { k: "poly", pts: [[-4, -78], [6, -77], [14, -66], [19.5, -50], [21, 40], [21, 73], [-19, 73], [-19, 12], [-23, -8], [-23, -30], [-19, -36], [-17, -60], [-12, -72]], m: "deck", z: 2, flat: 2 },
    { k: "rect", x: -16, y: -4, w: 9, h: 9, m: "deck", z: 2.2, flat: 3, clip: 1 },
    { k: "rect", x: 6, y: 44, w: 9, h: 9, m: "deck", z: 2.2, flat: 3, clip: 1 },
  ];
  /* the centre line, dashed, and the angled deck's edge */
  for (let y = -66; y <= 66; y += 9) carrierParts.push({ k: "rect", x: 1, y, w: 1.3, h: 4.5, m: "white", z: 3, flat: 1 });
  for (let i = 0; i < 9; i++) carrierParts.push({ k: "rect", x: -20 + i * 1.6, y: -30 + i * 6.4, w: 1.2, h: 3.4, m: "yellow", z: 3, flat: 1 });
  carrierParts.push({ k: "rect", x: -19.4, y: 10, w: 0.9, h: 62, m: "white", z: 3, flat: 2 });
  carrierParts.push({ k: "rect", x: 19.6, y: -48, w: 0.9, h: 120, m: "white", z: 3, flat: 2 });
  /* the landing spot: a ring and a paw */
  carrierParts.push({ k: "ring", x: sx, y: sy, r: 8, t: 1.3, m: "yellow", z: 3, flat: 1 });
  carrierParts.push({ k: "ell", x: sx, y: sy + 1.6, rx: 2.4, ry: 2, m: "yellow", z: 3, flat: 1 });
  for (const [dx, dy] of [[-3.1, -1.2], [-1.1, -2.9], [1.1, -2.9], [3.1, -1.2]]) carrierParts.push({ k: "ell", x: sx + dx, y: sy + dy, rx: 0.95, ry: 1.05, m: "yellow", z: 3, flat: 1 });
  /* the island */
  carrierParts.push({ k: "rect", x: 13, y: -16, w: 6.5, h: 28, m: "steel", z: 4 });
  carrierParts.push({ k: "rect", x: 14, y: -11, w: 4.5, h: 5, m: "glass", z: 4.5, flat: 2 });
  carrierParts.push({ k: "ell", x: 16.2, y: 4, rx: 2.2, ry: 3.2, m: "black", round: 1, z: 5 });
  carrierParts.push({ k: "cap", x0: 13, y0: -3, x1: 19.6, y1: -3, r: 0.6, m: "white", z: 5 });
  carrierParts.push({ k: "ell", x: 16.2, y: -3, rx: 1.3, ry: 1.3, m: "white", round: 1, z: 6 });
  SPR.carrier = { size: 176, parts: carrierParts };
})();
