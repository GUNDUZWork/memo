#!/usr/bin/env node
// Validates episodes/epXX.json against the formula contracts in EPISODE_SCHEMA.md.
// Usage: node validateEpisodes.js [1 2 3 ...]   (no args = all files)
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'episodes');
const words = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;
const COMMON = ['hook', 'narration', 'outro'];
const TYPES = {
  etsilab: ['counter_focus', 'math', 'phase2'],
  homodeus: ['rule', 'study', 'quote'],
  izranoff: ['rule', 'tension', 'twist'],
  '30jours': ['day', 'card_refused', 'vidal', 'gag'],
};

function validate(ep) {
  const errs = [];
  const warn = [];
  const need = (cond, msg) => { if (!cond) errs.push(msg); };
  need(Number.isInteger(ep.id), 'id manquant');
  need(TYPES[ep.formula], `formula inconnue: ${ep.formula}`);
  need(ep.title && ep.slug, 'title/slug manquant');
  need(ep.thumbnail && ep.thumbnail.line1, 'thumbnail.line1 manquant');
  need(ep.youtube && ep.youtube.title && ep.youtube.description, 'youtube.title/description manquant');
  need(ep.youtube && Array.isArray(ep.youtube.tags) && ep.youtube.tags.length >= 8, 'youtube.tags < 8');
  need(Array.isArray(ep.scenes) && ep.scenes.length >= 8, 'scenes < 8');
  if (!Array.isArray(ep.scenes) || !TYPES[ep.formula]) return { errs, warn, total: 0 };

  const allowed = new Set([...COMMON, ...TYPES[ep.formula]]);
  const count = (t) => ep.scenes.filter((s) => s.type === t).length;
  ep.scenes.forEach((s, i) => {
    need(allowed.has(s.type), `scène ${i}: type "${s.type}" interdit pour ${ep.formula}`);
    need(typeof s.narration === 'string' && s.narration.length > 20, `scène ${i}: narration vide`);
    need(s.title, `scène ${i}: title manquant`);
  });
  need(ep.scenes[0].type === 'hook', 'la 1re scène doit être hook');
  const total = ep.scenes.reduce((a, s) => a + words(s.narration), 0);
  need(total >= 1250 && total <= 1500, `narration ${total} mots (attendu 1250-1500)`);

  switch (ep.formula) {
    case 'etsilab': {
      need(ep.counter && typeof ep.counter.rate === 'number' || (ep.counter && ep.counter.mode === 'exp'), 'counter invalide');
      need(count('counter_focus') >= 3, 'counter_focus < 3');
      need(count('math') >= 1, 'math < 1');
      need(count('phase2') === 1, 'phase2 doit être unique');
      const idx = ep.scenes.findIndex((s) => s.type === 'phase2');
      const before = ep.scenes.slice(0, idx).reduce((a, s) => a + words(s.narration), 0);
      const pos = before / total;
      if (pos < 0.7 || pos > 0.9) warn.push(`phase2 à ${(pos * 100).toFixed(0)} % du texte (cible 80-85 %)`);
      break;
    }
    case 'homodeus': {
      const rules = ep.scenes.filter((s) => s.type === 'rule').map((s) => s.number);
      need(JSON.stringify(rules) === '[1,2,3]', `règles ${JSON.stringify(rules)} (attendu [1,2,3])`);
      const studies = ep.scenes.filter((s) => s.type === 'study');
      need(studies.length === 2, `study = ${studies.length} (attendu 2)`);
      studies.forEach((s, i) => need(s.institution && s.year && s.finding && s.stat && Array.isArray(s.stat.values) && s.stat.values.length >= 2, `study ${i} incomplète`));
      break;
    }
    case 'izranoff': {
      const rules = ep.scenes.filter((s) => s.type === 'rule').map((s) => s.number);
      need(JSON.stringify(rules) === '[1,2,3,4,5,6,7]', `règles ${JSON.stringify(rules)} (attendu 1..7)`);
      const last = ep.scenes[ep.scenes.length - 1];
      need(last.type === 'twist', 'la dernière scène doit être twist');
      const tw = words(last.narration);
      if (tw < 95 || tw > 130) warn.push(`twist ${tw} mots (cible 100-120)`);
      break;
    }
    case '30jours': {
      need(count('day') >= 4, 'day < 4');
      need(count('card_refused') >= 2, 'card_refused < 2');
      need(count('vidal') >= 3, 'vidal < 3');
      need(count('gag') >= 2, 'gag < 2');
      break;
    }
    default:
  }
  if (ep.formula !== 'izranoff') need(ep.scenes[ep.scenes.length - 1].type === 'outro', 'la dernière scène doit être outro');
  need(ep.short && ep.short.narration && ep.short.hook_text, 'short incomplet');
  if (ep.short) {
    const sw = words(ep.short.narration);
    need(sw >= 100 && sw <= 140, `short ${sw} mots (attendu 110-130)`);
  }
  return { errs, warn, total };
}

