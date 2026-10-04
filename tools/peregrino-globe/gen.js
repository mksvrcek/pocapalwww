/* =============================================================
   The globe's textures, as the app draws them.

   A port of peregrino/Home/Globe/GlobeTextureGenerator.swift and
   GlobeTheme.earth, run in a browser page by build.js. Distances and
   sizes are kept in the app's own texels (its texture is 2048 wide)
   and scaled to the output, so a bigger texture is the same picture,
   only sharper.

   generate(world, 4096)            the whole world, 4096 × 2048
   generate(world, 4096, region)    a window of it ({lon0, lon1, lat0,
                                    lat1}) at 4096 across, drawn with
                                    the same noise and dots as the
                                    world, so it blends into it seamlessly

   Two departures from the app, both for the poles, which the site
   shows and the app's camera rarely does: the deep-ocean mottling
   and the ocean dots fade out above 66°, and each row is blurred
   along its length by how much it is squeezed there. Otherwise both
   turn into a starburst on the sphere.
   ============================================================= */
window.generate = function (world, W, region) {
  const HW = 720, HH = 360;                 // the app's height-map resolution
  const G = !region;                        // the whole world, which wraps in longitude
  const degPx = (G ? 360 : region.lon1 - region.lon0) / W;
  // a window is drawn with a margin, so the coast-distance effects near its
  // edges still see the land just beyond them, then cropped
  const PADPX = G ? 0 : 128, PAD = PADPX * degPx;
  const A = G ? {lon0: -180, lon1: 180, lat0: -90, lat1: 90}
              : {lon0: region.lon0 - PAD, lon1: region.lon1 + PAD, lat0: region.lat0 - PAD, lat1: region.lat1 + PAD};
  const TW = Math.round((A.lon1 - A.lon0) / degPx), TH = Math.round((A.lat1 - A.lat0) / degPx);
  const OW = TW - 2 * PADPX, OH = TH - 2 * PADPX;
  const K = 360 / 2048 / degPx;             // texels per app texel
  const projT = (lon, lat) => [(lon - A.lon0) / degPx, (A.lat1 - lat) / degPx];
  const projH = (lon, lat) => [(lon + 180) / 360 * HW, (90 - lat) / 180 * HH];
  // where texel (0, 0) sits in the app's 2048 × 1024 texture, for patterns tied to it
  const GX0 = (A.lon0 + 180) / 360 * 2048, GY0 = (90 - A.lat1) / 180 * 1024;
  const sstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

  // ---------- noise (value noise + fBm, as in the app) ----------
  function hash(x, y) {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h & 0x7fffffff) / 0x7fffffff;
  }
  function smooth(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const n00 = hash(ix, iy), n10 = hash(ix + 1, iy), n01 = hash(ix, iy + 1), n11 = hash(ix + 1, iy + 1);
    const a = n00 + sx * (n10 - n00), b = n01 + sx * (n11 - n01);
    return a + sy * (b - a);
  }
  function fbm(x, y, oct = 4, pers = .5) {
    let t = 0, f = 1, a = 1, m = 0;
    for (let i = 0; i < oct; i++) { t += smooth(x * f, y * f) * a; m += a; f *= 2; a *= pers; }
    return t / m;
  }

  // ---------- polygons (rings are outlines and holes: fill them even-odd) ----------
  function tracePolys(ctx, c, proj) {
    ctx.beginPath();
    for (const r of c.rings) {
      for (let i = 0; i < r.length; i++) {
        const [x, y] = proj(r[i][0], r[i][1]);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    }
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // ---------- height data (720 × 360, always the whole world) ----------
  const hm = canvas(HW, HH), hctx = hm.getContext('2d');
  hctx.fillStyle = '#000'; hctx.fillRect(0, 0, HW, HH);
  hctx.fillStyle = '#fff';
  for (const c of world) { tracePolys(hctx, c, projH); hctx.fill('evenodd'); }
  const hpx = hctx.getImageData(0, 0, HW, HH).data;
  const isLandH = new Uint8Array(HW * HH);
  for (let i = 0; i < HW * HH; i++) isLandH[i] = hpx[i * 4] > 128 ? 1 : 0;
  // distance from coast (inside land), 2-pass chamfer like the app
  const dist = new Int32Array(HW * HH).fill(9999);
  for (let i = 0; i < HW * HH; i++) if (!isLandH[i]) dist[i] = 0;
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) {
    const i = y * HW + x;
    if (y > 0) dist[i] = Math.min(dist[i], dist[i - HW] + 1);
    if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1);
  }
  for (let y = HH - 1; y >= 0; y--) for (let x = HW - 1; x >= 0; x--) {
    const i = y * HW + x;
    if (y < HH - 1) dist[i] = Math.min(dist[i], dist[i + HW] + 1);
    if (x < HW - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1);
  }
  const RANGES = [
    [25,40,68,105,1],[33,38,66,78,.9],[38,44,68,88,.7],[37,40,70,76,.85],[27,37,44,56,.6],[35,37,48,57,.55],
    [28,36,50,62,.35],[40,44,38,50,.65],[37,41,28,44,.45],[33,42,136,142,.5],[10,22,73,82,.25],[8,21,73,76,.35],
    [48,68,54,62,.55],[47,53,82,92,.7],[48,56,88,100,.55],[58,72,88,115,.3],[60,68,125,140,.5],[62,66,138,150,.45],
    [54,58,118,135,.4],[52,60,155,162,.6],[62,68,148,162,.4],[50,58,100,115,.45],
    [43,48,4,18,.7],[58,72,4,22,.5],[44,50,17,27,.45],[42,43.5,-2,3,.5],[40,46,14,22,.4],[38,44,10,16,.35],
    [56,59,-7,-3,.3],[36,42,-6,0,.3],
    [30,37,-10,12,.5],[-6,15,28,42,.65],[-34,-28,27,32,.4],[18,26,5,20,.35],[-2,2,28,31,.5],
    [-56,12,-82,-58,.9],[28,62,-130,-100,.8],[32,48,-84,-72,.4],[58,65,-155,-138,.7],[66,70,-160,-140,.5],
    [18,30,-108,-96,.5],[13,18,-92,-86,.4],[-25,-10,-50,-38,.3],[2,8,-66,-58,.35],[48,60,-135,-118,.65],
    [-47,-42,168,174,.5],[-38,-16,145,153,.3],[-8,-4,140,150,.5],
  ];
  function mtn(lat, lon) {
    let m = 0;
    for (const [a, b, c, d, s] of RANGES) {
      if (lat < a || lat > b || lon < c || lon > d) continue;
      const dl = Math.abs(lat - (a + b) / 2) / ((b - a) / 2), dn = Math.abs(lon - (c + d) / 2) / ((d - c) / 2);
      const e = 1 - Math.max(dl, dn);
      m = Math.max(m, Math.min(e * 2, 1) * s);
    }
    return m;
  }
  const height = new Float32Array(HW * HH);
  for (let y = 0; y < HH; y++) {
    const v = y / HH, lat = 90 - v * 180;
    for (let x = 0; x < HW; x++) {
      const i = y * HW + x;
      if (!isLandH[i]) continue;
      const u = x / HW, lon = u * 360 - 180;
      const large = fbm(u * 14, v * 14, 3, .5), medium = fbm(u * 28 + 100, v * 28 + 100, 2, .45), fine = fbm(u * 55 + 200, v * 55 + 200, 2, .35);
      let h = .28 + large * .08 + medium * .04 + fine * .02;
      const b1 = fbm(u * 45 + 400, v * 45 + 400, 2, .4), b2 = fbm(u * 90 + 600, v * 90 + 600, 2, .3);
      h += (b1 - .5) * .06 + (b2 - .5) * .03;
      const m = mtn(lat, lon);
      if (m > 0) {
        const rn = fbm(u * 20 + 300, v * 20 + 300, 3, .55), rh = rn * m;
        h += rh * .65;
        if (rh > .3) h += (rh - .3) * .4;
      }
      h = Math.round(h * 10) / 10;
      const cd = dist[i], ramp = Math.min(cd / 5, 1), sr = ramp * ramp * (3 - 2 * ramp);
      h *= sr;
      if (lat > 10 && lat < 72 && lon > -170 && lon < -50) {
        h *= .75;
        if (lon > -140 && lon < -105) h *= 1 - Math.max(0, 1 - (lon + 140) / 35) * .45;
        const er = Math.min(cd / 8, 1), es = er * er * (3 - 2 * er);
        h *= Math.max(es, sr);
      }
      if (lat > 35 && lat < 72 && lon > -12 && lon < 40) h *= (lat > 55 && lon > 4 && lon < 32) ? .55 : .70;
      if (lat > 33 && lat < 40 && lon > 130 && lon < 142) h *= .5;
      height[i] = Math.max(0, h);
    }
  }
  // the height map as an image (h / 1.2 → 0…255)
  const hout = canvas(HW, HH), hoctx = hout.getContext('2d'), hid = hoctx.createImageData(HW, HH);
  let hmax = 0;
  for (let i = 0; i < HW * HH; i++) {
    hmax = Math.max(hmax, height[i]);
    const g = Math.round(Math.min(height[i] / 1.2, 1) * 255);
    hid.data[i * 4] = hid.data[i * 4 + 1] = hid.data[i * 4 + 2] = g; hid.data[i * 4 + 3] = 255;
  }
  hoctx.putImageData(hid, 0, 0);

  // ---------- ocean base ----------
  const base = canvas(TW, TH), b = base.getContext('2d');
  const grad = b.createLinearGradient(0, projT(0, 90)[1], 0, projT(0, -90)[1]);
  grad.addColorStop(0, 'rgb(89,166,224)');   // oceanTop .35 .65 .88
  grad.addColorStop(1, 'rgb(64,128,199)');   // oceanBottom .25 .50 .78
  b.fillStyle = grad; b.fillRect(0, 0, TW, TH);

  // coastal shelf + deep-ocean variation, from the height map's coast distance (wrapping)
  const cdist = new Float32Array(HW * HH).fill(999);
  for (let i = 0; i < HW * HH; i++) if (height[i] > 0) cdist[i] = 0;
  for (let it = 0; it < 4; it++) {
    for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) {
      const i = y * HW + x;
      if (y > 0) cdist[i] = Math.min(cdist[i], cdist[i - HW] + 1);
      cdist[i] = Math.min(cdist[i], cdist[y * HW + (x - 1 + HW) % HW] + 1);
    }
    for (let y = HH - 1; y >= 0; y--) for (let x = HW - 1; x >= 0; x--) {
      const i = y * HW + x;
      if (y < HH - 1) cdist[i] = Math.min(cdist[i], cdist[i + HW] + 1);
      cdist[i] = Math.min(cdist[i], cdist[y * HW + (x + 1) % HW] + 1);
    }
  }
  // the app samples this nearest-neighbour; sample it bilinearly so the glow is smooth at this resolution
  function sampleH(arr, fx, fy) {
    fx = ((fx % HW) + HW) % HW; fy = Math.min(Math.max(fy, 0), HH - 1.001);
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = (x0 + 1) % HW, y1 = Math.min(y0 + 1, HH - 1);
    const tx = fx - x0, ty = fy - y0;
    const a = arr[y0 * HW + x0] * (1 - tx) + arr[y0 * HW + x1] * tx;
    const c = arr[y1 * HW + x0] * (1 - tx) + arr[y1 * HW + x1] * tx;
    return a * (1 - ty) + c * ty;
  }
  // land mask at full resolution (smooth coastline for foam and to keep the glow off land)
  const lm = canvas(TW, TH), lctx = lm.getContext('2d');
  lctx.fillStyle = '#000'; lctx.fillRect(0, 0, TW, TH); lctx.fillStyle = '#fff';
  for (const c of world) { tracePolys(lctx, c, projT); lctx.fill('evenodd'); }
  const lpx = lctx.getImageData(0, 0, TW, TH).data;
  const land = new Uint8Array(TW * TH);
  for (let i = 0; i < TW * TH; i++) land[i] = lpx[i * 4] > 127 ? 1 : 0;

  const od = b.getImageData(0, 0, TW, TH), o = od.data;
  const over = (i, r, g, bl, a) => {       // source-over a straight-alpha colour (0…1)
    o[i] = o[i] * (1 - a) + r * 255 * a; o[i + 1] = o[i + 1] * (1 - a) + g * 255 * a; o[i + 2] = o[i + 2] * (1 - a) + bl * 255 * a;
  };
  for (let py = 0; py < TH; py++) {
    const lat = A.lat1 - py * degPx, v = (90 - lat) / 180;
    const polarFade = 1 - sstep(66, 80, Math.abs(lat));
    for (let px = 0; px < TW; px++) {
      const p = py * TW + px;
      if (land[p]) continue;
      const u = (A.lon0 + px * degPx + 180) / 360;
      const d = sampleH(cdist, u * HW - .5, v * HH - .5);
      const i = p * 4;
      if (d <= 12) {
        const t = d / 12, fade = (1 - t) * (1 - t), a = fade * 130 / 255;
        over(i, .25, .667, 1, a);
      } else if (polarFade > 0) {
        const ang = u * 2 * Math.PI, nx = Math.cos(ang) * 2, nz = Math.sin(ang) * 2, ny = v * 4;
        const n = (fbm(nx + 10, ny + 10, 2, .45) + fbm(nz + 20, ny + 20, 2, .45)) * .5;
        const s = (n - .5) * .28 * polarFade;
        if (s < -.01) over(i, 0, .125, .333, Math.min(-s * 500, 255) / 255);
        else if (s > .01) over(i, .167, .333, .667, Math.min(s * 400, 255) / 255);
      }
    }
  }
  b.putImageData(od, 0, 0);
  // ocean dots: 3000 soft dots on the world, placed on a 4096-wide grid whatever the output
  let seed = 42n;
  const next = () => { seed = (seed * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn; return seed; };
  b.fillStyle = 'rgba(77,148,209,.15)';     // .30 .58 .82 @ .15
  for (let k = 0; k < 3000; k++) {
    const x = Number(next() % 4096n), y = Number(next() % 2048n), r = (Number(next() % 4n) + 1) * 2;
    const lon = x * 360 / 4096 - 180, lat = 90 - y * 180 / 2048;
    if (Math.abs(lat) > 72) continue;
    const [tx, ty] = projT(lon, lat), tr = r * 360 / 4096 / degPx;
    if (tx < -tr || ty < -tr || tx > TW + tr || ty > TH + tr) continue;
    b.beginPath(); b.ellipse(tx, ty, tr, tr, 0, 0, Math.PI * 2); b.fill();
  }

  // ---------- country fills ----------
  const ARID = new Set(['SAU','EGY','LBY','DZA','IRQ','IRN','SYR','JOR','YEM','OMN','ARE','KWT','QAT','TKM','UZB','KAZ','MNG','NAM','BWA','TCD','NER','MLI','MRT','SDN','SOM','ETH','ERI','DJI','SSD']);
  const TROP = new Set(['BRA','COL','VEN','PER','ECU','GUY','SUR','BOL','COD','COG','GAB','CMR','GNQ','CAF','IDN','MYS','PNG','MMR','THA','LAO','KHM','VNM','PHL','CRI','PAN','CUB','NGA','GHA','CIV','GIN','SLE','LBR']);
  const SNOW = new Set(['ATA','GRL','ISL']);
  function landColor(id) {
    let hsum = 0; for (const ch of id) hsum += ch.codePointAt(0);
    const v = (hsum % 15) / 100 - .07;
    let c;
    if (SNOW.has(id)) c = [.93, .95, .97];
    else if (ARID.has(id)) c = [.82 + v * .3, .72 + v * .2, .42 + v * .15];
    else if (id === 'AUS') c = [.78 + v, .62 + v, .35];
    else if (TROP.has(id)) c = [.20 + v * .2, .62 + v, .18 + v * .15];
    else c = [.32 + v * .3, .68 + v, .25 + v * .2];
    return c.map(x => Math.round(Math.min(Math.max(x, 0), 1) * 255));
  }
  const lut = [];
  world.forEach((c, k) => {
    const col = landColor(c.a3);
    lut.push({i: k + 1, a3: c.a3, a2: c.a2, name: c.name, cont: c.cont, land: col});
    b.fillStyle = `rgb(${col})`;
    tracePolys(b, c, projT); b.fill('evenodd');
  });

  // ---------- effects: borders, coastal foam, ambient occlusion ----------
  b.strokeStyle = 'rgba(51,51,51,.2)'; b.lineWidth = .5 * K; b.lineJoin = 'round';
  for (const c of world) { tracePolys(b, c, projT); b.stroke(); }

  // foam: shoreline + wave bands, from a full-resolution coast distance
  const fd = new Float32Array(TW * TH).fill(999);
  const xl = x => G ? (x - 1 + TW) % TW : Math.max(x - 1, 0), xr = x => G ? (x + 1) % TW : Math.min(x + 1, TW - 1);
  for (let i = 0; i < TW * TH; i++) if (land[i]) fd[i] = 0;
  for (let it = 0; it < 2; it++) {
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
      const i = y * TW + x;
      if (y > 0) fd[i] = Math.min(fd[i], fd[i - TW] + 1);
      fd[i] = Math.min(fd[i], fd[y * TW + xl(x)] + 1);
    }
    for (let y = TH - 1; y >= 0; y--) for (let x = TW - 1; x >= 0; x--) {
      const i = y * TW + x;
      if (y < TH - 1) fd[i] = Math.min(fd[i], fd[i + TW] + 1);
      fd[i] = Math.min(fd[i], fd[y * TW + xr(x)] + 1);
    }
  }
  const ed = b.getImageData(0, 0, TW, TH), e = ed.data;
  const shoreMax = 2, waveMax = 10;
  for (let py = 1; py < TH - 1; py++) {
    for (let px = 0; px < TW; px++) {
      const idx = py * TW + px;
      if (land[idx]) continue;
      const dd = fd[idx] / K;                       // distance in the app's texels
      if (dd < .5 || dd > waveMax) continue;
      const d = Math.max(1, dd);
      const i = idx * 4;
      let a = 0;
      if (d <= shoreMax) a = (1 - (d - 1) / shoreMax) * .30;
      else {
        const gx = fd[py * TW + xl(px)] - fd[py * TW + xr(px)];
        const gy = fd[idx - TW] - fd[idx + TW];
        const gl = Math.hypot(gx, gy);
        const parX = gl > .01 ? -gy / gl : 1, parY = gl > .01 ? gx / gl : 0;
        const coast = (GX0 + px / K) * parX + (GY0 + py / K) * parY;
        const wn = fbm(coast * .12 + 555, d * 2.5 + 333, 2, .5);
        const th = .42 + (d - shoreMax) * .04;
        if (wn > th) {
          const fade = 1 - (d - shoreMax) / (waveMax - shoreMax);
          a = (wn - th) / (1 - th) * fade * fade * .30;
        }
      }
      if (a > 0) { e[i] += (255 - e[i]) * a; e[i + 1] += (255 - e[i + 1]) * a; e[i + 2] += (255 - e[i + 2]) * a; }
    }
  }
  // ambient occlusion at height-map resolution, drawn up with smoothing
  const ao = new Float32Array(HW * HH);
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) {
    const ch = height[y * HW + x];
    let occ = 0, n = 0;
    for (let dy = -3; dy <= 3; dy++) {
      const sy = Math.max(0, Math.min(HH - 1, y + dy));
      for (let dx = -3; dx <= 3; dx++) {
        if (!dx && !dy) continue;
        const sx = (x + dx + HW) % HW, diff = height[sy * HW + sx] - ch;
        if (diff > 0) occ += diff / Math.max(Math.hypot(dx, dy) * .5, 1);
        n++;
      }
    }
    occ /= n;
    const a = Math.min(occ * 4.5, 1);
    if (a > .02) {
      const boost = ch < .01 ? 2.6 : 1;
      ao[y * HW + x] = Math.min(a * boost * 65, 255) / 255;
    }
  }
  for (let py = 0; py < TH; py++) {
    const v = (90 - (A.lat1 - py * degPx)) / 180;
    for (let px = 0; px < TW; px++) {
      const u = (A.lon0 + px * degPx + 180) / 360;
      const a = sampleH(ao, u * HW - .5, v * HH - .5);
      if (a <= 0) continue;
      const i = (py * TW + px) * 4;
      e[i] *= 1 - a; e[i + 1] *= 1 - a; e[i + 2] = e[i + 2] * (1 - a) + 255 / 8 * a;
    }
  }
  b.putImageData(ed, 0, 0);

  // ---------- polar prefilter (the whole world only) ----------
  // Equirectangular rows shrink to a point at the poles: blur each row along
  // its length by how much it is squeezed, so detail there doesn't fan out
  // into a starburst on the sphere.
  if (G) {
    const pd = b.getImageData(0, 0, TW, TH), q = pd.data, row = new Float32Array(TW * 3);
    for (let y = 0; y < TH; y++) {
      const lat = 90 - (y + .5) / TH * 180, sq = 1 / Math.max(Math.cos(lat * Math.PI / 180), 1e-3);
      const r = Math.min(Math.floor((sq - 1) * .6 * K), TW / 2 - 1);
      if (r < 1) continue;
      for (let x = 0; x < TW; x++) { const i = (y * TW + x) * 4; row[x * 3] = q[i]; row[x * 3 + 1] = q[i + 1]; row[x * 3 + 2] = q[i + 2]; }
      let s0 = 0, s1 = 0, s2 = 0;
      for (let k = -r; k <= r; k++) { const j = ((k % TW) + TW) % TW; s0 += row[j * 3]; s1 += row[j * 3 + 1]; s2 += row[j * 3 + 2]; }
      const n = 2 * r + 1;
      for (let x = 0; x < TW; x++) {
        const i = (y * TW + x) * 4;
        q[i] = s0 / n; q[i + 1] = s1 / n; q[i + 2] = s2 / n;
        const add = (x + r + 1) % TW, sub = ((x - r) % TW + TW) % TW;
        s0 += row[add * 3] - row[sub * 3]; s1 += row[add * 3 + 1] - row[sub * 3 + 1]; s2 += row[add * 3 + 2] - row[sub * 3 + 2];
      }
    }
    b.putImageData(pd, 0, 0);
  }

  // ---------- country ids (no antialiasing: one id per texel) ----------
  const ids = new Uint8Array(TW * TH);
  const sc = canvas(TW, TH), sctx = sc.getContext('2d', {willReadFrequently: true});
  world.forEach((c, k) => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const r of c.rings) for (const [lon, lat] of r) {
      const [x, y] = projT(lon, lat);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1);
    x1 = Math.min(TW, Math.ceil(x1) + 1); y1 = Math.min(TH, Math.ceil(y1) + 1);
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    sctx.clearRect(x0, y0, w, h);
    sctx.fillStyle = '#fff'; tracePolys(sctx, c, projT); sctx.fill('evenodd');
    const px = sctx.getImageData(x0, y0, w, h).data;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      if (px[(yy * w + xx) * 4 + 3] > 127) ids[(y0 + yy) * TW + x0 + xx] = k + 1;
    }
    sctx.clearRect(x0, y0, w, h);
  });
  const idc = canvas(TW, TH), ictx = idc.getContext('2d'), iid = ictx.createImageData(TW, TH);
  for (let i = 0; i < TW * TH; i++) { iid.data[i * 4] = ids[i]; iid.data[i * 4 + 1] = 0; iid.data[i * 4 + 2] = 0; iid.data[i * 4 + 3] = 255; }
  ictx.putImageData(iid, 0, 0);

  // ---------- out, cropped to the window ----------
  const crop = c => {
    if (!PADPX) return c.toDataURL('image/png');
    const o = canvas(OW, OH);
    o.getContext('2d').drawImage(c, PADPX, PADPX, OW, OH, 0, 0, OW, OH);
    return o.toDataURL('image/png');
  };
  return {
    base: crop(base),
    ids: crop(idc),
    height: hout.toDataURL('image/png'),
    lut, hmax, size: [OW, OH],
  };
};
