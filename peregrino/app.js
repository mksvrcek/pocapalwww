/* =============================================================
   Peregrino — product page choreography

   Two scroll-scrubbed runs, both pure functions of scroll progress
   so scrubbing up and down gives identical frames:

   1. The journey (#story). A globe rises out of the bottom of the
      hero, flies a year of trips (countries filling in and getting
      stamped as each one is reached), then shrinks into the phone's
      own globe on the Statistics screen.
   2. The passport (#passport). The book opens on its data page,
      a leaf turns and the stamps land on the spread.

   Everything else is triggered once on reveal or by a click.
   ============================================================= */
(() => {
'use strict';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const seg   = (p, a, b) => clamp((p - a) / (b - a));
const ease  = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const D2R = Math.PI / 180;
const EARTH_KM = 6371;
const fmt = n => Math.round(n).toLocaleString('en-GB');

/* -------------------------------------------------------------
   1. THE TRIP
   Cities are [lon, lat]. Each leg flies from one to the next and,
   on arrival, fills `fill` (ISO3) and pops a stamp for `stamp`.
   Codes with no outline on the map (microstates, Hong Kong) still
   count, they just have nothing to paint. Prague is home, so it is
   filled at the start. The total comes to 32, the same as the
   passport and the phone.
   ------------------------------------------------------------- */
const CITY = {
  PRG:[14.42,50.08,'Prague'],   VIE:[16.37,48.21,'Vienna'],  ROM:[12.50,41.90,'Rome'],
  LIS:[-9.14,38.72,'Lisbon'],   LON:[-0.13,51.51,'London'],  CPH:[12.57,55.68,'Copenhagen'],
  AMS:[4.90,52.37,'Amsterdam'], SEL:[126.98,37.57,'Seoul'],  TYO:[139.69,35.69,'Tokyo'],
  HKG:[114.17,22.32,'Hong Kong'], BKK:[100.50,13.76,'Bangkok'], NYC:[-74.00,40.71,'New York'],
};
const HOME = {city:'PRG', fill:['CZE'], lived:['CZE'], stamp:'CZE'};
const LEGS = [
  {from:'PRG', to:'VIE', fill:['AUT','SVK','HUN'],                    stamp:'AUT'},
  {from:'VIE', to:'ROM', fill:['ITA','VAT','SMR','MLT','SVN','HRV'],  stamp:'ITA'},
  {from:'ROM', to:'LIS', fill:['PRT','ESP','MCO'],                    stamp:'PRT'},
  {from:'LIS', to:'LON', fill:['GBR','IRL'], lived:['GBR'],           stamp:'GBR'},
  {from:'LON', to:'CPH', fill:['DNK','SWE','NOR','FIN'],              stamp:'DNK'},
  {from:'CPH', to:'AMS', fill:['NLD','BEL','LUX','DEU','FRA'],        stamp:'NLD'},
  {from:'AMS', to:'SEL', fill:['KOR'], lived:['KOR'],                 stamp:'KOR'},
  {from:'SEL', to:'TYO', fill:['JPN'],                                stamp:'JPN'},
  {from:'TYO', to:'HKG', fill:['HKG','CHN'],                          stamp:'HKG'},
  {from:'HKG', to:'BKK', fill:['THA','VNM'],                          stamp:'THA'},
  {from:'BKK', to:'NYC', fill:['USA','CAN'],                          stamp:'USA'},
];

/* -------------------------------------------------------------
   2. STAMPS
   One entry per country that gets a stamp anywhere on the page:
   its name in its own language, the stamp's shape and ink, the
   continent code and the date it was stamped.
   ------------------------------------------------------------- */
const INK = {blue:'#3b67b5', red:'#c2453c', green:'#3b7d52', purple:'#7a4c9e',
             navy:'#2f3d74', orange:'#c4702a', teal:'#2b7c84'};
const STAMP = {
  CZE:{n:'Česko',          s:'circle', c:'blue',   k:'EU', d:'01.06.2026'},
  AUT:{n:'Österreich',     s:'oval',   c:'navy',   k:'EU', d:'01.10.2026'},
  ITA:{n:'Italia',         s:'circle', c:'green',  k:'EU', d:'25.05.2026'},
  PRT:{n:'Portugal',       s:'oval',   c:'teal',   k:'EU', d:'14.05.2022'},
  ESP:{n:'España',         s:'shield', c:'red',    k:'EU', d:'14.05.2022'},
  GBR:{n:'United Kingdom', s:'circle', c:'navy',   k:'EU', d:'11.09.2019'},
  DNK:{n:'Danmark',        s:'rect',   c:'red',    k:'EU', d:'20.06.2019'},
  NLD:{n:'Nederland',      s:'hex',    c:'orange', k:'EU', d:'04.02.2026'},
  FRA:{n:'France',         s:'hex',    c:'blue',   k:'EU', d:'09.10.2019'},
  KOR:{n:'대한민국',        s:'rect',   c:'red',    k:'AS', d:'21.08.2021'},
  JPN:{n:'日本',            s:'shield', c:'red',    k:'AS', d:'01.03.2023'},
  HKG:{n:'香港',            s:'circle', c:'red',    k:'AS', d:'13.12.2025'},
  THA:{n:'Thailand',       s:'rect',   c:'purple', k:'AS', d:'02.01.2026'},
  USA:{n:'United States',  s:'shield', c:'navy',   k:'NA', d:'12.03.2027'},
  MCO:{n:'Monaco',         s:'hex',    c:'purple', k:'EU', d:'25.05.2026'},
  VAT:{n:'Vaticano',       s:'shield', c:'purple', k:'EU', d:'24.05.2026'},
  SWE:{n:'Sverige',        s:'circle', c:'blue',   k:'EU', d:'20.06.2019'},
  DEU:{n:'Deutschland',    s:'rect',   c:'navy',   k:'EU', d:'02.04.2024'},
  GRC:{n:'Ελλάδα',          s:'oval',   c:'blue',   k:'EU', d:'18.07.2024'},
};

/* -------------------------------------------------------------
   3. WORLD
   assets/data/world.json is the app's own countries.geojson, cut
   down to outer rings at 0.1° (ISO3 → [[lon,lat,lon,lat…], …]).
   For the globe every point is kept as cos·cos, cos·sin, sin so a
   rotation is a handful of multiplies.
   ------------------------------------------------------------- */
let RAW = null;       // ISO3 → rings in degrees
let GEO = null;       // [{id, rings:[Float32Array(a,b,c,…)]}]
const geoReady = fetch('assets/data/world.json').then(r => r.json()).then(w => {
  RAW = w;
  GEO = Object.entries(w).filter(([id]) => id !== 'ATA').map(([id, rings]) => ({
    id,
    rings: rings.map(r => {
      const out = new Float32Array(r.length / 2 * 3);
      for (let i = 0, j = 0; i < r.length; i += 2, j += 3) {
        const lo = r[i] * D2R, la = r[i + 1] * D2R, cl = Math.cos(la);
        out[j] = cl * Math.cos(lo); out[j + 1] = cl * Math.sin(lo); out[j + 2] = Math.sin(la);
      }
      return out;
    }),
  }));
  return w;
}).catch(() => null);

/* The largest ring of a country, as an SVG path fitted into a box. Used
   for the silhouette inside a stamp. */
function silhouette(id, bx, by, bw, bh) {
  const rings = RAW && RAW[id];
  if (!rings) return null;
  let best = null, bestA = 0;
  for (const r of rings) {
    let a = 0;
    for (let i = 0; i < r.length - 2; i += 2) a += r[i] * r[i + 3] - r[i + 2] * r[i + 1];
    a = Math.abs(a);
    if (a > bestA) { bestA = a; best = r; }
  }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < best.length; i += 2) {
    x0 = Math.min(x0, best[i]); x1 = Math.max(x1, best[i]);
    y0 = Math.min(y0, best[i + 1]); y1 = Math.max(y1, best[i + 1]);
  }
  const k = Math.cos((y0 + y1) / 2 * D2R);
  const w = (x1 - x0) * k, h = y1 - y0;
  const s = Math.min(bw / w, bh / h);
  const ox = bx + (bw - w * s) / 2, oy = by + (bh - h * s) / 2;
  let d = '';
  for (let i = 0; i < best.length; i += 2) {
    d += (i ? 'L' : 'M') + (ox + (best[i] - x0) * k * s).toFixed(1) + ' ' + (oy + (y1 - best[i + 1]) * s).toFixed(1);
  }
  return d + 'Z';
}

const SHAPES = {
  circle: '<circle cx="50" cy="50" r="46" stroke-width="3.4"/><circle cx="50" cy="50" r="40.5" stroke-width="1.2"/>',
  oval:   '<ellipse cx="50" cy="50" rx="48" ry="37" stroke-width="3.4"/><ellipse cx="50" cy="50" rx="42.5" ry="31.5" stroke-width="1.2"/>',
  rect:   '<rect x="7" y="9" width="86" height="82" rx="9" stroke-width="3.4"/><rect x="12.5" y="14.5" width="75" height="71" rx="5" stroke-width="1.2"/>',
  shield: '<path d="M8 8H92V54Q92 80 50 95Q8 80 8 54Z" stroke-width="3.4"/><path d="M13.5 13.5H86.5V53Q86.5 75.5 50 89Q13.5 75.5 13.5 53Z" stroke-width="1.2"/>',
  hex:    '<path d="M3 50L24 13H76L97 50L76 87H24Z" stroke-width="3.4"/><path d="M9.5 50L27.2 18.8H72.8L90.5 50L72.8 81.2H27.2Z" stroke-width="1.2"/>',
};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** The stamp as an SVG string, drawn through the shared #ink filter. */
function stampSVG(id, over = {}) {
  const st = {...STAMP[id], ...over};
  const c = INK[st.c] || st.c;
  const wide = [...st.n].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 1.7 : 1), 0);
  const fs = clamp(76 / (wide * .6), 8, 15.5);
  const top = st.s === 'oval' ? 34 : st.s === 'hex' ? 33 : 31;
  const sil = st.text ? null : silhouette(id, 34, 41, 34, 25);
  const mid = st.text
    ? `<text x="50" y="58" text-anchor="middle" font-size="19" font-weight="800" letter-spacing="1.5" fill="${c}" stroke="none">${esc(st.text)}</text>`
    : sil ? `<path d="${sil}" fill="${c}" fill-opacity=".55" stroke="none"/>`
          : `<circle cx="51" cy="53" r="6.5" fill="${c}" fill-opacity=".7" stroke="none"/>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g filter="url(#ink)" fill="none" stroke="${c}">
${SHAPES[st.s]}
<text x="50" y="${top}" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif" font-size="${fs.toFixed(1)}" font-weight="750" fill="${c}" stroke="none">${esc(st.n)}</text>
${st.k ? `<text x="${st.s === 'hex' ? 19 : 20}" y="58" font-family="-apple-system,sans-serif" font-size="7.5" font-weight="700" fill="${c}" stroke="none" opacity=".75">${st.k}</text>` : ''}
${mid}
<text x="50" y="${st.s === 'oval' ? 76 : 80}" text-anchor="middle" font-family="ui-monospace,'SF Mono',Menlo,monospace" font-size="8.6" font-weight="700" fill="${c}" stroke="none">${st.d}</text>
</g></svg>`;
}

