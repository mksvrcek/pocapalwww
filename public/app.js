/* =============================================================
   PocaPal — product page choreography

   The cards travel single file along one 3D curve: a sweep across
   the bottom of the screen, up and off to the right, back across
   BEHIND the phone, round the left side, then a swoop toward the
   viewer and down into the phone's screen.

   Everything is a pure function of scroll progress `p` (0 → 1),
   so scrubbing up and down gives identical frames.
   ============================================================= */
(() => {
'use strict';

/* -------------------------------------------------------------
   1. ASSETS
   Swap these filenames for real artwork — the same list drives the
   flying cards, the in-phone grid and the two screenshots below.
   `r` is width / height. `s` gives non-rectangular items their
   own silhouette.
   ------------------------------------------------------------- */
const ASSETS = [
  {f:'poca-01.jpg', r:0.62}, {f:'poca-02.jpg', r:0.639},
  {f:'poca-03.jpg', r:0.639}, {f:'poca-04.jpg', r:0.623},
  {f:'poca-05.jpg', r:0.648}, {f:'poca-06.jpg', r:0.62},
  {f:'album-01.jpg', r:0.714}, {f:'poca-07.jpg', r:0.684},
  {f:'poca-08.jpg', r:0.632}, {f:'poca-09.jpg', r:0.657},
  {f:'album-03.jpg', r:0.968}, {f:'poca-10.jpg', r:0.641},
  {f:'poca-11.jpg', r:0.639}, {f:'item-01.png', r:0.748, t:1},
  {f:'poca-12.jpg', r:0.657}, {f:'album-04.jpg', r:0.995},
  {f:'poca-13.jpg', r:0.655}, {f:'poca-14.jpg', r:0.627},
  {f:'album-02.jpg', r:0.768}, {f:'poca-15.jpg', r:0.641},
  {f:'album-05.jpg', r:1.021},
];
const SRC = f => 'assets/cards/' + f;

/** the id an item is filed under, and the title of its detail sheet */
const ID = f => f.replace(/\.\w+$/, '').toUpperCase();

/* -------------------------------------------------------------
   1b. ITEM DETAIL
   What the sheet shows, keyed by the id an item is filed under,
   which is its filename: poca-04.jpg is POCA-04.
     name  the product's own name. Without one the sheet falls back
           to the id, the way the app falls back to "untitled"
     kind  Photocard | Album | Item      own   Owned | Wishlist
     g/gko group and its Korean name     gav   the face in the GROUP circle
     i/iko idol and their Korean name    iav   the face in the IDOL circle,
                                               the item's own art if left out
     date  when it was filed             from  where it came from
     ver   held for later, not shown on the sheet
   An entry with no group shows only the IDOL block, and one with no
   idol only the GROUP block, which is how soloists and albums land.
   ------------------------------------------------------------- */
const INFO = {
  'POCA-01': {name:'Hollys Summer Ver.', kind:'Photocard', own:'Owned',
              g:'RESCENE', gko:'리센느', gav:'poca-01.jpg',
              i:'May', iko:'메이', date:'3 May 2026', from:'Hollys Cafe event'},
  'POCA-02': {name:'FEARNOT Membership Ver.', kind:'Photocard', own:'Owned',
              g:'LE SSERAFIM', gko:'르세라핌', gav:'poca-06.jpg',
              i:'Chaewon', iko:'김채원', date:'18 February 2026', from:'Membership gift'},
  'POCA-03': {name:'Born To Be Tour Ver.', kind:'Photocard', own:'Owned',
              g:'ITZY', gko:'있지', gav:'poca-05.jpg',
              i:'Ryujin', iko:'신류진', date:'27 July 2025', from:'Concert giveaway'},
  'POCA-04': {name:'EASY Ver. 2', kind:'Photocard', own:'Owned',
              g:'LE SSERAFIM', gko:'르세라핌', gav:'poca-06.jpg',
              i:'Chaewon', iko:'김채원', date:'9 November 2025', from:'Album inclusion'},
  'POCA-05': {name:'Chatime Collab Ver.', kind:'Photocard', own:'Owned',
              g:'ITZY', gko:'있지', gav:'poca-05.jpg',
              i:'Ryujin', iko:'신류진', date:'14 March 2026', from:'Chatime concert event'},
  'POCA-06': {name:'ANTIFRAGILE Unit Ver.', kind:'Photocard', own:'Owned',
              g:'LE SSERAFIM', gko:'르세라핌', gav:'poca-06.jpg',
              i:'Kazuha & Chaewon', iko:'카즈하, 김채원',
              date:'21 June 2025', from:'Album inclusion'},
  'POCA-07': {name:'School Days', kind:'Photocard', own:'Owned',
              g:'LE SSERAFIM', gko:'르세라핌', gav:'poca-06.jpg',
              i:'Chaewon', iko:'김채원', date:'5 October 2025', from:'Poca Store Seoul'},
  'POCA-08': {name:'Hey! Hallyu Ver.', kind:'Photocard', own:'Owned',
              g:'LE SSERAFIM', gko:'르세라핌', gav:'poca-06.jpg',
              i:'Chaewon', iko:'김채원', date:'30 August 2025', from:'Hey! Hallyu Amsterdam'},
  'POCA-09': {name:'Chill Kill Ver. A', kind:'Photocard', own:'Owned',
              g:'Red Velvet', gko:'레드벨벳', gav:'album-05.jpg',
              i:'Wendy', iko:'손승완', date:'12 January 2026', from:'Album inclusion'},
  'POCA-10': {name:'The Winning Ver.', kind:'Photocard', own:'Owned',
              i:'IU', iko:'아이유', date:'24 April 2026', from:'Album inclusion'},
  'POCA-11': {name:'Poca Store Exclusive', kind:'Photocard', own:'Owned',
              g:'LE SSERAFIM', gko:'르세라핌', gav:'poca-06.jpg',
              i:'Chaewon', iko:'김채원', date:'16 December 2025', from:'Poca Store'},
  'POCA-12': {name:'Karina x Sprite', kind:'Photocard', own:'Owned',
              g:'aespa', gko:'에스파', gav:'poca-12.jpg',
              i:'Karina', iko:'유지민', date:'8 June 2026', from:'Online'},
  'POCA-13': {name:'Seoul Pop-up Ver.', kind:'Photocard', own:'Owned',
              g:'LE SSERAFIM', gko:'르세라핌', gav:'poca-06.jpg',
              i:'Chaewon', iko:'김채원', date:'2 September 2025', from:'Poca Store Seoul'},
  'POCA-14': {name:'Hong Kong Pop-up Ver.', kind:'Photocard', own:'Owned',
              g:'ILLIT', gko:'아일릿', gav:'poca-14.jpg',
              i:'Moka', iko:'모카', date:'19 May 2026', from:'Pop-up in Hong Kong'},
  'POCA-15': {name:'Tour Merch Ver.', kind:'Photocard', own:'Owned',
              i:'Gaho', iko:'가호', date:'7 February 2026', from:'Concert shop'},
  'ALBUM-01':{name:'Heart Attack', kind:'Album', own:'Owned',
              g:'AOA', gko:'에이오에이', gav:'album-01.jpg',
              date:'11 July 2025', from:'Online'},
  'ALBUM-02':{name:'Drip', kind:'Album', own:'Owned', ver:'Rami version',
              g:'BABYMONSTER', gko:'베이비몬스터', gav:'album-02.jpg',
              date:'28 November 2025', from:'Weverse'},
  'ALBUM-03':{name:'NA', kind:'Album', own:'Owned',
              i:'Nayeon', iko:'임나연', date:'22 March 2026', from:'Online'},
  'ALBUM-04':{name:'Cerulean Verge', kind:'Album', own:'Owned', ver:'Vinyl',
              g:'Red Velvet', gko:'레드벨벳', gav:'album-05.jpg',
              i:'Wendy', iko:'손승완', iav:'poca-09.jpg',
              date:'4 October 2025', from:'Online'},
  'ALBUM-05':{name:'Joy With Love', kind:'Album', own:'Owned',
              g:'Red Velvet', gko:'레드벨벳', gav:'album-05.jpg',
              i:'Joy', iko:'박수영', date:'26 January 2026', from:'Online'},
  'ITEM-01': {name:'Kimachi', kind:'Item', own:'Owned',
              g:'LE SSERAFIM', gko:'르세라핌', gav:'poca-06.jpg',
              i:'Chaewon', iko:'김채원', iav:'poca-04.jpg',
              date:'1 December 2025', from:'Pop-up store'},
};

/* -------------------------------------------------------------
   2. THE CURVE
   Control points for a Catmull-Rom spline, as fractions of the
   viewport: [x · width, y · height, z · height].
   z is depth — negative is behind the screen plane (small, hazy),
   positive is toward the viewer (large). The phone sits at z = 0,
   so anything negative passes behind it.
   ------------------------------------------------------------- */
const CURVE = [
  /* — out through the right edge, level with the middle row, and slightly
       toward the viewer so a departing card rides over the row still waiting
       rather than through it — */
  [ 1.05, 0.500,  0.30],
  [ 1.34, 0.492,  0.14],
  /* — up the right-hand side, starting to recede — */
  [ 1.60, 0.345, -0.10],
  [ 1.46, 0.190, -0.34],
  /* — back across the top, behind the phone, right to left — */
  [ 0.94, 0.130, -0.50],
  [ 0.36, 0.120, -0.56],
  [-0.20, 0.155, -0.50],
  [-0.50, 0.290, -0.34],
  /* — round the left side and turn toward the viewer — */
  [-0.64, 0.490, -0.10],
  [-0.54, 0.705,  0.18],
  [-0.14, 0.855,  0.46],
  /* — swoop up into the phone screen — */
  [ 0.22, 0.800,  0.40],
  [ 0.44, 0.625,  0.17],
  [ 0.50, 0.500,  0.00],
];

/* -------------------------------------------------------------
   3. TUNING — every beat lives here
   ------------------------------------------------------------- */
const T = {
  heroFadeIn:   0.010, heroFadeOut: 0.068,  // headline leaves…
  riseIn:       0.070, riseOut:     0.135,  // …and only then does the grid lift into
                                            // the space it was in — they never overlap
  hold:         0.140,                      // nothing leaves the grid until it has settled
  hoverUntil:   0.16,                       // pointer tilt stays live while the
                                            // grid still fills the screen
  chaseLead:    1.05,                       // how far ahead of the queue's tail, in card
                                            // slots, a card starts moving to meet it
  phoneIn:      0.530, phoneSet:    0.660,  // phone arrives
  arriveAt:     0.99,                       // head card lands the moment the phone settles
  finishBy:     0.90,                       // …and when the LAST card has been filed
  absorbFrom:   0.88,                       // arc fraction where a card peels into its slot
  outroIn:      0.915, outroFull:   0.985,
  settleIn:     0.870, settleOut:   0.975,  // phone eases down to make room for the outro
  swipeIn:      0.972, swipeOut:    0.996,  // …and the screen pushes across to the themed home
  gridRows:      4,                         // most rows of tiles visible at once
  gridHeadroom:  0.5,                       // rows of clearance kept above the tab bar
  persp:        1600,                       // projection distance, px
};

/* -------------------------------------------------------------
   4. MATH HELPERS
   ------------------------------------------------------------- */
const clamp  = (v,a,b) => v < a ? a : v > b ? b : v;
const clamp01= v => clamp(v,0,1);
const lerp   = (a,b,t) => a + (b-a)*t;
/** 0 below `a`, 1 above `b`, linear in between */
const range  = (v,a,b) => clamp01((v-a)/(b-a));
const smooth = t => t*t*(3-2*t);
const easeOut= t => 1-Math.pow(1-t,3);
const easeIO = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
/** stable pseudo-random in [0,1) from an integer */
const rnd = i => { const x = Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); };
const catmull = (a,b,c,d,t) => {
  const t2 = t*t, t3 = t2*t;
  return 0.5*(2*b + (c-a)*t + (2*a-5*b+4*c-d)*t2 + (-a+3*b-3*c+d)*t3);
};

/* -------------------------------------------------------------
   5. BOOT
   ------------------------------------------------------------- */
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const story    = document.getElementById('story');
const track    = document.querySelector('.story-track');
const layer    = document.getElementById('cardLayer');
const heroCopy = document.getElementById('heroCopy');
const phoneWrap= document.getElementById('phoneWrap');
const appGrid  = document.getElementById('appGrid');
const outro    = document.getElementById('storyOutro');
const phoneCount = document.getElementById('phoneCount');
const pageA    = document.getElementById('phonePageA');
const pageB    = document.getElementById('phonePageB');
const marquee  = document.getElementById('marquee');
const mqRow    = document.getElementById('marqueeRow');
const nav      = document.getElementById('nav');

/* --- in-phone grid: one permanent slot per card, so nothing is ever
       overwritten. The grid is taller than its window and rides upward. --- */
const slots = [];

/* --- the endless queue: two identical halves so the loop is seamless --- */
if (mqRow) {
  const half = document.createDocumentFragment();
  for (const [i, a] of ASSETS.entries()) {
    const img = document.createElement('img');
    img.src = SRC(a.f); img.alt = ''; img.loading = 'lazy';
    img.dataset.r = String(a.r); img.dataset.i = String(i);
    if (a.t) img.className = 'is-cut';
    half.appendChild(img);
  }
  mqRow.appendChild(half.cloneNode(true));
  mqRow.appendChild(half);
}

/* --- the cards ---
   Every asset gets a flying card and the phone tile it lands in, built
   as one pair so the two can never drift apart. How many of them are
   actually in play is decided by `fit()` below. --- */
const ALL_CARDS = [], ALL_SLOTS = [];
const cards = [];
for (let i = 0; i < ASSETS.length; i++) {
  const a  = ASSETS[i];
  const el = document.createElement('div');
  el.className = 'pcard' + (a.t ? ' pcard--cut' : '');
  el.dataset.holo = (i % 3 === 0) ? '0' : '1';
  el.style.setProperty('--holo-delay', (-i * 0.93) + 's');
  const img = document.createElement('img');
  img.src = SRC(a.f); img.alt = ''; img.loading = i < 14 ? 'eager' : 'lazy';
  el.appendChild(img);
  ALL_CARDS.push({
    el, asset: a,
    tilt:  (rnd(i)*2-1) * 4.5,      // resting lean, on top of the curve's banking
    tiltX: 0, tiltY: 0, lift: 0,    // live pointer tilt
    wantX: 0, wantY: 0, wantL: 0,   // …and where it is heading
    spin:  (rnd(i+91)*2-1) * 46,    // flourish while being absorbed
    w: 0, h: 0, zi: 0, vis: 1,
  });

  const tile = document.createElement('div');
  tile.className = 'app-slot';
  const timg = document.createElement('img');
  timg.src = SRC(a.f); timg.alt = ''; timg.loading = 'lazy';
  tile.style.setProperty('--tile-r', String(a.r));
  tile.appendChild(timg);
  ALL_SLOTS.push({el: tile, on: false, lx: 0, ly: 0, sh: 0});
}
// everything is in play until the first measure trims it, so the pointer
// handlers wired below reach every card there will ever be
cards.push(...ALL_CARDS);
slots.push(...ALL_SLOTS);
for (const c of ALL_CARDS) layer.appendChild(c.el);
for (const s of ALL_SLOTS) appGrid.appendChild(s.el);

/* The resting grid is always three rows, so the column count is the card
   count divided by three. Narrow the viewport and there is less room per
   column, so columns come off one at a time, down to three on a phone.
   Which cards stay is drawn from the photocards and from everything else
   separately, each spread across its own list, so a small grid keeps the
   same mix of cards to albums and merch that the full one has. */
const MIN_CELL = 170;               // narrowest a column may get, px
const MAX_COLS = Math.floor(ASSETS.length / 3);
/** a phone carries a fourth row, so the grid has something to rise from */
const rowsFor = w => w < 760 ? 4 : 3;
/** how many columns the width can give a decent cell, before the extra one */
const baseCols = w => w < 760 ? (w >= 388 ? 4 : 3)
                              : clamp(Math.floor(w * 0.96 / MIN_CELL), 3, MAX_COLS);
/** Only the widest screens keep the whole grid on screen: there it already
    fits. Everything narrower runs a column more than it strictly has room
    for and lets the outer cards hang off the edges instead. */
const onScreen = w => w >= 760 && baseCols(w) >= MAX_COLS;
const colsFor  = w => w < 760 || onScreen(w) ? baseCols(w)
                                            : Math.min(baseCols(w) + 1, MAX_COLS);
const POCA = [], REST = [];
ASSETS.forEach((a, i) => (a.f.startsWith('poca') ? POCA : REST).push(i));
/** k entries spread evenly across `src`, ends included */
const spread = (src, k) => {
  const out = [];
  for (let i = 0; i < k; i++)
    out.push(src[k === 1 ? 0 : Math.round(i * (src.length - 1) / (k - 1))]);
  return out;
};
function fit(w) {
  const cols = colsFor(w);
  if (cols === G.fitCols) return;
  G.fitCols = cols;
  const n = cols * rowsFor(w), last = ALL_CARDS.length - 1;
  const rest = Math.round(n * REST.length / ASSETS.length);
  const keep = new Set([...spread(REST, rest), ...spread(POCA, n - rest)]);
  cards.length = slots.length = 0;
  for (let i = 0; i <= last; i++) {
    if (keep.has(i)) {
      cards.push(ALL_CARDS[i]); slots.push(ALL_SLOTS[i]);
      // re-appending an element that is already there just moves it, which
      // is how the tiles keep their order after a set changes
      layer.appendChild(ALL_CARDS[i].el);
      appGrid.appendChild(ALL_SLOTS[i].el);
    } else {
      ALL_CARDS[i].el.remove(); ALL_SLOTS[i].el.remove();
    }
  }
  counts = makeCounts();            // the climb has to land on the new last card
}

/* the queue behind the phone answers the pointer the same way the grid does */
if (mqRow && !reduced) {
  for (const img of mqRow.children) {
    img.addEventListener('pointerenter', () => marquee.classList.add('is-held'));
    img.addEventListener('pointermove', e => {
      const r = img.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      const ny = ((e.clientY - r.top)  / r.height - 0.5) * 2;
      img.style.transform =
        `perspective(620px) rotateX(${-ny * 12}deg) rotateY(${nx * 12}deg) scale(1.14)`;
    });
    img.addEventListener('pointerleave', () => {
      img.style.transform = '';
      marquee.classList.remove('is-held');
    });
  }
}

/* -------------------------------------------------------------
   5b. THE ITEM SHEET
   Click anything in the hero and its detail opens over a darkened
   page, laid out the way the app lays it out. Both sets of cards
   are reachable: the grid while it is still at rest, and the queue
   once the story has played out.
   ------------------------------------------------------------- */
const sheet = document.getElementById('sheet');
if (sheet) {
  const q       = sel => sheet.querySelector(sel);
  const wash    = q('#sheetWash');
  const artBox  = q('.sheet-art'),  art  = q('#sheetArt');
  const panel   = q('.sheet-panel'), scroll = q('.sheet-scroll'), shut = q('.sheet-x');
  const title   = q('#sheetTitle');
  const kindEl  = q('#sheetKind'),  ownEl = q('#sheetOwn');
  const people  = q('#sheetPeople'), rows = q('#sheetRows');
  const root    = document.documentElement;
  let lastFocus = null, shutTimer = 0;

  const GLYPH = {
    cards: '<rect x="4" y="2.5" width="8.5" height="11" rx="1.5"/><path d="M2.6 5v7.2a2 2 0 0 0 2 2h5.6"/>',
    albums:'<circle cx="8" cy="8" r="5.6"/><circle cx="8" cy="8" r="1.25"/>',
    items: '<rect x="2.5" y="4.5" width="11" height="8" rx="1.6"/><path d="M2.5 7.6h11"/>',
  };
  const stat = (k, n) =>
    `<span class="person-stat"><svg viewBox="0 0 16 16" aria-hidden="true">${GLYPH[k]}</svg>${n}</span>`;
  /* the little tallies under a name are stable per item, not random each open */
  const person = (label, name, ko, avatar, seed) => {
    const n = k => Math.floor(rnd(seed + k) * 9);
    return `<div><div class="sheet-label">${label}</div>
      <div class="person"><img class="person-av" src="${avatar}" alt="">
        <div class="person-main">
          <div class="person-name">${name}</div>
          <div class="person-sub"><span>${ko}</span>` +
          stat('cards', n(1) + 1) + stat('albums', n(2)) + stat('items', n(3)) +
        `</div></div></div></div>`;
  };
  const row = (k, v) => v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : '';

  function fill(a) {
    const id = ID(a.f), d = INFO[id] || {}, src = SRC(a.f);
    art.src = src;
    art.style.transform = '';        // no tilt carried over from the last one
    artBox.classList.toggle('is-cut', !!a.t);
    wash.style.setProperty('--wash', `url("${src}")`);
    title.textContent = d.name || id;   // the id stands in until it has a name
    kindEl.textContent = d.kind || 'Item';
    ownEl.textContent  = d.own  || 'Owned';
    const seed = id.length * 31 + id.charCodeAt(id.length - 1);
    people.innerHTML =
      (d.g ? person('Group', d.g, d.gko || '', SRC(d.gav || a.f), seed)      : '') +
      (d.i ? person('Idol',  d.i, d.iko || '', SRC(d.iav || a.f), seed + 57) : '');
    // group and idol are already up in the blocks above, so they stay out of here
    rows.innerHTML = row('Date', d.date) + row('Source', d.from);
  }

  function open(a) {
    clearTimeout(shutTimer);
    fill(a);
    lastFocus = document.activeElement;
    sheet.hidden = false;
    scroll.scrollTop = 0; panel.scrollTop = 0;   // the panel is the scroller on a phone
    root.classList.add('sheet-open');      // the page holds still underneath
    dropNudge();
    requestAnimationFrame(() => sheet.classList.add('is-open'));
    panel.focus({preventScroll: true});
  }
  function close() {
    if (sheet.hidden) return;
    sheet.classList.remove('is-open');
    root.classList.remove('sheet-open');
    shutTimer = setTimeout(() => { sheet.hidden = true; }, reduced ? 0 : 360);
    if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll: true});
  }

  /* the artwork answers the pointer the way the cards outside do. offsetX is
     measured in the image's own untransformed box, so the tilt cannot chase
     its own rect. */
  if (!reduced) {
    art.addEventListener('pointermove', e => {
      const nx = (e.offsetX / art.offsetWidth  - 0.5) * 2;
      const ny = (e.offsetY / art.offsetHeight - 0.5) * 2;
      art.style.transform =
        `perspective(900px) rotateX(${-ny * 10}deg) rotateY(${nx * 10}deg) scale(1.035)`;
    });
    art.addEventListener('pointerleave', () => { art.style.transform = ''; });
  }

  sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  addEventListener('keydown', e => {
    if (sheet.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    // the close button is the only stop inside, so Tab stays on it
    else if (e.key === 'Tab') { e.preventDefault(); shut.focus(); }
  });

  for (const c of cards) c.el.addEventListener('click', () => open(c.asset));
  if (mqRow) for (const img of mqRow.children)
    img.addEventListener('click', () => open(ASSETS[Number(img.dataset.i)]));
}

