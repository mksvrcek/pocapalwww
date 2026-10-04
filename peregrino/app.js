/* =============================================================
   Peregrino — product page choreography

   1. The journey (#story): scroll-scrubbed. The globe (globe.js) rises
      out of the hero and follows one summer: a drive, flights, the Camino
      on foot and a train. A country is painted the moment the route
      crosses into it, one at a time, and its stamp lands there. Then a
      closed passport comes up, the globe settles onto the emblem on its
      cover, the cover swings open underneath it the way the app's book
      opens, and the globe dives into the data page and unrolls into its
      map. The summer's stamps land on the next page and the phone comes
      to sit beside it.
   2. The tour (#tour): one phone pinned while the blades scroll past,
      crossing sides to sit opposite each one, bringing out what the app
      prints for it (artifacts.js).
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
   Twenty-six countries before the summer (Europe 19, Asia 6, North
   America 1); the summer adds six, which makes the 32 (Europe 25,
   Asia 6, North America 1) on the app's own Statistics screen.
   ------------------------------------------------------------- */
const INK = {visited: [217, 69, 59], lived: [224, 162, 26], wishlist: [124, 91, 230], planned: [138, 147, 160]};
const LIVED = ['CZE', 'GBR', 'KOR'];
const VISITED = ['DEU', 'POL', 'SVK', 'HUN', 'ITA', 'FRA', 'NLD', 'BEL', 'LUX', 'DNK', 'CHE', 'HRV', 'SVN', 'GRC', 'IRL', 'FIN', 'MCO',
                 'JPN', 'CHN', 'THA', 'VNM', 'HKG', 'USA'];
const BASE_COUNT = LIVED.length + VISITED.length;        // 26
const WISHLIST = ['MAR', 'CAN'];
const PLANNED = ['ISL', 'NOR'];                          // pencilled in, inked once reached

/* route colours: TravelMode.tintColor, outer mixed 45% to black, inner 35% to white */
const TINT = {flight: [0, 122, 255], train: [52, 199, 89], bus: [255, 149, 0], drive: [255, 59, 48], ferry: [48, 176, 199], walk: [162, 132, 94]};
const outer = m => `rgb(${TINT[m].map(v => Math.round(v * .55))})`;
const inner = m => `rgb(${TINT[m].map(v => Math.round(v * .65 + 255 * .35))})`;
const AIRLINES = [['#f5f5f5', '#2659b3'], ['#f2f2f2', '#cc2626'], ['#ebebe0', '#008059'], ['#f5f5f5', '#e69900'], ['#334d80', '#334d80'], ['#f5f5f5', '#8c008c']];

const CITY = {
  PRG: {ll: [14.42, 50.08], n: 'Prague'},   VIE: {ll: [16.37, 48.21], n: 'Vienna'},
  LIS: {ll: [-9.2, 38.76], n: 'Lisbon'},    SCQ: {ll: [-8.54, 42.88], n: 'Santiago'},
  STO: {ll: [18.07, 59.33], n: 'Stockholm'}, OSL: {ll: [10.75, 59.91], n: 'Oslo'},
  RKV: {ll: [-21.88, 64.13], n: 'Reykjavík'},
};
/* the summer: ground legs follow their roads and rails through these points */
const LEGS = [
  {mode: 'drive', from: 'PRG', to: 'VIE', title: 'Drive', via: [[14.62, 49.96], [15.2, 49.62], [15.59, 49.40], [16.12, 49.27], [16.61, 49.19], [16.66, 48.98], [16.64, 48.80], [16.55, 48.58], [16.45, 48.38]]},
  {mode: 'flight', from: 'VIE', to: 'LIS', title: 'OS 381', air: 1},
  {mode: 'walk', from: 'LIS', to: 'SCQ', title: 'Camino Português', via: [[-9.0, 38.9], [-8.68, 39.24], [-8.41, 39.60], [-8.43, 40.21], [-8.45, 40.57], [-8.61, 41.15], [-8.62, 41.53], [-8.58, 41.77], [-8.64, 42.03], [-8.61, 42.28], [-8.65, 42.43], [-8.64, 42.60], [-8.66, 42.74]]},
  {mode: 'flight', from: 'SCQ', to: 'STO', title: 'SK 1592', air: 2},
  {mode: 'train', from: 'STO', to: 'OSL', title: 'Train', via: [[17.3, 59.5], [16.54, 59.61], [15.84, 59.39], [15.21, 59.27], [14.11, 59.31], [13.50, 59.38], [13.32, 59.50], [12.59, 59.65], [12.29, 59.89], [12.00, 60.19], [11.05, 59.96]]},
  {mode: 'flight', from: 'OSL', to: 'RKV', title: 'FI 319', air: 5},
  {mode: 'flight', from: 'RKV', to: 'PRG', title: 'FI 532', air: 0, home: true},
];
const STAMP_DATE = {AUT: '04.07.2026', PRT: '06.07.2026', ESP: '24.07.2026', SWE: '02.08.2026', NOR: '06.08.2026', ISL: '09.08.2026'};

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
/** A route as dense unit vectors with the distance run so far. */
function buildPath(points, flight) {
  const pts = [];
  if (flight) {
    const a = vec(points[0]), b = vec(points[1]), n = Math.max(48, Math.round(angle(a, b) * 160));
    for (let i = 0; i <= n; i++) pts.push(slerp(a, b, i / n));
  } else {
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(i + 2, points.length - 1)];
      const km = angle(vec(p1), vec(p2)) * EARTH_KM, n = Math.max(4, Math.ceil(km / 2));
      for (let k = 0; k < n; k++) pts.push(vec(catmull(p0, p1, p2, p3, k / n)));
    }
    pts.push(vec(points[points.length - 1]));
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + angle(pts[i - 1], pts[i]) * EARTH_KM);
  return {pts, cum, km: cum[cum.length - 1]};
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
const a2of = a3 => (WORLD && WORLD.find(c => c.a3 === a3) || {}).a2;
const nameOf = a3 => (WORLD && WORLD.find(c => c.a3 === a3) || {}).n || a3;

