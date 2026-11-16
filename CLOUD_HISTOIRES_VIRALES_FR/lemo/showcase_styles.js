'use strict';
// masterpiece_showcase.jpg : les 10 styles procéduraux (même scène, même marionnette) + les 2 thèmes d'information. node lemo/showcase_styles.js out.jpg
const fs = require('fs'); const path = require('path'); const { createCanvas } = require('canvas');
const C = require('./cast'); const INFO = require('./info'); const STY = require('./styles');
const ROOT = path.resolve(__dirname, '..'); const ep = JSON.parse(fs.readFileSync(path.join(ROOT, 'episodes', 'ep01.json'), 'utf8'));
const W = 1344; const H = 768; const TW = 960; const TH = 540; const tiles = [];
const beat = { i: 4, scene: 0, type: 'hook' }; const st0 = { t: 3.1, tb: 0.12, voice: 0.8, enter: 1, speaker: 0 };
for (const sty of STY.ALL) {
  STY.use(sty); const back = createCanvas(W, H); C.drawToonBackdrop(back.getContext('2d'), W, H, ep, beat, 0);
  const work = createCanvas(W, H); const g = work.getContext('2d'); const st = { ...st0, tb: sty.id === 'line_art' ? 1.3 : st0.tb }; if (sty.base) sty.base(g, W, H, st, 0); g.drawImage(back, 0, 0); C.drawToonActors(g, W, H, ep, beat, 0, st);
  if (sty.post) sty.post(g, W, H, { ...st, drawing: 0, beatI: beat.i, emo: C.emoOf(beat) }); tiles.push([`${tiles.length + 1}. ${sty.name}`, work]);
}
STY.use(null); const si = Math.max(0, ep.scenes.findIndex((s) => s.type === 'counter_focus'));
for (const id of ['chalkboard', 'gold_line_art']) {
  const is = STY.BY_ID[id]; INFO.setTheme(is.info); const c = createCanvas(W, H); INFO.drawInfo(c.getContext('2d'), W, H, ep, ep.scenes[si], { el: 30, tAbs: 140, tsStart: 0, tsEnd: 40, days: [] }); if (is.infoPost) is.infoPost(c.getContext('2d'), W, H); tiles.push([`Scène d'information — ${is.id}`, c]);
}
const cols = 2; const rows = Math.ceil(tiles.length / cols); const out = createCanvas(TW * cols, TH * rows); const o = out.getContext('2d'); o.fillStyle = '#111'; o.fillRect(0, 0, out.width, out.height);
tiles.forEach(([label, cv], i) => { const x = (i % cols) * TW; const y = Math.floor(i / cols) * TH; o.drawImage(cv, x, y, TW - 4, TH - 4); o.fillStyle = 'rgba(0,0,0,0.65)'; o.font = 'bold 30px "DejaVu Sans"'; o.fillRect(x + 12, y + 12, o.measureText(label).width + 28, 48); o.fillStyle = '#fff'; o.textAlign = 'left'; o.textBaseline = 'middle'; o.fillText(label, x + 26, y + 37); });
fs.writeFileSync(process.argv[2] || 'masterpiece_showcase.jpg', out.toBuffer('image/jpeg', { quality: 0.86 })); console.log('ok', out.width, out.height);