/* While the grid is still at rest, the cards answer the pointer: a small lift,
   and a tilt that pushes whichever edge you are nearest away from you, as if
   you were pressing on it. Once the story starts scrolling this is dropped so
   it never fights the choreography. */
const TILT = 11;          // degrees at the very corner
const LIFT = 0.06;        // extra scale under the pointer

if (!reduced) {
  for (const c of cards) {
    c.el.addEventListener('pointermove', e => {
      if (target > T.hoverUntil) return;
      const r = c.el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      const ny = ((e.clientY - r.top)  / r.height - 0.5) * 2;
      c.wantY =  nx * TILT;          // pointer right, right edge goes back
      c.wantX = -ny * TILT;          // pointer high, top edge goes back
      c.wantL = 1;
      kick();
    });
    c.el.addEventListener('pointerleave', () => {
      c.wantX = c.wantY = c.wantL = 0;
      kick();
    });
  }
}

/* The item count shown in the phone's search field. Each card that lands adds
   a chunk rather than a single item, so it climbs the way a real collection
   would once you start filing a haul. The steps are uneven but deterministic,
   and scaled so the last one lands exactly on COUNT_END. */
const COUNT_START = 24, COUNT_END = 462;
function makeCounts() {
  const step = cards.map((_, i) => 14 + rnd(i + 5) * 26);
  const k = (COUNT_END - COUNT_START) / step.reduce((a, b) => a + b, 0);
  let v = COUNT_START;
  return step.map(x => Math.round(v += x * k));
}
let counts = makeCounts();

