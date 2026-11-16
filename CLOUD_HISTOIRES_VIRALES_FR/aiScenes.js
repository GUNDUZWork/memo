'use strict';
/*
 * aiScenes.js — « Scene-per-Beat » : chaque groupe de phrases (beat ~4-5 s) = UNE illustration IA.
 *
 * Le moteur NE télécharge PLUS rien lui-même. Chaîne de production des images :
 *   1. make_jobs.js        -> jobs.json (images manquantes seulement : ce qui est déjà dans ai_assets/ est ignoré)
 *   2. kaggle_run.sh       -> Kaggle (GPU T4) lit jobs.json, génère, écrit out/ -> ai_assets/       [source « kaggle »]
 *   3. fallback_generate.py-> Cloudflare Workers AI, Hugging Face, Pollinations (clés par variables d'env)
 *   4. dernier recours     -> le moteur dessine par code (codeFallback.js) ; jamais enregistré dans ai_assets/,
 *                             donc ré-émis dans jobs.json au passage suivant.
 *
 * Le nombre de beats ne dépend que du texte (≈ 13 mots / beat) : jobs.json peut donc être produit AVANT la voix.
 */
const fs = require('fs');
const path = require('path');

const STYLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'aiStyle.json'), 'utf8')).scene; // tarz cümlesi : tek yer
const PROJECT = 'histoires_fr';
const WORDS_PER_BEAT = Number(process.env.WORDS_PER_BEAT || 13);
const SIZE = { main: [1344, 768], short: [768, 1344], thumb: [1344, 768] };
const MIN_BYTES = 15000;
const INFO_TYPES = new Set(['counter_focus', 'math', 'study', 'day']);   // = lemo/info.js INFO_TYPES (dupliqué : make_jobs.js tourne sans le module canvas)

// Variantes de cadrage : l'image change vraiment d'un beat à l'autre au sein d'une même scène.
const SHOTS = [
  'wide establishing shot showing the whole location',
  'extreme close-up on the face showing strong emotion',
  'over-the-shoulder shot',
  'low angle dramatic shot',
  'close-up on the hands and the phone screen detail',
  'medium shot with dynamic body language',
  'high angle shot looking down',
  'profile side view, cinematic rim light',
  'dutch angle tension shot',
  'wide shot from behind the character',
];

const pad2 = (n) => String(n).padStart(2, '0');
const pad3 = (n) => String(n).padStart(3, '0');
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const asVisual = (v) => (typeof v === 'string' ? { p: v } : v);
const nWords = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

function findPhrase(words, phrase, from) {
  const target = norm(phrase).split(' ').filter(Boolean);
  if (!target.length) return null;
  const toks = words.map((w) => norm(w.w));
  for (let i = from; i < words.length; i++) {
    let j = 0; let k = i;
    while (j < target.length && k < words.length) {
      if (toks[k] === '') { k++; continue; }
      if (toks[k] !== target[j]) break;
      j++; k++;
    }
    if (j === target.length) return { i, t: words[i].t };
  }
  return null;
}

const jobName = (ep, mode, i) => `${PROJECT}/ep${pad2(ep.id)}/${mode === 'thumb' ? 'thumb' : `${mode}_${pad3(i)}`}.png`;

/** Plan des beats SANS timing (ne dépend que du texte). */
function planBeats(ep, mode) {
  const out = [];
  const push = (b) => out.push({ i: out.length, mode, ...b });
  const [w, h] = SIZE[mode];
  if (mode === 'short') {
    const vis = (ep.short.visuals || []).map(asVisual);
    if (!vis.length) throw new Error(`ep${ep.id}: short.visuals manquant (prompts IA du Short)`);
    vis.forEach((v, j) => push({ scene: 0, type: 'short', raw: v.p, at: v.at || null, overlay: v.overlay || null, seed: ep.id * 1000 + 900 + j, sceneStart: j === 0, width: w, height: h }));
  } else {
    ep.scenes.forEach((scene, si) => {
      let vis;
      if (Array.isArray(scene.visuals) && scene.visuals.length) vis = scene.visuals.map(asVisual);
      else if (scene.visual) {
        const n = Math.max(1, Math.round(nWords(scene.narration) / WORDS_PER_BEAT));
        vis = Array.from({ length: n }, (_, j) => ({ p: `${scene.visual}, ${SHOTS[(out.length + j) % SHOTS.length]}` }));
      } else throw new Error(`ep${ep.id} scène ${si} (${scene.type}) : ni "visual" ni "visuals" — prompts IA manquants`);
      if (scene.overlay) { const o = scene.overlay; const k = Math.min(o.beat || 0, vis.length - 1); if (!vis[k].overlay) vis[k] = { ...vis[k], overlay: { kind: o.kind, text: o.text } }; }
      vis.forEach((v, j) => push({ scene: si, type: scene.type, raw: v.p, at: v.at || null, overlay: v.overlay || null, seed: ep.id * 1000 + si * 10 + (j % 7), sceneStart: j === 0, width: w, height: h }));
    });
  }
  out.forEach((b) => { b.name = jobName(ep, mode, b.i); b.prompt = `${STYLE}, ${b.raw}`; if (mode === 'main' && INFO_TYPES.has(b.type)) b.live = 'info'; });
  return out;
}

