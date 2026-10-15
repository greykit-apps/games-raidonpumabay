/* Raid on Puma Bay -- the bay itself. One map, the same every game, as the
 * 1984 one was: seven islands for the Wolf Empire's six factories and its
 * secret shipyard, an airfield, and a scatter of rocks with flak and radar
 * on them, all in a sea that wraps round at the edges.
 *
 * Land is a smooth field over the whole bay (PB.landAt, in pixels), so the
 * art can draw a coast to the pixel; the engine reads it a tile at a time
 * (map.tiles). Everything else here is where things stand: the factories
 * and their sections, the guns, the radar, the roads the tanks drive, the
 * docks, and the sea lanes between them, found once by A* and kept. */
"use strict";
(() => {
  const N = PB.TILES, T = PB.TILE, W = PB.WORLD;
  const TL = PB.TL = { DEEP: 0, SHALLOW: 1, SAND: 2, GRASS: 3, FOREST: 4, PAD: 5, ROAD: 6, ROCK: 7, RUNWAY: 8, DOCK: 9, CHANNEL: 10 };
  PB.isWater = t => t === TL.DEEP || t === TL.SHALLOW || t === TL.CHANNEL;

  /* ---- smooth value noise, its own, so the engine needs no art ---- */
  const hash = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const sm = t => t * t * (3 - 2 * t);
  /* noise that wraps with the bay: period p cells */
  const vn = (x, y, s, p) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const w = v => ((v % p) + p) % p;
    const a = hash(w(xi), w(yi), s), b = hash(w(xi + 1), w(yi), s), c = hash(w(xi), w(yi + 1), s), d = hash(w(xi + 1), w(yi + 1), s);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  /* in tiles; periods that divide the bay so the noise meets itself at the seam */
  PB.noise = (tx, ty, s = 0) => vn(tx / 5, ty / 5, s, N / 5) * 0.62 + vn(tx / 2, ty / 2, s + 7, N / 2) * 0.28 + vn(tx * 0.8, ty * 0.8, s + 13, N * 0.8) * 0.1;

  /* ---- the islands: centre in tiles, radius, stretch, and what is on them ---- */
  const ISLANDS = [
    { id: "steel", x: 26, y: 34, r: 10.5, sx: 1.15, sy: 0.95, factory: "steel", dock: [1, 0.3], aa: [0.6, 2.3, 4.1], roads: true },
    { id: "engines", x: 75, y: 18, r: 9.5, sx: 1.05, sy: 1, factory: "engines", dock: [0.2, 1], aa: [1.0, 3.6, 5.2], roads: true },
    { id: "radio", x: 125, y: 30, r: 10.5, sx: 1, sy: 1.1, factory: "radio", dock: [-1, 0.6], aa: [0.4, 2.6], radar: [1.2], roads: true },
    { id: "tanks", x: 72, y: 77, r: 13.5, sx: 1.2, sy: 1, factory: "tanks", dock: [0.4, 1], aa: [0.3, 1.9, 3.3, 4.9], roads: true, ring: true },
    { id: "arms", x: 27, y: 93, r: 10.5, sx: 1, sy: 1.15, factory: "arms", dock: [1, 0.5], aa: [0.8, 2.4, 3.9, 5.5], roads: true },
    { id: "air", x: 139, y: 89, r: 10.5, sx: 1, sy: 1.05, factory: "air", dock: [-1, 0.4], aa: [0.9, 2.9, 4.6], roads: true },
    { id: "yard", x: 101, y: 121, r: 11.5, sx: 1.1, sy: 1, yard: true, aa: [0.6, 2.4, 3.9, 5.6] },
    { id: "field", x: 105, y: 59, r: 8.5, sx: 1.75, sy: 0.8, airfield: true, aa: [1.6, 4.7], radar: [3.1] },
    { id: "rock1", x: 50, y: 50, r: 3.6, sx: 1, sy: 1, aa: [0] },
    { id: "rock2", x: 151, y: 57, r: 3.4, sx: 1, sy: 1, radar: [0] },
    { id: "rock3", x: 57, y: 113, r: 3.8, sx: 1.2, sy: 1, radar: [0] },
    { id: "rock4", x: 8, y: 64, r: 3.8, sx: 1, sy: 1.2, aa: [0] },
    { id: "rock5", x: 135, y: 132, r: 4.2, sx: 1.2, sy: 1, aa: [0] },
    { id: "rock6", x: 152, y: 8, r: 3.6, sx: 1, sy: 1, aa: [0] },
    { id: "rock7", x: 96, y: 92, r: 3, sx: 1, sy: 1 },
    { id: "rock8", x: 4, y: 128, r: 2.6, sx: 1, sy: 1 },
  ];
  ISLANDS.forEach((is, i) => { is.n = i; is.seed = 11 + i * 17; });

  /* the carrier's beat: an oval of open water, south-west */
  const CARRIER_LOOP = { x: 42, y: 140, rx: 17, ry: 6.5 };

  /* land at a point, in pixels: below 1 is land. Each island is an ellipse
   * roughened by noise; the factory's ground is always land, the shipyard's
   * dock always water. */
  const carve = [], force = [];
  PB.landAt = (px, py) => {
    const tx = px / T, ty = py / T;
    for (const r of carve) if (inRect(tx, ty, r)) return 9;
    for (const r of force) if (inRect(tx, ty, r)) return 0;
    let best = 9;
    for (const is of ISLANDS) {
      const dx = PB.wd(is.x, tx) / (is.r * is.sx), dy = PB.wd(is.y, ty) / (is.r * is.sy);
      if (Math.abs(dx) > 1.6 || Math.abs(dy) > 1.6) continue;
      const d = Math.hypot(dx, dy) + (PB.noise(tx, ty, is.seed) - 0.5) * 0.62;
      if (d < best) best = d;
    }
    return best;
  };
  const inRect = (tx, ty, r) => { const dx = ((tx - r.x) % N + N) % N, dy = ((ty - r.y) % N + N) % N; return dx < r.w && dy < r.h; };
  /* how deep into an island a point is: 0 at the coast, 1 at the middle */
  PB.inland = (px, py) => PB.clamp(1 - PB.landAt(px, py), 0, 1);

  const idx = (x, y) => ((y % N + N) % N) * N + ((x % N + N) % N);
  const tc = v => ((v % N) + N) % N;

  PB.buildMap = () => {
    if (PB.MAP) return PB.MAP;
    const tiles = new Uint8Array(N * N);
    const m = { tiles, islands: ISLANDS, factories: [], aa: [], radars: [], hangars: [], tankRoads: [], decor: [], routes: {}, yard: null, runway: null, pads: [], docks: [], roads: [] };
    const set = (x, y, t) => { tiles[idx(x, y)] = t; };
    const get = (x, y) => tiles[idx(x, y)];

    /* the things that must be land, or water, before the coast is drawn */
    for (const is of ISLANDS) {
      if (is.factory) force.push({ x: tc(is.x - 4), y: tc(is.y - 4), w: 9, h: 9 });
      if (is.yard) {
        force.push({ x: tc(is.x - 6), y: tc(is.y - 6), w: 13, h: 11 });
        carve.push({ x: tc(is.x - 2), y: tc(is.y - 5), w: 5, h: 17 });
      }
      if (is.airfield) force.push({ x: tc(is.x - 11), y: tc(is.y - 3), w: 23, h: 6 });
    }

    /* ---- land and water, a tile at a time ---- */
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = PB.landAt((x + 0.5) * T, (y + 0.5) * T);
      set(x, y, v < 1 ? TL.GRASS : TL.DEEP);
    }
    for (const r of carve) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(x, y, TL.CHANNEL);
    /* the coast: sand on land that touches water; the interior woods by noise */
    const land = (x, y) => !PB.isWater(get(x, y));
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (get(x, y) !== TL.GRASS) continue;
      let wet = false;
      for (let dy = -1; dy <= 1 && !wet; dy++) for (let dx = -1; dx <= 1; dx++) if (!land(x + dx, y + dy)) { wet = true; break; }
      if (wet) set(x, y, TL.SAND);
      else if (PB.noise(x * 1.3, y * 1.3, 501) > 0.6) set(x, y, TL.FOREST);
      else if (PB.noise(x * 2.1, y * 2.1, 777) > 0.82) set(x, y, TL.ROCK);
    }

    /* ---- clearance: how many tiles to the nearest land, for the ships ---- */
    const clear = new Uint8Array(N * N).fill(255);
    const q = [];
    for (let i = 0; i < N * N; i++) if (!PB.isWater(tiles[i]) || tiles[i] === TL.CHANNEL) { clear[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % N, y = (i / N) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const j = idx(x + dx, y + dy);
        if (clear[j] > clear[i] + 1) { clear[j] = clear[i] + 1; q.push(j); }
      }
    }
    /* the channel counts as open water for whoever is in it */
    for (let i = 0; i < N * N; i++) if (tiles[i] === TL.CHANNEL) clear[i] = 3;
    for (let i = 0; i < N * N; i++) if (tiles[i] === TL.DEEP && clear[i] <= 2) tiles[i] = TL.SHALLOW;
    m.clear = clear;

    /* ---- what stands on each island ---- */
    const px = t => (t + 0.5) * T;
    /* a point on an island's ground, a fraction f of the way out at angle a (radians, 0 east) */
    const onIsland = (is, a, f) => [tc(Math.round(is.x + Math.cos(a) * is.r * is.sx * f)), tc(Math.round(is.y + Math.sin(a) * is.r * is.sy * f))];
    const freeLand = (x, y) => { const t = get(x, y); return t === TL.GRASS || t === TL.FOREST || t === TL.SAND || t === TL.ROCK; };
    /* the nearest free land to a tile, spiralling out */
    const nearFree = (x, y) => {
      for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (freeLand(x + dx, y + dy) && get(x + dx, y + dy) !== TL.SAND) return [tc(x + dx), tc(y + dy)];
      }
      return null;
    };
    const fill = (x, y, w, h, t) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, t); };
    const line = (x0, y0, x1, y1, t, keep) => {
      const out = [];
      const dx = PB.wd(x0 * T, x1 * T) / T, dy = PB.wd(y0 * T, y1 * T) / T, n = Math.max(Math.abs(dx), Math.abs(dy));
      let lx = null, ly = null;
      for (let k = 0; k <= n; k++) {
        const x = tc(Math.round(x0 + dx * k / n)), y = tc(Math.round(y0 + dy * k / n));
        /* never a diagonal step: tanks drive tile to tile */
        if (lx !== null && lx !== x && ly !== y) { if (!keep || keep(x, ly)) { set(x, ly, t); out.push([x, ly]); } }
        if (!keep || keep(x, y)) { set(x, y, t); out.push([x, y]); }
        lx = x; ly = y;
      }
      return out;
    };
    /* a dock: walk from the island's middle along a direction to the water,
     * then a pier three tiles out; the berth is the water beyond */
    const makeDock = (is, dir) => {
      const len = Math.hypot(dir[0], dir[1]), ux = dir[0] / len, uy = dir[1] / len;
      let k = 0, x = is.x, y = is.y;
      while (k < 40 && land(Math.round(x), Math.round(y))) { k++; x = is.x + ux * k; y = is.y + uy * k; }
      const root = [tc(Math.round(is.x + ux * (k - 1))), tc(Math.round(is.y + uy * (k - 1)))];
      const pier = [];
      for (let j = 0; j < 3; j++) { const p = [tc(Math.round(x + ux * j)), tc(Math.round(y + uy * j))]; set(p[0], p[1], TL.DOCK); pier.push(p); }
      /* the berth beside the pier's end, a tile off to one side */
      const end = pier[pier.length - 1], side = [tc(Math.round(end[0] + uy)), tc(Math.round(end[1] - ux))];
      const berth = PB.isWater(get(side[0], side[1])) ? side : [tc(Math.round(x + ux * 3)), tc(Math.round(y + uy * 3))];
      const d = { root, pier, berth: { x: px(berth[0]), y: px(berth[1]), tx: berth[0], ty: berth[1] }, ang: Math.atan2(ux, -uy) };
      m.docks.push(d);
      return d;
    };

    for (const is of ISLANDS) {
      if (is.factory) {
        const kind = is.factory, x0 = tc(is.x - 3), y0 = tc(is.y - 3);
        fill(x0, y0, 7, 7, TL.PAD);
        m.pads.push({ x: x0 * T, y: y0 * T, w: 7 * T, h: 7 * T, kind: "factory" });
        /* four sections in a square, a road between them */
        const sec = [[-2.5, -2.5], [0.5, -2.5], [-2.5, 0.5], [0.5, 0.5]].map(([ox, oy], i) => ({ i, x: (is.x + ox) * T, y: (is.y + oy) * T, w: 2 * T, h: 2 * T }));
        const dock = makeDock(is, is.dock);
        /* the road: from the pad to the dock's root, and round the pad */
        const roadTiles = [];
        const keep = (x, y) => get(x, y) !== TL.PAD && get(x, y) !== TL.DOCK && land(x, y);
        roadTiles.push(...line(tc(is.x + Math.sign(is.dock[0]) * (Math.abs(is.dock[0]) > 0.5 ? 4 : 0)), tc(is.y + Math.sign(is.dock[1]) * (Math.abs(is.dock[1]) > 0.5 ? 4 : 0)), dock.root[0], dock.root[1], TL.ROAD, keep));
        for (let i = -4; i <= 4; i++) for (const [x, y] of [[is.x + i, is.y - 4], [is.x + i, is.y + 4], [is.x - 4, is.y + i], [is.x + 4, is.y + i]]) if (keep(tc(x), tc(y))) { set(tc(x), tc(y), TL.ROAD); roadTiles.push([tc(x), tc(y)]); }
        if (is.ring) {
          /* the big island has a loop road out toward its coast */
          const ring = a => [Math.round(is.x + Math.cos(a) * is.r * is.sx * 0.62), Math.round(is.y + Math.sin(a) * is.r * is.sy * 0.62)];
          for (let a = 0; a < 24; a++) {
            const [x0, y0] = ring(a / 24 * Math.PI * 2), [x1, y1] = ring((a + 1) / 24 * Math.PI * 2);
            roadTiles.push(...line(tc(x0), tc(y0), tc(x1), tc(y1), TL.ROAD, keep));
          }
          for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
            const ex = tc(Math.round(is.x + Math.cos(a) * is.r * is.sx * 0.62)), ey = tc(Math.round(is.y + Math.sin(a) * is.r * is.sy * 0.62));
            roadTiles.push(...line(tc(is.x + Math.round(Math.cos(a)) * 4), tc(is.y + Math.round(Math.sin(a)) * 4), ex, ey, TL.ROAD, keep));
          }
        }
        m.roads.push({ island: is.id, tiles: roadTiles });
        m.factories.push({ id: m.factories.length, kind, island: is.id, x: is.x * T + T / 2, y: is.y * T + T / 2, sections: sec, dock, stacks: stacksFor(kind, is) });
      }
      if (is.yard) {
        const x0 = tc(is.x - 6), y0 = tc(is.y - 6);
        fill(x0, y0, 13, 11, TL.PAD);
        m.pads.push({ x: x0 * T, y: y0 * T, w: 13 * T, h: 11 * T, kind: "yard" });
        for (let y = tc(is.y - 5); y !== tc(is.y + 12); y = tc(y + 1)) for (let x = tc(is.x - 2); x !== tc(is.x + 3); x = tc(x + 1)) set(x, y, TL.CHANNEL);
        /* the dock's gates at the mouth, the ship's berth up the channel */
        const mouthY = (() => { let y = is.y + 5; while (y < is.y + 20 && land(is.x - 3, y)) y++; return y; })();
        m.yard = {
          island: is.id, x: is.x * T + T / 2, y: (is.y - 0.5) * T,
          dock: { x: (is.x - 2) * T, y: (is.y - 5) * T, w: 5 * T, h: 11 * T },
          ship: { x: is.x * T + T / 2, y: (is.y + 0.5) * T },
          mouth: { x: is.x * T + T / 2, y: (mouthY + 2) * T },
          berth: { x: is.x * T + T / 2, y: (mouthY + 2) * T, tx: is.x, ty: tc(mouthY + 2) },
          cranes: [{ x: (is.x - 4) * T, y: (is.y - 3) * T }, { x: (is.x + 4) * T, y: (is.y + 1) * T }, { x: (is.x - 4) * T, y: (is.y + 3) * T }],
          sheds: [{ x: (is.x - 6) * T, y: (is.y - 6) * T, w: 3 * T, h: 2 * T }, { x: (is.x + 4) * T, y: (is.y - 6) * T, w: 3 * T, h: 2 * T }],
        };
      }
      if (is.airfield) {
        const x0 = tc(is.x - 10), y0 = tc(is.y);
        fill(tc(is.x - 11), tc(is.y - 3), 23, 6, TL.PAD);
        m.pads.push({ x: tc(is.x - 11) * T, y: tc(is.y - 3) * T, w: 23 * T, h: 6 * T, kind: "field" });
        fill(x0, y0, 21, 2, TL.RUNWAY);
        m.runway = { x: x0 * T, y: y0 * T, w: 21 * T, h: 2 * T, start: { x: x0 * T + T, y: (y0 + 1) * T }, ang: Math.PI / 2 };
        for (let i = 0; i < 3; i++) m.hangars.push({ id: i, x: (is.x - 7 + i * 5) * T, y: (is.y - 3) * T, w: 3 * T, h: 2 * T });
      }
      /* flak and radar round the island, at the angles given, on free land */
      const ring = is.r < 5 ? 0 : is.yard ? 0.78 : 0.66;
      for (const a of is.aa || []) {
        const [x, y] = onIsland(is, a, ring), p = ring === 0 ? [tc(is.x), tc(is.y)] : nearFree(x, y);
        if (p) { m.aa.push({ id: m.aa.length, x: px(p[0]), y: px(p[1]), island: is.id }); set(p[0], p[1], TL.GRASS); }
      }
      for (const a of is.radar || []) {
        const [x, y] = onIsland(is, a, ring * 0.9), p = ring === 0 ? [tc(is.x), tc(is.y)] : nearFree(x, y);
        if (p) { m.radars.push({ id: m.radars.length, x: px(p[0]), y: px(p[1]), island: is.id }); set(p[0], p[1], TL.GRASS); }
      }
    }
    /* palms on the sand and in the woods, rocks here and there: the art's, not the game's */
    const dr = PB.mulberry(4242);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const t = get(x, y), r = dr();
      if (t === TL.FOREST && r < 0.85) m.decor.push({ k: "tree", x: (x + dr()) * T, y: (y + dr()) * T, v: PB.ri(dr, 4) });
      else if (t === TL.SAND && r < 0.14) m.decor.push({ k: "palm", x: (x + 0.2 + dr() * 0.6) * T, y: (y + 0.2 + dr() * 0.6) * T, v: PB.ri(dr, 3) });
      else if (t === TL.GRASS && r < 0.05) m.decor.push({ k: "bush", x: (x + dr()) * T, y: (y + dr()) * T, v: PB.ri(dr, 3) });
      else if (t === TL.ROCK) m.decor.push({ k: "rock", x: (x + 0.5) * T, y: (y + 0.5) * T, v: PB.ri(dr, 3) });
    }

    /* ---- the sea lanes ---- */
    m.path = (ax, ay, bx, by, minClear) => astar(m, ax, ay, bx, by, minClear);
    if (m.yard) for (const f of m.factories) {
      const p = m.path(f.dock.berth.tx, f.dock.berth.ty, m.yard.berth.tx, m.yard.berth.ty, 1);
      m.routes[f.id] = p ? p.map(([x, y]) => [px(x), px(y)]) : null;
    }
    /* the carrier's oval, in pixels, a point every few tiles */
    m.carrierPath = [];
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2;
      m.carrierPath.push([(CARRIER_LOOP.x + Math.cos(a) * CARRIER_LOOP.rx) * T, (CARRIER_LOOP.y + Math.sin(a) * CARRIER_LOOP.ry) * T]);
    }
    /* the tanks' roads, as a graph of tiles */
    m.isRoad = (x, y) => get(x, y) === TL.ROAD;
    m.tile = (x, y) => get(x, y);
    m.tileAt = (wx, wy) => get(Math.floor(PB.wrap(wx) / T), Math.floor(PB.wrap(wy) / T));
    PB.MAP = m;
    return m;
  };

  /* where the smoke comes out: each kind has its own stacks, in tiles from the island's middle */
  function stacksFor(kind, is) {
    const S = { steel: [[-3.2, -2.9], [-1.4, -2.9], [1.6, 2.9]], arms: [[2.8, -2.8]], tanks: [[-2.9, 2.6], [2.9, 2.6]], air: [[0, -3.1]], radio: [[3.1, 0]], engines: [[-3.1, -1], [-3.1, 1]] }[kind] || [];
    return S.map(([x, y]) => ({ x: (is.x + x) * T + T / 2, y: (is.y + y) * T + T / 2 }));
  }

  /* ---- A* across the wrapping sea, through tiles with clearance ---- */
  function astar(m, ax, ay, bx, by, minClear) {
    const g = new Float64Array(N * N).fill(Infinity), from = new Int32Array(N * N).fill(-1), shut = new Uint8Array(N * N);
    const start = idx(ax, ay), goal = idx(bx, by);
    const hd = i => { const x = i % N, y = (i / N) | 0, dx = Math.abs(PB.wd(x * T, bx * T) / T), dy = Math.abs(PB.wd(y * T, by * T) / T); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const heap = [[hd(start), start]];
    g[start] = 0;
    const push = e => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return top; };
    const ok = j => j === goal || (PB.isWater(m.tiles[j]) && m.clear[j] >= minClear);
    let found = false;
    while (heap.length) {
      const [, i] = pop();
      if (shut[i]) continue;
      if (i === goal) { found = true; break; }
      shut[i] = 1;
      const x = i % N, y = (i / N) | 0;
      for (const [dx, dy, c] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [-1, -1, 1.414], [1, -1, 1.414], [-1, 1, 1.414]]) {
        const j = idx(x + dx, y + dy);
        if (shut[j] || !ok(j)) continue;
        /* a diagonal never cuts a corner of land */
        if (dx && dy && (!ok(idx(x + dx, y)) || !ok(idx(x, y + dy)))) continue;
        /* hug the open water: tiles near land cost a little more */
        const ng = g[i] + c + (m.clear[j] < 3 ? 0.6 : 0);
        if (ng < g[j]) { g[j] = ng; from[j] = i; push([ng + hd(j), j]); }
      }
    }
    if (!found) return null;
    const out = [];
    for (let i = goal; i !== -1; i = from[i]) out.push([i % N, (i / N) | 0]);
    out.reverse();
    /* keep a point every few tiles, and every turn */
    const pts = [out[0]];
    for (let k = 1; k < out.length - 1; k++) {
      const [x0, y0] = out[k - 1], [x1, y1] = out[k], [x2, y2] = out[k + 1];
      const turn = (x1 - x0 !== x2 - x1) || (y1 - y0 !== y2 - y1);
      if (turn || k % 4 === 0) pts.push(out[k]);
    }
    pts.push(out[out.length - 1]);
    return pts;
  }
})();