/* -------------------------------------------------------------
   6. GEOMETRY — sample the curve, project it, build an arc table.
   Arc length is measured in *projected* pixels, so the cards stay
   evenly spaced on screen instead of bunching up in the distance.
   ------------------------------------------------------------- */
const G = {};

function measure() {
  const r = track.getBoundingClientRect();
  G.W = r.width;
  G.H = r.height || window.innerHeight;

  const narrow = G.W < 760;
  const bleed  = !onScreen(G.W);   // does the grid run off the edges?
  fit(G.W);                       // how many columns this width can carry

  // A phone screen is tall and narrow, so it carries a fourth row: three rows
  // all fitted above the fold with nothing left to come, and the grid had
  // nowhere to rise from. The fourth waits below the bottom edge and comes up
  // with the rest, the way the grid rises on a desktop.
  G.rows = narrow ? 4 : 3;
  G.cols = Math.ceil(cards.length / G.rows);
  // Where the grid runs off the edges it is laid out wider than the screen, so
  // the outer cards are cropped rather than the whole grid shrinking to fit.
  // The spread is tied to the column count, so the outer card sits about the
  // same distance from the edge however many columns there are.
  G.cellW = (G.W * (bleed ? 1 + 0.68 / (G.cols - 1) : 0.96)) / G.cols;
  const heroBottom = heroCopy.offsetTop + heroCopy.offsetHeight;

  // The rows sit at their cruise position centred on the viewport, so with
  // three of them the middle one lands exactly on the line the cards leave
  // along and never has to move vertically to join the queue.
  G.cellH = (narrow ? 0.20 : 0.28) * G.H;   // four rows want a tighter pitch
  G.rowY  = Array.from({length: G.rows},
                       (_, k) => 0.5 + (k - (G.rows - 1) / 2) * (G.cellH / G.H));
  G.cardH = Math.min(G.cellH / 1.24, G.cellW / 1.15, G.H * 0.24);
  G.spacing = G.cardH * 1.55;   // pitch of the cards once they are in the line
  G.gridX = (G.W - G.cols * G.cellW) / 2;
  // How far the grid sits below its cruise position at rest — measured from
  // the headline itself, so the top row always starts clear of the text and
  // the two never overlap on the way up.
  G.riseY = Math.max(G.H * 0.30,
    heroBottom + G.H * 0.04 + G.cardH / 2 - G.rowY[0] * G.H);

  // the phone: CSS centres it, JS owns the transform, so offsetWidth
  // and offsetHeight stay stable whatever scale we apply
  G.phoneW   = phoneWrap.offsetWidth  || 300;
  G.phoneH   = phoneWrap.offsetHeight || 614;
  G.phoneFit = Math.min(1, (G.H * 0.80) / G.phoneH);
  // the screenshot's own UI type size, so the live count matches it
  if (phoneCount) phoneCount.style.setProperty('--ui', (G.phoneW * 0.0253) + 'px');

  for (const c of cards) {
    c.h = G.cardH;
    c.w = G.cardH * c.asset.r;
    c.el.style.width  = c.w + 'px';
    c.el.style.height = c.h + 'px';
  }

  // the queue's card sizes, and the band the settled phone has to live in
  if (mqRow) {
    const qh = Math.round(Math.min(G.H * 0.17, G.W * 0.16));
    for (const img of mqRow.children) {
      img.style.height = qh + 'px';
      img.style.width  = Math.round(qh * Number(img.dataset.r)) + 'px';
    }
  }
  const outroBottom = outro.offsetTop + outro.offsetHeight;
  const topLimit = outroBottom + G.H * 0.03;
  const botLimit = G.H - G.H * 0.025;
  G.settleScale = clamp((botLimit - topLimit) / G.phoneH, 0.55, 0.94);
  G.settleY = (topLimit + botLimit) / 2 - G.H / 2;
  // run the queue through the middle of where the phone ends up
  if (marquee) marquee.style.top = Math.round(G.H / 2 + G.settleY) + 'px';

  buildCurve();
  cacheSlots();
}

