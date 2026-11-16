'use strict';
/*
 * lemo/styles — 10 styles procéduraux « Claude », 100 % code (Canvas 2D / node-canvas, aucune API, aucun GPU, aucune image externe).
 * Chaque style = { id, name, skin, base?, post?, crisp?, info? } :
 *   - skin  : réglage du moteur de dessin lemo/toon.js (remplissage, trait, épaisseur, lueur, ombre) -> les MÊMES personnages et décors sont
 *             redessinés dans le style, avec la même marionnette (rebond / inclinaison / respiration / entrée / retournement) et la même caméra ;
 *   - base  : fond dessiné à chaque image (sous le décor mis en cache) — parallaxe, ardoise, velours, ville néon…
 *   - post  : traitement de l'image finale (pixelisation + tramage, craie, tramé Ben-Day, briques à tenons, bloom, flou de profondeur, rayons…) ;
 *   - info  : thème des scènes d'information (cartes, courbes, frises, tableaux) quand le style sert de « schéma ».
 * Les rendus 3D (PS2 / CGI / Lego) sont des simulations 2D : pas de vrai moteur 3D, mais le même langage visuel (polygones, jitter, brouillard,
 * profondeur de champ, rayons de lumière, briques).
 */
const U = require('./util');
const { createCanvas, clamp, hash, rgb, lum, css, mix, saturate, tmp, bloom, blurred, hexPal, nearest, BAYER } = U;

const bboxArea = (s) => { let x0 = 1e9; let y0 = 1e9; let x1 = -1e9; let y1 = -1e9; for (const p of s) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return [x0, y0, x1, y1, (x1 - x0) * (y1 - y0)]; };
// formes très grandes (murs, sol) : supprimées quand le style fournit son propre fond
const big = (s, g) => s && bboxArea(s)[4] > 0.2 * g.canvas.width * g.canvas.height;
const gradFill = (c, g, s, k = 0.16) => {
  if (!s || typeof c !== 'string') return c; const [x0, y0, x1, y1] = bboxArea(s); const gr = g.createLinearGradient(0, y0, 0, y1 + 1);
  gr.addColorStop(0, mix(c, '#ffffff', k)); gr.addColorStop(1, mix(c, '#000000', k)); return gr;
};
const goldGrad = (g) => { const gr = g.createLinearGradient(0, 0, g.canvas.width, g.canvas.height); gr.addColorStop(0, '#A67C00'); gr.addColorStop(0.3, '#FFD700'); gr.addColorStop(0.55, '#D4AF37'); gr.addColorStop(0.8, '#FFD700'); gr.addColorStop(1, '#8a6a12'); return gr; }; // or métallique #D4AF37 -> #FFD700
const neonGrad = (g) => { const gr = g.createLinearGradient(0, 0, g.canvas.width, 0); gr.addColorStop(0, '#38f9ff'); gr.addColorStop(0.5, '#a66bff'); gr.addColorStop(1, '#ff4fd8'); return gr; };

// ───────────── 1. Pixel Art ─────────────
const PAL32 = hexPal(['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57',
  '#000000', '#7a3b2e', '#c28a5a', '#f2c7a1', '#4a3a66', '#8e5ea2', '#d85fa8', '#ff9bd1', '#2d6a4f', '#95d5b2', '#e9c46a', '#f4a261', '#264653', '#6b7280', '#cbd5e1', '#ffffff']);
