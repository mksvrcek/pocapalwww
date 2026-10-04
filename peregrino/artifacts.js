/* =============================================================
   Peregrino — the print family, for the web

   Ports of the app's paper artifacts (peregrino/Components/Artifacts
   and Tabs/CountryStamp.swift), laid out at the same canonical sizes
   with the same geometry, inks and type, then scaled as one piece the
   way ArtifactFrame does:

     stamp(a2, opts)    CountryStamp, 200 × 200 (230 with a date)
     ticket(spec)       PrintTicket, 480 × 200
     tag(spec)          LuggageTag, 460 × 240 (+ its string)
     receipt(spec)      ReceiptView, 288 wide
     polaroid(opts)     PolaroidCard, 1 : 1.13
     frame(el, w, h, width)  scale a canonical artifact to `width`

   Type: SF Pro Expanded / Condensed become Archivo at the matching
   widths (self-hosted, see assets/fonts); SF Mono stays the system mono.

   Exposed as window.PeregrinoArt.
   ============================================================= */
(() => {
'use strict';

/* ---------- inks (PrintStyle, Ink) ---------- */
const P = {
  paper: '#FBF9F4', shade: '#F2EEE5', ink: '#1D1C1A',
  soft: 'rgba(29,28,26,.62)', faint: 'rgba(29,28,26,.38)', rule: 'rgba(29,28,26,.14)',
  pencil: '#8A93A0', flight: '#2F5FE0', train: '#1E8455', concert: '#D9467E',
  visited: '#D9453B', lived: '#E0A21A', wishlist: '#7C5BE6', now: '#1E9E58',
  twine: '#B49A6C',
};

/* ---------- glyphs (stand-ins for the SF Symbols the app prints) ---------- */
const G = {
  flight: '<path d="M21.5 11.2 14.1 9.6 9.5 2.8H7.6l2.2 6.4-4.6-.5-1.6-2.3H2.2l.9 3.6-.9 3.6h1.4l1.6-2.3 4.6-.5-2.2 6.4h1.9l4.6-6.8 7.4-1.6c.7-.2.7-.7 0-.9Z"/>',
  train: '<path d="M7 3.5h10a3 3 0 0 1 3 3V15a3 3 0 0 1-2.2 2.9l1.6 2.6h-2l-1.4-2.4H8l-1.4 2.4h-2l1.6-2.6A3 3 0 0 1 4 15V6.5a3 3 0 0 1 3-3Zm-.5 3.7v3.6h11V7.2Zm1.6 6.3a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm7.8 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM9.5 1.8h5v1.2h-5Z"/>',
  bus: '<path d="M6.5 2.5h11a2.5 2.5 0 0 1 2.5 2.5v12a2 2 0 0 1-1 1.7V21h-2.4v-1.9H7.4V21H5v-2.3A2 2 0 0 1 4 17V5a2.5 2.5 0 0 1 2.5-2.5Zm-.2 3.4v5.6h11.4V5.9Zm1.4 7.7a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm8.6 0a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"/>',
  drive: '<path d="M6.4 5.4C6.8 4.3 7.8 3.6 9 3.6h6c1.2 0 2.2.7 2.6 1.8l1.5 4.2c1.1.4 1.9 1.4 1.9 2.7v5.2h-1.8v2h-2.6v-2H7.4v2H4.8v-2H3v-5.2c0-1.3.8-2.3 1.9-2.7Zm1.9.6-1.2 3.4h9.8l-1.2-3.4a.9.9 0 0 0-.8-.6H9.1a.9.9 0 0 0-.8.6Zm-1.6 6.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm10.6 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z"/>',
  ferry: '<path d="M10.8 2h2.4v2.2h3.3l.8 4.3 2.7 1-2.2 6.8a3.4 3.4 0 0 1-1.6-.4 3.8 3.8 0 0 1-4.4 0 3.8 3.8 0 0 1-4.4 0 3.4 3.4 0 0 1-1.6.4L3.6 9.5l2.7-1 .8-4.3h3.7Zm-1.9 4.1-.4 1.8L12 6.6l3.5 1.3-.4-1.8ZM3 18.5c1.5 0 2.2-.9 2.2-.9s.8.9 2.2.9 2.2-.9 2.2-.9.8.9 2.3.9 2.2-.9 2.2-.9.8.9 2.2.9 2.3-.9 2.3-.9.7.9 2.2.9V20c-1.2 0-2-.5-2.2-.6-.3.2-1.1.6-2.3.6s-2-.5-2.2-.6c-.3.2-1.1.6-2.2.6s-2-.5-2.3-.6c-.2.2-1 .6-2.2.6s-2-.5-2.2-.6c-.3.2-1 .6-2.2.6Z"/>',
  walk: '<path d="M13.4 2.2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-2.9 5.1 3.3-.6c.8-.1 1.5.3 1.9 1l1.3 2.6 2.5 1.3-.8 1.6-3-1.5-.8-1.5-.9 3.9 2.6 2.5.9 5.4h-2l-.8-4.4-2.3-2-1.2 2.9-3 3.9-1.6-1.2 2.7-3.5 1.8-6.4-1.2.4-1 2.9-1.9-.6 1.3-3.8Z"/>',
  concert: '<path d="M19 2.6v12.9a3.3 3.3 0 1 1-1.9-3V7.1l-8.2 1.8v8.6A3.3 3.3 0 1 1 7 14.5V5.3Z"/>',
  conference: '<path d="M12 4.2a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Zm-6.2 1.6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm12.4 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM12 11c3 0 5 1.6 5 3.6V18H7v-3.4C7 12.6 9 11 12 11Zm-6.3.9c.4 0 .7 0 1.1.1A4.9 4.9 0 0 0 5.6 15v3H1.8v-2.7c0-1.9 1.7-3.4 3.9-3.4Zm12.6 0c2.2 0 3.9 1.5 3.9 3.4V18h-3.8v-3c0-1.1-.4-2.1-1.2-3 .4-.1.7-.1 1.1-.1Z"/>',
  suitcase: '<path d="M9.2 3h5.6c.8 0 1.4.6 1.4 1.4V6h2.6A2.2 2.2 0 0 1 21 8.2v9.6a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 17.8V8.2A2.2 2.2 0 0 1 5.2 6h2.6V4.4c0-.8.6-1.4 1.4-1.4Zm.3 1.6V6h5V4.6Zm-4 3.1a.6.6 0 0 0-.6.6v9.4c0 .3.3.6.6.6h1V7.7Zm11.4 0v10.6h1.6c.3 0 .6-.3.6-.6V8.3a.6.6 0 0 0-.6-.6Z"/>',
  house: '<path d="M12 2.6 22 11h-2.7v9.4H14v-6h-4v6H4.7V11H2Z"/>',
  globe: '<path d="M12 2.2a9.8 9.8 0 1 1 0 19.6 9.8 9.8 0 0 1 0-19.6Zm-1.4 2a7.9 7.9 0 0 0-6.4 6.6l2 .6 1.9-1.6 1.7.4.7-1.7-1.3-1.2 1.6-1.4Zm4.3.3-.7 1.6 1.6 1.4.2 2.4 2.1.4.9-1.2a7.9 7.9 0 0 0-4.1-4.6ZM6.7 12.7l-2.6-.5a7.9 7.9 0 0 0 6.3 7.5l.5-2.1-1.8-1.7.2-2Zm9.6.3-2.2.5-1 2.3 1.4 1.6-.6 2.1a7.9 7.9 0 0 0 4.1-3.4Z"/>',
};
const glyph = (name, color, size) =>
  `<svg class="glyph" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" aria-hidden="true">${G[name] || G.flight}</svg>`;

/* ---------- deterministic randomness, as the app seeds it ---------- */
const MASK64 = 0xffffffffffffffffn;
function fnv(str) {
  let h = 14695981039346656037n;
  for (const b of new TextEncoder().encode(str)) { h ^= BigInt(b); h = (h * 1099511628211n) & MASK64; }
  return h;
}
/** StampScuffRNG: FNV-1a seeded LCG, (state >> 33) / UInt32.max. */
class RNG {
  constructor(seed) { const s = fnv(seed); this.s = s === 0n ? 1n : s; }
  next01() { this.s = (this.s * 6364136223846793005n + 1442695040888963407n) & MASK64; return Number((this.s >> 33n) & 0xffffffffn) / 4294967295; }
  next(a, b) { return a + this.next01() * (b - a); }
}
const bucket = (seed, mod) => Number(fnv(seed) % BigInt(mod));

/* ---------- country data (shared with the globe) ---------- */
let C = null;
const ready = (async () => {
  const load = window.PeregrinoGlobe && window.PeregrinoGlobe.countries
    ? window.PeregrinoGlobe.countries()
    : fetch('assets/globe/countries.json').then(r => r.json());
  // without the outlines the stamps still print, only without a silhouette
  let list = [];
  try { list = await load; } catch (e) { /* keep going */ }
  C = {};
  for (const c of list) C[c.a2] = c;
  if (document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('800 28px Archivo'), document.fonts.load('900 46px Archivo'),
      ]);
    } catch (e) { /* the fallback face is fine */ }
  }
})();

