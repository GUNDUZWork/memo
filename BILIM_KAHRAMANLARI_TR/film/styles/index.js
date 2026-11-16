// 10 procedural styles — zero external API/GPU, pure Canvas2D + typed-array post passes (headless-Chrome safe).
// Every style = { label, bg(ctx,t,set,n), post(ctx,t) (full-frame, before header/captions), layer?(L) (info-scene pass), noReg? }.
// Puppet physics (bobbing, 2-3 % lean, breathing, walk-in, shake, face-turn) and the stand camera are style-independent
// (scene.js → pose()): every style draws the SAME puppets and the post pass restyles them.
// 3D styles (ps2, cgi, lego) are 2.5D emulations: affine-warp / jitter / fog (ps2), depth-of-field + god rays + bloom (cgi), brick quantiser + studs (lego).
import { PAL, plane, shape, ink, ellipse, rect, rrect, starPts, sparkle, rays, rng, clamp, lerp, hash, TAU } from '../engine/toon.js';

const W = 1920, H = 1080;
const SC = {};
function scratch(key, w, h) { let s = SC[key]; if (!s || s.width !== w || s.height !== h) { s = SC[key] = new OffscreenCanvas(w, h); } return s; }
const identity = ctx => { ctx.setTransform(1, 0, 0, 1, 0, 0); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// copy the frame to a w×h scratch, return {c, g, img}
function down(ctx, key, w, h) {
  const c = scratch(key, w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.clearRect(0, 0, w, h); g.drawImage(ctx.canvas, 0, 0, w, h);
  return { c, g, img: g.getImageData(0, 0, w, h) };
}
function up(ctx, c, smooth = false) { identity(ctx); ctx.imageSmoothingEnabled = smooth; ctx.drawImage(c, 0, 0, W, H); ctx.imageSmoothingEnabled = true; }
const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
// Sobel edge magnitude (0..1) of an ImageData's luminance (alpha-aware)
function edges(img) {
  const { width: w, height: h, data: d } = img, L = new Float32Array(w * h), E = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) * (d[i * 4 + 3] / 255) + (1 - d[i * 4 + 3] / 255) * 0.5;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1];
    const gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1];
    E[i] = Math.min(1, Math.hypot(gx, gy) * 1.6);
  }
  return E;
}
function glow(ctx, c, blur, alpha, w = W, h = H) {   // additive blurred copy (bloom)
  identity(ctx); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha; ctx.filter = `blur(${blur}px)`; ctx.drawImage(c, 0, 0, W, H); ctx.restore();
}
function vignette(ctx, k = 0.5, col = '0,0,0') {
  identity(ctx); const g = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.45, W / 2, H * 0.5, H * 1.0); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function fillBg(ctx, c0, c1) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c0); g.addColorStop(1, c1); ctx.fillStyle = g; ctx.fillRect(-40, -40, W + 80, H + 80); }
// floor line shared by all stages: puppets stand at y = 852
const GROUND = 792;

// ============================================================ 1. PIXEL ART
function pixelBg(ctx, t, set, n) {
  fillBg(ctx, '#2a1f5a', '#e08a5c');
  const R = rng(n * 7);
  for (let i = 0; i < 60; i++) { const x = (R() * W + t * 3) % W, y = R() * 420; ctx.fillStyle = `rgba(255,255,230,${0.4 + R() * 0.5})`; ctx.fillRect(x, y, 4, 4); }
  const layer = (speed, base, amp, col, seed) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-10, H); for (let x = -10; x <= W + 10; x += 20) ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin((x + t * speed) * 0.006 + seed) + 0.3 * Math.sin((x + t * speed) * 0.017 + seed * 2))); ctx.lineTo(W + 10, H); ctx.fill(); };
  layer(8, 640, 150, '#5b3f8c', 1); layer(20, 730, 110, '#3f2d6b', 2); layer(44, 790, 70, '#2a1f4a', 3);
  ctx.fillStyle = set.floor; ctx.fillRect(-40, GROUND, W + 80, H);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let x = 0; x < W; x += 96) ctx.fillRect(x + ((t * 60) % 96), GROUND + 40, 48, 8);
}
function pixelPost(ctx, t) {
  const k = 6, w = W / k, h = H / k, { c, g, img } = down(ctx, 'px', w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, b = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 40;
    for (let q = 0; q < 3; q++) d[i + q] = Math.max(0, Math.min(255, Math.round((d[i + q] + b) / 51) * 51));   // 6 levels/channel = 216-colour retro palette, ordered dither
  }
  g.putImageData(img, 0, 0); up(ctx, c, false);
}

