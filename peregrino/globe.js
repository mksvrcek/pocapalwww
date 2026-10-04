/* =============================================================
   Peregrino — the globe

   A WebGL port of the app's SceneKit globe (peregrino/Home/Globe):
   the same displaced sphere (240 × 120 segments, height map scaled
   by 0.09), the same texture recipe (built offline from
   GlobeTextureGenerator into assets/globe/base-*.webp), the same
   three lights (ambient, a warm sun from the upper right, a cool
   fill from the lower left) and the blue atmosphere rim.

   Countries are painted live rather than baked: ids-*.png holds
   one country index per texel, and a 256 × 4 lookup texture says
   what each index wears (its natural land colour, a paint colour
   and amount, a hatch ink and amount). Painting keeps the texture's
   own shading by scaling the paint by base / natural land colour,
   so borders, ambient occlusion and relief show through, the way
   the app draws painted countries under its effects overlay.

   The mesh can also unroll into a flat Mercator map (`morph`),
   which is how the globe ends up printed in the passport.

   Exposed as window.PeregrinoGlobe.
   ============================================================= */
(() => {
'use strict';

const D2R = Math.PI / 180;
const DISPLACE = 0.09;          // GlobeView.createDisplacedSphere(displacementScale:)
const HEIGHT_SCALE = 1.2;       // height.png stores h / 1.2
const ROWS = 120, COLS = 240;   // segments: 120 (rows) × 240 (cols), as the app
// the sharper window over Europe for the close-ups (tools/peregrino-globe/build.js)
const EUROPE = {lon0: -30, lon1: 50, lat0: 31, lat1: 71};

/* ---------- shared assets (decoded once, used by every globe) ---------- */
let shared = null, loaded = null;
function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.decoding = 'async';
    i.onload = () => res(i); i.onerror = rej;
    i.src = src;
  });
}
let countriesP = null;
/** The country outlines and ids (assets/globe/countries.json), fetched once. */
function countries(root = 'assets/globe/') {
  return countriesP || (countriesP = fetch(`${root}countries.json`).then(r => r.json()));
}
function loadShared(root, hiRes) {
  if (shared && shared.hiRes === hiRes) return shared.ready;
  const size = hiRes ? 4096 : 2048;
  const ready = Promise.all([
    loadImage(`${root}base-${size}.webp`),
    loadImage(`${root}ids-${size}.png`),
    loadImage(`${root}height.png`),
    countries(root),
  ]).then(([base, ids, height, list]) => {
    // height map → floats
    const c = document.createElement('canvas');
    c.width = height.width; c.height = height.height;
    const x = c.getContext('2d', {willReadFrequently: true});
    x.drawImage(height, 0, 0);
    const px = x.getImageData(0, 0, c.width, c.height).data;
    const hw = c.width, hh = c.height, h = new Float32Array(hw * hh);
    for (let i = 0; i < hw * hh; i++) h[i] = px[i * 4] / 255 * HEIGHT_SCALE;
    const byA2 = {}, byA3 = {}, byIndex = [];
    for (const k of list) { byA2[k.a2] = k; byA3[k.a3] = k; byIndex[k.i] = k; }
    return {base, ids, height: {w: hw, h: hh, data: h}, countries: list, byA2, byA3, byIndex, mesh: buildMesh(h, hw, hh)};
  });
  shared = {hiRes, ready};
  ready.then(d => { loaded = d; }, () => {});
  return ready;
}

