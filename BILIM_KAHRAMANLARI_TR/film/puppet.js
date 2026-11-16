// Puppet kit: Lemo-Opuscar mid-century-toon anatomy (egg head with the nose part of the outline, bean body,
// glove hands, off-register colour cels) + rubber-hose "alive" physics (breathing, talk-bounce, lean, shake).
// A puppet is a held drawing: only arms, hands, eyes, mouth and the whole-body physics below move.
// All motion is a pure function of time so every frame is deterministic.
import { PAL, shape, ink, ellipse, spline, move, xform, TAU, clamp, lerp, reg, text, starPts, sparkle, hash } from './engine/toon.js';
import { drawHand } from './engine/chars.js';

export const CAST = {
  A: { name: 'Usta', coat: '#3B4766', coatD: '#2A3350', trim: PAL.mustard, hair: '#CFC8BC', skin: PAL.skin, skinD: PAL.skinD, kind: 'glasses' },
  B: { name: 'Çırak', coat: PAL.coral, coatD: PAL.coralD, trim: PAL.mustardL, hair: PAL.hair, skin: '#E9B88E', skinD: '#CF946B', kind: 'cap' },
};
const UA = 98, FA = 92, SHY = -308;

// pose = { x, y, s, sx, tl, mouth, blink, look, arm:{near:{a1,a2,hand}, far:{a1,a2,hand}}, walk, phase, bob, lean, squash, expr }
//   sx   body facing (+1 right, -1 left)        tl   head turn in the body's frame: 0 = to camera, 1 = toward facing side
//   walk 0..1 amount of walking                 expr ''|shock|anger|joy
export function drawPuppet(ctx, who, p) {
  const C = CAST[who], seed = who === 'A' ? 10 : 40;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.lean || 0);
  ctx.scale(p.sx * p.s * (1 + (p.squashX || 0)), p.s * (1 + (p.squash || 0)));
  legs(ctx, C, p, seed);
  arm(ctx, C, p, 'far', seed + 2);
  body(ctx, C, p, seed + 4);
  head(ctx, C, p, who, seed + 6);
  arm(ctx, C, p, 'near', seed + 8);
  ctx.restore();
  if (p.expr === 'shock') bang(ctx, p, who);
  if (p.expr === 'anger') steam(ctx, p, who);
}

function legs(ctx, C, p, seed) {
  const ph = (p.phase || 0) * TAU, w = p.walk || 0;
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1, sw = Math.sin(ph + i * Math.PI), lift = Math.max(0, Math.cos(ph + i * Math.PI)) * 30 * w;
    const hx = side * 30, fx = side * 34 + sw * 46 * w, fy = -lift;
    const L = [[hx, -128], [(hx + fx) / 2, -70 - lift * 0.4], [fx, fy - 16]];
    ink(ctx, spline(L, false, 5), 28, { seed: seed + i, taper: false, wob: 0.05 });
    const o = reg(seed + i, 0.6); ink(ctx, move(spline(L, false, 5), o[0] * 0.5, o[1] * 0.5), 19, { seed: seed + 3 + i, taper: false, wob: 0.04, color: C.coatD });
    shape(ctx, ellipse(fx + 16, fy - 10, 40, 17, 22), { fill: '#4A3F38', line: 4, seed: seed + 5 + i, grain: 0.2 });
  }
}

function body(ctx, C, p, seed) {
  const B = spline([[-72, -128], [-88, -225], [-74, -318], [0, -346], [74, -318], [88, -225], [72, -128], [0, -114]], true, 8);
  shape(ctx, B, { fill: C.coat, line: 5.5, seed, grain: 0.3, shade: [{ pts: [[26, -360], [120, -360], [120, -100], [40, -100]], color: C.coatD, alpha: 0.55 }] });
  // trim: scarf (A) / badge (B) so the two read apart in silhouette
  if (C.kind === 'glasses') shape(ctx, spline([[-52, -330], [0, -312], [52, -330], [48, -300], [0, -284], [-48, -300]], true, 6), { fill: C.trim, line: 4, seed: seed + 1, grain: 0.25 });
  else shape(ctx, starPts(26, -250, 24, 5, 0.5, 0.2), { fill: C.trim, line: 3.5, seed: seed + 1, grain: 0.1 });
  ink(ctx, [[-72, -150], [0, -138], [72, -150]], 4, { seed: seed + 2, color: C.coatD, taper: false });
}

