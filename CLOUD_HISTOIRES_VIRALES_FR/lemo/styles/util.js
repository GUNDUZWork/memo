'use strict';
// Petits outils communs aux styles : couleurs, canevas temporaires, flou, bloom, palettes. Aucune dépendance externe (node-canvas seulement).
const { createCanvas } = require('canvas');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const hash = (n) => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
function rgb(c) {
  if (typeof c !== 'string') return [128, 128, 128, 1];
  if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = h.split('').map((x) => x + x).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1]; }
  const m = c.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; }
  return [128, 128, 128, 1];
}
const lum = (c) => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const css = (r, g, b, a = 1) => (a >= 1 ? `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})` : `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`);
const mix = (c, d, k) => { const a = rgb(c); const b = rgb(d); return css(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3]); };
const saturate = (c, k) => { const [r, g, b, a] = rgb(c); const l = 0.299 * r + 0.587 * g + 0.114 * b; return css(clamp((l + (r - l) * k) / 255) * 255, clamp((l + (g - l) * k) / 255) * 255, clamp((l + (b - l) * k) / 255) * 255, a); };
const cache = new Map();
function tmp(key, w, h) { const k = `${key}:${w}x${h}`; let c = cache.get(k); if (!c) { c = createCanvas(w, h); cache.set(k, c); } c.getContext('2d').setTransform(1, 0, 0, 1, 0, 0); return c; }
/** Bloom : copie réduite puis réétalée en mode 'lighter' (halo lumineux). */
function bloom(ctx, W, H, div = 8, alpha = 0.7) {
  const c = tmp('bloom', Math.ceil(W / div), Math.ceil(H / div)); const g = c.getContext('2d'); g.globalCompositeOperation = 'copy'; g.imageSmoothingEnabled = true; g.drawImage(ctx.canvas, 0, 0, c.width, c.height);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = true; ctx.drawImage(c, 0, 0, c.width, c.height, 0, 0, W, H); ctx.restore();
}
/** Flou rapide (réduction / agrandissement bilinéaire) -> canevas temporaire de la taille de l'image. */
function blurred(ctx, W, H, div = 8) {
  const s = tmp('blurS', Math.ceil(W / div), Math.ceil(H / div)); const sg = s.getContext('2d'); sg.globalCompositeOperation = 'copy'; sg.imageSmoothingEnabled = true; sg.drawImage(ctx.canvas, 0, 0, s.width, s.height);
  const b = tmp('blurB', W, H); const bg = b.getContext('2d'); bg.globalCompositeOperation = 'copy'; bg.imageSmoothingEnabled = true; bg.drawImage(s, 0, 0, s.width, s.height, 0, 0, W, H); return b;
}
const hexPal = (a) => a.map((h) => rgb(h).slice(0, 3));
function nearest(pal, r, g, b) { let bi = 0; let bd = 1e9; for (let i = 0; i < pal.length; i++) { const p = pal[i]; const d = (p[0] - r) * (p[0] - r) * 0.3 + (p[1] - g) * (p[1] - g) * 0.59 + (p[2] - b) * (p[2] - b) * 0.11; if (d < bd) { bd = d; bi = i; } } return pal[bi]; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
module.exports = { createCanvas, clamp, hash, rgb, lum, css, mix, saturate, tmp, bloom, blurred, hexPal, nearest, BAYER };