/* ---------- the displaced sphere, exactly as GlobeView builds it ---------- */
function buildMesh(height, hw, hh) {
  const rows = ROWS, cols = COLS, n = (rows + 1) * (cols + 1);
  const ll = new Float32Array(n * 2), hgt = new Float32Array(n), pos = new Float32Array(n * 3);
  // row averages for the polar blend
  const rowAvg = new Float32Array(rows + 1);
  for (let r = 0; r <= rows; r++) {
    const hy = Math.min(Math.floor(r / rows * hh), hh - 1);
    let s = 0;
    for (let c = 0; c <= cols; c++) s += height[hy * hw + Math.min(Math.floor(c / cols * hw), hw - 1)];
    rowAvg[r] = s / (cols + 1);
  }
  let k = 0;
  for (let r = 0; r <= rows; r++) {
    const v = r / rows, lat = (0.5 - v) * Math.PI;
    // the app blends to the row average over the last 3%; a little wider here keeps
    // the caps free of spikes when the camera passes over them
    const blend = v < 0.05 ? 1 - v / 0.05 : v > 0.95 ? (v - 0.95) / 0.05 : 0;
    const hy = Math.min(Math.floor(v * hh), hh - 1);
    for (let c = 0; c <= cols; c++, k++) {
      const u = c / cols, lon = (u - 0.5) * 2 * Math.PI;
      let h = height[hy * hw + Math.min(Math.floor(u * hw), hw - 1)];
      if (blend > 0) h = h * (1 - blend) + rowAvg[r] * blend;
      const d = h * DISPLACE, rr = 1 + d, cl = Math.cos(lat);
      ll[k * 2] = lon; ll[k * 2 + 1] = lat; hgt[k] = d;
      pos[k * 3] = cl * Math.cos(lon) * rr; pos[k * 3 + 1] = cl * Math.sin(lon) * rr; pos[k * 3 + 2] = Math.sin(lat) * rr;
    }
  }
  const idx = new Uint16Array(rows * cols * 6);
  let t = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const tl = r * (cols + 1) + c, tr = tl + 1, bl = tl + cols + 1, br = bl + 1;
    idx[t++] = tl; idx[t++] = bl; idx[t++] = tr; idx[t++] = tr; idx[t++] = bl; idx[t++] = br;
  }
  // smooth normals from the faces; the seam columns share theirs so no crease shows
  const nor = new Float32Array(n * 3);
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const j of [a, b, c]) { nor[j] += nx; nor[j + 1] += ny; nor[j + 2] += nz; }
  }
  for (let r = 0; r <= rows; r++) {
    const a = (r * (cols + 1)) * 3, b = (r * (cols + 1) + cols) * 3;
    for (let q = 0; q < 3; q++) { const s = nor[a + q] + nor[b + q]; nor[a + q] = nor[b + q] = s; }
  }
  for (let i = 0; i < n; i++) {
    const x = nor[i * 3], y = nor[i * 3 + 1], z = nor[i * 3 + 2], l = Math.hypot(x, y, z) || 1;
    let nx = x / l, ny = y / l, nz = z / l;
    // (tl, bl, tr) is south × east = outward; any that came out inward are flipped
    const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2];
    if (nx * px + ny * py + nz * pz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    nor[i * 3] = nx; nor[i * 3 + 1] = ny; nor[i * 3 + 2] = nz;
  }
  // Towards the poles the quads become long thin slivers and their face normals
  // fan out into a starburst: ease them to point straight out over the last 12°.
  for (let r = 0; r <= rows; r++) {
    const fromPole = Math.min(r, rows - r) * 180 / rows;
    if (fromPole >= 12) continue;
    const w = 1 - fromPole / 12;
    for (let c = 0; c <= cols; c++) {
      const i = (r * (cols + 1) + c) * 3, l = Math.hypot(pos[i], pos[i + 1], pos[i + 2]) || 1;
      let x = nor[i] * (1 - w) + pos[i] / l * w, y = nor[i + 1] * (1 - w) + pos[i + 1] / l * w, z = nor[i + 2] * (1 - w) + pos[i + 2] / l * w;
      const m = Math.hypot(x, y, z) || 1;
      nor[i] = x / m; nor[i + 1] = y / m; nor[i + 2] = z / m;
    }
  }
  return {ll, hgt, nor, idx, count: idx.length};
}

/* ---------- view math, shared with the 2D overlay ---------- */
/** Rows of the geo → view rotation for a view centred on (lon, lat). */
function viewBasis(lon, lat, roll = 0) {
  const l = lon * D2R, p = lat * D2R;
  const cl = Math.cos(l), sl = Math.sin(l), cp = Math.cos(p), sp = Math.sin(p);
  let e = [-sl, cl, 0], n = [-sp * cl, -sp * sl, cp];
  const c = [cp * cl, cp * sl, sp];
  if (roll) {
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const e2 = e.map((v, i) => v * cr + n[i] * sr), n2 = n.map((v, i) => -e[i] * sr + n[i] * cr);
    e = e2; n = n2;
  }
  return {e, n, c};
}
const geo = (lon, lat) => {
  const l = lon * D2R, p = lat * D2R, cp = Math.cos(p);
  return [cp * Math.cos(l), cp * Math.sin(l), Math.sin(p)];
};

