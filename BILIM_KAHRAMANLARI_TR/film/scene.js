// One episode = two puppets, one colour-block stage, one icon, one year medallion, burned-in caption cards.
// Style: Lemo-Opuscar mid-century-toon (print / palette / type / camera) + rubber-hose puppet physics. See LEMO_STYLE.md.
import { PAL, shape, plane, ink, ellipse, rect, rrect, spline, starPts, star, sparkle, rays, atom, boomerang, kidney, text, fit, measure, setClock, twos, reg, rng, clamp, lerp, seg, ss, eo, back, TAU, hash, paperFinish, move } from './engine/toon.js';
import { icon } from './engine/icons.js';
import { drawPuppet } from './puppet.js';

export const W = 1920, H = 1080, GY = 852, S = 0.8, XL = 470, XR = 1450;
// stage palettes: wall (light tint), floor (darker shade), accent, accent shade — "soft atomic-age complements" on cream paper
const SETS = [
  { wall: PAL.mustardL, floor: PAL.coral, acc: PAL.teal, accD: PAL.tealD },
  { wall: PAL.tealL, floor: PAL.tealD, acc: PAL.mustard, accD: PAL.mustardD },
  { wall: PAL.blueL, floor: PAL.blueD, acc: PAL.coral, accD: PAL.coralD },
  { wall: PAL.pink, floor: PAL.pinkD, acc: PAL.teal, accD: PAL.tealD },
  { wall: PAL.avocadoL, floor: PAL.avocadoD, acc: PAL.coral, accD: PAL.coralD },
  { wall: PAL.kraftL, floor: PAL.brown, acc: PAL.teal, accD: PAL.tealD },
];
const trUp = s => s.toLocaleUpperCase('tr');
const yearText = y => (String(y).startsWith('-') ? 'M.Ö. ' + String(y).slice(1) : String(y));

let TL = null, EP = null, SERIES = '';
export function setup(ep, tl, series) { EP = ep; TL = tl; SERIES = series; }
export const DUR = () => TL.dur;
const firstT0 = () => TL.lines[0].t0, lastT1 = () => TL.lines[TL.lines.length - 1].t1;
const envAt = t => TL.env[Math.max(0, Math.min(TL.env.length - 1, Math.floor(t * TL.fps + 1e-6)))] || 0;
const activeLine = t => { for (let i = 0; i < TL.lines.length; i++) { const l = TL.lines[i]; if (t >= l.t0 - 0.04 && t <= l.t1 + 0.1) return i; } return -1; };
const lastLineBefore = t => { let k = -1; for (let i = 0; i < TL.lines.length; i++) if (TL.lines[i].t0 <= t) k = i; return k; };

