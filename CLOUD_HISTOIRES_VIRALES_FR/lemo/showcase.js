'use strict';
// masterpiece_showcase.jpg : planche de personnages (scifi-toon) + scène d'information (dataviz) + une scène racontée. node lemo/showcase.js out.jpg
const fs = require('fs'); const path = require('path'); const { createCanvas } = require('canvas');
const T = require('./toon'); const C = require('./cast'); const INFO = require('./info');
const W = 1920; const H = 1080; const ROOT = path.resolve(__dirname, '..');
const ep = JSON.parse(fs.readFileSync(path.join(ROOT, 'episodes', 'ep01.json'), 'utf8'));
const out = createCanvas(W, H * 3); const og = out.getContext('2d');
// 1) planche
const a = createCanvas(W, H); const g = a.getContext('2d'); T.init(g, W, H); T.frame(0); g.fillStyle = '#f4ead6'; g.fillRect(0, 0, W, H);
const list = [['theo', 'shock'], ['garnier', 'smug'], ['prof', 'happy'], ['vidal', 'deadpan'], ['lea', 'smile'], ['max', 'scream'], ['subjA', 'worried'], ['subjB', 'talk']];
list.forEach(([c, e], i) => { const x = 150 + (i % 4) * 470; const y = i < 4 ? 500 : 1010; T.push(); T.translate(x + 80, y); T.scale(0.62); C.person(C.CHARS[c], { expr: e, pose: { a: [0.2, i % 2 ? 0.3 : 1.0], prop: i === 0 ? 'phone' : i === 2 ? 'clipboard' : null }, t: i }); T.pop(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#1b1422'; g.font = 'bold 28px "DejaVu Sans"'; g.textAlign = 'center'; g.fillText(`${c} · ${e}`, x + 80, y + 34); });
og.drawImage(a, 0, 0);
// 2) scène d'information
const b = createCanvas(W, H); const si = Math.max(0, ep.scenes.findIndex((s) => s.type === 'counter_focus'));
INFO.drawInfo(b.getContext('2d'), W, H, ep, ep.scenes[si], { el: 30, tAbs: 140, tsStart: 0, tsEnd: 40, days: [] }); og.drawImage(b, 0, H);
// 3) scène racontée (décor + acteurs animés, image arrêtée en pleine action)
const c = createCanvas(W, H); const cg = c.getContext('2d'); const beat = { i: 4, scene: 0, type: 'hook' };
C.drawToonBackdrop(cg, W, H, ep, beat, 0); C.drawToonActors(cg, W, H, ep, beat, 0, { t: 3.1, tb: 0.15, voice: 0.8, enter: 1, speaker: 0 }); og.drawImage(c, 0, H * 2);
og.setTransform(1, 0, 0, 1, 0, 0); og.fillStyle = 'rgba(0,0,0,0.6)'; og.font = 'bold 34px "DejaVu Sans"'; og.textAlign = 'left';
['Planche de personnages — scifi-toon', 'Scène d\'information — dataviz', 'Scène racontée — scifi-toon (marionnette animée)'].forEach((t, i) => { og.fillRect(20, H * i + 20, og.measureText(t).width + 30, 56); og.fillStyle = '#fff'; og.fillText(t, 35, H * i + 60); og.fillStyle = 'rgba(0,0,0,0.6)'; });
fs.writeFileSync(process.argv[2] || 'masterpiece_showcase.jpg', out.toBuffer('image/jpeg', { quality: 0.88 }));
console.log('ok');
