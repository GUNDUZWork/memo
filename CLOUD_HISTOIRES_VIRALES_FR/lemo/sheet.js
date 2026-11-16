'use strict';
// Karakter sayfası (kontrol amaçlı): tüm kadro, farklı ifadelerle. node lemo/sheet.js out.png
const { createCanvas } = require('canvas');
const T = require('./toon'); const C = require('./cast');
const W = 1920; const H = 1080; const cv = createCanvas(W, H); const g = cv.getContext('2d');
T.init(g, W, H); T.frame(0);
g.fillStyle = '#f4ead6'; g.fillRect(0, 0, W, H);
const list = [['theo', 'shock'], ['garnier', 'smug'], ['prof', 'happy'], ['vidal', 'deadpan'], ['lea', 'smile'], ['max', 'scream'], ['subjA', 'worried'], ['subjB', 'talk']];
list.forEach(([c, e], i) => {
  const x = 150 + (i % 4) * 470; const y = i < 4 ? 500 : 1010;
  T.push(); T.translate(x + 80, y); T.scale(0.62); C.person(C.CHARS[c], { expr: e, pose: { a: [0.2, i % 2 ? 0.3 : 1.0], prop: i === 0 ? 'phone' : i === 2 ? 'clipboard' : null }, t: i }); T.pop();
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#1b1422'; g.font = 'bold 28px "DejaVu Sans"'; g.textAlign = 'center'; g.fillText(`${c} · ${e}`, x + 80, y + 34);
});
require('fs').writeFileSync(process.argv[2] || 'build/lemo/sheet.png', cv.toBuffer('image/png'));
console.log('ok');
