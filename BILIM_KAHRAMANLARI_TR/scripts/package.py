#!/usr/bin/env python3
"""Tek dilli (tr) yayın paketi: mp4 + tr.srt + thumbnail + metadata.json.  python3 scripts/package.py ep01 -> out/epNN/release/
Çeviri YOK (kalıcı kural). Altyazı doğrudan timeline.json satırlarından yazılır."""
import json, pathlib, shutil, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
LANG = "tr"

def ts(t):
    ms = int(round(t * 1000)); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
def wrap(text, width=42):
    if len(text) <= width: return text
    w = text.split(" "); mid = len(text) / 2; best = min(range(1, len(w)), key=lambda i: abs(len(" ".join(w[:i])) - mid), default=None)
    return text if best is None else " ".join(w[:best]) + "\n" + " ".join(w[best:])
def srt(lines):
    out = []
    for i, l in enumerate(lines, 1):
        nxt = lines[i]["t0"] if i < len(lines) else l["t1"] + 3
        end = min(max(l["t1"] + 0.6, l["t0"] + 1.8), nxt - 0.04)
        out.append(f"{i}\n{ts(l['t0'])} --> {ts(end)}\n{wrap(l['text'])}\n")
    return "\n".join(out)

def main():
    eid = sys.argv[1]; d = ROOT / "out" / eid; rel = d / "release"; shutil.rmtree(rel, ignore_errors=True); rel.mkdir()
    data = json.loads((ROOT / "series/episodes.json").read_text(encoding="utf-8")); ep = data["episodes"][int(eid[2:]) - 1]
    tl = json.loads((d / "timeline.json").read_text(encoding="utf-8"))
    shutil.copy(d / f"{eid}.mp4", rel / f"{eid}.mp4")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(d / "thumb_0.jpg"), "-vf", "scale=1280:720", "-q:v", "3", str(rel / f"{eid}_thumb.jpg")], check=True)
    (rel / f"{eid}.{LANG}.srt").write_text(srt(tl["lines"]), encoding="utf-8")
    mj = json.loads((d / "music.json").read_text(encoding="utf-8")) if (d / "music.json").exists() else {}
    cr = list(tl["credit"])
    if mj.get("credit") and cr and cr[0].startswith("Müzik"): cr[0] = mj["credit"]      # mix.py müziği değiştirmiş olabilir
    tl["credit"] = cr; credit = "\n".join(cr)
    meta = dict(language=LANG, episode=ep["n"], id=eid, series=data["series"], duration_sec=tl["dur"], year=ep["year"], subject=ep["tag"], style=ep.get("style"), info_style=ep.get("info"),
                title=f"{ep['title']} — {ep['tag']} | {data['series']} {ep['n']}/30",
                description=f"{data['series']} · {ep['n']}/30\n{ep['title']} — {ep['tag']} ({ep['year']})\n\n{credit}",
                tags=["bilim", "bilim tarihi", "bilim insanları", ep["tag"], "belgesel", "animasyon", "eğitim"],
                music=dict(title=mj.get("title"), artist=mj.get("artist"), page=mj.get("page"), license="CC0" if not mj.get("synth") else "synthesized"), credits=tl["credit"])
    (rel / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    (rel / "notes.md").write_text(f"# {ep['n']:02d}. {ep['title']}\n{ep['tag']} · {ep['year']}\n\nAltyazı: Türkçe (`{eid}.{LANG}.srt`)\n\n{credit}\n", encoding="utf-8")
    print(eid, "package:", sorted(p.name for p in rel.iterdir()))

main()
