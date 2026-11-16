#!/usr/bin/env node
// jobs.json : TOUTES les images IA manquantes (ce qui existe déjà dans ai_assets/ est ignoré).
// Usage: node scripts/make_jobs.js --episodes all|1,2,5-8 --assets ai_assets --out jobs.json
'use strict';
const fs = require('fs');
const path = require('path');
const AI = require('../aiScenes');

const a = {};
for (let i = 2; i < process.argv.length; i++) if (process.argv[i].startsWith('--')) a[process.argv[i].slice(2)] = process.argv[++i];
const root = path.join(__dirname, '..');
const assets = path.resolve(root, a.assets || 'ai_assets');
const out = path.resolve(root, a.out || 'jobs.json');
const sel = (a.episodes || 'all').replace(/[\[\]\s]/g, '');
let ids;
if (sel === 'all') ids = Array.from({ length: 30 }, (_, i) => i + 1);
else ids = sel.split(',').flatMap((p) => { const m = /^(\d+)-(\d+)$/.exec(p); return m ? Array.from({ length: +m[2] - +m[1] + 1 }, (_, i) => +m[1] + i) : [Number(p)]; }).filter(Boolean);

const jobs = []; const per = {};
for (const id of ids) {
  const ep = JSON.parse(fs.readFileSync(path.join(root, 'episodes', `ep${String(id).padStart(2, '0')}.json`), 'utf8'));
  const j = AI.jobsFor(ep, assets);
  per[id] = j.length; jobs.push(...j);
}
const seen = new Set(); const dup = jobs.filter((j) => seen.size === seen.add(j.name).size);
if (dup.length) throw new Error(`noms de jobs en double : ${dup[0].name}`);
fs.writeFileSync(out, JSON.stringify(jobs, null, 1));
console.log(`jobs.json : ${jobs.length} image(s) manquante(s) -> ${out}`);
console.log('par épisode :', Object.entries(per).filter(([, n]) => n).map(([k, n]) => `ep${k}:${n}`).join(' ') || '(aucune)');
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `count=${jobs.length}\n`);
