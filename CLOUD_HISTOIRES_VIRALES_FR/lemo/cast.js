'use strict';
/*
 * lemo/cast.js — OUR OWN cast and sets, drawn with the Sci-Fi Sitcom Toon technique (lemo/toon.js).
 * Invariants kept from the style: thick uniform dark outlines that boil, flat fills with hard-edged shadow shapes (no gradients),
 * big white eyes with tiny pupils, elastic mouths with interior/teeth/tongue, brows carry the emotion, one palette per "world",
 * reaction close-ups after every absurd image, silhouettes that read in solid black. No existing show's character/palette is reproduced.
 * Characters are local-coordinate drawings: origin at the feet, y down, face = 1 faces right (3/4 view), -1 mirrors.
 */
const T = require('./toon');
const { rect, ell, rr, arc, quad, noodle, spline, shape, fillOnly, stroke, dot, bands, push, pop, translate, rotate, scale, lerp } = T;
const INK = T.INK;

// ── our cast (all invented for this channel) ──
const CHARS = {
  theo: { skin: '#f2c9a0', skinS: '#d9a57c', hair: '#4a2c17', hairStyle: 'messy', top: '#3b6fd6', topS: '#2a52a8', bottom: '#2c3550', bottomS: '#1d2438', shoe: '#f4f1ea', stubble: true, hood: true },
  garnier: { skin: '#e6b891', skinS: '#c99970', hair: '#a9aeb3', hairStyle: 'slick', top: '#4a4f5c', topS: '#33384a', bottom: '#3a3f4e', bottomS: '#272b38', shoe: '#1b1422', glasses: true, tie: '#b3263a', shirt: '#f4f1ea', suit: true },
  prof: { skin: '#f2c9a0', skinS: '#d9a57c', hair: '#5b4b57', hairStyle: 'short', top: '#8e3b46', topS: '#6b2a34', bottom: '#3d405b', bottomS: '#2a2c42', shoe: '#1b1422', glasses: true, tie: '#e9c46a', shirt: '#f2e9e4' },
  vidal: { skin: '#f2c9a0', skinS: '#d9a57c', hair: '#a9aeb3', hairStyle: 'bald', top: '#f6f8fa', topS: '#cfd6dc', bottom: '#2c3e50', bottomS: '#1f2d3a', shoe: '#1b1422', glasses: true, coat: true, tie: '#c0392b', shirt: '#7fb3d5', stetho: true },
  lea: { skin: '#e8b894', skinS: '#cf9871', hair: '#8f2a2a', hairStyle: 'long', top: '#ffd23f', topS: '#e0b21f', bottom: '#8e44ad', bottomS: '#6c2f87', shoe: '#8e44ad' },
  max: { skin: '#b9763f', skinS: '#97592b', hair: '#222222', hairStyle: 'beanie', beanie: '#e74c3c', top: '#2ecc71', topS: '#1f9e54', bottom: '#34495e', bottomS: '#25343f', shoe: '#ecf0f1', wide: 1.25 },
  subjA: { skin: '#c68642', skinS: '#a06a30', hair: '#1b1b1b', hairStyle: 'short', top: '#e17055', topS: '#b8523a', bottom: '#2d3436', bottomS: '#1c2123', shoe: '#ffffff' },
  subjB: { skin: '#ffdbac', skinS: '#e0b585', hair: '#d35400', hairStyle: 'bun', top: '#6c5ce7', topS: '#5043b8', bottom: '#2d3436', bottomS: '#1c2123', shoe: '#ffffff' },
};

