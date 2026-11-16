'use strict';
/*
 * lemo/toon.js — 2D cartoon vector engine, adapted from the "Sci-Fi Sitcom Toon" technique of Lemo-Opuscar (MIT, see LICENSE-lemo-opuscar-MIT.txt).
 * Techniques kept (they are the style's invariants):
 *   1) own affine matrix: points are transformed to SCREEN space before stroking -> line width is constant at every shot size
 *   2) line boil: outlines are resampled in screen space (~7 px) and displaced along the normal with low-frequency noise;
 *      the boil state cycles through 3 drawings (12 fps) — everything boils, held poses included
 *   3) flat colour: fill -> hard-edged shadow shapes clipped inside the fill -> outline stroked last (no gradients)
 * Adaptation: CommonJS, node-canvas (no Path2D: paths are traced on the context), size set by init().
 */
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (n) => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const vnoise = (x) => { const i = Math.floor(x); const f = x - i; const u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); };

const INK = '#1b1422';
const state = { g: null, W: 1920, H: 1080 };
const S = { boil: 0, amp: 1.7, sid: 0, lw: 7, lwScale: 1, skin: null };
// S.skin (lemo/styles) : { fill(col,g,screenPts)->col|gradient|null, line(col,g)->col|gradient|null, lwMul, boil, step, noShade, glow, shadow }
let M = [1, 0, 0, 1, 0, 0]; const ST = [];

function init(ctx, W, H) { state.g = ctx; state.W = W; state.H = H; }
const push = () => ST.push(M.slice());
const pop = () => { M = ST.pop(); };
const reset = () => { M = [1, 0, 0, 1, 0, 0]; ST.length = 0; };
function translate(x, y) { M = [M[0], M[1], M[2], M[3], M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]]; }
function rotate(a) { const c = Math.cos(a); const s = Math.sin(a); M = [M[0] * c + M[2] * s, M[1] * c + M[3] * s, -M[0] * s + M[2] * c, -M[1] * s + M[3] * c, M[4], M[5]]; }
function scale(sx, sy = sx) { M = [M[0] * sx, M[1] * sx, M[2] * sy, M[3] * sy, M[4], M[5]]; }
const tx = (x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
const zoom = () => Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2]));
const mirrored = () => M[0] * M[3] - M[1] * M[2] < 0;

/** Call once per drawing: `drawing` = 0,1,2 (the 3 boil drawings). */
function frame(drawing, { amp = 1.7 } = {}) { S.boil = drawing % 3; S.amp = amp; S.sid = 0; reset(); state.g.setTransform(1, 0, 0, 1, 0, 0); }

// ── shape points in local coordinates ──
function ell(cx, cy, rx, ry, n = 0, a0 = 0) {
  if (!n) n = Math.max(16, Math.min(90, Math.round((rx + ry) * zoom() * 0.25)));
  const p = []; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p;
}
function arc(cx, cy, rx, ry, a0, a1, n = 24) { const p = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; }
function spline(c, closed = true, k = 8) { // Catmull-Rom
  const n = c.length; const out = []; const P = (i) => (closed ? c[(i + n) % n] : c[clamp(i, 0, n - 1)]);
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = P(i - 1); const p1 = P(i); const p2 = P(i + 1); const p3 = P(i + 2);
    for (let j = 0; j < k; j++) {
      const t = j / k; const t2 = t * t; const t3 = t2 * t;
      out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  if (!closed) out.push(c[n - 1]);
  return out;
}
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); const p = [];
  const c = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a] of c) for (let i = 0; i <= 6; i++) { const b = a + ((i / 6) * Math.PI) / 2; p.push([cx + Math.cos(b) * r, cy + Math.sin(b) * r]); }
  return p;
}
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
function quad(a, c, b, n = 16) { const p = []; for (let i = 0; i <= n; i++) { const t = i / n; const u = 1 - t; p.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return p; }
/** Noodle limb: quadratic a->b, bend = perpendicular offset, tapers w0->w1, round caps. */
function noodle(a, b, bend, w0, w1 = w0) {
  const dx = b[0] - a[0]; const dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; const nx = -dy / L; const ny = dx / L;
  const c = [(a[0] + b[0]) / 2 + nx * bend, (a[1] + b[1]) / 2 + ny * bend];
  const mid = quad(a, c, b, 14); const L1 = []; const R1 = [];
  for (let i = 0; i < mid.length; i++) {
    const p = mid[i]; const q = mid[Math.min(mid.length - 1, i + 1)]; const o = mid[Math.max(0, i - 1)];
    let tx_ = q[0] - o[0]; let ty_ = q[1] - o[1]; const l = Math.hypot(tx_, ty_) || 1; tx_ /= l; ty_ /= l;
    const w = lerp(w0, w1, i / (mid.length - 1)) / 2;
    L1.push([p[0] - ty_ * w, p[1] + tx_ * w]); R1.push([p[0] + ty_ * w, p[1] - tx_ * w]);
  }
  const endA = Math.atan2(mid[mid.length - 1][1] - mid[mid.length - 2][1], mid[mid.length - 1][0] - mid[mid.length - 2][0]);
  const begA = Math.atan2(mid[1][1] - mid[0][1], mid[1][0] - mid[0][0]);
  const capB = arc(b[0], b[1], w1 / 2, w1 / 2, endA + Math.PI / 2, endA - Math.PI / 2, 8);
  const capA = arc(a[0], a[1], w0 / 2, w0 / 2, begA - Math.PI / 2, begA - Math.PI * 1.5, 8);
  return [...L1, ...capB, ...R1.reverse(), ...capA];
}

// ── transform + resample + boil ──
function toScreen(pts, closed, step = 7) {
  const s = pts.map((p) => tx(p[0], p[1]));
  const out = []; let acc = 0; const n = closed ? s.length : s.length - 1;
  out.push(s[0]);
  for (let i = 0; i < n; i++) {
    const a = s[i]; const b = s[(i + 1) % s.length]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let pos = step - acc;
    while (pos < d) { const u = pos / d; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); pos += step; }
    acc = d - (pos - step);
  }
  if (!closed) out.push(s[s.length - 1]);
  return out;
}
function boilPts(s, closed, amp, seed) {
  if (amp <= 0 || s.length < 3) return s;
  const n = s.length; const L = n * 7; const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = s[i]; const ia = closed ? s[(i - 1 + n) % n] : s[Math.max(0, i - 1)]; const ib = closed ? s[(i + 1) % n] : s[Math.min(n - 1, i + 1)];
    let nx = -(ib[1] - ia[1]); let ny = ib[0] - ia[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const x = (i * 7) / 38;
    let v = vnoise(x + seed) * 2 - 1;
    if (closed) { const w = i / n; v = lerp(v, vnoise(x - L / 38 + seed) * 2 - 1, w); }
    const v2 = vnoise(x * 2.3 + seed * 1.7 + 50) * 2 - 1;
    const d = (v * 0.8 + v2 * 0.35) * amp;
    out[i] = [p[0] + nx * d, p[1] + ny * d];
  }
  return out;
}
function trace(g, s, closed) { g.beginPath(); g.moveTo(s[0][0], s[0][1]); for (let i = 1; i < s.length; i++) g.lineTo(s[i][0], s[i][1]); if (closed) g.closePath(); }

