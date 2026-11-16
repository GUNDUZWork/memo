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

## Les 10 styles procéduraux « Claude » (module `lemo/styles/`)
| # | id | Ce que fait le code |
|---|---|---|
| 1 | `pixel_art` | rendu réduit (~280 px de large) + palette 32 couleurs + tramage de Bayer, agrandissement sans lissage, fond à 3 plans de parallaxe qui défilent |
| 2 | `chalkboard` | ardoise avec traces d'éponge et cadre bois ; traits tremblants (bruit renforcé), remplissages en craie translucide, poussière de craie par bruit ; thème d'information « tableau noir » |
| 3 | `line_art` | papier grainé, contours d'encre fins, aplats blancs/noirs, pas d'ombres ; le dessin « s'écrit » de gauche à droite au début de chaque plan |
| 4 | `ps2_3d` | polygones grossiers (pas de contour, pas de boil), couleur 15 bits, définition ~420 px, bandes qui tremblent à 12 i/s (jitter), brouillard |
| 5 | `comic_book` | contours noirs épais, couleurs saturées, points Ben-Day dans les ombres, gouttière diagonale de case, bulle d'effet (« HEIN ?! », « PAF ! », « GLUP… ») sur les réactions |
| 6 | `flat_vector` | aplats en dégradé doux, sans contour, ombres douces en couches, vignette légère |
| 7 | `gold_line_art` | velours nuit avec étincelles, traits en dégradé or `#D4AF37`→`#FFD700` avec lueur et bloom ; thème d'information « lignes d'or » |
| 8 | `cgi_3d` | dégradés volumétriques, ombres douces, profondeur de champ (bords flous), rayons de lumière (god rays), bloom léger |
| 9 | `lego` | palette de briques, mosaïque de 96 colonnes avec tenons (studs) en relief, éclairage chaud |
| 10 | `neon_cyber` | ville de nuit vue par la fenêtre, coupe de pièce isométrique en néon violet/bleu/rose, traits néon et bloom, lignes de balayage |

Règles : style principal par chaîne et style d'information automatique (voir CLAUDE.md §6) ; même marionnette et même caméra dans tous les styles ; les styles 3D sont des simulations 2D ; aucune API, aucun GPU.
