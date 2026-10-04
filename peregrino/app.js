/* =============================================================
   Peregrino — product page choreography

   1. The journey (#story): scroll-scrubbed. The globe (globe.js) rises
      out of the hero blank and goes round the world: drives, trains, the
      Camino on foot, a ferry, a bus and flights to Asia and America. A
      country is painted the moment the route crosses into it, one at a
      time, and its stamp lands there. Then a big open passport comes up
      behind the globe and snaps shut on it; the closed booklet opens
      again on the data page, now full, the stamps land, and the phone
      slides in beside it.
   2. The tour (#tour): one phone pinned while the blades scroll past,
      carried by the app's vehicles (vehicles.js) to sit opposite each one,
      bringing out what the app prints for it (artifacts.js); the last stop
      lets you dress its passport in the app's six styles.
   3. The small things, the download blade and the FAQ.

   Everything in (1) is a pure function of scroll progress, so scrubbing
   back and forth gives identical frames; only the planes and ships keep
   their own time.
   ============================================================= */
(() => {
'use strict';
document.documentElement.classList.add('js');

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const smooth = t => t * t * (3 - 2 * t);
/* the app's book-opening spring (response 0.8, damping 0.8) over t = 0…1, a touch of overshoot */
const springOut = (() => {
  const w = 2 * Math.PI / .8, k = .8 * w, wd = w * .6;
  const x = t => 1 - Math.exp(-k * t) * (Math.cos(wd * t) + k / wd * Math.sin(wd * t));
  const end = x(1);
  return t => t <= 0 ? 0 : t >= 1 ? 1 : x(t) / end;
})();
const D2R = Math.PI / 180, EARTH_KM = 6371;
const fmt = n => Math.round(n).toLocaleString('en-GB');
const GL = window.PeregrinoGlobe, ART = window.PeregrinoArt;

/* -------------------------------------------------------------
   THE TRAVELLER
   The globe starts blank. A tour from Prague round the world paints the
   32 countries on the app's own Statistics screen (Europe 25, Asia 6,
   North America 1) one at a time: each where the route crosses into it,
   or where it lands. Czechia, the United Kingdom and South Korea are
   where the traveller has lived, so they are inked amber.
   ------------------------------------------------------------- */
const INK = {visited: [217, 69, 59], lived: [224, 162, 26], wishlist: [124, 91, 230], planned: [138, 147, 160]};
const LIVED = new Set(['CZE', 'GBR', 'KOR']);
/* the 32 the tour ends with, for the app screens further down the page */
const ALL32 = ['CZE', 'AUT', 'SVK', 'HUN', 'HRV', 'SVN', 'ITA', 'CHE', 'FRA', 'LUX', 'BEL', 'NLD', 'DEU', 'DNK', 'SWE', 'NOR', 'FIN',
               'KOR', 'JPN', 'HKG', 'CHN', 'VNM', 'THA', 'USA', 'ISL', 'IRL', 'GBR', 'PRT', 'ESP', 'MCO', 'GRC', 'POL'];
const WISHLIST = ['MAR', 'CAN'];

/* route colours: TravelMode.tintColor, outer mixed 45% to black, inner 35% to white */
const TINT = {flight: [0, 122, 255], train: [52, 199, 89], bus: [255, 149, 0], drive: [255, 59, 48], ferry: [48, 176, 199], walk: [162, 132, 94]};
const outer = m => `rgb(${TINT[m].map(v => Math.round(v * .55))})`;
const inner = m => `rgb(${TINT[m].map(v => Math.round(v * .65 + 255 * .35))})`;
const AIRLINES = [['#f5f5f5', '#2659b3'], ['#f2f2f2', '#cc2626'], ['#ebebe0', '#008059'], ['#f5f5f5', '#e69900'], ['#334d80', '#334d80'], ['#f5f5f5', '#8c008c']];

/* `a3` where the simplified coastline misses the city, or the place has no outline of its own */
const CITY = {
  PRG: {ll: [14.42, 50.08], n: 'Prague'},       VIE: {ll: [16.37, 48.21], n: 'Vienna'},      BTS: {ll: [17.11, 48.15], n: 'Bratislava'},
  BUD: {ll: [19.04, 47.50], n: 'Budapest'},     ZAG: {ll: [15.98, 45.81], n: 'Zagreb'},      LJU: {ll: [14.51, 46.06], n: 'Ljubljana'},
  VCE: {ll: [12.24, 45.48], n: 'Venice'},       ZRH: {ll: [8.54, 47.38], n: 'Zurich'},       LUX: {ll: [6.13, 49.61], n: 'Luxembourg'},
  BRU: {ll: [4.35, 50.85], n: 'Brussels'},      AMS: {ll: [4.90, 52.37], n: 'Amsterdam'},    HAM: {ll: [9.99, 53.55], n: 'Hamburg'},
  CPH: {ll: [12.57, 55.68], n: 'Copenhagen', a3: 'DNK'}, STO: {ll: [18.07, 59.33], n: 'Stockholm'}, OSL: {ll: [10.75, 59.91], n: 'Oslo'},
  HEL: {ll: [24.94, 60.17], n: 'Helsinki'},     SEL: {ll: [126.98, 37.57], n: 'Seoul'},      TYO: {ll: [139.69, 35.69], n: 'Tokyo'},
  HKG: {ll: [114.17, 22.30], n: 'Hong Kong', a3: 'HKG'}, CAN: {ll: [113.26, 23.13], n: 'Guangzhou'}, HAN: {ll: [105.85, 21.03], n: 'Hanoi'},
  BKK: {ll: [100.50, 13.75], n: 'Bangkok'},     SFO: {ll: [-122.42, 37.77], n: 'San Francisco'}, RKV: {ll: [-21.88, 64.13], n: 'Reykjavík'},
  DUB: {ll: [-6.26, 53.35], n: 'Dublin'},       LPL: {ll: [-2.98, 53.41], n: 'Liverpool', a3: 'GBR'}, LIS: {ll: [-9.2, 38.76], n: 'Lisbon'},
  SCQ: {ll: [-8.54, 42.88], n: 'Santiago'},     NCE: {ll: [7.27, 43.70], n: 'Nice', a3: 'FRA'}, MCM: {ll: [7.42, 43.735], n: 'Monaco', a3: 'MCO'},
  ATH: {ll: [23.73, 37.98], n: 'Athens'},       KRK: {ll: [19.94, 50.06], n: 'Kraków'},
};
/* the tour: ground legs follow their roads, rails and sea lanes through `via` (a city's
   code marks a stop on the way); flights take the great circle. `at` places a country
   by hand where an outline can't (China, once out of Hong Kong). */
const LEGS = [
  {mode: 'drive', from: 'PRG', to: 'BUD', title: 'Road trip', via: [[14.62, 49.96], [15.2, 49.62], [15.59, 49.40], [16.12, 49.27], [16.61, 49.19], [16.66, 48.98], [16.55, 48.58], 'VIE', [16.75, 48.13], 'BTS', [17.45, 47.95], [17.63, 47.69], [18.4, 47.62]]},
  {mode: 'train', from: 'BUD', to: 'VCE', title: 'Train', via: [[18.2, 46.95], [17.25, 46.55], [16.99, 46.45], [16.55, 46.36], [16.25, 46.05], 'ZAG', [15.66, 45.90], [15.17, 46.08], 'LJU', [14.2, 45.85], [13.87, 45.71], [13.6, 45.78], [13.2, 45.78], [12.6, 45.6]]},
  {mode: 'train', from: 'VCE', to: 'ZRH', title: 'Train', via: [[10.99, 45.44], [9.19, 45.48], [9.08, 45.81], [9.03, 45.84], [8.95, 46.0], [9.02, 46.19], [8.65, 46.6], [8.62, 47.0]]},
  {mode: 'train', from: 'ZRH', to: 'AMS', title: 'Train', via: [[7.59, 47.55], [7.34, 47.75], [7.75, 48.58], [7.0, 48.9], [6.18, 49.11], [6.17, 49.36], 'LUX', [5.81, 49.68], [4.87, 50.47], 'BRU', [4.42, 51.22], [4.46, 51.53], [4.48, 51.92]]},
  {mode: 'train', from: 'AMS', to: 'STO', title: 'Night train', via: [[5.39, 52.16], [6.79, 52.27], [7.16, 52.30], [8.04, 52.28], [8.80, 53.08], 'HAM', [9.98, 54.07], [9.43, 54.79], [9.36, 54.83], [9.47, 55.49], [10.39, 55.40], [10.80, 55.31], [11.14, 55.33], 'CPH', [13.0, 55.6], [13.19, 55.70], [13.76, 56.16], [14.56, 56.90], [14.69, 57.65], [15.62, 58.41], [16.19, 58.59], [17.63, 59.20]]},
  {mode: 'train', from: 'STO', to: 'OSL', title: 'Train', via: [[17.3, 59.5], [16.54, 59.61], [15.84, 59.39], [15.21, 59.27], [14.11, 59.31], [13.50, 59.38], [13.32, 59.50], [12.59, 59.65], [12.29, 59.89], [12.00, 60.19], [11.05, 59.96]]},
  {mode: 'flight', from: 'OSL', to: 'HEL', title: 'AY 912', air: 4},
  {mode: 'flight', from: 'HEL', to: 'SEL', title: 'AY 41', air: 4},
  {mode: 'flight', from: 'SEL', to: 'TYO', title: 'KE 703', air: 0},
  {mode: 'flight', from: 'TYO', to: 'HKG', title: 'CX 543', air: 2},
  {mode: 'train', from: 'HKG', to: 'CAN', title: 'Intercity', via: [[114.12, 22.42], [114.08, 22.53], [113.95, 22.75], [113.75, 23.02]], at: {CHN: .3}},
  {mode: 'flight', from: 'CAN', to: 'HAN', title: 'CZ 3045', air: 0},
  {mode: 'flight', from: 'HAN', to: 'BKK', title: 'VN 615', air: 3},
  {mode: 'flight', from: 'BKK', to: 'SFO', title: 'TG 980', air: 5},
  {mode: 'flight', from: 'SFO', to: 'RKV', title: 'FI 670', air: 0},
  {mode: 'flight', from: 'RKV', to: 'DUB', title: 'FI 416', air: 0},
  {mode: 'ferry', from: 'DUB', to: 'LPL', title: 'Ferry', via: [[-6.0, 53.36], [-5.0, 53.42], [-4.0, 53.48], [-3.3, 53.45]]},
  {mode: 'flight', from: 'LPL', to: 'LIS', title: 'U2 2321', air: 3},
  {mode: 'walk', from: 'LIS', to: 'SCQ', title: 'Camino Português', via: [[-9.0, 38.9], [-8.68, 39.24], [-8.41, 39.60], [-8.43, 40.21], [-8.45, 40.57], [-8.61, 41.15], [-8.62, 41.53], [-8.58, 41.77], [-8.64, 42.03], [-8.61, 42.28], [-8.65, 42.43], [-8.64, 42.60], [-8.66, 42.74]]},
  {mode: 'flight', from: 'SCQ', to: 'NCE', title: 'VY 1531', air: 1},
  {mode: 'bus', from: 'NCE', to: 'MCM', title: 'Bus 100', via: [[7.31, 43.70], [7.33, 43.71], [7.36, 43.73], [7.40, 43.72]]},
  {mode: 'flight', from: 'MCM', to: 'ATH', title: 'A3 691', air: 0},
  {mode: 'flight', from: 'ATH', to: 'KRK', title: 'LO 3618', air: 1},
  {mode: 'train', from: 'KRK', to: 'PRG', title: 'Train', via: [[19.02, 50.26], [18.29, 49.84], [17.25, 49.59], [16.2, 49.95], [15.78, 50.04]], home: true},
];
const NAME = {CZE: 'Czechia', VNM: 'Vietnam', HKG: 'Hong Kong', USA: 'the United States', GBR: 'the United Kingdom', NLD: 'the Netherlands'};
/* the six that land on the stamp page at the end, one from each part of the tour */
const PAGE_STAMPS = ['AUT', 'KOR', 'JPN', 'USA', 'ISL', 'ESP'];

/* ---------- sphere helpers ---------- */
const vec = ll => GL.geo(ll[0], ll[1]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const angle = (a, b) => Math.acos(clamp(dot(a, b), -1, 1));
function slerp(a, b, t) {
  const w = angle(a, b);
  if (w < 1e-7) return a.slice();
  const s = Math.sin(w), ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s;
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}
const toLL = v => [Math.atan2(v[1], v[0]) / D2R, Math.asin(clamp(v[2], -1, 1)) / D2R];
const catmull = (p0, p1, p2, p3, t) => {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map(i => .5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); };
function rot(p, ax, a) {   // rotate p about the unit axis ax by a (Rodrigues)
  const c = Math.cos(a), s = Math.sin(a), k = cross(ax, p), d = dot(ax, p);
  return [0, 1, 2].map(i => p[i] * c + k[i] * s + ax[i] * d * (1 - c));
}
/** A route as dense unit vectors with the distance run so far; `marks` is the distance at each control point. */
function buildPath(points, flight) {
  const pts = [], marks = [0];
  if (flight) {
    const a = vec(points[0]), b = vec(points[1]), n = Math.max(48, Math.round(angle(a, b) * 160));
    for (let i = 0; i <= n; i++) pts.push(slerp(a, b, i / n));
  } else {
    const at = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(i + 2, points.length - 1)];
      const km = angle(vec(p1), vec(p2)) * EARTH_KM, n = Math.max(4, Math.ceil(km / 2));
      at.push(pts.length);
      for (let k = 0; k < n; k++) pts.push(vec(catmull(p0, p1, p2, p3, k / n)));
    }
    at.push(pts.length);
    pts.push(vec(points[points.length - 1]));
    marks.length = 0;
    marks.push(...at);
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + angle(pts[i - 1], pts[i]) * EARTH_KM);
  const km = cum[cum.length - 1];
  return {pts, cum, km, marks: flight ? [0, km] : marks.map(i => cum[i])};
}
/** Point at fraction s of the way along. */
function along(path, s) {
  const d = clamp(s) * path.km, c = path.cum;
  let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= d) lo = m; else hi = m; }
  const t = c[hi] > c[lo] ? (d - c[lo]) / (c[hi] - c[lo]) : 0;
  return {v: slerp(path.pts[lo], path.pts[hi], t), i: lo, t};
}

