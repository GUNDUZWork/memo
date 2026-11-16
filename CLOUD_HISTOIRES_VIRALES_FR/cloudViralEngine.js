#!/usr/bin/env node
/*
 * cloudViralEngine.js — moteur de rendu 100 % cloud pour CLOUD_HISTOIRES_VIRALES_FR.
 *
 * Architecture « AI Scene-per-Beat » : chaque beat (4-5 s de narration) = une vraie illustration IA
 * (Pollinations Flux, cf. aiScenes.js) animée par une caméra Ken Burns ; le moteur n'ajoute que la
 * couche HUD (verre dépoli), les textes à l'écran, les sous-titres et les effets de coupe.
 * Aucun personnage ni décor n'est dessiné par le code.
 *
 * 4 formules : etsilab (compteur + PHASE 2), homodeus (3 règles + 2 études), izranoff (7 règles + twist),
 *              30jours (J-xx, Niveau +%, CARTE REFUSÉE, Docteur Vidal).
 *
 * Commandes :
 *   node cloudViralEngine.js all --episode 1 [--preview 30] [--offline]   pipeline complet -> dist/ep01/
 *   node cloudViralEngine.js still --episode 1 --mode main|short --t 40    (PNG de contrôle, après "all")
 *   node cloudViralEngine.js thumbnail|metadata --episode 1
 *   --offline = voix muette simulée + images factices (tests sans réseau uniquement)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { createCanvas, loadImage } = require('canvas');
const AI = require('./aiScenes');
const LEMO_TOON = require('./lemo/cast'); // secours : épisode sans aucune image IA -> style « scifi-toon » (Lemo-Opuscar, code adapté)
const STY = require('./lemo/styles'); // 10 styles procéduraux (pixel, craie, line art, PS2, comic, flat vector, gold, CGI, lego, néon)
const LEMO_INFO = require('./lemo/info'); // scènes d'info (cartes, chiffres, courbes) -> style « dataviz »
const frame = { stamps: 0, safeY: 1e9 }; // état par image : 1 seul tampon, zone sous-titres interdite

const ROOT = __dirname;
const FPS = Number(process.env.FPS || 25);
const PHASE2_AT = 480; // 8:00
const TWIST_WINDOW = 45; // dernières 45 s
const GAG_EVERY = 6; // secondes
const SANS = 'DejaVu Sans';
const SERIF = 'DejaVu Serif';
const MONO = 'DejaVu Sans Mono';

// ───────────────────────────── utilitaires ─────────────────────────────
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);
const easeInOut = (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const pop = (k) => { k = clamp(k); const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const pad2 = (n) => String(n).padStart(2, '0');
const fmtClock = (s) => `${Math.floor(s / 60)}:${pad2(Math.floor(s % 60))}`;
const nf = (v, d = 0) => v.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

function args() {
  const a = { _: [] };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (v[i].startsWith('--')) {
      const k = v[i].slice(2);
      a[k] = v[i + 1] && !v[i + 1].startsWith('--') ? v[++i] : true;
    } else a._.push(v[i]);
  }
  return a;
}

function loadEpisode(id) {
  const f = path.join(ROOT, 'episodes', `ep${pad2(id)}.json`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}
const buildDir = (id) => path.join(ROOT, 'build', `ep${pad2(id)}`);
const distDir = (id) => path.join(ROOT, 'dist', `ep${pad2(id)}`);

function sh(cmd, argv, opts = {}) {
  console.log(`$ ${cmd} ${argv.join(' ')}`);
  const r = spawnSync(cmd, argv, { stdio: 'inherit', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} a échoué (code ${r.status})`);
}

// ─────────────────────────── primitives dessin ───────────────────────────
const wrapCache = new Map();
function wrap(ctx, text, maxW) {
  const key = `${ctx.font}|${maxW}|${text}`;
  if (wrapCache.has(key)) return wrapCache.get(key);
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/)) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
    }
    out.push(line);
  }
  if (wrapCache.size > 4000) wrapCache.clear();
  wrapCache.set(key, out);
  return out;
}

function font(size, weight = 'bold', family = SANS, style = '') {
  return `${style} ${weight} ${Math.round(size)}px "${family}"`.trim();
}

// Texte centré multi-lignes, réduit automatiquement pour tenir dans maxH.
function textBlock(ctx, text, x, y, maxW, size, opts = {}) {
  const { weight = 'bold', family = SANS, color = '#fff', stroke = null, lineH = 1.18,
    maxH = Infinity, align = 'center', baseline = 'middle', shadow = 0, style = '' } = opts;
  let s = size;
  let lines;
  for (;;) {
    ctx.font = font(s, weight, family, style);
    lines = wrap(ctx, text, maxW);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if ((lines.length * s * lineH <= maxH && widest <= maxW) || s < 14) break;
    s *= 0.92;
  }
  const total = lines.length * s * lineH;
  let yy = baseline === 'middle' ? y - total / 2 + (s * lineH) / 2 : y;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  for (const l of lines) {
    if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = shadow; }
    if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = s * 0.14; ctx.strokeStyle = stroke; ctx.strokeText(l, x, yy); }
    ctx.fillStyle = color;
    ctx.fillText(l, x, yy);
    ctx.shadowBlur = 0;
    yy += s * lineH;
  }
  return { height: total, size: s };
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function warningIcon(ctx, cx, cy, s, color) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.55);
  ctx.lineTo(cx + s * 0.6, cy + s * 0.45);
  ctx.lineTo(cx - s * 0.6, cy + s * 0.45);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.font = font(s * 0.62);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', cx, cy + s * 0.08);
}

// Docteur Vidal — personnage dessiné (blouse, lunettes, stéthoscope).
function stamp(ctx, cx, cy, text, s, k, color = '#e01b24', angle = -0.18) {
  if (frame.stamps >= 1) return; // règle : un seul tampon par image
  frame.stamps++;
  cy = Math.min(cy, frame.safeY - s * 1.3);
  const sc = lerp(2.4, 1, easeOut(k * 1.6));
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, ctx.canvas.width, frame.safeY); ctx.clip(); // jamais dans la zone des sous-titres
  ctx.globalAlpha = clamp(k * 3);
  ctx.translate(cx, cy); ctx.rotate(angle); ctx.scale(sc, sc);
  ctx.font = font(s);
  const w = ctx.measureText(text).width + s * 0.9;
  ctx.strokeStyle = color; ctx.lineWidth = s * 0.12;
  rrect(ctx, -w / 2, -s * 0.75, w, s * 1.5, s * 0.15); ctx.stroke();
  ctx.lineWidth = s * 0.04; rrect(ctx, -w / 2 + s * 0.15, -s * 0.6, w - s * 0.3, s * 1.2, s * 0.1); ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, s * 0.04);
  ctx.restore();
}

// ─────────────────────────────── thèmes ───────────────────────────────
const THEMES = {
  etsilab: { bg1: '#070b18', bg2: '#13213f', accent: '#FFD400', text: '#ffffff', family: SANS },
  homodeus: { bg1: '#0d0a0a', bg2: '#3a1016', accent: '#C9A227', text: '#f5ecd7', family: SERIF },
  izranoff: { bg1: '#020203', bg2: '#0e1418', accent: '#d7263d', text: '#e8e8e8', family: SANS },
  '30jours': { bg1: '#fff3c4', bg2: '#ffd6e0', accent: '#ff3d7f', text: '#1b1b1b', family: SANS },
};

// ─────────────────────────── état de formule ───────────────────────────
function counterValue(c, t) {
  if (!c) return 0;
  if (c.mode === 'exp') {
    const period = c.period || 18; // secondes de vidéo par "jour"
    return (c.start || 0.01) * Math.pow(c.base || 2, t / period);
  }
  return (c.start || 0) + (c.rate || 1) * t;
}
function counterText(c, t) {
  const v = counterValue(c, t);
  const d = c.decimals != null ? c.decimals : (v < 100 ? 2 : 0);
  const u = c.unit || '';
  return u === '€' || u === '$' ? `${nf(v, d)} ${u}` : `${nf(v, d)}${u ? ' ' + u : ''}`;
}

function sceneAt(tl, t) {
  let i = 0;
  while (i + 1 < tl.scenes.length && tl.scenes[i + 1].start - 0.2 <= t) i++;
  return i;
}

function currentCue(tl, t) {
  for (const c of tl.cues) if (t >= c.start - 0.05 && t <= c.end + 0.15) return c;
  return null;
}

// ───────────────────────────── glassmorphism ─────────────────────────────
let blurTmp = null;
// Verre dépoli : on réduit puis ré-agrandit l'image située derrière (flou), teinte + reflet + liseré.
function glass(ctx, x, y, w, h, r, o = {}) {
  const { tint = 'rgba(255,255,255,0.13)', border = 'rgba(255,255,255,0.5)', blur = 14, dark = 0.18 } = o;
  const cw = ctx.canvas.width; const ch = ctx.canvas.height;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const sx = Math.max(0, x); const sy = Math.max(0, y);
  const sw = Math.min(cw - sx, w - (sx - x)); const sh = Math.min(ch - sy, h - (sy - y));
  ctx.save(); rrect(ctx, x, y, w, h, r); ctx.clip();
  if (sw > 4 && sh > 4) {
    const tw = Math.max(2, Math.round(sw / blur)); const th = Math.max(2, Math.round(sh / blur));
    if (!blurTmp) blurTmp = createCanvas(4, 4);
    if (blurTmp.width !== tw || blurTmp.height !== th) { blurTmp.width = tw; blurTmp.height = th; }
    const tc = blurTmp.getContext('2d'); tc.clearRect(0, 0, tw, th);
    tc.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, tw, th);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(blurTmp, 0, 0, tw, th, sx, sy, sw, sh);
  }
  if (dark) { ctx.fillStyle = `rgba(6,10,22,${dark})`; ctx.fillRect(x, y, w, h); }
  ctx.fillStyle = tint; ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.24)'); g.addColorStop(0.45, 'rgba(255,255,255,0.02)'); g.addColorStop(1, 'rgba(255,255,255,0.07)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.save(); rrect(ctx, x + 1, y + 1, w - 2, h - 2, r); ctx.lineWidth = 2; ctx.strokeStyle = border; ctx.stroke(); ctx.restore();
}

function systemNotification(ctx, L, msg, k, t, y) {
  const { W, u, vertical } = L;
  const w = W * (vertical ? 0.92 : 0.6); const h = (vertical ? 290 : 240) * u;
  const x = (W - w) / 2; const yy = y - (1 - easeOut(k)) * 60 * u;
  ctx.save();
  ctx.globalAlpha = clamp(k * 1.5);
  ctx.fillStyle = 'rgba(4,4,6,0.94)'; rrect(ctx, x, yy, w, h, 22 * u); ctx.fill();
  ctx.strokeStyle = (Math.floor(t * 2) % 2) ? '#ff2d2d' : '#6a0000'; ctx.lineWidth = 4 * u; ctx.stroke();
  warningIcon(ctx, x + 70 * u, yy + 72 * u, 74 * u, '#ff2d2d');
  ctx.fillStyle = '#ff5a5a'; ctx.font = font(26 * u, 'bold', MONO); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('NOTIFICATION SYSTÈME', x + 135 * u, yy + 52 * u);
  ctx.fillStyle = '#fff'; ctx.font = font((vertical ? 46 : 50) * u, 'bold', MONO);
  ctx.fillText('PHASE 2 ACTIVÉE', x + 135 * u, yy + 102 * u);
  textBlock(ctx, msg || '', x + 40 * u, yy + 150 * u, w - 80 * u, 28 * u,
    { family: MONO, weight: 'normal', color: '#d0d0d0', align: 'left', baseline: 'top', maxH: h - 165 * u });
  ctx.restore();
}

function burst(ctx, x, y, r, fill, stroke, u) {
  ctx.beginPath();
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2; const rr = i % 2 ? r * 0.78 : r;
    ctx.lineTo(x + Math.cos(a) * rr * 1.25, y + Math.sin(a) * rr * 0.8);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 8 * u; ctx.strokeStyle = stroke; ctx.stroke();
}

// ─────────────────────────── briques HUD (verre) ───────────────────────────
// Puce d'une ligne, centrée en x ; renvoie la hauteur occupée.
function chip(ctx, L, text, cx, y, o = {}) {
  const { u, W } = L;
  let size = (o.size || (L.vertical ? 44 : 50)) * u;
  const family = o.family || SANS; const maxW = o.maxW || W * 0.86;
  for (;;) { ctx.font = font(size, o.weight || 'bold', family); if (ctx.measureText(text).width + 56 * u <= maxW || size < 18) break; size *= 0.92; }
  const w = ctx.measureText(text).width + 56 * u; const h = size * 1.75;
  const a = o.k == null ? 1 : easeOut(o.k);
  ctx.save(); ctx.globalAlpha = clamp(a);
  glass(ctx, cx - w / 2, y - (1 - a) * 24 * u, w, h, h / 2.6, { tint: o.tint, border: o.border, dark: o.dark });
  ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 8 * u;
  ctx.fillText(text, cx, y - (1 - a) * 24 * u + h / 2 + size * 0.04);
  ctx.restore();
  return h;
}

// Carte de verre avec un bloc de texte (titre + corps) ; renvoie la hauteur.
function card(ctx, L, y, o) {
  const { W, u } = L;
  const w = o.w || Math.min(W - 80 * u, L.vertical ? W - 80 * u : 1500 * u);
  const head = o.head ? 38 * u : 0;
  const bodySize = (o.size || (L.vertical ? 42 : 52)) * u;
  ctx.font = font(bodySize, 'bold', o.family || L.theme.family);
  const lines = wrap(ctx, o.body || '', w - 70 * u);
  const h = 28 * u + head + lines.length * bodySize * 1.2 + 24 * u;
  const a = easeOut(o.k == null ? 1 : o.k);
  ctx.save(); ctx.globalAlpha = clamp(a);
  const x = (W - w) / 2; const yy = y - (1 - a) * 30 * u;
  glass(ctx, x, yy, w, h, 26 * u, { tint: o.tint, border: o.border, dark: o.dark == null ? 0.26 : o.dark });
  if (o.head) { ctx.fillStyle = o.headColor || L.theme.accent; ctx.font = font(30 * u, 'bold', SANS); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.head, W / 2, yy + 30 * u); }
  ctx.fillStyle = o.color || '#fff'; ctx.font = font(bodySize, 'bold', o.family || L.theme.family); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8 * u;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, yy + 26 * u + head + bodySize * 0.6 + i * bodySize * 1.2));
  ctx.restore();
  return h;
}

function studyPanel(ctx, L, sc, k) {
  const { W, H, u, theme } = L;
  const w = W * 0.45; const h = 740 * u; const x = W - w - 40 * u; const y = 60 * u;
  glass(ctx, x, y, w, h, 24 * u, { tint: 'rgba(255,244,214,0.30)', dark: 0.34 });
  ctx.fillStyle = theme.accent; ctx.font = font(24 * u, 'bold', SANS); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('ÉTUDE RÉELLE', x + 30 * u, y + 34 * u);
  ctx.fillStyle = '#fff'; ctx.font = font(34 * u, 'bold', SERIF);
  ctx.fillText(`${sc.institution || ''} · ${sc.year || ''}`, x + 30 * u, y + 76 * u);
  ctx.fillStyle = '#e8dcc0'; ctx.font = font(22 * u, 'normal', SERIF, 'italic'); ctx.fillText(sc.authors || '', x + 30 * u, y + 114 * u);
  textBlock(ctx, sc.finding || '', x + 30 * u, y + 142 * u, w - 60 * u, 26 * u, { family: SERIF, weight: 'normal', color: '#fff', align: 'left', baseline: 'top', maxH: 130 * u, shadow: 6 * u });
  const vals = (sc.stat && sc.stat.values) || [];
  const gx = x + 50 * u; const gw = w - 100 * u; const gy = y + h - (sc.caveat ? 150 : 100) * u; const gh = h - (sc.caveat ? 560 : 500) * u;
  ctx.fillStyle = '#fff'; ctx.font = font(22 * u, 'bold', SANS); ctx.textAlign = 'left'; ctx.fillText((sc.stat && sc.stat.label) || '', gx, gy - gh - 26 * u);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gw, gy); ctx.stroke();
  const n = Math.max(1, vals.length); const slot = gw / n; const bw = Math.min(slot * 0.55, 150 * u);
  vals.forEach((v, i) => {
    const kk = easeInOut((k - 0.1 - i * 0.08) * 2.4);
    const val = clamp(Number(v.value) || 0, 0, 100); const bh = gh * (val / 100) * kk; const bx = gx + slot * i + (slot - bw) / 2;
    const grd = ctx.createLinearGradient(0, gy - bh, 0, gy); grd.addColorStop(0, i === vals.length - 1 ? '#ff4d5e' : '#f1c84b'); grd.addColorStop(1, '#8a6a12');
    ctx.fillStyle = grd; ctx.fillRect(bx, gy - bh, bw, bh);
    ctx.fillStyle = '#fff'; ctx.font = font(36 * u, 'bold', SANS); ctx.textAlign = 'center'; ctx.fillText(`${nf(Math.round(val * kk))}`, bx + bw / 2, gy - bh - 24 * u);
    ctx.font = font(20 * u, 'normal', SANS);
    wrap(ctx, v.name || '', slot * 0.95).slice(0, 2).forEach((l, j) => ctx.fillText(l, bx + bw / 2, gy + 26 * u + j * 24 * u));
  });
  if (sc.caveat) { ctx.globalAlpha = clamp((k - 0.5) * 4); textBlock(ctx, `Nuance : ${sc.caveat}`, x + w / 2, y + h - 40 * u, w - 60 * u, 20 * u, { family: SANS, weight: 'normal', style: 'italic', color: '#f5ecd7', maxH: 60 * u }); ctx.globalAlpha = 1; }
}

// ───────────────────── cartes de scène (par type) + overlays de beat ─────────────────────
function onscreenChips(ctx, L, sc, el, y0) {
  const lines = (sc.onscreen || []).slice(0, 3); let y = y0;
  lines.forEach((l, i) => {
    const h = chip(ctx, L, l, L.W / 2, y, { k: (el - i * 0.12) * 3.2, color: i === 0 ? L.theme.accent : '#fff', size: L.vertical ? 42 : 48 });
    y += h + 12 * L.u;
  });
}

function sceneCards(ctx, L, ep, sc, b, t, tl, ts) {
  const { W, H, u, theme } = L;
  const el = t - ts.start; const dur = Math.max(1, ts.end - ts.start); const k = clamp(el / dur);
  const y0 = L.topY; const cx = W / 2;
  switch (sc.type) {
    case 'hook':
      if (el < 7) card(ctx, L, y0, { body: ep.title, size: 50, k: el * 3, w: W * 0.8 });
      else onscreenChips(ctx, L, sc, el - 7, y0);
      break;
    case 'counter_focus': {
      const w = 980 * u; const h = 250 * u; const x = cx - w / 2;
      glass(ctx, x, y0, w, h, 30 * u, { tint: 'rgba(255,212,0,0.12)', border: 'rgba(255,212,0,0.7)', dark: 0.34 });
      ctx.fillStyle = theme.accent; ctx.font = font(30 * u, 'bold', MONO); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((ep.counter.label || 'COMPTEUR').toUpperCase(), cx, y0 + 38 * u);
      textBlock(ctx, counterText(ep.counter, t), cx, y0 + 125 * u, w - 80 * u, 110 * u, { family: MONO, color: '#fff', shadow: 20 * u, maxH: 130 * u });
      ctx.fillStyle = 'rgba(255,230,120,0.95)'; ctx.font = font(26 * u, 'normal', MONO);
      ctx.fillText(ep.counter.mode === 'exp' ? `× ${ep.counter.base || 2} / jour` : `+${nf(ep.counter.rate, ep.counter.rate < 1 ? 2 : 0)} ${ep.counter.unit || ''} / s`, cx, y0 + 214 * u);
      break;
    }
    case 'math': {
      const w = Math.min(1150 * u, W - 80 * u); const h = 270 * u; const x = cx - w / 2;
      glass(ctx, x, y0, w, h, 28 * u, { tint: 'rgba(120,180,255,0.12)', border: theme.accent, dark: 0.36 });
      textBlock(ctx, sc.equation || '', cx, y0 + 85 * u, w - 80 * u, 56 * u, { family: MONO, color: '#fff', maxH: 100 * u });
      const rk = easeOut((k - 0.2) * 3); ctx.globalAlpha = clamp(rk);
      textBlock(ctx, `= ${sc.result || ''}`, cx, y0 + 190 * u + (1 - rk) * 24 * u, w - 80 * u, 72 * u, { family: MONO, color: theme.accent, maxH: 100 * u });
      ctx.globalAlpha = 1;
      break;
    }
    case 'phase2':
      ctx.fillStyle = 'rgba(0,0,0,0.74)'; ctx.fillRect(0, 0, W, H);
      systemNotification(ctx, L, sc.alert || sc.title, el * 3, t, y0 + 20 * u);
      break;
    case 'rule':
      card(ctx, L, y0, { head: `RÈGLE N°${sc.number}`, body: sc.rule || '', size: 50, k: el * 3.5 });
      break;
    case 'study':
      studyPanel(ctx, L, sc, k);
      break;
    case 'quote':
      card(ctx, L, y0, { head: sc.author ? `— ${sc.author}` : '', body: `« ${sc.quote || ''} »`, size: 46, k: el * 3, family: SERIF });
      break;
    case 'day': {
      const h = chip(ctx, L, `JOUR ${sc.day}`, cx, y0, { size: 78, k: el * 4, color: '#fff', tint: 'rgba(255,61,127,0.28)', border: 'rgba(255,255,255,0.7)' });
      onscreenChips(ctx, L, { onscreen: (sc.onscreen || []).slice(0, 1) }, el, y0 + h + 14 * u);
      break;
    }
    case 'card_refused':
      chip(ctx, L, `${sc.item || ''}${sc.price ? ' — ' + sc.price : ''}`, cx, y0, { k: el * 3, size: 44 });
      stamp(ctx, cx, y0 + 230 * u, 'CARTE REFUSÉE', 92 * u, clamp((el - 0.5) * 2.2));
      break;
    case 'vidal':
      card(ctx, L, y0, { head: 'DOCTEUR VIDAL', body: (sc.line || '').slice(0, Math.floor(el * 30)) || ' ', size: 44, k: el * 4, headColor: '#9fe3ff', w: W * 0.66 });
      break;
    case 'gag':
      ctx.save(); ctx.translate(W - 330 * u, y0 + 170 * u); ctx.rotate(Math.sin(t * 2) * 0.04);
      burst(ctx, 0, 0, 150 * u * pop(el * 2.5), '#ffe66d', '#1b1b1b', u);
      textBlock(ctx, sc.caption || '', 0, 0, 260 * u, 34 * u, { color: '#1b1b1b', maxH: 190 * u });
      ctx.restore();
      break;
    case 'outro':
      onscreenChips(ctx, L, sc, el, y0);
      { const bk = pop((el - 0.3) * 3); const pw = 340 * u; const ph = 84 * u; ctx.save(); ctx.translate(W - 60 * u - pw / 2, L.safeY - 70 * u); ctx.scale(bk, bk);
        glass(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2, { tint: 'rgba(230,33,23,0.55)', border: 'rgba(255,255,255,0.8)', dark: 0.05 });
        ctx.fillStyle = '#fff'; ctx.font = font(34 * u); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText("S'ABONNER", 0, 2 * u); ctx.restore(); }
      break;
    default: // narration, tension, twist
      onscreenChips(ctx, L, sc, el, y0);
  }
}

// Overlays posés sur UN beat précis (visuals[].overlay) : le texte n'est jamais dessiné par l'IA.
function beatOverlay(ctx, L, b, t) {
  const o = b.overlay; if (!o) return;
  const { W, u } = L; const el = t - b.start; const y0 = L.topY + (L.vertical ? 0 : 0);
  switch (o.kind) {
    case 'stamp': stamp(ctx, W / 2, y0 + (L.vertical ? 240 : 190) * u, o.text, (L.vertical ? 66 : 84) * u, clamp(el * 2.4)); break;
    case 'banner': {
      const h = chip(ctx, L, o.text, W / 2, y0, { size: L.vertical ? 50 : 58, k: el * 3.5, tint: 'rgba(230,40,40,0.36)', border: 'rgba(255,150,150,0.85)', color: '#fff', dark: 0.3 });
      void h; break;
    }
    case 'phase2': ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, L.H); systemNotification(ctx, L, o.text || '', el * 3, t, y0); break;
    case 'chip': chip(ctx, L, o.text, W / 2, y0, { size: L.vertical ? 48 : 54, k: el * 3.5, color: o.color || L.theme.accent }); break;
    default:
  }
}

// ───────────────────────────── HUD permanent ─────────────────────────────
function levelAndDay(ep, tl, t, mode) {
  const days = (ep.scenes || []).map((s, i) => ({ s, tl: tl.scenes.find((x) => x.index === i) })).filter((d) => d.s.type === 'day' && d.tl);
  let day = 0; let prev = { t: 0, level: 0 };
  for (const d of days) if (d.tl.start <= t) { day = d.s.day; prev = { t: d.tl.start, level: d.s.level || 0 }; }
  let level = prev.level; const next = days.find((d) => d.tl.start > t);
  if (next) level = lerp(prev.level, next.s.level || prev.level, easeInOut((t - prev.t) / Math.max(1, next.tl.start - prev.t)) * 0.35);
  if (mode === 'short') { level = lerp(3, 87, t / tl.duration); day = Math.min(30, Math.floor(lerp(1, 30, t / tl.duration))); }
  return { day, level };
}

function hud(ctx, L, ep, tl, t, f, sc, ts, b) {
  const { W, u, theme, mode, vertical } = L; const y = L.hudY;
  if (ep.formula === 'etsilab' && ep.counter && !(mode === 'main' && sc && sc.type === 'counter_focus')) {
    const after = t >= L.phase2T; const w = (vertical ? 470 : 560) * u; const h = 122 * u; const x = W - w - 40 * u;
    glass(ctx, x, y, w, h, 26 * u, { tint: after ? 'rgba(255,40,40,0.16)' : 'rgba(255,255,255,0.12)', border: after ? 'rgba(255,110,110,0.9)' : 'rgba(255,255,255,0.55)', dark: 0.3 });
    ctx.fillStyle = after ? '#ff8a8a' : theme.accent; ctx.font = font(22 * u, 'bold', MONO); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${(ep.counter.label || '').toUpperCase()}${after ? ' · PHASE 2' : ''}`, x + 26 * u, y + 32 * u);
    ctx.fillStyle = '#fff'; ctx.font = font(52 * u, 'bold', MONO);
    ctx.fillText(counterText(ep.counter, mode === 'short' ? t * (ep.short.counter_speed || 9) : t), x + 26 * u, y + 82 * u);
  }
  if (ep.formula === 'izranoff') {
    ctx.save(); glass(ctx, 40 * u, y, 190 * u, 70 * u, 18 * u, { dark: 0.4 });
    ctx.fillStyle = '#ff4747'; ctx.font = font(40 * u, 'bold', MONO); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('03:17', 135 * u, y + 36 * u); ctx.restore();
    const n = mode === 'main' ? ((ep.scenes || []).filter((s, i) => s.type === 'rule' && (tl.scenes.find((x) => x.index === i) || { start: 1e9 }).start <= t).length) : Math.min(7, 1 + Math.floor((t / tl.duration) * 8));
    if (n) { const w = 230 * u; glass(ctx, W - w - 40 * u, y, w, 70 * u, 18 * u, { dark: 0.4 }); ctx.fillStyle = '#fff'; ctx.font = font(32 * u, 'bold', SANS); ctx.textAlign = 'center'; ctx.fillText(`RÈGLE ${n}/7`, W - w / 2 - 40 * u, y + 36 * u); }
  }
  if (ep.formula === '30jours') {
    const { day, level } = levelAndDay(ep, tl, t, mode);
    glass(ctx, 40 * u, y, 210 * u, 90 * u, 20 * u, { dark: 0.45 });
    ctx.fillStyle = '#fff'; ctx.font = font(52 * u, 'bold', MONO); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`J-${pad2(Math.max(0, 30 - day))}`, 145 * u, y + 46 * u);
    const bx = 280 * u; const bw = vertical ? W - bx - 40 * u : W * 0.36; const bh = 56 * u; const by = y + 17 * u;
    glass(ctx, bx, by, bw, bh, bh / 2, { dark: 0.45 });
    const lg = ctx.createLinearGradient(bx, 0, bx + bw, 0); lg.addColorStop(0, '#ff3d7f'); lg.addColorStop(1, '#ffd400');
    ctx.fillStyle = lg; rrect(ctx, bx + 5 * u, by + 5 * u, Math.max(44 * u, (bw - 10 * u) * level / 100), bh - 10 * u, (bh - 10 * u) / 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = font(26 * u, 'bold', SANS); ctx.textAlign = 'center'; ctx.lineWidth = 5 * u; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(`NIVEAU +${Math.round(level)} %`, bx + bw / 2, by + bh / 2 + 1 * u); ctx.fillText(`NIVEAU +${Math.round(level)} %`, bx + bw / 2, by + bh / 2 + 1 * u);
    // gag visuel toutes les 6 secondes (autocollants discrets ; le tampon reste unique)
    const gi = Math.floor(t / GAG_EVERY); const gl = t - gi * GAG_EVERY; const type = mode === 'main' ? sc && sc.type : 'short';
    if (gi > 0 && gl < 2.2 && !['card_refused', 'gag'].includes(type)) {
      const kind = gi % 3; const gx = vertical ? W * 0.78 : W - 260 * u; const gy = L.topY + (vertical ? 330 : 330) * u;
      ctx.save(); ctx.globalAlpha = clamp((2.2 - gl) * 4); const s = pop(gl * 3); ctx.translate(gx, gy); ctx.scale(s, s); ctx.rotate(0.06);
      if (kind === 0) stamp(ctx, 0, 0, 'CARTE REFUSÉE', 40 * u, gl * 1.6);
      else { glass(ctx, -190 * u, -42 * u, 380 * u, 84 * u, 42 * u, { tint: kind === 1 ? 'rgba(46,204,113,0.4)' : 'rgba(255,230,109,0.5)', dark: 0.12 });
        ctx.fillStyle = '#fff'; ctx.font = font(38 * u); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(kind === 1 ? `Niveau +${1 + (gi % 4)} %` : ['« Non. »', '« Hmm. »', '« Intéressant… »'][gi % 3], 0, 2 * u); }
      ctx.restore();
    }
  }
  // chapitre (film uniquement)
  if (mode === 'main' && ep.formula !== '30jours' && ep.formula !== 'izranoff' && ts && ts.title && t - ts.start < 4) {
    const a = clamp((t - ts.start) * 3) * clamp((4 - (t - ts.start)) * 2); ctx.save(); ctx.globalAlpha = a;
    ctx.font = font(26 * u, 'bold', SANS); const w = ctx.measureText(ts.title.toUpperCase()).width + 56 * u;
    glass(ctx, 40 * u, y, w, 64 * u, 16 * u, { dark: 0.4 }); ctx.fillStyle = theme.accent; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(ts.title.toUpperCase(), 66 * u, y + 33 * u); ctx.restore();
  }
}

function captions(ctx, L, tl, t) {
  const { W, H, u, vertical, theme } = L;
  const c = currentCue(tl, t); if (!c) return;
  const y = vertical ? H * 0.80 : H * 0.885; const maxW = W * (vertical ? 0.88 : 0.72); const size = (vertical ? 64 : 50) * u;
  ctx.font = font(size); const lines = wrap(ctx, c.text, maxW); const lh = size * 1.22; const tot = lines.length * lh;
  const k = easeOut((t - c.start) / 0.15);
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(lerp(0.94, 1, k), lerp(0.94, 1, k)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    const yy = -tot / 2 + lh / 2 + i * lh;
    ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.2; ctx.strokeStyle = '#000'; ctx.strokeText(l, 0, yy);
    ctx.fillStyle = vertical && i > 0 ? (theme.accent === '#ff3d7f' ? '#ffd400' : theme.accent) : '#fff'; ctx.fillText(l, 0, yy);
  });
  ctx.restore();
}

// Barre « film complet » du Short : bas-centre, sous les sous-titres, ne touche jamais les visages.
function ctaBar(ctx, L, ep, t, dur) {
  if (L.mode !== 'short' || t < dur - 5) return;
  const { W, H, u } = L; const k = pop((t - (dur - 5)) * 2.2); const w = Math.min(W - 80 * u, 900 * u); const h = 100 * u;
  ctx.save(); ctx.translate(W / 2, H - 118 * u); ctx.scale(k, k);
  glass(ctx, -w / 2, -h / 2, w, h, h / 2, { tint: 'rgba(230,33,23,0.42)', border: 'rgba(255,255,255,0.85)', dark: 0.1 });
  ctx.fillStyle = '#fff'; ctx.font = font(36 * u, 'bold', SANS); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`▶  ${ep.short.cta || 'Le film complet est sur la chaîne'}`, 0, 2 * u);
  ctx.restore();
}

// ─────────────────────────── caméra IA (Ken Burns) ───────────────────────────
function drawBeatImage(ctx, L, img, b, t, f) {
  const { W, H, u } = L; const k = clamp((t - b.start) / Math.max(0.5, b.end - b.start)); const fs = t - b.start;
  let zoom; let px = 0; let py = 0;
  switch (b.i % 4) {
    case 0: zoom = lerp(1.06, 1.22, easeInOut(k)); break;           // zoom-in centré
    case 1: zoom = lerp(1.14, 1.2, k); px = lerp(-1, 1, k); break;  // travelling gauche -> droite
    case 2: zoom = lerp(1.22, 1.06, easeInOut(k)); break;           // zoom-out
    default: zoom = lerp(1.06, 1.2, k); py = lerp(1, -1, k);        // pan vertical
  }
  if (fs < 0.3) zoom += 0.06 * (1 - fs / 0.3);                      // « punch » de caméra à chaque coupe
  const scale = Math.max(W / img.width, H / img.height) * zoom; const dw = img.width * scale; const dh = img.height * scale;
  const shake = fs < 0.28 ? (1 - fs / 0.28) * 16 * u : 0;           // tremblement de coupe
  const ox = -((dw - W) / 2) * 0.6 * px + (hash(f * 3) - 0.5) * 2 * shake;
  const oy = -((dh - H) / 2) * 0.6 * py + (hash(f * 5 + 1) - 0.5) * 2 * shake;
  ctx.imageSmoothingEnabled = !(STY.current && STY.current.crisp && img.__toon); // pixel art / lego : pas de lissage
  ctx.drawImage(img, (W - dw) / 2 + ox, (H - dh) / 2 + oy, dw, dh);
  if (fs < 0.16) { ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - fs / 0.16)})`; ctx.fillRect(0, 0, W, H); } // flash
}

function scrims(ctx, L) {
  const { W, H } = L;
  let g = ctx.createLinearGradient(0, 0, 0, H * 0.3); g.addColorStop(0, 'rgba(0,0,0,0.42)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.3);
  g = ctx.createLinearGradient(0, H * (L.vertical ? 0.68 : 0.72), 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.66)'); ctx.fillStyle = g; ctx.fillRect(0, H * 0.68, W, H * 0.32);
}

// ─────────────────────────────── rendu ───────────────────────────────
const assetsRoot = () => path.resolve(process.env.AI_ASSETS_DIR || path.join(ROOT, 'ai_assets'));

// Image d'un beat : fichier IA (ou réutilisé) -> Image ; scène d'info -> {info:true} (dessinée en direct) ;
// épisode entièrement sans image IA -> {toon:[3 canvases]} (3 dessins qui « bouillonnent » à 12 i/s).
async function loadBeatImage(ep, b) {
  STY.use(STY.styleFor(ep));
  const [w, h] = AI.SIZE[b.mode === 'short' ? 'short' : 'main'];
  if (b.live === 'info') { b.source = 'lemo:dataviz'; return { info: true, w, h }; }
  if (b.file) { try { return await loadImage(b.file); } catch (e) { b.file = null; b.source = 'lemo:scifi-toon'; } }
  b.source = 'lemo:scifi-toon';
  const backs = [];
  for (let d = 0; d < 3; d++) { const c = createCanvas(w, h); LEMO_TOON.drawToonBackdrop(c.getContext('2d'), w, h, ep, b, d); backs.push(c); }
  return { toon: { backs, work: createCanvas(w, h), w, h } };
}

// Décor (3 dessins mis en cache) + acteurs animés (marionnette) dessinés à chaque image -> canvas de travail.
function toonFrame(ep, b, im, st, drawing) {
  const t = im.toon; const wc = t.work.getContext('2d'); const sty = STY.current; wc.setTransform(1, 0, 0, 1, 0, 0); wc.globalCompositeOperation = 'source-over'; wc.globalAlpha = 1;
  if (sty && sty.base) sty.base(wc, t.w, t.h, st, drawing);                                  // fond du style (parallaxe, ardoise, velours, ville…)
  wc.drawImage(t.backs[drawing], 0, 0); LEMO_TOON.drawToonActors(wc, t.w, t.h, ep, b, drawing, st);
  if (sty && sty.post) sty.post(wc, t.w, t.h, { ...st, drawing, beatI: b.i, emo: LEMO_TOON.emoOf(b) }); // post-traitement du style (tramage, craie, bloom, briques…)
  t.work.__toon = true; return t.work;
}
const STILL_ST = (b) => ({ t: (b.start || 0) + 1, tb: 1, voice: 0.3, enter: 1, speaker: (b.i || 0) % 2 });

// Enveloppe de la voix (0..1 par image vidéo) pour la marionnette : rebond, ouverture de bouche.
function voiceEnvelope(file, fps) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { maxBuffer: 1 << 29 });
  if (r.status !== 0 || !r.stdout || !r.stdout.length) return new Float32Array(0);
  const buf = r.stdout; const n = Math.floor(buf.length / 2); const per = 8000 / fps; const frames = Math.ceil(n / per); const env = new Float32Array(frames);
  for (let f = 0; f < frames; f++) { let s = 0; let c = 0; for (let i = Math.floor(f * per); i < Math.min(n, Math.floor((f + 1) * per)); i++) { const v = buf.readInt16LE(i * 2) / 32768; s += v * v; c++; } env[f] = c ? Math.sqrt(s / c) : 0; }
  const sorted = Float32Array.from(env).sort(); const ref = Math.max(1e-4, sorted[Math.floor(sorted.length * 0.95)] || 1e-4);
  let y = 0; for (let f = 0; f < frames; f++) { const x = Math.min(1, env[f] / ref); y = x > y ? y + (x - y) * 0.6 : y + (x - y) * 0.25; env[f] = y; } // attaque rapide, relâchement doux
  return env;
}

function infoThumb(ep, b, tl) {
  const ts = tl.scenes.find((x) => x.index === b.scene); const sc = ts ? ep.scenes[ts.index] : { type: b.type }; const c = createCanvas(1344, 768); const is = STY.infoStyleFor(ep); LEMO_INFO.setTheme(is && is.info);
  LEMO_INFO.drawInfo(c.getContext('2d'), 1344, 768, ep, sc, { el: 9, tAbs: ts ? ts.start + 9 : 60, tsStart: ts ? ts.start : 0, tsEnd: ts ? ts.end : 10, days: [] }); if (is && is.infoPost) is.infoPost(c.getContext('2d'), 1344, 768); return c;
}
let _infoC = null; const infoCanvas = (w, h) => (_infoC && _infoC.width === w && _infoC.height === h ? _infoC : (_infoC = createCanvas(w, h)));

function makeImageStore(ep, beats) {
  const cache = new Map();
  return {
    async prepare(i) {
      for (const j of [i, i + 1]) if (j < beats.length && !cache.has(j)) cache.set(j, await loadBeatImage(ep, beats[j]));
      for (const k of [...cache.keys()]) if (k < i - 1) cache.delete(k);
    },
    get: (i) => cache.get(i),
  };
}

function beatIndexAt(beats, t) {
  let i = 0;
  while (i + 1 < beats.length && beats[i + 1].start <= t + 1e-6) i++;
  return i;
}

function makeFrameRenderer(ep, tl, mode, beats, store) {
  const vertical = mode === 'short';
  const W = vertical ? 1080 : 1920; const H = vertical ? 1920 : 1080;
  const canvas = createCanvas(W, H); const ctx = canvas.getContext('2d');
  const safeY = vertical ? 1100 : 820; // aucun tampon / carte / graphique sous cette ligne (zone sous-titres)
  const p2 = mode === 'main' ? tl.scenes.find((s) => ep.scenes[s.index].type === 'phase2') : null;
  const p2beat = beats.find((x) => x.overlay && x.overlay.kind === 'phase2');
  const L = { W, H, u: 1, theme: THEMES[ep.formula], vertical, mode, safeY, hudY: vertical ? 84 : 36, topY: vertical ? 232 : 176,
    phase2T: p2 ? p2.start : (p2beat ? p2beat.start : 1e9) };
  const draw = (f) => {
    const t = f / FPS; frame.stamps = 0; frame.safeY = safeY;
    const bi = beatIndexAt(beats, t); const b = beats[bi]; const img = store.get(bi);
    if (!img) throw new Error(`image du beat ${bi} non chargée`);
    if (img.info) {
      const ts0 = mode === 'main' ? tl.scenes.find((x) => x.index === b.scene) : null; const sc0 = ts0 ? ep.scenes[ts0.index] : { type: b.type };
      const days = (ep.scenes || []).map((s, i) => ({ s, tl: tl.scenes.find((x) => x.index === i) })).filter((d) => d.s.type === 'day' && d.tl).map((d) => ({ day: d.s.day, level: d.s.level || 0 }));
      const is = STY.infoStyleFor(ep); LEMO_INFO.setTheme(is && is.info); const tmp = infoCanvas(W, H); LEMO_INFO.drawInfo(tmp.getContext('2d'), W, H, ep, sc0, { el: t - (ts0 ? ts0.start : b.start), tAbs: t, tsStart: ts0 ? ts0.start : b.start, tsEnd: ts0 ? ts0.end : b.end, days });
      if (is && is.infoPost) is.infoPost(tmp.getContext('2d'), W, H);
      ctx.drawImage(tmp, 0, 0, W, H);
      const fs0 = t - b.start; if (fs0 < 0.16) { ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - fs0 / 0.16)})`; ctx.fillRect(0, 0, W, H); }
    } else if (img.toon) {
      const prev = beats[bi - 1]; const first = !prev || prev.scene !== b.scene; const env = store.env;
      const st = { t, tb: t - b.start, voice: env && env.length ? env[Math.min(env.length - 1, f)] : 0, enter: first ? clamp((t - b.start) / 1.1) : 1, speaker: (b.i || 0) % 2 };
      drawBeatImage(ctx, L, toonFrame(ep, b, img, st, Math.floor(t * 12) % 3), b, t, f);
    } else drawBeatImage(ctx, L, img, b, t, f);
    if (ep.formula === 'izranoff' && t >= tl.duration - (mode === 'main' ? TWIST_WINDOW : 12)) {
      ctx.fillStyle = `rgba(160,0,20,${0.14 + 0.07 * Math.sin(t * 7)})`; ctx.fillRect(0, 0, W, H);
      if (hash(f) > 0.78) for (let i = 0; i < 6; i++) { const sy = hash(f + i) * H; const sh = 10 + hash(f * 3 + i) * 60; const dx = (hash(f * 5 + i) - 0.5) * 90; ctx.drawImage(canvas, 0, sy, W, sh, dx, sy, W, sh); }
    }
    scrims(ctx, L);
    let sc = null; let ts = null;
    if (mode === 'main') { ts = tl.scenes[sceneAt(tl, t)]; sc = ep.scenes[ts.index]; }
    if (mode === 'main') sceneCards(ctx, L, ep, sc, b, t, tl, ts);
    else if (t < 3.2) card(ctx, L, L.topY, { body: ep.short.hook_text || ep.title, size: 60, k: t * 3.5 });
    beatOverlay(ctx, L, b, t);
    hud(ctx, L, ep, tl, t, f, sc, ts, b);
    if (ep.formula === 'izranoff' && mode === 'main' && t >= tl.duration - TWIST_WINDOW && t < tl.duration - TWIST_WINDOW + 3.5) {
      const g = t - (tl.duration - TWIST_WINDOW); ctx.globalAlpha = clamp(g * 3) * clamp((3.5 - g) * 2);
      textBlock(ctx, 'PLOT TWIST', W / 2, H * 0.42, W, 120, { color: '#ff2d2d', shadow: 30, family: MONO }); ctx.globalAlpha = 1;
    }
    if (mode === 'main') { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 0, W, 8); ctx.fillStyle = L.theme.accent; ctx.fillRect(0, 0, W * (t / tl.duration), 8); }
    if (process.env.BURN_SUBS !== '0') captions(ctx, L, tl, t);
    ctaBar(ctx, L, ep, t, tl.duration);
    const fade = Math.min(t / 0.5, (tl.duration - t) / 0.8);
    if (fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - clamp(fade)})`; ctx.fillRect(0, 0, W, H); }
    return canvas;
  };
  return { W, H, draw };
}

function readTimeline(id, mode) {
  const f = path.join(buildDir(id), mode, 'timeline.json');
  if (!fs.existsSync(f)) throw new Error(`timeline absente: ${f} (lancer tts d'abord)`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}
function readBeats(id, mode) {
  const f = path.join(buildDir(id), mode, 'beats.json');
  if (!fs.existsSync(f)) throw new Error(`beats absents: ${f} (lancer "all")`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

// Étalonnage commun (LUT 3D + vignette) appliqué à TOUTES les images : IA, réutilisées, dessinées -> transitions homogènes.
const GRADE_VF = `lut3d=file=${path.join(__dirname, 'lemo', 'grade.cube')},vignette=angle=PI/5:mode=backward:eval=init,noise=alls=6:allf=t`;

async function render(id, mode, preview) {
  const ep = loadEpisode(id); const tl = readTimeline(id, mode); const beats = readBeats(id, mode);
  const audio = path.join(buildDir(id), mode, 'mix.wav'); const out = path.join(buildDir(id), `${mode}.mp4`);
  const store = makeImageStore(ep, beats); store.env = voiceEnvelope(path.join(buildDir(id), mode, 'narration.wav'), FPS);
  const { W, H, draw } = makeFrameRenderer(ep, tl, mode, beats, store);
  const total = Math.ceil((preview ? Math.min(preview, tl.duration) : tl.duration) * FPS);
  const ff = spawn('ffmpeg', [
    '-hide_banner', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-', '-i', audio,
    '-vf', GRADE_VF, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', process.env.X264_PRESET || 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-g', String(FPS * 2), '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart', '-shortest', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg code ${c}`)))));
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await store.prepare(beatIndexAt(beats, f / FPS));
    const buf = draw(f).toBuffer('raw');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % (FPS * 30) === 0) console.log(`  [${mode}] ${fmtClock(f / FPS)} / ${fmtClock(total / FPS)}  ${(f / Math.max((Date.now() - t0) / 1000, 0.001)).toFixed(1)} fps`);
  }
  ff.stdin.end(); await done;
  console.log(`OK render ${mode}: ${out} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  return out;
}

async function still(id, mode, t) {
  const ep = loadEpisode(id); const tl = readTimeline(id, mode); const beats = readBeats(id, mode);
  const store = makeImageStore(ep, beats); await store.prepare(beatIndexAt(beats, t));
  const { draw } = makeFrameRenderer(ep, tl, mode, beats, store);
  const out = path.join(buildDir(id), `still_${mode}_${String(t).replace('.', '_')}.png`);
  fs.writeFileSync(out, draw(Math.round(t * FPS)).toBuffer('image/png')); console.log(out);
}

// ───────────────────────────── miniature (image IA + texte moteur) ─────────────────────────────
async function thumbnail(id, opts = {}) {
  frame.stamps = 0; frame.safeY = 1e9;
  const ep = loadEpisode(id); const W = 1280; const H = 720; const theme = THEMES[ep.formula];
  const th = ep.thumbnail || {};
  const tj = AI.thumbJob(ep); const assets = opts.assetsDir || assetsRoot();
  if (opts.mockAi && !AI.assetOk(assets, tj.name)) AI.resolveBeats([tj], assets, { mock: true });
  tj.file = AI.assetOk(assets, tj.name) ? path.join(assets, tj.name) : null;
  tj.source = tj.file ? (AI.readSources(assets)[tj.name] || (opts.mockAi ? 'mock' : 'existant')) : 'lemo:scifi-toon';
  if (!tj.file && opts.thumbFallback) { tj.file = opts.thumbFallback; tj.source = 'reuse'; }
  fs.writeFileSync(path.join(buildDir(id), 'thumb_source.json'), JSON.stringify({ name: tj.name, source: tj.source }));
  const bgImg = await loadBeatImage(ep, { ...tj, mode: 'thumb', type: ep.scenes[0].type });
  const c = createCanvas(W, H); const ctx = c.getContext('2d'); const L = { W, H, u: 0.67, theme, vertical: false, mode: 'thumb' };
  const img = bgImg.toon ? toonFrame(ep, tj, bgImg, STILL_ST(tj), 0) : bgImg; const sc = Math.max(W / img.width, H / img.height); ctx.drawImage(img, (W - img.width * sc) / 2, (H - img.height * sc) / 2, img.width * sc, img.height * sc);
  const g = ctx.createLinearGradient(0, 0, W * 0.65, 0); g.addColorStop(0, 'rgba(0,0,0,0.72)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const accent = th.accent || theme.accent;
  textBlock(ctx, th.line1 || ep.title, 44, H * 0.1, W * 0.56, 124, { align: 'left', baseline: 'top', color: '#fff', stroke: '#000', maxH: H * 0.56, lineH: 1.04 });
  if (th.line2) { ctx.font = font(46); const w = Math.min(ctx.measureText(th.line2).width + 44, W * 0.58); ctx.fillStyle = accent; rrect(ctx, 44, H * 0.78, w, 84, 14); ctx.fill(); textBlock(ctx, th.line2, 66, H * 0.78 + 42, w - 44, 46, { align: 'left', color: '#000', maxH: 76 }); }
  if (ep.formula === 'etsilab' && ep.counter) {
    glass(ctx, W - 410, 36, 370, 112, 24, { dark: 0.35 }); ctx.fillStyle = accent; ctx.font = font(22, 'bold', MONO); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText((ep.counter.label || '').toUpperCase(), W - 388, 68);
    ctx.fillStyle = '#fff'; ctx.font = font(48, 'bold', MONO); ctx.fillText(counterText(ep.counter, 243), W - 388, 114);
    glass(ctx, W - 410, 168, 370, 84, 20, { tint: 'rgba(255,40,40,0.2)', border: 'rgba(255,100,100,0.9)', dark: 0.5 }); warningIcon(ctx, W - 368, 210, 54, '#ff2d2d'); ctx.fillStyle = '#fff'; ctx.font = font(40, 'bold', MONO); ctx.fillText('PHASE 2', W - 322, 212);
  } else if (ep.formula === 'izranoff') { chip(ctx, L, '7 RÈGLES', W * 0.82, 40, { size: 56, color: '#ff4747' }); }
  else if (ep.formula === '30jours') { chip(ctx, L, 'J-30', W * 0.86, 40, { size: 64, color: '#fff', tint: 'rgba(255,61,127,0.3)' }); }
  const out = path.join(buildDir(id), 'thumbnail.png'); fs.writeFileSync(out, c.toBuffer('image/png'));
  console.log(`OK thumbnail: ${out}`); return out;
}

// ───────────────────────────── métadonnées ─────────────────────────────
function chaptersFrom(tl) {
  const ch = [];
  for (const s of tl.scenes) {
    const start = ch.length ? s.start : 0;
    if (ch.length && start - ch[ch.length - 1].start < 12) continue; // YouTube : chapitres >= 10 s
    ch.push({ start, title: s.title || s.type });
  }
  return ch.map((c) => `${fmtClock(c.start)} ${c.title}`).join('\n');
}

function measureLufs(file) {
  if (!fs.existsSync(file)) return null;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /I:\s+(-?[\d.]+) LUFS[\s\S]*?Peak:\s+(-?[\d.]+) dBFS/.exec(r.stderr.split('Summary:').pop() || '');
  return m ? { i: m[1], tp: m[2] } : null;
}

function metadata(id) {
  const ep = loadEpisode(id);
  const tlMain = readTimeline(id, 'main');
  const tlShort = fs.existsSync(path.join(buildDir(id), 'short', 'timeline.json')) ? readTimeline(id, 'short') : null;
  const yt = ep.youtube || {};
  const lm = measureLufs(path.join(buildDir(id), 'main', 'mix.wav'));
  const ls = measureLufs(path.join(buildDir(id), 'short', 'mix.wav'));
  const md = `# Épisode ${pad2(ep.id)} — ${ep.title}

Formule : \`${ep.formula}\` · Voix : ${tlMain.voice} · Durée film : ${fmtClock(tlMain.duration)}${tlShort ? ` · Short : ${tlShort.duration.toFixed(1)} s` : ''}

## Film (16:9 · 1920x1080)

**Titre**

${yt.title || ep.title}

**Description**

${yt.description || ''}

Chapitres :
${chaptersFrom(tlMain)}

**Tags**

${(yt.tags || []).join(', ')}

**Commentaire épinglé**

${yt.pinned_comment || ''}

## Short (9:16 · 1080x1920)

**Titre**

${(ep.short && ep.short.hook_text) || ''} #shorts

**Description**

${ep.short ? ep.short.narration.split(/(?<=[.!?…])\s+/).slice(0, 2).join(' ') : ''}
${ep.short && ep.short.cta ? ep.short.cta : ''} → « ${yt.title || ep.title} »

#shorts ${(yt.tags || []).slice(0, 3).map((x) => '#' + x.replace(/[^\p{L}\p{N}]/gu, '')).join(' ')}

## Fichiers

- \`ep${pad2(id)}_main_1920x1080.mp4\` — film (H.264 / AAC 48 kHz)${lm ? ` · ${lm.i} LUFS, crête ${lm.tp} dBFS` : ''}
- \`ep${pad2(id)}_short_1080x1920.mp4\` — Short${ls ? ` · ${ls.i} LUFS, crête ${ls.tp} dBFS` : ''}
- \`ep${pad2(id)}_fr.srt\` — sous-titres français du film (à importer dans YouTube Studio)
- \`ep${pad2(id)}_short_fr.srt\` — sous-titres du Short
- \`ep${pad2(id)}_thumbnail.png\` — miniature 1280x720
`;
  const out = path.join(buildDir(id), 'youtube_metadata.md');
  fs.writeFileSync(out, md);
  console.log(`OK metadata: ${out}`);
  return out;
}

// ───────────────────────────── pipeline ─────────────────────────────
async function all(id, opts) {
  const ep = loadEpisode(id);
  const { validate } = require('./validateEpisodes');
  const v = validate(ep);
  if (v.errs.length) throw new Error(`épisode ${id} invalide:\n - ${v.errs.join('\n - ')}`);
  const b = buildDir(id);
  fs.mkdirSync(b, { recursive: true });
  const epFile = path.join(ROOT, 'episodes', `ep${pad2(id)}.json`);
  const assets = opts.mockAi ? path.join(b, 'mock_assets') : assetsRoot();
  const t0 = Date.now(); const allBeats = []; const perMode = {}; const tls = {};
  for (const mode of ['main', 'short']) {
    const out = path.join(b, mode);
    sh('python3', [path.join(ROOT, 'scripts', 'tts.py'), epFile, '--mode', mode, '--out', out, ...(opts.mock ? ['--mock'] : [])]);
    tls[mode] = readTimeline(id, mode);
    let beats = AI.buildBeats(ep, tls[mode], mode);
    if (opts.preview) beats = beats.filter((x) => x.start < opts.preview + 0.5);
    AI.resolveBeats(beats, assets, { mock: opts.mockAi });
    perMode[mode] = beats; allBeats.push(...beats);
  }
  // Politique de secours (Lemo-Opuscar) : image manquante -> réutiliser une image IA voisine ; AUCUNE image IA -> épisode entier en « scifi-toon ».
  const tstub = AI.thumbJob(ep);
  if (opts.mockAi && !AI.assetOk(assets, tstub.name)) AI.resolveBeats([tstub], assets, { mock: true });
  tstub.file = AI.assetOk(assets, tstub.name) ? path.join(assets, tstub.name) : null;
  const pol = AI.applyPolicy([perMode.main, perMode.short], tstub);
  console.log(`  politique d'images : ${pol.wholeEpisodeToon ? 'AUCUNE image IA -> épisode entier dessiné en scifi-toon (Lemo)' : 'images IA (+ réutilisation des manquantes)'}`);
  for (const mode of ['main', 'short']) {
    const out = path.join(b, mode); const tl = tls[mode]; const beats = perMode[mode];
    fs.writeFileSync(path.join(out, 'beats.json'), JSON.stringify(beats, null, 1));
    await AI.contactSheet(beats, path.join(b, `${mode}_contact_sheet.jpg`), (x) => loadBeatImage(ep, x).then((im) => (im.info ? infoThumb(ep, x, tl) : im.toon ? toonFrame(ep, x, im, STILL_ST(x), 0) : im)));
    sh('python3', [path.join(ROOT, 'scripts', 'sfx.py'), path.join(out, 'beats.json'), String(tl.duration), path.join(out, 'sfx.wav')]);
    sh('python3', [path.join(ROOT, 'scripts', 'mix.py'), path.join(out, 'narration.wav'), ep.formula, path.join(out, 'mix.wav'), path.join(out, 'sfx.wav')]);
  }
  const main = await render(id, 'main', opts.preview);
  const short = await render(id, 'short', opts.preview);
  const thumb = await thumbnail(id, { mockAi: opts.mockAi, assetsDir: assets, thumbFallback: tstub.source === 'reuse' ? tstub.file : null });
  const meta = metadata(id);

  const d = distDir(id);
  fs.mkdirSync(d, { recursive: true });
  const P = `ep${pad2(id)}`;
  const copies = [
    [main, `${P}_main_1920x1080.mp4`],
    [short, `${P}_short_1080x1920.mp4`],
    [path.join(b, 'main', 'subtitles.srt'), `${P}_fr.srt`],
    [path.join(b, 'short', 'subtitles.srt'), `${P}_short_fr.srt`],
    [meta, `${P}_youtube_metadata.md`],
    [thumb, `${P}_thumbnail.png`],
    [path.join(b, 'main_contact_sheet.jpg'), `${P}_ai_frames_main.jpg`],
    [path.join(b, 'short_contact_sheet.jpg'), `${P}_ai_frames_short.jpg`],
  ];
  // Rapport des sources d'images : IA (kaggle / api:*) ou dessin par code ; les dessins par code ne sont PAS dans ai_assets/,
  // donc ils réapparaissent dans jobs.json (make_jobs.js) au prochain passage et seront retentés par IA.
  const ts = JSON.parse(fs.readFileSync(path.join(b, 'thumb_source.json'), 'utf8'));
  const imgs = [...allBeats.map((x) => ({ name: x.name, source: x.source })), ts];
  const counts = {}; imgs.forEach((x) => { counts[x.source] = (counts[x.source] || 0) + 1; });
  const report = { episode: id, status: 'DONE', seconds: Math.round((Date.now() - t0) / 1000), images: imgs.length, sources: counts,
    drawnInStyle: imgs.filter((x) => String(x.source).startsWith('lemo:')).map((x) => x.name) };
  fs.writeFileSync(path.join(b, 'sources.json'), JSON.stringify({ ...report, detail: imgs }, null, 1));
  copies.push([path.join(b, 'sources.json'), `${P}_image_sources.json`]);
  for (const [src, name] of copies) fs.copyFileSync(src, path.join(d, name));
  console.log(`  sources d'images : ${JSON.stringify(counts)}${report.drawnInStyle.length ? `  (${report.drawnInStyle.length} dessinées dans le style Lemo)` : ''}`);
  console.log(`\n✓ Épisode ${P} prêt → ${d}`);
  fs.readdirSync(d).forEach((f) => console.log(`   ${f}  ${(fs.statSync(path.join(d, f)).size / 1e6).toFixed(1)} Mo`));
}

async function main() {
  const a = args();
  const cmd = a._[0] || 'all';
  const id = Number(a.episode || a._[1]);
  if (!id) throw new Error('--episode N requis');
  const preview = a.preview ? Number(a.preview) : 0;
  const mockAi = !!(a['mock-ai'] || a.offline || process.env.AI_MOCK === '1');
  if (cmd === 'all') return all(id, { mock: !!(a.mock || a.offline), mockAi, preview });
  if (cmd === 'render') return render(id, a.mode || 'main', preview);
  if (cmd === 'thumbnail') return thumbnail(id, { mockAi });
  if (cmd === 'metadata') return metadata(id);
  if (cmd === 'still') return still(id, a.mode || 'main', Number(a.t || 0));
  throw new Error(`commande inconnue: ${cmd}`);
}

if (require.main === module) {
  main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}

module.exports = { THEMES, counterValue, counterText, makeFrameRenderer };