/** Main draw: fill -> shade (clipped hard-edged shadow shapes) -> outline. Returns the screen points. */
function shape(pts, o = {}) {
  const g = state.g; const closed = o.closed !== false; const id = S.sid++; const sk = S.skin;
  const seed = hash(id * 1.37 + 3) * 90 + S.boil * 23.7;
  let s = toScreen(pts, closed, (sk && sk.step) || 7);
  s = boilPts(s, closed, (o.boil ?? 1) * S.amp * (sk && sk.boil != null ? sk.boil : 1), seed);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (o.alpha != null) g.globalAlpha = o.alpha;
  let fill = o.fill; if (fill && sk && sk.fill) fill = sk.fill(fill, g, s);
  if (fill && closed) { trace(g, s, true); g.fillStyle = fill; if (sk && sk.shadow) { g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = sk.shadow; g.shadowOffsetY = sk.shadow * 0.4; } g.fill(); g.shadowBlur = 0; g.shadowOffsetY = 0; }
  if (o.shade && !(sk && sk.noShade)) { g.save(); trace(g, s, true); g.clip(); o.shade(); g.restore(); }
  if (o.stroke !== false && o.line !== null) outline(s, closed, o.lw ?? S.lw, o.line ?? INK);
  if (o.alpha != null) g.globalAlpha = 1;
  return s;
}
function outline(s, closed = true, lw = S.lw, col = INK) {
  const g = state.g; const sk = S.skin; g.setTransform(1, 0, 0, 1, 0, 0);
  if (sk) { if (sk.line) { col = sk.line(col, g); if (!col) return; } if (sk.lwMul != null) lw *= sk.lwMul; if (lw <= 0) return; }
  trace(g, s, closed);
  g.lineWidth = lw * S.lwScale; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = col;
  if (sk && sk.glow) { g.shadowColor = typeof col === 'string' ? col : '#ffd34d'; g.shadowBlur = sk.glow; }
  g.stroke(); g.shadowBlur = 0;
}
const fillOnly = (pts, fill, o = {}) => shape(pts, { ...o, fill, stroke: false });
const stroke = (pts, lw = S.lw, o = {}) => shape(pts, { ...o, closed: false, lw });
const dot = (x, y, r, col = INK) => { const g = state.g; const [a, b] = tx(x, y); g.setTransform(1, 0, 0, 1, 0, 0); if (S.skin && S.skin.fill) { col = S.skin.fill(col, g, null); if (!col) return; } g.fillStyle = col; g.beginPath(); g.arc(a, b, Math.max(1.5, r * zoom()), 0, TAU); g.fill(); };
function text(str, x, y, { font = '800 40px "DejaVu Sans"', fill = INK, align = 'center', base = 'middle', rot = 0, outlineW = 0, outlineCol = INK } = {}) {
  const g = state.g; g.save(); g.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  g.translate(x, y); if (rot) g.rotate(rot); if (mirrored()) g.scale(-1, 1);
  g.font = font; g.textAlign = align; g.textBaseline = base;
  if (outlineW) { g.lineWidth = outlineW; g.lineJoin = 'round'; g.strokeStyle = outlineCol; g.strokeText(str, 0, 0); }
  g.fillStyle = fill; g.fillText(str, 0, 0); g.restore();
}
/** Flat banded "gradient": hard-edged colour bands (cartoon sky / wall). */
function bands(cols, y0, y1, x0 = -4000, x1 = 6000) {
  const n = cols.length;
  for (let i = 0; i < n; i++) fillOnly(rect(x0, lerp(y0, y1, i / n), x1 - x0, (y1 - y0) / n + 2), cols[i], { boil: 0 });
}
const wob = (t, f = 1, ph = 0) => Math.sin(t * TAU * f + ph);

module.exports = { TAU, INK, S, clamp, lerp, hash, vnoise, init, frame, push, pop, translate, rotate, scale, tx, zoom, ell, arc, spline, rr, rect, quad, noodle, shape, outline, fillOnly, stroke, dot, text, bands, wob, get g() { return state.g; } };