/* -------------------------------------------------------------
   4. THE GLOBE
   Orthographic, drawn straight onto a canvas. A ring point behind
   the globe is pushed out to the limb, and a run of them is drawn as
   an arc along the limb, so a country cut by the horizon is clipped
   cleanly instead of folding back across the face.
   ------------------------------------------------------------- */
const COL = {
  land:[125,180,94], visited:[217,88,74], lived:[234,162,58],
  border:'rgba(36,66,28,.42)',
};
const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

function makeGlobe(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }

  /* trace one ring into the current path */
  function ring(r, cx, cy, R, sl, cl, sp, cp) {
    let started = false, prevBack = false, prevAng = 0, anyFront = false;
    const n = r.length / 3;
    for (let k = 0; k <= n; k++) {
      const j = (k % n) * 3, a = r[j], b = r[j + 1], c = r[j + 2];
      const x = b * cl - a * sl;
      const kk = a * cl + b * sl;
      const y = cp * c - sp * kk;
      const z = sp * c + cp * kk;
      if (z >= 0) {
        anyFront = true;
        const px = cx + x * R, py = cy - y * R;
        if (!started) { ctx.moveTo(px, py); started = true; }
        else if (prevBack) {
          const ang = Math.atan2(-y, x);
          let d = ang - prevAng; d -= Math.PI * 2 * Math.round(d / (Math.PI * 2));
          ctx.arc(cx, cy, R, prevAng, prevAng + d, d < 0);
          ctx.lineTo(px, py);
        } else ctx.lineTo(px, py);
        prevBack = false;
      } else {
        const ang = Math.atan2(-y, x);
        if (!started) { ctx.moveTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R); started = true; }
        else if (prevBack) {
          let d = ang - prevAng; d -= Math.PI * 2 * Math.round(d / (Math.PI * 2));
          ctx.arc(cx, cy, R, prevAng, prevAng + d, d < 0);
        } else ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
        prevBack = true; prevAng = ang;
      }
    }
    if (started) ctx.closePath();
    return anyFront;
  }

  /* project a geographic unit vector (+ altitude) to the screen */
  function project(v, h, view) {
    const {cx, cy, R, sl, cl, sp, cp} = view;
    const s = 1 + h, a = v[0] * s, b = v[1] * s, c = v[2] * s;
    const x = b * cl - a * sl, kk = a * cl + b * sl;
    const y = cp * c - sp * kk, z = sp * c + cp * kk;
    return {x: cx + x * R, y: cy - y * R, vis: z >= 0 || x * x + y * y > 1};
  }

  /** f: ISO3 → {t, lived}; arcs: [{pts:[[v,h]…], alpha, head}] */
  function draw(o) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (o.alpha <= 0 || o.R < 2) return null;
    const {cx, cy, R} = o;
    const view = {cx, cy, R, sl: Math.sin(o.lon * D2R), cl: Math.cos(o.lon * D2R),
                  sp: Math.sin(o.lat * D2R), cp: Math.cos(o.lat * D2R)};
    ctx.globalAlpha = o.alpha;

    // atmosphere
    const atm = ctx.createRadialGradient(cx, cy, R * .96, cx, cy, R * 1.22);
    atm.addColorStop(0, 'rgba(120,175,255,.42)');
    atm.addColorStop(.4, 'rgba(80,130,240,.12)');
    atm.addColorStop(1, 'rgba(60,110,220,0)');
    ctx.fillStyle = atm;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2); ctx.fill();

    // ocean
    const oc = ctx.createRadialGradient(cx - R * .36, cy - R * .42, R * .05, cx, cy, R);
    oc.addColorStop(0, '#86c0f2'); oc.addColorStop(.5, '#3979c3'); oc.addColorStop(1, '#1d4479');
    ctx.fillStyle = oc;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    if (GEO) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      ctx.lineJoin = 'round';
      ctx.lineWidth = clamp(R / 420, .35, 1);
      ctx.strokeStyle = COL.border;
      // everything at rest in one path, then each painted country on its own
      ctx.beginPath();
      const painted = [];
      for (const g of GEO) {
        const st = o.fill[g.id];
        if (st && st.t > 0) { painted.push(g); continue; }
        for (const r of g.rings) ring(r, cx, cy, R, view.sl, view.cl, view.sp, view.cp);
      }
      ctx.fillStyle = mix(COL.land, COL.land, 0);  // nonzero: Lesotho sits on top of South Africa, not through it
      ctx.fill(); ctx.stroke();
      for (const g of painted) {
        const st = o.fill[g.id];
        ctx.beginPath();
        for (const r of g.rings) ring(r, cx, cy, R, view.sl, view.cl, view.sp, view.cp);
        ctx.fillStyle = mix(COL.land, st.lived ? COL.lived : COL.visited, st.t);
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }

    // limb shading and a soft highlight: the bit that makes it round
    const sh = ctx.createRadialGradient(cx, cy, R * .5, cx, cy, R);
    sh.addColorStop(0, 'rgba(4,12,32,0)'); sh.addColorStop(1, 'rgba(4,12,32,.5)');
    ctx.fillStyle = sh;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    const hi = ctx.createRadialGradient(cx - R * .42, cy - R * .48, 0, cx - R * .42, cy - R * .48, R * .95);
    hi.addColorStop(0, 'rgba(255,255,255,.2)'); hi.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hi;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // flight arcs, the plane, the cities
    let head = null;
    if (o.arcs) for (const a of o.arcs) {
      if (a.alpha <= 0) continue;
      ctx.globalAlpha = o.alpha * a.alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = a.head ? 2.2 : 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      let pen = false, last = null;
      for (const [v, h] of a.pts) {
        const q = project(v, h, view);
        if (q.vis) { pen ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); pen = true; }
        else pen = false;
        last = q;
      }
      ctx.stroke();
      if (a.head && last && last.vis && a.pts.length > 1) {
        const prev = project(a.pts[a.pts.length - 2][0], a.pts[a.pts.length - 2][1], view);
        head = {x: last.x, y: last.y, ang: Math.atan2(last.y - prev.y, last.x - prev.x)};
      }
    }
    ctx.globalAlpha = o.alpha * (o.dotsAlpha ?? 1);
    if (o.dots) for (const d of o.dots) {
      const q = project(d.v, 0, view);
      if (!q.vis) continue;
      ctx.beginPath(); ctx.arc(q.x, q.y, d.now ? 5.5 : 3.6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = d.now ? 2.6 : 1.8; ctx.strokeStyle = d.now ? '#eaa23a' : '#2f5fe0'; ctx.stroke();
      if (d.ring > 0) {
        ctx.globalAlpha = o.alpha * (1 - d.ring) * .9;
        ctx.beginPath(); ctx.arc(q.x, q.y, 6 + d.ring * 26, 0, Math.PI * 2);
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.globalAlpha = o.alpha * (o.dotsAlpha ?? 1);
      }
    }
    if (head) {
      ctx.globalAlpha = o.alpha;
      ctx.save();
      ctx.translate(head.x, head.y); ctx.rotate(head.ang + Math.PI / 2);
      ctx.scale(.95, .95);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 6;
      ctx.beginPath();   // a little airliner, nose up
      ctx.moveTo(0, -11); ctx.lineTo(1.6, -8); ctx.lineTo(1.6, -3); ctx.lineTo(10, 2.5); ctx.lineTo(10, 4.5);
      ctx.lineTo(1.6, 2); ctx.lineTo(1.4, 7); ctx.lineTo(4, 9.5); ctx.lineTo(4, 11); ctx.lineTo(0, 9.8);
      ctx.lineTo(-4, 11); ctx.lineTo(-4, 9.5); ctx.lineTo(-1.4, 7); ctx.lineTo(-1.6, 2); ctx.lineTo(-10, 4.5);
      ctx.lineTo(-10, 2.5); ctx.lineTo(-1.6, -3); ctx.lineTo(-1.6, -8); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return view;
  }
  return {size, draw, project};
}