function buildCurve() {
  const raw = CURVE.map(([x,y,z]) => ({x: x*G.W, y: y*G.H, z: z*G.H}));
  const P   = [raw[0], ...raw, raw[raw.length-1]];   // clamp the ends
  const PER = 40;
  const pts = [];
  for (let j = 0; j < P.length - 3; j++) {
    for (let i = 0; i < PER; i++) {
      const t = i / PER;
      pts.push({
        x: catmull(P[j].x, P[j+1].x, P[j+2].x, P[j+3].x, t),
        y: catmull(P[j].y, P[j+1].y, P[j+2].y, P[j+3].y, t),
        z: catmull(P[j].z, P[j+1].z, P[j+2].z, P[j+3].z, t),
      });
    }
  }
  pts.push({...raw[raw.length-1]});

  const cx = G.W/2, cy = G.H/2, F = T.persp;
  for (const q of pts) {
    q.k  = F / (F - q.z);          // perspective scale
    q.px = cx + (q.x - cx) * q.k;
    q.py = cy + (q.y - cy) * q.k;
  }
  let acc = 0;
  pts[0].s = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += Math.hypot(pts[i].px - pts[i-1].px, pts[i].py - pts[i-1].py);
    pts[i].s = acc;
  }
  G.pts = pts;
  G.len = acc;
  G.zFar = 0.72 * G.H;             // depth used to normalise haze + stacking

  // at rest the head of the line sits just past the right edge, so the
  // ribbon spans the full width under the headline on every viewport
  buildQueue();
  solveFlow();

  /* The grid has to be empty before the phone starts coming in, or the last
     row is still flying away over the top of it. A tall narrow screen is
     where that bites: the grid is four rows deep and the curve across it is
     short, so the queue has much further to run relative to the curve than it
     does on a desktop. Delaying the phone does not help, because the head's
     speed is solved from its own arrival and the whole thing scales together.
     A shorter queue does: tighten the pitch until the last card is away in
     time, down to a floor where the cards would start to overlap. */
  const floor = G.cardH * 1.05;
  for (let i = 0; i < 14 && G.spacing > floor; i++) {
    if (gridClearAt() <= T.phoneIn - 0.02) break;
    G.spacing = Math.max(floor, G.spacing * 0.95);
    buildQueue();
    solveFlow();
  }
}