// ------------------------------------------------------------------ physics → pose
function pose(who, t, tt, a) {      // t: real time, tt: time on twos (the puppet is redrawn at 12 fps)
  const left = who === 'B', sx = left ? 1 : -1, home = left ? XL : XR;
  const w0 = left ? 0.3 : 0.7, w1 = w0 + 1.9;                       // walk onto the stage
  const u = eo(seg(tt, w0, w1)), x0 = left ? -260 : W + 260;
  let x = lerp(x0, home, u), walk = tt > w0 && tt < w1 ? 1 - ss(seg(tt, w1 - 0.35, w1)) : 0;
  const phase = (tt - w0) * 2.7;
  const li = activeLine(tt), L = li >= 0 ? TL.lines[li] : null, speaking = L && L.who === who, other = L && L.who !== who;
  const lastIdx = lastLineBefore(tt), LL = lastIdx >= 0 ? TL.lines[lastIdx] : null;
  const fxLine = LL && LL.fx && tt - LL.t0 < 1.6 ? LL : null, fxT = fxLine ? tt - fxLine.t0 : 9;
  // who faces whom: camera (greeting) → the speaker (as soon as a line is about to start) → camera again at the end
  const toTalk = ss(seg(tt, firstT0() - 0.3, firstT0() - 0.05)) * (1 - ss(seg(tt, lastT1() + 0.7, lastT1() + 1.0)));
  const tl = Math.max(toTalk, walk > 0.1 ? 1 : 0);
  const env = speaking ? envAt(tt) : 0;
  // breathing (all idle), talk-bounce, 2-3 % lean towards the partner, listener nod
  const breath = Math.sin(tt * TAU / 3.2 + (left ? 0 : 1.7));
  let squash = 0.012 * breath, squashX = -0.006 * breath, y = GY, lean = 0, headDy = 0;
  if (walk) { y -= Math.abs(Math.sin(phase * Math.PI)) * 12 * walk; lean += sx * 0.045 * walk; }
  if (speaking) { y -= Math.pow(env, 0.8) * 22; lean += sx * 0.026 + 0.008 * Math.sin(tt * 3.1); squash += 0.018 * env; headDy = -env * 5; }
  else if (other) { lean += sx * 0.012; headDy = Math.sin(tt * 2.3 + 1) * 1.8; }
  // shock / anger: a jolt and a shake that decays; the partner recoils a little
  let expr = '', ex = 0;
  const mine = fxLine && fxLine.who === who;
  if (fxLine) {
    const f = fxLine.fx, k = Math.exp(-fxT * (f === 'anger' ? 1.6 : 4.5)), tail = fxT < (mine ? Math.max(0.9, fxLine.t1 - fxLine.t0 + 0.2) : 0.9);
    if (tail) expr = f;
    if (f === 'shock') { y -= (mine ? 36 : 14) * k * Math.abs(Math.sin(fxT * 13)); squash += (mine ? 0.09 : 0.04) * k * Math.cos(fxT * 16); lean += (mine ? 0 : -sx * 0.045 * k); }
    if (f === 'anger') { ex = (mine ? 9 : 3) * k * Math.sin(fxT * 190); y -= (mine ? 8 : 0) * k * Math.abs(Math.sin(fxT * 31)); }
  }
  const outro = ss(seg(tt, lastT1() + 0.9, lastT1() + 1.3));
  // arms
  let near = { a1: 1.38 + 0.03 * breath, a2: 1.5, hand: 'open' }, far = { a1: Math.PI - 1.38 + 0.0, a2: Math.PI - 1.52, hand: 'open' };
  far = { a1: Math.PI - 1.4 - 0.03 * breath, a2: Math.PI - 1.52, hand: 'open' };
  if (speaking) {
    const g = 0.9, sw = Math.sin(tt * 5.3 + (li * 1.7));
    near = { a1: lerp(1.38, 0.6 + 0.28 * sw, g), a2: lerp(1.5, 0.35 + 0.4 * sw + 0.55 * env, g), hand: (li % 3 === 1 && env > 0.55) ? 'point' : 'open' };
  }
  if (expr === 'shock') { near = { a1: 0.1, a2: -0.55, hand: 'open' }; far = { a1: Math.PI - 0.1, a2: Math.PI + 0.55, hand: 'open' }; }
  if (expr === 'anger') { near = { a1: 0.85, a2: -0.2, hand: 'grip' }; far = { a1: Math.PI - 0.85, a2: Math.PI + 0.2, hand: 'grip' }; }
  if (outro > 0) { far = { a1: lerp(far.a1, 3.75, outro), a2: lerp(far.a2, 3.95 + 0.4 * Math.sin(tt * 9), outro), hand: 'open' }; }
  // blink
  const bi = Math.floor(tt / 2.9), bc = bi * 2.9 + 0.5 + hash(bi, left ? 1 : 2) * 2, blink = clamp(1 - Math.abs(tt - bc) / 0.07);
  const mouth = speaking ? clamp(env * 1.8) : (outro > 0.5 ? 0.0 : 0);
  return { x: x + ex, y, s: S, sx, tl, mouth, blink, look: 0, arm: { near, far }, walk, phase, lean, squash, squashX, headDy, expr: expr || (outro > 0.5 ? 'joy' : ''), fxT, t: tt };
}