function arm(ctx, C, p, which, seed) {
  const a = (p.arm && p.arm[which]) || (which === 'near' ? { a1: 1.38, a2: 1.5, hand: 'open' } : { a1: 1.7, a2: 1.62, hand: 'open' });
  const sh = [which === 'near' ? 68 : -68, SHY];
  const el = [sh[0] + Math.cos(a.a1) * UA, sh[1] + Math.sin(a.a1) * UA];
  const ha = [el[0] + Math.cos(a.a2) * FA, el[1] + Math.sin(a.a2) * FA];
  const P = spline([sh, [(sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2], el, [(el[0] + ha[0]) / 2, (el[1] + ha[1]) / 2], ha], false, 6);
  ink(ctx, P, 34, { seed, taper: false, wob: 0.06 });
  const o = reg(seed, 0.8); ink(ctx, move(P, o[0] * 0.5, o[1] * 0.5), 24, { seed: seed + 1, taper: false, wob: 0.05, color: C.coat });
  drawHand(ctx, ha[0], ha[1], a.a2, a.hand || 'open', which === 'near' ? -1 : 1, 1.5, C.skin);
}

function head(ctx, C, p, who, seed) {
  const tl = clamp(p.tl ?? 1, -1, 1), at = Math.abs(tl), cx = 0, cy = -428 + (p.headDy || 0);
  const fx = cx + tl * 30, sgn = tl >= 0 ? 1 : -1;
  // skull: egg outline; the nose is part of the outline when the head is turned (one open spline, no glued wedge)
  const H = ellipse(cx, cy, 64, 79, 44).slice(0, 44).map(([x, y], i) => {
    const ang = Math.atan2((y - cy) / 79, (x - cx) / 64), a0 = sgn > 0 ? 0.16 : Math.PI - 0.16;
    let d = Math.atan2(Math.sin(ang - a0), Math.cos(ang - a0));
    const k = clamp((at - 0.3) / 0.5) * 30 * Math.exp(-((d / 0.26) ** 2));
    return [x + sgn * k * (1 - Math.abs(Math.sin(a0))) , y + (k ? 3 : 0)];
  });
  shape(ctx, H, { fill: C.skin, line: 5.5, seed, grain: 0.25, shade: [{ pts: [[cx + 24, cy - 100], [cx + 110, cy - 100], [cx + 110, cy + 100], [cx + 10, cy + 100]], color: C.skinD, alpha: 0.4 }] });
  // ear on the far side, cheeks
  shape(ctx, ellipse(cx - sgn * 54 * at - (1 - at) * 60, cy + 6, 11, 16, 14), { fill: C.skinD, line: 3, seed: seed + 1, grain: 0 });
  // hair / hat
  const hs = tl * 7;
  if (who === 'A') {
    shape(ctx, spline([[-68 + hs, cy - 18], [-66 + hs, cy - 56], [-34 + hs, cy - 84], [16 + hs, cy - 90], [56 + hs, cy - 64], [68 + hs, cy - 22], [42 + hs, cy - 44], [0 + hs, cy - 52], [-40 + hs, cy - 42]], true, 8), { fill: C.hair, line: 4.5, seed: seed + 2, grain: 0.3 });
    shape(ctx, ellipse(-4 + hs, cy - 100, 28, 24, 20), { fill: C.hair, line: 4.5, seed: seed + 3, grain: 0.3 });   // bun
  } else {
    shape(ctx, spline([[-68 + hs, cy - 10], [-70 + hs, cy - 58], [-34 + hs, cy - 90], [26 + hs, cy - 94], [64 + hs, cy - 62], [70 + hs, cy - 14], [40 + hs, cy - 48], [-6 + hs, cy - 40], [-44 + hs, cy - 50]], true, 8), { fill: C.hair, line: 4.5, seed: seed + 2, grain: 0.3 });
    ink(ctx, spline([[6 + hs, cy - 92], [16 + hs, cy - 124], [34 + hs, cy - 116]], false, 5), 7, { seed: seed + 3, color: C.hair, taper: true });   // cowlick
  }
  // face
  const c = 1 - 0.42 * at, ey = cy - 12, ex = 25 * c, e = p.expr, wide = e === 'shock' ? 1.28 : 1, blink = p.blink || 0, lk = p.look || 0;
  for (const s of [-1, 1]) {
    const x = fx + s * ex, ry = 17 * wide * (1 - blink * 0.92);
    shape(ctx, ellipse(x, ey, 14.5 * wide, Math.max(1.5, ry), 18), { fill: PAL.white, line: 3.6, seed: seed + 4 + s, grain: 0 });
    if (blink < 0.7) shape(ctx, ellipse(x + tl * 5 + lk * 4, ey + 2, 6.4, 7.4 * (1 - blink), 12), { fill: PAL.ink, line: 0, grain: 0, off: [0, 0] });
    const up = e === 'shock' ? -14 : -6;
    const tilt = e === 'anger' ? s * -10 * -1 : (e === 'shock' ? -3 : 0);   // anger: inner ends down
    ink(ctx, [[x - 15, ey + up - 12 + (e === 'anger' ? (s < 0 ? -4 : 8) : 0)], [x, ey + up - 22 + tilt * 0.2], [x + 15, ey + up - 12 + (e === 'anger' ? (s < 0 ? 8 : -4) : 0)]], 5, { seed: seed + 8 + s, taper: true });
  }
  if (C.kind === 'glasses') for (const s of [-1, 1]) ink(ctx, ellipse(fx + s * ex, ey, 24, 22, 20), 4, { closed: true, seed: seed + 11 + s, taper: false, color: PAL.inkSoft });
  if (C.kind === 'glasses') ink(ctx, [[fx - ex + 24, ey], [fx + ex - 24, ey]], 4, { seed: seed + 13, taper: false, color: PAL.inkSoft });
  // nose (frontal): a small plane under the eyes; in profile it is already in the outline
  if (at < 0.55) shape(ctx, ellipse(fx, cy + 18, 10, 8, 12), { fill: C.skinD, line: 3, seed: seed + 14, grain: 0 });
  // cheeks
  for (const s of [-1, 1]) shape(ctx, ellipse(fx + s * (ex + 6) , cy + 30, 12, 8, 12), { fill: PAL.pink, line: 0, grain: 0, alpha: 0.5, off: [0, 0] });
  // mouth
  const m = clamp(p.mouth || 0), mx = fx + tl * 6, my = cy + 52;
  if (e === 'shock' && m < 0.2) shape(ctx, ellipse(mx, my + 4, 11, 15, 16), { fill: PAL.coralD, line: 4, seed: seed + 15, grain: 0 });
  else if (m > 0.06) {
    shape(ctx, ellipse(mx, my + m * 6, 17 - m * 3, 4 + m * 17, 18), { fill: '#7A2B24', line: 4, seed: seed + 15, grain: 0 });
    if (m > 0.45) shape(ctx, ellipse(mx, my + m * 16, 11, 5, 10), { fill: PAL.coralL, line: 0, grain: 0, off: [0, 0] });
  } else if (e === 'anger') ink(ctx, [[mx - 18, my + 6], [mx - 6, my], [mx + 6, my + 6], [mx + 18, my]], 5, { seed: seed + 15, taper: false });
  else ink(ctx, spline([[mx - 18, my - 2], [mx, my + 9], [mx + 18, my - 2]], false, 6), 5, { seed: seed + 15, taper: true });
}

// "!" over the head (shock) and anger puffs
function bang(ctx, p, who) {
  const x = p.x + 18 * p.sx, y = p.y - 590 * p.s - 12 + Math.sin(p.t * 40) * 3, k = clamp(p.fxT * 7);
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  text(ctx, '!', 0, 0, { font: '120px Slab', fill: PAL.coral, plate: PAL.mustardL, align: 'center', seed: 5 });
  ctx.restore();
}
function steam(ctx, p, who) {
  for (let i = 0; i < 3; i++) {
    const ph = (p.fxT * 2.2 + i / 3) % 1, x = p.x + (i - 1) * 54 * p.s, y = p.y - 560 * p.s - ph * 70;
    sparkle(ctx, x, y, 26 * (1 - ph) + 8, { fill: PAL.coralD, alpha: 1 - ph, rot: ph * 2 });
  }
}
