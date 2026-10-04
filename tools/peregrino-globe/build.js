#!/usr/bin/env node
/* =============================================================
   Builds peregrino/assets/globe/ from the app's own country data and
   its globe texture recipe (gen.js).

     node tools/peregrino-globe/build.js <path to the peregrinoApp repo>

   Needs Node 18+, Playwright with its Chromium (npm i -g playwright &&
   npx playwright install chromium) and ImageMagick.

   Writes:
     base-4096.webp, base-2048.webp   the world's colour texture
     ids-4096.png, ids-2048.png       one country index per texel
     height.png                       the 720 × 360 height map
     europe-base.webp, europe-ids.png a sharper window over Europe for
                                      the close-ups (EUROPE below, which
                                      globe.js must match)
     countries.json                   simplified outlines, ids and the
                                      natural land colours
   ============================================================= */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), {execFileSync, execSync} = require('child_process');

const EUROPE = {lon0: -30, lon1: 50, lat0: 31, lat1: 71};

const app = process.argv[2];
if (!app) { console.error('usage: node build.js <path to peregrinoApp>'); process.exit(1); }
const OUT = path.resolve(__dirname, '../../peregrino/assets/globe');

let chromium;
try { ({chromium} = require('playwright')); }
catch { ({chromium} = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const IM = (() => { try { execFileSync('magick', ['-version']); return ['magick']; } catch { return ['convert']; } })();
const im = (...args) => execFileSync(IM[0], args, {stdio: 'inherit'});

/* ---------- the world, as the app knows it ---------- */
function readWorld() {
  const base = path.join(app, 'peregrino');
  const a2a3 = {};
  for (const m of fs.readFileSync(path.join(base, 'Models/ISOCodeMapping.swift'), 'utf8').matchAll(/"([A-Z]{2})":\s*"([A-Z]{3})"/g)) a2a3[m[1]] = m[2];
  const meta = JSON.parse(fs.readFileSync(path.join(base, 'CountryKit/CountryData/CountryMetadata.json'), 'utf8'));
  const CONT = {'Europe': 'EU', 'Asia': 'AS', 'Africa': 'AF', 'North America': 'NA', 'South America': 'SA', 'Oceania': 'OC', 'Antarctica': 'AN', 'Seven seas (open ocean)': 'OC'};
  const cont = a2 => CONT[(meta[a2] || {}).continent || ''] || '??';
  const polys = g => g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map(p => p[0]);
  const r4 = v => Math.round(v * 1e4) / 1e4;
  const rings = g => polys(g).map(r => r.map(([x, y]) => [r4(x), r4(y)]));
  const out = [];
  const dir = path.join(base, 'CountryKit/CountryData/Countries');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.geojson')).sort()) {
    const a2 = f.slice(0, -8), d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    out.push({a2, a3: a2a3[a2] || a2, name: d.properties.name || a2, cont: cont(a2), rings: rings(d.geometry)});
  }
  // the territories the app draws from its low-res world but has no country file for
  const lo = JSON.parse(fs.readFileSync(path.join(base, 'countries.geojson'), 'utf8'));
  const extra = {ATA: 'AQ', ATF: 'TF', BMU: 'BM', ESH: 'EH', FLK: 'FK', GRL: 'GL', NCL: 'NC', PRI: 'PR', PSE: 'PS', TWN: 'TW', 'CS-KM': 'XK'};
  let k = 0;
  for (const ft of lo.features) {
    const i = ft.id;
    if (!(i in extra) && i !== '-99') continue;
    const a2 = extra[i] || `X${k}`; k++;
    const a3 = i === 'CS-KM' ? 'KOS' : i !== '-99' ? i : `X${String(k).padStart(2, '0')}`;
    out.push({a2, a3, name: ft.properties.name, cont: cont(a2), rings: rings(ft.geometry)});
  }
  return out;
}

/* ---------- outlines for the page: Douglas–Peucker, small islands dropped ---------- */
function simplify(world, lut) {
  const dp = (pts, eps) => {
    if (pts.length < 4) return pts;
    const keep = new Array(pts.length).fill(false);
    keep[0] = keep[pts.length - 1] = true;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
      let best = -1, bi = -1;
      for (let i = a + 1; i < b; i++) {
        const [px, py] = pts[i];
        const d = L > 0 ? Math.abs(dx * (ay - py) - dy * (ax - px)) / L : Math.hypot(px - ax, py - ay);
        if (d > best) { best = d; bi = i; }
      }
      if (best > eps) { keep[bi] = true; stack.push([a, bi], [bi, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  };
  const area = r => { let s = 0; for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(s) / 2; };
  const r2 = v => Math.round(v * 100) / 100;
  return world.map((c, k) => {
    const big = Math.max(...c.rings.map(area));
    const r = [];
    for (const ring of c.rings) {
      const a = area(ring);
      if (a < 0.006 && a < big) continue;
      const s = dp(ring, 0.03);
      if (s.length < 4) continue;
      r.push(s.flatMap(([x, y]) => [r2(x), r2(y)]));
    }
    return {i: lut[k].i, a2: c.a2, a3: c.a3, n: c.name, c: c.cont, land: lut[k].land, r};
  });
}

(async () => {
  const world = readWorld();
  console.log(`${world.length} countries and territories`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'peregrino-globe-'));
  const save = (name, url) => { const f = path.join(tmp, name); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); return f; };

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<!doctype html><meta charset="utf-8">');
  await page.addScriptTag({path: path.join(__dirname, 'gen.js')});
  let t = Date.now();
  const g = await page.evaluate(([w]) => window.generate(w, 4096), [world]);
  console.log(`world texture in ${(Date.now() - t) / 1000}s`);
  t = Date.now();
  const eu = await page.evaluate(([w, r]) => window.generate(w, 4096, r), [world, EUROPE]);
  console.log(`europe texture ${eu.size.join(' × ')} in ${(Date.now() - t) / 1000}s`);
  await browser.close();

  fs.mkdirSync(OUT, {recursive: true});
  const gray = ['-channel', 'R', '-separate', '+channel', '-depth', '8', '-type', 'Grayscale', '-define', 'png:color-type=0'];
  const base = save('base.png', g.base), ids = save('ids.png', g.ids), height = save('height.png', g.height);
  im(base, '-quality', '82', '-define', 'webp:method=6', path.join(OUT, 'base-4096.webp'));
  im(base, '-filter', 'Lanczos', '-resize', '2048x1024', '-quality', '84', '-define', 'webp:method=6', path.join(OUT, 'base-2048.webp'));
  im(ids, ...gray, path.join(OUT, 'ids-4096.png'));
  im(ids, '-sample', '2048x1024', ...gray, path.join(OUT, 'ids-2048.png'));
  im(height, ...gray, path.join(OUT, 'height.png'));
  const eBase = save('europe-base.png', eu.base), eIds = save('europe-ids.png', eu.ids);
  im(eBase, '-quality', '80', '-define', 'webp:method=6', path.join(OUT, 'europe-base.webp'));
  im(eIds, ...gray, path.join(OUT, 'europe-ids.png'));

  fs.writeFileSync(path.join(OUT, 'countries.json'), JSON.stringify(simplify(world, g.lut)));
  fs.rmSync(tmp, {recursive: true, force: true});
  for (const f of fs.readdirSync(OUT)) console.log(f.padEnd(20), fs.statSync(path.join(OUT, f)).size);
})().catch(e => { console.error(e); process.exit(1); });
