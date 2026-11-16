#!/usr/bin/env python3
"""Collect release assets for one episode into dist/<ep>/ : mp4 + srt (fr + translations) + thumbnail + metadata.json + notes.md"""
import json, os, shutil, subprocess, sys, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name = sys.argv[1]
B = os.path.join(ROOT, "series", "build")
tl = json.load(open(os.path.join(B, f"{name}.timeline.json")))
d = os.path.join(ROOT, "dist", name); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
shutil.copy(os.path.join(B, name, f"{name}.mp4"), d)
shutil.copy(os.path.join(B, name, "thumbnail.jpg"), os.path.join(d, f"{name}.thumbnail.jpg"))
subs = os.path.join(B, name, "subs")
for f in sorted(os.listdir(subs)): shutil.copy(os.path.join(subs, f), d)
def rd(p, default):
    try: return json.load(open(p))
    except Exception: return default
music = rd(os.path.join(B, name, "music.wav.json"), None)
tr = rd(os.path.join(B, name, "translations.json"), {})
st = rd(os.path.join(B, name, "translation_status.json"), {"engines": {}, "failed": []})
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(d, f"{name}.mp4")]).decode())
meta = dict(
    series="Année 1970", episode=tl["n"], of=30, id=name, title=tl["title"], date_label=tl["dateLabel"],
    titles={k: v[-1] for k, v in tr.items()}, duration_sec=round(dur, 1), language="fr", style=tl["style"],
    style_source="Lemo-Opuscar (lemomo-ai/lemo-opuscar): " + ("Halftone Dossier" if tl["style"] == "halftone" else "Mid-century Cartoon") + " (see LEMO_STYLE.md)",
    subtitles=sorted(["fr"] + list(st["engines"].keys())), subtitle_engines=st["engines"], subtitle_failed=st["failed"],
    narration="Microsoft Edge TTS (edge-tts), fr-FR-HenriNeural + fr-FR-DeniseNeural",
    music=(dict(title=music["title"], source=music["page"], license=music["license"]) if music else None),
    ambience="FFmpeg anoisesrc synthesis: " + str(tl.get("amb")), loudness="-14 LUFS (two-pass loudnorm), true peak <= -1 dBTP",
    resolution="1280x720@24", generated=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat(timespec="seconds") + "Z",
)
json.dump(meta, open(os.path.join(d, f"{name}.metadata.json"), "w"), ensure_ascii=False, indent=1)
notes = [f"# Année 1970 · Épisode {tl['n']:02d}/30 : {tl['title']}", "", f"*{tl['dateLabel']}* · {int(dur)} s · fr + {len(st['engines'])} langues de sous-titres", "",
         "## Sous-titres", "fr, " + ", ".join(sorted(st["engines"])) + (f" (non disponibles : {', '.join(st['failed'])})" if st["failed"] else ""), "",
         "## Crédits", "- Image : moteur de code Lemo-Opuscar (styles Halftone Dossier / Mid-century Cartoon), aucun générateur d'images.",
         "- Voix : Microsoft Edge TTS. Ambiance : synthèse FFmpeg. Faits : voir l'épisode (histoire générale 1970)."]
if music: notes.append(f"- Musique : {music['title'].replace('File:', '')}, licence {music['license']} ({music['page']}).")
else: notes.append("- Musique : aucune piste CC0 utilisable trouvée pour cet épisode.")
open(os.path.join(d, "notes.md"), "w", encoding="utf-8").write("\n".join(notes) + "\n")
print("packaged", d, sorted(os.listdir(d)))