/* =============================================================
   CountryStamp
   ============================================================= */
const NAMES = {"AT":"Österreich","AL":"Shqipëria","BA":"Bosna","BE":"Belgique","BG":"България","BY":"Беларусь","CZ":"Česko","DE":"Deutschland","DK":"Danmark","EE":"Eesti","ES":"España","HU":"Magyarország","HR":"Hrvatska","IE":"Éire","IT":"Italia","LT":"Lietuva","LV":"Latvija","SE":"Sverige","SK":"Slovensko","UA":"Україна","FI":"Suomi","GR":"Ελλάδα","IS":"Ísland","ME":"Crna Gora","NL":"Nederland","MK":"Македонија","PL":"Polska","RO":"România","RS":"Србија","SI":"Slovenija","CH":"Schweiz","NO":"Norge","VA":"Vaticano","CY":"Κύπρος","RU":"Россия","LU":"Lëtzebuerg","AE":"الإمارات","AF":"افغانستان","AM":"Հայաստան","BH":"البحرين","BD":"বাংলাদেশ","CN":"中国","VN":"Việt Nam","YE":"اليمن","IN":"भारत","IR":"ایران","IQ":"العراق","IL":"ישראל","JP":"日本","JO":"الأردن","KW":"الكويت","KG":"Кыргызстан","LB":"لبنان","MN":"Монгол","NP":"नेपाल","KP":"조선","OM":"عُمان","PK":"پاکستان","QA":"قطر","SA":"السعودية","KR":"대한민국","LK":"ශ්‍රී ලංකා","SY":"سوريا","TJ":"Тоҷикистон","TH":"ไทย","TR":"Türkiye","AZ":"Azərbaycan","GE":"საქართველო","KZ":"Қазақстан","UZ":"Oʻzbekiston","PS":"فلسطين","MM":"မြန်မာ","KH":"កម្ពុជា","LA":"ລາວ","MV":"ދިވެހި","ID":"Indonesia","MY":"Malaysia","SG":"Singapura","PH":"Pilipinas","HK":"香港","TW":"臺灣","MO":"澳門","BJ":"Bénin","CM":"Cameroun","CD":"RDC","DZ":"الجزائر","ER":"ኤርትራ","ET":"ኢትዮጵያ","TD":"Tchad","GN":"Guinée","GW":"Guiné-Bissau","LY":"ليبيا","MG":"Madagasikara","MR":"موريتانيا","MU":"Maurice","MA":"المغرب","MZ":"Moçambique","SN":"Sénégal","SO":"Soomaaliya","SD":"السودان","TN":"تونس","EG":"مصر","CV":"Cabo Verde","ST":"São Tomé","CI":"Côte d'Ivoire","SZ":"eSwatini","DJ":"جيبوتي","KM":"Komori","BI":"Uburundi","DO":"Dominicana","HT":"Haïti","MX":"México","PA":"Panamá","BR":"Brasil","PE":"Perú","NZ":"Aotearoa","AX":"Åland","FO":"Føroyar","LI":"Liechtenstein","CX":"Christmas Is.","GQ":"Guinea Eq.","MQ":"Martinique","CK":"Cook Is.","NC":"Nle-Calédonie","PN":"Pitcairn","SJ":"Svalbard","IO":"BIOT","AG":"Antigua","BQ":"Bonaire","PM":"St-Pierre","VC":"St. Vincent","TC":"Turks & Caicos","VI":"US Virgin Is.","GF":"Guyane","MP":"N. Marianas","TF":"TAAF","HM":"Heard Is.","GS":"S. Georgia"};
const TONES = {"AD":"purple","AT":"red","AL":"red","BA":"blue","BE":"red","BG":"green","BY":"red","CZ":"blue","DE":"red","DK":"red","EE":"blue","ES":"red","HU":"green","HR":"red","IE":"green","IT":"green","LI":"purple","LT":"green","LV":"red","LU":"navy","SE":"blue","SK":"blue","UA":"blue","FI":"blue","FR":"navy","GR":"blue","IS":"blue","MT":"red","MD":"navy","MC":"purple","ME":"red","NL":"navy","MK":"red","PL":"red","PT":"green","RO":"navy","SM":"purple","RS":"red","SI":"blue","CH":"red","GB":"navy","NO":"navy","VA":"purple","CY":"sepia","RU":"navy","AE":"red","AF":"green","AM":"red","BH":"red","BT":"sepia","BD":"green","BN":"sepia","CN":"red","KH":"navy","VN":"red","YE":"red","IN":"sepia","ID":"red","IR":"green","IQ":"red","IL":"blue","JP":"red","JO":"red","KW":"green","KG":"red","LA":"navy","LB":"green","MY":"red","MV":"green","MN":"red","MM":"sepia","NP":"red","KP":"red","OM":"red","PK":"green","PH":"blue","QA":"sepia","SA":"green","SG":"red","KR":"red","LK":"sepia","SY":"red","TJ":"red","TH":"red","TL":"red","TM":"green","UZ":"blue","PS":"green","TR":"red","AZ":"blue","GE":"red","KZ":"blue","AO":"red","BJ":"green","BF":"red","BI":"red","BW":"navy","CV":"navy","CM":"green","CF":"blue","CG":"green","CI":"sepia","CD":"blue","GQ":"green","DZ":"green","DJ":"blue","ER":"green","ET":"green","KM":"green","SZ":"red","TD":"blue","ZA":"green","ZM":"green","ZW":"green","GA":"green","GM":"red","GH":"sepia","GN":"sepia","GW":"red","KE":"red","LS":"navy","LR":"navy","LY":"green","MG":"red","MW":"red","ML":"green","MR":"green","MU":"navy","MA":"red","MZ":"green","NA":"navy","NE":"green","NG":"green","RW":"blue","ST":"green","SN":"green","SC":"blue","SL":"green","SO":"blue","SD":"red","SS":"red","TZ":"green","TG":"green","TN":"red","UG":"sepia","EG":"red","AG":"red","BB":"navy","BS":"sepia","BZ":"navy","CA":"red","CU":"navy","CR":"navy","DM":"purple","DO":"navy","SV":"navy","GD":"red","GT":"navy","HT":"navy","HN":"navy","JM":"green","MX":"green","NI":"navy","PA":"navy","KN":"green","LC":"navy","VC":"navy","TT":"red","US":"navy","AR":"blue","BO":"red","BR":"green","CL":"navy","CO":"sepia","EC":"sepia","GY":"green","PY":"navy","PE":"red","SR":"green","UY":"blue","VE":"sepia","AU":"navy","VU":"red","WS":"red","FJ":"blue","KI":"red","FM":"blue","NR":"navy","NZ":"navy","PW":"blue","PG":"red","SB":"blue","TO":"red","TV":"navy","MH":"navy"};
const INK_RGB = {red: [.72, .20, .20], blue: [.22, .42, .66], navy: [.13, .20, .40], green: [.20, .42, .27], sepia: [.45, .30, .18], purple: [.40, .18, .50]};
const CONT_TONE = {EU: 'blue', AS: 'red', AF: 'green', NA: 'red', SA: 'green', OC: 'navy', AN: 'sepia'};