/** the head's speed, from two fixed points: it reaches the phone at
    `phoneSet`, and the tail clears the curve at `finishBy` */
function solveFlow() {
  const ps   = T.phoneSet, fb = T.finishBy;
  const need = G.len + (cards.length - 1) * G.spacing;
  G.flowBase = (T.arriveAt * G.len - G.startS) / warp(ps);
  G.flowPull = Math.max(0,
    (need - G.startS - G.flowBase * warp(fb)) * (1 - ps) / ((fb - ps) * (fb - ps)));
}

/** the progress at which the last card has left its square */
function gridClearAt() {
  const goal = cards[cards.length - 1].join;
  let lo = T.hold, hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (headAt(mid) < goal) lo = mid; else hi = mid;
  }
  return hi;
}

/** where card `i` sits in the resting grid. Taken a row at a time, and
    right-to-left within each row, so every card flies out across squares the
    grid has already given up — it never crosses one still waiting. `rise`
    slides the whole grid up from under the headline before any of that
    starts. */
function gridPos(i, rise) {
  const row = (i / G.cols) | 0;
  const col = (G.cols - 1) - (i % G.cols);
  return {
    x: G.gridX + col * G.cellW + G.cellW / 2,
    y: G.rowY[row] * G.H + (rise || 0),
  };
}

/** For each card: `join` is how far the head of the queue has travelled by
    the time this card's own slot reaches its grid cell — so it leaves exactly
    as the card in front of it goes past, straight off its own square with no
    sliding about first. Clamped to stay in order, which also keeps the line
    gap-free. Cells sit *before* the curve starts, on the straight run the
    opening tangent extends back through the grid. */
function buildQueue() {
  const a = G.pts[0], b = G.pts[1];
  const tx = b.px - a.px, ty = b.py - a.py;
  const d  = Math.hypot(tx, ty) || 1;
  let prev = -Infinity;
  for (let i = 0; i < cards.length; i++) {
    const g = gridPos(i, 0);
    const along = ((g.x - a.px) * tx + (g.y - a.py) * ty) / d;   // signed arc
    const j = Math.max(prev + G.spacing * 0.12, along + i * G.spacing);
    cards[i].join = j;
    prev = j;
  }
  G.startS = cards[0].join - G.spacing * (T.chaseLead + 0.6);
}

/** arc length → projected point. Before the start of the curve the line
    carries straight on along the opening tangent — clamping to the first
    point instead would pile every waiting card onto the same spot, and
    they would visibly slide out of that heap as they joined the line. */
function at(sv) {
  const A = G.pts, last = A.length - 1;
  if (sv <= 0) {
    const a = A[0], b = A[1];
    const dx = b.px - a.px, dy = b.py - a.py;
    const d  = Math.hypot(dx, dy) || 1;
    return {px: a.px + dx / d * sv, py: a.py + dy / d * sv, k: a.k, z: a.z};
  }
  if (sv >= G.len)   return A[last];
  let lo = 0, hi = last;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (A[mid].s <= sv) lo = mid; else hi = mid;
  }
  const a = A[lo], b = A[hi];
  const t = (sv - a.s) / ((b.s - a.s) || 1);
  return {
    px: lerp(a.px, b.px, t), py: lerp(a.py, b.py, t),
    k:  lerp(a.k,  b.k,  t), z:  lerp(a.z,  b.z,  t),
  };
}

/** slot centres in phone-local px (untransformed, so valid at any scale),
    plus the row pitch and the height of the window the grid scrolls inside */
function cacheSlots() {
  const wrap = appGrid.parentElement;
  for (const s of slots) {
    let x = 0, y = 0, n = s.el;
    while (n && n !== phoneWrap) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    s.lx = x + s.el.offsetWidth  / 2;
    s.ly = y + s.el.offsetHeight / 2;
    s.sw = s.el.offsetWidth;
    s.sh = s.el.offsetHeight;      // so a card can shrink to exactly tile size
  }
  // named apart from G.cols / G.rows, which belong to the resting card grid
  // out in the hero: reusing those names parked half the cards at the origin
  G.tileCols = 3;
  G.pitch = slots.length > G.tileCols ? slots[G.tileCols].ly - slots[0].ly : 0;
  // never taller than the card count can fill, so the run always ends on a
  // complete grid rather than a part-empty one
  // How many rows the band holds, fractionally: a whole number would leave a
  // strip of empty screen under the last row once everything has landed.
  // Letting it run to a fraction scrolls the final row flush to the bottom,
  // the way a real list sits.
  // `headroom` keeps the newest row clear of the tab bar: the grid starts
  // riding up before the bottom row reaches it, rather than filling to the edge
  const fits = G.pitch ? (wrap.clientHeight - slots[0].sh) / G.pitch + 1 : 1;
  G.winRows = Math.max(1, Math.min(fits - T.gridHeadroom, Math.ceil(slots.length / G.tileCols)));
}

