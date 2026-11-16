#!/usr/bin/env python3
"""Royalty-free music: ONLY Wikimedia Commons files whose licence is exactly CC0, instrumental, no covers / audiobooks / speech.
  python3 scripts/music.py catalog series/build/music_catalog.json      # one job builds the catalogue (rate-limit friendly)
  python3 scripts/music.py pick series/build/music_catalog.json 7 out.wav [seconds]   # download + convert the track for episode 7
If nothing usable is found the episode is simply made without music (ambience + voice) and metadata says so.
"""
import json, os, re, subprocess, sys, time, urllib.parse, urllib.request, urllib.error
UA = {"User-Agent": "Annee1970Pipeline/1.0 (GitHub Actions video pipeline; https://github.com/GUNDUZWork/memo)"}
QUERIES = ["instrumental", "piano", "ambient", "jazz", "guitar", "orchestral", "electronic", "calm", "cinematic", "classical", "lounge", "acoustic"]
# anything that hints at vocals, spoken word, covers, effects, tests, jingles, anthems
BAD = re.compile(r"cover|audiobook|librivox|lingua libre|pronunciation|spoken|speech|voice|vocal|sung|singer|song\b|songs\b|lyrics|karaoke|interview|podcast|lecture|narrat|reading|anthem|remix of|sound effect|sfx|test|note\b|chord|scale|ringtone|jingle|halloween|ghost|witch|monster|horror|scream|midi|a cappella|choir|opera|recorded live|field recording|ambient kitchen|birdsong|speaking|pone\.|plos|teletubb|giải|communication|signature|tuning|cochlear|experiment|journal|nikitralala|disquiet|palindrome", re.I)
GOOD = re.compile(r"instrumental|ambient music|piano|guitar|jazz|orchestra|electronic music|classical|cinematic|lounge|acoustic|chill|calm", re.I)

def get(url, binary=False, tries=8):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                d = r.read()
                return d if binary else json.loads(d)
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503): raise
            time.sleep(3 + k * 5)
        except Exception:
            time.sleep(3 + k * 3)
    raise SystemExit("Commons unreachable / rate-limited: " + url[:90])

def catalog(out):
    seen, items = set(), []
    for q in QUERIES:
        p = dict(action="query", generator="search", gsrsearch=f'filetype:audio {q} incategory:"CC-zero"', gsrnamespace=6, gsrlimit=50,
                 prop="imageinfo", iiprop="url|mime|size|extmetadata", iiextmetadatafilter="LicenseShortName|ImageDescription|Categories|ObjectName", format="json")
        r = get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(p))
        for pg in (r.get("query", {}).get("pages", {}) or {}).values():
            if pg["title"] in seen or "imageinfo" not in pg: continue
            seen.add(pg["title"]); ii = pg["imageinfo"][0]; m = ii.get("extmetadata", {})
            lic = m.get("LicenseShortName", {}).get("value", "")
            cats = m.get("Categories", {}).get("value", ""); desc = re.sub("<[^>]+>", " ", m.get("ImageDescription", {}).get("value", ""))
            blob = f'{pg["title"]} {cats} {desc}'
            if lic.strip().upper() not in ("CC0", "CC0 1.0", "CC-ZERO"): continue
            if ii["mime"] not in ("audio/ogg", "application/ogg", "audio/mpeg", "audio/flac", "audio/wav", "audio/x-wav"): continue
            if not (400_000 <= ii["size"] <= 40_000_000): continue
            if BAD.search(blob) or not GOOD.search(blob): continue
            items.append(dict(title=pg["title"], url=ii["url"], mime=ii["mime"], size=ii["size"], license=lic, page="https://commons.wikimedia.org/wiki/" + urllib.parse.quote(pg["title"].replace(" ", "_"))))
        time.sleep(2)
    items.sort(key=lambda x: x["title"])
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    json.dump(items, open(out, "w"), indent=1, ensure_ascii=False)
    print(f"catalog: {len(items)} CC0 instrumental candidates")
    for it in items[:40]: print("  ", it["title"], it["size"] // 1000, "KB")

def dur(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode().strip() or 0)

def pick(cat, n, out, want=70):
    items = json.load(open(cat))
    if not items: print("no music candidates"); sys.exit(3)
    for k in range(len(items)):
        it = items[(n * 7 + k) % len(items)]
        tmp = out + ".src"
        try:
            open(tmp, "wb").write(get(it["url"], binary=True))
            d = dur(tmp)
            if d < 40: continue
            # trim / loop to the wanted length, 48 kHz stereo wav
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-stream_loop", "-1", "-i", tmp, "-t", str(want), "-ac", "2", "-ar", "48000", out], check=True)
            os.remove(tmp)
            json.dump(it, open(out + ".json", "w"), ensure_ascii=False)
            print("music:", it["title"], f"({d:.0f}s) {it['license']}"); return
        except Exception as e:
            print("skip", it["title"], e, file=sys.stderr)
    print("no usable music"); sys.exit(3)

if __name__ == "__main__":
    if sys.argv[1] == "catalog": catalog(sys.argv[2])
    else: pick(sys.argv[2], int(sys.argv[3]), sys.argv[4], float(sys.argv[5]) if len(sys.argv) > 5 else 70)
