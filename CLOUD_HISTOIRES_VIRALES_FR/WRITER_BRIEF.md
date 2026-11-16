# Brief scénaristes (référence interne)

Langue : français naturel, oral, tutoiement, phrases courtes rythmées pour la voix
edge-tts (fr-FR-RemyMultilingualNeural). Pas d'emoji, pas de markdown dans `narration`.
Les chiffres sont écrits comme on les lit quand ils sont ambigus. Contenu familial/YouTube-safe.
Personnages et histoires 100 % originaux (ne pas copier de chaînes existantes).

## Formules
- etsilab : scénario "Et si…" à la 2e personne. Escalade logique avec calculs (le compteur
  monte à l'écran pendant tout le film). Une scène `phase2` vers 80-85 % du texte : la règle
  change brutalement (notification système). Fin : leçon + question au spectateur.
- homodeus : essai narratif psychologie/pouvoir. 3 règles numérotées, chacune illustrée par une
  mini-histoire. 2 scènes `study` avec des ÉTUDES RÉELLES, chiffres exacts, ET une nuance honnête
  (`caveat`). N'utilise QUE ces études, avec ces chiffres :
  * Milgram 1963, Université Yale : 26 participants sur 40 (65 %) sont allés jusqu'à 450 volts.
  * Asch 1951, Swarthmore College : environ 75 % des participants se sont conformés au moins une fois ; conformité ≈ 37 % des essais critiques.
  * Darley & Batson 1973, Université de Princeton (Bon Samaritain) : ont aidé 63 % (pas pressés), 45 % (moyennement pressés), 10 % (très pressés).
  * Langer, Blank & Chanowitz 1978, Université Harvard (photocopieuse) : 60 % acceptent sans raison, 94 % avec une vraie raison, 93 % avec une fausse raison ("parce que je dois faire des copies").
  * Kruger & Dunning 1999, Université Cornell : le quart le moins performant a obtenu un score au 12e percentile mais s'est estimé au 62e.
  * Mischel (marshmallow), Université Stanford, 1970/1989 ; nuance : Watts, Duncan & Quan 2018 trouvent un effet bien plus faible une fois le milieu social pris en compte.
  * Regan 1971, Université Cornell (réciprocité, canette de Coca offerte) : les participants ont acheté environ deux fois plus de billets de tombola.
  * Festinger & Carlsmith 1959, Université Stanford : payés 1 dollar, les participants jugent la tâche ennuyeuse plus intéressante que ceux payés 20 dollars.
  * Willis & Todorov 2006, Université de Princeton : un jugement de confiance sur un visage se forme en 100 millisecondes.
  * Gloria Mark, Université de Californie à Irvine : environ 23 minutes pour revenir pleinement à une tâche après une interruption.
  * Sophie Leroy 2009, Université de Washington : le "résidu attentionnel" — changer de tâche laisse une partie de l'attention sur la précédente.
  * Lally et al. 2010, University College London : une habitude met en médiane 66 jours à s'automatiser (de 18 à 254 jours).
  * Kahneman & Tversky 1979 / Tversky & Kahneman 1992 : une perte pèse environ 2 fois plus qu'un gain équivalent (coefficient ≈ 2,25).
  * Carney, Cuddy & Yap 2010 ("power posing") ; nuance : Ranehill et al. 2015 n'ont pas reproduit l'effet hormonal.
  `stat.values` : 2-4 barres, nombres 0-100 (pourcentages ou percentiles), `label` décrit l'unité.
- izranoff : horreur/tension nocturne à la 2e personne, crédible, sans gore. 7 règles numérotées
  données par une source (voisin, note, panneau…), chaque règle a une raison inquiétante.
  Scènes `tension` entre les règles. Dernière scène `twist` (100-120 mots) : retournement qui
  recontextualise une règle ; termine sur une phrase glaçante.
- 30jours : comédie de transformation. Héros (prénom original) au compteur J-30 → J-0.
  Scènes `day` (jour + niveau 0-100 qui progresse), `card_refused` (achat raté, `item`, `price`
  ex. "89,99 €"), `vidal` (Docteur Vidal, médecin pince-sans-rire qui commente ; `line` = sa
  réplique culte affichée en bulle, elle doit aussi être dite dans `narration`), `gag` (`caption`
  = légende visuelle drôle). Fin émouvante + morale.

Structure conseillée : 14-22 scènes de 40-120 mots. Total 1250-1500 mots (vise ~1380).
Short : 110-130 mots, hook fort dès la 1re phrase, finit en suspens + renvoi au film.
Valide avec : `node validateEpisodes.js <ids>` depuis CLOUD_HISTOIRES_VIRALES_FR/.