/** Beats + timing (voix réelle) : même plan, avec start/end. */
function buildBeats(ep, tl, mode) {
  const beats = planBeats(ep, mode);
  const words = tl.words || [];
  const place = (group, a, b, wordsIn) => {
    let cursor = 0; const starts = [];
    group.forEach((v, j) => {
      let t = a + ((b - a) * j) / group.length;
      if (v.at && wordsIn.length) { const hit = findPhrase(wordsIn, v.at, cursor); if (hit) { t = hit.t; cursor = hit.i; } }
      starts.push(j === 0 ? a : t);
    });
    for (let j = 1; j < starts.length; j++) if (starts[j] <= starts[j - 1] + 1.2) starts[j] = Math.min(b - 0.2, starts[j - 1] + 1.2);
    group.forEach((v, j) => { v.start = starts[j]; v.end = j + 1 < group.length ? starts[j + 1] : b; });
  };
  if (mode === 'short') { place(beats, 0, tl.duration, words); return beats; }
  tl.scenes.forEach((ts, si) => {
    const group = beats.filter((x) => x.scene === ts.index);
    const a = si === 0 ? 0 : ts.start; const b = si + 1 < tl.scenes.length ? tl.scenes[si + 1].start : tl.duration;
    place(group, a, b, words.filter((w) => w.t >= a - 0.01 && w.t < b));
  });
  return beats;
}

function thumbJob(ep) {
  const th = ep.thumbnail || {};
  const raw = `${th.visual || ep.scenes[0].visual}, extreme dramatic close-up, shocked expression, high contrast, bold saturated colors, main subject on the right half of the frame, empty space on the left half`;
  const [width, height] = SIZE.thumb;
  return { mode: 'thumb', i: 0, name: jobName(ep, 'thumb', 0), prompt: `${STYLE}, ${raw}`, width, height, seed: ep.id * 1000 + 777, type: 'thumb' };
}

// ─────────────────────────────── ai_assets/ ───────────────────────────────
const assetOk = (assetsDir, name) => { try { return fs.statSync(path.join(assetsDir, name)).size > MIN_BYTES; } catch (e) { return false; } };

function readSources(assetsDir) {
  try { return JSON.parse(fs.readFileSync(path.join(assetsDir, '_sources.json'), 'utf8')); } catch (e) { return {}; }
}

/** Entrées de jobs.json pour un épisode : toutes les images ABSENTES de ai_assets/. */
function jobsFor(ep, assetsDir) {
  const all = [...planBeats(ep, 'main'), ...planBeats(ep, 'short'), thumbJob(ep)];
  return all.filter((b) => !b.live && !assetOk(assetsDir, b.name))   // info scenes are drawn live: no AI image requested
    .map((b) => ({ name: b.name, prompt: b.prompt, width: b.width, height: b.height, is_sprite: false, seed: b.seed }));
}

/** Associe chaque beat à son fichier ai_assets/ (b.file = null si absent). Aucun dessin ici : voir applyPolicy(). */
function resolveBeats(beats, assetsDir, { mock = false } = {}) {
  const src = readSources(assetsDir);
  for (const b of beats) {
    if (b.live) { b.file = null; b.source = 'lemo:dataviz'; continue; }
    if (mock && !assetOk(assetsDir, b.name)) writeMock(path.join(assetsDir, b.name), b);
    if (assetOk(assetsDir, b.name)) { b.file = path.join(assetsDir, b.name); b.source = mock ? 'mock' : (src[b.name] || 'existant'); } else { b.file = null; b.source = 'missing'; }
  }
  return beats;
}