/* geographic helpers */
const vec = (lon, lat) => {
  const lo = lon * D2R, la = lat * D2R, c = Math.cos(la);
  return [c * Math.cos(lo), c * Math.sin(lo), Math.sin(la)];
};
const angle = (a, b) => Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
function slerp(a, b, t) {
  const w = angle(a, b);
  if (w < 1e-6) return a.slice();
  const s = Math.sin(w), ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s;
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}
const toLonLat = v => [Math.atan2(v[1], v[0]) / D2R, Math.asin(clamp(v[2], -1, 1)) / D2R];

/* -------------------------------------------------------------
   5. THE JOURNEY: timeline
   `T` holds the beats as scroll progress across #story (0 → 1).
   ------------------------------------------------------------- */
const T = {
  heroOut:[.015, .09],     // headline fades and lifts
  rise:[.0, .15],          // the globe comes up out of the bottom and centres
  journey:[.15, .71],      // the legs, shared out by distance
  settle:[.72, .865],      // the phone rises and the globe shrinks into it
  swap:[.85, .885],        // the live globe hands over to the screenshot
  outro:[.885, .955],      // the closing line
  START:{lon:12, lat:8},   // where the globe faces as the page opens
  END:{lon:42, lat:24},    // where the phone's globe faces (measured off stats.jpg)
};
/* where the globe sits in assets/screens/stats.jpg, as fractions of the screen */
const SHOT_GLOBE = {x:.5, y:357 / 1278, r:242 / 590};

const story = $('#story');
if (story) initStory();