/* ---------- point in country ---------- */
let WORLD = null;
function prepWorld(list) {
  WORLD = list.map(c => {
    let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    for (const r of c.r) for (let i = 0; i < r.length; i += 2) {
      x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]);
    }
    return {...c, box: [x0, x1, y0, y1]};
  });
}
function inRing(r, x, y) {
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function countryAt(lon, lat) {
  if (!WORLD) return null;
  for (const c of WORLD) {
    const b = c.box;
    if (lon < b[0] || lon > b[1] || lat < b[2] || lat > b[3]) continue;
    // outlines and holes (an enclave such as Lesotho) together, even-odd
    let inside = false;
    for (const r of c.r) if (inRing(r, lon, lat)) inside = !inside;
    if (inside) return c.a3;
  }
  return null;
}
const A2 = {HKG: 'HK', MCO: 'MC'};
const a2of = a3 => A2[a3] || (WORLD && WORLD.find(c => c.a3 === a3) || {}).a2;
const nameOf = a3 => NAME[a3] || (WORLD && WORLD.find(c => c.a3 === a3) || {}).n || a3;
const cityA3 = k => CITY[k].a3 || countryAt(...CITY[k].ll);

/* -------------------------------------------------------------
   1. THE JOURNEY
   Beats are laid out in vh of scrolling (`at(...)`), then turned into
   progress across #story, whose height is set to fit them.
   ------------------------------------------------------------- */
const story = $('#story');
// each part on its own, so a failure in one never takes the rest of the page with it
const guard = (name, f) => { try { f(); } catch (e) { console.error(`Peregrino: ${name}`, e); } };
if (story) guard('journey', initStory);

function initStory() {
  const stage = $('#stage');
  const sky = $('#sky'), skx = sky.getContext('2d');
  const over = $('#over'), ox = over.getContext('2d');
  const globe = GL.create($('#globe'), {detail: true});
  const heroCopy = $('#heroCopy'), hud = $('#hud'), leg = $('#leg'), legText = $('#legText'), legGlyph = $('#legGlyph');
  const hudC = $('#hudCountries'), hudW = $('#hudWorld'), hudK = $('#hudKm'), hudShade = $('#hudShade');
  const pop = $('#stampPop'), phone = $('#phoneWrap'), outro = $('#storyOutro'), nudge = $('#nudge');
  const pass = $('#pass'), passUp = $('#passUpper');
  let failed = !globe.ok;

  /* ---- the legs and their weights: ground legs by distance, flights by the arc ---- */
  const legs = LEGS.map(l => {
    const pts = [CITY[l.from].ll, ...(l.via || []).map(q => typeof q === 'string' ? CITY[q].ll : q), CITY[l.to].ll];
    const path = buildPath(pts, l.mode === 'flight');
    const d = angle(vec(CITY[l.from].ll), vec(CITY[l.to].ll));
    // the named stops on the way, as fractions of the route
    const stops = [];
    if (l.via) l.via.forEach((q, i) => { if (typeof q === 'string') stops.push({ll: CITY[q].ll, s: path.marks[i + 1] / path.km}); });
    const w = l.mode === 'flight' ? .55 + .55 * Math.sqrt(d)
      : (.7 + path.km / 700) * (l.mode === 'walk' ? 1.3 : 1);
    return {...l, path, d, w, stops, dwell: l.mode === 'flight' ? .32 : .26};
  });

  /* ---- the beats, in vh of scrolling ---- */
  const U = 16;                            // vh per unit of leg weight
  const HERO = 70, HOME = 34;              // the rise out of the hero; Prague, home
  let acc = HERO + HOME;
  for (const l of legs) { l.v0 = acc; acc += l.w * U; l.v1 = acc; acc += l.dwell * U; l.v2 = acc; }
  const E0 = acc;                           // the tour is over
  const E = (a, b) => [E0 + a, E0 + b];
  const V = {
    heroOut: [6, 46], rise: [0, HERO], home: [HERO, HERO + HOME],
    settle: E(0, 44),       // the camera pulls back to the whole world
    bookIn: E(16, 76),      // a big open passport comes up behind the globe…
    dock: E(46, 86),        // …the globe settles onto its right-hand page…
    shut: E(88, 130),       // …and the passport snaps shut on it
    gulp: E(128, 146),
    closed: E(138, 176),    // the closed passport, a vertical booklet, comes to the middle
    reopen: E(182, 224),    // it opens again…
    turn: E(214, 256),      // …and turns a quarter to the data page, as the app holds it
    stamps: E(256, 300),    // six stamps land
    pop: E(300, 324),       // it pops out of the page…
    side: E(312, 360),      // …and the phone slides in beside it
    outro: E(336, 372),
  };
  const TOTAL = E0 + 392;
  if (!RM) story.style.height = TOTAL + 100 + 'vh';
  const T = {};
  for (const [k, [a, b]] of Object.entries(V)) T[k] = [a / TOTAL, b / TOTAL];
  for (const l of legs) { l.t0 = l.v0 / TOTAL; l.t1 = l.v1 / TOTAL; l.t2 = l.v2 / TOTAL; }
  const vp = x => x / TOTAL;               // a stretch of vh as progress
  const START = [8, 18];                   // where the blank globe faces as the page opens
  const legEase = l => l.mode === 'flight' ? ease : smooth;
  /* progress at which a leg's traveller has gone fraction s of the way */
  function pAt(l, s) {
    const e = legEase(l);
    let a = 0, b = 1;
    for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (e(m) < s) a = m; else b = m; }
    return lerp(l.t0, l.t1, (a + b) / 2);
  }

  /* ---- where each country is painted: the border crossing, or the arrival ---- */
  const events = [];            // {a3, p, ll, lived, date}
  function findEvents() {
    events.length = 0;
    const seen = new Set();
    const add = (a3, p, ll) => { if (!a3 || seen.has(a3)) return; seen.add(a3); events.push({a3, p, ll, lived: LIVED.has(a3)}); };
    add('CZE', T.home[0] + vp(8), CITY.PRG.ll);
    for (const l of legs) {
      if (l.mode !== 'flight') {
        let prev = cityA3(l.from);
        for (let i = 0; i < l.path.pts.length; i += 2) {
          const ll = toLL(l.path.pts[i]), a3 = countryAt(ll[0], ll[1]);
          if (a3 && a3 !== prev) {
            if (!(l.at && a3 in l.at)) add(a3, pAt(l, l.path.cum[i] / l.path.km), ll);
            prev = a3;
          }
        }
        for (const [a3, s] of Object.entries(l.at || {})) add(a3, pAt(l, s), toLL(along(l.path, s).v));
      }
      add(cityA3(l.to), l.t1, CITY[l.to].ll);
    }
    events.sort((a, b) => a.p - b.p);
    // a date for each stamp: the tour runs from early June, a few days a country
    const d0 = Date.UTC(2026, 5, 2);
    events.forEach((e, i) => {
      const d = new Date(d0 + Math.round(i * 2.6) * 864e5);
      e.date = `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
    });
  }

  /* ---- sizes ---- */
  let vw = 0, vh = 0, R0 = 0, cy0 = 0, R1 = 0, dpr = 1, PW = 600, phoneH = 612, FL = null, BIG = null;
  function measure() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    if (RM) {
      // the still: the open passport at a fixed size in the page's own flow
      PW = Math.round(Math.min(400, vw * .84));
      for (const b of [pass, passUp, passFrame]) b.style.setProperty('--pw', PW + 'px');
      drawMap(!!mapCanvas.dataset.summer);
      drawStill();
      return;
    }
    for (const c of [sky, over]) { c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr); }
    globe.resize();
    // the blank globe sits under the headline, however wide the screen
    R0 = Math.max(vw, vh) * .62;
    const heroBottom = heroCopy.offsetTop + heroCopy.offsetHeight;
    cy0 = Math.max(vh + R0 * .6, heroBottom + 34 + R0);
    R1 = Math.min(vw * (vw < 700 ? .42 : .34), vh * .36);
    // the passport is laid out at its largest (open, behind the globe) and scaled down from there
    PW = Math.round(Math.min(vh * .8, vw * .92 / 1.4));
    for (const b of [pass, passUp]) b.style.setProperty('--pw', PW + 'px');
    const PH = PW * .7;
    BIG = {
      PH,
      dockR: PH * .36,
      closedS: Math.min(vh * .62, vw * .7 * 1.43) / PW,           // the closed booklet, about two thirds of the height
      openS: Math.min(vh * .72 / PW, vw * .9 / (PW * 1.4)),       // the open spread, book-wise
      appS: Math.min(vh * .82 / (PW * 1.4), vw * .86 / PW),       // turned to the data page
    };
    // the end: the closing line on top, the passport and the phone under it, overlapping at a corner
    const outroBottom = outro.offsetTop + outro.offsetHeight;
    const room = vh - outroBottom - 26;
    phoneH = phone.offsetHeight;
    const phoneW = phone.offsetWidth;
    if (vw >= 700) {
      // the phone a little lower and to the right, so only its corner lies over the passport's
      const Hp = Math.min(room * .82, 540), Wp = Hp / 1.4;
      const ps = Math.min(1, Hp * .96 / phoneH), Wph = phoneW * ps;
      const groupW = Wp + Wph * .86;
      const cy = outroBottom + 12 + room / 2 - vh / 2;
      FL = {passX: -groupW / 2 + Wp / 2, passY: cy - room * .05, passS: Hp / (PW * 1.4), passR: -5,
            phoneX: groupW / 2 - Wph / 2, phoneY: cy + room * .1, phoneS: ps, phoneR: 7};
    } else {
      const Hp = Math.min(room * .76, vw * .72 * 1.4);
      const ps = Math.min(.5, Hp * .6 / phoneH);
      const cy = outroBottom + 12 + room / 2 - vh / 2;
      FL = {passX: -vw * .07, passY: cy - Hp * .06, passS: Hp / (PW * 1.4), passR: -4,
            phoneX: vw * .28, phoneY: cy + Hp * .22, phoneS: ps, phoneR: 7};
    }
    drawMap(!!mapCanvas.dataset.summer);
    dirty = true;
  }
  /* with reduced motion, the globe is drawn once, the whole tour on it */
  let stillReady = false;
  function drawStill() {
    if (!stillReady || !globe.data || !WORLD) return;
    paintAt(globe, 1, true);
    globe.resize();
    globe.draw({cx: globe.w / 2, cy: globe.h / 2, R: Math.min(globe.w, globe.h) * .4, lon: 30, lat: 42, alpha: 1});
  }

  /* ---- the passport, as a booklet: open, its spine runs down the middle. The leaf
         on the left carries the data page inside and the cover outside; it shuts over
         the right-hand page, the stamps. Each page is laid out the way the app shows it
         (landscape, `.pg-rot`) and turned a quarter, so it reads upright once the open
         book is turned to the app's top-and-bottom spread. ---- */
  const stampCells = [];
  const globeSvg = '<svg viewBox="8 8 48 48" aria-hidden="true"><circle cx="32" cy="32" r="22"/><ellipse cx="32" cy="32" rx="9.5" ry="22"/><path d="M10 32h44M13.5 21h37M13.5 43h37"/></svg>';
  const chipSvg = '<svg viewBox="0 0 40 26" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="23" rx="4"/><circle cx="20" cy="13" r="5.5"/><path d="M1.5 13h13M25.5 13h13"/></svg>';
  pass.innerHTML = `
    <div class="bk-right">
      <div class="bk-board"></div>
      <div class="bk-page"><div class="pg-rot sp"><p class="sp-head">Entries · Vstupy · 입국</p><div class="sp-grid" id="spGrid"></div><span class="sp-no">3</span></div></div>
    </div>`;
  passUp.innerHTML = `
    <div class="bk-leaf" id="passLeaf">
      <div class="bk-face bk-front">
        <div class="bk-board"></div>
        <div class="bk-page"><div class="pg-rot dp">
          <div class="dp-head"><div><p class="dp-title">Peregrino Passport</p><p class="dp-sub">Passport · Pas · 여권</p></div><span class="dp-btn">${ART.glyph('globe', '#fff', 14)}</span></div>
          <div class="dp-body">
            <div>
              <p class="dp-k">Countries &amp; territories</p>
              <p class="dp-big"><b id="dpCount">0</b><span> / 248</span><em id="dpPct">(0%)</em></p>
              <div class="dp-row"><div><p class="dp-k">Continents</p><p class="dp-v"><b id="dpCont">0</b><span> / 7</span></p></div><div><p class="dp-k">Total trips</p><p class="dp-v" id="dpTrips">0</p></div></div>
              <div class="dp-row"><div><p class="dp-k">Top continent</p><p class="dp-v" id="dpTop">—</p></div><div><p class="dp-k">Member since</p><p class="dp-v">Apr 2026</p></div></div>
            </div>
            <div class="dp-map"><p class="dp-k">Map · Mapa · 지도</p><canvas id="dpMap"></canvas></div>
          </div>
          <p class="mrz">P&lt;PGNTRAVELER&lt;&lt;PEREGRINO&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br>ISSUED01OCT26&lt;&lt;&lt;32V&lt;&lt;&lt;248T&lt;&lt;&lt;EU&lt;AS&lt;NA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</p>
        </div></div>
      </div>
      <div class="bk-face bk-back cover">
        <p class="cover-name">Peregrino</p>
        <span class="cover-emblem">${globeSvg}</span>
        <p class="cover-kind">Passport · Pas · 여권</p>
        <span class="cover-chip">${chipSvg}</span>
      </div>
    </div>`;
  const dpCount = $('#dpCount'), dpPct = $('#dpPct'), dpTrips = $('#dpTrips'), dpCont = $('#dpCont'), dpTop = $('#dpTop'), mapCanvas = $('#dpMap');
  const passLeaf = $('#passLeaf');
  // with reduced motion both halves sit together in the page's flow, in one frame
  const passFrame = RM ? document.createElement('div') : null;
  if (passFrame) { passFrame.className = 'pass-frame'; stage.appendChild(passFrame); passFrame.append(pass, passUp); }
  function fillStamps() {
    const grid = $('#spGrid');
    grid.innerHTML = '';
    stampCells.length = 0;
    for (const a3 of PAGE_STAMPS) {
      const e = events.find(x => x.a3 === a3);
      if (!e) continue;
      const cell = document.createElement('div');
      cell.className = 'sp-cell';
      const s = ART.stampEl(a2of(a3), 100, {dark: true, date: e.date, style: e.lived ? 'lived' : 'inked'});
      cell.appendChild(s);
      grid.appendChild(cell);
      stampCells.push(s);
    }
  }
  /* the data page: blank as issued, then everything the globe took in once it has been swallowed */
  let filled = null;
  function fillPage(on) {
    if (filled === on) return;
    filled = on;
    const n = on ? events.length : 0;
    dpCount.textContent = n;
    dpPct.textContent = `(${Math.round(n / 248 * 100)}%)`;
    dpTrips.textContent = on ? 16 : 0;
    dpCont.textContent = on ? 3 : 0;
    dpTop.textContent = on ? 'Europe' : '—';
    drawMap(on);
  }
  /* the data page's map: Mercator, visited in white, the rest traced faintly */
  const MERC = {top: 80, bottom: -58};
  const merc = lat => Math.log(Math.tan(Math.PI / 4 + clamp(lat, -85, 85) * D2R / 2));
  function drawMap(withTour) {
    if (!WORLD || !mapCanvas) return;
    const w = mapCanvas.clientWidth;
    if (!w) return;
    const h = Math.round(w / (2 * Math.PI / (merc(MERC.top) - merc(MERC.bottom))));
    mapCanvas.style.height = h + 'px';
    const k = Math.min(2, dpr * 1.5);
    mapCanvas.width = Math.round(w * k); mapCanvas.height = Math.round(h * k);
    const c = mapCanvas.getContext('2d');
    c.setTransform(k, 0, 0, k, 0, 0);
    const on = new Set(withTour ? events.map(e => e.a3) : []);
    const top = merc(MERC.top), span = top - merc(MERC.bottom);
    c.lineWidth = .5; c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineJoin = 'round';
    for (const K of WORLD) {
      if (K.a3 === 'ATA') continue;
      c.beginPath();
      for (const r of K.r) {
        for (let i = 0; i < r.length; i += 2) {
          const x = (r[i] + 180) / 360 * w, y = (top - merc(r[i + 1])) / span * h;
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath();
      }
      if (on.has(K.a3)) { c.fillStyle = '#fff'; c.fill('evenodd'); } else { c.fillStyle = 'rgba(255,255,255,.07)'; c.fill('evenodd'); c.stroke(); }
    }
    mapCanvas.dataset.summer = withTour ? '1' : '';
  }

  /* ---- stars on a sphere round the globe, so they wheel as it turns (the app's starfield) ---- */
  const STARS = [];
  {
    let s = 9;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 1100; i++) {
      const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
      STARS.push({v: [r * Math.cos(a), r * Math.sin(a), z], b: .35 + rnd() * .65, big: rnd() < .08, warm: rnd()});
    }
  }
  function drawSky(basis, fade) {
    skx.setTransform(dpr, 0, 0, dpr, 0, 0);
    skx.clearRect(0, 0, vw, vh);
    if (fade <= 0) return;
    const F = Math.max(vw, vh) * .9, cx = vw / 2, cy = vh / 2;
    for (const st of STARS) {
      const z = dot(st.v, basis.c);
      if (z > -.15) continue;
      const x = cx + dot(st.v, basis.e) / -z * F, y = cy - dot(st.v, basis.n) / -z * F;
      if (x < -2 || y < -2 || x > vw + 2 || y > vh + 2) continue;
      skx.globalAlpha = st.b * fade;
      skx.fillStyle = st.warm > .7 ? '#fff4e6' : st.warm < .3 ? '#e8f0ff' : '#fff';
      const r = st.big ? 1.4 : .85;
      skx.fillRect(x - r / 2, y - r / 2, r, r);
    }
    skx.globalAlpha = 1;
  }

  /* ---- planes and ships on their own clock (the app's fleet) ---- */
  const FLEET = [];
  {
    let s = 21;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 8; i++) {
      const p = vec([rnd() * 300 - 150, rnd() * 50 + 10]), q = vec([rnd() * 360 - 180, rnd() * 120 - 60]);
      FLEET.push({kind: 'plane', p, ax: norm3(cross(p, q)), w: .028 + rnd() * .02, ph: rnd() * Math.PI * 2, c: AIRLINES[i % AIRLINES.length]});
    }
    for (const [lon, lat, hd] of [[-30, 45, 40], [-20, 30, -30], [4, 55.5, 10], [18, 34.5, 80], [-45, 25, 60], [150, 30, 20], [-150, 25, -10], [88, 12, 30]]) {
      const p = vec([lon, lat]), t = vec([lon + Math.cos(hd * D2R) * 4, lat + Math.sin(hd * D2R) * 4]);
      FLEET.push({kind: 'ship', p, ax: norm3(cross(p, t)), ph: rnd() * 6});
    }
  }

  /* ---- drawing on the overlay ---- */
  const proj = (v, lift, view) => { const ll = toLL(v); return globe.project(ll[0], ll[1], lift, view); };
  function strokeRun(pts, w, col) {
    ox.lineWidth = w; ox.strokeStyle = col; ox.lineCap = 'round'; ox.lineJoin = 'round';
    ox.beginPath();
    let pen = false;
    for (const q of pts) {
      if (q.vis) { pen ? ox.lineTo(q.x, q.y) : ox.moveTo(q.x, q.y); pen = true; } else pen = false;
    }
    ox.stroke();
  }
  /* routes are decals on the surface, a dark ribbon under a light one (GlobeArcs) */
  function ribbon(path, s1, view, mode, R) {
    const last = Math.max(1, Math.floor(clamp(s1) * (path.pts.length - 1)));
    const step = Math.max(1, Math.floor(last / 400));
    const pts = [];
    for (let i = 0; i <= last; i += step) pts.push(proj(path.pts[i], .001, view));
    pts.push(proj(along(path, s1).v, .001, view));
    const ow = clamp(R * .0085, 2.4, 6.5);
    strokeRun(pts, ow, outer(mode));
    strokeRun(pts, ow * .62, inner(mode));
  }
  function stopDot(ll, view, mode, R) {
    const q = globe.project(ll[0], ll[1], .001, view);
    if (!q.vis) return;
    const r = clamp(R * .011, 3, 7.5);
    ox.fillStyle = outer(mode); ox.beginPath(); ox.arc(q.x, q.y, r, 0, Math.PI * 2); ox.fill();
    ox.fillStyle = inner(mode); ox.beginPath(); ox.arc(q.x, q.y, r * .64, 0, Math.PI * 2); ox.fill();
  }
  /* a thumbtack: a metal shaft out of the surface and a coloured head (GlobePins) */
  function pin(ll, view, color, k, R) {
    if (k <= 0) return;
    const base = globe.project(ll[0], ll[1], 0, view);
    if (!base.vis) return;
    const e = easeOut(k), len = clamp(R * .03, 11, 20) * e, head = clamp(R * .009, 3.6, 6) * (.4 + .6 * e);
    const hx = base.x + len * .32, hy = base.y - len;
    ox.strokeStyle = 'rgba(214,214,220,.95)'; ox.lineWidth = 1.5;
    ox.beginPath(); ox.moveTo(base.x, base.y); ox.lineTo(hx, hy); ox.stroke();
    const g = ox.createRadialGradient(hx - head * .35, hy - head * .35, head * .1, hx, hy, head);
    g.addColorStop(0, '#fff'); g.addColorStop(.3, color); g.addColorStop(1, shade(color, .55));
    ox.fillStyle = g; ox.beginPath(); ox.arc(hx, hy, head, 0, Math.PI * 2); ox.fill();
  }
  const shade = (c, k) => `rgb(${c.match(/\d+/g).map(v => Math.round(v * k))})`;
  /* the app's planes: white fuselage, coloured tail, and a contrail */
  function plane(x, y, ang, size, colors, alpha = 1) {
    ox.save();
    ox.globalAlpha *= alpha;
    ox.translate(x, y); ox.rotate(ang); ox.scale(size / 22, size / 22);
    ox.shadowColor = 'rgba(0,0,0,.35)'; ox.shadowBlur = 4; ox.shadowOffsetY = 2;
    ox.fillStyle = colors[0];
    ox.beginPath();
    ox.moveTo(11, 0); ox.quadraticCurveTo(10, -1.6, 7, -1.7); ox.lineTo(1.5, -1.8); ox.lineTo(-3, -10); ox.lineTo(-5.2, -10);
    ox.lineTo(-2.6, -1.8); ox.lineTo(-8, -1.6); ox.lineTo(-10.4, -4.6); ox.lineTo(-11.6, -4.6); ox.lineTo(-10.6, 0);
    ox.lineTo(-11.6, 4.6); ox.lineTo(-10.4, 4.6); ox.lineTo(-8, 1.6); ox.lineTo(-2.6, 1.8); ox.lineTo(-5.2, 10); ox.lineTo(-3, 10);
    ox.lineTo(1.5, 1.8); ox.lineTo(7, 1.7); ox.quadraticCurveTo(10, 1.6, 11, 0); ox.closePath(); ox.fill();
    ox.shadowColor = 'transparent';
    ox.fillStyle = colors[1];
    ox.beginPath(); ox.moveTo(-8, -1.4); ox.lineTo(-10.4, -4.6); ox.lineTo(-11.6, -4.6); ox.lineTo(-10.6, 0); ox.lineTo(-11.6, 4.6); ox.lineTo(-10.4, 4.6); ox.lineTo(-8, 1.4); ox.closePath(); ox.fill();
    ox.restore();
  }
  function contrail(pts, alpha) {
    ox.lineCap = 'round'; ox.lineWidth = 1.6;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (!a.vis || !b.vis) continue;
      ox.strokeStyle = `rgba(255,255,255,${(alpha * i / pts.length * .8).toFixed(3)})`;
      ox.beginPath(); ox.moveTo(a.x, a.y); ox.lineTo(b.x, b.y); ox.stroke();
    }
  }
  /* the traveller on the ground: the mode's symbol on a white disc */
  const glyphImg = {};
  for (const m of ['drive', 'walk', 'train', 'flight', 'ferry', 'bus']) {
    const i = new Image();
    i.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(ART.glyph(m, `rgb(${TINT[m].map(v => Math.round(v * .78))})`, 48).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
    glyphImg[m] = i;
  }
  function badge(x, y, mode, scale = 1) {
    const r = 13 * scale;
    ox.save();
    ox.shadowColor = 'rgba(0,0,0,.35)'; ox.shadowBlur = 8; ox.shadowOffsetY = 2;
    ox.fillStyle = '#fff'; ox.beginPath(); ox.arc(x, y, r, 0, Math.PI * 2); ox.fill();
    ox.restore();
    ox.strokeStyle = outer(mode); ox.lineWidth = 2; ox.beginPath(); ox.arc(x, y, r, 0, Math.PI * 2); ox.stroke();
    const img = glyphImg[mode];
    if (img && img.complete && img.naturalWidth) ox.drawImage(img, x - r * .62, y - r * .62, r * 1.24, r * 1.24);
  }

  /* ---- the state of the tour at p ---- */
  function journeyAt(p) {
    let cur = -1;
    for (let i = 0; i < legs.length; i++) if (p >= legs[i].t0) cur = i;
    const out = {cur, phase: 'home', s: 0, km: 0};
    for (const l of legs) {
      if (p >= l.t1) out.km += l.path.km;
      else if (p > l.t0) out.km += l.path.km * legEase(l)(seg(p, l.t0, l.t1));
    }
    if (cur >= 0) {
      const l = legs[cur];
      out.phase = p < l.t1 ? 'move' : 'dwell';
      out.s = legEase(l)(seg(p, l.t0, l.t1));
    }
    return out;
  }
  /* the camera follows the traveller: close in on the ground (closer on a short hop),
     further out in the air, furthest out across an ocean */
  const zoomFor = (l, s) => l.mode === 'flight'
    ? 1.45 * (1 - .32 * Math.sin(Math.PI * s) * Math.min(1, l.d / .45))
    : clamp(8.6 * Math.sqrt(450 / Math.max(l.path.km, 1)), 4.8, 8.6) * (vw < 700 ? 1.06 : 1);
  const logLerp = (a, b, t) => Math.exp(lerp(Math.log(a), Math.log(b), t));
  function cameraAt(p, J) {
    if (J.cur < 0) return {v: vec(CITY.PRG.ll), Z: 1.9};
    const l = legs[J.cur];
    const prevZ = J.cur === 0 ? 1.9 : zoomFor(legs[J.cur - 1], 1);
    if (J.phase === 'move') {
      const u = seg(p, l.t0, l.t1);
      return {v: along(l.path, J.s).v, Z: logLerp(prevZ, zoomFor(l, J.s), ease(seg(u, 0, .16)))};
    }
    return {v: vec(CITY[l.to].ll), Z: zoomFor(l, 1)};
  }

  /* ---- painting: nothing at first, then each country as the tour reaches it ---- */
  const PAINT = vp(8);
  function paintAt(g, p, all) {
    for (const e of events) g.paint(e.a3, e.lived ? INK.lived : INK.visited, all ? 1 : smooth(seg(p, e.p, e.p + PAINT)));
  }

  /* ---- progress ---- */
  let p = 0, dirty = true, running = false, raf = 0, spinT = 0, last = performance.now(), overShown = true;
  const progress = () => { const r = story.getBoundingClientRect(); return clamp(-r.top / (r.height - vh)); };
  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    const np = progress();
    if (np !== p) { p = np; dirty = true; }
    if (!RM && p < T.home[0]) spinT += dt * .0035 * (1 - seg(p, vp(10), T.home[0]));
    // the fleet keeps flying while the globe is up
    if (p < T.shut[1]) dirty = true;
    if (dirty) { render(now); dirty = false; }
    raf = running ? requestAnimationFrame(frame) : 0;
  }

  const POP = vp(15), FRESH = vp(12);
  function render(now) {
    /* headline */
    const ho = seg(p, T.heroOut[0], T.heroOut[1]);
    heroCopy.style.opacity = 1 - ho;
    heroCopy.style.transform = `translate(-50%, ${-ho * 40}px)`;
    heroCopy.classList.toggle('is-through', ho > .3);

    const J = journeyAt(p);
    /* camera: the rise, the tour, the pull-back */
    const rise = ease(seg(p, T.rise[0], T.rise[1]));
    const cam = cameraAt(p, J);
    let v = cam.v, Z = cam.Z;
    if (p < T.home[1]) {
      v = slerp(vec([START[0] + spinT, START[1]]), vec(CITY.PRG.ll), ease(seg(p, vp(10), T.home[0] + vp(10))));
      Z = 1.9;
    }
    let R = R1 * Z, cx = vw / 2, cy = vh * .53;
    if (rise < 1) {
      R = logLerp(R0, R1 * 1.9, rise);
      cy = lerp(cy0, vh * .53, rise);
    }
    const st = ease(seg(p, T.settle[0], T.settle[1]));
    if (st > 0) {
      // the whole world, turning slowly to show what the tour painted
      const turnLon = 4 + 60 * seg(p, T.settle[0], T.dock[1]);
      v = slerp(v, vec([turnLon, 38]), st);
      R = logLerp(R, R1 * 1.1, st);
      cy = lerp(cy, vh * .5, st);
    }
    let [lon, lat] = toLL(v);

    /* ---- the passport ---- */
    const bin = ease(seg(p, T.bookIn[0], T.bookIn[1]));
    const shutT = seg(p, T.shut[0], T.shut[1]);
    const gulp = seg(p, T.gulp[0], T.gulp[1]);
    const cl = ease(seg(p, T.closed[0], T.closed[1]));
    const reT = seg(p, T.reopen[0], T.reopen[1]), re = ease(reT);
    const tu = ease(seg(p, T.turn[0], T.turn[1]));
    const popT = seg(p, T.pop[0], T.pop[1]);
    const sd = ease(seg(p, T.side[0], T.side[1]));
    const PH = BIG.PH;
    // the leaf: open (0°), shut over the right page (180°), open again
    const shutA = 180 * Math.pow(shutT, 2.2);                       // lifts slowly, then snaps
    const leafA = reT > 0 ? 180 * (1 - springOut(reT)) : shutA;
    // the book: scale, where it sits, how far it has turned
    let bs = lerp(.55, 1, bin), bx = 0, by = lerp(vh * .55, 0, bin), br = 0;
    bs *= 1 + .05 * Math.sin(Math.PI * gulp);                       // the gulp
    bs = lerp(bs, BIG.closedS, cl);
    bx = lerp(bx, -PH / 2 * bs, cl);                                // the closed half to the middle
    bs = lerp(bs, BIG.openS, re);
    bx = lerp(bx, 0, re);
    bs = lerp(bs, BIG.appS, tu);
    br = lerp(br, 90, tu);
    bs *= 1 + .1 * Math.sin(Math.PI * popT);                        // the pop
    bs = lerp(bs, FL.passS, sd);
    bx = lerp(bx, FL.passX, sd); by = lerp(by, FL.passY, sd); br = lerp(br, 90 + FL.passR, sd);
    const tilt = Math.sin(Math.PI * popT) * 10;                     // leaning out of the page as it pops
    const bookT = `translate3d(${bx}px, ${by}px, 0) perspective(${PW * 4}px) rotateX(${tilt}deg) rotate(${br}deg) scale(${bs})`;
    const bookA = Math.min(1, bin * 1.6);
    for (const b of [pass, passUp]) { b.style.transform = bookT; b.style.opacity = bookA; }
    passLeaf.style.transform = `rotateY(${leafA}deg)`;
    passLeaf.style.setProperty('--shade', (Math.abs(Math.sin(leafA * D2R)) * .5).toFixed(3));
    // what the pages say: blank as issued, full once the globe has gone in
    if (WORLD) fillPage(p >= T.gulp[0]);

    /* the globe settles onto the right-hand page and is swallowed with it */
    const dock = ease(seg(p, T.dock[0], T.dock[1]));
    let galpha = 1;
    if (dock > 0) {
      const rx = vw / 2 + bx + PH / 2 * bs, ry = vh / 2 + by;
      cx = lerp(cx, rx, dock); cy = lerp(cy, ry, dock); R = logLerp(R, BIG.dockR * bs, dock);
      // squashed as the leaf comes down on it, gone once it has shut
      R *= 1 - .18 * seg(shutA, 120, 180);
      galpha = 1 - seg(shutA, 150, 178);
    }
    const view = {cx, cy, R, lon, lat, alpha: galpha, atmosphere: 1 - seg(shutA, 60, 140)};
    if (!failed) {
      paintAt(globe, p);
      globe.draw(view);
    }
    drawSky(GL.viewBasis(lon, lat), 1 - seg(p, T.bookIn[0], T.shut[1]) * .55);

    /* overlay: the fleet, the routes, the stops, the traveller */
    ox.setTransform(dpr, 0, 0, dpr, 0, 0);
    ox.clearRect(0, 0, vw, vh);
    const overA = (1 - seg(p, T.dock[0], T.dock[0] + vp(14))) * seg(p, T.rise[0] + vp(20), T.rise[1]);
    // hidden rather than left blank once there's nothing on it, so a cleared
    // canvas can never linger on screen with its last frame
    const overOn = overA > 0 && !!globe.data;
    if (overOn !== overShown) { overShown = overOn; over.style.visibility = overOn ? '' : 'hidden'; }
    if (overOn) {
      ox.globalAlpha = overA;
      const tt = now / 1000;
      for (const f of FLEET) {
        if (f.kind === 'plane') {
          const a = f.ph + tt * f.w, pos = rot(f.p, f.ax, a), ahead = rot(f.p, f.ax, a + .02);
          const q = proj(pos, .035, view), q2 = proj(ahead, .035, view);
          if (!q.vis || q.z < .15) continue;
          const trail = [];
          for (let k = 12; k >= 0; k--) trail.push(proj(rot(f.p, f.ax, a - k * .012), .035, view));
          contrail(trail, .7 * clamp(q.z * 3));
          plane(q.x, q.y, Math.atan2(q2.y - q.y, q2.x - q.x), clamp(R * .03, 10, 20), f.c, clamp(q.z * 4));
        } else {
          const sw = Math.sin(tt * .08 + f.ph) * .05, dir = Math.sign(Math.cos(tt * .08 + f.ph)) || 1;
          const q = proj(rot(f.p, f.ax, sw), .001, view), q2 = proj(rot(f.p, f.ax, sw + .01 * dir), .001, view);
          if (!q.vis || q.z < .2) continue;
          const L = clamp(R * .02, 5, 12);
          ox.save(); ox.translate(q.x, q.y); ox.rotate(Math.atan2(q2.y - q.y, q2.x - q.x));
          ox.strokeStyle = 'rgba(255,255,255,.55)'; ox.lineWidth = 1;
          ox.beginPath(); ox.moveTo(-L * .6, 0); ox.lineTo(-L * 2.2, -L * .5); ox.moveTo(-L * .6, 0); ox.lineTo(-L * 2.2, L * .5); ox.stroke();
          ox.fillStyle = 'rgb(64,64,77)'; ox.fillRect(-L / 2, -L * .16, L, L * .32);
          ox.fillStyle = 'rgba(230,230,230,.95)'; ox.fillRect(-L * .25, -L * .1, L * .45, L * .2);
          ox.restore();
        }
      }
      for (let i = 0; i <= J.cur; i++) ribbon(legs[i].path, i === J.cur ? J.s : 1, view, legs[i].mode, R);
      stopDot(CITY.PRG.ll, view, 'drive', R);
      for (let i = 0; i <= J.cur; i++) {
        const l = legs[i], s = i === J.cur ? J.s : 1;
        for (const sp of l.stops) if (s >= sp.s) stopDot(sp.ll, view, l.mode, R);
        if (i < J.cur || J.phase === 'dwell') stopDot(CITY[l.to].ll, view, l.mode, R);
      }
      pin(CITY.PRG.ll, view, 'rgb(224,162,26)', seg(p, T.home[0], T.home[0] + vp(6)), R);
      for (let i = 0; i <= J.cur; i++) {
        const l = legs[i];
        if (l.home) continue;
        const a3 = cityA3(l.to);
        pin(CITY[l.to].ll, view, LIVED.has(a3) ? 'rgb(224,162,26)' : 'rgb(217,69,59)', seg(p, l.t1, l.t1 + vp(6)), R);
      }
      if (J.cur >= 0 && J.phase === 'move') {
        const l = legs[J.cur], at = along(l.path, J.s), ahead = along(l.path, Math.min(1, J.s + .01));
        if (l.mode === 'flight') {
          const lift = s => .012 + .03 * Math.sin(Math.PI * s);
          const q = proj(at.v, lift(J.s), view), q2 = proj(ahead.v, lift(J.s), view);
          if (q.vis) {
            const trail = [];
            for (let k = 14; k >= 0; k--) { const s0 = Math.max(0, J.s - k * .012); trail.push(proj(along(l.path, s0).v, lift(s0), view)); }
            contrail(trail, .9);
            plane(q.x, q.y, Math.atan2(q2.y - q.y, q2.x - q.x), clamp(R * .045, 18, 30), AIRLINES[l.air || 0]);
          }
        } else {
          const q = proj(at.v, .002, view);
          if (q.vis) badge(q.x, q.y, l.mode, vw < 700 ? .85 : 1);
        }
      }
      ox.globalAlpha = 1;
    }

    /* instruments */
    const hudOn = seg(p, T.home[0] - vp(10), T.home[0] + vp(6)) * (1 - seg(p, T.settle[0], T.settle[0] + vp(14)));
    hud.style.opacity = hudOn;
    hudShade.style.opacity = hudOn;
    leg.style.opacity = hudOn;
    let count = 0;
    for (const e of events) if (p >= e.p + vp(2)) count++;
    hudC.textContent = count;
    hudW.textContent = Math.round(count / 248 * 100) + '%';
    hudK.textContent = fmt(J.km);
    let text, mode = 'drive';
    const fresh = events.filter(e => p >= e.p && p < e.p + FRESH).pop();
    if (fresh) {
      text = fresh.a3 === 'CZE' ? 'Prague · home' : `${nameOf(fresh.a3)} · ${fresh.lived ? 'lived here' : 'new country'}`;
      if (J.cur >= 0) mode = legs[J.cur].mode;
    } else if (J.cur < 0) text = 'Prague · home';
    else {
      const l = legs[J.cur]; mode = l.mode;
      if (J.phase === 'move') text = `${l.title} · ${CITY[l.from].n} → ${CITY[l.to].n}`;
      else text = l.home ? 'Prague · home again' : CITY[l.to].n;
    }
    if (legText.textContent !== text) legText.textContent = text;
    if (legGlyph.dataset.m !== mode) { legGlyph.dataset.m = mode; legGlyph.innerHTML = ART.glyph(mode, `rgb(${TINT[mode].map(x => Math.round(x * .78))})`, 14); }

    /* the stamp that lands with each new country (StampThump: 2.2× → 0.92 → 1) */
    const ev = events.filter(e => p >= e.p - vp(.5)).pop();
    if (ev && p < ev.p + POP && globe.data && p < T.settle[0]) {
      const tau = seg(p, ev.p, ev.p + POP);
      if (pop.dataset.a3 !== ev.a3) {
        pop.dataset.a3 = ev.a3;
        pop.innerHTML = '';
        pop.appendChild(ART.stampEl(a2of(ev.a3), 120, {date: ev.date, style: ev.lived ? 'lived' : 'inked'}));
      }
      const q = globe.project(ev.ll[0], ev.ll[1], 0, view);
      const size = clamp(Math.min(vw, vh) * .17, 92, 150);
      pop.style.width = size + 'px';
      pop.firstChild.style.width = size + 'px'; pop.firstChild.style.height = size * 1.15 + 'px';
      const k = seg(tau, 0, .3);
      const sc = k < .6 ? lerp(2.2, .92, easeIn(k / .6)) : lerp(.92, 1, easeOut((k - .6) / .4));
      const x = clamp((q.vis ? q.x : vw / 2) + size * .15, 12, vw - size - 12), y = clamp((q.vis ? q.y : vh / 2) - size * 1.25, 90, vh - size * 1.2 - 70);
      pop.style.opacity = Math.min(1, k * 5) * (1 - seg(tau, .78, 1));
      pop.style.transform = `translate(${x}px, ${y}px) rotate(${lerp(-4, 0, k)}deg) scale(${sc})`;
    } else pop.style.opacity = 0;

    /* six of the tour's stamps land on the stamp page */
    const n = stampCells.length;
    stampCells.forEach((el, i) => {
      const a = lerp(T.stamps[0], T.stamps[1], i / Math.max(1, n)), b = a + (T.stamps[1] - T.stamps[0]) / Math.max(1, n) * .8;
      const k = seg(p, a, b);
      const sc = k < .5 ? lerp(2.2, .92, easeIn(k / .5)) : lerp(.92, 1, easeOut((k - .5) / .5));
      el.style.opacity = Math.min(1, k * 4);
      el.style.transform = `rotate(calc(var(--tilt) + ${lerp(-4, 0, k)}deg)) scale(${k > 0 ? sc : 2.2})`;
    });

    /* the phone slides in beside it, both a little askew, overlapping at a corner */
    phone.style.opacity = Math.min(1, sd * 2);
    phone.style.transform = `translate3d(${lerp(vw * .55, FL.phoneX, sd)}px, ${lerp(vh * .12, FL.phoneY, sd)}px, 0) rotate(${lerp(18, FL.phoneR, sd)}deg) scale(${FL.phoneS})`;
    const oo = seg(p, T.outro[0], T.outro[1]);
    outro.style.opacity = oo;
    outro.style.transform = `translate(-50%, ${(1 - easeOut(oo)) * 24}px)`;
  }

  /* ---- the nudge: stop half way and a small "keep scrolling" turns up ---- */
  let nudgeTimer = 0;
  addEventListener('scroll', () => {
    nudge.classList.remove('is-on');
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => { if (p > .02 && p < T.side[0]) nudge.classList.add('is-on'); }, 900);
  }, {passive: true});

  const worldReady = Promise.all([GL.countries(), ART.ready]).then(([list]) => {
    prepWorld(list);
    findEvents();
    fillStamps();
    filled = null;
    fillPage(RM);
    dirty = true;
  });
  worldReady.catch(() => {});
  globe.ready.catch(() => { failed = true; });
  globe.onrestore = () => { dirty = true; };
  addEventListener('resize', measure);
  measure();
  if (document.fonts) document.fonts.ready.then(() => { measure(); });
  if (RM) {
    // a still: the tour's globe, and under it the open passport with its stamps beside the phone
    stillReady = true;
    worldReady.then(() => {
      stampCells.forEach(el => { el.style.opacity = 1; el.style.transform = 'rotate(var(--tilt))'; });
      drawMap(true);
    }).catch(() => {});
    Promise.all([globe.ready, worldReady]).then(drawStill).catch(() => {});
    return;
  }
  new IntersectionObserver(es => {
    running = es[es.length - 1].isIntersecting;
    if (running && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }).observe(story);
}

/* -------------------------------------------------------------
   2. THE TOUR
   ------------------------------------------------------------- */
const tour = $('#tour');
if (tour) guard('tour', initTour);

function initTour() {
  const rig = $('#rig'), screen = $('#tourScreen'), back = $('#artsBack'), front = $('#artsFront');
  const stops = $$('.stop');

  /* ---- the screens: for the globe pages a live globe on top and the page
         under it (cut from the prototype); the others whole ---- */
  const LIVE = {
    today:   {lon: 16.4, lat: 47.6, r: 1.7, pill: 'Vienna · located 2 hours ago', loc: [16.37, 48.21]},
    journal: {lon: 9.6, lat: 53.2, r: 2.4, pill: 'Pureflow weekend · Netherlands, Denmark', routes: [[[14.42, 50.08], [4.90, 52.37]], [[4.90, 52.37], [12.57, 55.68]]], only: ['NLD', 'DNK']},
    tickets: {lon: 62, lat: 40, r: .43, pill: '13 journeys · 23,805 km', routes: [[[14.42, 50.08], [4.90, 52.37]], [[4.90, 52.37], [12.57, 55.68]], [[-0.45, 51.47], [126.45, 37.46]], [[126.45, 37.46], [113.9, 22.3]], [[126.45, 37.46], [140.39, 35.77]], [[14.42, 50.08], [-9.14, 38.72]], [[16.37, 48.21], [126.45, 37.46]]]},
    stats:   {lon: 42, lat: 24, r: .41, pill: '32 countries · 13%'},
  };
  const SHEETS = {today: 'today-sheet.webp', journal: 'journal-sheet.webp', tickets: 'tickets-sheet.webp', stats: 'stats-sheet.webp'};
  const FULL = {place: 'place.jpg'};
  const layers = {};
  const live = document.createElement('div');
  live.className = 'scr scr-live';
  live.innerHTML = `<div class="pane"><canvas class="mini"></canvas><canvas class="mini-over"></canvas>
      <div class="pane-chrome">
        <div class="pane-status"><span>9:41</span><svg viewBox="0 0 64 14"><rect x="0" y="8" width="3.2" height="5" rx="1"/><rect x="5" y="6" width="3.2" height="7" rx="1"/><rect x="10" y="3.5" width="3.2" height="9.5" rx="1"/><rect x="15" y="1" width="3.2" height="12" rx="1"/><path d="M28.5 4.2a9 9 0 0 1 12 0l-1.3 1.4a7 7 0 0 0-9.4 0Zm2.6 2.8a5.2 5.2 0 0 1 6.8 0l-1.3 1.4a3.3 3.3 0 0 0-4.2 0Zm3.4 3.4 1.4-1.4-1.4-.9-1.4.9Z"/><rect x="45" y="2" width="16" height="10" rx="2.8" fill="none" stroke="#fff" stroke-width="1.1" opacity=".5"/><rect x="46.6" y="3.6" width="12.8" height="6.8" rx="1.6"/><path d="M62.4 5.6v3a1.6 1.6 0 0 0 0-3Z" opacity=".5"/></svg></div>
        <span class="pane-layers"><svg viewBox="0 0 24 24"><path d="M12 3 2.5 8.2 12 13.4l9.5-5.2Z"/><path d="m2.5 12.2 9.5 5.2 9.5-5.2"/><path d="m2.5 16.2 9.5 5.2 9.5-5.2"/></svg></span>
        <span class="pane-pill" id="panePill"></span>
      </div></div><span class="pane-handle"></span>`;
  screen.appendChild(live);
  for (const [k, f] of Object.entries(SHEETS)) {
    const d = document.createElement('div');
    d.className = 'scr';
    d.innerHTML = `<img class="scr-sheet" src="assets/screens/${f}" alt="" style="top:50.55%;height:49.45%">`;
    screen.appendChild(d); layers[k] = d;
  }
  for (const [k, f] of Object.entries(FULL)) {
    const d = document.createElement('div');
    d.className = 'scr scr-full';
    d.innerHTML = `<img src="assets/screens/${f}" alt="" loading="lazy">`;
    screen.appendChild(d); layers[k] = d;
  }
  const pill = $('#panePill');
  const miniCanvas = live.querySelector('.mini'), miniOver = live.querySelector('.mini-over'), mo = miniOver.getContext('2d');
  const mini = GL.create(miniCanvas, {hiRes: false});
  {
    // a scatter of stars behind the whole-globe views
    const c = document.createElement('canvas'); c.width = c.height = 220;
    const x = c.getContext('2d'); let s = 5;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) { x.globalAlpha = .3 + rnd() * .6; x.fillStyle = '#fff'; x.fillRect(rnd() * 220, rnd() * 220, rnd() < .1 ? 1.6 : 1, rnd() < .1 ? 1.6 : 1); }
    live.querySelector('.pane').style.background = `#000 url(${c.toDataURL()}) 0 0 / 110px 110px`;
  }

  /* ---- the tickets: a hand of them, stood on end and fanned out from behind the
         phone, newest at the front. The printer slides down out of the Dynamic
         Island and feeds a new one out of its slot, short edge first, stub
         leading; torn off, it flies to the front of the hand ---- */
  const KINDS = {
    flight:  {mode: 'flight', ref: 'KL 1356', from: {code: 'PRG', sub: 'Prague · Václav Havel'}, to: {code: 'AMS', sub: 'Amsterdam · Schiphol'}, fields: [['DATE', '17 OCT 2026'], ['BOARDS', '06:35'], ['SEAT', '14A']], day: '17', month: 'OCT', line: '07:05', footer: 'IN 16 DAYS', seed: 'kl1356'},
    train:   {mode: 'train', ref: 'RJ 75', from: {name: 'Praha', sub: 'Praha hlavní nádraží'}, to: {name: 'Wien', sub: 'Wien Hauptbahnhof'}, fields: [['DATE', '24 OCT 2026'], ['DEPARTS', '08:12'], ['SEAT', '41']], day: '24', month: 'OCT', line: '08:12', footer: 'IN 23 DAYS', seed: 'rj75'},
    ferry:   {mode: 'ferry', ref: 'MEGASTAR', from: {code: 'HEL', sub: 'Helsinki · West Harbour'}, to: {code: 'TLL', sub: 'Tallinn · Old City Harbour'}, fields: [['DATE', '2 NOV 2026'], ['SAILS', '07:30'], ['DECK', '7']], day: '02', month: 'NOV', line: '07:30', footer: 'IN 32 DAYS', seed: 'megastar'},
    walk:    {mode: 'walk', from: {name: 'Porto', sub: 'Sé Cathedral'}, to: {name: 'Santiago', sub: 'Praza do Obradoiro'}, fields: [['DATE', '12 JUL 2027'], ['DISTANCE', '260 KM'], ['STARTS', '06:30']], day: '12', month: 'JUL', line: '06:30', footer: 'NEXT JULY', seed: 'camino'},
    concert: {mode: 'concert', kindLabel: 'CONCERT', ref: 'ROYAL ARENA', title: 'Le Sserafim', sub: 'Easy Crazy Hot · Copenhagen', fields: [['DATE', '18 OCT 2026'], ['DOORS', '18:30']], day: '18', month: 'OCT', line: '2026', footer: 'IN 17 DAYS', seed: 'pureflow'},
  };
  // the hand, in the rig's units: tickets HT tall, each turned about a point hidden
  // behind the phone's lower left corner, the newest leaning furthest out; REACH is
  // how far left of the phone the front one comes
  const HAND = {ht: 360, px: 20, py: 600, r: 10, slots: [-24, -14, -4, 6], reach: 200};
  HAND.wt = HAND.ht * 200 / 480;
  const wait = ms => new Promise(r => setTimeout(r, RM ? 0 : ms));
  const stateBtns = $$('#ticketState button');
  const showState = st => stateBtns.forEach(x => x.setAttribute('aria-checked', String(x.dataset.state === st)));
  const printer = {
    kind: 'flight', state: 'booked', busy: false, queue: [], printed: false, root: null, hand: null, deck: [], fs: 1,
    mount(root, hand) {
      this.root = root; this.hand = hand;
      root.innerHTML = `<div class="printer"><span class="printer-slot"></span><span class="printer-led"></span></div><span class="feed-shade"></span><div class="feed"></div>`;
      this.el = root.querySelector('.printer'); this.feed = root.querySelector('.feed');
      // already in the hand: one been and gone, one pencilled in, one booked
      for (const [k, st] of [['train', 'used'], ['walk', 'planned'], ['concert', 'booked']]) this.deck.push(this.card(k, st));
      this.lay();
    },
    // a ticket stood on end in a box HT tall: main part up, stub down
    stood(kind, state) {
      const box = document.createElement('div'), turn = document.createElement('div');
      box.className = 'hand-in'; turn.className = 'hand-turn';
      turn.style.transform = `translate(-50%, -50%) rotate(90deg) scale(${HAND.ht / 480})`;
      turn.appendChild(ART.ticket({...KINDS[kind], state}));
      box.appendChild(turn);
      return box;
    },
    card(kind, state) {
      const c = document.createElement('div');
      c.className = 'hand-tk';
      c.dataset.kind = kind; c.dataset.state = state;
      this.place(c);
      c.appendChild(this.stood(kind, state));
      // a ticket further back comes to the front
      c.addEventListener('click', () => {
        if (this.deck[this.deck.length - 1] === c) return;
        this.deck.splice(this.deck.indexOf(c), 1);
        this.deck.push(c);
        this.lay();
        this.state = c.dataset.state; showState(this.state);
      });
      this.hand.appendChild(c);
      return c;
    },
    place(c) {
      c.style.left = HAND.px - HAND.wt / 2 + 'px'; c.style.top = HAND.py - HAND.r - HAND.ht + 'px';
      c.style.width = HAND.wt + 'px'; c.style.height = HAND.ht + 'px';
      c.style.transformOrigin = `50% ${HAND.ht + HAND.r}px`;
    },
    // deal the hand: the newest in the front slot, the rest fanned in behind it
    lay() {
      const S = HAND.slots;
      while (this.deck.length > S.length) {
        // one too many: the oldest slips out of the back of the hand
        const old = this.deck.shift();
        old.style.opacity = '0';
        old.style.setProperty('--a', S[S.length - 1] + 10 + 'deg');
        setTimeout(() => old.remove(), 700);
      }
      const n = this.deck.length;
      this.deck.forEach((c, i) => {
        const j = n - 1 - i;               // 0 for the newest
        c.style.setProperty('--a', S[j] + 'deg');
        c.style.setProperty('--s', this.fs);
        c.style.zIndex = 10 - j;
        c.classList.toggle('is-front', j === 0);
      });
    },
    front() { return this.deck[this.deck.length - 1]; },
    // each press prints one, in turn; a few can wait their turn
    async print(kind = this.kind) {
      if (!this.root) return;
      this.printed = true;
      if (this.busy) { if (this.queue.length < 3) this.queue.push(kind); return; }
      this.busy = true;
      try { await this.run(kind); }
      catch (e) { /* a print that goes wrong leaves the printer free for the next */ }
      finally {
        this.el.classList.remove('is-printing', 'is-down');
        this.busy = false;
        if (this.queue.length) this.print(this.queue.shift());
      }
    },
    async run(kind) {
      // a new ticket is pencilled in or booked, never already used
      const st = this.state === 'planned' ? 'planned' : 'booked';
      this.el.classList.add('is-down');
      await wait(480);
      // the strip: the ticket turned a quarter clockwise, stub first out of the slot
      const fw = this.feed.clientWidth, k = fw / 200;
      const strip = document.createElement('div');
      strip.className = 'feed-strip';
      strip.style.height = 480 * k + 'px';
      const t = ART.ticket({...KINDS[kind], state: st});
      t.style.position = 'absolute'; t.style.left = '0'; t.style.top = '0';
      t.style.transformOrigin = '0 0';
      t.style.transform = `translate(${200 * k}px, 0) rotate(90deg) scale(${k})`;
      strip.appendChild(t);
      this.feed.appendChild(strip);
      this.el.classList.add('is-printing');
      const pulls = 10;
      for (let i = 1; i <= pulls; i++) {
        strip.style.transition = 'transform .09s ease-out';
        strip.style.transform = `translateY(${-100 + i / pulls * 100}%)`;
        await wait(125);
      }
      this.el.classList.remove('is-printing');
      await wait(260);
      // torn off: it flies out over the phone to the front of the hand, and the
      // others shuffle back to make room
      const sr = strip.getBoundingClientRect(), rr = this.root.getBoundingClientRect();
      const kr = rr.width / PW || 1;     // the rig's own scale
      const card = this.card(kind, st);
      card.style.visibility = 'hidden';
      this.deck.push(card);
      this.lay();
      this.state = st; showState(st);
      const fly = document.createElement('div');
      fly.className = 'hand-tk hand-fly';
      this.place(fly);
      fly.appendChild(this.stood(kind, st));
      this.root.appendChild(fly);
      strip.remove();
      // about the hand's pivot P, translate(t) rotate(a) scale(s) puts the ticket's
      // centre C0 at P + t + R(a)·s·(C0 − P); solve for t to put it at c
      const P = [HAND.px, HAND.py], v = [0, -HAND.r - HAND.ht / 2];
      const at = (a, s) => [s * (v[0] * Math.cos(a * D2R) - v[1] * Math.sin(a * D2R)), s * (v[0] * Math.sin(a * D2R) + v[1] * Math.cos(a * D2R))];
      const tr = (c, a, s) => { const o = at(a, s); return [c[0] - P[0] - o[0], c[1] - P[1] - o[1]]; };
      const Cs = [(sr.left + sr.width / 2 - rr.left) / kr, (sr.top + sr.height / 2 - rr.top) / kr];
      const s0 = sr.height / kr / HAND.ht, a1 = HAND.slots[0], s1 = this.fs, o1 = at(a1, s1);
      const Cf = [P[0] + o1[0], P[1] + o1[1]];
      // out over the phone's edge on an arc that bows up, then down into the hand
      const am = a1 - 18, sm = (s0 + s1) / 2, Cm = [(Cs[0] + Cf[0]) / 2 - 40, Math.min(Cs[1], Cf[1]) - 40];
      const t0 = tr(Cs, 0, s0), tm = tr(Cm, am, sm);
      if (!RM) await fly.animate([
        {transform: `translate(${t0[0]}px, ${t0[1]}px) rotate(0deg) scale(${s0})`},
        {transform: `translate(${tm[0]}px, ${tm[1]}px) rotate(${am}deg) scale(${sm})`, offset: .55},
        {transform: `translate(0px, 0px) rotate(${a1}deg) scale(${s1})`},
      ], {duration: 820, easing: 'cubic-bezier(.3,.7,.3,1)'}).finished;
      fly.remove();
      card.style.visibility = '';
    },
    restate(s) {
      this.state = s;
      const c = this.front();
      if (!c || c.dataset.state === s) return;
      c.dataset.state = s;
      clearTimeout(c._tear);
      const tk = c.querySelector('.tk'), fresh = this.stood(c.dataset.kind, s);
      const swap = () => { const old = c.querySelector('.hand-in'); if (old) c.replaceChild(fresh, old); };
      if (s === 'used' && !RM && tk && !tk.classList.contains('is-used')) {
        // the stub tears away along the perforation and what is left slides to centre
        tk.classList.add('is-used');
        c._tear = setTimeout(swap, 650);
      } else swap();
    },
  };
  $$('#ticketKinds .chip').forEach(b => b.addEventListener('click', () => {
    $$('#ticketKinds .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    printer.kind = b.dataset.kind;
    printer.print();
  }));
  stateBtns.forEach(b => b.addEventListener('click', () => {
    showState(b.dataset.state);
    printer.restate(b.dataset.state);
  }));

  /* ---- Customise: the app's six passport styles (PassportBackgroundStyle). The
         phone shows the passport open in the chosen one, as the app's Customize
         screen does; the covers fanned out behind the phone choose it, and so do
         the swatches under the copy ---- */
  const STYLES = [
    {id: 'classicPurple', name: 'Classic Purple', sub: 'Original deep-purple stamp.', cost: 0, cover: ['#1F1A47', '#2E1F59', '#24194D'], pages: '', edge: ['#0F0A29', '#1A1238'], ink: '#FFFFFF', pink: '#FFFFFF', ring: '#241A4D'},
    {id: 'book', name: 'Leather Book', sub: 'Beige paper inside a brown leather binding.', cost: 50, cover: ['#F5EFE2', '#F5EFE2', '#EEE6D4'], pages: '#F5EFE2', edge: ['#3B2316', '#5A3622'], ink: '#3B2316', pink: '#3B2316', ring: '#3B2316'},
    {id: 'burgundy', name: 'Burgundy Passport', sub: 'European wine-red cover, gold accents.', cost: 50, cover: ['#5A1124', '#6E1A2D', '#5A1124'], pages: '#C9A990', edge: ['#3E0A17', '#4C0E1C'], ink: '#F1E2B4', pink: '#3E111D', ring: '#5A1123'},
    {id: 'navy', name: 'Navy Passport', sub: 'Korean deep-navy cover, silver accents.', cost: 50, cover: ['#14254A', '#1E3055', '#14254A'], pages: '#A6B2C5', edge: ['#08152F', '#0E1E3A'], ink: '#E3E2D5', pink: '#0B1321', ring: '#14264A'},
    {id: 'swiss', name: 'Swiss Passport', sub: 'Swiss red by day, glowing topography by night.', cost: 50, cover: ['#C63C46', '#D54650', '#C63C46'], pages: '#D8A8A8', edge: ['#8F2832', '#A4323C'], ink: '#FFFFFF', pink: '#67121B', ring: '#841723'},
    {id: 'dubu', name: 'Dubu Card', sub: 'Dubu peeking out from a soft pink card.', cost: 50, cover: ['#D4637A', '#DA6E84', '#D4637A'], pages: '#D6A9B2', edge: ['#AA465B', '#BD5067'], ink: '#FFFFFF', pink: '#7F2B3F', ring: '#D4637A'},
  ];
  const styleVars = st => `--cv-a:${st.cover[0]};--cv-b:${st.cover[1]};--cv-c:${st.cover[2]};--pg:${st.pages || st.cover[1]};--ed-a:${st.edge[0]};--ed-b:${st.edge[1]};--ink:${st.ink};--pink:${st.pink};--ring:${st.ring}`;
  // round flags for the visited page, simplified to read at a few pixels across
  const FLAGS = (() => {
    const h = (...c) => c.map((f, i) => `<rect y="${(24 / c.length * i).toFixed(2)}" width="24" height="${(24 / c.length + .3).toFixed(2)}" fill="${f}"/>`).join('');
    const v = (...c) => c.map((f, i) => `<rect x="${(24 / c.length * i).toFixed(2)}" width="${(24 / c.length + .3).toFixed(2)}" height="24" fill="${f}"/>`).join('');
    const nordic = (bg, a, b) => `<rect width="24" height="24" fill="${bg}"/><path d="M6 0h6v24H6zM0 9h24v6H0z" fill="${a}"/>${b ? `<path d="M7.5 0h3v24h-3zM0 10.5h24v3H0z" fill="${b}"/>` : ''}`;
    const star = (x, y, r, f) => {
      let d = '';
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .4 : r; d += (i ? 'L' : 'M') + (x + Math.cos(a) * q).toFixed(2) + ' ' + (y + Math.sin(a) * q).toFixed(2); }
      return `<path d="${d}Z" fill="${f}"/>`;
    };
    return {
      CZE: `${h('#fff', '#d7141a')}<path d="M0 0L12 12L0 24Z" fill="#11457e"/>`,
      AUT: h('#ed2939', '#fff', '#ed2939'), SVK: h('#fff', '#0b4ea2', '#ee1c25'), HUN: h('#ce2939', '#fff', '#477050'),
      HRV: h('#ff0000', '#fff', '#171796'), SVN: h('#fff', '#005ce5', '#ed1c24'), ITA: v('#009246', '#fff', '#ce2b37'),
      CHE: '<rect width="24" height="24" fill="#d52b1e"/><path d="M10 5h4v14h-4zM5 10h14v4H5z" fill="#fff"/>',
      FRA: v('#0055a4', '#fff', '#ef4135'), LUX: h('#ed2939', '#fff', '#00a1de'), BEL: v('#000', '#fdda24', '#ef3340'),
      NLD: h('#ae1c28', '#fff', '#21468b'), DEU: h('#000', '#dd0000', '#ffce00'),
      DNK: nordic('#c8102e', '#fff'), SWE: nordic('#006aa7', '#fecc00'), NOR: nordic('#ba0c2f', '#fff', '#00205b'),
      FIN: nordic('#fff', '#002f6c'), ISL: nordic('#02529c', '#fff', '#dc1e35'),
      KOR: '<rect width="24" height="24" fill="#fff"/><path d="M6 12a6 6 0 0 1 12 0z" fill="#cd2e3a"/><path d="M6 12a6 6 0 0 0 12 0z" fill="#0047a0"/><path d="M3 6l3-2.5M18 3.5l3 2.5M3 18l3 2.5M18 20.5l3-2.5" stroke="#000" stroke-width="1.5"/>',
      JPN: '<rect width="24" height="24" fill="#fff"/><circle cx="12" cy="12" r="6" fill="#bc002d"/>',
      HKG: `<rect width="24" height="24" fill="#de2910"/>${star(12, 12, 6.5, '#fff')}`,
      CHN: `<rect width="24" height="24" fill="#de2910"/>${star(7.5, 7.5, 4.4, '#ffde00')}`,
      VNM: `<rect width="24" height="24" fill="#da251d"/>${star(12, 12.5, 6.8, '#ffff00')}`,
      THA: h('#a51931', '#f4f5f8', '#2d2a4a', '#2d2a4a', '#f4f5f8', '#a51931'),
      USA: `${h(...Array.from({length: 13}, (_, i) => i % 2 ? '#fff' : '#b22234'))}<rect width="11" height="13" fill="#3c3b6e"/>`,
      IRL: v('#169b62', '#fff', '#ff883e'),
      GBR: '<rect width="24" height="24" fill="#012169"/><path d="M0 0L24 24M24 0L0 24" stroke="#fff" stroke-width="5"/><path d="M0 0L24 24M24 0L0 24" stroke="#c8102e" stroke-width="1.8"/><path d="M12 0v24M0 12h24" stroke="#fff" stroke-width="7"/><path d="M12 0v24M0 12h24" stroke="#c8102e" stroke-width="4"/>',
      PRT: '<rect width="24" height="24" fill="#f00"/><rect width="9.6" height="24" fill="#060"/><circle cx="9.6" cy="12" r="4" fill="#ff0"/><circle cx="9.6" cy="12" r="2.5" fill="#f00"/>',
      ESP: '<rect width="24" height="24" fill="#aa151b"/><rect y="6" width="24" height="12" fill="#f1bf00"/>',
      MCO: h('#ce1126', '#fff'),
      GRC: `${h(...Array.from({length: 9}, (_, i) => i % 2 ? '#fff' : '#0d5eaf'))}<rect width="13.3" height="13.3" fill="#0d5eaf"/><path d="M5.3 0h2.7v13.3H5.3zM0 5.3h13.3V8H0z" fill="#fff"/>`,
      POL: h('#fff', '#dc143c'),
    };
  })();
  const flagSvg = a3 => `<svg class="pp-flag" viewBox="0 0 24 24" aria-hidden="true">${FLAGS[a3] || ''}</svg>`;
  // contour lines for the Swiss cover: a few nested, wobbling rings
  const TOPO = (() => {
    let d = '';
    const blob = (cx, cy, rx, ry, n, ph) => {
      for (let k = 1; k <= n; k++) {
        const f = k / n;
        let p = '';
        for (let i = 0; i <= 48; i++) {
          const a = i / 48 * Math.PI * 2, w = 1 + .16 * Math.sin(a * 3 + ph + k * .7) + .08 * Math.sin(a * 5 - ph * 2 + k);
          p += (i ? 'L' : 'M') + (cx + Math.cos(a) * rx * f * w).toFixed(1) + ' ' + (cy + Math.sin(a) * ry * f * w).toFixed(1);
        }
        d += p + 'Z';
      }
    };
    blob(70, 60, 92, 70, 7, .4); blob(150, 200, 70, 62, 5, 2.1); blob(10, 230, 60, 50, 4, 4);
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 280' preserveAspectRatio='xMidYMid slice'><path d='${d}' fill='none' stroke='rgba(255,140,155,.5)' stroke-width='.8'/></svg>`)}")`;
  })();
  tour.style.setProperty('--topo', TOPO);
  const COVER_GLOBE = '<svg viewBox="8 8 48 48" aria-hidden="true"><circle cx="32" cy="32" r="22"/><ellipse cx="32" cy="32" rx="9.5" ry="22"/><path d="M10 32h44M13.5 21h37M13.5 43h37"/></svg>';
  const COVER_CHIP = '<svg viewBox="0 0 40 26" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="23" rx="4"/><circle cx="20" cy="13" r="5.5"/><path d="M1.5 13h13M25.5 13h13"/></svg>';
  // the covers' fan, in the rig's units: each cover turned about a point and pushed
  // out from it by D. On a wide screen the point is far below the phone and the
  // covers stand three either side of it; on a phone, where there is no room
  // beside it, the point is inside the phone and they fan out over its top
  const FAN = {w: 150, h: 214,
    wide: {px: 150, py: 1190, d: 860, slots: [-33, -23, -13, 13, 23, 33]},
    narrow: {px: 150, py: 420, d: 470, slots: [-30, -18, -6, 6, 18, 30]}};
  const VISITED_FLAGS = ['CZE', 'AUT', 'SVK', 'HUN', 'HRV', 'SVN', 'ITA', 'CHE', 'FRA', 'LUX', 'BEL', 'NLD', 'DEU', 'DNK', 'SWE', 'NOR',
                         'FIN', 'KOR', 'JPN', 'HKG', 'CHN', 'VNM', 'THA', 'USA', 'ISL', 'IRL', 'GBR', 'PRT', 'ESP', 'MCO', 'GRC', 'POL'];
  let chosen = STYLES[0].id;
  const custom = document.createElement('div');
  custom.className = 'scr scr-cust';
  custom.innerHTML = `
    <div class="pane pane-desk">
      <div class="pane-status pane-status-dark"><span>9:41</span>${live.querySelector('.pane-status svg').outerHTML}</div>
      <div class="pp" data-style="${chosen}" style="${styleVars(STYLES[0])}">
        <div class="pp-data">
          <div class="pp-head"><div><p class="pp-title">Peregrino Passport</p><p class="pp-sub">Passport · Pas · 여권</p></div><span class="pp-btn">${globeSvgSmall()}</span></div>
          <div class="pp-body">
            <div>
              <p class="pp-k">Countries &amp; territories</p>
              <p class="pp-big"><b>32</b><span> / 248</span><em>(13%)</em></p>
              <div class="pp-row"><div><p class="pp-k">Continents</p><p class="pp-v">3<span> / 7</span></p></div><div><p class="pp-k">Total trips</p><p class="pp-v">16</p></div></div>
              <div class="pp-row"><div><p class="pp-k">Top continent</p><p class="pp-v">Europe</p></div><div><p class="pp-k">Member since</p><p class="pp-v">Apr 2026</p></div></div>
            </div>
            <div class="pp-map"><p class="pp-k">Map · Mapa · 지도</p><canvas></canvas></div>
          </div>
          <img class="pp-dubu" src="assets/dubu.webp" alt="" loading="lazy">
          <p class="pp-mrz">P&lt;PGNMICHAEL&lt;&lt;PEREGRINO&lt;&lt;TRAVELER&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br>ISSUED01OCT26&lt;&lt;&lt;32V&lt;&lt;&lt;248T&lt;&lt;&lt;150&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</p>
        </div>
        <div class="pp-visa">
          <div class="pp-flags">
            <p class="pp-k">Visited</p>
            <div class="pp-fl">${VISITED_FLAGS.slice(0, 16).map(flagSvg).join('')}</div>
            <div class="pp-fl">${VISITED_FLAGS.slice(16).map(flagSvg).join('')}</div>
            <p class="pp-k">Residency</p>
            <div class="pp-fl">${['CZE', 'GBR', 'KOR'].map(flagSvg).join('')}</div>
          </div>
          <div class="pp-side"><p>Visa</p><p>Visa · Vizum · 비자</p></div>
        </div>
      </div>
      <div class="pp-pager"><span class="pp-chev"></span><span>Data page · Visited · 1/5</span><span class="pp-chev is-on"></span></div>
    </div>
    <img class="scr-sheet" src="assets/screens/customize-sheet.webp" alt="" style="top:50.55%;height:49.45%" loading="lazy">
    <div class="cust-list"><div class="cust-track">${STYLES.map(st => `
      <div class="cust-item" data-style="${st.id}">
        <span class="cust-thumb" style="${styleVars(st)}"></span>
        <div class="cust-text"><p class="cust-name">${st.name}</p><p class="cust-sub">${st.sub}</p></div>
        <span class="cust-state">${st.cost ? `${st.cost} mi` : 'Free'}</span>
      </div>`).join('')}</div></div>`;
  screen.appendChild(custom);
  layers.customize = custom;
  function globeSvgSmall() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="3.6" ry="8.5"/><path d="M3.5 12h17"/></svg>';
  }
  const pp = custom.querySelector('.pp'), ppMap = custom.querySelector('.pp-map canvas'), track = custom.querySelector('.cust-track');
  // the data page's little Mercator map, in the page's own ink
  function drawPPMap() {
    if (!WORLD || !ppMap.clientWidth) return false;
    const st = STYLES.find(s => s.id === chosen), w = ppMap.clientWidth, h = ppMap.clientHeight;
    const k = Math.min(3, (devicePixelRatio || 1) * 2);
    ppMap.width = Math.round(w * k); ppMap.height = Math.round(h * k);
    const c = ppMap.getContext('2d');
    c.setTransform(k, 0, 0, k, 0, 0);
    const mc = lat => Math.log(Math.tan(Math.PI / 4 + clamp(lat, -85, 85) * D2R / 2));
    const top = mc(80), span = top - mc(-58), on = new Set(ALL32);
    for (const K of WORLD) {
      if (K.a3 === 'ATA') continue;
      c.beginPath();
      for (const r of K.r) {
        for (let i = 0; i < r.length; i += 2) {
          const x = (r[i] + 180) / 360 * w, y = (top - mc(r[i + 1])) / span * h;
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath();
      }
      c.fillStyle = st.ink; c.globalAlpha = on.has(K.a3) ? .95 : .16;
      c.fill('evenodd');
    }
    c.globalAlpha = 1;
    return true;
  }
  function showChosen(animate) {
    const st = STYLES.find(s => s.id === chosen);
    const apply = () => { pp.dataset.style = st.id; pp.setAttribute('style', styleVars(st)); drawPPMap(); };
    if (animate && !RM) {
      // the passport turns over to its new cover
      pp.animate([{transform: 'perspective(600px) rotateY(0deg)'}, {transform: 'perspective(600px) rotateY(88deg)'}], {duration: 170, easing: 'ease-in'}).finished
        .then(() => { apply(); return pp.animate([{transform: 'perspective(600px) rotateY(-88deg)'}, {transform: 'perspective(600px) rotateY(0deg)'}], {duration: 300, easing: 'cubic-bezier(.2,.9,.3,1.15)'}).finished; })
        .catch(() => apply());
    } else apply();
    // the sheet's list scrolls the chosen one in, marked Selected
    const i = STYLES.indexOf(st);
    [...track.children].forEach((it, j) => {
      it.classList.toggle('is-chosen', j === i);
      it.querySelector('.cust-state').textContent = j === i ? 'Selected' : STYLES[j].cost ? `${STYLES[j].cost} mi` : 'Free';
    });
    track.style.transform = `translateX(${-i * 74}cqw)`;
    // the covers and the swatches
    if (arts.customize) [...arts.customize.children].forEach(c => c.classList.toggle('is-chosen', c.dataset.style === chosen));
    $$('#coverPick button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.style === chosen)));
  }
  function choose(id) {
    if (id === chosen || !STYLES.some(s => s.id === id)) return;
    chosen = id;
    showChosen(true);
  }
  $$('#coverPick button').forEach(b => {
    const st = STYLES.find(s => s.id === b.dataset.style);
    if (st) b.style.cssText = styleVars(st);
    b.addEventListener('click', () => choose(b.dataset.style));
  });

  /* ---- what each stop brings out ---- */
  const arts = {};
  const el = (tag, cls, parent) => { const e = document.createElement(tag); e.className = cls; parent.appendChild(e); return e; };
  function setupArtifacts() {
    // Today: Österreich, stamped beside the "Stamp it" button
    arts.today = el('div', 'art art-stamp', front);
    arts.today.appendChild(ART.stampEl('AT', 160, {date: '01.10.2026'}));
    // Journal: two tags hung off the phone's corner on their strings
    arts.journal = el('div', 'art art-tags', front);
    [ART.tag({title: 'Camino summer', countries: ['AT', 'PT', 'ES'], days: 44, dates: '4 JUL – 16 AUG 2026', img: 'assets/photos/mountains.jpg', state: 'used', seed: 'trip|camino'}),
     ART.tag({title: 'Pureflow weekend', countries: ['NL', 'DK'], trailing: 'IN 16 DAYS', trailingAccent: true, dates: '17 – 20 OCT 2026', img: 'assets/photos/river.jpg', state: 'booked', seed: 'trip|pureflow'})]
      .forEach((t, i) => {
        const h = el('div', 'hang', arts.journal);
        h.style.left = `${i * 10}px`; h.style.top = `${i * 14}px`;
        // the eyelet at the hanging point: shift the frame so (34, 120) sits on (0, 0)
        const w = 230 - i * 16, f = ART.frame(t, 460, 240, w), k = w / 460;
        f.style.transform = `translate(${-34 * k}px, ${-120 * k}px)`;
        f.style.transformOrigin = '0 0';
        h.appendChild(f);
      });
    // Tickets: the printer in front, the hand of tickets behind
    arts.tickets = el('div', 'art art-tickets', front);
    arts.tickets.style.inset = '0';
    arts.hand = el('div', 'art art-hand', back);
    printer.mount(arts.tickets, arts.hand);
    // Places: polaroids fan out from behind
    arts.place = el('div', 'art art-photos', back);
    [['night.jpg', 'Seoul, late'], ['torii.jpg', 'Kyoto, day 3'], ['beach.jpg', 'Lisbon']].forEach(([img, cap], i) => {
      const pl = ART.polaroid({img: 'assets/photos/' + img, caption: cap, seed: cap, pin: i === 1});
      arts.place.appendChild(pl);
    });
    // Statistics: the travel receipt, fed out over the phone's edge
    arts.stats = el('div', 'art art-receipt', front);
    arts.stats.appendChild(ART.receipt({
      title: "Michael's travels", stamp: '01 OCT 2026 · 09:41', footer: 'peregrino', code: '20261001',
      lines: [{t: 'heading', l: 'All time'}, {t: 'item', l: 'Countries', v: '32'}, {t: 'item', l: 'Of the world', v: '13%'},
              {t: 'item', l: 'Continents', v: '3 / 7'}, {t: 'item', l: 'Lived in', v: '3'}, {t: 'item', l: 'Trips', v: '16'},
              {t: 'item', l: 'Travelled', v: '23,805 km'}, {t: 'rule'}, {t: 'total', l: 'Days abroad', v: '214'}, {t: 'note', l: 'Thank you for travelling'}],
    }));
    // Customise: the six covers, fanned out behind the phone; a click chooses one
    arts.customize = el('div', 'art art-covers', back);
    STYLES.forEach((st, i) => {
      const c = el('div', 'cv-pp', arts.customize);
      c.dataset.style = st.id;
      c.setAttribute('style', styleVars(st));
      c.style.transitionDelay = `${Math.abs(i - 2.5) * 40}ms`;
      c.innerHTML = `<span class="cv-edge"></span><div class="cv-face"><p class="cv-name">Peregrino</p><span class="cv-emblem">${COVER_GLOBE}</span><p class="cv-kind">Passport · Pas · 여권</p><span class="cv-chip">${COVER_CHIP}</span>${st.id === 'dubu' ? '<img class="cv-dubu" src="assets/dubu.webp" alt="" loading="lazy">' : ''}</div><span class="cv-tick"></span>`;
      c.addEventListener('click', () => choose(st.id));
    });
    showChosen(false);
    layoutArtifacts();
  }
  const fanTo = (c, on) => { const [a, d, s] = on ? c._on : c._off; c.style.setProperty('--a', a + 'deg'); c.style.setProperty('--d', d + 'px'); c.style.setProperty('--s', s); };
  function layoutArtifacts() {
    // the hand of tickets fans out into the room between the copy and the phone
    if (arts.hand && G.rest) {
      const ti = stops.findIndex(s => s.dataset.screen === 'tickets'), R = G.rest[ti];
      const c = stops[ti] && stops[ti].querySelector('.stop-copy');
      const edge = mobile || !c ? 6 : c.getBoundingClientRect().right + 24;
      printer.fs = clamp((R.x - PW / 2 * R.s - edge) / (HAND.reach * R.s), .45, 1);
      printer.lay();
    }
    // the polaroids fan out on the phone's open side: away from the copy on a wide
    // screen, and on a narrow one (copy above) towards the middle of the screen
    if (arts.place) {
      // they reach up to 196px past the phone's edge: tuck them in where the screen ends sooner
      const room = (vw / 2 - X) / scale - 150;
      const tuck = Math.max(0, Math.min(150, 196 - (room - 12)));
      arts.place.style.left = mobile ? '92%' : `calc(-50% + ${tuck}px)`;
      [...arts.place.children].forEach((pl, i) => {
        pl._on = mobile ? `translate(${[10, 64, 24][i]}px, ${[0, 176, 340][i]}px) rotate(${[9, -5, 6][i]}deg)`
                        : `translate(${[-20, 34, -46][i]}px, ${[0, 176, 340][i]}px) rotate(${[-11, 6, -5][i]}deg)`;
        pl._off = `translate(${mobile ? -120 : 120}px, ${120 + i * 60}px) rotate(0deg) scale(.7)`;
        pl.style.transform = arts.place.classList.contains('is-on') ? pl._on : pl._off;
      });
    }
    // the covers fan out as far as the screen allows
    if (arts.customize && G.rest) {
      const ci = stops.findIndex(s => s.dataset.screen === 'customize'), R = G.rest[ci] || {s: scale};
      const F = mobile ? FAN.narrow : FAN.wide, out = F.slots[F.slots.length - 1] * D2R;
      // how far the outermost cover reaches past the pivot: its centre, then its corner
      const fs = clamp(((vw / 2 - 8) / R.s - F.d * Math.sin(out)) / (FAN.w / 2 * Math.cos(out) + FAN.h / 2 * Math.sin(out)), mobile ? .4 : .5, mobile ? .7 : 1);
      [...arts.customize.children].forEach((c, i) => {
        c.style.left = F.px - FAN.w / 2 + 'px'; c.style.top = F.py - FAN.h / 2 + 'px';
        c.style.width = FAN.w + 'px'; c.style.height = FAN.h + 'px';
        c._on = [F.slots[i], -F.d, fs]; c._off = [F.slots[i] * .15, -F.d * .45, fs * .7];
        fanTo(c, arts.customize.classList.contains('is-on'));
      });
    }
  }

  /* ---- scroll → which stop, and how far between two ---- */
  const stage = $('.tour-stage'), navEl = $('#nav');
  const PW = 300, PH = 612;          // the rig's own size
  let vw = 0, vh = 0, X = 300, anchors = [], mobile = false, scale = 1;
  const G = {};                      // the stage's geometry, from measure()
  const sides = stops.map(s => s.dataset.side === 'left' ? -1 : s.dataset.side === 'right' ? 1 : 0);
  // what brings the phone to each stop
  const via = stops.map(s => s.dataset.carrier || '');
  function measure() {
    vw = innerWidth; vh = innerHeight;
    mobile = vw <= 760;      // as the CSS's max-width: 760px
    X = mobile ? Math.min(vw * .14, 60) : Math.min(vw * .245, 330);
    scale = mobile ? Math.min(.62, (vh * .5) / 612) : Math.min(1, (vh * .82) / 612);
    anchors = stops.map(s => { const r = s.getBoundingClientRect(); return r.top + scrollY + r.height / 2 - vh / 2; });
    // the rig's place in the stage before it is moved, and where it rests at each stop
    G.H = stage.clientHeight || vh;
    G.cx0 = rig.offsetLeft + PW / 2; G.cy0 = rig.offsetTop + PH / 2;
    G.bottom = rig.offsetTop + PH;
    G.navB = navEl ? navEl.offsetHeight : 48;
    G.rest = stops.map((s, i) => {
      if (sides[i] === 0 && !mobile) {
        // the last stop: the phone sits in the middle, between the nav and the copy under it
        const c = s.querySelector('.stop-copy');
        const top = c ? c.getBoundingClientRect().top + scrollY - anchors[i] : G.H * .78;
        const a = G.navB + Math.max(36, G.H * .08), b = top - Math.max(28, G.H * .05), sc = Math.max(.3, Math.min(scale, (b - a) / PH));
        return {x: vw / 2, y: (a + b) / 2, s: sc, r: 0};
      }
      if (mobile) {
        // at the foot of the screen, as big as fits under the copy's card
        const c = s.querySelector('.stop-copy');
        const under = c ? c.getBoundingClientRect().bottom + scrollY - anchors[i] : G.H * .45;
        const sc = clamp((G.bottom - under - 14) / PH, .3, scale);
        return {x: vw / 2 + sides[i] * X, y: G.bottom - PH / 2 * sc, s: sc, r: 0};
      }
      return {x: vw / 2 + sides[i] * X, y: G.cy0, s: scale, r: 0};
    });
    // in transit the phone rides smaller; the vehicles are sized to it
    G.ride = scale * (mobile ? .82 : .7);
    G.air = scale * (mobile ? .86 : .78);
    G.lift = scale * (mobile ? .8 : .55);      // under the lander, which needs head room
    G.ground = G.H - Math.max(18, G.H * .035);
    G.water = G.H - Math.max(30, G.H * .06);
    G.rope = G.H * (mobile ? .05 : .07);
    G.cable = Math.max(44, G.H * .065);
    const fit = PW * G.ride;                   // the phone's width on a deck
    G.vs = {plane: G.air * 1.12, train: fit * 1.3 / 316, car: fit * 1.3 / 318, ship: fit * 1.5 / 420, lander: G.lift * 1.12};
    if (cr.rails) {
      cr.rails.style.top = G.ground - 2 + 'px';
      cr.road.style.top = G.ground + 'px';
      cr.road.style.height = G.H - G.ground + 'px';
      for (const sea of [cr.seaBack, cr.seaFront]) sea.style.top = G.water - (sea === cr.seaBack ? 9 : 1) + 'px';
      cr.line.setAttribute('viewBox', `0 0 ${vw} ${G.H}`);
    }
    mini.resize();
    ppDrawn = false;
    const d = Math.min(2, devicePixelRatio || 1);
    miniOver.width = Math.round(miniOver.clientWidth * d); miniOver.height = Math.round(miniOver.clientHeight * d);
    layoutArtifacts();
  }
  function stateAt() {
    const y = scrollY;
    let i = 0;
    while (i < anchors.length - 1 && y >= anchors[i + 1]) i++;
    if (y < anchors[0]) return {i: 0, j: 0, u: 0, move: 0, enter: seg(y, anchors[0] - vh * .9, anchors[0] - vh * .15)};
    if (i >= anchors.length - 1) return {i, j: i, u: 0, move: 0, enter: 1};
    const u = seg(y, anchors[i], anchors[i + 1]);
    return {i, j: i + 1, u, move: ease(seg(u, .3, .7)), enter: 1};
  }
  const keyOf = i => stops[i].dataset.screen;

  /* ---- the carriers: between two stops a vehicle from the app comes for the
         phone, takes it across and goes on its way ---- */
  const VEH = window.PeregrinoVehicles, carrier = $('#carrier');
  const cr = {};
  if (VEH && carrier) {
    const add = (cls, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; carrier.appendChild(e); return e; };
    cr.clouds = [add('cr-cloud', VEH.cloud()), add('cr-cloud', VEH.cloud())];
    cr.rails = add('cr-ground cr-rails');
    cr.road = add('cr-ground cr-road');
    cr.seaBack = add('cr-sea cr-sea-back');
    for (const k of new Set(via.filter(Boolean))) {
      const sp = VEH.SPEC[k], e = add(`veh veh-${k}`, VEH[k]());
      e.style.width = sp.w + 'px'; e.style.height = sp.h + 'px';
      e._wheels = [...e.querySelectorAll('.wh')].map(g => ({g, c: g.dataset.c.split(' ').map(Number)}));
      e._flame = e.querySelector('.flame'); e._jets = [...e.querySelectorAll('.jet')];
      e._body = e.querySelector('.body');
      cr[k] = e;
    }
    cr.seaFront = add('cr-sea cr-sea-front');
    cr.clouds.push(add('cr-cloud cr-cloud-front', VEH.cloud()));
    cr.shadow = add('cr-shadow');
    carrier.insertAdjacentHTML('beforeend', '<svg class="cr-line" aria-hidden="true"><path class="cr-rope"/><path class="cr-hook"/></svg>');
    cr.line = carrier.querySelector('.cr-line');
    cr.rope = cr.line.querySelector('.cr-rope'); cr.hook = cr.line.querySelector('.cr-hook');
  }
  const put = (el, a, x, y, s, flip, rot = 0) => {
    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) scale(${flip ? -s : s}, ${s}) translate(${-a[0]}px, ${-a[1]}px)`;
  };
  const roll = (el, dist, s) => el._wheels.forEach(({g, c}) => g.setAttribute('transform', `rotate(${(dist / (c[2] || 14) / s / D2R).toFixed(1)} ${c[0]} ${c[1]})`));
  const flame = (g, k) => { if (!g) return; const o = g.dataset.o; g.setAttribute('transform', `translate(${o}) scale(${(.75 + k * .25).toFixed(3)} ${k.toFixed(3)}) translate(${o.split(' ').map(v => -v).join(' ')})`); g.style.opacity = k > .02 ? 1 : 0; };
  const mix = (P, Q, t) => ({x: lerp(P.x, Q.x, t), y: lerp(P.y, Q.y, t), s: lerp(P.s, Q.s, t), r: lerp(P.r || 0, Q.r || 0, t)});
  // a hop from P to Q: up in an arc of height h, turning spin degrees on the way
  const hop = (P, Q, t, h, spin = 0) => {
    const e = ease(t), p = mix(P, Q, e);
    p.y -= h * 4 * t * (1 - t);
    p.r += spin * e;
    return p;
  };
  // the phone hanging from a point by a line of length L, at angle a (deg, the bottom swung left for a > 0)
  const hang = (hx, hy, L, s, a) => {
    const t = a * D2R, h = L + PH / 2 * s;
    return {x: hx - Math.sin(t) * h, y: hy + Math.cos(t) * h, s, r: a};
  };
  // the phone standing on a deck at (x, y), leaning with it by a
  const stand = (x, y, s, a) => {
    const t = a * D2R, h = PH / 2 * s;
    return {x: x + Math.sin(t) * h, y: y - Math.cos(t) * h, s, r: a};
  };
  const topOf = p => [p.x + Math.sin(p.r * D2R) * PH / 2 * p.s, p.y - Math.cos(p.r * D2R) * PH / 2 * p.s];
  // a hanging line: straight when taut, a sag when it hangs loose
  function line(x0, y0, x1, y1, sag, hook) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
    cr.rope.setAttribute('d', `M${x0.toFixed(1)} ${y0.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`);
    cr.hook.setAttribute('d', hook ? `M${x1 - 3.5} ${y1 - 1}a3.5 3.5 0 1 0 7 0v-5` : '');
  }
  const swayOf = now => Math.sin(now / 640) * 2.2 + Math.sin(now / 1730) * 1.4;

  function carry(kind, u, A, B, now) {
    const d = B.x >= A.x ? 1 : -1, flip = d < 0;
    const sp = VEH.SPEC[kind], el = cr[kind];
    const shrink = (s1, a, b) => ({x: A.x, y: A.y, s: lerp(A.s, s1, ease(seg(u, a, b))), r: 0});
    const grow = (s1, a, b) => ({x: B.x, y: B.y, s: lerp(s1, B.s, springOut(seg(u, a, b))), r: 0});
    let P;
    if (kind === 'plane' || kind === 'lander') {
      // small enough that the phone, its line and the vehicle all fit under the nav
      const L = kind === 'plane' ? G.rope : G.cable, k = G.vs[kind] / (kind === 'plane' ? G.air : G.lift);
      const air = Math.min(kind === 'plane' ? G.air : G.lift, (Math.min(A.y, B.y) - G.navB - 14 - L) / (PH / 2 + sp.hook[1] * k));
      const s = air * k;
      const hy0 = A.y - PH / 2 * air - L;           // the hook's height when the phone hangs at its stop
      const hyB = B.y - PH / 2 * air - L;
      let hook;
      if (kind === 'plane') {
        // in from behind, high; over the phone; across with it, climbing a little; away and up
        const x0 = d > 0 ? -(sp.w - sp.hook[0]) * s - 30 : vw + (sp.w - sp.hook[0]) * s + 30;
        const x3 = d > 0 ? vw + sp.hook[0] * s + 30 : -sp.hook[0] * s - 30;
        hook = v => {
          if (v < .32) { const a = easeOut(seg(v, .04, .32)); return [lerp(x0, A.x, a), hy0 - G.H * .1 * (1 - a)]; }
          if (v < .7) { const c = seg(v, .32, .7); return [lerp(A.x, B.x, ease(c)), lerp(hy0, hyB, ease(c)) - G.H * .035 * Math.sin(Math.PI * c)]; }
          const e = seg(v, .72, .96); return [lerp(B.x, x3, easeIn(e)), hyB - G.H * .3 * easeIn(e)];
        };
      } else {
        // down from above on its engine; up a little with the phone; across; down; away up
        const y0 = -(sp.h - sp.hook[1]) * s - 40;
        const lift = G.H * .05;
        hook = v => {
          if (v < .3) return [A.x, lerp(y0, hy0, easeOut(seg(v, .02, .3)))];
          if (v < .42) return [A.x, hy0 - lift * ease(seg(v, .34, .42))];
          if (v < .62) return [lerp(A.x, B.x, ease(seg(v, .42, .62))), hy0 - lift];
          if (v < .72) return [B.x, lerp(hy0 - lift, hyB, ease(seg(v, .62, .7)))];
          return [B.x, lerp(hyB, y0 - G.H * .1, easeIn(seg(v, .76, .96)))];
        };
      }
      const [hx, hy] = hook(u), [hx2, hy2] = hook(Math.min(1, u + .006)), [hx1, hy1] = hook(Math.max(0, u - .006));
      const vx = (hx2 - hx1) / .012, vy = (hy2 - hy1) / .012;
      const span = Math.max(80, Math.abs(B.x - A.x));
      const held = kind === 'plane' ? u >= .32 && u < .72 : u >= .34 && u < .7;
      // the phone trails the way it came, more the faster it goes
      const hw = kind === 'plane' ? seg(u, .32, .72) : seg(u, .34, .7);
      const swing = clamp(vx / span * 5, -20, 20) + swayOf(now) * Math.sin(Math.PI * hw);
      if (u < .32 && kind === 'plane' || u < .34 && kind === 'lander') P = shrink(air, kind === 'plane' ? .18 : .16, kind === 'plane' ? .3 : .28);
      else if (held) P = hang(hx, hy, L, air, swing);
      else P = grow(air, .72, .86);
      // the vehicle
      if (kind === 'plane') {
        const pitch = clamp(Math.atan2(vy, Math.abs(vx) + 1) / D2R * .45, -12, 12) * d;
        put(el, sp.hook, hx, hy, s, flip, pitch);
      } else {
        const tilt = clamp(vx / span * 4, -10, 10);
        put(el, sp.hook, hx, hy, s, false, tilt);
        // the engine brakes on the way down and lifts it away; the jets hold the hover
        const fl = u < .3 ? .55 + .45 * seg(u, .1, .28) : u > .74 ? .5 + .5 * seg(u, .74, .82) : 0;
        const flick = .9 + Math.sin(now / 37) * .06 + Math.sin(now / 23) * .04;
        flame(el._flame, fl * flick * (u < .03 || u > .97 ? 0 : 1));
        el._jets.forEach((j, i) => flame(j, (u > .28 && u < .76 ? .8 : 0) * (.85 + Math.sin(now / (29 + i * 7)) * .15)));
      }
      // the line: let down to the phone, made fast, let go
      let end, sag = 0, hooked = false;
      if (held) { end = topOf(P); }
      else if (kind === 'plane') {
        // trailing loose behind the plane, the free end catching the phone's top at .32
        const k = u < .32 ? ease(seg(u, .2, .32)) : 1 - ease(seg(u, .72, .8));
        const t = (-d * (u < .32 ? 34 : 46) + swayOf(now) * 2) * D2R;
        const free = [hx - Math.sin(t) * L * 1.15, hy + Math.cos(t) * L * 1.15], tp = topOf(P);
        end = [lerp(free[0], tp[0], k), lerp(free[1], tp[1], k)];
        sag = L * .12; hooked = true;
      } else {
        // the winch pays out the cable before and takes it back after
        const out = u < .34 ? ease(seg(u, .28, .34)) : 1 - ease(seg(u, .7, .76));
        const tp = topOf(P);
        end = [hx, hy + (u < .34 ? (tp[1] - hy) : L) * out];
        hooked = out > .05;
      }
      line(hx, hy, end[0], end[1], sag, hooked && !held);
      cr.line.style.opacity = u < .04 || u > .97 ? 0 : 1;
      // clouds, for the plane
      if (kind === 'plane') {
        const fade = seg(u, .02, .14) * (1 - seg(u, .86, .98));
        [[.16, .2, 1.05], [.8, .34, .8], [.56, .1, 1.35]].forEach(([fx, fy, k], i) => {
          const c = cr.clouds[i];
          c.style.opacity = (i === 2 ? .92 : 1) * fade;
          c.style.transform = `translate3d(${vw * fx - 110 * k * scale + (u - .5) * -d * 60 * (i + 1)}px, ${G.H * fy}px, 0) scale(${k * Math.max(.6, scale)})`;
        });
      }
      return P;
    }

    // the ground vehicles: in from behind, the phone hops on, across, it hops off, away
    const s = G.vs[kind], deck = sp.deck, w = sp.w;
    const x0 = d > 0 ? -(w - deck[0]) * s - 30 : vw + (w - deck[0]) * s + 30;
    const x3 = d > 0 ? vw + deck[0] * s + 30 : -deck[0] * s - 30;
    const sine = t => (1 - Math.cos(Math.PI * t)) / 2;
    const xAt = v => v < .4 ? lerp(x0, A.x, easeOut(seg(v, .04, .3))) : v < .74 ? lerp(A.x, B.x, sine(seg(v, .4, .66))) : lerp(B.x, x3, easeIn(seg(v, .74, .96)));
    const ax = xAt(u), dl = .01;
    const vx = (xAt(Math.min(1, u + dl)) - xAt(Math.max(0, u - dl))) / (2 * dl);
    const acc = (xAt(Math.min(1, u + dl)) - 2 * ax + xAt(Math.max(0, u - dl))) / (dl * dl);
    const span = Math.max(80, Math.abs(B.x - A.x));
    const accN = clamp(acc / (span * 73), -1, 1);       // ±1 at the ride's start and end
    const moving = Math.min(1, Math.abs(vx) / Math.max(200, vw));
    let ay, rot = 0;
    if (kind === 'ship') {
      // it rides the swell
      ay = G.water - (sp.water - deck[1]) * s + Math.sin(now / 690) * 3.2 * scale;
      rot = Math.sin(now / 910) * 1.4 + Math.sin(now / 430) * .4;
    } else {
      ay = G.ground - (sp.ground - deck[1]) * s;
      // rail joints for the train, the suspension for the car
      ay += kind === 'train' ? Math.sin(now / 47) * .7 * moving : Math.sin(now / 105) * 1.6 * moving;
      // nose up as it pulls away, down as it brakes
      rot = -accN * (kind === 'car' ? 2.4 : .8);
    }
    put(el, deck, ax, ay, s, flip, rot);
    if (el._wheels.length) roll(el, d * (ax - x0), s);
    if (el._body) el._body.setAttribute('transform', `translate(0 ${(Math.sin(now / 83) * 1.6 * moving).toFixed(2)})`);
    // where the phone stands on board: it turns with the deck, and rocks back as it pulls away
    const D = stand(ax, ay, G.ride, rot - accN * (kind === 'ship' ? 2 : 5));
    const jump = G.H * (mobile ? .07 : .1);
    if (u < .27) P = {...A, r: 0};
    else if (u < .4) P = hop(A, D, seg(u, .27, .4), jump, kind === 'car' ? 360 * d : 0);
    else if (u < .66) P = D;
    else if (u < .78) P = hop(D, B, seg(u, .66, .78), jump * .8);
    else P = {...B, r: 0};
    // a squash on landing
    const land = u < .5 ? seg(u, .4, .45) : seg(u, .78, .83);
    P.q = Math.sin(Math.PI * land) * .07;
    // a shadow on the deck
    const onDeck = u >= .4 && u < .66 ? 1 : u >= .27 && u < .4 ? seg(u, .34, .4) : u >= .66 && u < .78 ? 1 - seg(u, .66, .72) : 0;
    cr.shadow.style.opacity = onDeck;
    cr.shadow.style.transform = `translate3d(${ax}px, ${ay + 2}px, 0) rotate(${rot}deg) scale(${G.ride}, ${Math.max(.4, G.ride)})`;
    // the line it runs on: laid ahead of it, taken up behind
    const strip = kind === 'train' ? cr.rails : kind === 'car' ? cr.road : null;
    if (strip) {
      const a = ease(seg(u, .0, .2)) * 100, b = ease(seg(u, .82, 1)) * 100;
      strip.style.clipPath = d > 0 ? `inset(0 ${100 - a}% 0 ${b}%)` : `inset(0 ${b}% 0 ${100 - a}%)`;
    } else {
      const k = easeOut(seg(u, .0, .18)) * (1 - easeIn(seg(u, .84, 1)));
      const dy = (1 - k) * (G.H - G.water + 60);
      cr.seaBack.style.transform = `translate3d(0, ${dy}px, 0)`;
      cr.seaFront.style.transform = `translate3d(0, ${dy}px, 0)`;
    }
    return P;
  }

  /* tags hang on strings: a damped pendulum, pushed by the phone's travel */
  const swing = [{a: 0, w: 0}, {a: 0, w: 0}];
  let lastX = null, active = -2, running = false, raf = 0, lastT = performance.now(), shown = '', ppDrawn = false;
  function frame(now) {
    const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    render(dt, now);
    raf = running ? requestAnimationFrame(frame) : 0;
  }
  function render(dt, now) {
    if (!anchors.length || !G.rest) return;
    const S = stateAt();
    const A = G.rest[S.i], B = G.rest[S.j];
    const kind = S.j !== S.i && S.u > 0 && S.u < 1 && cr[via[S.j]] ? via[S.j] : '';
    // the carrier for this crossing, and nothing else
    if (kind !== shown) {
      shown = kind;
      for (const k of ['plane', 'train', 'car', 'ship', 'lander']) if (cr[k]) cr[k].classList.toggle('is-on', k === kind);
      if (cr.rails) {
        cr.rails.classList.toggle('is-on', kind === 'train');
        cr.road.classList.toggle('is-on', kind === 'car');
        cr.seaBack.classList.toggle('is-on', kind === 'ship');
        cr.seaFront.classList.toggle('is-on', kind === 'ship');
        cr.clouds.forEach(c => c.classList.toggle('is-on', kind === 'plane'));
        cr.line.classList.toggle('is-on', kind === 'plane' || kind === 'lander');
        cr.shadow.classList.toggle('is-on', kind === 'train' || kind === 'car' || kind === 'ship');
      }
    }
    let P;
    if (kind) P = carry(kind, S.u, A, B, now);
    else if (S.j !== S.i) {
      // no carrier: slide across as before
      const x = lerp(A.x, B.x, S.move);
      P = {x, y: lerp(A.y, B.y, S.move), s: lerp(A.s, B.s, S.move), r: Math.sin(Math.PI * S.move) * 2.5 * Math.sign(B.x - A.x)};
    } else P = {...A};
    const enterY = (1 - easeOut(S.enter)) * vh * .75;
    const q = P.q || 0;
    rig.style.transform = `translate3d(${P.x - G.cx0}px, ${P.y - G.cy0 + enterY}px, 0) rotate(${P.r || 0}deg) scale(${P.s * (1 + q * .6)}, ${P.s * (1 - q)})`;

    // screens change over half way between two stops
    const ka = keyOf(S.i), kb = keyOf(S.j), key = S.u < .5 ? ka : kb;
    for (const [k, d] of Object.entries(layers)) d.classList.toggle('is-on', k === key);
    if (key === 'customize' && !ppDrawn) ppDrawn = drawPPMap();
    const liveOn = !!LIVE[key];
    live.classList.toggle('is-on', liveOn);
    if (liveOn) {
      const va = LIVE[ka] || LIVE[kb], vb = LIVE[kb] || LIVE[ka];
      drawMini(va, vb, S.move, key, now);
      const t = LIVE[key].pill;
      if (pill.dataset.t !== t) { pill.dataset.t = t; pill.innerHTML = (key === 'today' ? '<svg viewBox="0 0 24 24"><path d="M20 4 4 11l7 2 2 7Z"/></svg>' : '') + t; }
    }

    // the artifacts: out at a stop, put away while the phone is in transit
    const at = S.enter < 1 ? -1 : S.j === S.i ? S.i : S.u <= .16 ? S.i : S.u >= .84 ? S.j : -1;
    if (at !== active) {
      active = at;
      const k = at >= 0 ? keyOf(at) : '';
      for (const [name, a] of Object.entries(arts)) {
        const on = name === k || name === 'hand' && k === 'tickets';
        a.classList.toggle('is-on', on);
        if (name === 'tickets' && on && !printer.printed) printer.print();
        if (name === 'place') [...a.children].forEach(pl => { pl.style.transform = on ? pl._on : pl._off; });
        if (name === 'customize') [...a.children].forEach(c => fanTo(c, on));
      }
    }
    // the tags swing with the phone's travel
    const vx = lastX === null ? 0 : (P.x - lastX) / Math.max(dt, .001);
    lastX = P.x;
    swing.forEach((s, i) => {
      const acc = -vx * .012 * (1 + i * .3) - s.a * 26 - s.w * 2.6;
      s.w += acc * dt; s.a = clamp(s.a + s.w * dt, -.6, .6);
    });
    if (arts.journal) [...arts.journal.children].forEach((h, i) => {
      // hanging from the eyelet, the tag points down, angled a little away from the phone
      const deg = (i ? 62 : 94) + (swing[i].a + Math.sin(now / 1400 + i * 1.7) * .03) / D2R;
      h.style.transform = `rotate(${deg}deg)`;
    });
  }

  /* ---- the live top pane ---- */
  function drawMini(va, vb, t, key, now) {
    if (!mini.data) return;
    const w = mini.w, h = mini.h;
    const ll = toLL(slerp(vec([va.lon, va.lat]), vec([vb.lon, vb.lat]), t));
    const R = Math.exp(lerp(Math.log(va.r), Math.log(vb.r), t)) * w;
    // the journal's trip page paints only that trip's countries
    const only = LIVE[key].only;
    for (const a of ALL32)
      mini.paint(a, LIVED.has(a) ? INK.lived : INK.visited, only ? (only.includes(a) ? 1 : 0) : (key === 'today' && a === 'AUT' ? 0 : 1));
    for (const a of WISHLIST) mini.hatch(a, INK.wishlist, only ? 0 : 1);
    mini.hatch('AUT', INK.planned, key === 'today' ? 1 : 0);
    const view = {cx: w / 2, cy: h * .5, R, lon: ll[0], lat: ll[1], alpha: 1};
    mini.draw(view);
    const d = Math.min(2, devicePixelRatio || 1);
    mo.setTransform(d, 0, 0, d, 0, 0);
    mo.clearRect(0, 0, w, h);
    const ow = clamp(R * .0085, 1.6, 4);
    for (const [a, b] of LIVE[key].routes || []) {
      const A = vec(a), B = vec(b), pts = [];
      for (let i = 0; i <= 48; i++) { const q = toLL(slerp(A, B, i / 48)); pts.push(mini.project(q[0], q[1], .001, view)); }
      for (const [lw, c] of [[ow, 'rgb(0,67,140)'], [ow * .62, 'rgb(89,168,255)']]) {
        mo.lineWidth = lw; mo.strokeStyle = c; mo.lineCap = 'round';
        mo.beginPath(); let pen = false;
        for (const q of pts) { if (q.vis) { pen ? mo.lineTo(q.x, q.y) : mo.moveTo(q.x, q.y); pen = true; } else pen = false; }
        mo.stroke();
      }
      for (const e of [a, b]) {
        const q = mini.project(e[0], e[1], .001, view);
        if (!q.vis) continue;
        const r = clamp(R * .011, 2.2, 4.4);
        mo.fillStyle = 'rgb(0,67,140)'; mo.beginPath(); mo.arc(q.x, q.y, r, 0, 7); mo.fill();
        mo.fillStyle = '#fff'; mo.beginPath(); mo.arc(q.x, q.y, r * .6, 0, 7); mo.fill();
      }
    }
    if (LIVE[key].loc) {
      const q = mini.project(LIVE[key].loc[0], LIVE[key].loc[1], .002, view);
      const ph = (now / 1400) % 1;
      mo.strokeStyle = `rgba(255,170,40,${1 - ph})`; mo.lineWidth = 2;
      mo.beginPath(); mo.arc(q.x, q.y, 6 + ph * 16, 0, 7); mo.stroke();
      mo.fillStyle = '#fff'; mo.beginPath(); mo.arc(q.x, q.y, 6, 0, 7); mo.fill();
      mo.fillStyle = 'rgb(240,150,30)'; mo.beginPath(); mo.arc(q.x, q.y, 4, 0, 7); mo.fill();
    }
  }

  measure();
  ART.ready.then(() => { setupArtifacts(); active = -2; measure(); }).catch(() => {});
  if (document.fonts) document.fonts.ready.then(measure);
  addEventListener('resize', measure);
  if (RM) return;
  new IntersectionObserver(es => {
    running = es[es.length - 1].isIntersecting;
    if (running && !raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); }
  }).observe(tour);
}

/* -------------------------------------------------------------
   3. THE SMALL THINGS
   ------------------------------------------------------------- */
ART.ready.then(() => {
  // a Flighty itinerary, printed
  const st = $('#shareTicket');
  if (st) st.appendChild(ART.frame(ART.ticket({mode: 'flight', ref: 'BA 2816', from: {code: 'LGW', sub: 'London · Gatwick'}, to: {code: 'CPH', sub: 'Copenhagen · Kastrup'}, fields: [['DATE', '9 OCT 2026'], ['BOARDS', '07:05'], ['SEAT', '23C']], day: '09', month: 'OCT', line: '07:05', footer: 'IN 8 DAYS', seed: 'ba2816'}), 480, 200, 230));
  // the hand of paper behind the download icon, dealt like PocaPal's photocards:
  // every piece the same height, pivoting on a point below the hand
  const fan = $('#ctaFan');
  if (!fan) return;
  const card = parseFloat(getComputedStyle(fan).getPropertyValue('--card')) || 110, H = card * 1.55;
  const stand = (art, w, h) => {
    // a landscape artifact stood on its end (turned a quarter clockwise), H tall
    const box = document.createElement('div');
    box.className = 'fan-turn';
    const k = H / w;
    box.style.width = h * k + 'px'; box.style.height = H + 'px';
    art.style.position = 'absolute'; art.style.left = '50%'; art.style.top = '50%';
    art.style.transform = `translate(-50%, -50%) rotate(90deg) scale(${k})`;
    box.appendChild(art);
    return box;
  };
  const items = [
    [-2, () => { const c = document.createElement('div'); c.className = 'fan-pass'; c.style.height = H + 'px'; c.innerHTML = '<svg viewBox="8 8 48 48" aria-hidden="true"><circle cx="32" cy="32" r="22"/><ellipse cx="32" cy="32" rx="9.5" ry="22"/><path d="M10 32h44M13.5 21h37M13.5 43h37"/></svg><p>Peregrino</p><p>Passport</p>'; return c; }],
    [-1, () => stand(ART.ticket({mode: 'flight', ref: 'TP 1185', from: {code: 'PRG', sub: 'Prague'}, to: {code: 'LIS', sub: 'Lisbon'}, fields: [['DATE', '24 OCT 2026'], ['BOARDS', '06:40'], ['SEAT', '—']], day: '24', month: 'OCT', line: '06:40', footer: 'IN 23 DAYS', seed: 'fan|tk'}), 480, 200)],
    [1, () => { const pl = ART.polaroid({img: 'assets/photos/torii.jpg', caption: 'Kyoto, day 3'}); pl.style.setProperty('--w', H * .72 + 'px'); return pl; }],
    [2, () => stand(ART.tag({title: 'Camino summer', countries: ['PT', 'ES'], days: 44, dates: '4 JUL – 16 AUG', img: 'assets/photos/mountains.jpg', state: 'used', seed: 'fan|tag', string: false}), 460, 240)],
  ];
  const icon = fan.querySelector('.cta-icon');
  for (const [k, make] of items) {
    const f = document.createElement('div');
    f.className = 'fan-item';
    f.style.setProperty('--k', k);
    f.appendChild(make());
    fan.insertBefore(f, icon);
  }
});
const ring = $('#ring');
if (ring) {
  const days = 47, C = 2 * Math.PI * 50, out = $('#ringDays');
  new IntersectionObserver((es, o) => {
    if (!es.some(e => e.isIntersecting)) return;
    o.disconnect();
    ring.style.strokeDashoffset = C * (1 - days / 90);
    const t0 = performance.now();
    const step = now => { const t = easeOut(clamp((now - t0) / (RM ? 1 : 1400))); out.textContent = Math.round(days * t); if (t < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, {threshold: .5}).observe(ring);
}
const cal = $('#miniCal');
if (cal) {
  // late September to early November 2026; 1 October is a Thursday
  const cells = [];
  for (let d = 28; d <= 30; d++) cells.push({d, out: true});
  for (let d = 1; d <= 31; d++) cells.push({d});
  for (let d = 1; cells.length < 42; d++) cells.push({d, out: true});
  const mark = d => d === 1 ? 'today' : d === 8 ? 't3' : d >= 17 && d <= 20 ? 't1' : d >= 24 && d <= 26 ? 't2' : '';
  cal.innerHTML = cells.map(c => `<i class="${c.out ? '' : mark(c.d)}"${c.out ? ' style="opacity:.35"' : ''}>${c.d}</i>`).join('');
}

/* -------------------------------------------------------------
   4. PAGE: reveal on scroll, the nav over paper, the FAQ
   ------------------------------------------------------------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), {threshold: .18, rootMargin: '0px 0px -6% 0px'});
$$('.reveal, #ctaBrand').forEach(n => io.observe(n));

const nav = $('#nav'), paper = $('.paper');
const navTone = () => nav.classList.toggle('is-light', paper.getBoundingClientRect().top < 48);
addEventListener('scroll', navTone, {passive: true});
navTone();

$$('.faq-q').forEach(q => q.addEventListener('click', () => {
  const item = q.closest('.faq-item');
  const open = !item.classList.contains('is-open');
  item.classList.toggle('is-open', open);
  q.setAttribute('aria-expanded', String(open));
}));

})();