function pixelate(ctx, W, H, f, dither = 14) {
  const sw = Math.ceil(W / f); const sh = Math.ceil(H / f); const c = tmp('px', sw, sh); const g = c.getContext('2d'); g.globalCompositeOperation = 'copy'; g.imageSmoothingEnabled = true; g.drawImage(ctx.canvas, 0, 0, sw, sh);
  const id = g.getImageData(0, 0, sw, sh); const d = id.data;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const i = (y * sw + x) * 4; const b = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * dither; const p = nearest(PAL32, d[i] + b, d[i + 1] + b, d[i + 2] + b); d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255; }
  g.putImageData(id, 0, 0); ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, sw, sh, 0, 0, W, H); ctx.restore();
}
const pixelArt = {
  id: 'pixel_art', name: 'Pixel Art', crisp: true,
  skin: { fill: (c, g, s) => (big(s, g) ? null : c), line: (c) => c, lwMul: 1.1, boil: 0.25 },
  base(ctx, W, H, st) {
    const bands = ['#29366f', '#3b5dc9', '#41a6f6', '#73eff7']; bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, (H * 0.74 * i) / 4, W, H * 0.74 / 4 + 2); });
    const layers = [[0.12, '#566c86', 0.34, 90], [0.3, '#333c57', 0.26, 60], [0.6, '#1a1c2c', 0.18, 40]]; // parallaxe : 3 plans qui défilent à vitesses différentes
    layers.forEach(([sp, col, hh, wd], li) => { ctx.fillStyle = col; const off = (st.t * 40 * sp) % wd; for (let x = -wd; x < W + wd; x += wd) { const k = Math.floor((x + (st.t * 40 * sp)) / wd) + li * 17; const h = H * (hh * 0.5 + hash(k) * hh); ctx.fillRect(x - off + wd, H * 0.74 - h, wd - 4, h + 2); } });
    ctx.fillStyle = '#38b764'; ctx.fillRect(0, H * 0.74, W, H * 0.26); ctx.fillStyle = '#257179'; ctx.fillRect(0, H * 0.74, W, 10);
  },
  post(ctx, W, H) { pixelate(ctx, W, H, Math.round(W / 280)); },
};

// ───────────── 2. Chalkboard ─────────────
let slate = null; let chalkNoise = null;
function slateBg(ctx, W, H) {
  if (!slate || slate.width !== W) {
    slate = createCanvas(W, H); const g = slate.getContext('2d'); const gr = g.createRadialGradient(W / 2, H / 2, W * 0.1, W / 2, H / 2, W * 0.75); gr.addColorStop(0, '#34453f'); gr.addColorStop(1, '#202c28'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(230,235,225,${0.015 + hash(i + 9) * 0.03})`; g.lineWidth = 8 + hash(i) * 30; g.beginPath(); const y = hash(i + 1) * H; g.moveTo(hash(i + 2) * W, y); g.lineTo(hash(i + 3) * W, y + (hash(i + 4) - 0.5) * 120); g.stroke(); } // traces d'éponge
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(255,255,255,${hash(i + 7) * 0.05})`; g.fillRect(hash(i + 11) * W, hash(i + 12) * H, 2, 2); }
    g.fillStyle = '#6b4a2f'; g.fillRect(0, H - 26, W, 26); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, H - 26, W, 5); // cadre / rebord en bois
  }
  ctx.drawImage(slate, 0, 0);
}
function chalkDust(ctx, W, H, d) {
  if (!chalkNoise) { chalkNoise = createCanvas(256, 256); const g = chalkNoise.getContext('2d'); for (let i = 0; i < 4200; i++) { g.fillStyle = `rgba(36,50,45,${0.35 + hash(i) * 0.5})`; g.fillRect(hash(i + 1) * 256, hash(i + 2) * 256, 1 + hash(i + 3) * 2.4, 1 + hash(i + 4) * 2.4); } }
  ctx.save(); ctx.translate((d % 3) * 53, (d % 3) * 97); ctx.fillStyle = ctx.createPattern(chalkNoise, 'repeat'); ctx.fillRect(-300, -300, W + 600, H + 600); ctx.restore();
}
const CHALK = ['#f3f1e7', '#a8dcff', '#ffc2cf', '#fff0a8', '#b9f0c2'];
const chalkboard = {
  id: 'chalkboard', name: 'Chalkboard (Kara Tahta)',
  skin: { fill: (c, g, s) => { if (big(s, g)) return null; const [r, gg, b] = rgb(c); return lum(c) > 0.93 ? 'rgba(243,241,231,0.25)' : `rgba(${r},${gg},${b},0.30)`; }, line: (c) => (lum(c) < 0.2 ? '#f3f1e7' : CHALK[Math.floor(lum(c) * 9) % CHALK.length]), lwMul: 0.95, boil: 1.7, noShade: true },
  base: (ctx, W, H) => slateBg(ctx, W, H),
  post: (ctx, W, H, st) => chalkDust(ctx, W, H, st.drawing || 0),
  info: { id: 'chalkboard', ink: '#f3f1e7', grid: 'rgba(243,241,231,0.20)', blue: '#a8dcff', red: '#ffc2cf', sub1: '#cfd6c9', sub2: '#c2cabc', bg: (ctx, W, H) => slateBg(ctx, W, H) },
  infoPost: (ctx, W, H) => chalkDust(ctx, W, H, 0),
};