function initStory() {
  const stage = $('#stage');
  const sky = $('#sky'), skyCtx = sky.getContext('2d');
  const globe = makeGlobe($('#globe'));
  const heroCopy = $('#heroCopy'), hud = $('#hud'), leg = $('#leg'), legText = $('#legText');
  const hudC = $('#hudCountries'), hudW = $('#hudWorld'), hudK = $('#hudKm');
  const pop = $('#stampPop'), phone = $('#phoneWrap'), outro = $('#storyOutro'), nudge = $('#nudge');

  // legs, timed by distance: a long haul takes longer, but not proportionally
  const legs = LEGS.map(l => {
    const a = vec(...CITY[l.from]), b = vec(...CITY[l.to]);
    const d = angle(a, b);
    return {...l, a, b, d, km: d * EARTH_KM, w: .55 + Math.sqrt(d) * 1.1, dwell: .55};
  });
  const homeW = .5;
  const total = homeW + legs.reduce((s, l) => s + l.w + l.dwell, 0);
  let acc = homeW;
  for (const l of legs) {
    l.t0 = lerp(T.journey[0], T.journey[1], acc / total); acc += l.w;
    l.t1 = lerp(T.journey[0], T.journey[1], acc / total); acc += l.dwell;
    l.t2 = lerp(T.journey[0], T.journey[1], acc / total);
  }
  const homeT = [T.journey[0], legs[0].t0];
  const TOTAL_KM = legs.reduce((s, l) => s + l.km, 0);
  window.__peregrinoKm = TOTAL_KM;   // the stats band quotes the same figure

  // pre-sample each arc: [unit vector, altitude] at even steps
  for (const l of legs) {
    const n = Math.max(24, Math.round(l.d * 60));
    const lift = Math.min(.22, .05 + l.d * .12);
    l.samples = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      l.samples.push([slerp(l.a, l.b, t), Math.sin(Math.PI * t) * lift]);
    }
  }
  const stops = [{v: vec(...CITY.PRG), id:'PRG'}, ...legs.map(l => ({v: l.b, id: l.to}))];

  // stamps for the pop, built once the outlines are in
  const popSVG = {};
  geoReady.then(() => {
    // white ink: it has to read over sky, ocean and land alike
    popSVG.HOME = stampSVG(HOME.stamp, {c:'#ffffff'});
    for (const l of legs) popSVG[l.to] = stampSVG(l.stamp, {c:'#ffffff'});
    popId = null; dirty = true;
  });
  let popId = null;

  // ---- sizing ----
  let vw = 0, vh = 0, R0 = 0, R1 = 0, phoneH = 0, phoneW = 0, settleY = 0, settleS = 1;
  const css = getComputedStyle(document.documentElement);
  const SCR = {w: parseFloat(css.getPropertyValue('--screen-w')) / 100,
               h: parseFloat(css.getPropertyValue('--screen-h')) / 100,
               t: parseFloat(css.getPropertyValue('--screen-t')) / 100};
  function measure() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    globe.size();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    sky.width = Math.round(vw * dpr); sky.height = Math.round(vh * dpr);
    skyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintSky();
    R0 = Math.max(vw, vh) * .62;
    R1 = Math.min(vw * (vw < 700 ? .43 : .36), vh * .36);
    phoneW = phone.offsetWidth; phoneH = phone.offsetHeight;
    // the settled phone sits under the closing line, as large as the room allows
    const outroBottom = outro.offsetTop + outro.offsetHeight;
    const room = vh - 18 - (outroBottom + 22);
    settleS = clamp(room / phoneH, .55, 1);
    settleY = outroBottom + 22 + phoneH * settleS / 2 - vh / 2;
    dirty = true;
  }
  function paintSky() {
    skyCtx.clearRect(0, 0, vw, vh);
    const g = skyCtx.createRadialGradient(vw * .5, vh * .62, 0, vw * .5, vh * .62, Math.max(vw, vh) * .75);
    g.addColorStop(0, 'rgba(36,70,150,.32)'); g.addColorStop(.5, 'rgba(44,33,99,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    skyCtx.fillStyle = g; skyCtx.fillRect(0, 0, vw, vh);
    let s = 7;   // seeded so a resize doesn't reshuffle the stars
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const n = Math.round(vw * vh / 2600);
    for (let i = 0; i < n; i++) {
      const r = rnd() < .92 ? rnd() * .8 + .3 : rnd() * 1.2 + .9;
      skyCtx.globalAlpha = .25 + rnd() * .65;
      skyCtx.fillStyle = '#fff';
      skyCtx.beginPath(); skyCtx.arc(rnd() * vw, rnd() * vh, r, 0, Math.PI * 2); skyCtx.fill();
    }
    skyCtx.globalAlpha = 1;
  }

  // ---- progress ----
  let p = 0, dirty = true, spin = 0, lastT = performance.now();
  function progress() {
    const r = story.getBoundingClientRect();
    return clamp(-r.top / (r.height - vh));
  }

  // where the phone is at progress p: its centre offset and scale
  function phoneAt(p) {
    const t = ease(seg(p, T.settle[0], T.settle[1] - .02));
    return {y: lerp(vh * .75, settleY, t), s: lerp(settleS * .9, settleS, t), o: seg(p, T.settle[0], T.settle[0] + .04)};
  }

  function frame(now) {
    const dt = Math.min(64, now - lastT); lastT = now;
    const np = progress();
    // a slow idle turn at the top of the page, gone once the journey starts
    const idle = 1 - seg(np, .02, T.rise[1]);
    if (!RM && idle > 0 && np < T.rise[1]) { spin += dt * .004 * idle; dirty = true; }
    if (np !== p) { p = np; dirty = true; }
    if (dirty) { render(); dirty = false; }
    raf = running ? requestAnimationFrame(frame) : 0;
  }

  function render() {
    // ---- headline ----
    const ho = seg(p, T.heroOut[0], T.heroOut[1]);
    heroCopy.style.opacity = 1 - ho;
    heroCopy.style.transform = `translate(-50%, ${-ho * 40}px)`;
    heroCopy.classList.toggle('is-through', ho > .3);

    // ---- where the journey is ----
    const fill = {};
    const setFill = (ids, t, lived) => ids.forEach(id => fill[id] = {t, lived: lived && lived.includes(id)});
    const homeF = seg(p, homeT[0], homeT[0] + (homeT[1] - homeT[0]) * .6);
    setFill(HOME.fill, homeF, HOME.lived);
    let count = homeF > .5 ? 1 : 0, km = 0, cur = -1, legU = 0, phase = 'home';
    for (let i = 0; i < legs.length; i++) {
      const l = legs[i];
      if (p >= l.t0) { cur = i; }
      if (p >= l.t1) {
        const span = l.t2 - l.t1;
        l.fill.forEach((id, k) => {
          const t = seg(p, l.t1 + span * k * .1, l.t1 + span * (.35 + k * .1));
          fill[id] = {t, lived: l.lived && l.lived.includes(id)};
          if (t > .5) count++;
        });
      }
      km += l.km * ease(seg(p, l.t0, l.t1));
    }
    if (cur >= 0) {
      const l = legs[cur];
      legU = seg(p, l.t0, l.t1);
      phase = p < l.t1 ? 'fly' : 'land';
    }

    // ---- camera ----
    let view, R, cx = vw / 2, cy = vh * .53;
    const startV = vec(T.START.lon + spin, T.START.lat);
    const prg = stops[0].v;
    if (cur < 0) {
      view = slerp(startV, prg, ease(seg(p, T.rise[0] + .03, T.journey[0])));
    } else {
      const l = legs[cur];
      view = phase === 'fly' ? slerp(l.a, l.b, ease(legU)) : l.b;
    }
    const rise = ease(seg(p, T.rise[0], T.rise[1]));
    R = lerp(R0, R1, rise);
    cy = lerp(vh + R0 * .6, vh * .53, rise);
    if (cur >= 0 && phase === 'fly') {
      const l = legs[cur];
      R *= 1 - .32 * Math.sin(Math.PI * ease(legU)) * Math.min(1, l.d / 1.1);
    }

    // ---- settling into the phone ----
    const ph = phoneAt(p);
    const st = ease(seg(p, T.settle[0], T.settle[1]));
    let alpha = 1;
    if (st > 0) {
      const sw = phoneW * ph.s * SCR.w, sh = phoneH * ph.s * SCR.h;
      const sx = vw / 2 - sw / 2;
      const syTop = vh / 2 + ph.y - phoneH * ph.s / 2 + phoneH * ph.s * SCR.t;
      const tx = sx + sw * SHOT_GLOBE.x, ty = syTop + sh * SHOT_GLOBE.y, tr = sw * SHOT_GLOBE.r;
      cx = lerp(cx, tx, st); cy = lerp(cy, ty, st); R = lerp(R, tr, st);
      view = slerp(view, vec(T.END.lon, T.END.lat), st);
      alpha = 1 - seg(p, T.swap[0], T.swap[1]);
    }
    const [lon, lat] = toLonLat(view);

    // ---- arcs ----
    const arcFade = 1 - seg(p, T.settle[0], T.settle[0] + .05);
    const arcs = [];
    for (let i = 0; i <= cur; i++) {
      const l = legs[i];
      const u = i === cur ? ease(legU) : 1;
      const n = Math.max(1, Math.round(u * (l.samples.length - 1)));
      arcs.push({pts: l.samples.slice(0, n + 1), alpha: (i === cur ? 1 : .5) * arcFade, head: i === cur && phase === 'fly'});
    }
    const dots = [];
    const reached = cur < 0 ? 1 : (phase === 'land' ? cur + 2 : cur + 1);
    for (let i = 0; i < reached; i++) {
      const ring = i === 0 ? seg(p, homeT[0], homeT[1]) : (i - 1 <= cur ? seg(p, legs[i - 1].t1, legs[i - 1].t1 + (legs[i - 1].t2 - legs[i - 1].t1) * .7) : 0);
      dots.push({v: stops[i].v, now: i === reached - 1, ring: ring > 0 && ring < 1 ? ring : 0});
    }

    const v = globe.draw({cx, cy, R, lon, lat, alpha, fill, arcs, dots, dotsAlpha: arcFade});

    // ---- instruments ----
    const hudOn = seg(p, T.journey[0] - .02, T.journey[0] + .01) * (1 - seg(p, T.journey[1] - .005, T.settle[0] + .02));
    hud.style.opacity = hudOn;
    leg.style.opacity = hudOn;
    hudC.textContent = count;
    hudW.textContent = Math.round(count / 248 * 100) + '%';
    hudK.textContent = fmt(km);
    legText.textContent = cur < 0 ? `${CITY.PRG[2]} · home`
      : phase === 'fly' ? `${CITY[legs[cur].from][2]} → ${CITY[legs[cur].to][2]}`
      : `${CITY[legs[cur].to][2]} · stamped`;

    // ---- the stamp that lands with each arrival ----
    let pid = null, tau = -1, anchor = null;
    if (cur < 0) {
      pid = 'HOME'; tau = seg(p, homeT[0], homeT[1]); anchor = stops[0].v;
    } else if (phase === 'land') {
      const l = legs[cur]; pid = l.to; tau = seg(p, l.t1, l.t2); anchor = l.b;
    }
    if (pid && popSVG[pid] && v && p < T.settle[0]) {
      if (popId !== pid) { pop.innerHTML = popSVG[pid]; popId = pid; }
      const q = globe.project(anchor, 0, v);
      const sz = clamp(R * .42, 70, 120);
      const x = clamp(q.x + R * .14, 8, vw - sz - 8), y = clamp(q.y - sz - R * .06, 70, vh - sz - 70);
      const inT = seg(tau, 0, .14), outT = seg(tau, .78, 1);
      const sc = inT < 1 ? lerp(1.9, 1, easeOut(inT)) : 1;
      pop.style.width = pop.style.height = sz + 'px';
      pop.style.opacity = Math.min(inT * 1.6, 1) * (1 - outT);
      pop.style.transform = `translate(${x}px, ${y - outT * 16}px) scale(${sc}) rotate(${lerp(-16, -6, easeOut(inT))}deg)`;
    } else {
      pop.style.opacity = 0;
    }

    // ---- phone and outro ----
    phone.style.opacity = ph.o;
    phone.style.transform = `translate3d(0, ${ph.y}px, 0) scale(${ph.s})`;
    const oo = seg(p, T.outro[0], T.outro[1]);
    outro.style.opacity = oo;
    outro.style.transform = `translate(-50%, ${(1 - easeOut(oo)) * 24}px)`;
  }

  // ---- the nudge: stop half way and a small "keep scrolling" turns up ----
  let nudgeTimer = 0;
  function poke() {
    nudge.classList.remove('is-on');
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => {
      if (p > .04 && p < .88) nudge.classList.add('is-on');
    }, 750);
  }

  // ---- run only while the story is on screen ----
  let running = false, raf = 0;
  if (!RM) new IntersectionObserver(([e]) => {
    running = e.isIntersecting;
    if (running && !raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); }
  }).observe(story);
  addEventListener('scroll', poke, {passive: true});
  addEventListener('resize', measure);
  geoReady.then(() => { dirty = true; });
  measure();

  if (RM) {
    // a still: the finished globe, no story
    geoReady.then(() => {
      const fill = {};
      [HOME, ...LEGS].forEach(l => l.fill.forEach(id => fill[id] = {t: 1, lived: (l.lived || []).includes(id)}));
      const c = $('#globe');
      globe.size();
      globe.draw({cx: c.clientWidth / 2, cy: c.clientHeight * .55, R: Math.min(c.clientWidth, c.clientHeight) * .3,
                  lon: T.END.lon, lat: T.END.lat, alpha: .35, fill});
    });
  }
}