// ============================================================ 2. CHALKBOARD
function chalkBg(ctx, t, set, n) {
  fillBg(ctx, '#27413a', '#1d3430');
  const R = rng(n + 40);
  for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,255,255,${0.012 + R() * 0.03})`; ctx.beginPath(); ctx.ellipse(R() * W, R() * H, 80 + R() * 220, 20 + R() * 60, R() * 3, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-40, 1020, W + 80, 100); ctx.fillStyle = '#4e351e'; ctx.fillRect(-40, 1020, W + 80, 10);
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 3; ctx.setLineDash([22, 14]); ctx.beginPath(); ctx.moveTo(-40, GROUND); ctx.lineTo(W + 40, GROUND); ctx.stroke(); ctx.setLineDash([]);
}
const CHALK = ['#f5f1e6', '#f4d35e', '#9bd6f0', '#f3a6b4', '#b7e4a1'];
function chalkProcess(img, t, base, fillK, edgeK) {
  const { width: w, height: h, data: d } = img, E = edges(img), out = new Uint8ClampedArray(d.length), fr = Math.floor(t * 12);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, p = i * 4, a = d[p + 3] / 255, n = hash(x * 1.3, y * 1.7, fr);
    const e = E[i] * edgeK * (0.55 + 0.6 * n);              // dusty, broken strokes
    const tint = [d[p], d[p + 1], d[p + 2]], m = Math.max(...tint, 1);
    const col = [255 * 0.55 + tint[0] / m * 255 * 0.45, 255 * 0.55 + tint[1] / m * 255 * 0.45, 255 * 0.55 + tint[2] / m * 255 * 0.45];
    out[p] = base[0] * (1 - fillK * a) + tint[0] * fillK * a; out[p + 1] = base[1] * (1 - fillK * a) + tint[1] * fillK * a; out[p + 2] = base[2] * (1 - fillK * a) + tint[2] * fillK * a;
    out[p] = out[p] * (1 - e) + col[0] * e; out[p + 1] = out[p + 1] * (1 - e) + col[1] * e; out[p + 2] = out[p + 2] * (1 - e) + col[2] * e; out[p + 3] = 255;
  }
  return new ImageData(out, w, h);
}
function chalkPost(ctx, t) {
  const { c, g, img } = down(ctx, 'ch', 960, 540); g.putImageData(chalkProcess(img, t, [32, 52, 47], 0.28, 1.25), 0, 0); up(ctx, c, true); vignette(ctx, 0.35);
}

// ============================================================ 3. LINE ART
function lineBg(ctx, t, set, n) { ctx.fillStyle = '#f7f3ea'; ctx.fillRect(-40, -40, W + 80, H + 80); ink(ctx, [[-40, GROUND], [W + 40, GROUND]], 4, { seed: 3 }); }
function linePost(ctx, t) {
  const { c, g, img } = down(ctx, 'ln', 960, 540), E = edges(img), out = new Uint8ClampedArray(img.data.length), draw = Math.min(1, t / 2.6), fr = Math.floor(t * 12);
  for (let y = 0; y < 540; y++) for (let x = 0; x < 960; x++) {
    const i = y * 960 + x, p = i * 4, reveal = x / 960 < draw * 1.1 - hash(y, 3, 1) * 0.1 ? 1 : 0, e = Math.min(1, E[i] * 1.8) * reveal * (0.8 + 0.2 * hash(x, y, fr));
    const paper = 244 + (hash(x * 0.5, y * 0.5, 9) - 0.5) * 8;
    out[p] = paper * (1 - e) + 30 * e; out[p + 1] = (paper - 3) * (1 - e) + 28 * e; out[p + 2] = (paper - 10) * (1 - e) + 36 * e; out[p + 3] = 255;
  }
  g.putImageData(new ImageData(out, 960, 540), 0, 0); up(ctx, c, true);
}

// ============================================================ 4. PS2 (low-poly console look)
function ps2Bg(ctx, t, set, n) {
  fillBg(ctx, '#7f8fb8', '#cfd4e8');
  const R = rng(n + 90);
  for (let i = 0; i < 7; i++) { const x = 200 + i * 300 + R() * 60, h = 180 + R() * 240; ctx.fillStyle = i % 2 ? '#5b6a99' : '#6f7dad'; ctx.beginPath(); ctx.moveTo(x - 90, GROUND); ctx.lineTo(x - 40, GROUND - h); ctx.lineTo(x + 50, GROUND - h - 30); ctx.lineTo(x + 100, GROUND); ctx.fill(); }   // faceted low-poly mountains
  const g = ctx.createLinearGradient(0, GROUND, 0, H); g.addColorStop(0, '#8a9a5e'); g.addColorStop(1, '#55663a'); ctx.fillStyle = g; ctx.fillRect(-40, GROUND, W + 80, H);
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; for (let i = -10; i < 30; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 40, GROUND); ctx.lineTo(W / 2 + i * 240, H); ctx.stroke(); }
}
function ps2Post(ctx, t) {
  const k = 4, w = W / k, h = H / k, { c, g, img } = down(ctx, 'ps', w, h), d = img.data, src = new Uint8ClampedArray(d), fr = Math.floor(t * 12);
  for (let y = 0; y < h; y++) {
    const jit = Math.round((hash(Math.floor(y / 6), fr, 5) - 0.5) * 2.2), swim = Math.round(Math.sin(y * 0.09 + t * 2.4) * 0.8);   // vertex jitter + affine texture swim
    for (let x = 0; x < w; x++) {
      const sx = Math.max(0, Math.min(w - 1, x + jit + swim)), i = (y * w + x) * 4, s = (y * w + sx) * 4, b = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 14, f = clamp((y / h - 0.5) * 1.6, 0, 0.35);
      for (let q = 0; q < 3; q++) { let v = src[s + q] + b; v = v * (1 - 0.18) + [160, 165, 190][q] * 0.18; v = Math.round(v / 8) * 8; d[i + q] = Math.max(0, Math.min(255, v)); }   // 5-bit colour + distance fog
    }
  }
  g.putImageData(img, 0, 0); up(ctx, c, false); vignette(ctx, 0.25, '20,20,40');
}

// ============================================================ 5. COMIC BOOK
function comicBg(ctx, t, set, n) {
  ctx.fillStyle = set.wall; ctx.fillRect(-40, -40, W + 80, H + 80);
  rays(ctx, W / 2, 470, 24, 1400, 'rgba(255,255,255,.35)', { rot: t * 0.03, k: 0.5 });
  ctx.fillStyle = set.floor; ctx.fillRect(-40, GROUND, W + 80, H); ctx.fillStyle = '#111'; ctx.fillRect(-40, GROUND - 4, W + 80, 8);
}
function comicPost(ctx, t) {
  const k = 12, w = W / k, h = H / k, { img } = down(ctx, 'cm', w, h), d = img.data;
  identity(ctx); ctx.save(); ctx.fillStyle = 'rgba(25,20,40,.8)';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, l = lum(d[i], d[i + 1], d[i + 2]), dark = 1 - l;
    if (dark < 0.28) continue;
    const ox = (y & 1) ? k / 2 : 0, r = (dark - 0.2) * k * 0.62;   // Ben-Day dots on a staggered grid
    ctx.beginPath(); ctx.arc(x * k + k / 2 + ox - k / 4, y * k + k / 2, Math.min(r, k * 0.6), 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.save(); ctx.lineWidth = 16; ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.beginPath();   // slanted panel frame
  ctx.rect(0, 0, W, 18); ctx.rect(0, H - 18, W, 18); ctx.rect(0, 0, 18, H); ctx.rect(W - 18, 0, 18, H); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(W - 200, 10); ctx.lineTo(W - 10, 170); ctx.lineTo(W - 10, H - 10); ctx.lineTo(10, H - 10); ctx.closePath(); ctx.stroke(); ctx.restore();
}

// ============================================================ 6. FLAT VECTOR (Kurzgesagt-like)
function flatBg(ctx, t, set, n) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, '#1f3a6e'); g.addColorStop(1, '#6a7fd1'); ctx.fillStyle = g; ctx.fillRect(-40, -40, W + 80, GROUND + 40);
  const R = rng(n + 5);
  for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.7})`; ctx.beginPath(); ctx.arc(R() * W, R() * 560, 1 + R() * 3, 0, TAU); ctx.fill(); }
  const hills = (base, amp, col, ph, par) => { const gr = ctx.createLinearGradient(0, base - amp, 0, GROUND + 60); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-20, H); for (let x = -20; x <= W + 20; x += 24) ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x * 0.004 + ph + t * par))); ctx.lineTo(W + 20, H); ctx.fill(); };
  hills(640, 160, ['#7b5fb5', '#4b3a8c'], 1, 0.01); hills(720, 110, ['#c25c9b', '#8a3c7c'], 3, 0.02); hills(780, 60, [set.acc, set.accD], 5, 0.03);
  const gf = ctx.createLinearGradient(0, GROUND, 0, H); gf.addColorStop(0, set.floor); gf.addColorStop(1, '#1a1030'); ctx.fillStyle = gf; ctx.fillRect(-40, GROUND, W + 80, H);
}
// ============================================================ 7. GOLD LINE ART
function goldBg(ctx, t, set, n) {
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H * 0.5, 1200); g.addColorStop(0, '#16224a'); g.addColorStop(1, '#05070f'); ctx.fillStyle = g; ctx.fillRect(-40, -40, W + 80, H + 80);
  const R = rng(n + 77); for (let i = 0; i < 80; i++) { ctx.fillStyle = `rgba(255,215,100,${0.15 + R() * 0.5})`; ctx.beginPath(); ctx.arc(R() * W, R() * 720, 1 + R() * 2.4, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = 'rgba(212,175,55,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40, GROUND); ctx.lineTo(W + 40, GROUND); ctx.stroke();
}
function goldProcess(img, t, edgeK, fillK) {
  const { width: w, height: h, data: d } = img, E = edges(img), out = new Uint8ClampedArray(d.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, p = i * 4, e = Math.min(1, E[i] * edgeK), gy = y / h, L = lum(d[p], d[p + 1], d[p + 2]) * (d[p + 3] / 255);
    const gold = [212 + (255 - 212) * (1 - gy), 175 + (215 - 175) * (1 - gy), 55 + 0 * gy];   // #D4AF37 → #FFD700
    out[p] = 6 + gold[0] * (e + L * fillK * 0.5); out[p + 1] = 9 + gold[1] * (e + L * fillK * 0.5); out[p + 2] = 18 + gold[2] * (e + L * fillK * 0.5); out[p + 3] = 255;
    for (let q = 0; q < 3; q++) if (out[p + q] > 255) out[p + q] = 255;
  }
  return new ImageData(out, w, h);
}
function goldPost(ctx, t) {
  const { c, g, img } = down(ctx, 'gd', 960, 540); g.putImageData(goldProcess(img, t, 1.5, 0.22), 0, 0); up(ctx, c, true);
  glow(ctx, ctx.canvas, 10, 0.55); vignette(ctx, 0.45, '2,3,10');
}

// ============================================================ 8. 3D CGI
function cgiBg(ctx, t, set, n) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#dfe7f5'); g.addColorStop(0.7, '#a9b9d9'); g.addColorStop(1, '#7c8bb0'); ctx.fillStyle = g; ctx.fillRect(-40, -40, W + 80, H + 80);
  const b = scratch('cgb', W / 2, H / 2), bg = b.getContext('2d'); bg.clearRect(0, 0, W / 2, H / 2);   // depth-of-field: the background plane is blurred
  const R = rng(n + 31); for (let i = 0; i < 16; i++) { bg.fillStyle = `rgba(255,255,255,${0.15 + R() * 0.25})`; bg.beginPath(); bg.arc(R() * W / 2, R() * 300, 20 + R() * 60, 0, TAU); bg.fill(); }
  ctx.save(); ctx.filter = 'blur(8px)'; ctx.drawImage(b, 0, 0, W, H); ctx.restore();
  const fl = ctx.createLinearGradient(0, GROUND, 0, H); fl.addColorStop(0, '#c8cfdf'); fl.addColorStop(1, '#8e98b5'); ctx.fillStyle = fl; ctx.fillRect(-40, GROUND, W + 80, H);
  rays(ctx, 260, -120, 14, 1700, 'rgba(255,244,210,.22)', { rot: 0.9 + Math.sin(t * 0.3) * 0.03, k: 0.4 });   // volumetric god rays
}
function cgiPost(ctx, t) { glow(ctx, ctx.canvas, 16, 0.22); vignette(ctx, 0.28, '30,40,70'); }