// ───────────── 3. Line Art ─────────────
let paperTex = null;
function paperBg(ctx, W, H) {
  if (!paperTex || paperTex.width !== W) { paperTex = createCanvas(W, H); const g = paperTex.getContext('2d'); g.fillStyle = '#f5f1e8'; g.fillRect(0, 0, W, H); for (let i = 0; i < 3500; i++) { g.fillStyle = `rgba(110,95,70,${hash(i) * 0.06})`; g.fillRect(hash(i + 1) * W, hash(i + 2) * H, 1 + hash(i + 3) * 2, 1 + hash(i + 4) * 2); } }
  ctx.drawImage(paperTex, 0, 0);
}
const lineArt = {
  id: 'line_art', name: 'Line Art',
  skin: { fill: (c, g, s) => (big(s, g) ? null : (lum(c) < 0.22 ? '#1d1a17' : '#f5f1e8')), line: () => '#1d1a17', lwMul: 0.72, boil: 0.55, noShade: true, noShadow: true },
  base: (ctx, W, H) => paperBg(ctx, W, H),
  post(ctx, W, H, st) { // animation de tracé : le dessin « s'écrit » de gauche à droite au début de chaque plan
    if (st.tb < 0.9) { const k = clamp(st.tb / 0.9); ctx.save(); ctx.beginPath(); ctx.rect(W * (0.08 + 0.92 * k * k * (3 - 2 * k)), 0, W, H); ctx.clip(); paperBg(ctx, W, H); ctx.restore(); ctx.fillStyle = '#1d1a17'; ctx.fillRect(W * (0.08 + 0.92 * k * k * (3 - 2 * k)) - 2, 0, 3, H); }
  },
};

// ───────────── 4. PS2 3D (low-poly rétro) ─────────────
const ps2 = {
  id: 'ps2_3d', name: 'PS2 3D (Retro Low-Poly)',
  skin: { fill: (c, g, s) => { if (typeof c !== 'string') return c; const l = lum(c); return mix(c, l > 0.5 ? '#ffffff' : '#101020', 0.06); }, line: () => null, lwMul: 0, boil: 0, step: 24, noShade: false },
  post(ctx, W, H, st) {
    const f = Math.round(W / 420); const sw = Math.ceil(W / f); const sh = Math.ceil(H / f); const c = tmp('ps2', sw, sh); const g = c.getContext('2d'); g.globalCompositeOperation = 'copy'; g.imageSmoothingEnabled = true; g.drawImage(ctx.canvas, 0, 0, sw, sh);
    const id = g.getImageData(0, 0, sw, sh); const d = id.data; for (let i = 0; i < d.length; i += 4) { d[i] = (d[i] >> 3) << 3; d[i + 1] = (d[i + 1] >> 3) << 3; d[i + 2] = (d[i + 2] >> 3) << 3; } g.putImageData(id, 0, 0); // couleur 15 bits
    ctx.save(); ctx.imageSmoothingEnabled = false; const strips = 12; const fr = Math.floor(st.t * 12); // vertex jitter : bandes décalées au pas de 12 i/s
    for (let i = 0; i < strips; i++) { const y0 = Math.floor((i * sh) / strips); const y1 = Math.floor(((i + 1) * sh) / strips); const dx = (hash(fr * 13 + i) - 0.5) * 2.6 * f; ctx.drawImage(c, 0, y0, sw, y1 - y0, dx, y0 * f, W, (y1 - y0) * f); }
    ctx.restore(); const fog = ctx.createLinearGradient(0, 0, 0, H); fog.addColorStop(0, 'rgba(140,150,175,0.38)'); fog.addColorStop(0.45, 'rgba(140,150,175,0.10)'); fog.addColorStop(1, 'rgba(60,50,80,0.18)'); ctx.fillStyle = fog; ctx.fillRect(0, 0, W, H); // brouillard
  },
  crisp: true,
};