// Prompts IA : exigés pour rendre un épisode (node validateEpisodes.js --visuals [ids])
const normW = (x) => String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function validateVisuals(ep) {
  const errs = [];
  const need = (c, m) => { if (!c) errs.push(m); };
  (ep.scenes || []).forEach((s, i) => {
    const ok = (typeof s.visual === 'string' && s.visual.length >= 60) || (Array.isArray(s.visuals) && s.visuals.length);
    need(ok, `scène ${i} (${s.type}) : "visual" (>= 60 car.) ou "visuals" manquant`);
    if (typeof s.visual === 'string') need(s.visual.length <= 520, `scène ${i} : visual trop long (${s.visual.length} > 520)`);
    if (s.overlay) need(['stamp', 'banner', 'chip', 'phase2'].includes(s.overlay.kind) && s.overlay.text, `scène ${i} : overlay invalide`);
  });
  const sv = (ep.short && ep.short.visuals) || [];
  need(sv.length >= 8 && sv.length <= 13, `short.visuals : ${sv.length} beats (attendu 8-13)`);
  const nar = normW((ep.short && ep.short.narration) || '');
  let last = -1;
  sv.forEach((v, j) => {
    need(v && typeof v.p === 'string' && v.p.length >= 60 && v.p.length <= 520, `short.visuals[${j}].p absent/trop court/long`);
    if (v && v.at) {
      const k = nar.indexOf(normW(v.at));
      need(k >= 0, `short.visuals[${j}].at "${v.at}" introuvable dans short.narration`);
      need(k > last, `short.visuals[${j}].at hors ordre`);
      if (k >= 0) last = k;
    } else need(j === 0, `short.visuals[${j}].at manquant (seul le 1er beat peut s'en passer)`);
    if (v && v.overlay) need(['stamp', 'banner', 'chip', 'phase2'].includes(v.overlay.kind) && v.overlay.text, `short.visuals[${j}].overlay invalide`);
  });
  need(ep.thumbnail && typeof ep.thumbnail.visual === 'string' && ep.thumbnail.visual.length >= 40, 'thumbnail.visual manquant');
  need(ep.visual_bible && Object.keys(ep.visual_bible).length, 'visual_bible manquant (personnages décrits une fois)');
  return errs;
}

function main() {
  const wantVisuals = process.argv.includes('--visuals');
  const ids = process.argv.slice(2).filter((x) => /^\d+$/.test(x)).map(Number);
  const files = fs.readdirSync(DIR).filter((f) => /^ep\d{2}\.json$/.test(f)).sort()
    .filter((f) => !ids.length || ids.includes(Number(f.slice(2, 4))));
  let bad = 0;
  for (const f of files) {
    let ep;
    try { ep = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) {
      console.log(`✗ ${f}: JSON invalide — ${e.message}`); bad++; continue;
    }
    const { errs, warn, total } = validate(ep);
    if (Number(f.slice(2, 4)) !== ep.id) errs.push('id ≠ nom de fichier');
    if (wantVisuals) errs.push(...validateVisuals(ep));
    console.log(`${errs.length ? '✗' : '✓'} ${f} [${ep.formula}] ${total} mots${warn.length ? ' ⚠ ' + warn.join('; ') : ''}`);
    errs.forEach((e) => console.log('    - ' + e));
    if (errs.length) bad++;
  }
  if (!ids.length && files.length !== 30) { console.log(`✗ ${files.length}/30 fichiers`); bad++; }
  process.exit(bad ? 1 : 0);
}

if (require.main === module) main();
module.exports = { validate, validateVisuals };