/* -------------------------------------------------------------
   7. FRAME
   ------------------------------------------------------------- */
let target = 0, shown = 0, running = false;

function readProgress() {
  const rect = story.getBoundingClientRect();
  const span = story.offsetHeight - (G.H || window.innerHeight);
  return clamp01(-rect.top / span);
}

function frame() {
  shown += (target - shown) * 0.16;
  if (Math.abs(target - shown) < 0.00012) shown = target;
  render(shown);
  running = Math.abs(target - shown) > 0.00012 || G.live;
  if (running) requestAnimationFrame(frame);
}
/* Which way the reader is going. The run finishes itself when they stop with
   everything filed, but only if they were going forwards: someone scrolling
   back up to watch it again must not be dragged to the end. */
let lastP = 0, backwards = false;
function kick() {
  const p = readProgress();
  if (p < lastP - 0.0004)      { backwards = true; stopGlide(); }
  else if (p > lastP + 0.0004) { backwards = false; }
  lastP = target = p;
  if (!running) { running = true; requestAnimationFrame(frame); }
}

/* A reader who stops half way through the story gets a nudge: the run only
   makes sense finished, and a still frame gives no sign that there is more.
   It waits for the scrolling to actually stop, hides the moment it starts
   again, and comes back if they stop again. It stays out of the way at the
   very top, where the headline already says "scroll", and near the end,
   where the run finishes itself. */
const nudge = document.getElementById('nudge');
const NUDGE_WAIT = 750, NUDGE_FROM = 0.02, NUDGE_TO = 0.97;
let nudgeTimer = 0;
function armNudge() {
  if (!nudge) return;
  nudge.classList.remove('is-on');
  clearTimeout(nudgeTimer);
  nudgeTimer = setTimeout(() => {
    const p = readProgress();
    if (p > NUDGE_FROM && p < NUDGE_TO &&
        !document.documentElement.classList.contains('sheet-open'))
      nudge.classList.add('is-on');
  }, NUDGE_WAIT);
}
const dropNudge = () => { clearTimeout(nudgeTimer); if (nudge) nudge.classList.remove('is-on'); };

/** how far into the run we are: nothing moves until `hold`, which gives the
    grid time to rise clear of the headline first */
const warp = p => Math.max(0, p - T.hold) / (1 - T.hold);

/* Once the story has played out, ease the page to the end of its runway
   rather than animating the ending in place: the ending finishes the ordinary
   way, and the reader is left at the start of the next section instead of
   stranded mid-run. Any input from them hands control straight back. */
let glideTo = null, glideId = 0;
function glideToEnd() {
  if (glideTo !== null) return;
  const end = story.offsetTop + (story.offsetHeight - (G.H || innerHeight));
  if (scrollY >= end - 2) return;
  if (reduced) { scrollTo({top: end, behavior: 'instant'}); return; }
  glideTo = end;
  const from = scrollY, dist = end - from, t0 = performance.now();
  const dur = clamp(Math.abs(dist) * 1.5, 320, 900);
  const step = now => {
    if (glideTo === null) return;
    const k = Math.min(1, (now - t0) / dur);
    scrollTo({top: from + dist * (1 - Math.pow(1 - k, 3)), behavior: 'instant'});
    if (k < 1) glideId = requestAnimationFrame(step);
    else glideTo = null;
  };
  glideId = requestAnimationFrame(step);
}
const stopGlide = () => {
  if (glideTo === null) return;
  glideTo = null;
  cancelAnimationFrame(glideId);
};
for (const evName of ['wheel', 'touchstart', 'keydown', 'pointerdown'])
  addEventListener(evName, stopGlide, {passive: true});

/** where the head of the queue is: a steady walk up the curve, then an
    acceleration into the phone. The squared term keeps that hand-off
    smooth, and solving for it holds the timing on any viewport. */
function headAt(p) {
  const ps = T.phoneSet;
  const ex = Math.max(0, p - ps);
  return G.startS + G.flowBase * warp(p) + G.flowPull * ex * ex / (1 - ps);
}