/* -------------------------------------------------------------
   6. THE PASSPORT
   ------------------------------------------------------------- */
const PP = {
  open:[.1, .3],          // the cover swings open
  count:[.24, .42],       // the data page counts up
  flags:[.28, .47],       // the visited flags fill in
  turn:[.5, .64],         // the leaf turns
  stamps:[.62, .93],      // the stamps land, one at a time
  beats:[.2, .49],        // where the copy changes
};
const FLAGS = ['cz','at','sk','hu','it','va','sm','mt','si','hr','pt','es','mc','gb','ie','dk','se','no','fi','nl','be','lu','de','fr','kr','jp','hk','cn','th','vn','us','ca'];
const LIVED_FLAGS = ['cz','gb','kr'];
/* six per page: left page then right, in the order they land */
const PP_STAMPS = ['GBR','DNK','FRA','KOR','JPN','ESP', 'PRT','CZE','HKG','ITA','MCO','NLD'];

const pp = $('#passport');
if (pp) initPassport();

function initPassport() {
  const body = $('#bookBody'), cover = $('#leafCover'), turn = $('#leafTurn');
  const shadow = $('.book-shadow');
  const lines = $$('.pp-line');
  const dpCount = $('#dpCount'), dpPct = $('#dpPct'), dpTrips = $('#dpTrips');
  const flagsBox = $('#flags'), livedBox = $('#flagsLived');

  // flags
  const flagEls = FLAGS.map(c => {
    const i = new Image(); i.src = `assets/flags/${c}.png`; i.alt = ''; i.loading = 'lazy';
    flagsBox.appendChild(i); return i;
  });
  const livedEls = LIVED_FLAGS.map(c => {
    const i = new Image(); i.src = `assets/flags/${c}.png`; i.alt = ''; i.loading = 'lazy';
    livedBox.appendChild(i); return i;
  });

  // a shade on each turning face, darkened as it goes edge-on
  const shades = [...cover.children, ...turn.children].map(f => {
    const s = document.createElement('div'); s.className = 'shade'; f.appendChild(s); return s;
  });

  // stamps, placed on a loose two-by-three grid with some jitter
  const pages = [$('#stampsLeft'), $('#stampsRight')];
  const stampEls = [];
  geoReady.then(() => {
    let seed = 3;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    PP_STAMPS.forEach((id, i) => {
      const el = document.createElement('div');
      el.className = 'stamp';
      el.innerHTML = stampSVG(id);
      const k = i % 6, col = k % 2, row = (k / 2) | 0;
      el.style.left = (9 + col * 46 + (rnd() - .5) * 8) + '%';
      el.style.top = (6 + row * 30 + (rnd() - .5) * 5) + '%';
      el._rot = (rnd() - .5) * 18;
      pages[i < 6 ? 0 : 1].appendChild(el);
      stampEls.push(el);
    });
    drawMiniMap();
    dirty = true;
  });

  function drawMiniMap() {
    const c = $('#dpMap'); if (!c || !RAW) return;
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    const on = new Set([HOME, ...LEGS].flatMap(l => l.fill));
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = .6; ctx.strokeStyle = 'rgba(255,255,255,.35)';
    for (const [id, rings] of Object.entries(RAW)) {
      if (id === 'ATA') continue;
      ctx.beginPath();
      for (const r of rings) {
        for (let i = 0; i < r.length; i += 2) {
          const x = (r[i] + 180) / 360 * W, y = (84 - r[i + 1]) / 144 * H;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
      }
      if (on.has(id)) { ctx.fillStyle = '#fff'; ctx.fill(); }
      ctx.stroke();
    }
  }

  let dirty = true, q = -1, raf = 0, running = false;
  function progress() {
    const r = pp.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight));
  }
  function frame() {
    const nq = progress();
    if (nq !== q || dirty) { q = nq; render(); dirty = false; }
    raf = running ? requestAnimationFrame(frame) : 0;
  }
  const zOf = (ang, i) => ang < -90 ? 20 + i : 12 - i;
  function render() {
    // the book comes in tilted and settles flatter as it opens
    const o = ease(seg(q, PP.open[0], PP.open[1]));
    const intro = easeOut(seg(q, 0, PP.open[0]));
    body.style.transform =
      `translateX(${lerp(-25, 0, o)}%) rotateX(${lerp(26, 10, intro) - o * 4}deg) rotateZ(${lerp(-7, -2, intro) + o * 2}deg) scale(${lerp(.9, 1, intro)})`;
    shadow.style.transform = `translateX(${lerp(-25, 0, o)}%) scaleX(${lerp(.5, 1, o)})`;

    const ca = -180 * o;
    cover.style.transform = `rotateY(${ca}deg)`;
    cover.style.zIndex = zOf(ca, 0);
    const ta = -180 * ease(seg(q, PP.turn[0], PP.turn[1]));
    turn.style.transform = `rotateY(${ta}deg)`;
    turn.style.zIndex = zOf(ta, 1);
    // edge-on faces go darker
    const sc = Math.abs(Math.sin(ca * Math.PI / 180)) * .35, st = Math.abs(Math.sin(ta * Math.PI / 180)) * .35;
    shades[0].style.opacity = shades[1].style.opacity = sc;
    shades[2].style.opacity = shades[3].style.opacity = st;

    // data page
    const c = easeOut(seg(q, PP.count[0], PP.count[1]));
    const n = Math.round(32 * c);
    dpCount.textContent = n;
    dpPct.textContent = `(${Math.round(n / 248 * 100)}%)`;
    dpTrips.textContent = Math.round(16 * c);

    // flags
    const fa = seg(q, PP.flags[0], PP.flags[1]);
    flagEls.forEach((el, i) => el.classList.toggle('is-on', fa * (FLAGS.length + 3) > i));
    livedEls.forEach((el, i) => el.classList.toggle('is-on', fa * (FLAGS.length + 3) > FLAGS.length + i));

    // stamps: each one drops from above, hits the page and settles
    const sa = seg(q, PP.stamps[0], PP.stamps[1]);
    stampEls.forEach((el, i) => {
      const t = clamp(sa * stampEls.length - i * .92);
      const k = easeOut(seg(t, 0, .55));
      el.style.opacity = clamp(t * 4);
      el.style.transform = `scale(${lerp(1.9, 1, k) + Math.sin(seg(t, .45, 1) * Math.PI) * .03}) rotate(${el._rot + (1 - k) * -12}deg)`;
    });

    // copy
    const beat = q < PP.beats[0] ? 0 : q < PP.beats[1] ? 1 : 2;
    lines.forEach((l, i) => l.classList.toggle('is-on', i === beat));
  }

  // reduced motion: no scrubbing, the book simply lies open on its stamps
  if (RM) { geoReady.then(() => { q = 1; render(); }); return; }
  new IntersectionObserver(([e]) => {
    running = e.isIntersecting;
    if (running && !raf) raf = requestAnimationFrame(frame);
  }).observe(pp);
}