// ── expressions: eyes (lid, look), mouth (o open 0..1, w width, sm smile), brows (-1 sad/worried .. +1 raised) ──
const EXPR = {
  deadpan: { lid: 0.45, look: [0.3, 0], mouth: { o: 0, w: 0.9, sm: -0.1 }, brow: [0.1, 0.1] },
  talk: { lid: 0.05, look: [0.4, 0], mouth: { o: 0.5, w: 1, sm: 0.2 }, brow: [0.3, 0.1] },
  happy: { lid: 0, look: [0, -0.1], mouth: { o: 0.35, w: 1.25, sm: 1 }, brow: [0.5, 0.5] },
  shock: { lid: -0.1, look: [0, 0], mouth: { o: 0.9, w: 0.7, sm: -0.2 }, brow: [1, 1] },
  scream: { lid: -0.2, look: [0.1, 0], mouth: { o: 1, w: 1.1, sm: -0.5 }, brow: [1, 0.9], shake: 1 },
  worried: { lid: 0.1, look: [-0.2, 0.2], mouth: { o: 0.15, w: 0.8, sm: -0.8 }, brow: [-0.8, -0.8] },
  smug: { lid: 0.35, look: [0.5, 0], mouth: { o: 0, w: 1.1, sm: 0.8, skew: 0.6 }, brow: [0.8, -0.2] },
  smile: { lid: 0.1, look: [0.2, 0], mouth: { o: 0.1, w: 1.2, sm: 0.9 }, brow: [0.3, 0.3] },
};

function eye(cx, cy, rx, ry, { lid = 0, look = [0, 0], pupil = 4.5, skin, lw = 6 } = {}) {
  shape(ell(cx, cy, rx, ry, 30), {
    fill: '#ffffff', lw,
    shade: () => {
      const px = cx + look[0] * rx * 0.55; const py = cy + look[1] * ry * 0.5; dot(px, py, pupil);
      if (lid > 0) { const yl = cy - ry + lid * 2 * ry; fillOnly([[cx - rx * 1.3, cy - ry * 1.4], [cx + rx * 1.3, cy - ry * 1.4], [cx + rx * 1.3, yl], [cx - rx * 1.3, yl + ry * 0.08]], skin, { boil: 0.5 }); stroke([[cx - rx * 1.2, yl + ry * 0.08], [cx + rx * 1.2, yl]], lw); }
    },
  });
}
function mouth(cx, cy, mw, { o = 0, w = 1, sm = 0, skew = 0, lw = 6 } = {}) {
  const hw = (mw * w) / 2; const k = mw * 0.22; const lc = [cx - hw, cy - sm * k + skew * k]; const rc = [cx + hw, cy - sm * k - skew * k];
  if (o < 0.07) { stroke(quad(lc, [cx, cy + sm * k * 1.2], rc, 12), lw); return; }
  const h = o * mw * 0.62;
  const up = quad(lc, [cx, cy - h * 0.25 + sm * k * 0.4], rc, 12); const dn = quad(rc, [cx, cy + h + sm * k * 0.6], lc, 14);
  shape([...up, ...dn], {
    fill: '#4a1a2a', lw,
    shade: () => {
      if (o > 0.22) fillOnly(rect(cx - hw * 1.2, cy - h, hw * 2.4, h * 0.32 + 8), '#ffffff', { boil: 0.3 });
      fillOnly(ell(cx + hw * 0.15, cy + h * 0.95, hw * 0.6, h * 0.45, 20), '#e8637a', { boil: 0.3 });
    },
  });
}
function hand(x, y, r, col) { shape(ell(x, y, r, r * 0.92, 18), { fill: col, lw: 6 }); }

/**
 * person(spec, {expr, pose}) — origin at the feet. pose: {a: [armL angle, armR angle] (rad, 0 = down), prop: 'phone'|'clipboard'|null, lean, wob}
 */