// ============================================================ 9. LEGO / BRICK
const LEGO = [[242, 205, 55], [196, 40, 27], [13, 105, 171], [75, 151, 74], [255, 255, 255], [27, 42, 52], [218, 133, 64], [160, 110, 60], [245, 205, 47], [233, 186, 159], [105, 64, 39], [120, 144, 130], [165, 165, 203], [255, 152, 0], [204, 142, 105], [250, 200, 10], [228, 173, 200]];
function legoBg(ctx, t, set, n) {
  fillBg(ctx, '#6ec1ea', '#cfeaf7'); ctx.fillStyle = '#4b974a'; ctx.fillRect(-40, GROUND, W + 80, H);
  ctx.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const x = ((i * 380 + t * 18) % (W + 300)) - 150; ctx.fillRect(x, 120 + (i % 3) * 90, 200, 48); ctx.fillRect(x + 40, 90 + (i % 3) * 90, 120, 40); }
}
function legoPost(ctx, t) {
  const k = 16, w = W / k, h = H / k, { img } = down(ctx, 'lg', w, h), d = img.data; identity(ctx); ctx.save();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; let best = 0, bd = 1e9;
    for (let c = 0; c < LEGO.length; c++) { const dr = d[i] - LEGO[c][0], dg = d[i + 1] - LEGO[c][1], db = d[i + 2] - LEGO[c][2], dd = dr * dr + dg * dg + db * db; if (dd < bd) { bd = dd; best = c; } }
    const [r, g, b] = LEGO[best], px = x * k, py = y * k;
    ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(px, py, k, k);
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(px, py + k - 1.5, k, 1.5); ctx.fillRect(px + k - 1.5, py, 1.5, k);
    ctx.beginPath(); ctx.arc(px + k / 2 + 1, py + k / 2 + 1.5, k * 0.3, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();            // stud shadow
    ctx.beginPath(); ctx.arc(px + k / 2, py + k / 2, k * 0.3, 0, TAU); ctx.fillStyle = `rgb(${Math.min(255, r + 28)},${Math.min(255, g + 28)},${Math.min(255, b + 28)})`; ctx.fill();   // stud
  }
  ctx.restore();
  identity(ctx); const wl = ctx.createLinearGradient(0, 0, W, H); wl.addColorStop(0, 'rgba(255,200,120,.16)'); wl.addColorStop(1, 'rgba(255,120,60,.10)'); ctx.fillStyle = wl; ctx.fillRect(0, 0, W, H);   // warm light
}
// ============================================================ 10. NEON CYBER / ISOMETRIC CUTAWAY
function neonBg(ctx, t, set, n) {
  fillBg(ctx, '#0b0720', '#1a0f3d');
  const R = rng(n + 13);
  const wx = 330, wy = 90, ww = 1260, wh = 560;                                    // window onto the night city
  ctx.fillStyle = '#10163a'; ctx.fillRect(wx, wy, ww, wh);
  for (let i = 0; i < 26; i++) { const x = wx + i * 50 + R() * 12, h = 120 + R() * 330; ctx.fillStyle = '#0a0d26'; ctx.fillRect(x, wy + wh - h, 44, h); for (let k = 0; k < h / 22; k++) if (hash(i, k, Math.floor(t * 0.5)) > 0.55) { ctx.fillStyle = hash(i, k, 3) > 0.5 ? '#ffd27a' : '#6df2ff'; ctx.fillRect(x + 6 + (k % 3) * 12, wy + wh - h + 8 + k * 20, 6, 8); } }
  ctx.strokeStyle = '#2b2a5c'; ctx.lineWidth = 10; ctx.strokeRect(wx, wy, ww, wh); ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
  ctx.fillStyle = '#1a1347'; ctx.beginPath(); ctx.moveTo(-40, GROUND); ctx.lineTo(W / 2, GROUND - 130); ctx.lineTo(W + 40, GROUND); ctx.lineTo(W + 40, H); ctx.lineTo(-40, H); ctx.fill();   // isometric floor rhombus
  const neon = (pts, col) => { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 24; ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore(); };
  neon([[wx - 40, 60], [wx - 40, GROUND]], '#ff3df2'); neon([[wx + ww + 40, 60], [wx + ww + 40, GROUND]], '#3df2ff'); neon([[-40, GROUND], [W / 2, GROUND - 130], [W + 40, GROUND]], '#8a5cff');
}
function neonPost(ctx, t) { glow(ctx, ctx.canvas, 14, 0.55); glow(ctx, ctx.canvas, 3, 0.18); vignette(ctx, 0.4, '5,0,20'); }