/* -------------------------------------------------------------
   7. TODAY: the stamp that answers "Stamp it"
   ------------------------------------------------------------- */
geoReady.then(() => {
  const el = $('#todayStamp');
  if (el) el.innerHTML = stampSVG('AUT');
});

/* -------------------------------------------------------------
   8. TICKETS: a printer
   Each kind is one ticket. Picking another drops the current one
   out of the bottom and prints the next out of the slot. The state
   switch (planned / booked / used) restyles whatever is printed.
   ------------------------------------------------------------- */
const TICKETS = {
  flight:{head:'Boarding pass', kind:'Flight', from:'PRG', fromN:'Prague · Václav Havel', to:'AMS', toN:'Amsterdam · Schiphol',
          via:'✈', f:[['Flight','KL 1356'],['Boards','06:35'],['Seat','14A'],['Gate','B4'],['Class','Eco'],['Bag','23kg']],
          day:'17', mon:'Oct', time:'07:05', when:'In 16 days'},
  train: {head:'Train ticket', kind:'Train', from:'Praha', fromN:'Praha hlavní nádraží', to:'Wien', toN:'Wien Hauptbahnhof', word:true,
          via:'→', f:[['Train','RJ 75'],['Departs','08:12'],['Arrives','12:10'],['Coach','6'],['Seat','41'],['Class','2nd']],
          day:'24', mon:'Oct', time:'08:12', when:'In 23 days'},
  ferry: {head:'Ferry ticket', kind:'Ferry', from:'HEL', fromN:'Helsinki · West Harbour', to:'TLL', toN:'Tallinn · Old City Harbour',
          via:'⛴', f:[['Sailing','MS 07'],['Boards','07:30'],['Deck','7'],['Cabin','—'],['Vehicle','No'],['Pax','2']],
          day:'02', mon:'Nov', time:'07:30', when:'In 32 days'},
  bus:   {head:'Bus ticket', kind:'Bus', from:'Lisboa', fromN:'Lisboa · Oriente', to:'Porto', toN:'Porto · Campanhã', word:true,
          via:'→', f:[['Line','4412'],['Departs','09:45'],['Arrives','13:20'],['Seat','22'],['Bay','11'],['Bags','1']],
          day:'15', mon:'Nov', time:'09:45', when:'In 45 days'},
  event: {head:'Admit one', kind:'Conference', from:'Prague Design Week', fromN:'Kafkův dům · Prague', to:'', toN:'', word:true, event:true,
          via:'', f:[['Day','1 of 4'],['Doors','09:00'],['Hall','A'],['Row','—'],['Seat','Free'],['Pass','Full']],
          day:'08', mon:'Oct', time:'09:00', when:'In 7 days'},
};
const printer = $('#printerScene');
if (printer) initPrinter();