// ------------------------------------------------------------------ stage
function stage(ctx, set, t, n) {
  ctx.fillStyle = PAL.paper; ctx.fillRect(-40, -40, W + 80, H + 80);
  plane(ctx, rect(-40, -40, W + 80, 834), set.wall, { grain: 0.3 });
  plane(ctx, rect(-40, 792, W + 80, H - 750), set.floor, { grain: 0.35 });
  ink(ctx, [[-40, 792], [W + 40, 792]], 5, { breaks: 0.18, seed: 3, taper: false });
  const R = rng(900 + n);
  for (let i = 0; i < 26; i++) {                                           // polka dots + atomic sparkles on the wall
    const x = R() * W, y = 40 + R() * 700, r = 5 + R() * 9;
    if (Math.hypot(x - 960, y - 450) < 300) continue;
    if (i % 3) shape(ctx, ellipse(x, y, r, r, 12), { fill: set.acc, line: 0, grain: 0, alpha: 0.55 });
    else sparkle(ctx, x, y, 22 + R() * 18, { fill: PAL.white, alpha: 0.9, rot: R() });
  }
  shape(ctx, boomerang(300, 640, 90, -0.4), { fill: set.acc, line: 4, seed: 5, grain: 0.25, alpha: 0.9 });
  shape(ctx, kidney(1640, 650, 80, 0.3), { fill: PAL.white, line: 4, seed: 6, grain: 0.2, alpha: 0.9 });
  // floor stripes
  for (let i = 0; i < 5; i++) ink(ctx, [[-40, 830 + i * 58], [W + 40, 830 + i * 58]], 3, { color: set.floor === PAL.coral ? PAL.coralD : PAL.inkSoft, alpha: 0.25, breaks: 0.4, seed: 20 + i, taper: false });
  // shadows under the puppets are drawn with the puppets
}

function shadow(ctx, p) { shape(ctx, ellipse(p.x, GY + 4, 110 * p.s * 1.15, 18, 24), { fill: PAL.ink, line: 0, grain: 0, alpha: 0.16, off: [0, 0] }); }

function header(ctx, t) {
  const k = back(seg(t, 0.15, 0.6)); if (k <= 0) return;
  ctx.save(); ctx.translate(120, 118); ctx.scale(k, k);
  shape(ctx, ellipse(0, 0, 58, 58, 32), { fill: PAL.ink, line: 0, grain: 0.2, off: [0, 0] });
  text(ctx, String(EP.n).padStart(2, '0'), 0, 20, { font: '56px Slab', fill: PAL.paper, align: 'center', plate: null });
  ctx.restore();
  ctx.save(); ctx.globalAlpha = clamp(k);
  text(ctx, trUp(SERIES), 206, 76, { font: '600 25px Jost', fill: PAL.inkSoft, track: 4, plate: PAL.white, seed: 4 });
  const f = fit(ctx, EP.title, '{px}px Slab', 66, 1180, 1, 40);
  text(ctx, EP.title, 206, 158, { font: f.font, fill: PAL.ink, plate: PAL.white, seed: 8 });
  ctx.restore();
}

function medallion(ctx, set, t, big = 1) {
  const k = back(seg(t, 0.9, 1.35)); if (k <= 0) return;
  const cx = 1690, cy = 190, r = 132 * big;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.rotate(Math.sin(t * 0.8) * 0.03);
  star(ctx, 0, 0, r, { n: 14, inner: 0.84, fill: set.acc, line: 5, rot: t * 0.05 });
  star(ctx, 0, 0, r * 0.74, { n: 14, inner: 0.9, fill: PAL.paper, line: 3.5, rot: -t * 0.04 });
  const ys = yearText(EP.year), f = fit(ctx, ys, '{px}px Slab', 78, r * 1.3, 1, 36);
  text(ctx, ys, 0, 28 * (f.px / 78) + 2, { font: f.font, fill: PAL.ink, plate: set.acc, align: 'center', seed: 9 });
  ctx.restore();
}

