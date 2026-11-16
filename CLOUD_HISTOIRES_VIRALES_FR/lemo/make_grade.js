// Génère lemo/grade.cube : LUT 3D de l'étalonnage commun (léger contraste en S, noirs un peu relevés et bleutés, hautes lumières chaudes).
const fs = require('fs'); const path = require('path'); const N = 33; const out = [`TITLE "histoires-fr grade"`, `LUT_3D_SIZE ${N}`];
const s = (x) => x + 0.12 * Math.sin((x - 0.5) * Math.PI * 2) * -0.5 * -1; // S douce
const cl = (x) => Math.min(1, Math.max(0, x));
for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) {
  let R = r / (N - 1); let G = g / (N - 1); let B = b / (N - 1);
  const l = 0.3 * R + 0.59 * G + 0.11 * B;
  R = s(R) + 0.025 * l; G = s(G) + 0.005; B = s(B) - 0.02 * l + 0.02 * (1 - l);
  R = 0.02 + 0.97 * R; G = 0.02 + 0.97 * G; B = 0.025 + 0.96 * B;
  out.push(`${cl(R).toFixed(5)} ${cl(G).toFixed(5)} ${cl(B).toFixed(5)}`);
}
fs.writeFileSync(path.join(__dirname, 'grade.cube'), out.join('\n') + '\n');