function initPrinter() {
  const out = $('#paperOut');
  const kinds = $$('#ticketKinds .chip');
  const states = $$('#ticketState button');
  let kind = 'flight', state = 'booked', cur = null, auto = 0, touched = false, inView = false;
  const usedInk = stampSVG('CZE', {n:'Peregrino', s:'circle', c:'red', k:'', text:'USED', d:'BEEN THERE'});

  function build(k) {
    const t = TICKETS[k];
    const el = document.createElement('div');
    el.className = 'ticket';
    const used = state === 'used';
    el.innerHTML = `<article class="tk is-${state}" aria-label="${t.kind} ticket, ${t.from}${t.to ? ' to ' + t.to : ''}, ${t.day} ${t.mon}">
      <div class="tk-main">
        <div class="tk-head"><span>${t.head}</span><span>${t.kind}</span></div>
        ${t.event
          ? `<div class="tk-route" style="grid-template-columns:1fr"><div class="tk-code is-word">${t.from}<span class="tk-name">${t.fromN}</span></div></div>`
          : `<div class="tk-route">
              <div class="tk-code${t.word ? ' is-word' : ''}">${t.from}<span class="tk-name">${t.fromN}</span></div>
              <div class="tk-via">${t.via}</div>
              <div class="tk-code tk-to${t.word ? ' is-word' : ''}">${t.to}<span class="tk-name">${t.toN}</span></div>
            </div>`}
        <dl class="tk-fields">${t.f.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>
      </div>
      <div class="tk-perf"></div>
      <div class="tk-stub">
        <div class="tk-date"><b>${t.day}</b><span>${t.mon} · ${t.time}</span></div>
        <div class="tk-bar"></div>
        <div class="tk-when">${state === 'planned' ? 'Pencilled in' : used ? 'Been' : t.when}</div>
      </div>
      <div class="tk-ink">${usedInk}</div>
    </article>`;
    return el;
  }

  function print(k, instant) {
    if (cur) {
      const old = cur;
      if (instant || RM) old.remove();
      else { old.classList.add('is-out'); old.addEventListener('animationend', () => old.remove(), {once: true}); }
    }
    kind = k;
    cur = build(k);
    out.appendChild(cur);
    kinds.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === k)));
    if (instant || RM) { cur.classList.add('is-printed'); return; }
    const el = cur;
    // let the old one clear the slot before the new one feeds
    setTimeout(() => {
      printer.classList.add('is-printing');
      el.classList.add('is-printing');
      el.addEventListener('animationend', () => {
        el.classList.remove('is-printing'); el.classList.add('is-printed');
        printer.classList.remove('is-printing');
      }, {once: true});
    }, 260);
  }
  function setState(s) {
    state = s;
    states.forEach(b => b.setAttribute('aria-checked', String(b.dataset.state === s)));
    if (!cur) return;
    const tk = cur.querySelector('.tk');
    tk.classList.remove('is-planned', 'is-booked', 'is-used');
    tk.classList.add('is-' + s);
    tk.querySelector('.tk-when').textContent = s === 'planned' ? 'Pencilled in' : s === 'used' ? 'Been' : TICKETS[kind].when;
  }

  kinds.forEach(b => b.addEventListener('click', () => { touched = true; stopAuto(); if (b.dataset.kind !== kind) print(b.dataset.kind); }));
  states.forEach(b => b.addEventListener('click', () => { touched = true; stopAuto(); setState(b.dataset.state); }));

  const order = Object.keys(TICKETS);
  function startAuto() {
    if (RM || touched || auto) return;
    auto = setInterval(() => print(order[(order.indexOf(kind) + 1) % order.length]), 4600);
  }
  function stopAuto() { clearInterval(auto); auto = 0; }

  let printedOnce = false;
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (inView && !printedOnce) { printedOnce = true; print('flight'); }
    inView ? startAuto() : stopAuto();
  }, {threshold: .45}).observe(printer);
}

/* -------------------------------------------------------------
   9. STATS: counting up, by year
   All time quotes the journey above, so the numbers agree.
   ------------------------------------------------------------- */
const figs = $('#figs');
if (figs) initStats();