const SHAPE_ORDER = ['circle', 'hexagon', 'roundedRect', 'oval', 'tallRect', 'shield'];
const SHAPE_OVERRIDES = {AX: 'roundedRect', FO: 'roundedRect', HU: 'roundedRect', LI: 'roundedRect', LU: 'roundedRect', ME: 'oval', MK: 'roundedRect', SK: 'oval', CX: 'roundedRect', GE: 'roundedRect', GQ: 'roundedRect', GW: 'roundedRect', HN: 'oval', MQ: 'roundedRect', CK: 'oval', NC: 'roundedRect', PN: 'roundedRect'};
// StampShape: border rect, name centre, continent centre, outline rect, date centre, date size, name widths, name size
const SHAPES = {
  circle:      {b: [8, 8, 184, 184],  n: [100, 65], c: [50, 110], o: [75, 85, 80, 80], d: [100, 215], ds: 22, w: 130, lw: 124, ns: 28},
  hexagon:     {b: [8, 50, 184, 100], n: [100, 78], c: [45, 105], o: [95, 80, 60, 60], d: [100, 173], ds: 22, w: 130, lw: 118, ns: 28},
  roundedRect: {b: [8, 30, 184, 140], n: [100, 60], c: [38, 105], o: [90, 80, 80, 80], d: [100, 193], ds: 22, w: 160, lw: 144, ns: 28},
  oval:        {b: [8, 30, 184, 140], n: [100, 60], c: [45, 105], o: [90, 80, 80, 80], d: [100, 193], ds: 22, w: 150, lw: 116, ns: 28},
  tallRect:    {b: [42, 8, 116, 184], n: [100, 45], c: [60, 168], o: [60, 75, 80, 80], d: [100, 215], ds: 18, w: 110, lw: 86, ns: 24},
  shield:      {b: [18, 8, 164, 184], n: [100, 55], c: [50, 105], o: [80, 83, 80, 80], d: [100, 215], ds: 22, w: 140, lw: 128, ns: 28},
};
function shapeFor(a2) {
  if (SHAPE_OVERRIDES[a2]) return SHAPE_OVERRIDES[a2];
  let h = 5381;
  for (const b of new TextEncoder().encode(a2)) h = (Math.imul(h, 33) + b) >>> 0;
  return SHAPE_ORDER[h % SHAPE_ORDER.length];
}
function shapePath(kind, x, y, w, h) {
  const r2 = (r) => {
    r = Math.min(r, w / 2, h / 2);
    return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  };
  switch (kind) {
    case 'circle': case 'oval': {
      const rx = w / 2, ry = h / 2, cx = x + rx;
      return `M${cx - rx} ${y + ry}A${rx} ${ry} 0 1 0 ${cx + rx} ${y + ry}A${rx} ${ry} 0 1 0 ${cx - rx} ${y + ry}Z`;
    }
    case 'hexagon': {
      const i = h * 0.3;
      return `M${x + i} ${y}H${x + w - i}L${x + w} ${y + h / 2}L${x + w - i} ${y + h}H${x + i}L${x} ${y + h / 2}Z`;
    }
    case 'roundedRect': return r2(26);
    case 'tallRect': return r2(22);
    case 'shield': {
      const sh = y + h * 0.5, mx = x + w / 2;
      return `M${x} ${y}H${x + w}V${sh}Q${x + w} ${y + h} ${mx} ${y + h}Q${x} ${y + h} ${x} ${sh}Z`;
    }
  }
}