function person(spec, { expr = 'deadpan', pose = {}, t = 0 } = {}) {
  const e = EXPR[expr] || EXPR.deadpan; const wide = spec.wide || 1; const shake = (e.shake ? 1 : 0) * (T.hash(T.S.boil * 5 + 1) - 0.5) * 8;
  push(); translate(shake, 0); rotate((pose.lean || 0) * 0.04);
  const legs = (xo, col, colS) => { shape(noodle([xo * wide, -250], [xo * wide * 1.15, -18], 0, 46, 40), { fill: col, shade: () => fillOnly(rect(xo * wide + 6, -260, 40, 260), colS, { boil: 0.3 }) }); shape(ell(xo * wide * 1.15 + 8, -14, 38, 17), { fill: spec.shoe, lw: 6 }); };
  legs(-26, spec.bottom, spec.bottomS); legs(26, spec.bottom, spec.bottomS);
  // torso
  const tw = 120 * wide;
  shape(rr(-tw / 2, -440, tw, 220, 40), { fill: spec.top, shade: () => fillOnly(rect(tw * 0.12, -450, tw * 0.5, 240), spec.topS, { boil: 0.3 }) });
  if (spec.coat) { shape(rr(-tw * 0.56, -438, tw * 1.12, 330, 36), { fill: spec.top, shade: () => fillOnly(rect(tw * 0.15, -450, tw * 0.5, 350), spec.topS, { boil: 0.3 }) }); }
  if (spec.shirt) fillOnly([[-26, -440], [26, -440], [0, -372]], spec.shirt, { boil: 0.3 });
  if (spec.tie) shape([[-9, -432], [9, -432], [14, -350], [0, -330], [-14, -350]], { fill: spec.tie, lw: 5 });
  if (spec.hood) { stroke([[-10, -430], [-14, -380]], 5); stroke([[10, -430], [14, -380]], 5); }
  // arms (noodles) + hands
  const arm = (side, ang) => {
    const sx = side * (tw / 2 - 6); const sy = -420; const l1 = 95; const l2 = 90;
    const ex = sx + Math.sin(ang * side) * l1; const ey = sy + Math.cos(ang) * l1; const hx = ex + Math.sin(ang * side * 1.2) * l2 * 0.9; const hy = ey + Math.cos(ang * 0.8) * l2;
    shape(noodle([sx, sy], [ex, ey], 8 * side, 44, 38), { fill: spec.top, shade: () => fillOnly(rect(Math.min(sx, ex) - 20, sy, 70, 140), spec.topS, { boil: 0.3 }) });
    shape(noodle([ex, ey], [hx, hy], -8 * side, 38, 34), { fill: spec.coat || spec.suit || spec.hood ? spec.top : spec.skin });
    hand(hx, hy, 21, spec.skin); return [hx, hy];
  };
  const aL = (pose.a && pose.a[0]) != null ? pose.a[0] : 0.18 + 0.03 * T.wob(t, 0.4); const aR = (pose.a && pose.a[1]) != null ? pose.a[1] : 0.18;
  arm(-1, aL); const hR = arm(1, aR);
  if (pose.prop === 'phone') { push(); translate(hR[0], hR[1] - 40); shape(rr(-26, -48, 52, 92, 9), { fill: '#161a24', lw: 5 }); fillOnly(rr(-20, -42, 40, 80, 5), '#8fd0ff', { boil: 0.2 }); pop(); }
  if (pose.prop === 'clipboard') { push(); translate(hR[0] - 10, hR[1] - 30); shape(rr(-34, -52, 68, 90, 6), { fill: '#8b5a2b', lw: 5 }); fillOnly(rect(-26, -42, 52, 70), '#ffffff', { boil: 0.2 }); pop(); }
  // head (3/4 view, face to the right)
  const hy = -540; const hr = 98;
  shape(ell(8, hy, hr * 1.02, hr * 1.06, 40), { fill: spec.skin, shade: () => fillOnly(rect(hr * 0.35, hy - 140, hr, 280), spec.skinS, { boil: 0.3 }) });
  const hs = spec.hairStyle;
  if (hs === 'messy') { shape(spline([[-92, hy - 10], [-96, hy - 78], [-40, hy - 112], [20, hy - 118], [80, hy - 96], [100, hy - 40], [60, hy - 62], [10, hy - 78], [-40, hy - 64], [-70, hy - 40]]), { fill: spec.hair }); }
  else if (hs === 'slick') { shape(spline([[-90, hy - 20], [-80, hy - 84], [0, hy - 108], [78, hy - 90], [96, hy - 34], [40, hy - 70], [-30, hy - 66]]), { fill: spec.hair }); }
  else if (hs === 'wild') { for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; shape(ell(8 + Math.cos(a) * 100, hy - 10 + Math.sin(a) * 96, 34, 34, 16), { fill: spec.hair }); } }
  else if (hs === 'long') { shape(rr(-110, hy - 40, 62, 230, 30), { fill: spec.hair }); shape(spline([[-96, hy - 10], [-90, hy - 92], [10, hy - 112], [90, hy - 80], [98, hy - 30], [40, hy - 66], [-40, hy - 58]]), { fill: spec.hair }); }
  else if (hs === 'bun') { shape(ell(0, hy - 120, 34, 34, 16), { fill: spec.hair }); shape(spline([[-92, hy - 14], [-84, hy - 88], [10, hy - 108], [92, hy - 80], [98, hy - 24], [40, hy - 62], [-40, hy - 60]]), { fill: spec.hair }); }
  else if (hs === 'beanie') { shape(ell(6, hy - 54, hr * 1.06, 70, 30), { fill: spec.beanie }); shape(rr(-98, hy - 72, 208, 34, 14), { fill: '#ffffff', alpha: 0.35 }); dot(8, hy - 128, 14, '#ffffff'); }
  else if (hs === 'short') { shape(spline([[-92, hy - 10], [-86, hy - 80], [10, hy - 100], [90, hy - 74], [98, hy - 20], [40, hy - 56], [-40, hy - 58]]), { fill: spec.hair }); }
  else if (hs === 'bald') { shape(ell(-92, hy - 6, 18, 44, 16), { fill: spec.hair }); }
  const ex = 36; const eyY = hy + 4;
  eye(ex - 38, eyY, 30, 34, { lid: e.lid, look: e.look, skin: spec.skin }); eye(ex + 40, eyY, 32, 36, { lid: e.lid, look: e.look, skin: spec.skin });
  if (spec.glasses) { stroke(ell(ex - 38, eyY, 40, 42, 24), 5); stroke(ell(ex + 40, eyY, 42, 44, 24), 5); stroke([[ex - 0, eyY - 2], [ex + 2, eyY - 2]], 5); }
  const bl = e.brow[0]; const br = e.brow[1];
  stroke([[ex - 70, eyY - 46 - bl * 16], [ex - 14, eyY - 52 - bl * 8 + (bl < 0 ? 12 : 0)]], 7); stroke([[ex + 8, eyY - 54 - br * 8 + (br < 0 ? 12 : 0)], [ex + 78, eyY - 48 - br * 16]], 7);
  stroke(quad([ex + 20, eyY + 30], [ex + 34, eyY + 56], [ex + 14, eyY + 60], 6), 5);
  mouth(ex + 8, hy + 62, 64, { ...e.mouth, o: e.mouth.o + (pose.voice != null ? 0.55 * pose.voice : (expr === 'talk' ? 0.25 * Math.abs(T.wob(t, 2.2)) : 0)) });
  if (spec.stubble) for (let i = 0; i < 14; i++) dot(ex - 24 + (i % 7) * 11, hy + 86 + Math.floor(i / 7) * 10, 2.2, '#5a3a22');
  pop();
}