/**
 * Politique des images manquantes (jamais de mélange IA / dessin dans un même épisode) :
 *  - scènes d'information (math, counter_focus, study, day) : toujours dessinées en direct (style « Data Storytelling ») ;
 *  - aucune image IA pour l'épisode  -> TOUT l'épisode (film + Short + miniature) est dessiné dans le style de secours (« Sci-Fi Sitcom Toon ») ;
 *  - au moins une image IA            -> une image manquante réutilise une image IA voisine (même scène d'abord) ; JAMAIS de dessin.
 * `groups` = [beatsMain, beatsShort] ; `thumb` = beat de miniature. Renvoie un résumé.
 */
// Décision du projet : plus aucune image IA (ni Kaggle, ni Colab, ni API gratuite). Tout est dessiné par code dans le style Lemo-Opuscar.
// USE_AI_IMAGES=1 réactive l'ancienne politique (réutilisation / épisode entier en toon si aucune image).
const LEMO_ONLY = process.env.USE_AI_IMAGES !== '1';

function applyPolicy(groups, thumb) {
  if (LEMO_ONLY) {
    for (const arr of groups) for (const b of arr) { if (!b.live) { b.file = null; b.source = 'lemo:scifi-toon'; } }
    if (thumb) { thumb.file = null; thumb.source = 'lemo:scifi-toon'; }
    return { wholeEpisodeToon: true };
  }
  const real = (b) => !b.live;
  const all = groups.flat().filter(real);
  const haveAI = all.some((b) => b.file) || (thumb && thumb.file);
  const wholeEpisodeToon = !haveAI;
  for (const arr of groups) {
    for (const b of arr) {
      if (!real(b) || b.file) continue;
      if (wholeEpisodeToon) { b.source = 'lemo:scifi-toon'; continue; }
      const sameScene = arr.filter((x) => x.file && x.scene === b.scene);
      const pool = sameScene.length ? sameScene : arr.filter((x) => x.file);
      const donor = (pool.length ? pool : all.filter((x) => x.file)).sort((p, q) => Math.abs(p.i - b.i) - Math.abs(q.i - b.i))[0];
      b.file = donor.file; b.source = 'reuse';
    }
  }
  if (thumb && !thumb.file) {
    if (wholeEpisodeToon) thumb.source = 'lemo:scifi-toon';
    else { const d = groups[0].find((x) => x.file) || groups[1].find((x) => x.file); thumb.file = d.file; thumb.source = 'reuse'; }
  }
  return { wholeEpisodeToon };
}

function writeMock(file, beat) {
  const { createCanvas } = require('canvas');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const c = createCanvas(beat.width, beat.height); const x = c.getContext('2d'); const hue = (beat.seed * 47) % 360;
  const g = x.createLinearGradient(0, 0, beat.width, beat.height); g.addColorStop(0, `hsl(${hue},55%,28%)`); g.addColorStop(1, `hsl(${(hue + 60) % 360},65%,48%)`);
  x.fillStyle = g; x.fillRect(0, 0, beat.width, beat.height);
  for (let k = 0; k < 400; k++) { x.fillStyle = `hsla(${(k * 37) % 360},70%,60%,0.25)`; x.fillRect((k * 233 + beat.seed * 31) % beat.width, (k * 157 + beat.seed * 17) % beat.height, 160, 100); }
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `bold ${Math.round(beat.height * 0.07)}px "DejaVu Sans"`; x.fillText(`MOCK #${beat.i}`, beat.width / 2, beat.height / 2);
  fs.writeFileSync(file, c.toBuffer('image/png'));
}

async function contactSheet(beats, out, loader, cols = 6) {
  const { createCanvas } = require('canvas');
  const tw = 320; const th = beats[0] && beats[0].mode === 'short' ? 568 : 180; const lab = 26;
  const rows = Math.ceil(beats.length / cols);
  const c = createCanvas(cols * tw, rows * (th + lab)); const x = c.getContext('2d');
  x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
  for (const b of beats) {
    const cx = (b.i % cols) * tw; const cy = Math.floor(b.i / cols) * (th + lab);
    try { x.drawImage(await loader(b), cx, cy, tw - 4, th); } catch (e) { /* case vide */ }
    x.fillStyle = b.file || b.live ? '#fff' : '#ff7b7b'; x.font = 'bold 15px "DejaVu Sans"'; x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillText(`#${b.i} ${b.start != null ? b.start.toFixed(1) + 's' : ''} ${b.type} [${b.source}]`, cx + 4, cy + th + lab / 2);
  }
  fs.writeFileSync(out, c.toBuffer('image/jpeg', { quality: 0.82 }));
  return out;
}

module.exports = { applyPolicy, STYLE, SHOTS, PROJECT, SIZE, planBeats, buildBeats, thumbJob, jobsFor, resolveBeats, assetOk, readSources, contactSheet, findPhrase, jobName };
