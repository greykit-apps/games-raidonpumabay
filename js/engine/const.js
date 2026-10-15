/* Raid on Puma Bay -- the numbers. Every speed is in pixels a step and every
 * time in steps; the game runs fifty steps a second (or forty, or sixty:
 * Settings), so a slower clock changes nothing but time.
 *
 * UNCERTAIN: the 1984 manual gives no numbers. These are ours, tuned so a
 * round on Normal takes ten minutes or so and the battleship is a real
 * threat by the end of it. */
"use strict";
(() => {
  const C = PB.C = {};

  /* ---- the helicopter ---- */
  C.HELI = {
    accel: 0.055, reverse: 0.03, drag: 0.986, max: 2.1, maxBack: 0.7, turn: 0.072,
    /* heavy damage: a third off the top speed, and smoke */
    hurtAt: 60, hurtMax: 1.45,
    gunEvery: 5, bulletSpeed: 5.2, bulletLife: 34,
    bombs: 9, bombFall: 30, bombRadius: 17,
    /* over the deck slower than this, and it lands */
    landSpeed: 0.55, climb: 0.025,
    repairPerStep: 0.6, reloadEvery: 14,
    helis: 3, maxHelis: 5,
  };

  /* ---- the carrier, and the bay it sails ---- */
  C.CARRIER = { hp: 100, speed: 0.16 };

  /* ---- what the enemy has, and what each costs it ---- */
  C.FACTORY = {
    sectionHp: 2,
    /* a section knocked down but the factory still standing is rebuilt, a
     * hit point at a time: this many steps, less for a better steel mill */
    repairEvery: 4500,
    prodEvery: 3600, maxLevel: 9,
  };
  /* the six factories, each feeding one line of the enemy's war */
  C.KINDS = {
    steel: { name: "Steel mill", what: "Plate for the battleship's hull, and the patching of the other factories." },
    arms: { name: "Munitions works", what: "Shells for the flak guns: they fire faster and burst wider." },
    tanks: { name: "Tank works", what: "Tanks on the island roads, and more of them." },
    air: { name: "Aircraft plant", what: "Fighters, faster and more of them, and the bombers sent at your carrier." },
    radio: { name: "Electronics works", what: "Radar that sees further, and missiles that home." },
    engines: { name: "Engine works", what: "The battleship's engines: it is built faster." },
  };
  C.KIND_ORDER = ["steel", "arms", "tanks", "air", "radio", "engines"];

  C.AA = { hp: 6, range: 175, every: 125, everyMin: 62, flakSpeed: 3.2, burst: 12, dmg: 5, spread: 16, spreadPerPx: 0.14 };
  C.TANK = { hp: 4, speed: 0.32, range: 135, every: 180, everyMin: 95, shellSpeed: 2.4, dmg: 3 };
  C.RADAR = { hp: 5, range: 300, rangePerLevel: 22 };
  C.FIGHTER = { hp: 2, speed: 2.55, speedPerLevel: 0.09, turn: 0.048, range: 115, burstEvery: 110, dmg: 2, missileDmg: 8, missileSpeed: 2.9, missileTurn: 0.038, fuel: 2400, alt: 2 };
  C.BOMBER = { hp: 5, speed: 1.15, every: 5200, everyMin: 2600, dmg: 4, bombs: 3, gunRange: 95, gunDmg: 2 };
  C.CARGO = { hp: 3, speed: 0.55, every: 2000, deliver: 0.015 };
  C.GUNBOAT = { hp: 4, speed: 0.75, range: 140, every: 120, dmg: 4 };
  C.HANGAR = { hp: 2, rebuild: 3000 };
  C.SHIPYARD = { hp: 1, setback: 0.035 };
  C.BATTLESHIP = { hp: 10, hpPerSteel: 0.5, speed: 0.3, gunRange: 230, gunEvery: 80, shellSpeed: 2.4, dmg: 12, carrierDmg: 3, burst: 18,
    /* steps from an empty yard to a ship at sea, with every factory at level 0 */
    build: 42000 };

  /* scramble: once radar has the helicopter, fighters are up this many steps later */
  C.SCRAMBLE = { delay: 260, rest: 2000, idle: 3600 };

  /* ---- points ---- */
  C.SCORE = { fighter: 100, bomber: 250, tank: 60, aa: 60, radar: 150, cargo: 80, gunboat: 120, hangar: 100, section: 100, factory: 1000, yard: 200, battleship: 5000,
    round: 2000, carrierHp: 20, heliLeft: 500 };

  /* ---- how hard ---- */
  C.DIFF = [
    { id: "easy", name: "Easy", note: "The enemy starts with nothing, hits softer, and builds slower. Four helicopters.", start: 0, dmg: 0.55, build: 0.7, fighters: 0.75, helis: 4 },
    { id: "normal", name: "Normal", note: "The raid as it was meant: three helicopters, and a battleship by the end of the round if you dawdle.", start: 1, dmg: 0.8, build: 1, fighters: 1, helis: 3 },
    { id: "hard", name: "Hard", note: "Every factory well along already. Fighters sooner, flak thicker, the battleship quicker.", start: 3, dmg: 1.1, build: 1.3, fighters: 1.25, helis: 3 },
  ];

  /* ---- titles at the end, by score ---- */
  C.RANKS = [[0, "Deckhand"], [5000, "Ensign"], [15000, "Lieutenant"], [30000, "Lieutenant Commander"], [50000, "Commander"], [80000, "Captain"], [120000, "Commodore"], [180000, "Rear Admiral"], [260000, "Admiral of Puma Bay"]];
  C.rankFor = score => { let r = C.RANKS[0][1]; for (const [s, n] of C.RANKS) if (score >= s) r = n; return r; };
})();