// ───────────── 5. Comic Book ─────────────
const COMIC_FX = { shock: 'HEIN ?!', scream: 'PAF !', worried: 'GLUP…' };
const comic = {
  id: 'comic_book', name: 'Comic Book',
  skin: { fill: (c) => saturate(c, 1.35), line: () => '#0a0a0f', lwMul: 1.55, boil: 0.5 },
  post(ctx, W, H, st) {
    const cell = Math.round(W / 150); const sw = Math.ceil(W / cell); const sh = Math.ceil(H / cell); const c = tmp('hf', sw, sh); const g = c.getContext('2d'); g.globalCompositeOperation = 'copy'; g.imageSmoothingEnabled = true; g.drawImage(ctx.canvas, 0, 0, sw, sh);
    const d = g.getImageData(0, 0, sw, sh).data; ctx.save(); ctx.fillStyle = 'rgba(40,20,90,0.5)'; ctx.beginPath(); // Ben-Day : points dans les ombres
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const i = (y * sw + x) * 4; const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; if (l < 0.52) { const r = ((0.52 - l) / 0.52) * cell * 0.62; const ox = (y & 1) * cell * 0.5; ctx.moveTo(x * cell + ox + r, y * cell + cell / 2); ctx.arc(x * cell + ox, y * cell + cell / 2, r, 0, 6.283); } }
    ctx.fill(); ctx.restore();
    ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0a0a0f'; ctx.lineWidth = 9; const cut = ((st.beatI || 0) % 2 ? 1 : -1); // gouttière diagonale (case en biais)
    ctx.beginPath(); ctx.moveTo(W * 0.80 + cut * 40, -10); ctx.lineTo(W * 0.80 - cut * 40 + 28, H + 10); ctx.lineTo(W * 0.80 - cut * 40 + 8, H + 10); ctx.lineTo(W * 0.80 + cut * 40 - 20, -10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.lineWidth = 12; ctx.strokeRect(6, 6, W - 12, H - 12); ctx.restore();
    const fx = COMIC_FX[st.emo]; if (fx && st.tb < 0.9) { // bulle d'effet (explosion) sur les réactions
      const k = clamp(st.tb / 0.2); const cx = W * 0.5; const cy = H * 0.2; const R = H * 0.13 * (0.7 + 0.3 * k) * (1 + 0.04 * Math.sin(st.tb * 40)); ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.1); ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = '#0a0a0f'; ctx.lineWidth = 8; ctx.beginPath();
      for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.283; const r = i % 2 ? R * 0.68 : R * 1.25; ctx.lineTo(Math.cos(a) * r * 1.4, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d7263d'; ctx.font = `900 ${Math.round(R * 0.6)}px "DejaVu Sans"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = '#0a0a0f'; ctx.strokeText(fx, 0, 0); ctx.fillText(fx, 0, 0); ctx.restore();
    }
  },
};