/* -------------------------------------------------------------
   1. THE JOURNEY
   `T` is the beats as scroll progress across #story (0 → 1).
   ------------------------------------------------------------- */
const T = {
  heroOut: [.012, .06], rise: [0, .1], journey: [.1, .7],
  settle: [.7, .745],       // the camera pulls back to the whole summer
  rise2: [.725, .79],       // a closed passport comes up behind the globe…
  dock: [.745, .795],       // …and the globe settles onto its cover's emblem
  open: [.8, .848],         // the cover swings open underneath it
  fly: [.848, .876],        // the globe dives into the data page…
  unroll: [.856, .882],     // …unrolls into its map…
  print: [.872, .892],      // …and becomes print
  stamps: [.888, .935],     // the summer's stamps land, one at a time
  side: [.93, .97],         // the phone comes to sit beside it
  outro: [.955, .99],
  START: [6, 14],           // where the globe faces as the page opens
};

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
  const pop = $('#stampPop'), phone = $('#phoneWrap'), outro = $('#storyOutro'), nudge = $('#nudge'), pass = $('#pass');
  let failed = !globe.ok;

  /* ---- the legs, timed: the ground legs get the room, flights scale with distance ---- */
  const legs = LEGS.map(l => {
    const pts = [CITY[l.from].ll, ...(l.via || []), CITY[l.to].ll];
    const path = buildPath(pts, l.mode === 'flight');
    const d = angle(vec(CITY[l.from].ll), vec(CITY[l.to].ll));
    const w = l.mode === 'flight' ? .55 + .7 * Math.sqrt(d) : l.mode === 'walk' ? 1.55 : l.mode === 'train' ? 1.2 : 1.1;
    return {...l, path, d, w, dwell: l.home ? .3 : .42, events: []};
  });
  const homeW = .55;
  const total = homeW + legs.reduce((s, l) => s + l.w + l.dwell, 0);
  let acc = homeW;
  for (const l of legs) {
    l.t0 = lerp(T.journey[0], T.journey[1], acc / total); acc += l.w;
    l.t1 = lerp(T.journey[0], T.journey[1], acc / total); acc += l.dwell;
    l.t2 = lerp(T.journey[0], T.journey[1], acc / total);
  }
  const homeT = [T.journey[0], legs[0].t0];
  const legEase = l => l.mode === 'flight' ? ease : smooth;
  /* scroll position at which a leg's vehicle has gone fraction s of the way */
  function pAt(l, s) {
    const e = legEase(l);
    let a = 0, b = 1;
    for (let k = 0; k < 30; k++) { const m = (a + b) / 2; if (e(m) < s) a = m; else b = m; }
    return lerp(l.t0, l.t1, (a + b) / 2);
  }

  /* ---- where each new country starts: the border crossing, or the arrival ---- */
  const events = [];            // {a3, p, ll, leg}
  function findEvents() {
    const seen = new Set([...LIVED, ...VISITED]);
    for (const l of legs) {
      if (l.mode === 'flight') {
        const ll = CITY[l.to].ll, a3 = countryAt(ll[0], ll[1]);
        if (a3 && !seen.has(a3)) { seen.add(a3); events.push({a3, p: l.t1, ll, leg: l}); }
        continue;
      }
      let prev = countryAt(...CITY[l.from].ll);
      for (let i = 0; i < l.path.pts.length; i += 2) {
        const ll = toLL(l.path.pts[i]), a3 = countryAt(ll[0], ll[1]);
        if (a3 && a3 !== prev) {
          if (!seen.has(a3)) { seen.add(a3); events.push({a3, p: pAt(l, l.path.cum[i] / l.path.km), ll, leg: l}); }
          prev = a3;
        }
      }
    }
  }

  /* ---- sizes ---- */
  let vw = 0, vh = 0, R0 = 0, R1 = 0, dpr = 1, ZG = 8, PW = 420, phoneH = 612, FL = null;
  function measure() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    if (RM) {
      // the still: the passport at a fixed size in the page's own flow
      PW = Math.round(Math.min(400, vw * .84));
      pass.style.setProperty('--pw', PW + 'px');
      drawMap(mapCanvas && !!mapCanvas.dataset.summer);
      drawStill();
      return;
    }
    for (const c of [sky, over]) { c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr); }
    globe.resize();
    R0 = Math.max(vw, vh) * .62;
    R1 = Math.min(vw * (vw < 700 ? .42 : .34), vh * .36);
    ZG = vw < 700 ? 8.5 : 8;
    // the passport: as large as it can be under the closing line
    const outroBottom = outro.offsetTop + outro.offsetHeight;
    const room = vh - outroBottom - 28;
    PW = Math.round(Math.min(440, vw * (vw < 700 ? .8 : .34), room / 1.4, (vh - 120) / 1.4));
    pass.style.setProperty('--pw', PW + 'px');
    const phoneW = phone.offsetWidth; phoneH = phone.offsetHeight;
    const bookH = PW * 1.4;
    const cy = outroBottom + 14 + room / 2 - vh / 2;
    if (vw >= 700) {
      const s = Math.min(1, bookH / phoneH * 1.02), gap = Math.max(36, vw * .04);
      const width = PW + gap + phoneW * s;
      FL = {passX: -width / 2 + PW / 2, passY: cy, phoneX: width / 2 - phoneW * s / 2, phoneY: cy, phoneS: s};
    } else {
      const s = Math.min(.5, bookH * .62 / phoneH);
      FL = {passX: -vw * .08, passY: cy - 10, phoneX: vw * .3, phoneY: cy + bookH * .18, phoneS: s};
    }
    drawMap(mapCanvas && !!mapCanvas.dataset.summer);
    measureEmblem();
    dirty = true;
  }
  /* where the cover's emblem sits on the closed book (its circle is 22 of the 48 units across) */
  let EMB = {x: 0, y: 0, r: 60};
  function measureEmblem() {
    const e = $('#coverEmblem');
    if (e && e.offsetWidth) EMB = {x: e.offsetLeft + e.offsetWidth / 2, y: e.offsetTop + e.offsetHeight / 2, r: e.offsetWidth * 22 / 48};
  }
  /* with reduced motion, the globe is drawn once, the whole summer on it */
  let stillReady = false;
  function drawStill() {
    if (!stillReady || !globe.data || !WORLD) return;
    paintAt(globe, 1, true);
    globe.resize();
    globe.draw({cx: globe.w / 2, cy: globe.h / 2, R: Math.min(globe.w, globe.h) * .4, lon: 4, lat: 47, alpha: 1});
  }

  /* ---- the passport: PassportView on top, a stamp page below, the cover ---- */
  const stampCells = [];
  const globeSvg = '<svg viewBox="8 8 48 48" aria-hidden="true"><circle cx="32" cy="32" r="22"/><ellipse cx="32" cy="32" rx="9.5" ry="22"/><path d="M10 32h44M13.5 21h37M13.5 43h37"/></svg>';
  pass.innerHTML = `
    <div class="pass-board"></div>
    <div class="pass-page pass-top dp">
      <div class="dp-head"><div><p class="dp-title">Peregrino Passport</p><p class="dp-sub">Passport · Pas · 여권</p></div><span class="dp-btn">${ART.glyph('globe', '#fff', 14)}</span></div>
      <div class="dp-body">
        <div>
          <p class="dp-k">Countries &amp; territories</p>
          <p class="dp-big"><b id="dpCount">${BASE_COUNT}</b><span> / 248</span><em id="dpPct">(${Math.round(BASE_COUNT / 248 * 100)}%)</em></p>
          <div class="dp-row"><div><p class="dp-k">Continents</p><p class="dp-v">3<span> / 7</span></p></div><div><p class="dp-k">Total trips</p><p class="dp-v" id="dpTrips">15</p></div></div>
          <div class="dp-row"><div><p class="dp-k">Top continent</p><p class="dp-v">Europe</p></div><div><p class="dp-k">Member since</p><p class="dp-v">Apr 2026</p></div></div>
        </div>
        <div class="dp-map"><p class="dp-k">Map · Mapa · 지도</p><canvas id="dpMap"></canvas></div>
      </div>
      <p class="mrz">P&lt;PGNTRAVELER&lt;&lt;PEREGRINO&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br>ISSUED01OCT26&lt;&lt;&lt;32V&lt;&lt;&lt;248T&lt;&lt;&lt;EU&lt;AS&lt;NA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</p>
    </div>
    <div class="pass-leaf" id="passLeaf">
      <div class="pass-face pass-page sp"><p class="sp-head">Entries · Vstupy · 입국</p><div class="sp-grid" id="spGrid"></div><span class="sp-no">4</span></div>
      <div class="pass-face cover"><p class="cover-name">Peregrino</p><span class="cover-emblem" id="coverEmblem">${globeSvg}</span><p class="cover-kind">Passport · Pas · 여권</p></div>
    </div>`;
  const dpCount = $('#dpCount'), dpPct = $('#dpPct'), dpTrips = $('#dpTrips'), mapCanvas = $('#dpMap');
  const passLeaf = $('#passLeaf'), passBoard = pass.querySelector('.pass-board');
  function fillStamps() {
    const grid = $('#spGrid');
    grid.innerHTML = '';
    stampCells.length = 0;
    for (const e of events) {
      const cell = document.createElement('div');
      cell.className = 'sp-cell';
      const s = ART.stampEl(a2of(e.a3), 100, {dark: true, date: STAMP_DATE[e.a3]});
      cell.appendChild(s);
      grid.appendChild(cell);
      stampCells.push(s);
    }
  }
  /* the data page's map: Mercator, visited in white, the rest traced faintly */
  const MERC = {top: 80, bottom: -58};
  const merc = lat => Math.log(Math.tan(Math.PI / 4 + clamp(lat, -85, 85) * D2R / 2));
  function drawMap(withSummer) {
    if (!WORLD || !mapCanvas) return;
    const w = mapCanvas.clientWidth;
    if (!w) return;
    const h = Math.round(w / (2 * Math.PI / (merc(MERC.top) - merc(MERC.bottom))));
    mapCanvas.style.height = h + 'px';
    mapCanvas.width = Math.round(w * dpr); mapCanvas.height = Math.round(h * dpr);
    const c = mapCanvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const on = new Set([...LIVED, ...VISITED, ...(withSummer ? events.map(e => e.a3) : [])]);
    const top = merc(MERC.top), span = top - merc(MERC.bottom);
    c.lineWidth = .5; c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineJoin = 'round';
    for (const k of WORLD) {
      if (k.a3 === 'ATA') continue;
      c.beginPath();
      for (const r of k.r) {
        for (let i = 0; i < r.length; i += 2) {
          const x = (r[i] + 180) / 360 * w, y = (top - merc(r[i + 1])) / span * h;
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath();
      }
      if (on.has(k.a3)) { c.fillStyle = '#fff'; c.fill('evenodd'); } else { c.fillStyle = 'rgba(255,255,255,.07)'; c.fill('evenodd'); c.stroke(); }
    }
    mapCanvas.dataset.summer = withSummer ? '1' : '';
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
    for (let i = 0; i < 6; i++) {
      const p = vec([rnd() * 140 - 50, rnd() * 50 + 15]), q = vec([rnd() * 360 - 180, rnd() * 120 - 60]);
      FLEET.push({kind: 'plane', p, ax: norm3(cross(p, q)), w: .028 + rnd() * .02, ph: rnd() * Math.PI * 2, c: AIRLINES[i % AIRLINES.length]});
    }
    for (const [lon, lat, hd] of [[-30, 45, 40], [-20, 30, -30], [4, 55.5, 10], [18, 34.5, 80], [-45, 25, 60], [150, 30, 20]]) {
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
    const pts = [];
    for (let i = 0; i <= last; i++) pts.push(proj(path.pts[i], .001, view));
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
  for (const m of ['drive', 'walk', 'train', 'flight']) {
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
    if (img && img.complete) ox.drawImage(img, x - r * .62, y - r * .62, r * 1.24, r * 1.24);
  }

  /* ---- the state of the summer at p ---- */
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
  /* the camera follows the traveller: close in on the ground, further out in the air */
  const zoomFor = (l, s) => l.mode === 'flight' ? 1.45 * (1 - .3 * Math.sin(Math.PI * s) * Math.min(1, l.d / .45)) : ZG;
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

  /* ---- painting: the visited, the pencilled plans, and the summer as it happens ---- */
  function paintAt(g, p, all) {
    for (const a of LIVED) g.paint(a, INK.lived, 1);
    for (const a of VISITED) g.paint(a, INK.visited, 1);
    for (const a of WISHLIST) g.hatch(a, INK.wishlist, 1);
    for (const a of PLANNED) g.hatch(a, INK.planned, 1);
    for (const e of events) {
      const k = all ? 1 : smooth(seg(p, e.p, e.p + .0065));
      g.paint(e.a3, INK.visited, k);
      if (PLANNED.includes(e.a3)) g.hatch(e.a3, INK.planned, 1 - k);
    }
  }

  /* ---- progress ---- */
  let p = 0, dirty = true, running = false, raf = 0, spinT = 0, last = performance.now(), overShown = true;
  const progress = () => { const r = story.getBoundingClientRect(); return clamp(-r.top / (r.height - vh)); };
  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    const np = progress();
    if (np !== p) { p = np; dirty = true; }
    if (!RM && p < T.journey[0]) spinT += dt * .0035 * (1 - seg(p, .02, T.journey[0]));
    // the fleet keeps flying while the globe is up
    if (p < T.dock[0] + .025) dirty = true;
    if (dirty) { render(now); dirty = false; }
    raf = running ? requestAnimationFrame(frame) : 0;
  }

  function render(now) {
    /* headline */
    const ho = seg(p, T.heroOut[0], T.heroOut[1]);
    heroCopy.style.opacity = 1 - ho;
    heroCopy.style.transform = `translate(-50%, ${-ho * 40}px)`;
    heroCopy.classList.toggle('is-through', ho > .3);

    const J = journeyAt(p);
    /* camera: the rise, the summer, the pull-back, the flight into the passport */
    const rise = ease(seg(p, T.rise[0], T.rise[1]));
    const cam = cameraAt(p, J);
    let v = cam.v, Z = cam.Z;
    if (p < T.journey[0]) {
      v = slerp(vec([T.START[0] + spinT, T.START[1]]), vec(CITY.PRG.ll), ease(seg(p, .02, T.journey[0])));
      Z = 1.9;
    }
    let R = R1 * Z, cx = vw / 2, cy = vh * .53;
    if (rise < 1) {
      R = logLerp(R0, R1 * 1.9, rise);
      cy = lerp(vh + R0 * .6, vh * .53, rise);
    }
    const st = ease(seg(p, T.settle[0], T.settle[1]));
    if (st > 0) {
      v = slerp(v, vec([1, 54]), st);
      R = logLerp(R, R1 * 1.05, st);
    }
    let [lon, lat] = toLL(v);

    /* the passport comes up closed, opens, then moves aside for the phone. The cover
       swings down on the app's page-turn spring and darkens as it turns (sin × 0.5). */
    const r2 = ease(seg(p, T.rise2[0], T.rise2[1])), opT = seg(p, T.open[0], T.open[1]), op = ease(opT);
    const sd = ease(seg(p, T.side[0], T.side[1]));
    const bookX = lerp(0, FL.passX, sd), bookY = lerp(vh * .7, 0, r2) + lerp(PW * .35, 0, op) + lerp(0, FL.passY, sd), bookS = lerp(.9, 1, r2);
    pass.style.opacity = Math.min(1, r2 * 2);
    pass.style.transform = `translate3d(${bookX}px, ${bookY}px, 0) scale(${bookS})`;
    const turn = 180 * (1 - springOut(opT));
    passLeaf.style.transform = `rotateX(${turn}deg)`;
    passLeaf.style.setProperty('--shade', (Math.abs(Math.sin(turn * D2R)) * .5).toFixed(3));
    passBoard.style.opacity = seg(op, .2, .8);

    /* the globe settles onto the cover's emblem, and stays over the data page as the cover opens */
    const dock = ease(seg(p, T.dock[0], T.dock[1]));
    if (dock > 0) {
      const ex = vw / 2 + bookX + bookS * (EMB.x - PW / 2), ey = vh / 2 + bookY + bookS * (EMB.y - PW * .7);
      cx = lerp(cx, ex, dock); cy = lerp(cy, ey, dock); R = logLerp(R, EMB.r * bookS, dock);
    }

    /* the globe flies to the data page, unrolls and turns into print */
    const fly = ease(seg(p, T.fly[0], T.fly[1])), unroll = ease(seg(p, T.unroll[0], T.unroll[1])), printK = smooth(seg(p, T.print[0], T.print[1]));
    let flat = {x: 0, y: 0, w: 1, h: 1};
    if (fly > 0) {
      const m = mapCanvas.getBoundingClientRect(), s = stage.getBoundingClientRect();
      flat = {x: m.left - s.left, y: m.top - s.top, w: m.width, h: m.height};
      cx = lerp(cx, flat.x + flat.w / 2, fly);
      cy = lerp(cy, flat.y + flat.h / 2, fly);
      R = logLerp(R, flat.h * .62, fly);
      // turn to the map's own middle on the way, so it unrolls the right way round
      [lon, lat] = toLL(slerp(v, vec([0, 20]), fly));
    }
    const landed = seg(p, T.print[1], T.print[1] + .008);
    if (WORLD && (landed > 0) !== !!mapCanvas.dataset.summer) drawMap(landed > 0);
    const view = {cx, cy, R, lon, lat, alpha: 1 - landed, morph: unroll, flat, print: printK, mercTop: MERC.top, mercBottom: MERC.bottom, atmosphere: 1 - fly};
    if (!failed) {
      paintAt(globe, p);
      globe.draw(view);
    }
    drawSky(GL.viewBasis(lon, lat), 1 - seg(p, T.rise2[0], T.open[1]) * .6);

    /* overlay: the fleet, the routes, the stops, the traveller */
    ox.setTransform(dpr, 0, 0, dpr, 0, 0);
    ox.clearRect(0, 0, vw, vh);
    const overA = (1 - seg(p, T.dock[0], T.dock[0] + .025)) * seg(p, T.rise[0] + .03, T.rise[1]);
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
      for (let i = 0; i <= J.cur; i++) if (i < J.cur || J.phase === 'dwell') stopDot(CITY[legs[i].to].ll, view, legs[i].mode, R);
      pin(CITY.PRG.ll, view, 'rgb(224,162,26)', seg(p, homeT[0], homeT[0] + .01), R);
      for (let i = 0; i <= J.cur; i++) if (!legs[i].home) pin(CITY[legs[i].to].ll, view, 'rgb(217,69,59)', seg(p, legs[i].t1, legs[i].t1 + .01), R);
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
    const hudOn = seg(p, T.journey[0] - .015, T.journey[0] + .01) * (1 - seg(p, T.settle[0], T.settle[0] + .02));
    hud.style.opacity = hudOn;
    hudShade.style.opacity = hudOn;
    leg.style.opacity = hudOn;
    let count = BASE_COUNT;
    for (const e of events) if (p >= e.p + .003) count++;
    hudC.textContent = count;
    hudW.textContent = Math.round(count / 248 * 100) + '%';
    hudK.textContent = fmt(J.km);
    let text, mode = 'drive';
    if (J.cur < 0) text = 'Prague · home';
    else {
      const l = legs[J.cur]; mode = l.mode;
      const fresh = events.filter(e => p >= e.p && p < e.p + .03).pop();
      if (fresh) text = `${nameOf(fresh.a3)} · new country`;
      else if (J.phase === 'move') text = `${l.title} · ${CITY[l.from].n} → ${CITY[l.to].n}`;
      else text = l.home ? 'Prague · home again' : CITY[l.to].n;
    }
    if (legText.textContent !== text) legText.textContent = text;
    if (legGlyph.dataset.m !== mode) { legGlyph.dataset.m = mode; legGlyph.innerHTML = ART.glyph(mode, `rgb(${TINT[mode].map(x => Math.round(x * .78))})`, 14); }

    /* the stamp that lands with each new country (StampThump: 2.2× → 0.92 → 1) */
    const ev = events.filter(e => p >= e.p - .001).pop();
    if (ev && p < ev.p + .034 && globe.data && p < T.settle[0]) {
      const tau = seg(p, ev.p, ev.p + .034);
      if (pop.dataset.a3 !== ev.a3) {
        pop.dataset.a3 = ev.a3;
        pop.innerHTML = '';
        pop.appendChild(ART.stampEl(a2of(ev.a3), 120, {date: STAMP_DATE[ev.a3]}));
      }
      const q = globe.project(ev.ll[0], ev.ll[1], 0, view);
      const size = clamp(Math.min(vw, vh) * .17, 92, 150);
      pop.style.width = size + 'px';
      pop.firstChild.style.width = size + 'px'; pop.firstChild.style.height = size * 1.15 + 'px';
      const k = seg(tau, 0, .2);
      const sc = k < .6 ? lerp(2.2, .92, easeIn(k / .6)) : lerp(.92, 1, easeOut((k - .6) / .4));
      const x = clamp(q.x + size * .15, 12, vw - size - 12), y = clamp(q.y - size * 1.25, 90, vh - size * 1.2 - 70);
      pop.style.opacity = Math.min(1, k * 5) * (1 - seg(tau, .8, 1));
      pop.style.transform = `translate(${x}px, ${y}px) rotate(${lerp(-4, 0, k)}deg) scale(${sc})`;
    } else pop.style.opacity = 0;

    /* the summer's stamps land in the passport, and the count goes up with them */
    let landedN = 0;
    const n = stampCells.length;
    stampCells.forEach((el, i) => {
      const a = lerp(T.stamps[0], T.stamps[1], i / Math.max(1, n)), b = a + (T.stamps[1] - T.stamps[0]) / Math.max(1, n) * .8;
      const k = seg(p, a, b);
      if (k > .5) landedN++;
      const sc = k < .5 ? lerp(2.2, .92, easeIn(k / .5)) : lerp(.92, 1, easeOut((k - .5) / .5));
      el.style.opacity = Math.min(1, k * 4);
      el.style.transform = `rotate(calc(var(--tilt) + ${lerp(-4, 0, k)}deg)) scale(${k > 0 ? sc : 2.2})`;
    });
    const c = BASE_COUNT + landedN;
    if (dpCount.textContent !== String(c)) {
      dpCount.textContent = c;
      dpPct.textContent = `(${Math.round(c / 248 * 100)}%)`;
    }
    dpTrips.textContent = n && landedN >= n ? 16 : 15;

    /* the phone comes to sit beside it */
    const ph = ease(seg(p, T.side[0], T.side[1]));
    phone.style.opacity = Math.min(1, ph * 2);
    phone.style.transform = `translate3d(${lerp(vw * .5, FL.phoneX, ph)}px, ${lerp(vh * .2, FL.phoneY, ph)}px, 0) rotate(${lerp(8, 0, ph)}deg) scale(${FL.phoneS})`;
    const oo = seg(p, T.outro[0], T.outro[1]);
    outro.style.opacity = oo;
    outro.style.transform = `translate(-50%, ${(1 - easeOut(oo)) * 24}px)`;
  }

  /* ---- the nudge: stop half way and a small "keep scrolling" turns up ---- */
  let nudgeTimer = 0;
  addEventListener('scroll', () => {
    nudge.classList.remove('is-on');
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => { if (p > .03 && p < .9) nudge.classList.add('is-on'); }, 900);
  }, {passive: true});

  const worldReady = Promise.all([GL.countries(), ART.ready]).then(([list]) => {
    prepWorld(list);
    findEvents();
    fillStamps();
    drawMap(false);
    dirty = true;
  });
  worldReady.catch(() => {});
  globe.ready.catch(() => { failed = true; });
  globe.onrestore = () => { dirty = true; };
  addEventListener('resize', measure);
  measure();
  // the cover's lines move once the type has loaded
  if (document.fonts) document.fonts.ready.then(() => { measureEmblem(); dirty = true; });
  if (RM) {
    // a still: the summer's globe, and under it the open passport with every stamp in
    // it beside the phone
    stillReady = true;
    worldReady.then(() => {
      stampCells.forEach(el => { el.style.opacity = 1; el.style.transform = 'rotate(var(--tilt))'; });
      const c = BASE_COUNT + events.length;
      dpCount.textContent = c; dpPct.textContent = `(${Math.round(c / 248 * 100)}%)`; dpTrips.textContent = 16;
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
  const FULL = {place: 'place.jpg', customize: 'customize.jpg'};
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

  /* ---- the printer: slides down under the island and feeds the ticket out of
         its slot short edge first, stub leading; torn off, the ticket turns a
         quarter back and is filed beside the phone ---- */
  const KINDS = {
    flight:  {mode: 'flight', ref: 'KL 1356', from: {code: 'PRG', sub: 'Prague · Václav Havel'}, to: {code: 'AMS', sub: 'Amsterdam · Schiphol'}, fields: [['DATE', '17 OCT 2026'], ['BOARDS', '06:35'], ['SEAT', '14A']], day: '17', month: 'OCT', line: '07:05', footer: 'IN 16 DAYS', seed: 'kl1356'},
    train:   {mode: 'train', ref: 'RJ 75', from: {name: 'Praha', sub: 'Praha hlavní nádraží'}, to: {name: 'Wien', sub: 'Wien Hauptbahnhof'}, fields: [['DATE', '24 OCT 2026'], ['DEPARTS', '08:12'], ['SEAT', '41']], day: '24', month: 'OCT', line: '08:12', footer: 'IN 23 DAYS', seed: 'rj75'},
    ferry:   {mode: 'ferry', ref: 'MEGASTAR', from: {code: 'HEL', sub: 'Helsinki · West Harbour'}, to: {code: 'TLL', sub: 'Tallinn · Old City Harbour'}, fields: [['DATE', '2 NOV 2026'], ['SAILS', '07:30'], ['DECK', '7']], day: '02', month: 'NOV', line: '07:30', footer: 'IN 32 DAYS', seed: 'megastar'},
    walk:    {mode: 'walk', from: {name: 'Porto', sub: 'Sé Cathedral'}, to: {name: 'Santiago', sub: 'Praza do Obradoiro'}, fields: [['DATE', '12 JUL 2027'], ['DISTANCE', '260 KM'], ['STARTS', '06:30']], day: '12', month: 'JUL', line: '06:30', footer: 'NEXT JULY', seed: 'camino'},
    concert: {mode: 'concert', kindLabel: 'CONCERT', ref: 'ROYAL ARENA', title: 'Le Sserafim', sub: 'Easy Crazy Hot · Copenhagen', fields: [['DATE', '18 OCT 2026'], ['DOORS', '18:30']], day: '18', month: 'OCT', line: '2026', footer: 'IN 17 DAYS', seed: 'pureflow'},
  };
  const wait = ms => new Promise(r => setTimeout(r, RM ? 0 : ms));
  const printer = {
    kind: 'flight', state: 'booked', busy: false, filed: null, root: null, queued: false,
    mount(root) {
      this.root = root;
      root.innerHTML = `<div class="printer"><span class="printer-slot"></span><span class="printer-led"></span></div><span class="feed-shade"></span><div class="feed"></div>`;
      this.el = root.querySelector('.printer'); this.feed = root.querySelector('.feed');
    },
    make() { return ART.ticket({...KINDS[this.kind], state: this.state}); },
    async print() {
      if (!this.root) return;
      if (this.busy) { this.queued = true; return; }
      this.busy = true;
      try { await this.run(); }
      catch (e) { /* a print that goes wrong leaves the printer free for the next */ }
      finally {
        this.el.classList.remove('is-printing', 'is-down');
        this.busy = false;
        if (this.queued) { this.queued = false; this.print(); }
      }
    },
    async run() {
      if (this.filed) {
        const old = this.filed; this.filed = null;
        old.animate([{opacity: 1}, {opacity: 0, transform: getComputedStyle(old).transform + ' translateY(40px)'}], {duration: 320, easing: 'ease-in', fill: 'forwards'}).finished.then(() => old.remove());
      }
      this.el.classList.add('is-down');
      await wait(480);
      // the strip: the ticket turned a quarter clockwise, stub first out of the slot
      const fw = this.feed.clientWidth, k = fw / 200;
      const strip = document.createElement('div');
      strip.className = 'feed-strip';
      strip.style.height = 480 * k + 'px';
      const t = this.make();
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
      await wait(280);
      // torn off: it turns back a quarter and is filed beside the phone
      const sr = strip.getBoundingClientRect();
      const filed = document.createElement('div');
      filed.className = 'ticket-filed';
      filed.appendChild(ART.frame(this.make(), 480, 200, 300));
      this.root.appendChild(filed);
      const fr = filed.getBoundingClientRect();
      const kr = fr.width / 300;     // the rig's own scale
      const dx = ((sr.left + sr.width / 2) - (fr.left + fr.width / 2)) / kr, dy = ((sr.top + sr.height / 2) - (fr.top + fr.height / 2)) / kr;
      const s0 = sr.height / fr.width;
      strip.remove();
      filed.style.transform = 'rotate(-2.2deg)';
      if (!RM) await filed.animate([
        {transform: `translate(${dx}px, ${dy}px) rotate(90deg) scale(${s0})`},
        {transform: `translate(${dx * .45}px, ${dy * .5 - 34}px) rotate(32deg) scale(${(s0 + 1) / 2})`, offset: .45},
        {transform: 'rotate(-2.2deg)'},
      ], {duration: 780, easing: 'cubic-bezier(.22,.61,.36,1)'}).finished;
      this.filed = filed;
    },
    restate(s) {
      this.state = s;
      clearTimeout(this.tearTimer);
      if (!this.filed) return;
      const tk = this.filed.querySelector('.tk'), fresh = this.make();
      if (!tk) return;
      const swap = () => { if (tk.parentNode) tk.parentNode.replaceChild(fresh, tk); };
      if (s === 'used' && !RM && !tk.classList.contains('is-used')) {
        // the stub tears away along the perforation and what is left slides to centre
        tk.classList.add('is-used');
        this.tearTimer = setTimeout(swap, 650);
      } else swap();
    },
  };
  $$('#ticketKinds .chip').forEach(b => b.addEventListener('click', () => {
    $$('#ticketKinds .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    printer.kind = b.dataset.kind;
    printer.print();
  }));
  $$('#ticketState button').forEach(b => b.addEventListener('click', () => {
    $$('#ticketState button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    printer.restate(b.dataset.state);
  }));

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
    // Tickets: the printer
    arts.tickets = el('div', 'art art-tickets', front);
    arts.tickets.style.inset = '0';
    printer.mount(arts.tickets);
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
    // Customise: the covers, fanned behind
    arts.customize = el('div', 'art art-covers', back);
    [['Classic', '#1f1a47', '#2e1f59', '#fff'], ['Navy', '#14254a', '#1e3055', '#e3e2d5'], ['Burgundy', '#5a1124', '#6e1a2d', '#f1e2b4'],
     ['Swiss', '#c63c46', '#d54650', '#fff'], ['Leather', '#3b2316', '#5a3622', '#e8d9bf'], ['Dubu', '#d4637a', '#e07a8f', '#fff']]
      .forEach(([n, a, b, ink]) => {
        const c = el('div', 'cv', arts.customize);
        c.style.background = `repeating-linear-gradient(-45deg, rgba(255,255,255,.03) 0 .5px, transparent .5px 8px), linear-gradient(135deg, ${a}, ${b} 55%, ${a})`;
        c.style.color = ink;
        c.textContent = n;
      });
    layoutArtifacts();
  }
  function layoutArtifacts() {
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
    if (arts.customize) [...arts.customize.children].forEach((c, i) => {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
      c._on = `translate(${side * (mobile ? 120 : 236 + row * 24)}px, ${(row - 1) * (mobile ? 96 : 150)}px) rotate(${side * (7 + row * 5)}deg)`;
      c._off = 'translate(0, 0) rotate(0deg) scale(.6)';
      c.style.transform = arts.customize.classList.contains('is-on') ? c._on : c._off;
    });
  }

  /* ---- scroll → which stop, and how far between two ---- */
  let vw = 0, vh = 0, X = 300, anchors = [], mobile = false, scale = 1;
  const sides = stops.map(s => s.dataset.side === 'left' ? -1 : s.dataset.side === 'right' ? 1 : 0);
  function measure() {
    vw = innerWidth; vh = innerHeight;
    mobile = vw <= 760;      // as the CSS's max-width: 760px
    X = mobile ? Math.min(vw * .14, 60) : Math.min(vw * .245, 330);
    scale = mobile ? Math.min(.62, (vh * .5) / 612) : Math.min(1, (vh * .82) / 612);
    anchors = stops.map(s => { const r = s.getBoundingClientRect(); return r.top + scrollY + r.height / 2 - vh / 2; });
    mini.resize();
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

  /* tags hang on strings: a damped pendulum, pushed by the phone's travel */
  const swing = [{a: 0, w: 0}, {a: 0, w: 0}];
  let lastX = null, active = -2, running = false, raf = 0, lastT = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    render(dt, now);
    raf = running ? requestAnimationFrame(frame) : 0;
  }
  function render(dt, now) {
    if (!anchors.length) return;
    const S = stateAt();
    const xa = sides[S.i] * X, xb = sides[S.j] * X;
    const x = lerp(xa, xb, S.move);
    const dir = Math.sign(xb - xa), sw = Math.sin(Math.PI * S.move);
    const centreK = lerp(sides[S.i] === 0 ? 1 : 0, sides[S.j] === 0 ? 1 : 0, S.move);
    const lift = mobile ? 0 : -vh * .12 * centreK;
    const sc = scale * lerp(1, .86, centreK);
    const enterY = (1 - easeOut(S.enter)) * vh * .75;
    rig.style.transform = `translate3d(${x}px, ${lift + enterY}px, 0) rotateY(${-dir * sw * 16}deg) rotateZ(${dir * sw * 2.5}deg) scale(${sc})`;

    // screens change over half way between two stops
    const ka = keyOf(S.i), kb = keyOf(S.j), key = S.u < .5 ? ka : kb;
    for (const [k, d] of Object.entries(layers)) d.classList.toggle('is-on', k === key);
    const liveOn = !!LIVE[key];
    live.classList.toggle('is-on', liveOn);
    if (liveOn) {
      const va = LIVE[ka] || LIVE[kb], vb = LIVE[kb] || LIVE[ka];
      drawMini(va, vb, S.move, key, now);
      const t = LIVE[key].pill;
      if (pill.dataset.t !== t) { pill.dataset.t = t; pill.innerHTML = (key === 'today' ? '<svg viewBox="0 0 24 24"><path d="M20 4 4 11l7 2 2 7Z"/></svg>' : '') + t; }
    }

    // the artifacts: out at a stop, put away while the phone moves
    const at = S.enter < 1 ? -1 : S.move === 0 ? S.i : S.move === 1 ? S.j : -1;
    if (at !== active) {
      active = at;
      const k = at >= 0 ? keyOf(at) : '';
      for (const [name, a] of Object.entries(arts)) {
        const on = name === k;
        a.classList.toggle('is-on', on);
        if (name === 'tickets' && on && !printer.filed) printer.print();
        if (name === 'place') [...a.children].forEach(pl => { pl.style.transform = on ? pl._on : pl._off; });
        if (name === 'customize') [...a.children].forEach(c => { c.style.transform = on ? c._on : c._off; });
      }
    }
    // the tags swing with the phone's travel
    const vx = lastX === null ? 0 : (x - lastX) / Math.max(dt, .001);
    lastX = x;
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
    for (const a of LIVED) mini.paint(a, INK.lived, only ? 0 : 1);
    for (const a of [...VISITED, 'AUT', 'PRT', 'ESP', 'SWE', 'NOR', 'ISL', 'NLD', 'DNK'])
      mini.paint(a, INK.visited, only ? (only.includes(a) ? 1 : 0) : (key === 'today' && a === 'AUT' ? 0 : 1));
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