// ── worlds: one palette per world, maximally different from the previous (hue AND value) ──
const WORLDS = {
  etsilab: [{ wall: ['#2a9d8f', '#35b3a4'], floor: '#e9c46a', accent: '#f4a261', dark: '#1b6f65' }, { wall: ['#ff8fab', '#ffa6bd'], floor: '#8ecae6', accent: '#ffd166', dark: '#c4607b' }, { wall: ['#e9c46a', '#f1d28a'], floor: '#457b9d', accent: '#e76f51', dark: '#b8943f' }],
  homodeus: [{ wall: ['#8d6e63', '#a1887f'], floor: '#d7ccc8', accent: '#ffb74d', dark: '#5d4037' }, { wall: ['#6a4c93', '#7d5fa6'], floor: '#c5ca30', accent: '#ff7043', dark: '#432a67' }, { wall: ['#4db6ac', '#6fcbc2'], floor: '#fff3e0', accent: '#e57373', dark: '#2f867d' }],
  izranoff: [{ wall: ['#1b1f3b', '#262b52'], floor: '#0e1020', accent: '#7df9ff', dark: '#0a0c1a' }, { wall: ['#2d1b3d', '#3d2552'], floor: '#120a1a', accent: '#ff4d6d', dark: '#0d0714' }, { wall: ['#0f2a33', '#173b47'], floor: '#07161b', accent: '#9bf6a3', dark: '#06141a' }],
  '30jours': [{ wall: ['#ff7aa8', '#ff94b9'], floor: '#ffe66d', accent: '#4ecdc4', dark: '#c4466f' }, { wall: ['#b8f2e6', '#cff7ee'], floor: '#ffa69e', accent: '#7c5cff', dark: '#7cc6b7' }, { wall: ['#ffd166', '#ffdd8a'], floor: '#5fa8d3', accent: '#ef476f', dark: '#c9a043' }],
};

