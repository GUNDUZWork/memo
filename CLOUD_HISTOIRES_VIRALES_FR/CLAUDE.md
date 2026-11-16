# CLAUDE.md — règles du projet CLOUD_HISTOIRES_VIRALES_FR

Décision du propriétaire (remplace toutes les consignes précédentes sur les images) : **on ne s'occupe plus de Colab, de Kaggle ni des quotas d'API d'images IA gratuites**.
Les anciens dessins géométriques simples (`folkDocEngine.js`, `rig.js`, `codeFallback.js` et équivalents) ne sont **jamais** utilisés.
Tout visuel et toute scène sont produits par le moteur Lemo-Opuscar adapté (`lemo/`), sans aucun GPU ni quota externe.

## 1. Utiliser l'installation centrale Lemo-Opuscar (ne pas re-cloner)
- La bibliothèque est déjà installée en `D:\lemo-opuscar` chez le propriétaire : ne pas refaire `git clone`, ne pas relancer le lourd `setup.sh`.
  Lire directement `AGENTS.md`, `styles/README.md` et `TECHNIQUE.md` de cette bibliothèque.
- Dans le cloud, `D:\` n'existe pas : la copie de lecture est le clone déjà présent (`/home/user/lemomo-ai/lemo-opuscar`). Le rendu CI ne dépend d'aucun clone : le code utile est copié et adapté dans `lemo/`.
- Ne jamais modifier `styles/` ni `core/` de la bibliothèque ; ne copier que ce qui est nécessaire dans ce projet.
- Licences : code MIT (fichier `lemo/LICENSE-lemo-opuscar-MIT.txt`) ; textes de la bibliothèque CC BY-NC : ne pas les recopier, rédiger les nôtres.

## 2. Choix de style spécifique à la chaîne
- Jamais `comic-history`, `manga-panels`, `text-flash-cuts` (ils exigent un générateur d'images externe).
- Deux styles uniquement, décrits dans `LEMO_STYLE.md` : (a) style principal histoire + personnages (**scifi-toon**), (b) style information/schéma (**dataviz**) pour cartes, frises, statistiques, budgets, arbres.
- Jamais de mélange IA / code dans un épisode (il n'y a plus d'IA) ; tous les plans partagent la même palette, la même LUT (`lemo/grade.cube`), la vignette, le grain et le langage de caméra, et respectent les invariants de `STYLE.md`.

## 3. Marionnette dynamique et caméra
Toujours actifs dans `lemo/cast.js` + `cloudViralEngine.js` : rebond vertical selon l'enveloppe de la voix, inclinaison rythmique (~2,5 %), respiration, entrée en marchant au début d'une scène, réaction (secousse + pulsation d'échelle) sur `shocked` / `angry` / `sad`, retournement automatique vers celui qui parle, caméra Ken Burns + flash/tremblement à chaque coupe.

## 4. Son, langue unique, publication
- Tous les textes à l'écran, HUD et plaques de nom sont en français et ne débordent pas des cadres.
- Voix `edge-tts` fr-FR-RemyMultilingualNeural au premier plan ; musique libre de droits générée + ambiances FFmpeg à 12 % ; sortie normalisée **-14 LUFS** (loudnorm 2 passes).
- **Aucune traduction** : un seul `fr` (sous-titres, titre, description, métadonnées, miniature). Le pas « Traductions » est supprimé ; ne jamais le réintroduire. Titres YouTube coupés à 100 caractères.
- Chaque épisode terminé est rangé dans `YAYIN/epXX/` (`scripts/package.py`) et les fichiers temporaires (`build/`, `dist/`) sont supprimés.

## 5. Protocole autonome
- Ne jamais demander d'approbation ni « dois-je continuer ? » : produire `masterpiece_showcase.jpg` (planche de personnages + image de scène d'information) puis rendre et empaqueter les épisodes 1 à 30 dans l'ordre.
- Ne jamais enregistrer de clé/jeton dans le code, les fichiers ou les logs.

## 6. Les 10 styles procéduraux « Claude » (module permanent, 0 API / 0 GPU)
Code dans `lemo/styles/` (un seul fichier `index.js` + `util.js`), basé sur Canvas 2D / node-canvas. Chaque style est un modèle de rendu : `skin` (trait, remplissage, lueur, ombre du moteur `lemo/toon.js`), `base` (fond animé), `post` (traitement d'image), `info` (thème des scènes d'information).
Styles : `pixel_art`, `chalkboard`, `line_art`, `ps2_3d`, `comic_book`, `flat_vector`, `gold_line_art`, `cgi_3d`, `lego`, `neon_cyber` (voir LEMO_STYLE.md pour le détail).
- Style principal par chaîne (surchargeable par `ep.style` dans le JSON d'épisode ou la variable `LEMO_STYLE`) : etsilab → `flat_vector`, homodeus → `cgi_3d`, izranoff → `neon_cyber`, 30jours → `comic_book`.
- Scènes d'information (cartes, courbes, frises, statistiques, maths) : automatiquement `chalkboard` (etsilab, homodeus, 30jours) ou `gold_line_art` (izranoff) ; surchargeable par `ep.info_style` / `LEMO_INFO_STYLE`.
- Dans TOUS les styles : même marionnette (rebond selon la voix, inclinaison ±2,5 %, respiration, entrée en marchant, secousse de réaction, retournement vers celui qui parle) et même caméra (Ken Burns, flash + tremblement à la coupe, zoom/pan).
- Aucune API externe, aucun quota : interdit d'ajouter une dépendance réseau ou GPU dans `lemo/styles/`.
- Les styles 3D (`ps2_3d`, `cgi_3d`, `lego`) sont des SIMULATIONS 2D du langage visuel (polygones, jitter, brouillard, profondeur de champ, rayons, briques à tenons) — pas un vrai moteur 3D.
- Image de contrôle : `node lemo/showcase_styles.js masterpiece_showcase.jpg`.
