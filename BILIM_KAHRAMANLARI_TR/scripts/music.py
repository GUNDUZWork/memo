#!/usr/bin/env python3
"""Telifsiz müzik: Wikimedia Commons'tan YALNIZCA CC0 lisanslı enstrümantal parçalar.
  python3 scripts/music.py resolve            -> out/music/tracks.json   (bir kez; hazırlık işinde)
  python3 scripts/music.py pick ep07          -> out/ep07/music.json (+ indirilen dosya)
Filtre: lisans CC0 şart; başlık/açıklama/kategorilerde cover, audiobook, spoken, vocal, song... geçen dosyalar elenir.
Hiç uygun parça yoksa mix.py temiz bir sentez zemini (fallback) kullanır; bu durum music.json'da synth:true olur."""
import json, pathlib, re, subprocess, sys, time, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "cloud-video-factory/1.0 (educational video generator)"}
QUERIES = ["instrumental piano", "ambient instrumental", "acoustic guitar instrumental", "orchestral instrumental", "jazz instrumental", "classical instrumental", "electronic instrumental", "harp instrumental"]
BAD = re.compile(r"cover|audiobook|audio book|spoken|speech|reading|read by|librivox|vocal|voice|sing|sung|song|lyrics|lyric|choir|chorus|karaoke|interview|podcast|narrat|recitation|poem|talk|lecture|a cappella|acapella|rap\b|hymn|anthem|text-to-speech|tts", re.I)
OKEXT = (".ogg", ".oga", ".mp3", ".wav", ".flac", ".opus")

def get(url, params=None, retries=4):
    if params: url += "?" + urllib.parse.urlencode(params)
    for i in range(retries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r: return r.read()
        except Exception as e:
            print("retry", i, e, file=sys.stderr); time.sleep(3 + 4 * i)
    raise RuntimeError("fetch failed: " + url)

def resolve():
    out, seen = [], set()
    for q in QUERIES:
        j = json.loads(get(API, dict(action="query", format="json", generator="search", gsrnamespace=6, gsrlimit=50,
            gsrsearch=f"{q} filetype:audio incategory:CC-Zero", prop="imageinfo", iiprop="url|mime|size|extmetadata")))
        for pg in (j.get("query", {}).get("pages", {}) or {}).values():
            ii = (pg.get("imageinfo") or [{}])[0]; md = ii.get("extmetadata", {}); title = pg.get("title", "")
            lic = (md.get("LicenseShortName", {}).get("value", "") + " " + md.get("License", {}).get("value", "")).lower()
            if "cc0" not in lic and "cc-zero" not in lic and "public domain dedication" not in lic: continue
            if not ii.get("url", "").lower().endswith(OKEXT): continue
            text = " ".join(md.get(k, {}).get("value", "") for k in ("ObjectName", "ImageDescription", "Categories", "Artist")) + " " + title
            if BAD.search(text): continue
            dur = float(ii.get("duration") or 0)
            if dur and not (45 <= dur <= 900): continue
            if title in seen: continue
            seen.add(title)
            artist = re.sub("<[^>]+>", "", md.get("Artist", {}).get("value", "")).strip() or "Wikimedia Commons"
            out.append(dict(title=title.replace("File:", ""), url=ii["url"], page="https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_")), artist=artist[:60], dur=dur))
        time.sleep(1.2)
    out.sort(key=lambda t: t["title"])
    d = ROOT / "out/music"; d.mkdir(parents=True, exist_ok=True)
    (d / "tracks.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(len(out), "CC0 instrumental candidates")

def pick(eid):
    n = int(eid[2:]); d = ROOT / "out" / eid; d.mkdir(parents=True, exist_ok=True)
    tj = ROOT / "out/music/tracks.json"; tracks = json.loads(tj.read_text(encoding="utf-8")) if tj.exists() else []
    for k in range(len(tracks)):
        t = tracks[(n - 1 + k) % len(tracks)]
        ext = pathlib.Path(urllib.parse.urlparse(t["url"]).path).suffix
        f = d / ("music_src" + ext)
        try: f.write_bytes(get(t["url"]))
        except Exception as e: print("skip", t["title"], e, file=sys.stderr); continue
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)], capture_output=True, text=True)
        try: dur = float(r.stdout.strip())
        except ValueError: continue
        if dur < 30: continue
        (d / "music.json").write_text(json.dumps(dict(file=f.name, synth=False, credit=f"Müzik: “{t['title'][:48]}” — {t['artist']} · Wikimedia Commons · CC0", **{k: t[k] for k in ("title", "page", "artist")}), ensure_ascii=False), encoding="utf-8")
        print(eid, "music:", t["title"]); return
    (d / "music.json").write_text(json.dumps(dict(file=None, synth=True, credit="Müzik: sentezlenmiş fon (CC0 parça bulunamadı)"), ensure_ascii=False), encoding="utf-8")
    print(eid, "no CC0 track available -> synth fallback")

if __name__ == "__main__":
    resolve() if sys.argv[1] == "resolve" else pick(sys.argv[2])