function settingKind(ep, type) {
  if (ep.formula === 'etsilab') return 'bank';
  if (ep.formula === 'homodeus') return 'lab';
  if (ep.formula === 'izranoff') return 'night';
  if (type === 'vidal') return 'clinic';
  if (type === 'card_refused') return 'shop';
  return 'room';
}

function backdrop(W, H, ep, type, pal, kind) {
  const fy = H * 0.74;
  bands([pal.wall[0], pal.wall[0], pal.wall[1]], -20, fy);
  fillOnly(rect(-20, fy, W + 40, H - fy + 20), pal.floor, { boil: 0 });
  fillOnly(rect(-20, fy, W + 40, 16), pal.dark, { boil: 0 });
  if (kind === 'night') { // window with a flat moon, a flat fence, the glowing-eyed silhouette
    shape(rr(W * 0.5, H * 0.08, W * 0.36, H * 0.52, 12), { fill: '#0b1233', lw: 9, shade: () => { fillOnly(ell(W * 0.8, H * 0.2, 54, 54, 24), '#f3f1d8', { boil: 0.3 }); fillOnly(rect(W * 0.5, H * 0.48, W * 0.36, H * 0.14), '#0a2a1f', { boil: 0.3 }); } });
    stroke([[W * 0.68, H * 0.08], [W * 0.68, H * 0.6]], 8); stroke([[W * 0.5, H * 0.34], [W * 0.86, H * 0.34]], 8);
    shape(ell(W * 0.62, H * 0.5, 70, 46, 24), { fill: '#04060a' }); dot(W * 0.6, H * 0.46, 7, '#ffd23f'); dot(W * 0.64, H * 0.46, 7, '#ffd23f');
  } else if (kind === 'bank') {
    shape(rr(W * 0.34, H * 0.34, W * 0.3, H * 0.4, 8), { fill: pal.accent, shade: () => fillOnly(rect(W * 0.34, H * 0.62, W * 0.3, H * 0.2), pal.dark, { boil: 0.3 }) });
    shape(rr(W * 0.7, H * 0.28, W * 0.08, H * 0.46, 10), { fill: '#9aa5ad', shade: () => fillOnly(rect(W * 0.7, H * 0.6, W * 0.08, H * 0.2), '#6b767e', { boil: 0.3 }) });
    shape(rr(W * 0.71, H * 0.31, W * 0.06, H * 0.14, 6), { fill: '#071018' });
  } else if (kind === 'lab') {
    shape(rr(W * 0.06, H * 0.12, W * 0.34, H * 0.4, 8), { fill: '#fafcff', shade: () => { stroke([[W * 0.09, H * 0.42], [W * 0.2, H * 0.3], [W * 0.3, H * 0.4]], 7, {}); } });
    shape(rr(W * 0.02, H * 0.66, W * 0.96, H * 0.1, 8), { fill: pal.dark });
  } else {
    shape(rr(W * 0.4, H * 0.1, W * 0.2, H * 0.4, 8), { fill: '#bfe8ff', shade: () => fillOnly(ell(W * 0.55, H * 0.2, 36, 36, 20), '#ffe27a', { boil: 0.3 }) });
    stroke([[W * 0.5, H * 0.1], [W * 0.5, H * 0.5]], 7); stroke([[W * 0.4, H * 0.3], [W * 0.6, H * 0.3]], 7);
  }
}

