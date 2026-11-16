'use strict';
/*
 * lemo/info.js — INFORMATION SCENES in the "Data Storytelling" technique of Lemo-Opuscar (MIT, see LICENSE-lemo-opuscar-MIT.txt).
 * Invariants kept: the chart IS the picture; warm cream paper with fibre noise and a faint dot grid; dark warm ink; every mark is a real
 * number (the numbers come from OUR scripts), drawn mark by mark by a red-blue pencil (only its tip shows, from the lower right);
 * handwritten notes pinned to the marks (blue = human note, red = record/warning); colour encodes the value only; honest scales
 * (axes start at 0, nothing stretched for drama); mono ticks. Text on screen is French (the film's language).
 * Used for: counter_focus (balance curve), math (written equation), study (bars of a real study), day (30-day level curve).
 */
const fs = require('fs');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');

// fonts (SIL OFL, fetched at CI time into lemo/fonts/ ; DejaVu is the local fallback)
const FD = path.join(__dirname, 'fonts');
for (const [f, fam, w] of [['Caveat-VF.ttf', 'Caveat'], ['Newsreader-VF.ttf', 'Newsreader'], ['IBMPlexMono-Regular.ttf', 'IBM Plex Mono'], ['IBMPlexMono-Medium.ttf', 'IBM Plex Mono', 'bold']]) {
  const p = path.join(FD, f); if (fs.existsSync(p)) { try { registerFont(p, w ? { family: fam, weight: w } : { family: fam }); } catch (e) { /* fallback font */ } }
}
const HAND = (px) => `${Math.round(px)}px "Caveat","DejaVu Sans"`;
const SERIF = (px, w = 'bold') => `${w} ${Math.round(px)}px "Newsreader","DejaVu Serif"`;
const MONO = (px) => `${Math.round(px)}px "IBM Plex Mono","DejaVu Sans Mono"`;
let INK = '#2b2118'; let PAPER = '#f6efe0'; let GRID = '#d9cfba'; let BLUE = '#2f5fb3'; let RED = '#c43a2f'; let SUB1 = '#6e604b'; let SUB2 = '#7a6b55';
let THEME = { id: 'dataviz', bg: null };
/** Thème de la scène d'information : {id, ink, grid, blue, red, sub1, sub2, bg(ctx,W,H)}. setTheme(null) = dataviz (papier crème). */
function setTheme(t) {
  const d = { id: 'dataviz', ink: '#2b2118', grid: '#d9cfba', blue: '#2f5fb3', red: '#c43a2f', sub1: '#6e604b', sub2: '#7a6b55', bg: null };
  THEME = { ...d, ...(t || {}) }; INK = THEME.ink; GRID = THEME.grid; BLUE = THEME.blue; RED = THEME.red; SUB1 = THEME.sub1; SUB2 = THEME.sub2;
}
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const eo = (t) => 1 - Math.pow(1 - clamp(t), 3);
const hash = (n) => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const nf = (v, d = 0) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