/** Bilinear height (already scaled by DISPLACE) at lon/lat. */
function heightAt(H, lon, lat) {
  if (!H) return 0;
  const fx = ((lon + 180) / 360 * H.w - 0.5 + H.w) % H.w, fy = Math.min(Math.max((90 - lat) / 180 * H.h - 0.5, 0), H.h - 1.001);
  const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = (x0 + 1) % H.w, y1 = Math.min(y0 + 1, H.h - 1), tx = fx - x0, ty = fy - y0, d = H.data;
  const a = d[y0 * H.w + x0] * (1 - tx) + d[y0 * H.w + x1] * tx, b = d[y1 * H.w + x0] * (1 - tx) + d[y1 * H.w + x1] * tx;
  return (a * (1 - ty) + b * ty) * DISPLACE;
}

/* ---------- shaders ---------- */
const VS = `
attribute vec2 aLL; attribute float aH; attribute vec3 aN;
uniform vec3 uE, uNn, uC;          // view basis rows
uniform vec2 uCenter; uniform float uR; uniform vec2 uRes;
uniform float uMorph; uniform vec4 uFlat; uniform vec2 uMerc;
varying vec2 vUV; varying vec3 vN; varying float vLat;
void main() {
  float lon = aLL.x, lat = aLL.y;
  vec3 g = vec3(cos(lat) * cos(lon), cos(lat) * sin(lon), sin(lat));
  vec3 gp = g * (1.0 + aH);
  vec3 p = vec3(dot(uE, gp), dot(uNn, gp), dot(uC, gp));
  vec2 sp = uCenter + vec2(p.x, -p.y) * uR;
  float latc = clamp(lat, -1.3, 1.45);
  float my = log(tan(0.78539816 + latc * 0.5));
  vec2 fp = vec2(uFlat.x + (lon + 3.14159265) / 6.28318531 * uFlat.z,
                 uFlat.y + (uMerc.x - my) / (uMerc.x - uMerc.y) * uFlat.w);
  vec2 pos = mix(sp, fp, uMorph);
  float depth = mix(-p.z / 1.25, 0.0, uMorph);
  gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, depth, 1.0);
  vec3 n = vec3(dot(uE, aN), dot(uNn, aN), dot(uC, aN));
  vN = normalize(mix(n, vec3(0.0, 0.0, 1.0), uMorph));
  vUV = vec2((lon + 3.14159265) / 6.28318531, (1.57079633 - lat) / 3.14159265);
  vLat = lat;
}`;
const FS = `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
// highp where there is one: a mediump (16-bit) uv can't address a 4096-wide texture
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uBase, uIds, uLut, uDBase, uDIds;
uniform vec2 uIdSize, uDIdSize;
uniform vec4 uDRect;          // the sharper Europe window, in uv: u0, v0, du, dv
uniform float uDOn;
uniform vec3 uSun, uFill;
uniform float uAlpha, uPrint, uUnroll;
varying vec2 vUV; varying vec3 vN; varying float vLat;
float idAt(sampler2D t, vec2 uv) { return floor(texture2D(t, uv).r * 255.0 + 0.5); }
vec4 lut(float id, float row) { return texture2D(uLut, vec2((id + 0.5) / 256.0, row)); }
vec4 pm(vec4 c) { return vec4(c.rgb * c.a, c.a); }
vec4 landW(float id) { return id > 0.5 ? vec4(lut(id, 0.125).rgb, 1.0) : vec4(0.0); }
// The texture colour at uv, and the paint, hatch and natural land colour of the
// four country ids around it, blended so painted edges are smooth.
void look(sampler2D baseT, sampler2D idT, vec2 uv, vec2 size, float bias, out vec3 base, out vec4 P, out vec4 Hh, out vec4 L) {
  base = texture2D(baseT, uv, bias).rgb;
  vec2 st = uv * size - 0.5, fr = fract(st), b0 = (floor(st) + 0.5) / size;
  vec2 dx = vec2(1.0 / size.x, 0.0), dy = vec2(0.0, 1.0 / size.y);
  float i00 = idAt(idT, b0), i10 = idAt(idT, b0 + dx), i01 = idAt(idT, b0 + dy), i11 = idAt(idT, b0 + dx + dy);
  P = mix(mix(pm(lut(i00, 0.375)), pm(lut(i10, 0.375)), fr.x), mix(pm(lut(i01, 0.375)), pm(lut(i11, 0.375)), fr.x), fr.y);
  Hh = mix(mix(pm(lut(i00, 0.625)), pm(lut(i10, 0.625)), fr.x), mix(pm(lut(i01, 0.625)), pm(lut(i11, 0.625)), fr.x), fr.y);
  L = mix(mix(landW(i00), landW(i10), fr.x), mix(landW(i01), landW(i11), fr.x), fr.y);
}
void main() {
  // Near the poles a row of texels wraps a shrinking circle, so the GPU sees a huge
  // sideways derivative and picks a far-too-blurry mip level that smears land
  // across the cap. Bias it back by how squeezed the row is.
  float bias = log2(max(cos(vLat), 0.03));
  vec3 base; vec4 P, Hh, L;
  look(uBase, uIds, vUV, uIdSize, bias, base, P, Hh, L);
  // close in over Europe, the sharper window takes over, fading out towards its edges
  if (uDOn > 0.0) {
    vec2 d = (vUV - uDRect.xy) / uDRect.zw;
    float edge = min(min(d.x, 1.0 - d.x) * uDRect.z * 360.0, min(d.y, 1.0 - d.y) * uDRect.w * 180.0);
    float k = uDOn * smoothstep(0.0, 1.5, edge);
    vec3 b2; vec4 P2, H2, L2;
    look(uDBase, uDIds, clamp(d, 0.0, 1.0), uDIdSize, 0.0, b2, P2, H2, L2);
    base = mix(base, b2, k); P = mix(P, P2, k); Hh = mix(Hh, H2, k); L = mix(L, L2, k);
  }
  vec3 landCol = L.a > 0.001 ? L.rgb / L.a : vec3(0.32, 0.68, 0.25);
  // land is wherever the texture itself isn't sea: its coastline is smooth, the id map's isn't
  float landness = 1.0 - smoothstep(0.10, 0.28, base.b - base.r);
  vec3 col = base;
  if (P.a > 0.002) {
    vec3 ratio = base / max(landCol, vec3(0.04));
    col = mix(col, clamp((P.rgb / P.a) * ratio, 0.0, 1.0), P.a * landness);
  }
  if (Hh.a > 0.002) {
    // diagonal pencil hatch, 6 texels apart and 1.6 wide at the app's 2048-wide texture
    float s = (vUV.x * 2048.0 + vUV.y * 1024.0) / 6.0;
    float f = abs(fract(s) - 0.5);
    #ifdef GL_OES_standard_derivatives
      float w = max(fwidth(s), 0.0001);
      float line = smoothstep(0.3667 - w, 0.3667 + w, f);
    #else
      float line = step(0.3667, f);
    #endif
    vec3 ink = Hh.rgb / Hh.a;
    vec3 washed = mix(col, ink, 0.18);
    col = mix(col, mix(washed, ink, line * 0.85), Hh.a * landness);
  }
  // the app's three lights, in its proportions and lit in linear light as SceneKit
  // does: ambient 0.6 x 800, a warm sun 1200 from the upper right, a cool fill 400
  // from the lower left; exposed down a little (x0.8) to match the app on screen
  vec3 n = normalize(vN);
  float sun = max(dot(n, uSun), 0.0), fill = max(dot(n, uFill), 0.0);
  vec3 light = 0.8 * (vec3(0.48) + sun * 1.2 * vec3(1.0, 0.98, 0.92) + fill * 0.4 * vec3(0.7, 0.8, 1.0));
  vec3 lit = pow(min(pow(col, vec3(2.2)) * light, vec3(1.0)), vec3(1.0 / 2.2));
  // printed in the passport: visited countries in white, the rest faint, no sea
  float painted = P.a * landness;
  vec4 printed = vec4(vec3(1.0), mix(landness * 0.13, 1.0, painted));
  vec4 o = mix(vec4(lit, 1.0), printed, uPrint);
  // Antarctica would smear along the bottom of a flat map: fade it as the globe unrolls
  float polar = 1.0 - uUnroll * (1.0 - smoothstep(-1.1, -1.0, vLat));
  float a = o.a * uAlpha * polar;
  gl_FragColor = vec4(o.rgb * a, a);
}`;
const AVS = `
attribute vec2 aQ;
void main(){ gl_Position = vec4(aQ, 0.0, 1.0); }`;
const AFS = `
precision mediump float;
uniform vec2 uCenter; uniform float uR; uniform float uA; uniform vec2 uRes; uniform float uDpr;
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  float r = length(p - uCenter) / uR;
  if (r < 0.985) discard;
  float g = 0.30 * exp(-(r - 1.0) / 0.085) * (1.0 - smoothstep(1.12, 1.26, r));
  vec3 c = vec3(0.4, 0.65, 1.0) * g * uA;
  gl_FragColor = vec4(c, 0.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

/* ---------- a globe on a canvas ---------- */
/**
 * create(canvas, {root, hiRes, detail}) → globe   (detail: also fetch the sharper Europe window)
 *   globe.ready           promise, resolves once textures are up
 *   globe.paint(a3, [r,g,b] 0-255, amount 0-1)
 *   globe.hatch(a3, [r,g,b], amount)
 *   globe.ok              false without WebGL: then every method is a safe no-op
 *   globe.draw(view)      view: {cx, cy, R, lon, lat, roll, alpha, morph, flat:{x,y,w,h}, print, atmosphere}
 *   globe.project(lon, lat, lift)  → {x, y, z, vis}, for the overlay
 *   globe.data            shared country data (after ready)
 */
function create(canvas, opts = {}) {
  const root = opts.root || 'assets/globe/';
  const hiRes = opts.hiRes ?? (Math.max(screen.width, screen.height) * (window.devicePixelRatio || 1) > 1800);
  const g = {canvas, gl: null, ok: false, lost: false, data: null, view: null, dpr: 1, w: 0, h: 0, onrestore: null};
  const lut = new Uint8Array(256 * 4 * 4);
  let gl = null, prog = null, aprog = null, lutTex = null, dirtyLut = true, detailImgs = null;
  try { gl = canvas.getContext('webgl', {premultipliedAlpha: true, alpha: true, antialias: true, depth: true}); } catch (e) { gl = null; }
  g.gl = gl;

  /* programs, and everything uploaded: built again if the context is lost and comes back */
  function build() {
    const deriv = gl.getExtension('OES_standard_derivatives');
    prog = program(gl, VS, deriv ? FS : FS.replace(/#ifdef GL_OES[\s\S]*?#endif\n/, ''));
    aprog = program(gl, AVS, AFS);
  }
  const tex = (img, nearest) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    // the id maps are data: never colour-managed
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, nearest ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, nearest ? gl.LUMINANCE : gl.RGB, nearest ? gl.LUMINANCE : gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (nearest) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    } else {
      // power-of-two, so it can mipmap: keeps the far side of a small globe from shimmering
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    return t;
  };
  function upload(d) {
    g.baseTex = tex(d.base, false);
    g.idTex = tex(d.ids, true);
    lutTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, lutTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    dirtyLut = true;
    const buf = (arr, target = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, arr, gl.STATIC_DRAW); return b; };
    g.bLL = buf(d.mesh.ll); g.bH = buf(d.mesh.hgt); g.bN = buf(d.mesh.nor);
    g.bIdx = buf(d.mesh.idx, gl.ELEMENT_ARRAY_BUFFER);
    g.bQuad = buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
  }
  function uploadDetail() {
    if (detailImgs) g.detail = {base: tex(detailImgs[0], false), ids: tex(detailImgs[1], true), w: detailImgs[1].width, h: detailImgs[1].height};
  }

  // Without WebGL (or if its programs won't build) the globe draws nothing and the page
  // carries on without it: every method below stays safe to call.
  if (gl) {
    try { build(); g.ok = true; } catch (e) { console.warn('Peregrino globe:', e.message); }
  }
  if (g.ok) {
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); g.lost = true; });
    canvas.addEventListener('webglcontextrestored', () => {
      try {
        build();
        if (g.data) upload(g.data);
        uploadDetail();
        g.lost = false;
        if (g.onrestore) g.onrestore();
      } catch (e) { g.ok = false; }
    });
    g.ready = loadShared(root, hiRes).then(d => {
      g.data = d;
      for (const c of d.countries) {
        const o = c.i * 4;
        lut[o] = c.land[0]; lut[o + 1] = c.land[1]; lut[o + 2] = c.land[2]; lut[o + 3] = 255;
      }
      upload(d);
      return g;
    });
    // the sharper Europe window, fetched once the globe is up (only the close-ups need it)
    if (opts.detail) g.ready.then(() => Promise.all([loadImage(`${root}europe-base.webp`), loadImage(`${root}europe-ids.png`)]))
      .then(imgs => { detailImgs = imgs; uploadDetail(); })
      .catch(() => {});
  } else {
    g.ready = Promise.reject(new Error('no webgl'));
    g.ready.catch(() => {});
  }

  function setLut(a3, row, rgb, amount) {
    const c = g.data && g.data.byA3[a3];
    if (!c) return;
    const o = (row * 256 + c.i) * 4;
    const a = Math.round(Math.min(Math.max(amount, 0), 1) * 255);
    if (lut[o] === rgb[0] && lut[o + 1] === rgb[1] && lut[o + 2] === rgb[2] && lut[o + 3] === a) return;
    lut[o] = rgb[0]; lut[o + 1] = rgb[1]; lut[o + 2] = rgb[2]; lut[o + 3] = a;
    dirtyLut = true;
  }
  g.paint = (a3, rgb, amount) => setLut(a3, 1, rgb, amount);
  g.hatch = (a3, rgb, amount) => setLut(a3, 2, rgb, amount);
  g.clearPaint = () => {
    for (let i = 256 * 4; i < 256 * 4 * 3; i++) lut[i] = 0;
    dirtyLut = true;
  };

  g.resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    g.dpr = dpr; g.w = canvas.clientWidth; g.h = canvas.clientHeight;
  };

  const SUN = norm([3, 5, 8]), FILL = norm([-4, -2, 4]);
  g.draw = (v) => {
    g.view = v;
    if (!g.ok || g.lost) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!g.data || !(v.alpha > 0) || !(v.R > 1)) return;
    const W = g.w, H = g.h, dpr = g.dpr;
    const basis = viewBasis(v.lon, v.lat, v.roll || 0);
    g.basis = basis;
    if (dirtyLut) {
      gl.bindTexture(gl.TEXTURE_2D, lutTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut);
      dirtyLut = false;
    }
    // atmosphere, additive, behind
    const atm = (v.atmosphere ?? 1) * (1 - (v.morph || 0));
    if (atm > 0.01) {
      gl.useProgram(aprog);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindBuffer(gl.ARRAY_BUFFER, g.bQuad);
      const aq = gl.getAttribLocation(aprog, 'aQ');
      gl.enableVertexAttribArray(aq); gl.vertexAttribPointer(aq, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(aprog, 'uCenter'), v.cx, v.cy);
      gl.uniform1f(gl.getUniformLocation(aprog, 'uR'), v.R);
      gl.uniform1f(gl.getUniformLocation(aprog, 'uA'), atm * v.alpha);
      gl.uniform2f(gl.getUniformLocation(aprog, 'uRes'), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(aprog, 'uDpr'), dpr);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(aq);
    }
    // the globe
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const attr = (name, b, size) => {
      const l = gl.getAttribLocation(prog, name);
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
      return l;
    };
    const l1 = attr('aLL', g.bLL, 2), l2 = attr('aH', g.bH, 1), l3 = attr('aN', g.bN, 3);
    const u = n => gl.getUniformLocation(prog, n);
    gl.uniform3fv(u('uE'), basis.e); gl.uniform3fv(u('uNn'), basis.n); gl.uniform3fv(u('uC'), basis.c);
    gl.uniform2f(u('uCenter'), v.cx, v.cy);
    gl.uniform1f(u('uR'), v.R);
    gl.uniform2f(u('uRes'), W, H);
    gl.uniform1f(u('uMorph'), v.morph || 0);
    gl.uniform1f(u('uUnroll'), v.morph || 0);
    const f = v.flat || {x: 0, y: 0, w: 1, h: 1};
    gl.uniform4f(u('uFlat'), f.x, f.y, f.w, f.h);
    const top = (v.mercTop ?? 80) * D2R, bot = (v.mercBottom ?? -58) * D2R;
    gl.uniform2f(u('uMerc'), Math.log(Math.tan(Math.PI / 4 + top / 2)), Math.log(Math.tan(Math.PI / 4 + bot / 2)));
    gl.uniform3fv(u('uSun'), SUN); gl.uniform3fv(u('uFill'), FILL);
    gl.uniform1f(u('uAlpha'), v.alpha);
    gl.uniform1f(u('uPrint'), v.print || 0);
    gl.uniform2f(u('uIdSize'), g.data.ids.width, g.data.ids.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, g.baseTex); gl.uniform1i(u('uBase'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, g.idTex); gl.uniform1i(u('uIds'), 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, lutTex); gl.uniform1i(u('uLut'), 2);
    // the Europe window takes over once the world texture would be magnified
    const dOn = g.detail ? smoothstep(500, 1000, v.R * dpr) : 0;
    gl.uniform1f(u('uDOn'), dOn);
    if (g.detail) {
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, g.detail.base); gl.uniform1i(u('uDBase'), 3);
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, g.detail.ids); gl.uniform1i(u('uDIds'), 4);
      gl.uniform2f(u('uDIdSize'), g.detail.w, g.detail.h);
      gl.uniform4f(u('uDRect'), (EUROPE.lon0 + 180) / 360, (90 - EUROPE.lat1) / 180, (EUROPE.lon1 - EUROPE.lon0) / 360, (EUROPE.lat1 - EUROPE.lat0) / 180);
    } else {
      gl.uniform1i(u('uDBase'), 0); gl.uniform1i(u('uDIds'), 1);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.bIdx);
    gl.drawElements(gl.TRIANGLES, g.data.mesh.count, gl.UNSIGNED_SHORT, 0);
    gl.disableVertexAttribArray(l1); gl.disableVertexAttribArray(l2); gl.disableVertexAttribArray(l3);
  };

  /** Screen position of a point `lift` (radius units) above the terrain, for the current view. */
  g.project = (lon, lat, lift = 0, view = g.view) => {
    if (!view) return {x: 0, y: 0, z: -1, vis: false};
    const b = view.lon === g.view?.lon && view.lat === g.view?.lat && g.basis ? g.basis : viewBasis(view.lon, view.lat, view.roll || 0);
    const p = geo(lon, lat), s = 1 + heightAt(g.data && g.data.height, lon, lat) + lift;
    const x = (p[0] * b.e[0] + p[1] * b.e[1] + p[2] * b.e[2]) * s;
    const y = (p[0] * b.n[0] + p[1] * b.n[1] + p[2] * b.n[2]) * s;
    const z = (p[0] * b.c[0] + p[1] * b.c[1] + p[2] * b.c[2]) * s;
    return {x: view.cx + x * view.R, y: view.cy - y * view.R, z, vis: z > 0 || x * x + y * y > 1};
  };
  g.heightAt = (lon, lat) => heightAt(g.data && g.data.height, lon, lat);
  return g;
}
function norm(v) { const l = Math.hypot(...v); return v.map(x => x / l); }
function smoothstep(a, b, x) { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); }

window.PeregrinoGlobe = {create, countries, viewBasis, geo, heightAt: (lon, lat) => heightAt(loaded && loaded.height, lon, lat), D2R};
})();
