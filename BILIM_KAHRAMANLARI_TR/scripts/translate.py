#!/usr/bin/env python3
"""14 dil çeviri + SRT.  python3 scripts/translate.py ep01
Önce Pollinations LLM (https://text.pollinations.ai/openai), başarısız segmentler için MyMemory yedeği.
Çıktı: out/epNN/i18n.json ve out/epNN/subs/<dil>.srt (kaynak Türkçe dahil)."""
import json, pathlib, re, sys, time, urllib.parse, urllib.request
ROOT = pathlib.Path(__file__).resolve().parent.parent
LANGS = {"en": "English", "fr": "French", "de": "German", "es": "Spanish", "it": "Italian", "pt": "Portuguese", "ru": "Russian",
         "ar": "Arabic", "hi": "Hindi", "zh": "Simplified Chinese", "ja": "Japanese", "ko": "Korean", "id": "Indonesian", "nl": "Dutch"}
MM = {"zh": "zh-CN"}
UA = {"User-Agent": "cloud-video-factory/1.0", "Content-Type": "application/json"}

def pollinations(segs, lang):
    sysmsg = (f"You are a professional subtitle translator. Translate the following JSON array of Turkish strings into {LANGS[lang]}. "
              "Keep proper names of people and places in their usual form. Return ONLY a JSON array of strings with exactly the same length and order. No commentary, no code fences.")
    body = json.dumps(dict(model="openai", temperature=0.2, messages=[dict(role="system", content=sysmsg), dict(role="user", content=json.dumps(segs, ensure_ascii=False))])).encode()
    for i in range(6):
        try:
            req = urllib.request.Request("https://text.pollinations.ai/openai", data=body, headers=UA)
            with urllib.request.urlopen(req, timeout=90) as r: txt = json.loads(r.read())["choices"][0]["message"]["content"].strip()
            txt = re.sub(r"^```(?:json)?|```$", "", txt.strip(), flags=re.M).strip()
            out = json.loads(txt[txt.index("["): txt.rindex("]") + 1])
            if len(out) == len(segs) and all(isinstance(s, str) and s.strip() for s in out): return [s.strip() for s in out]
            print(f"[{lang}] bad shape ({len(out)} vs {len(segs)}), retry", file=sys.stderr)
        except Exception as e:
            print(f"[{lang}] pollinations retry {i}: {e}", file=sys.stderr)
        time.sleep(4 * (i + 1))
    return None

def mymemory(s, lang):
    for i in range(3):
        try:
            u = "https://api.mymemory.translated.net/get?" + urllib.parse.urlencode(dict(q=s, langpair=f"tr|{MM.get(lang, lang)}"))
            with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA["User-Agent"]}), timeout=40) as r: j = json.loads(r.read())
            t = j["responseData"]["translatedText"]
            if t and "MYMEMORY WARNING" not in t.upper() and "QUERY LENGTH LIMIT" not in t.upper(): return t
        except Exception as e: print(f"[{lang}] mymemory retry {i}: {e}", file=sys.stderr)
        time.sleep(3)
    return None

def wrap(text, lang):
    width = 20 if lang in ("zh", "ja", "ko") else 42
    if len(text) <= width: return text
    words = text.split(" ") if lang not in ("zh", "ja") else list(text)
    sep = " " if lang not in ("zh", "ja") else ""
    best, mid = None, len(text) / 2
    for i in range(1, len(words)):
        a, b = sep.join(words[:i]), sep.join(words[i:])
        if best is None or abs(len(a) - mid) < abs(len(best[0]) - mid): best = (a, b)
    return f"{best[0]}\n{best[1]}" if best else text

def ts(t):
    h, m, s = int(t // 3600), int(t % 3600 // 60), t % 60
    return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}".replace(",1000", ",999")

def srt(lines, texts, lang):
    out = []
    for i, (l, t) in enumerate(zip(lines, texts), 1):
        nxt = lines[i]["t0"] if i < len(lines) else l["t1"] + 3
        end = min(max(l["t1"] + 0.6, l["t0"] + 1.8), nxt - 0.04)
        out.append(f"{i}\n{ts(l['t0'])} --> {ts(end)}\n{wrap(t, lang)}\n")
    return "\n".join(out)

def main():
    eid = sys.argv[1]; d = ROOT / "out" / eid; (d / "subs").mkdir(parents=True, exist_ok=True)
    data = json.loads((ROOT / "series/episodes.json").read_text(encoding="utf-8")); ep = data["episodes"][int(eid[2:]) - 1]
    tl = json.loads((d / "timeline.json").read_text(encoding="utf-8")); lines = tl["lines"]
    segs = [ep["title"], ep["tag"], data["series"]] + [l["text"] for l in lines]
    (d / "subs" / "tr.srt").write_text(srt(lines, [l["text"] for l in lines], "tr"), encoding="utf-8")
    res, failed = {}, []
    for lang in LANGS:
        out = pollinations(segs, lang)
        if out is None:
            print(f"[{lang}] falling back to MyMemory", file=sys.stderr); out = [mymemory(s, lang) for s in segs]
            if any(o is None for o in out): failed.append(lang); continue
        res[lang] = dict(title=out[0], tag=out[1], series=out[2], lines=out[3:])
        (d / "subs" / f"{lang}.srt").write_text(srt(lines, out[3:], lang), encoding="utf-8")
        print(eid, lang, "ok:", out[0]); time.sleep(1.5)
    res["tr"] = dict(title=ep["title"], tag=ep["tag"], series=data["series"], lines=[l["text"] for l in lines])
    (d / "i18n.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    if failed: raise SystemExit(f"translation missing for: {failed}")

main()
