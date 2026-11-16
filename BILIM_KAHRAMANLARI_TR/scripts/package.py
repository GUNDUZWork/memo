#!/usr/bin/env python3
"""Release paketi: mp4 + srt + thumbnail + metadata.  python3 scripts/package.py ep01  -> out/epNN/release/"""
import json, pathlib, shutil, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
LANG_NAMES = dict(tr="Türkçe", en="English", fr="Français", de="Deutsch", es="Español", it="Italiano", pt="Português", ru="Русский", ar="العربية", hi="हिन्दी", zh="中文", ja="日本語", ko="한국어", id="Bahasa Indonesia", nl="Nederlands")

def main():
    eid = sys.argv[1]; d = ROOT / "out" / eid; rel = d / "release"; shutil.rmtree(rel, ignore_errors=True); rel.mkdir()
    data = json.loads((ROOT / "series/episodes.json").read_text(encoding="utf-8")); ep = data["episodes"][int(eid[2:]) - 1]
    tl = json.loads((d / "timeline.json").read_text(encoding="utf-8")); i18n = json.loads((d / "i18n.json").read_text(encoding="utf-8"))
    shutil.copy(d / f"{eid}.mp4", rel / f"{eid}.mp4")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(d / "thumb_0.jpg"), "-vf", "scale=1280:720", "-q:v", "3", str(rel / f"{eid}_thumb.jpg")], check=True)
    for f in sorted((d / "subs").glob("*.srt")): shutil.copy(f, rel / f"{eid}.{f.stem}.srt")
    mj = json.loads((d / "music.json").read_text(encoding="utf-8")) if (d / "music.json").exists() else {}
    meta = dict(episode=ep["n"], id=eid, series=data["series"], source_language="tr", duration_sec=tl["dur"], year=ep["year"], subject=ep["tag"],
                languages=sorted(i18n), music=dict(title=mj.get("title"), artist=mj.get("artist"), page=mj.get("page"), license="CC0" if not mj.get("synth") else "synthesized"),
                credits=tl["credit"], translations=i18n,
                titles={k: v["title"] for k, v in i18n.items()},
                descriptions={k: f"{v['series']} · {ep['n']}/30\n{v['title']} — {v['tag']} ({ep['year']})\n\n" + "\n".join(tl["credit"]) for k, v in i18n.items()})
    (rel / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    notes = [f"# {ep['n']:02d}. {ep['title']}", f"{ep['tag']} · {ep['year']}", "", "Altyazılar: " + ", ".join(f"{LANG_NAMES.get(k, k)} (`{eid}.{k}.srt`)" for k in sorted(i18n)), "", *tl["credit"]]
    (rel / "notes.md").write_text("\n".join(notes), encoding="utf-8")
    print(eid, "package:", sorted(p.name for p in rel.iterdir())[:6], "...", len(list(rel.iterdir())), "files")

main()