// RdBu-like diverging ramp (value 0..1 -> blue..paper..red), pale values stay pale
function ramp(v) {
  const stops = [[0, [33, 102, 172]], [0.25, [146, 197, 222]], [0.5, [247, 247, 247]], [0.75, [244, 165, 130]], [1, [178, 24, 43]]];
  v = clamp(v);
  for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) { const [a, ca] = stops[i - 1]; const [b, cb] = stops[i]; const u = (v - a) / (b - a); return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * u)).join(',')})`; }
  return 'rgb(178,24,43)';
}

let paperCache = null;
function paper(ctx, W, H) {
  if (THEME.bg) { THEME.bg(ctx, W, H); return; }
  if (!paperCache || paperCache.width !== W) {
    const c = createCanvas(W, H); const g = c.getContext('2d'); g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2400; i++) { g.strokeStyle = `rgba(120,90,50,${0.03 + hash(i) * 0.05})`; g.lineWidth = 1; const x = hash(i + 1) * W; const y = hash(i + 2) * H; const a = hash(i + 3) * 6.28; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.stroke(); }
    g.fillStyle = 'rgba(140,120,90,0.35)'; for (let y = 60; y < H; y += 60) for (let x = 60; x < W; x += 60) g.fillRect(x, y, 2, 2);
    paperCache = c;
  }
  ctx.drawImage(paperCache, 0, 0);
}

// the pencil: only the sharpened tip shows, from the lower right
function pencil(ctx, x, y, lift = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.42); ctx.translate(0, -lift * 18);
  ctx.fillStyle = 'rgba(60,40,20,0.18)'; ctx.beginPath(); ctx.ellipse(10 + lift * 14, 12 + lift * 14, 18, 8, 0.4, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#d9a86c'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(70, -15); ctx.lineTo(70, 15); ctx.closePath(); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, -4); ctx.lineTo(18, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = BLUE; ctx.fillRect(70, -15, 200, 15); ctx.fillStyle = RED; ctx.fillRect(70, 0, 200, 15);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(70, -15, 200, 30); ctx.restore();
}
// handwritten note, written on left->right with a clip
function note(ctx, str, x, y, px, col, k, align = 'left') {
  ctx.save(); ctx.font = HAND(px); ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = col;
  const w = ctx.measureText(str).width; const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.beginPath(); ctx.rect(x0 - 4, y - px, (w + 8) * clamp(k), px * 1.6); ctx.clip(); ctx.fillText(str, x, y); ctx.restore();
  return [x0 + w * clamp(k), y - px * 0.3];
}
function title(ctx, str, sub) {
  ctx.fillStyle = INK; ctx.font = SERIF(52); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(str, 130, 112);
  if (sub) { ctx.fillStyle = SUB1; ctx.font = SERIF(30, 'normal'); ctx.fillText(sub, 130, 156); }
}
function axes(ctx, x0, y0, x1, y1, xt, yt, xlab, ylab) {
  ctx.strokeStyle = GRID; ctx.lineWidth = 2; ctx.fillStyle = SUB2; ctx.font = MONO(22);
  ctx.textAlign = 'right'; yt.forEach(([v, lab]) => { const y = y1 - v * (y1 - y0); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.fillText(lab, x0 - 14, y + 7); });
  ctx.textAlign = 'center'; xt.forEach(([v, lab]) => { const x = x0 + v * (x1 - x0); ctx.fillText(lab, x, y1 + 36); });
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
  if (xlab) { ctx.textAlign = 'right'; ctx.fillStyle = SUB1; ctx.fillText(xlab, x1, y1 + 70); }
  if (ylab) { ctx.textAlign = 'left'; ctx.fillStyle = SUB1; ctx.fillText(ylab, x0 - 60, y0 - 22); }
}

const counterAt = (c, t) => (c.mode === 'exp' ? (c.start || 0.01) * Math.pow(c.base || 2, t / (c.period || 18)) : (c.start || 0) + (c.rate || 1) * t);

/** drawInfo(ctx, W, H, ep, sc, d) — d: {el (s in scene), k (0..1), tAbs, tsStart, tsEnd, days} */
function drawInfo(ctx, W, H, ep, sc, d) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); paper(ctx, W, H);
  const X0 = 230; const X1 = W - 200; const Y0 = 220; const Y1 = H - 330; const prog = clamp(d.el / Math.max(1.5, (d.tsEnd - d.tsStart) * 0.8));
  if (sc.type === 'counter_focus' && ep.counter) {
    const c = ep.counter; const tEnd = Math.max(60, d.tAbs); const vMax = counterAt(c, tEnd) * 1.1 || 1;
    title(ctx, `${(c.label || 'Compteur').charAt(0).toUpperCase()}${(c.label || 'compteur').slice(1).toLowerCase()} au fil du temps`, c.mode === 'exp' ? `× ${c.base || 2} à chaque palier` : `+${nf(c.rate, c.rate < 1 ? 2 : 0)} ${c.unit || ''} chaque seconde`);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((u) => [u, nf(vMax * u, vMax < 100 ? 1 : 0)]); axes(ctx, X0, Y0, X1, Y1, [0, 0.25, 0.5, 0.75, 1].map((u) => [u, `${Math.round(tEnd * u)} s`]), ticks, 'temps de la vidéo', c.unit || '');
    const n = 90; const last = Math.max(2, Math.floor(n * clamp(0.35 + prog * 0.65)));
    ctx.strokeStyle = BLUE; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath(); let px = X0; let py = Y1;
    for (let i = 0; i <= last; i++) { const t = (i / n) * tEnd; const x = X0 + (i / n) * (X1 - X0); const y = Y1 - (counterAt(c, t) / vMax) * (Y1 - Y0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); px = x; py = y; }
    ctx.stroke(); ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 11, 0, 6.28); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = MONO(54); ctx.textAlign = 'right'; ctx.fillText(`${nf(counterAt(c, d.tAbs), counterAt(c, d.tAbs) < 100 ? 1 : 0)} ${c.unit || ''}`, X1, 150);
    note(ctx, sc.onscreen && sc.onscreen[0] ? sc.onscreen[0] : 'ça monte, sans arrêt', Math.min(px - 40, X1 - 380), Math.max(py - 60, Y0 + 60), 46, BLUE, eo((prog - 0.2) * 2.5), 'right');
    pencil(ctx, px + 6, py + 4, 0.2);
  } else if (sc.type === 'math') {
    title(ctx, 'Faisons le calcul', null);
    const eq = sc.equation || ''; const res = sc.result || '';
    note(ctx, eq, X0, 430, 92, INK, eo(prog * 1.6));
    const rk = clamp((prog - 0.5) * 2.2);
    const w2 = (() => { ctx.font = HAND(120); return ctx.measureText(`= ${res}`).width; })();
    const tip = note(ctx, `= ${res}`, X0, 640, 120, RED, rk);
    if (rk > 0.6) { ctx.strokeStyle = RED; ctx.lineWidth = 6; ctx.beginPath(); const rx = (w2 / 2 + 36) * eo((rk - 0.6) * 2.5); ctx.ellipse(X0 + w2 / 2, 610, Math.max(1, rx), 84, 0, -1.2, -1.2 + 6.9 * eo((rk - 0.6) * 2.5)); ctx.stroke(); }
    ctx.strokeStyle = BLUE; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(X0, 468); ctx.lineTo(X0 + Math.min(1, prog * 1.8) * (ctx.measureText(eq).width || 700), 472); ctx.stroke();
    if (sc.onscreen && sc.onscreen[1]) note(ctx, sc.onscreen[1], X1, 760, 50, BLUE, eo((prog - 0.7) * 3), 'right');
    pencil(ctx, tip[0] + 14, tip[1] + 70, 0.3);
  } else if (sc.type === 'study') {
    title(ctx, `${sc.institution || ''} · ${sc.year || ''}`, sc.authors || '');
    const vals = (sc.stat && sc.stat.values) || []; const n = Math.max(1, vals.length); const slot = (X1 - X0) / n; const bw = Math.min(230, slot * 0.55);
    axes(ctx, X0, Y0 + 40, X1, Y1, [], [0, 0.25, 0.5, 0.75, 1].map((u) => [u, String(Math.round(u * 100))]), null, (sc.stat && sc.stat.label) || '');
    let tipX = X0; let tipY = Y1;
    vals.forEach((v, i) => {
      const kk = eo((prog - i * 0.18) * 2.4); const val = clamp(Number(v.value) / 100); const bh = (Y1 - (Y0 + 40)) * val * kk; const bx = X0 + slot * i + (slot - bw) / 2;
      ctx.fillStyle = ramp(0.5 + (val - 0.5) * 0.9); ctx.fillRect(bx, Y1 - bh, bw, bh); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.strokeRect(bx, Y1 - bh, bw, bh);
      ctx.fillStyle = INK; ctx.font = MONO(40); ctx.textAlign = 'center'; ctx.fillText(nf(Math.round(Number(v.value) * kk)), bx + bw / 2, Y1 - bh - 18);
      ctx.font = MONO(22); ctx.fillStyle = SUB1; (String(v.name || '').match(/.{1,22}(\s|$)/g) || []).slice(0, 2).forEach((l, j) => ctx.fillText(l.trim(), bx + bw / 2, Y1 + 34 + j * 26)); tipX = bx + bw / 2; tipY = Y1 - bh;
    });
    if (sc.finding) note(ctx, sc.finding.length > 70 ? `${sc.finding.slice(0, 67)}…` : sc.finding, X0, H - 250, 40, RED, eo((prog - 0.5) * 2));
    if (sc.caveat) note(ctx, `Nuance : ${sc.caveat.length > 60 ? `${sc.caveat.slice(0, 57)}…` : sc.caveat}`, X0, H - 200, 36, BLUE, eo((prog - 0.75) * 3));
    pencil(ctx, tipX + 20, tipY - 10, 0.4);
  } else if (sc.type === 'day') {
    title(ctx, 'Progression sur 30 jours', `jour ${sc.day} — niveau ${sc.level != null ? sc.level : ''} %`);
    axes(ctx, X0, Y0, X1, Y1, [0, 0.25, 0.5, 0.75, 1].map((u) => [u, `J${Math.round(u * 30)}`]), [0, 0.25, 0.5, 0.75, 1].map((u) => [u, `${Math.round(u * 100)} %`]), 'jours', 'niveau');
    const pts = (d.days || []).filter((p) => p.day <= sc.day); ctx.strokeStyle = RED; ctx.lineWidth = 6; ctx.beginPath();
    let px = X0; let py = Y1; pts.forEach((p, i) => { const x = X0 + (p.day / 30) * (X1 - X0); const y = Y1 - (p.level / 100) * (Y1 - Y0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); px = x; py = y; }); ctx.stroke();
    pts.forEach((p) => { const x = X0 + (p.day / 30) * (X1 - X0); const y = Y1 - (p.level / 100) * (Y1 - Y0); ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 10, 0, 6.28); ctx.fill(); ctx.stroke(); });
    note(ctx, sc.onscreen && sc.onscreen[0] ? sc.onscreen[0] : `jour ${sc.day}`, Math.min(px + 20, X1 - 300), Math.max(py - 70, Y0 + 50), 46, BLUE, eo(prog * 2));
    pencil(ctx, px + 8, py + 4, 0.2);
  }
  // bottom band is left clear for the film's captions
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
const INFO_TYPES = new Set(['counter_focus', 'math', 'study', 'day']);

module.exports = { drawInfo, INFO_TYPES, setTheme };
