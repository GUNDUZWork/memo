#!/usr/bin/env python3
"""Rapport final : statut DONE/FAILED par épisode, source de chaque image, durée totale.
Usage: report.py jobs_api.json reports_dir run_started_at_iso"""
import collections
import datetime
import glob
import json
import os
import re
import sys

jobs = json.load(open(sys.argv[1]))["jobs"]
reports_dir, started = sys.argv[2], sys.argv[3]
status = {}
for j in jobs:
    m = re.search(r"Épisode (\d+)", j["name"])
    if m:
        status[int(m.group(1))] = "DONE" if j["conclusion"] == "success" else ("FAILED" if j["conclusion"] in ("failure", "cancelled", "timed_out") else (j["status"] or "?").upper())
rep = {}
for f in glob.glob(os.path.join(reports_dir, "**", "sources.json"), recursive=True):
    try:
        r = json.load(open(f, encoding="utf-8"))
        rep[r["episode"]] = r
    except Exception:  # noqa: BLE001
        pass
label = {"kaggle": "Kaggle", "api:cloudflare": "API:Cloudflare", "api:huggingface": "API:HuggingFace", "api:pollinations": "API:Pollinations", "lemo:scifi-toon": "toon", "lemo:dataviz": "info", "reuse": "réutilisée", "existant": "existant", "mock": "mock"}
tot = collections.Counter()
print("## Rapport final\n")
print("| Épisode | Statut | Images (Kaggle / API / réutilisées / toon entier / scènes d'info) | Durée du rendu |")
print("|---|---|---|---|")
for ep in sorted(set(status) | set(rep)):
    r = rep.get(ep)
    st = status.get(ep, "FAILED")
    if r:
        c = r["sources"]; tot.update(c)
        kag = c.get("kaggle", 0); api = sum(v for k, v in c.items() if k.startswith("api")); code = c.get("reuse", 0); toon = c.get("lemo:scifi-toon", 0); info = c.get("lemo:dataviz", 0)
        other = sum(v for k, v in c.items() if k not in ("kaggle", "reuse", "lemo:scifi-toon", "lemo:dataviz") and not k.startswith("api"))
        cell = f"{kag} / {api} / {code} / {toon} / {info}" + (f" (+{other} existantes)" if other else "")
        dur = f"{r['seconds'] // 60} min"
    else:
        cell, dur = "—", "—"
    print(f"| ep{ep:02d} | **{st}** | {cell} | {dur} |")
done = sum(1 for v in status.values() if v == "DONE")
print(f"\n- Épisodes DONE : **{done}** / FAILED : **{len(status) - done}**")
print("- Sources (toutes images) : " + ", ".join(f"{label.get(k, k)}={v}" for k, v in sorted(tot.items())))
try:
    t0 = datetime.datetime.fromisoformat(started.replace("Z", "+00:00"))
    dt = datetime.datetime.now(datetime.timezone.utc) - t0
    print(f"- Durée totale de l'exécution : **{int(dt.total_seconds() // 60)} min**")
except Exception:  # noqa: BLE001
    pass
print("- Dessins par code = style Lemo-Opuscar uniquement (toon si aucune image IA ; dataviz pour les scènes d'info) ; non enregistrés dans ai_assets/.")