function castFor(ep, type, i) {
  const alt = i % 2 === 0;
  switch (ep.formula) {
    case 'etsilab': return [{ c: 'theo', side: -1 }, { c: 'garnier', side: 1 }];
    case 'homodeus': return [{ c: 'prof', side: -1 }, { c: alt ? 'subjA' : 'subjB', side: 1 }];
    case 'izranoff': return [{ c: 'theo', side: 1 }];
    default: return type === 'vidal' ? [{ c: 'theo', side: -1 }, { c: 'vidal', side: 1 }] : [{ c: 'theo', side: -1 }, { c: alt ? 'max' : 'lea', side: 1 }];
  }
}
const EMO = { hook: 'shock', counter_focus: 'shock', math: 'smug', phase2: 'scream', rule: 'worried', tension: 'worried', twist: 'scream', day: 'happy', card_refused: 'shock', vidal: 'deadpan', outro: 'happy', gag: 'shock', quote: 'smug', short: 'shock' };

const eo = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const REACT = { shock: 'shocked', scream: 'angry', worried: 'sad' }; // reaction family of an expression (shocked / angry / sad)

/** Backdrop only (one of the 3 "boil" drawings) : drawn once per beat and cached, actors are drawn every frame on top of it. */
function drawToonBackdrop(ctx, W, H, ep, beat, drawing) {
  T.init(ctx, W, H); T.frame(drawing);
  const worlds = WORLDS[ep.formula] || WORLDS['30jours']; const pal = worlds[(beat.scene || 0) % worlds.length];
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  backdrop(W, H, ep, beat.type, pal, settingKind(ep, beat.type));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Actors of a beat, with the puppet physics. st = { t: absolute time (s), tb: time since the beat started, voice: 0..1 narration
 * envelope, enter: 0..1 walk-in progress (1 = already on stage), speaker: index of the talking cast member }.
 * - speaking: vertical bobbing + a little tilt driven by the voice envelope, mouth opening follows the voice
 * - everyone: breathing (slow vertical squash) and a +-2.5 % rhythmic tilt
 * - scene start: the cast walks in from off-screen with step bounce
 * - emotion change (shocked / angry / sad): scale punch + shake
 * - auto-flip: the character who starts talking turns to face the other one (x-squash turn)
 */
function drawToonActors(ctx, W, H, ep, beat, drawing, st) {
  T.init(ctx, W, H); T.frame(drawing);
  const shot = (beat.i || 0) % 4; const cast = castFor(ep, beat.type, beat.i || 0); const vertical = H > W;
  const emo = EMO[beat.type] || (beat.i % 2 ? 'worried' : 'talk'); const base = H * 0.93; const sc = (vertical ? 1.05 : 1.35) * (H / 1080);
  const sp = Math.min(st.speaker || 0, cast.length - 1); const react = REACT[emo]; const punchK = react ? Math.max(0, 1 - st.tb / 0.4) : 0;
  const worlds = WORLDS[ep.formula] || WORLDS['30jours']; const pal = worlds[(beat.scene || 0) % worlds.length];
  // puppet(k, isSpeaker, x, y, scale, facing) draws one character with the whole motion stack
  const puppet = (m, k, x, y, s, face, extra = {}) => {
    const isSp = k === sp; const v = isSp ? st.voice : 0; const t = st.t + k * 0.9;
    const breathe = 1 + 0.014 * Math.sin(t * 1.7); const tilt = 0.025 * Math.sin(t * 2.3 + k * 1.7) + (isSp ? 0.012 * v * Math.sin(t * 9) : 0);
    const walking = st.enter < 1 && extra.walk; const e = walking ? 0 : 1;
    const bob = -v * 16 * s - (walking ? Math.abs(Math.sin(st.enter * Math.PI * 6)) * 16 * s : 0);
    let px = x; if (walking) { const x0 = m.side < 0 ? -W * 0.18 : W * 1.18; px = x0 + (x - x0) * eo(st.enter); }
    const punch = 1 + (isSp ? 0.09 : 0.04) * Math.sin(Math.min(1, st.tb / 0.4) * Math.PI) * (react ? 1 : 0);
    const shk = react ? Math.sin(st.tb * 70) * 7 * punchK * s : 0;
    let flip = face; if (cast.length > 1 && isSp && st.tb < 0.22 && beat.i > 0) flip = face * (-1 + 2 * eo(st.tb / 0.22)); // turn towards the other
    push(); translate(px + shk, y + bob);
    fillOnly(ell(0, 4, 96 * s, 17 * s, 24), 'rgba(0,0,0,0.28)', { boil: 0 });  // hard-edged floor shadow
    rotate(tilt); scale(s * flip * punch, s * breathe * punch);
    const ex = extra.expr || (k === 0 ? emo : (k % 2 ? 'deadpan' : 'worried'));
    person(CHARS[m.c], { expr: walking ? 'deadpan' : ex, pose: { ...(extra.pose || { a: [0.2, k === 0 ? 1.0 : 0.3], prop: k === 0 && ep.formula !== 'izranoff' ? 'phone' : null }), voice: isSp && !walking ? v : null }, t });
    pop();
  };
  if (shot === 1) { // reaction close-up on the speaker
    const m = cast[sp]; puppet(m, sp, W * (vertical ? 0.5 : 0.42), H * 0.46 + 540 * sc * 2.2, sc * 2.2, 1, { pose: { a: [0.5, 0.9] }, expr: emo });
  } else if (shot === 2) { // insert: a glowing phone, reaction face small in the corner
    push(); translate(W * 0.5, H * 0.52); rotate(-0.12 + 0.02 * Math.sin(st.t * 2)); shape(rr(-120, -210, 240, 420, 34), { fill: '#161a24', lw: 9 }); fillOnly(rr(-98, -186, 196, 372, 18), '#8fd0ff', { boil: 0.2 }); fillOnly(rect(-98, 40, 196, 146), '#52b0f0', { boil: 0.2 }); pop();
    puppet(cast[0], 0, W * 0.2, H * 1.0, sc * 0.9, 1, { pose: { a: [0.2, 1.2] }, expr: emo });
  } else {
    cast.forEach((m, k) => { const x = W * (m.side < 0 ? 0.3 : 0.7); puppet(m, k, x, base, sc * (shot === 3 ? 1.12 : 1), m.side < 0 ? 1 : -1, { walk: true }); });
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** One whole static frame (character sheets, contact sheets, tests). */
function drawToonBeat(ctx, W, H, ep, beat, drawing) {
  drawToonBackdrop(ctx, W, H, ep, beat, drawing);
  drawToonActors(ctx, W, H, ep, beat, drawing, { t: (beat.i || 0) * 0.7 + drawing * 0.08, tb: 2, voice: 0.4, enter: 1, speaker: (beat.i || 0) % 2 });
}

module.exports = { CHARS, EXPR, WORLDS, person, drawToonBeat, drawToonBackdrop, drawToonActors, castFor, settingKind };