/* mainland rules (CountryOutlineCache.applyMainlandPolicy) */
const MAINLAND = {
  DK: [[54, 58, 8, 15.5]], FR: [[41, 52, -5, 10]], NL: [[50, 54, 3, 8]], NO: [[57, 72, 4, 32]],
  PT: [[36, 43, -10, -6]], RU: [[41, 78, 27, 180]], ES: [[36, 44, -10, 4]], GB: [[49, 61, -9, 2]],
  JP: [[30, 46, 128, 146]], EC: [[-5, 2, -81, -75]], NZ: [[-47, -34, 166, 179]],
  US: [[24, 50, -125, -65], [54, 72, -170, -130]],
};
const LARGEST = {FJ: 2, PF: 1, FM: 1, MP: 1, PW: 1, SH: 1, MH: 1, TO: 1, WF: 2, TF: 1, GS: 1};
const ringArea = r => { let s = 0; for (let i = 0; i < r.length - 2; i += 2) s += r[i] * r[i + 3] - r[i + 2] * r[i + 1]; return Math.abs(s) / 2; };
const centroid = r => { let x = 0, y = 0, n = r.length / 2; for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; } return [x / n, y / n]; };
function mainlandRings(a2) {
  const c = C && C[a2];
  if (!c || !c.r.length) return [];
  let rings = c.r;
  if (MAINLAND[a2]) {
    const kept = rings.filter(r => { const [lon, lat] = centroid(r); return MAINLAND[a2].some(([a, b, d, e]) => lat >= a && lat <= b && lon >= d && lon <= e); });
    rings = kept.length ? kept : [rings.reduce((m, r) => ringArea(r) > ringArea(m) ? r : m)];
  } else if (LARGEST[a2]) {
    rings = rings.slice().sort((p, q) => ringArea(q) - ringArea(p)).slice(0, LARGEST[a2]);
  }
  return rings;
}
const mercY = lat => Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, lat)) * Math.PI / 360));
/** The country's mainland in Web Mercator, letterboxed into a square at (x, y, s). */
function silhouettePath(a2, x, y, s) {
  const rings = mainlandRings(a2);
  if (!rings.length) return null;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const pts = rings.map(r => {
    const out = [];
    for (let i = 0; i < r.length; i += 2) {
      const px = r[i] * Math.PI / 180, py = -mercY(r[i + 1]);
      out.push(px, py);
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    return out;
  });
  const dx = x1 - x0, dy = y1 - y0, span = Math.max(dx, dy);
  if (!(span > 0)) return null;
  const ox = (span - dx) / 2, oy = (span - dy) / 2;
  let d = '';
  for (const r of pts) {
    for (let i = 0; i < r.length; i += 2) {
      d += (i ? 'L' : 'M') + (x + (r[i] - x0 + ox) / span * s).toFixed(1) + ' ' + (y + (r[i + 1] - y0 + oy) / span * s).toFixed(1);
    }
    d += 'Z';
  }
  return d;
}

/* measure text in a given face so names shrink to fit, like minimumScaleFactor */
let measurer = null;
const widths = new Map();
function textWidth(text, css) {
  const key = css + '|' + text;
  if (widths.has(key)) return widths.get(key);
  if (!measurer) {
    measurer = document.createElement('span');
    document.body.appendChild(measurer);
  }
  measurer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;white-space:nowrap;visibility:hidden;' + css;
  measurer.textContent = text;
  const w = measurer.getBoundingClientRect().width;
  widths.set(key, w);
  return w;
}
const NAME_CSS = s => `font-family:Archivo,var(--font);font-weight:800;font-stretch:75%;font-size:${s}px`;

const rgb = (a, k = 1) => `rgb(${a.map(v => Math.round(v * 255 * k)).join(',')})`;
function inkFor(a2, style, onDark) {
  if (style === 'pencil') return P.pencil;
  const c = C && C[a2];
  const tone = TONES[a2] || CONT_TONE[c ? c.c : 'EU'] || 'blue';
  const ink = INK_RGB[tone];
  // on the passport's dark pages the app lifts the ink with 52% white
  return onDark ? rgb(ink.map(v => v * 0.48 + 0.52)) : rgb(ink);
}
const CONT_CODE = {EU: 'EU', AS: 'AS', AF: 'AF', NA: 'NA', SA: 'SA', OC: 'OC', AN: 'AN'};
let stampN = 0;

/**
 * stamp(a2, {style: 'inked'|'lived'|'pencil', date: 'DD.MM.YYYY', dark, profile})
 * → {svg, angle, scale, height}; the svg is drawn on the 200-wide canonical canvas.
 */
function stamp(a2, o = {}) {
  const style = o.style || 'inked', kind = shapeFor(a2), S = SHAPES[kind];
  const c = C && C[a2];
  const name = NAMES[a2] || (c ? c.n : a2);
  const H = o.date ? 230 : 200, ink = inkFor(a2, style, o.dark), id = 'stm' + (++stampN);
  const [bx, by, bw, bh] = S.b;
  let border;
  if (style === 'pencil') {
    border = `<path d="${shapePath(kind, bx, by, bw, bh)}" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="9 7"/>`;
  } else {
    border = `<path d="${shapePath(kind, bx, by, bw, bh)}" fill="none" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/>`;
    if (style === 'lived') {
      const k = 0.88, ix = bx + bw * (1 - k) / 2, iy = by + bh * (1 - k) / 2;
      border += `<path d="${shapePath(kind, ix, iy, bw * k, bh * k)}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round"/>`;
    }
  }
  // the name shrinks to its width, never below 40%
  const maxW = style === 'lived' ? S.lw : S.w;
  const w = textWidth(name, NAME_CSS(S.ns));
  const fs = Math.max(S.ns * 0.4, Math.min(S.ns, S.ns * maxW / Math.max(w, 1)));
  const cc = (style === 'lived')
    ? (() => { const k = 0.88, mx = bx + bw / 2, my = by + bh / 2; return [mx + (S.c[0] - mx) * k, my + (S.c[1] - my) * k]; })()
    : S.c;
  const [ox, oy, os] = S.o;
  const sil = silhouettePath(a2, ox, oy, os);
  const silEl = !sil ? `<circle cx="${ox + os / 2}" cy="${oy + os / 2}" r="7" fill="${ink}"/>`
    : style === 'pencil'
      ? `<path d="${sil}" fill-rule="evenodd" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5 4"/>`
      : `<path d="${sil}" fill-rule="evenodd" fill="${ink}"/>`;
  const date = o.date ? `<text x="${S.d[0]}" y="${S.d[1]}" text-anchor="middle" dominant-baseline="central" fill="${ink}" class="st-date" font-size="${S.ds}">${o.date}</text>` : '';
  // the wear: patches, pin-pricks and streaks, seeded per country and profile
  let mask = '';
  if (style !== 'pencil') {
    const rng = new RNG(a2 + '|' + (o.profile || 'Peregrino'));
    let holes = '';
    for (let i = 0; i < 9; i++) {
      const cx = rng.next(0, 200), cy = rng.next(0, H), r = rng.next(12, 34), a = rng.next(.25, .55);
      holes += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="#000" fill-opacity="${a.toFixed(2)}"/>`;
    }
    for (let i = 0; i < 22; i++) {
      const cx = rng.next(0, 200), cy = rng.next(0, H), r = rng.next(1.5, 4.5), a = rng.next(.55, .95);
      holes += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="#000" fill-opacity="${a.toFixed(2)}"/>`;
    }
    for (let i = 0; i < 6; i++) {
      const cx = rng.next(20, 180), cy = rng.next(20, H - 20), len = rng.next(14, 30), th = rng.next(.8, 2), a = rng.next(.25, .55), ang = rng.next(-30, 30);
      holes += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(len / 2).toFixed(1)}" ry="${(th / 2).toFixed(2)}" transform="rotate(${ang.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="#000" fill-opacity="${a.toFixed(2)}"/>`;
    }
    mask = `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="${H}"><rect width="200" height="${H}" fill="#fff"/>${holes}</mask>`;
  }
  const cname = c ? c.n : name;
  const prof = o.profile || 'Peregrino';
  const angle = (bucket('rot|' + cname + '|' + prof, 3001) / 3000) * 2 * 7 - 7;
  const scale = 1 + (bucket('size|' + cname + '|' + prof, 2001) / 1000 - 1) * 0.025;
  const svg = `<svg class="cstamp" viewBox="0 0 200 ${H}" aria-hidden="true"><defs>${mask}</defs>` +
    `<g opacity=".88"${mask ? ` mask="url(#${id})"` : ''}>${border}` +
    `<text x="${S.n[0]}" y="${S.n[1]}" text-anchor="middle" dominant-baseline="central" fill="${ink}" class="st-name" font-size="${fs.toFixed(1)}">${name}</text>` +
    `<text x="${cc[0]}" y="${cc[1]}" text-anchor="middle" dominant-baseline="central" fill="${ink}" fill-opacity=".6" class="st-cont">${CONT_CODE[c ? c.c : 'EU'] || ''}</text>` +
    `${silEl}${date}</g></svg>`;
  return {svg, angle, scale, height: H, ink};
}
/** A stamp in a sized, tilted box: <span class="stamp-box" style="width:…">. */
function stampEl(a2, size, o = {}) {
  const s = stamp(a2, o);
  const el = document.createElement('span');
  el.className = 'stamp-box';
  el.style.width = size + 'px';
  el.style.height = size * s.height / 200 + 'px';
  el.style.setProperty('--tilt', (o.tilt ?? s.angle) + 'deg');
  el.style.setProperty('--mul', s.scale);
  el.innerHTML = s.svg;
  return el;
}

/* =============================================================
   PrintTicket — 480 × 200
   ============================================================= */
const TK = {w: 480, h: 200, stub: 124, joint: 356, notch: 9};
function barcode(seed, w, h, color = P.ink) {
  const rng = new RNG('barcode-v1|' + seed);
  let x = 0, bars = '';
  while (x < w) {
    const bw = rng.next(.8, 3.2), gap = rng.next(.9, 2.6);
    if (x + bw > w) break;
    bars += `<rect x="${x.toFixed(2)}" y="0" width="${bw.toFixed(2)}" height="${h}"/>`;
    x += bw + gap;
  }
  return `<svg class="barcode" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="${color}" aria-hidden="true">${bars}</svg>`;
}
/** The ragged tear along the perforation, from the app's seeded noise. */
function tearPath(seed) {
  const rng = new RNG('ticket-tear-v1|' + seed);
  const j = TK.joint, r = TK.notch;
  let d = `M12 0H${j - r}A${r} ${r} 0 0 0 ${j + rng.next(0, 1.2)} ${r}`;
  let y = r;
  while (y < TK.h - r) {
    y = Math.min(y + rng.next(2, 4.6), TK.h - r);
    let x = j + rng.next(-.8, 1.8);
    if (rng.next01() > .84) x += rng.next(.8, 2);
    d += `L${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  d += `A${r} ${r} 0 0 0 ${j - r} ${TK.h}H12A12 12 0 0 1 0 ${TK.h - 12}V12A12 12 0 0 1 12 0Z`;
  return d;
}
const BODY = `M12 0H${TK.joint - TK.notch}A${TK.notch} ${TK.notch} 0 0 0 ${TK.joint + 1} 8.94V191.06A${TK.notch} ${TK.notch} 0 0 0 ${TK.joint - TK.notch} 200H12A12 12 0 0 1 0 188V12A12 12 0 0 1 12 0Z`;
const STUB = 'M9 0H112A12 12 0 0 1 124 12V188A12 12 0 0 1 112 200H9A9 9 0 0 0 0 191V9A9 9 0 0 0 9 0Z';
const OUTLINE = `M12 0H${TK.joint - TK.notch}A${TK.notch} ${TK.notch} 0 0 0 ${TK.joint + TK.notch} 0H468A12 12 0 0 1 480 12V188A12 12 0 0 1 468 200H${TK.joint + TK.notch}A${TK.notch} ${TK.notch} 0 0 0 ${TK.joint - TK.notch} 200H12A12 12 0 0 1 0 188V12A12 12 0 0 1 12 0Z`;
const ACCENT = {flight: P.flight, train: P.train, concert: P.concert};
const LABEL = {flight: 'FLIGHT', train: 'TRAIN', bus: 'BUS', ferry: 'FERRY', drive: 'ROUTE', walk: 'ROUTE', concert: 'CONCERT', conference: 'CONFERENCE'};
const STUB_LABEL = {flight: 'BOARDS', ferry: 'SAILS', walk: 'STARTS', train: 'DEPARTS', bus: 'DEPARTS', drive: 'DEPARTS', concert: 'ADMIT ONE', conference: 'ADMIT ONE'};
let grainURL = null;
function grain() {
  if (grainURL) return grainURL;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), d = x.createImageData(128, 128), rng = new RNG('paper-grain-v1');
  for (let i = 0; i < 128 * 128; i++) {
    const v = Math.max(0, Math.min(255, 150 + rng.next(-90, 105)));
    d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return (grainURL = c.toDataURL());
}
let tkN = 0;
/**
 * spec: {mode, state:'planned'|'booked'|'used', ref, from:{code,name,sub}, to:{…},
 *        title, sub, fields:[[label, value]…], day, month, line, footer, seed}
 */
function ticket(s) {
  const id = 'tk' + (++tkN);
  const mode = s.mode || 'flight', state = s.state || 'booked', pencil = state === 'planned', torn = state === 'used';
  const isEvent = mode === 'concert' || mode === 'conference';
  const accent = pencil ? P.pencil : (ACCENT[mode] || P.ink);
  const ink = pencil ? P.pencil : P.ink, soft = pencil ? 'rgba(138,147,160,.9)' : P.soft, faint = pencil ? 'rgba(138,147,160,.75)' : P.faint;
  const hollow = pencil ? ' hollow' : '';
  const label = s.kindLabel || LABEL[mode];
  const glyphName = mode;
  const head = `<div class="tk-head" style="color:${accent}">${glyph(glyphName, accent, 11.5)}<span class="tk-kind">${label}</span><span class="tk-sp"></span>${s.ref ? `<span class="tk-ref" style="color:${soft}">${s.ref}</span>` : ''}</div>`;
  let middle;
  if (!isEvent && s.from && s.to) {
    const codes = s.from.code && s.to.code;
    const big = t => `<span class="tk-big ${codes ? 'tk-code' : 'tk-name'}${hollow}" style="color:${ink}">${t}</span>`;
    const conn = `<span class="tk-conn" style="color:${accent}"><i></i>${glyph(glyphName, accent, 15)}<i></i></span>`;
    middle = `<div class="tk-route">
      <div class="tk-row">${big(codes ? s.from.code : s.from.name)}${conn}${big(codes ? s.to.code : s.to.name)}</div>
      <div class="tk-stations" style="color:${soft}"><span>${s.from.sub || ''}</span><span>${s.to.sub || ''}</span></div></div>`;
  } else {
    const tile = `<span class="tk-tile" style="${pencil ? `border:1.4px dashed ${accent}` : `background:${hexA(accent, .11)}`}">${glyph(glyphName, accent, 21)}</span>`;
    middle = `<div class="tk-titlerow"><div class="tk-titleblock"><span class="tk-title${hollow}" style="color:${ink}">${s.title}</span>${s.sub ? `<span class="tk-sub" style="color:${soft}">${s.sub}</span>` : ''}</div>${tile}</div>`;
  }
  const fields = `<div class="tk-fields">${(s.fields || []).slice(0, 3).map(([l, v]) => `<div class="tk-field"><span class="tk-label" style="color:${soft}">${l}</span><span class="tk-value" style="color:${ink}">${v}</span></div>`).join('')}</div>`;
  const footer = state === 'planned' ? 'NOT BOOKED' : state === 'used' ? '' : (s.footer || '');
  const stub = `<div class="tk-stub-face">
      <span class="tk-label" style="color:${soft}">${s.stubLabel || STUB_LABEL[mode]}</span><span class="tk-sp"></span>
      ${s.day ? `<span class="tk-day${hollow}" style="color:${accent}">${s.day}</span>` : ''}
      ${s.month ? `<span class="tk-month" style="color:${ink}">${s.month}</span>` : ''}
      ${s.line ? `<span class="tk-line" style="color:${soft}">${s.line}</span>` : ''}
      <span class="tk-sp"></span>
      <span class="tk-bar">${pencil ? `<i class="tk-pencilbox" style="border-color:${faint}"></i>` : barcode(s.seed || 'x', 88, 26)}</span>
      <span class="tk-foot" style="color:${accent}">${footer || '&nbsp;'}</span>
    </div>`;
  const el = document.createElement('div');
  el.className = `tk is-${state}`;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', s.aria || `${label.toLowerCase()} ticket`);
  const g = grain();
  el.innerHTML = `
    <svg class="tk-paper" viewBox="0 0 480 200" aria-hidden="true">
      <defs>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".03"/></linearGradient>
        <pattern id="${id}g" patternUnits="userSpaceOnUse" width="128" height="128"><image href="${g}" width="128" height="128"/></pattern>
      </defs>
      <g class="tk-body">
        <path d="${BODY}" fill="${P.paper}"/><path d="${BODY}" fill="url(#${id}s)"/>
        <path d="${BODY}" fill="url(#${id}g)" opacity=".07" style="mix-blend-mode:multiply"/>
      </g>
      <g class="tk-body-torn">
        <path d="${tearPath(s.seed || 'x')}" fill="${P.paper}"/><path d="${tearPath(s.seed || 'x')}" fill="url(#${id}s)"/>
        <path d="${tearPath(s.seed || 'x')}" fill="none" stroke="rgba(0,0,0,.09)" stroke-width=".6"/>
      </g>
      <path class="tk-edge" d="${OUTLINE}" fill="none" stroke="${pencil ? P.pencil : 'rgba(0,0,0,.07)'}" stroke-width="${pencil ? 2.5 : .6}" ${pencil ? 'stroke-dasharray="9 7"' : ''}/>
    </svg>
    <div class="tk-main">${head}${middle}${fields}</div>
    <div class="tk-stub">
      <svg class="tk-paper" viewBox="0 0 124 200" aria-hidden="true">
        <path d="${STUB}" fill="${P.paper}"/><path d="${STUB}" fill="url(#${id}s)"/>
        <path d="${STUB}" fill="url(#${id}g)" opacity=".07" style="mix-blend-mode:multiply"/>
        <line x1="0" y1="14" x2="0" y2="186" stroke="${faint}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray=".8 3.6"/>
      </svg>
      ${stub}
    </div>`;
  return el;
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/* =============================================================
   LuggageTag — 460 × 240, eyelet on the left
   ============================================================= */
const TG = {w: 460, h: 240, cut: 40, r: 12, soft: 5, eyeX: 34, hole: 7.5, ring: 15};
function roundedPoly(pts) {
  // pts: [[x, y, r]…], convex, clockwise — tangent arcs at each corner
  const n = pts.length, seg = [];
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[(i - 1 + n) % n], [x, y, r] = pts[i], [nx, ny] = pts[(i + 1) % n];
    const v1 = [px - x, py - y], v2 = [nx - x, ny - y];
    const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
    const u1 = [v1[0] / l1, v1[1] / l1], u2 = [v2[0] / l2, v2[1] / l2];
    const ang = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    const t = r / Math.tan(ang / 2);
    seg.push({a: [x + u1[0] * t, y + u1[1] * t], b: [x + u2[0] * t, y + u2[1] * t], r});
  }
  let d = `M${seg[0].b[0].toFixed(2)} ${seg[0].b[1].toFixed(2)}`;
  for (let i = 1; i <= n; i++) {
    const s = seg[i % n];
    d += `L${s.a[0].toFixed(2)} ${s.a[1].toFixed(2)}A${s.r} ${s.r} 0 0 1 ${s.b[0].toFixed(2)} ${s.b[1].toFixed(2)}`;
  }
  return d + 'Z';
}
const TAG_PATH = roundedPoly([[TG.cut, 0, TG.soft], [TG.w, 0, TG.r], [TG.w, TG.h, TG.r], [TG.cut, TG.h, TG.soft], [0, TG.h - TG.cut, TG.soft], [0, TG.cut, TG.soft]]);
const HOLE = `M${TG.eyeX - TG.hole} ${TG.h / 2}a${TG.hole} ${TG.hole} 0 1 0 ${TG.hole * 2} 0a${TG.hole} ${TG.hole} 0 1 0 ${-TG.hole * 2} 0Z`;
let tgN = 0;
/**
 * spec: {title, kind:'TRIP'|'STAY'|'LIVED', countries:[a2…], days, trailing, dates,
 *        img, state:'planned'|'booked'|'used', lived, seed, string:true}
 */
function tag(s) {
  const id = 'tg' + (++tgN);
  const pencil = s.state === 'planned';
  const accent = pencil ? P.pencil : (s.lived ? P.lived : P.visited);
  const codes = [...new Set(s.countries || [])];
  const caption = codes.length === 0 ? '' : codes.length === 1 ? ((C && C[codes[0]] ? C[codes[0]].n : codes[0]).toUpperCase()) : `${codes.length} COUNTRIES`;
  const head = [s.kind || 'TRIP', caption].filter(Boolean).join(' · ');
  const trailing = s.trailing || (s.days ? (s.days === 1 ? '1 DAY' : `${s.days} DAYS`) : '');
  const trailingColor = s.trailingAccent ? accent : (pencil ? P.pencil : P.soft);
  // stamps beside the window: up to three, overlapping at the app's offsets
  const offs = codes.length === 1 ? [[0, -2]] : codes.length === 2 ? [[-26, -22], [26, 20]] : [[-30, -26], [30, -2], [-12, 28]];
  const stamps = codes.slice(0, 3).map((a2, i) => {
    const st = stamp(a2, {style: pencil ? 'pencil' : (s.lived ? 'lived' : 'inked'), profile: s.seed});
    const size = 80, cx = 276 + 81 + offs[i][0], cy = 34 + 66 + offs[i][1];
    return `<span class="tg-stamp" style="left:${cx - size / 2}px;top:${cy - size / 2}px;width:${size}px;height:${size}px;--tilt:${st.angle}deg">${st.svg}</span>`;
  }).join('');
  const g = grain();
  const el = document.createElement('div');
  el.className = `tg${pencil ? ' is-planned' : ''}`;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `${(s.kind || 'trip').toLowerCase()} luggage tag, ${s.title}`);
  el.innerHTML = `
    <svg class="tg-paper" viewBox="-70 -6 ${TG.w + 76} ${TG.h + 12}" aria-hidden="true">
      <defs><pattern id="${id}g" patternUnits="userSpaceOnUse" width="128" height="128"><image href="${g}" width="128" height="128"/></pattern>
        <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6e6e6"/><stop offset="1" stop-color="#a3a3a3"/></linearGradient></defs>
      <path d="${TAG_PATH} ${HOLE}" fill="${P.paper}" fill-rule="evenodd"/>
      <path d="${TAG_PATH} ${HOLE}" fill="url(#${id}g)" fill-rule="evenodd" opacity=".07" style="mix-blend-mode:multiply"/>
      ${pencil ? `<path d="${TAG_PATH}" fill="none" stroke="${P.pencil}" stroke-width="2.5" stroke-dasharray="9 7"/>` : ''}
      <g class="tg-eyelet">
        <path d="M${TG.eyeX - TG.ring} ${TG.h / 2}a${TG.ring} ${TG.ring} 0 1 0 ${TG.ring * 2} 0a${TG.ring} ${TG.ring} 0 1 0 ${-TG.ring * 2} 0Z ${HOLE}" fill-rule="evenodd"
          fill="${pencil ? 'rgba(138,147,160,.22)' : `url(#${id}r)`}" stroke="${pencil ? P.pencil : 'rgba(0,0,0,.28)'}" stroke-width="${pencil ? 2 : .8}"/>
      </g>
      ${s.string !== false ? `<path class="tg-string" d="M${TG.eyeX} 120C6 100 -34 72 -62 70" fill="none" stroke="${P.twine}" stroke-width="2.6" stroke-linecap="round"/>` : ''}
    </svg>
    <div class="tg-front">
      <div class="tg-head" style="color:${accent}">${glyph(s.lived ? 'house' : 'suitcase', accent, 12)}<span class="tg-kind">${head}</span><span class="tk-sp"></span>${trailing ? `<span class="tg-trail" style="color:${trailingColor}">${trailing}</span>` : ''}</div>
      <div class="tg-window${pencil ? ' is-pencil' : ''}">${s.img ? `<img src="${s.img}" alt="" loading="lazy">` : ''}</div>
      <span class="tk-sp"></span>
      <div class="tg-title${pencil ? ' hollow' : ''}">${s.title}</div>
      <div class="tg-dates" style="color:${pencil ? P.pencil : P.soft}">${s.dates || ''}</div>
    </div>
    ${stamps}`;
  return el;
}

/* =============================================================
   ReceiptView — 288 wide, torn zigzag ends
   ============================================================= */
function receiptOutline(w, h, seed) {
  const tooth = 9, depth = 5, count = Math.max(Math.round(w / tooth), 1), step = w / count;
  let phase = 0;
  for (const ch of seed) phase = (phase * 31 + ch.codePointAt(0)) % 9973;
  const bite = i => Math.abs(Math.sin(i * 12.9898 + phase)) * depth * .3;
  let d = `M0 ${depth}`;
  for (let i = 0; i < count; i++) { const x = i * step; d += `L${(x + step / 2).toFixed(2)} ${bite(i).toFixed(2)}L${(x + step).toFixed(2)} ${depth}`; }
  d += `L${w} ${h - depth}`;
  for (let i = 0; i < count; i++) { const x = w - i * step; d += `L${(x - step / 2).toFixed(2)} ${(h - bite(i + count)).toFixed(2)}L${(x - step).toFixed(2)} ${h - depth}`; }
  return d + 'Z';
}
/**
 * spec: {title, stamp:'02 OCT 2026 · 09:41', lines:[{t:'heading'|'item'|'detail'|'rule'|'total'|'note', l, v}], footer, seed}
 */
function receipt(s) {
  const rng = new RNG('receipt-no-v1|' + s.title);
  const no = String(Math.floor(rng.next(0, 9999))).padStart(4, '0');
  const row = ln => {
    switch (ln.t) {
      case 'heading': return `<div class="rc-heading">${ln.l}</div>`;
      case 'item': return `<div class="rc-pair"><span>${ln.l}</span><i></i><span>${ln.v}</span></div>`;
      case 'detail': return `<div class="rc-pair rc-detail"><span>${ln.l}</span><i></i><span>${ln.v}</span></div>`;
      case 'rule': return `<div class="rc-rule"></div>`;
      case 'total': return `<div class="rc-total"><div class="rc-rule rc-double"></div><div class="rc-pair"><span>${ln.l}</span><i></i><span>${ln.v}</span></div><div class="rc-rule rc-double"></div></div>`;
      case 'note': return `<div class="rc-note">${ln.l}</div>`;
    }
    return '';
  };
  const el = document.createElement('div');
  el.className = 'rc';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'travel receipt: ' + s.lines.filter(l => l.v).map(l => `${l.l} ${l.v}`).join(', '));
  el.innerHTML = `
    <svg class="rc-paper" preserveAspectRatio="none" aria-hidden="true"><path fill="${P.paper}"/></svg>
    <div class="rc-in">
      <div class="rc-mast">${glyph('globe', P.soft, 10)}<span>·</span><span>RECEIPT</span><span class="tk-sp"></span><span>No. ${no}</span></div>
      <div class="rc-title">${s.title}</div>
      <div class="rc-time">${s.stamp}</div>
      <div class="rc-rule"></div>
      ${s.lines.map(row).join('')}
      <div class="rc-close">
        ${s.footer ? `<div class="rc-foot">${s.footer}</div>` : ''}
        ${barcode('receipt|' + s.title, 176, 34)}
        <div class="rc-digits">${no} ${s.code || '20261001'}</div>
      </div>
    </div>`;
  // the zigzag outline needs the strip's height
  requestAnimationFrame(() => fitReceipt(el, s.title));
  return el;
}
function fitReceipt(el, seed) {
  const h = el.offsetHeight, w = 288;
  if (!h) return;
  const svg = el.querySelector('.rc-paper');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.querySelector('path').setAttribute('d', receiptOutline(w, h, seed));
}

/* =============================================================
   PolaroidCard — 1 : 1.13, pads 5% / 5% / 18%
   ============================================================= */
function polaroid(o) {
  const el = document.createElement('figure');
  el.className = 'pl';
  el.innerHTML = `<div class="pl-photo"><img src="${o.img}" alt="${o.alt || ''}" loading="lazy"></div>${o.caption ? `<figcaption>${o.caption}</figcaption>` : ''}${o.pin ? '<span class="pl-pin"></span>' : ''}`;
  if (o.seed) {
    const t = (bucket('polaroid|' + o.seed, 2001) / 1000 - 1) * 3;
    el.style.setProperty('--tilt', t.toFixed(2) + 'deg');
  }
  return el;
}

/* =============================================================
   ArtifactFrame: lay out at canonical size, scale to a width
   ============================================================= */
function frame(el, cw, ch, width, cls = '') {
  // the scale sits on a wrapper, so the artifact's own transforms (a torn ticket
  // sliding to centre) still apply inside it
  const f = document.createElement('div'), inner = document.createElement('div');
  f.className = 'art-frame ' + cls;
  inner.className = 'art-scale';
  inner.style.width = cw + 'px'; inner.style.height = ch + 'px';
  inner.style.transformOrigin = '0 0';
  inner.appendChild(el);
  f.appendChild(inner);
  f.rescale = (w) => {
    f.style.width = w + 'px'; f.style.height = ch * w / cw + 'px';
    inner.style.transform = `scale(${w / cw})`;
  };
  f.rescale(width);
  return f;
}

window.PeregrinoArt = {ready, stamp, stampEl, ticket, tag, receipt, polaroid, frame, glyph, P, shapeFor, countries: () => C};
})();