function centerpiece(ctx, set, t, vis = 1, cy = 470, sz = 300) {
  if (vis <= 0) return;
  const k = back(seg(t, 0.45, 1.0)) * vis;
  ctx.save(); ctx.globalAlpha *= clamp(vis); ctx.translate(960, cy);
  ctx.save(); ctx.beginPath(); ctx.rect(-1100, -cy - 100, 2200, 792 + 100); ctx.clip();   // rays stay on the wall
  rays(ctx, 0, 0, 30, 560 * k, PAL.white, { rot: t * 0.04, k: 0.55, alpha: 0.28 });
  ctx.restore();
  ctx.scale(k * (1 + 0.012 * Math.sin(t * 2.1)), k * (1 + 0.012 * Math.sin(t * 2.1)));
  shape(ctx, ellipse(0, 0, sz * 0.62, sz * 0.62, 40), { fill: PAL.paper, line: 5, seed: 12, grain: 0.3 });
  icon(ctx, EP.icon, 0, 0, sz * 0.9, { main: set.acc, dark: set.accD, light: PAL.white });
  ctx.restore();
}

function tagline(ctx, set, t, vis = 1) {
  const k = clamp((t - 1.15) / 0.3) * vis; if (k <= 0) return;
  const f = fit(ctx, EP.tag, '700 {px}px Oleo', 76, 900, 1, 44);
  ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 18);
  text(ctx, EP.tag, 960, 690, { font: f.font, fill: PAL.ink, plate: PAL.white, align: 'center', seed: 14 });
  ctx.restore();
}

function caption(ctx, t) {
  let li = -1;
  for (let i = 0; i < TL.lines.length; i++) {
    const l = TL.lines[i], nx = TL.lines[i + 1], hold = Math.max(1.8, l.t1 - l.t0 + 0.6, l.text.length / 12 + 1);
    const end = Math.min(l.t0 + hold, nx ? nx.t0 - 0.03 : 1e9);
    if (t >= l.t0 - 0.05 && t < Math.max(end, l.t1 + 0.3)) li = i;
  }
  if (li < 0) return;
  const l = TL.lines[li], a = clamp((t - l.t0 + 0.05) / 0.18), rise = (1 - a) * 14;
  const f = fit(ctx, l.text, '600 {px}px Jost', 46, 1460, 2, 32), lh = f.px * 1.18, hh = f.lines.length * lh + 36;
  const wmax = Math.max(...f.lines.map(s => measure(ctx, s, f.font))), w = wmax + 120, cx = 960, top = 1000 - hh + rise;
  ctx.save(); ctx.globalAlpha = a;
  shape(ctx, rrect(cx - w / 2, top, w, hh, 28), { fill: PAL.paper, line: 4, seed: 30, grain: 0.15, breaks: 0.1 });
  const sp = t * 1.3;
  sparkle(ctx, cx - w / 2 + 26, top + hh / 2, 16, { fill: l.who === 'A' ? '#3B4766' : PAL.coral, rot: sp });
  sparkle(ctx, cx + w / 2 - 26, top + hh / 2, 16, { fill: l.who === 'A' ? '#3B4766' : PAL.coral, rot: -sp });
  f.lines.forEach((s, i) => text(ctx, s, cx, top + 18 + f.px * 0.92 + i * lh, { font: f.font, fill: PAL.ink, plate: l.who === 'A' ? PAL.blueL : PAL.pink, align: 'center', seed: 31 + i }));
  ctx.restore();
}

function endCard(ctx, set, t) {
  const t0 = lastT1() + 1.0, k = back(seg(t, t0, t0 + 0.45)); if (k <= 0) return;
  ctx.save(); ctx.translate(960, 560); ctx.scale(k, k);
  shape(ctx, rrect(-520, -190, 1040, 380, 40), { fill: PAL.paper, line: 5, seed: 40, grain: 0.25 });
  star(ctx, -470, -150, 26, { n: 8, fill: set.acc, line: 3 }); star(ctx, 470, -150, 26, { n: 8, fill: set.acc, line: 3 });
  text(ctx, trUp(SERIES), 0, -112, { font: '600 28px Jost', fill: PAL.inkSoft, align: 'center', track: 5, plate: PAL.white });
  text(ctx, 'Bölüm ' + EP.n + ' / ' + TL.total, 0, -34, { font: '700 76px Oleo', fill: PAL.ink, plate: set.acc, align: 'center' });
  text(ctx, EP.n < TL.total ? 'Sıradaki bölümde görüşürüz!' : 'Serinin sonu. Merak etmeye devam!', 0, 42, { font: '500 38px Jost', fill: PAL.ink, align: 'center' });
  (TL.credit || []).forEach((s, i) => text(ctx, s, 0, 108 + i * 30, { font: '500 22px Jost', fill: PAL.inkSoft, align: 'center', maxW: 960 }));
  ctx.restore();
}