// ───────────── 6. Flat Vector (Kurzgesagt) ─────────────
const flatVector = {
  id: 'flat_vector', name: 'Flat Vector',
  skin: { fill: (c, g, s) => gradFill(c, g, s, 0.14), line: () => null, lwMul: 0, boil: 0, shadow: 14 },
  post(ctx, W, H) { const gr = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H / 2, W * 0.7); gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(1, 'rgba(10,10,40,0.22)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); },
};

// ───────────── 7. Gold Line Art ─────────────
let velvet = null;
function velvetBg(ctx, W, H, t = 0) {
  if (!velvet || velvet.width !== W) { velvet = createCanvas(W, H); const g = velvet.getContext('2d'); const gr = g.createRadialGradient(W / 2, H * 0.4, W * 0.05, W / 2, H / 2, W * 0.8); gr.addColorStop(0, '#12183a'); gr.addColorStop(1, '#03040c'); g.fillStyle = gr; g.fillRect(0, 0, W, H); for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(120,130,200,${hash(i) * 0.05})`; g.fillRect(hash(i + 1) * W, hash(i + 2) * H, 1.5, 1.5); } }
  ctx.drawImage(velvet, 0, 0); ctx.fillStyle = '#FFD700'; for (let i = 0; i < 40; i++) { const a = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7); ctx.globalAlpha = a * 0.5; ctx.fillRect(hash(i + 50) * W, hash(i + 70) * H, 2.5, 2.5); } ctx.globalAlpha = 1;
}
const goldLine = {
  id: 'gold_line_art', name: 'Gold Line Art',
  skin: { fill: (c, g, s) => (big(s, g) ? null : 'rgba(6,8,26,0.92)'), line: (c, g) => goldGrad(g), lwMul: 0.85, boil: 0.35, noShade: true, glow: 7, noShadow: true },
  base: (ctx, W, H, st) => velvetBg(ctx, W, H, st.t),
  post: (ctx, W, H) => bloom(ctx, W, H, 6, 0.32),
  info: { id: 'gold', ink: '#D4AF37', grid: 'rgba(212,175,55,0.18)', blue: '#FFD700', red: '#f6c453', sub1: '#b8963a', sub2: '#a98a3a', bg: (ctx, W, H) => velvetBg(ctx, W, H, 0) },
  infoPost: (ctx, W, H) => bloom(ctx, W, H, 6, 0.3),
};

// ───────────── 8. 3D CGI ─────────────
const cgi = {
  id: 'cgi_3d', name: '3D CGI',
  skin: { fill: (c, g, s) => gradFill(c, g, s, 0.22), line: () => null, lwMul: 0, boil: 0, shadow: 22 },
  post(ctx, W, H, st) {
    const b = blurred(ctx, W, H, 7); const layer = tmp('dof', W, H); const lg = layer.getContext('2d'); lg.globalCompositeOperation = 'copy'; lg.drawImage(b, 0, 0); lg.globalCompositeOperation = 'destination-out'; // profondeur de champ : centre net, bords flous
    const m = lg.createRadialGradient(W / 2, H * 0.52, H * 0.25, W / 2, H * 0.52, H * 0.85); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = m; lg.fillRect(0, 0, W, H); lg.globalCompositeOperation = 'source-over'; ctx.drawImage(layer, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { // rayons volumétriques (god rays) qui oscillent doucement
      const a = 1.95 + i * 0.16 + 0.04 * Math.sin(st.t * 0.5 + i); const L = H * 1.6; const gr = ctx.createLinearGradient(W * 0.86, -H * 0.1, W * 0.86 + Math.cos(a) * L, -H * 0.1 + Math.sin(a) * L); gr.addColorStop(0, 'rgba(255,236,190,0.16)'); gr.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(W * 0.86, -H * 0.1); ctx.lineTo(W * 0.86 + Math.cos(a - 0.05) * L, -H * 0.1 + Math.sin(a - 0.05) * L); ctx.lineTo(W * 0.86 + Math.cos(a + 0.05) * L, -H * 0.1 + Math.sin(a + 0.05) * L); ctx.fill();
    } ctx.restore(); bloom(ctx, W, H, 8, 0.28);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,15,0.35)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  },
};

// ───────────── 9. Lego (briques / voxels) ─────────────
const LEGO = hexPal(['#c91a09', '#0055bf', '#f2cd37', '#237841', '#ffffff', '#05131d', '#fe8a18', '#9b9a5a', '#6c6e68', '#a0a5a9', '#e4cd9e', '#d09168', '#a5cbe0', '#e4adc8', '#720e0f', '#4b9f4a', '#958a73', '#f5cd2f']);
const lego = {
  id: 'lego', name: 'Lego (Brick / Voxel)', crisp: true,
  skin: { fill: (c) => { const [r, g, b] = rgb(c); const p = nearest(LEGO, r, g, b); return css(p[0], p[1], p[2]); }, line: () => '#10151c', lwMul: 0.55, boil: 0, step: 18 },
  post(ctx, W, H) {
    const cell = Math.round(W / 96); const sw = Math.ceil(W / cell); const sh = Math.ceil(H / cell); const c = tmp('lg', sw, sh); const g = c.getContext('2d'); g.globalCompositeOperation = 'copy'; g.imageSmoothingEnabled = true; g.drawImage(ctx.canvas, 0, 0, sw, sh);
    const d = g.getImageData(0, 0, sw, sh).data; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#10151c'; ctx.fillRect(0, 0, W, H); const r = cell * 0.3;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const i = (y * sw + x) * 4; const p = nearest(LEGO, d[i], d[i + 1], d[i + 2]); const cx = x * cell; const cy = y * cell; // brique + tenon (stud)
      ctx.fillStyle = css(p[0], p[1], p[2]); ctx.fillRect(cx, cy, cell - 1, cell - 1); ctx.fillStyle = css(p[0] * 0.78, p[1] * 0.78, p[2] * 0.78); ctx.beginPath(); ctx.arc(cx + cell / 2 + 1, cy + cell / 2 + 1.5, r, 0, 6.283); ctx.fill();
      ctx.fillStyle = css(Math.min(255, p[0] * 1.18 + 12), Math.min(255, p[1] * 1.18 + 12), Math.min(255, p[2] * 1.18 + 12)); ctx.beginPath(); ctx.arc(cx + cell / 2, cy + cell / 2, r, 0, 6.283); ctx.fill(); }
    ctx.restore();
    const warm = ctx.createLinearGradient(0, 0, W, H); warm.addColorStop(0, 'rgba(255,200,120,0.12)'); warm.addColorStop(1, 'rgba(255,150,60,0.05)'); ctx.fillStyle = warm; ctx.fillRect(0, 0, W, H); // éclairage chaud
  },
};

// ───────────── 10. Neon Cyber / Isometric Cutaway ─────────────
let city = null;
function neonBase(ctx, W, H, st) {
  if (!city || city.width !== W) {
    city = createCanvas(W, H); const g = city.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b0620'); gr.addColorStop(0.6, '#241046'); gr.addColorStop(1, '#10122e'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let layer = 0; layer < 2; layer++) for (let x = 0; x < W; x += 46 + layer * 20) { const h = H * (0.18 + hash(x + layer * 99) * 0.3) * (layer ? 0.8 : 1); g.fillStyle = layer ? '#150c33' : '#0d0825'; g.fillRect(x, H * 0.62 - h, 44 + layer * 18, h + H); // gratte-ciels + fenêtres allumées
      for (let wy = H * 0.62 - h + 10; wy < H * 0.62; wy += 16) for (let wx = x + 6; wx < x + 38; wx += 12) if (hash(wx * 3 + wy) > 0.62) { g.fillStyle = hash(wx + wy * 7) > 0.5 ? 'rgba(80,235,255,0.75)' : 'rgba(255,90,210,0.7)'; g.fillRect(wx, wy, 5, 8); } }
  { const g2 = city.getContext('2d');
  g2.save(); g2.strokeStyle = neonGrad(g2); g2.lineWidth = 5; g2.shadowColor = '#7a5cff'; g2.shadowBlur = 18; // coupe isométrique de la pièce : sol en losange + 2 murs de fond
  const cx = W / 2; const fy = H * 0.9; const dx = W * 0.46; const dy = H * 0.2; g2.beginPath(); g2.moveTo(cx - dx, fy - dy); g2.lineTo(cx, fy - 2 * dy); g2.lineTo(cx + dx, fy - dy); g2.lineTo(cx, fy); g2.closePath(); g2.stroke();
  g2.beginPath(); g2.moveTo(cx - dx, fy - dy); g2.lineTo(cx - dx, fy - dy - H * 0.55); g2.lineTo(cx, fy - 2 * dy - H * 0.55); g2.lineTo(cx + dx, fy - dy - H * 0.55); g2.lineTo(cx + dx, fy - dy); g2.moveTo(cx, fy - 2 * dy); g2.lineTo(cx, fy - 2 * dy - H * 0.55); g2.stroke(); g2.restore();
  }
  }
  ctx.drawImage(city, 0, 0);
  const pulse = 0.55 + 0.45 * Math.sin(st.t * 3); ctx.fillStyle = `rgba(255,70,200,${0.07 * pulse})`; ctx.fillRect(0, 0, W, H);
}
const neon = {
  id: 'neon_cyber', name: 'Neon Cyber / Isometric Cutaway',
  skin: { fill: (c, g, s) => (big(s, g) ? null : mix(c, '#12082a', 0.8)), line: (c, g) => neonGrad(g), lwMul: 0.9, boil: 0.3, noShade: true, glow: 10, noShadow: true },
  base: neonBase,
  post(ctx, W, H) { bloom(ctx, W, H, 6, 0.75); ctx.fillStyle = 'rgba(0,0,0,0.10)'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1); },
};

const ALL = [pixelArt, chalkboard, lineArt, ps2, comic, flatVector, goldLine, cgi, lego, neon];
const BY_ID = Object.fromEntries(ALL.map((s) => [s.id, s]));
// choix automatique par chaîne (ep.style ou LEMO_STYLE les remplacent) ; scènes d'information : tableau noir, ou lignes d'or pour la chaîne « nuit »
const DEFAULT_BY_FORMULA = { etsilab: 'flat_vector', homodeus: 'cgi_3d', izranoff: 'neon_cyber', '30jours': 'comic_book' };
const INFO_BY_FORMULA = { etsilab: 'chalkboard', homodeus: 'chalkboard', izranoff: 'gold_line_art', '30jours': 'chalkboard' };
const state = { current: null };
function styleFor(ep) { const id = process.env.LEMO_STYLE || ep.style || DEFAULT_BY_FORMULA[ep.formula]; return id === 'scifi_toon' ? null : (BY_ID[id] || null); }
function infoStyleFor(ep) { return BY_ID[process.env.LEMO_INFO_STYLE || ep.info_style || INFO_BY_FORMULA[ep.formula]] || null; }
function use(sty) { state.current = sty || null; require('../toon').S.skin = sty ? sty.skin : null; return state.current; }
module.exports = { ALL, BY_ID, styleFor, infoStyleFor, use, get current() { return state.current; } };
