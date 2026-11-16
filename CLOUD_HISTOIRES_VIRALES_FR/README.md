# CLOUD_HISTOIRES_VIRALES_FR — usine de rendu 100 % cloud

30 épisodes en français, rendus entièrement sur GitHub Actions (`ubuntu-latest`, gratuit) :
aucune installation sur un ordinateur local.

| Livrable (par épisode) | Détail |
|---|---|
| `epXX_main_1920x1080.mp4` | Film 16:9, 8-10 min, 25 fps, H.264 + AAC 48 kHz |
| `epXX_short_1080x1920.mp4` | Short 9:16, ~45-58 s, qui renvoie vers le film |
| `epXX_fr.srt` / `epXX_short_fr.srt` | Sous-titres français (calés sur les mots de la voix) |
| `epXX_youtube_metadata.md` | Titre, description + chapitres horodatés, tags, commentaire épinglé, texte du Short |
| `epXX_thumbnail.png` | Miniature 1280x720 |

Voix : `edge-tts` **fr-FR-RemyMultilingualNeural**. Mix : voix + musique générée (aucun droit
d'auteur) avec ducking, normalisée en 2 passes à **-14 LUFS / -1 dBTP**.

## Lancer la production

- **Automatique** : chaque `push` qui touche `CLOUD_HISTOIRES_VIRALES_FR/**` lance le workflow.
  Seuls les épisodes modifiés sont rendus ; si le moteur change, les 30 sont re-rendus.
- **Manuel** : onglet **Actions → Cloud Render — Histoires Virales FR → Run workflow**
  (`episodes` = `all`, `1,4,12` ou `1-10` ; `preview_seconds` = 20 pour un test rapide).
  Le bouton n'apparaît que lorsque le workflow est présent sur la branche par défaut (`main`).

## Télécharger

- **Releases** (onglet *Releases*, tag `render-<n°>-<essai>`) : tous les fichiers de tous les épisodes, sans expiration.
- **Artifacts** : en bas de la page de l'exécution, un zip `epXX` par épisode (conservé 14 jours).

## Architecture « AI Scene-per-Beat » (aucun dessin par le code)

Chaque **beat** (groupe de phrases de ~4-5 s) reçoit sa propre **illustration IA** (Pollinations Flux, sans clé,
1920x1080 pour le film, 1080x1920 pour le Short). Le code ne dessine ni personnage ni décor.

- **Chaîne de production des images** (le moteur ne télécharge plus rien) :
  1. `scripts/make_jobs.js` → `jobs.json` : toutes les images manquantes (`{"name","prompt","width","height","is_sprite","seed"}` ;
     ce qui existe déjà dans `ai_assets/` est ignoré). Tarz cümlesi : **un seul endroit**, `aiStyle.json`. Formats : film 1344x768, Short 768x1344.
  2. **Source principale : Kaggle, dans GitHub Actions** (`scripts/kaggle_run.sh`, secret `KAGGLE_API_TOKEN`, kaggle >= 1.8.0) :
     `kaggle/kaggle_notebook_v2.py` (IP-Adapter, inchangé) → jupytext → .ipynb à une cellule → kernel `mehmetgunduz2026/histoires-fr-gorsel`,
     dataset privé `mehmetgunduz2026/histoires-fr-jobs` ; statut chaque minute ; sortie dans `ai_assets/`.
     Le dataset commun « french » et les autres kernels ne sont jamais touchés.
  3. **Secours** (`fallback_generate.py jobs.json ai_assets`) : Cloudflare Workers AI → Hugging Face → Pollinations ; une source sans clé est ignorée
     (`CF_ACCOUNT_ID`+`CF_API_TOKEN`, `HF_TOKEN`, `POLLINATIONS_API_KEY`) ; les clés ne sont lues que dans l'environnement.
  4. **Décision actuelle : plus aucune image IA** — tout est dessiné par `lemo/` (voir CLAUDE.md et LEMO_STYLE.md) ; les étapes 1 à 3 ci-dessus ne sont plus utilisées.
     `ai_assets/`, donc elles réapparaissent dans `jobs.json` au passage suivant et sont retentées par IA.
  `ai_assets/_sources.json` garde la source de chaque image ; `build/epXX/sources.json` + le « Rapport final » du workflow résument par épisode
  (DONE/FAILED, Kaggle / API / code, durée).
- `aiScenes.js` : plan des beats (≈ 13 mots / beat, indépendant de la voix), `jobs.json`, résolution des fichiers, planche-contact.
- Caméra : Ken Burns (zoom-in / travelling / zoom-out / pan), **flash + tremblement + whoosh** à chaque coupe, impact grave à chaque scène.
- HUD en **verre dépoli** (compteur `SOLDE`, J-xx, Niveau +%, RÈGLE n/7…), textes à l'écran incrustés par le moteur
  (l'IA ne dessine jamais de texte : `CARTE REFUSÉE`, `COMPTE GELÉ`, `PHASE 2`…).
- Sous-titres propres en bas ; la barre « film complet » du Short est en bas-centre, sous les sous-titres.
- Prompts : `visual` par scène (+ variantes de cadrage automatiques) ou `visuals: [{p, at, overlay}]`, et `short.visuals` (voir EPISODE_SCHEMA.md).
  Un épisode sans prompts visuels est refusé par le moteur.
- Push : `DEFAULT_PUSH_EPISODES` (workflow) ; `workflow_dispatch` permet de choisir les épisodes.

## Structure

```
cloudViralEngine.js        moteur (images IA animées + HUD → ffmpeg), miniatures, métadonnées, pipeline "all"
aiScenes.js / aiStyle.json beats, jobs.json, tarz cümlesi unique
fallback_generate.py       secours Cloudflare / Hugging Face / Pollinations
lemo/ + LEMO_STYLE.md   dessin par code : scifi-toon (secours épisode entier) + dataviz (scènes d'info)
scripts/tts.py             edge-tts par scène → narration.wav, timeline.json, SRT (ponctuation réalignée)
scripts/make_jobs.js, kaggle_run.sh, report.py   jobs.json, Kaggle, rapport final
kaggle/kaggle_notebook_v2.py   notebook Kaggle (inchangé)
scripts/sfx.py             whoosh / impacts de transition
scripts/mix.py             musique procédurale + ducking + sfx + loudnorm 2 passes (-14 LUFS)
validateEpisodes.js        vérifie les contraintes de chaque formule (exécuté avant chaque rendu)
episodes/ep01..ep30.json   scénarios complets (voir EPISODE_SCHEMA.md)
30_EPISODES_CLOUD_PLAN.txt plan de production
```

## Tester sans réseau (développement)

```bash
npm ci && pip install -r requirements.txt
node cloudViralEngine.js all --episode 1 --offline --preview 20  # voix muette + images factices (test sans réseau)
node cloudViralEngine.js still --episode 3 --mode main --t 120  # image PNG de contrôle
```

Variables : `FPS` (25), `X264_PRESET` (veryfast), `BURN_SUBS=0` pour ne pas incruster les sous-titres.
