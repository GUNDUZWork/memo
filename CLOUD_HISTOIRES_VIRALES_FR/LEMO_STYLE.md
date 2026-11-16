# Styles de dessin par code (source : Lemo-Opuscar)

Texte rédigé par nous (les .md de la bibliothèque sont CC BY-NC, non copiés). Le code adapté vient de la bibliothèque (MIT, voir `lemo/LICENSE-lemo-opuscar-MIT.txt`) ; la bibliothèque elle-même (`styles/`, `core/`) n'est pas modifiée : le code utile est copié et adapté dans `lemo/`.

## Choix
| Rôle | Style | Pourquoi |
|---|---|---|
| a) Style de secours principal (épisode entier sans image IA) | **scifi-toon** | Seul candidat solide qui dessine des **personnages en code** : traits d'épaisseur constante à l'écran, 3 dessins qui « bouillonnent » à 12 i/s, aplats avec ombre dure, gros yeux blancs. Lisible en 1 s, expressif (sitcom), adapté à nos sketches (banque, clinique, nuit, chambre). |
| b) Style des scènes d'info (cartes, chiffres, courbes, frises, schémas) | **dataviz** | Papier crème, crayon rouge/bleu, écriture manuscrite : clair pour les chiffres, sobre, contraste fort avec le toon, donc l'info « sort » du récit. |
| Candidat écarté | midcentury-toon | Joli mais figures très géométriques et peu expressives : mauvais pour 30 s de visages en gros plan. |
Exclus d'office : comic-history, manga-panels, text-flash-cuts (demandent un générateur d'images).

## Invariants respectés (scifi-toon)
Contour encre épais constant en espace écran, 3 dessins en rotation à 12 i/s, aplats sans dégradé + une ombre dure par forme, yeux blancs globuleux avec pupilles, palette plate par « monde ». (dataviz) papier crème, encre sombre, accents crayon rouge/bleu, légende manuscrite, jamais de décor figuratif.

## Règles d'usage
- Histoire, personnages et scènes viennent de NOS scénarios (`lemo/cast.js` : distribution maison) ; rien du film de démonstration n'est repris.
- Textes à l'écran et plaques en français. Aucun visage réel, logo d'entreprise, ni le personnage Clawd.
- **Jamais de dessin pour une seule image manquante** : réutilisation de l'image IA voisine (même scène d'abord).
- Si **aucune** image IA n'existe pour l'épisode (Kaggle + chaîne API épuisés) : tout l'épisode (film, Short, miniature) en scifi-toon. Jamais de mélange IA/code dans un épisode.
- Scènes d'info (`counter_focus`, `math`, `study`, `day`) : toujours en dataviz, dessinées en direct dans le film, même si des images IA existent.
- Étalonnage commun à toutes les images (IA, réutilisées, dessinées) : LUT 3D `lemo/grade.cube` (générée par `lemo/make_grade.js`) + vignette de bord, appliquées à l'encodage ffmpeg.
- Polices : DejaVu par défaut (déposer Caveat/Newsreader/IBM Plex Mono dans `lemo/fonts/` pour la finition).

## Mise à jour (décision : plus aucune image IA)
- Tous les épisodes (film, Short, miniature) sont désormais dessinés entièrement par ce moteur : scifi-toon pour le récit, dataviz pour les scènes d'information. Il n'y a plus de réutilisation d'images IA ni de chaîne Kaggle / Colab / API.
- Ambiance (profondeur, atmosphère) obtenue sans casser les aplats du style : ombre portée dure sous chaque personnage, LUT 3D commune `lemo/grade.cube`, vignette de bord et grain de film appliqués à l'encodage sur tous les plans.
- Marionnette : rebond et ouverture de bouche pilotés par l'enveloppe de la voix, inclinaison ~2,5 %, respiration, entrée en marchant, secousse/pulsation sur `shocked` / `angry` / `sad`, retournement vers celui qui prend la parole.
- Image de contrôle : `masterpiece_showcase.jpg` (générée par `node lemo/showcase.js`).
