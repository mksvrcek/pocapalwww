/* =============================================================
   Peregrino — the tour's carriers

   Side views of the vehicles that carry the phone from one blade to
   the next, drawn after the app's own: the Earth theme's airliner
   (white, coloured tail) and cargo ship, a train and a car in the
   travel modes' tints, and the Mars theme's moon lander.

   Each is drawn facing right in its own units. SPEC gives its size and
   its anchor: where the phone stands (deck) or where its line is made
   fast (hook), and the line the wheels run on or the waterline. Parts
   app.js moves: .wh wheels (rotated about data-c), .flame and .jet
   (scaled from data-o). Exposed as window.PeregrinoVehicles.
   ============================================================= */
(() => {
'use strict';

const globe = (x, y, r, stroke, w = 1.6) => `<g fill="none" stroke="${stroke}" stroke-width="${w}"><circle cx="${x}" cy="${y}" r="${r}"/><ellipse cx="${x}" cy="${y}" rx="${r * .43}" ry="${r}"/><path d="M${x - r} ${y}h${r * 2}"/></g>`;
// a wheel with spokes, so it can be seen to roll
const wheel = (x, y, r) => `<g class="wh" data-c="${x} ${y} ${r}"><circle cx="${x}" cy="${y}" r="${r}" fill="#2a2d33"/><circle cx="${x}" cy="${y}" r="${r * .6}" fill="#9aa1ab"/><path d="M${x - r * .6} ${y}h${r * 1.2}M${x} ${y - r * .6}v${r * 1.2}" stroke="#5d636b" stroke-width="${r * .17}"/><circle cx="${x}" cy="${y}" r="${r * .2}" fill="#2a2d33"/></g>`;
// puffs of smoke that drift back from (x, y) and fade, on a CSS loop
const puffs = (x, y, r, n, cls) => Array.from({length: n}, (_, i) => `<circle class="pf ${cls}" cx="${x}" cy="${y}" r="${r}" style="animation-delay:${(-i * 1.6 / n).toFixed(2)}s"/>`).join('');

/* the airliner: white fuselage, the airline's colour on the tail and the cheatline */
function plane(tail = '#2659b3') {
  const win = [];
  for (let x = 104; x <= 324; x += 13) win.push(`<rect x="${x}" y="60" width="6.5" height="8" rx="3" fill="#56657a"/>`);
  return `<svg viewBox="0 0 420 130" aria-hidden="true">
    <path d="M22 66 L10 62 L58 60 L70 66 Z" fill="#c8ced7"/>
    <path d="M36 54 L14 8 L44 8 L94 54 Z" fill="${tail}"/>
    <path d="M36 54 L14 8 L22 8 L50 54 Z" fill="#000" opacity=".12"/>
    ${globe(40, 30, 9, '#fff', 1.8)}
    <path d="M26 64 Q28 50 50 48 L338 48 Q374 48 398 68 Q382 88 338 88 L66 88 Q40 88 26 64 Z" fill="#f6f7f9"/>
    <path d="M34 76 Q48 88 66 88 L338 88 Q370 88 392 74 Q366 82 338 82 L66 82 Q48 82 34 76 Z" fill="#dde2e9"/>
    <path d="M44 72 L392 72 L388 77 L50 77 Z" fill="${tail}"/>
    ${win.join('')}
    <path d="M86 54 h9 v22 h-9 Z M330 54 h9 v22 h-9 Z" fill="none" stroke="#c2c9d3" stroke-width="1.2"/>
    <path d="M356 58 L374 60 L384 67 L360 66 Z" fill="#2c3a52"/>
    <path d="M178 84 L270 84 L240 98 L160 98 Z" fill="#c9cfd8"/>
    <rect x="198" y="96" width="58" height="22" rx="11" fill="#d7dce3"/>
    <rect x="198" y="104" width="58" height="14" rx="7" fill="#c4cad3"/>
    <ellipse cx="256" cy="107" rx="4" ry="10" fill="#7c8592"/>
    <path d="M30 76 v6" stroke="#7c8592" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

/* a push-pull train: the locomotive pushes a flatcar, so the flatcar leads */
function train() {
  return `<svg viewBox="0 0 660 150" aria-hidden="true">
    <rect x="10" y="40" width="270" height="8" rx="3" fill="#7d858f"/>
    <path d="M128 40 l14 -16 l14 16 M142 24 l18 -10" fill="none" stroke="#4b5159" stroke-width="3" stroke-linecap="round"/>
    <path d="M10 48 L244 48 Q292 48 318 100 L318 118 L10 118 Z" fill="#eef0ec"/>
    <path d="M10 92 L304 92 Q311 99 314 104 L10 104 Z" fill="#1e8455"/>
    <path d="M10 104 L314 104 L318 110 L318 118 L10 118 Z" fill="#167048"/>
    <path d="M250 56 Q282 60 300 90 L262 90 Z" fill="#1f2a36"/>
    <rect x="34" y="60" width="38" height="22" rx="4" fill="#33404f"/>
    <rect x="86" y="60" width="38" height="22" rx="4" fill="#33404f"/>
    <rect x="138" y="58" width="22" height="34" rx="3" fill="none" stroke="#c4c9c2" stroke-width="1.5"/>
    <rect x="176" y="60" width="38" height="22" rx="4" fill="#33404f"/>
    <circle cx="310" cy="110" r="3.5" fill="#ffe8a3"/>
    <rect x="40" y="118" width="80" height="10" rx="3" fill="#3a3f46"/><rect x="196" y="118" width="80" height="10" rx="3" fill="#3a3f46"/>
    ${wheel(58, 132, 13)}${wheel(102, 132, 13)}${wheel(214, 132, 13)}${wheel(258, 132, 13)}
    <rect x="316" y="106" width="24" height="6" rx="2" fill="#4b5159"/>
    <rect x="338" y="96" width="316" height="18" rx="3" fill="#59606a"/>
    <rect x="338" y="96" width="316" height="4" rx="2" fill="#7d858f"/>
    <rect x="352" y="114" width="288" height="8" fill="#3a3f46"/>
    ${wheel(384, 132, 13)}${wheel(428, 132, 13)}${wheel(566, 132, 13)}${wheel(610, 132, 13)}
  </svg>`;
}

/* a little red car with a flat trailer behind it */
function car() {
  return `<svg viewBox="0 0 640 160" aria-hidden="true">
    ${puffs(352, 124, 7, 4, 'pf-car')}
    <rect x="8" y="98" width="318" height="16" rx="4" fill="#6b7179"/>
    <rect x="8" y="94" width="318" height="6" rx="3" fill="#8a9099"/>
    <path d="M326 110 L366 122" stroke="#3a3f46" stroke-width="6" stroke-linecap="round"/>
    ${wheel(122, 133, 20)}${wheel(212, 133, 20)}
    <g class="body">
      <path d="M362 120 L362 96 Q366 82 386 78 L424 52 Q436 44 456 44 L528 44 Q548 44 562 58 L586 80 Q626 84 632 100 L634 120 Q634 128 626 128 L370 128 Q362 128 362 120 Z" fill="#ff3b30"/>
      <path d="M362 112 L634 112 L634 120 Q634 128 626 128 L370 128 Q362 128 362 120 Z" fill="#d42a21"/>
      <path d="M432 58 Q440 52 456 52 L494 52 L494 80 L410 80 Z" fill="#cfe7ff"/>
      <path d="M502 52 L526 52 Q542 52 552 62 L568 80 L502 80 Z" fill="#cfe7ff"/>
      <path d="M498 52 L498 120" stroke="#d42a21" stroke-width="2"/>
      <rect x="512" y="88" width="14" height="4" rx="2" fill="#a31d16"/>
      <rect x="618" y="92" width="14" height="8" rx="3" fill="#fff2c2"/>
      <rect x="362" y="94" width="8" height="10" rx="2" fill="#a31d16"/>
    </g>
    ${wheel(412, 132, 21)}${wheel(584, 132, 21)}
  </svg>`;
}

/* the app's cargo ship: dark hull, white bridge aft, a clear foredeck */
function ship() {
  const win = [];
  for (let y = 62; y <= 104; y += 14) for (let x = 54; x <= 150; x += 16) win.push(`<rect x="${x}" y="${y}" width="10" height="7" rx="2" fill="#3a4757"/>`);
  return `<svg viewBox="0 0 800 220" aria-hidden="true">
    ${puffs(93, 12, 11, 5, 'pf-ship')}
    <rect x="74" y="14" width="38" height="36" rx="4" fill="#40404d"/>
    <rect x="74" y="22" width="38" height="8" fill="#30b0c7"/>
    <rect x="40" y="48" width="132" height="72" rx="6" fill="#f2f3f5"/>
    <rect x="40" y="48" width="132" height="10" rx="5" fill="#e1e4e8"/>
    ${win.join('')}
    <path d="M708 120 L716 66 L722 66 L728 120" fill="#8a9099"/>
    <path d="M12 120 L780 120 Q798 120 792 136 L762 200 L44 200 Q26 200 18 184 Z" fill="#40404d"/>
    <path d="M14 126 L790 126 L788 131 L16 131 Z" fill="#f2f3f5"/>
    <path d="M27 178 L774 178 L762 200 L44 200 Q30 200 27 188 Z" fill="#b5413c"/>
    ${globe(630, 154, 12, 'rgba(255,255,255,.55)', 1.6)}
  </svg>`;
}

/* the Mars theme's moon lander: gold-foil descent stage, silver ascent stage,
   four legs; the main engine fires down, and small jets hold it in a hover */
function lander() {
  return `<svg viewBox="0 0 240 300" aria-hidden="true">
    <defs>
      <linearGradient id="lfl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe6"/><stop offset=".35" stop-color="#ffd257"/><stop offset=".75" stop-color="#ff7a1f" stop-opacity=".75"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></linearGradient>
    </defs>
    <g class="flame" data-o="120 164"><path d="M100 164 Q104 214 120 262 Q136 214 140 164 Z" fill="url(#lfl)"/><path d="M110 164 Q113 196 120 222 Q127 196 130 164 Z" fill="#fffdf0" opacity=".9"/></g>
    <g class="jet" data-o="50 132"><path d="M52 130 Q36 146 24 168 Q42 156 58 136 Z" fill="url(#lfl)"/></g>
    <g class="jet" data-o="190 132"><path d="M188 130 Q204 146 216 168 Q198 156 182 136 Z" fill="url(#lfl)"/></g>
    <path d="M70 128 L40 196 M170 128 L200 196" stroke="#a7adb6" stroke-width="5" stroke-linecap="round"/>
    <path d="M58 128 L16 198 M182 128 L224 198" stroke="#c9ced6" stroke-width="7" stroke-linecap="round"/>
    <path d="M72 116 L30 170 M168 116 L210 170" stroke="#c9ced6" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="16" cy="200" rx="14" ry="5" fill="#c9ced6"/><ellipse cx="224" cy="200" rx="14" ry="5" fill="#c9ced6"/>
    <ellipse cx="40" cy="198" rx="10" ry="4" fill="#a7adb6"/><ellipse cx="200" cy="198" rx="10" ry="4" fill="#a7adb6"/>
    <path d="M106 140 L134 140 L142 164 L98 164 Z" fill="#26282d"/>
    <path d="M60 92 L180 92 L192 110 L192 134 L180 144 L60 144 L48 134 L48 110 Z" fill="#e9c34f"/>
    <path d="M70 100 l18 30 M98 96 l10 40 M130 98 l-6 38 M160 100 l-14 34 M60 120 h120" stroke="#c99a2e" stroke-width="2" fill="none" opacity=".8"/>
    <path d="M80 92 L86 50 L104 36 L136 36 L154 50 L160 92 Z" fill="#dadde2"/>
    <path d="M80 92 L86 50 L100 40 L100 92 Z" fill="#c4c8ce"/>
    <path d="M110 52 L130 52 L124 70 L116 70 Z" fill="#26282d"/>
    <rect x="112" y="24" width="16" height="14" rx="3" fill="#c4c8ce"/>
    <path d="M154 56 l18 -10" stroke="#a7adb6" stroke-width="3" stroke-linecap="round"/>
    <rect x="113" y="163" width="14" height="6" rx="2" fill="#8a9099"/>
  </svg>`;
}

/* a fair-weather cloud */
function cloud() {
  return `<svg viewBox="0 0 220 90" aria-hidden="true"><path d="M30 80 Q4 80 6 60 Q8 42 30 44 Q30 18 60 18 Q76 0 104 8 Q122 -2 142 14 Q172 8 182 34 Q214 34 214 58 Q214 80 186 80 Z" fill="#fff"/><path d="M30 80 Q12 80 8 68 Q40 74 70 70 Q120 78 160 70 Q196 72 212 64 Q208 80 186 80 Z" fill="#e9edf2"/></svg>`;
}

/* geometry, in each drawing's own units: its size, its anchor, and the line its
   wheels run on (ground) or it floats at (water) */
const SPEC = {
  plane:  {w: 420, h: 130, hook: [30, 82]},          // the tow line is made fast under the tail
  train:  {w: 660, h: 150, deck: [496, 96], ground: 145},
  car:    {w: 640, h: 160, deck: [166, 94], ground: 153},
  ship:   {w: 800, h: 220, deck: [470, 120], water: 176},
  lander: {w: 240, h: 300, hook: [120, 168]},        // the winch, under the engine
  cloud:  {w: 220, h: 90},
};

window.PeregrinoVehicles = {plane, train, car, ship, lander, cloud, SPEC};
})();
