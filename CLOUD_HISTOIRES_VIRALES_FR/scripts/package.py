#!/usr/bin/env python3
"""Range un épisode terminé dans YAYIN/epXX/ puis supprime les fichiers temporaires (build/epXX, dist/epXX).
usage : package.py <episode>   (depuis CLOUD_HISTOIRES_VIRALES_FR)"""
import os, shutil, sys

ep = f"ep{int(sys.argv[1]):02d}"
src = os.path.join("dist", ep)
dst = os.path.join("YAYIN", ep)
if not os.path.isdir(src):
    sys.exit(f"dist/{ep} introuvable")
os.makedirs("YAYIN", exist_ok=True)
if os.path.isdir(dst):
    shutil.rmtree(dst)
shutil.copytree(src, dst)
# rapport des sources conservé à côté (petit) ; vidéos intermédiaires et dossiers de travail supprimés
for tmp in (os.path.join("build", ep), src):
    shutil.rmtree(tmp, ignore_errors=True)
n = sum(len(f) for _, _, f in os.walk(dst))
print(f"YAYIN/{ep} : {n} fichiers ; temporaires supprimés")