// ------------------------------------------------------------------ frame
export function renderFilm(ctx, t, Q) {
  const thumb = Q.get('thumb') === '1';
  const n = EP.n, set = SETS[EP.pal % SETS.length], tt = twos(t);
  setClock(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (thumb) return thumbnail(ctx, set);
  // the stand: a slow push (on ones), then dead still for the end card
  const z = 1 + 0.032 * ss(seg(t, 0.5, lastT1() + 0.6));
  ctx.save(); ctx.translate(W / 2, H * 0.55); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.55);
  stage(ctx, set, t, n);
  const endVis = 1 - ss(seg(t, lastT1() + 0.9, lastT1() + 1.25));
  centerpiece(ctx, set, t, endVis);
  tagline(ctx, set, t, endVis);
  const pa = pose('A', t, tt), pb = pose('B', t, tt);
  shadow(ctx, pa); shadow(ctx, pb);
  const order = [['B', pb], ['A', pa]];
  for (const [who, p] of order) drawPuppet(ctx, who, p);
  header(ctx, t); medallion(ctx, set, t);
  ctx.restore();
  endCard(ctx, set, t);
  caption(ctx, t);
  paperFinish(ctx, W, H, 1);
}

function thumbnail(ctx, set) {
  ctx.save();
  stage(ctx, set, 5, EP.n);
  centerpiece(ctx, set, 9, 1, 610, 380);
  const pa = pose('A', 9, 9), pb = pose('B', 9, 9);
  pa.expr = 'shock'; pb.expr = 'joy'; pa.fxT = pb.fxT = 1; pa.tl = pb.tl = 0.6; pa.mouth = 0.5; pb.mouth = 0.7;
  pa.x = 1560; pb.x = 360; pa.y = pb.y = GY + 70; pa.s = pb.s = 0.92;
  pa.arm = { near: { a1: 0.1, a2: -0.55, hand: 'open' }, far: { a1: Math.PI - 0.1, a2: Math.PI + 0.55, hand: 'open' } };
  pb.arm = { near: { a1: 0.55, a2: 0.0, hand: 'point' }, far: { a1: 3.85, a2: 3.95, hand: 'open' } };
  drawPuppet(ctx, 'B', pb); drawPuppet(ctx, 'A', pa);
  const ys = yearText(EP.year), f = fit(ctx, EP.title, '{px}px Slab', 132, 1560, 2, 70), hh = f.lines.length * f.px * 1.05 + 56;
  shape(ctx, rrect(110, 36, 1700, hh, 36), { fill: PAL.paper, line: 6, seed: 50, grain: 0.2 });
  f.lines.forEach((s, i) => text(ctx, s, 960, 36 + 28 + f.px * 0.92 + i * f.px * 1.05, { font: f.font, fill: PAL.ink, plate: set.acc, align: 'center', seed: 51 + i }));
  star(ctx, 960, 930, 118, { n: 14, inner: 0.84, fill: set.acc, line: 6 });
  star(ctx, 960, 930, 88, { n: 14, inner: 0.9, fill: PAL.paper, line: 4 });
  const fy = fit(ctx, ys, '{px}px Slab', 78, 150, 1, 30);
  text(ctx, ys, 960, 955, { font: fy.font, fill: PAL.ink, plate: set.acc, align: 'center' });
  ctx.restore();
  paperFinish(ctx, W, H, 1);
}
