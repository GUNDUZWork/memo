// Downloads the three Google Fonts families (all OFL) into engine/fonts and writes engine/fonts.css.
// Alfa Slab One (headlines), DM Sans 700 (captions), Courier Prime 700 (dossier HUD).
// If Google Fonts is unreachable, an empty fonts.css is written and the page falls back to system fonts.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ENGINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'engine');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const fams = ['Alfa+Slab+One', 'DM+Sans:wght@700', 'Courier+Prime:wght@700'];
const get = async (u, o) => { const r = await fetch(u, o); if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`); return r; };
fs.mkdirSync(path.join(ENGINE, 'fonts'), { recursive: true });
let out = '', n = 0;
try {
  for (const f of fams) {
    let css = await (await get(`https://fonts.googleapis.com/css2?family=${f}&display=block`, { headers: { 'User-Agent': UA } })).text();
    for (const u of new Set(css.match(/https:\/\/[^)]+\.woff2/g) || [])) {
      const name = `f${n++}.woff2`;
      fs.writeFileSync(path.join(ENGINE, 'fonts', name), Buffer.from(await (await get(u)).arrayBuffer()));
      css = css.split(u).join('fonts/' + name);
    }
    out += css;
  }
  console.log(`fonts: ${n} files`);
} catch (e) { console.error('fonts: Google Fonts unreachable, using system fallback:', e.message); out = ''; }
fs.writeFileSync(path.join(ENGINE, 'fonts.css'), out);
