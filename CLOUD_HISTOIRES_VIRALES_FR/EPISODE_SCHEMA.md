# Format des épisodes (`episodes/epXX.json`)

Un fichier JSON UTF-8 par épisode : `ep01.json` … `ep30.json`.

```json
{
  "id": 1,
  "slug": "1-euro-par-seconde",
  "formula": "etsilab | homodeus | izranoff | 30jours",
  "title": "Titre exact du plan",
  "thumbnail": { "line1": "3-4 MOTS CHOC", "line2": "accroche courte", "accent": "#FFD400" },
  "youtube": {
    "title": "Titre YouTube (<= 95 caractères)",
    "description": "2-3 paragraphes en français (les chapitres sont ajoutés automatiquement)",
    "tags": ["15 tags", "..."],
    "pinned_comment": "Question pour faire commenter"
  },
  "counter": { "label": "SOLDE", "start": 0, "rate": 1, "unit": "€", "decimals": 0 },
  "scenes": [
    { "type": "hook", "title": "Titre de chapitre court", "narration": "Texte lu par la voix…", "onscreen": ["2-3 mots", "max 3 lignes"] }
  ],
  "short": {
    "hook_text": "TEXTE À L'ÉCRAN (3-6 mots)",
    "narration": "110-130 mots, ~50 s, finit sur un cliffhanger qui renvoie au film",
    "cta": "Le film complet est sur la chaîne"
  }
}
```

`counter` n'existe que pour la formule `etsilab` (`rate` = unités par seconde de vidéo,
`"mode": "exp"` + `"base"` optionnels pour une croissance exponentielle : valeur = start * base^(t/period)).

## Types de scènes

Communs : `hook` (toujours la 1re scène), `narration`, `outro` (toujours la dernière, sauf izranoff).
Champs communs : `type`, `title` (chapitre, <= 40 car.), `narration` (texte lu), `onscreen` (0-3 lignes courtes).

| Formule  | Types spécifiques | Champs |
|----------|-------------------|--------|
| etsilab  | `counter_focus`, `math`, `phase2` | math: `equation`, `result` ; phase2: `alert` (texte de la notification système) |
| homodeus | `rule`, `study`, `quote` | rule: `number` (1-3), `rule` ; study: `institution`, `year`, `authors`, `finding`, `stat` {`label`, `values`:[{`name`,`value` (nombre 0-100)}]}, `caveat` ; quote: `quote`, `author` |
| izranoff | `rule`, `tension`, `twist` | rule: `number` (1-7), `rule` ; twist = dernière scène |
| 30jours  | `day`, `card_refused`, `vidal`, `gag` | day: `day` (1-30), `level` (0-100) ; card_refused: `item`, `price` ; vidal: `line` ; gag: `caption` |

## Contraintes de formule (vérifiées par `node validateEpisodes.js`)

- Durée film : 8-10 min → **1250 à 1500 mots** de narration au total.
- etsilab : `counter` obligatoire, ≥ 3 `counter_focus`, ≥ 1 `math`, exactement 1 `phase2`
  placé vers 80-85 % du texte (le moteur affiche aussi la notification système PHASE 2 à 8:00).
- homodeus : exactement 3 `rule` (1,2,3) et exactement 2 `study` (études réelles, chiffres exacts).
- izranoff : exactement 7 `rule` (1..7) dans l'ordre, la dernière scène est `twist` (100-120 mots ≈ 45 s).
- 30jours : ≥ 4 `day`, ≥ 2 `card_refused`, ≥ 3 `vidal` (Docteur Vidal, personnage secondaire), ≥ 2 `gag`.
- Short : 110-130 mots.

## Prompts IA (obligatoires pour rendre un épisode)

- `scenes[].visual` : prompt anglais de la scène (lieu, personnage décrit en entier, lumière). Le moteur crée ~1 image / 5 s
  en ajoutant des variantes de cadrage (gros plan, plongée, plan large…).
- `scenes[].visuals` : alternative explicite, tableau de `"prompt"` ou `{ "p": "...", "at": "début de phrase", "overlay": {...} }`.
  `at` cale le beat sur le mot prononcé ; `overlay` = `{kind: stamp|banner|chip|phase2, text}` incrusté par le moteur.
- `scenes[].overlay` : `{kind, text, beat}` posé sur le beat n° `beat` de la scène.
- `short.visuals` : même format, 8-12 beats ; `short.counter_speed` : vitesse du compteur du Short.
- `thumbnail.visual` : prompt de la miniature. Jamais de texte dans les prompts : le texte est incrusté par le moteur.
