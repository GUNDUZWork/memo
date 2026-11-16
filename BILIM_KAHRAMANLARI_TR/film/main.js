// Page contract (Lemo-Opuscar core): window.READY, window.render(t), window.DUR.  ?ep=ep01  [&thumb=1]
import { textures } from './engine/toon.js';
import * as scene from './scene.js';
const Q = new URLSearchParams(location.search), id = Q.get('ep') || 'ep01';
const cv = document.getElementById('c'), g = cv.getContext('2d');
await Promise.all(['700 80px Oleo', '400 80px Oleo', '80px Slab', '400 40px Jost', '500 40px Jost', '600 40px Jost', '700 40px Jost'].map(f => document.fonts.load(f, 'ĞÜŞİÖÇğüşıöç')));
textures();
const series = await (await fetch('/series/episodes.json')).json();
const tl = await (await fetch(`/out/${id}/timeline.json`)).json();
const ep = series.episodes[parseInt(id.slice(2), 10) - 1];
tl.total = series.episodes.length;
scene.setup(ep, tl, series.series);
window.DUR = scene.DUR();
window.render = t => { g.setTransform(1, 0, 0, 1, 0, 0); scene.renderFilm(g, t, Q); };
window.READY = true;