function render(p) {
  /* --- headline --- */
  const heroOut = smooth(range(p, T.heroFadeIn, T.heroFadeOut));
  heroCopy.style.opacity   = String(1 - heroOut);
  heroCopy.style.transform = `translateX(-50%) translateY(${-46*heroOut}px) scale(${1-0.045*heroOut})`;
  heroCopy.classList.toggle('is-through', heroOut > 0.01);

  /* --- the phone --- */
  const pin    = easeOut(range(p, T.phoneIn, T.phoneSet));
  const settle = easeIO(range(p, T.settleIn, T.settleOut));
  const arrive = G.phoneFit * lerp(0.80, 1, pin);
  const psc    = lerp(arrive, G.settleScale, settle);
  const phoneY = lerp(48, 0, pin) + G.settleY * settle;
  phoneWrap.style.opacity   = String(pin);
  phoneWrap.style.transform = `translateY(${phoneY}px) scale(${psc})`;

  const phoneCX = G.W / 2;
  const phoneCY = G.H / 2 + phoneY;

  /* --- cards along the curve --- */
  const head     = headAt(p);
  const absorbAt = T.absorbFrom * G.len;
  const tail     = G.len - absorbAt;
  let filled = 0;          // fractional, so the grid glides rather than steps
  // the shift from the *previous* frame positions this frame's landings; it is
  // recomputed at the end of the loop, once we know how much has landed
  G.gridShift = G.gridShift || 0;
  // the grid lifts clear of the headline before anything leaves it
  const rise = lerp(G.riseY, 0, easeIO(range(p, T.riseIn, T.riseOut)));
  let absorbed = 0;
  let live = false;          // true while a pointer tilt is still easing

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const s = head - i * G.spacing;

    const a = clamp01((s - absorbAt) / tail);   // 0 on the curve, 1 filed away
    if (a >= 1) absorbed++;
    filled += a;

    // 0 = sitting in the grid, 1 = in the queue. The window closes exactly
    // when this card's slot reaches its cell, so it meets the tail rather
    // than sliding into a space.
    const m = easeIO(range(head, c.join - G.spacing * T.chaseLead, c.join));

    // only a filed card is hidden. An arc-based cull would blink out the
    // cards joining from the left of the grid, whose slots sit a long way
    // back along the line but are still very much on screen.
    if (a >= 1) {
      if (c.vis) { c.el.style.opacity = '0'; c.vis = 0; }
      continue;
    }

    const pt = at(s);
    // bank the card along the curve, but never past upright
    const n  = at(Math.min(s + G.spacing * 0.5, G.len));
    let ang  = Math.atan2(n.py - pt.py, n.px - pt.px) * 180 / Math.PI;
    if (ang >  90) ang -= 180;
    if (ang < -90) ang += 180;

    const depth = clamp(-pt.z / G.zFar, -1, 1);   // 1 = farthest, -1 = nearest
    let x  = pt.px, y = pt.py;
    let sc = pt.k;
    let rz = ang * 0.78 + c.tilt;
    let ry = 0;
    let op = lerp(1, 0.58, Math.max(0, depth));
    let zi = Math.round(500 - depth * 460);

    if (m < 1) {
      const g = gridPos(i, rise);
      x  = lerp(g.x, x, m);
      y  = lerp(g.y, y, m);
      sc = lerp(1, sc, m);
      rz = lerp(c.tilt * 0.4, rz, m);
      op = lerp(1, op, m);
      zi = Math.round(lerp(500, zi, m));
    }

    if (a > 0) {
      const slot = slots[i];
      const tx = phoneCX + (slot.lx - G.phoneW / 2) * psc;
      const ty = phoneCY + (slot.ly - G.gridShift - G.phoneH / 2) * psc;
      const e  = easeIO(a);
      x  = lerp(x, tx, e);
      y  = lerp(y, ty, e);
      // land at exactly the size it will be in the tile: the artwork is
      // contained, so a square album ends up shorter than a tall photocard
      const landH = Math.min(slot.sh, slot.sw / c.asset.r);
      sc = lerp(sc, (landH * psc) / c.h, e);
      rz = lerp(rz, 0, e) + c.spin * Math.sin(a * Math.PI) * 0.45;
      ry = 26 * Math.sin(a * Math.PI);
      op *= 1 - smooth(range(a, 0.70, 0.97));
      zi = 620;                                   // ride over the phone on the way in
    }

    // a card that has begun leaving the grid drops its tilt
    if (m > 0.001) { c.wantX = c.wantY = c.wantL = 0; }

    // ease the pointer tilt toward its target
    c.tiltX += (c.wantX - c.tiltX) * 0.16;
    c.tiltY += (c.wantY - c.tiltY) * 0.16;
    c.lift  += (c.wantL - c.lift)  * 0.16;
    if (Math.abs(c.wantX - c.tiltX) > 0.02 || Math.abs(c.wantY - c.tiltY) > 0.02 ||
        Math.abs(c.wantL - c.lift)  > 0.002) live = true;

    c.el.style.transform =
      `translate3d(${x - c.w/2}px, ${y - c.h/2}px, 0) perspective(700px) ` +
      `rotateX(${c.tiltX}deg) rotateY(${ry + c.tiltY}deg) ` +
      `rotate(${rz}deg) scale(${sc * (1 + LIFT * c.lift)})`;
    c.el.style.opacity = String(op);
    if (zi !== c.zi) { c.el.style.zIndex = String(zi); c.zi = zi; }
    c.vis = 1;
  }

  /* --- the grid: slots light up in order, and once the window is full the
         whole thing rides up so the newest always lands on the bottom row --- */
  for (let k = 0; k < slots.length; k++) {
    const on = k < absorbed;
    if (on !== slots[k].on) { slots[k].el.classList.toggle('is-filled', on); slots[k].on = on; }
  }
  const rowsIn = filled / G.tileCols;
  G.gridShift = Math.max(0, rowsIn - G.winRows) * G.pitch;
  appGrid.style.transform = `translate3d(0,${-G.gridShift}px,0)`;

  /* --- and right at the end, the screen goes back to the themed home: the
         collection slides off right, the themed one comes in from the left
         behind it. A function of p like everything else, so scrolling back
         up takes it straight the other way. --- */
  if (pageA) {
    const sw = easeIO(range(p, T.swipeIn, T.swipeOut));
    pageA.style.transform = `translate3d(${100 * sw}%,0,0)`;
    pageB.style.transform = `translate3d(${-30 * (1 - sw)}%,0,0)`;
  }

  if (phoneCount) {
    phoneCount.textContent = String(absorbed ? counts[absorbed - 1] : COUNT_START);
  }

  // the cards only take the pointer while the grid is still sitting there
  layer.classList.toggle('is-live', p <= T.hoverUntil);

  /* --- the endless queue, once the phone has settled --- */
  if (marquee) {
    const mq = smooth(range(p, T.settleIn, T.settleOut));
    marquee.style.opacity = String(mq);
    marquee.classList.toggle('is-live', mq > 0.02);
  }

  /* --- outro line ---
     Once it has started appearing it finishes by itself, so stopping the
     scroll halfway through does not leave it stranded at half opacity. */
  const oiRaw = smooth(range(p, T.outroIn, T.outroFull));
  const oi = oiRaw;

  // the last card has landed: carry the reader to the end of the run, which
  // both finishes the ending and leaves them at the top of the next section
  if (absorbed >= cards.length && !backwards) glideToEnd();
  outro.style.opacity   = String(oi);
  outro.style.transform = `translateX(-50%) translateY(${lerp(28,0,oi)}px)`;

  G.live = live;
}

/* -------------------------------------------------------------
   8. LIGHT-SECTION EXTRAS
   ------------------------------------------------------------- */


/* the centred carousel: dots track the slide nearest the middle, and it
   advances on its own until someone takes over */
const deck = document.getElementById('deck');
if (deck) {
  const track  = deck.querySelector('.deck-track');
  const slides = [...deck.querySelectorAll('.deck-slide')];
  const dots   = document.getElementById('deckDots');
  const play   = document.getElementById('deckPlay');
  const DWELL  = 5200;
  let   at = 0, timer = 0, playing = false;

  dots.style.setProperty('--deck-dur', DWELL + 'ms');

  // half the leftover width, so the first and last slides can both centre
  const edge = () => {
    const w = Math.max(16, (deck.clientWidth - slides[0].offsetWidth) / 2);
    track.style.setProperty('--edge', w + 'px');
  };
  edge();
  addEventListener('resize', edge);

  slides.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'deck-dot';
    d.type = 'button';
    d.setAttribute('role', 'tab');
    d.setAttribute('aria-label', `View ${i + 1} of ${slides.length}`);
    d.innerHTML = '<i></i>';
    d.addEventListener('click', () => { stop(); go(i); });
    dots.appendChild(d);
  });
  const buttons = [...dots.children];

  const goTo = i => deck.scrollTo({
    left: slides[i].offsetLeft - (deck.clientWidth - slides[i].offsetWidth) / 2,
    behavior: reduced ? 'auto' : 'smooth',
  });
  const go = i => { at = (i + slides.length) % slides.length; goTo(at); mark(); };

  const mark = () => {
    slides.forEach((s, i) => s.classList.toggle('is-on', i === at));
    buttons.forEach((b, i) => {
      b.classList.toggle('is-on', i === at);
      b.setAttribute('aria-selected', String(i === at));
    });
    // restart the timer bar from empty on the dot that just became current
    const fill = buttons[at].firstChild;
    fill.style.animation = 'none';
    void fill.offsetWidth;
    fill.style.animation = '';
  };

  // which slide is nearest the middle right now
  const nearest = () => {
    const mid = deck.scrollLeft + deck.clientWidth / 2;
    let best = 0, bestD = Infinity;
    slides.forEach((s, i) => {
      const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  };

  const start = () => {
    if (playing || reduced) return;
    playing = true;
    dots.classList.add('is-playing');
    play.dataset.state = 'playing';
    play.setAttribute('aria-label', 'Pause');
    timer = setInterval(() => go(at + 1), DWELL);
  };
  const stop = () => {
    playing = false;
    dots.classList.remove('is-playing');
    clearInterval(timer);
    play.dataset.state = 'paused';
    play.setAttribute('aria-label', 'Play');
  };
  play.addEventListener('click', () => (playing ? stop() : start()));

  // clicking a neighbour brings it to the middle
  slides.forEach((sl, i) => sl.addEventListener('click', () => {
    if (i === at) return;
    stop(); go(i);
  }));

  let settle;
  deck.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(() => { at = nearest(); mark(); }, 90);
  }, {passive: true});
  // a flick or a drag means they're driving, so stop advancing
  deck.addEventListener('pointerdown', stop);
  deck.addEventListener('wheel', stop, {passive: true});

  // only run while the carousel is actually on screen
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) start();
    else if (playing) { clearInterval(timer); playing = false; dots.classList.remove('is-playing'); }
  }, {threshold: 0.4}).observe(deck);

  mark();
  stop();
}