function initStats() {
  const km = () => window.__peregrinoKm || 34000;
  const DATA = {
    all: {countries:32, world:13, continents:3, days:214, km:1,   journeys:11,
          bars:[['Europe',24,50],['Asia',6,49],['North America',2,23],['Africa',0,54],['South America',0,12],['Oceania',0,14]]},
    2026:{countries:9,  world:4,  continents:2, days:61,  km:.42, journeys:4,
          bars:[['Europe',7,50],['Asia',2,49],['North America',0,23],['Africa',0,54],['South America',0,12],['Oceania',0,14]]},
    2025:{countries:14, world:6,  continents:3, days:88,  km:.36, journeys:4,
          bars:[['Europe',10,50],['Asia',3,49],['North America',1,23],['Africa',0,54],['South America',0,12],['Oceania',0,14]]},
    2024:{countries:11, world:4,  continents:2, days:65,  km:.22, journeys:3,
          bars:[['Europe',9,50],['Asia',2,49],['North America',0,23],['Africa',0,54],['South America',0,12],['Oceania',0,14]]},
  };
  const els = Object.fromEntries($$('#figs b').map(b => [b.dataset.k, b]));
  const shown = {countries:0, world:0, continents:0, days:0, km:0, journeys:0};
  const show = {
    countries: v => fmt(v), world: v => Math.round(v) + '%', continents: v => Math.round(v) + '/7',
    days: v => fmt(v), km: v => fmt(v), journeys: v => fmt(v),
  };
  const bars = $('#bars');
  const barEls = DATA.all.bars.map(([name]) => {
    const row = document.createElement('div'); row.className = 'bar';
    row.innerHTML = `<span>${name}</span><div class="bar-track"><div class="bar-fill"></div></div><span class="bar-n"><b>0</b><span>/0</span></span>`;
    bars.appendChild(row);
    return row;
  });

  let anim = 0, year = 'all', seen = false;
  function go(y) {
    year = y;
    const d = DATA[y];
    const target = {...d, km: Math.round(km() * d.km / 10) * 10};
    const from = {...shown}, t0 = performance.now(), dur = RM ? 1 : 1000;
    cancelAnimationFrame(anim);
    const step = now => {
      const t = easeOut(clamp((now - t0) / dur));
      for (const k in els) { shown[k] = lerp(from[k], target[k], t); els[k].textContent = show[k](shown[k]); }
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
    d.bars.forEach(([, n, of], i) => {
      barEls[i].querySelector('.bar-fill').style.transform = `scaleX(${n / of})`;
      barEls[i].querySelector('.bar-n b').textContent = n;
      barEls[i].querySelector('.bar-n span').textContent = '/' + of;
    });
  }
  $$('#years button').forEach(b => b.addEventListener('click', () => {
    $$('#years button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    go(b.dataset.year);
  }));
  new IntersectionObserver(([e], o) => {
    if (e.isIntersecting && !seen) { seen = true; go(year); o.disconnect(); }
  }, {threshold: .35}).observe(figs);
}

/* -------------------------------------------------------------
   10. JOURNAL: luggage tags on strings
   ------------------------------------------------------------- */
const TAGS = [
  {k:'Trip · 3 countries', img:'night.jpg',     t:'2026 Korea & Asia',  d:'10 Aug – 6 Sep 2026', s:'KOR', side:'left',  x:'-7%', y:'12%', r0:-6, r1:2},
  {k:'Trip · 2 countries', img:'river.jpg',     t:'Pureflow weekend',   d:'17 – 20 Oct 2026',    s:'NLD', side:'right', x:'-7%', y:'6%',  r0:4,  r1:-3},
  {k:'Trip · Italy',       img:'mountains.jpg', t:'Dolomites week',     d:'18 – 25 May 2026',    s:'ITA', side:'left',  x:'-10%', y:'58%', r0:-3, r1:4},
  {k:'Trip · Japan',       img:'torii.jpg',     t:'Spring in Kyoto',    d:'1 – 12 Mar 2023',     s:'JPN', side:'right', x:'-9%', y:'52%', r0:5,  r1:-2},
];
const tagBox = $('#tags');
if (tagBox) geoReady.then(() => {
  TAGS.forEach((g, i) => {
    const el = document.createElement('div');
    el.className = 'tag';
    el.style[g.side] = `calc(${g.x} * var(--tag-out, 1))`; el.style.top = g.y;
    el.style.setProperty('--r0', g.r0 + 'deg'); el.style.setProperty('--r1', g.r1 + 'deg');
    el.style.animationDelay = (-i * 1.3) + 's';
    el.innerHTML = `<span class="tag-string"></span><div class="tag-card">
      <p class="tag-k">${g.k}</p>
      <div class="tag-img"><img src="assets/photos/${g.img}" alt="" loading="lazy"></div>
      <p class="tag-t">${g.t}</p><p class="tag-d">${g.d}</p>
      <span class="tag-mini">${stampSVG(g.s)}</span></div>`;
    tagBox.appendChild(el);
  });
});

/* -------------------------------------------------------------
   11. DECK: a rail of phones, arrows and dots
   ------------------------------------------------------------- */
const deck = $('#deck');
if (deck) {
  const slides = $$('#deck .deck-slide');
  const dots = $('#deckDots');
  slides.forEach(() => { const d = document.createElement('span'); d.className = 'deck-dot'; dots.appendChild(d); });
  const dotEls = [...dots.children];
  const btns = $$('#screens .rail-btn');
  const setEdge = () => {
    const edge = Math.max(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) || 22,
                          (innerWidth - 1120) / 2 + 22);
    deck.style.setProperty('--edge', edge + 'px');
  };
  const sync = () => {
    const step = slides[1].offsetLeft - slides[0].offsetLeft;
    const i = clamp(Math.round(deck.scrollLeft / step), 0, slides.length - 1);
    dotEls.forEach((d, k) => d.classList.toggle('is-on', k === i));
    btns[0].disabled = deck.scrollLeft < 4;
    btns[1].disabled = deck.scrollLeft > deck.scrollWidth - deck.clientWidth - 4;
  };
  btns.forEach(b => b.addEventListener('click', () => {
    const step = slides[1].offsetLeft - slides[0].offsetLeft;
    deck.scrollBy({left: step * +b.dataset.dir, behavior: RM ? 'auto' : 'smooth'});
  }));
  deck.addEventListener('scroll', sync, {passive: true});
  addEventListener('resize', () => { setEdge(); sync(); });
  setEdge(); sync();
}

/* -------------------------------------------------------------
   12. SMALL THINGS: Schengen ring, mini calendar
   ------------------------------------------------------------- */
const ring = $('#ring');
if (ring) {
  const days = 47, C = 2 * Math.PI * 50, out = $('#ringDays');
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return;
    o.disconnect();
    ring.style.strokeDashoffset = C * (1 - days / 90);
    const t0 = performance.now();
    const step = now => {
      const t = easeOut(clamp((now - t0) / (RM ? 1 : 1400)));
      out.textContent = Math.round(days * t);
      if (t < 1) requestAnimationFrame(step);
    };
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
  const mark = d => d === 4 ? 'today' : d === 8 ? 't3' : d >= 17 && d <= 20 ? 't1' : d >= 24 && d <= 26 ? 't2' : '';
  cal.innerHTML = cells.map(c => `<i class="${c.out ? '' : mark(c.d)}"${c.out ? ' style="opacity:.35"' : ''}>${c.d}</i>`).join('');
}

/* -------------------------------------------------------------
   13. PAGE: reveal on scroll, the nav over paper, the FAQ
   ------------------------------------------------------------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), {threshold: .18, rootMargin: '0px 0px -6% 0px'});
$$('.reveal').forEach(el => io.observe(el));

const nav = $('#nav'), paper = $('.paper');
const navTone = () => nav.classList.toggle('is-light', paper.getBoundingClientRect().top < 48 &&
  !(($('#stats').getBoundingClientRect().top < 48) && ($('#stats').getBoundingClientRect().bottom > 48)));
addEventListener('scroll', navTone, {passive: true});
navTone();

$$('.faq-q').forEach(q => q.addEventListener('click', () => {
  const item = q.closest('.faq-item');
  const open = !item.classList.contains('is-open');
  item.classList.toggle('is-open', open);
  q.setAttribute('aria-expanded', String(open));
}));

})();