export const STYLES = {
  midcentury: { label: 'Mid-century Toon', bg: null, post: null },
  pixel: { label: 'Pixel Art', bg: pixelBg, post: pixelPost, noReg: true },
  chalkboard: { label: 'Chalkboard', bg: chalkBg, post: chalkPost, noReg: true },
  lineart: { label: 'Line Art', bg: lineBg, post: linePost, noReg: true },
  ps2: { label: 'PS2 3D', bg: ps2Bg, post: ps2Post, noReg: true },
  comic: { label: 'Comic Book', bg: comicBg, post: comicPost },
  flatvector: { label: 'Flat Vector', bg: flatBg, post: null, noReg: true },
  goldline: { label: 'Gold Line Art', bg: goldBg, post: goldPost, noReg: true },
  cgi: { label: '3D CGI', bg: cgiBg, post: cgiPost, noReg: true },
  lego: { label: 'Lego / Brick', bg: legoBg, post: legoPost, noReg: true },
  neon: { label: 'Neon Cyber Cutaway', bg: neonBg, post: neonPost, noReg: true },
};

// info scenes (map / maths / chronology cards): the centre-piece, tag and year medallion are drawn on their own layer and restyled
export const INFO = {
  chalkboard(img, t) { return chalkProcess(img, t, [0, 0, 0], 0, 1.4); },   // base is transparent-black: handled by alpha below
  goldline(img, t) { return goldProcess(img, t, 1.6, 0.2); },
};
export function infoLayer(ctx, kind, t, drawFn) {
  const L = scratch('info', 960, 540), g = L.getContext('2d', { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 960, 540);
  const m = ctx.getTransform(); g.setTransform(m.a / 2, m.b / 2, m.c / 2, m.d / 2, m.e / 2, m.f / 2);
  drawFn(g); g.setTransform(1, 0, 0, 1, 0, 0);
  const img = g.getImageData(0, 0, 960, 540), E = edges(img), d = img.data, out = new Uint8ClampedArray(d.length), fr = Math.floor(t * 12);
  for (let y = 0; y < 540; y++) for (let x = 0; x < 960; x++) {
    const i = y * 960 + x, p = i * 4, a = d[p + 3] / 255;
    if (a < 0.02 && E[i] < 0.05) continue;
    const e = Math.min(1, E[i] * 1.6), nn = hash(x * 1.3, y * 1.7, fr);
    if (kind === 'goldline') {
      const gy = y / 540, k = e * (0.75 + 0.25 * nn) + a * 0.12;
      out[p] = Math.min(255, (212 + 43 * (1 - gy)) * k + 8); out[p + 1] = Math.min(255, (175 + 40 * (1 - gy)) * k + 8); out[p + 2] = Math.min(255, 55 * k + 16); out[p + 3] = Math.min(255, 255 * Math.max(k * 1.4, a * 0.35));
    } else {   // chalkboard: dusty coloured chalk lines + faint fill
      const k = e * (0.5 + 0.6 * nn), col = CHALK[(Math.floor(x / 160) + Math.floor(y / 140)) % 3];
      const r = parseInt(col.slice(1, 3), 16), gg = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
      out[p] = r; out[p + 1] = gg; out[p + 2] = b; out[p + 3] = Math.min(255, 255 * Math.max(k, a * 0.18));
    }
  }
  g.putImageData(new ImageData(out, 960, 540), 0, 0);
  ctx.save(); identity(ctx); ctx.imageSmoothingEnabled = true; ctx.drawImage(L, 0, 0, W, H);
  if (kind === 'goldline') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.filter = 'blur(8px)'; ctx.drawImage(L, 0, 0, W, H); }
  ctx.restore();
}