/* theme swatches: each one dissolves the pair of screenshots in the two
   phones. Every screen holds two stacked <img>s and we fade the incoming one
   in over the outgoing one — fading a single image out and back in dips
   through an empty screen, which reads as a flicker. All eight are preloaded
   on idle, and we wait on decode(), so the fade never starts on a blank. */
const swatches = [...document.querySelectorAll('#themes .swatch')];
const screens  = [...document.querySelectorAll('#themes .device-screen')].map(sc => ({
  imgs: [...sc.querySelectorAll('.device-shot')],
  at: 0,
}));

if (swatches.length && screens.length === 2) {
  const scene  = document.getElementById('themeScene');
  const nameEl = document.getElementById('themeName');
  const koEl   = document.getElementById('themeKo');
  const url    = (theme, n) => `assets/screens/${theme}${n}.jpg`;

  const warm = () => {
    for (const b of swatches) for (const n of [1, 2]) new Image().src = url(b.dataset.theme, n);
  };
  (window.requestIdleCallback || (f => setTimeout(f, 1200)))(warm);

  let token = 0;
  const show = async (theme, label) => {
    const mine = ++token;
    const ready = screens.map((sc, i) => {
      const next = sc.imgs[1 - sc.at];
      next.src = url(theme, i === 0 ? 2 : 1);      // first screen is the phone behind
      return next.decode().catch(() => {});
    });
    await Promise.all(ready);
    if (mine !== token) return;                     // a newer click won the race
    for (const [i, sc] of screens.entries()) {
      const next = sc.imgs[1 - sc.at], prev = sc.imgs[sc.at];
      // the front phone carries the description; the spare stays silent
      if (i === 1) { next.alt = `The PocaPal home screen, themed after ${label}`; prev.alt = ''; }
      next.classList.add('is-on');
      prev.classList.remove('is-on');
      sc.at = 1 - sc.at;
    }
  };

  for (const b of swatches) {
    b.addEventListener('click', () => {
      if (b.getAttribute('aria-pressed') === 'true') return;
      for (const o of swatches) o.setAttribute('aria-pressed', String(o === b));
      if (scene) scene.dataset.theme = b.dataset.theme;   // retints the halo
      nameEl.textContent = b.dataset.label;
      koEl.textContent   = b.dataset.ko;
      show(b.dataset.theme, b.dataset.label);
    });
  }
}

/* player switcher: same dissolve as the themes, one stage instead of two */
const pStage = document.querySelector('.player-stage');
if (pStage) {
  const shots = [...pStage.querySelectorAll('.player-shot')];
  const picks = [...document.querySelectorAll('#players .swatch')];
  const label = document.getElementById('playerName');
  let at = 0, turn = 0;

  (window.requestIdleCallback || (f => setTimeout(f, 1200)))(() => {
    for (const b of picks) new Image().src = `assets/players/${b.dataset.player}.webp`;
  });

  for (const b of picks) {
    b.addEventListener('click', async () => {
      if (b.getAttribute('aria-pressed') === 'true') return;
      for (const o of picks) o.setAttribute('aria-pressed', String(o === b));
      label.textContent = b.dataset.label;

      const mine = ++turn;
      const next = shots[1 - at], prev = shots[at];
      next.src = `assets/players/${b.dataset.player}.webp`;
      await next.decode().catch(() => {});
      if (mine !== turn) return;
      next.alt = `The PocaPal ${b.dataset.label.toLowerCase()} player`;
      prev.alt = '';
      next.classList.add('is-on');
      prev.classList.remove('is-on');
      at = 1 - at;
    });
  }
}

/* the feature rail: arrows nudge it one card at a time and grey out at the ends */
const rail = document.getElementById('rail');
if (rail) {
  const track = rail.querySelector('.rail-track');
  const btns  = [...document.querySelectorAll('.rail-btn')];
  const step  = () => {
    const card = rail.querySelector('.rail-card');
    const gap  = parseFloat(getComputedStyle(track).columnGap) || 20;
    return card ? card.offsetWidth + gap : rail.clientWidth * 0.8;
  };
  const sync = () => {
    const end = rail.scrollWidth - rail.clientWidth - 2;
    for (const b of btns) {
      b.disabled = b.dataset.dir === '-1' ? rail.scrollLeft <= 2 : rail.scrollLeft >= end;
    }
  };
  for (const b of btns) {
    b.addEventListener('click', () => rail.scrollBy({
      left: Number(b.dataset.dir) * step(),
      behavior: reduced ? 'auto' : 'smooth',
    }));
  }
  rail.addEventListener('scroll', sync, {passive: true});
  addEventListener('resize', sync);
  sync();
}

/* reveal on scroll */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }
}, {threshold: 0.18, rootMargin: '0px 0px -8% 0px'});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* nav flips to light once the dark story is behind us */
const navIO = new IntersectionObserver(([e]) => {
  nav.classList.toggle('is-light', !e.isIntersecting);
}, {threshold: 0, rootMargin: '-48px 0px 0px 0px'});
navIO.observe(story);

/* the FAQ: plain buttons rather than <details>, so the answer's height can
   animate from 0fr to 1fr instead of snapping open */
for (const q of document.querySelectorAll('.faq-q')) {
  q.addEventListener('click', () => {
    const item = q.parentElement;
    const open = item.classList.toggle('is-open');
    q.setAttribute('aria-expanded', String(open));
  });
}

/* -------------------------------------------------------------
   9. WIRE UP
   ------------------------------------------------------------- */
if (!reduced) {
  const resync = () => { measure(); target = readProgress(); shown = target; render(shown); };
  resync();
  addEventListener('scroll', kick, {passive: true});
  addEventListener('scroll', armNudge, {passive: true});
  addEventListener('resize', resync);
  addEventListener('load',   resync);
} else {
  // static fallback: a calm grid, no choreography
  layer.querySelectorAll('.pcard').forEach((el, i) => { if (i > 11) el.remove(); });
  document.querySelectorAll('.app-slot').forEach((el, i) => {
    el.classList.add('is-filled');
    el.querySelector('img').src = SRC(ASSETS[i % ASSETS.length].f);
  });
  nav.classList.remove('is-light');
}

})();
