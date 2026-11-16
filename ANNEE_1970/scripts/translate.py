#!/usr/bin/env python3
"""14-language subtitles for one episode.
Primary: Pollinations LLM (https://text.pollinations.ai/openai), one request per language (all lines at once, JSON array).
Fallback: MyMemory (api.mymemory.translated.net), line by line, in parallel threads.
Writes series/build/<ep>/subs/<ep>.<lang>.srt (+ fr original) and series/build/<ep>/translations.json. Languages that fail both
services are skipped and listed in metadata (never faked).
"""
import json, os, re, sys, time, urllib.parse, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = {"en": "English", "es": "Spanish", "de": "German", "it": "Italian", "pt": "Portuguese", "nl": "Dutch", "tr": "Turkish",
         "ar": "Arabic", "ru": "Russian", "ja": "Japanese", "ko": "Korean", "zh": "Simplified Chinese", "hi": "Hindi", "pl": "Polish"}
MM = {"zh": "zh-CN"}

def http_json(url, data=None, tries=4, timeout=90):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None,
                                         headers={"Content-Type": "application/json", "User-Agent": "Annee1970Pipeline/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as r: return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504): return None
        except Exception: pass
        time.sleep(4 + k * 6)
    return None

def pollinations(texts, lang_name):
    prompt = (f"Translate these {len(texts)} French subtitle lines about the year 1970 into {lang_name}. Keep proper names, numbers and dates exact. "
              f"Return ONLY a JSON array of exactly {len(texts)} strings, same order, no commentary.\n" + json.dumps(texts, ensure_ascii=False))
    r = http_json("https://text.pollinations.ai/openai", {"model": "openai", "messages": [{"role": "user", "content": prompt}], "temperature": 0.2})
    if not r: return None
    try:
        c = r["choices"][0]["message"]["content"]
        m = re.search(r"\[.*\]", c, re.S)
        arr = json.loads(m.group(0))
        if len(arr) == len(texts) and all(isinstance(x, str) and x.strip() for x in arr): return arr
    except Exception as e: print("  pollinations parse fail:", e, file=sys.stderr)
    return None

def mymemory_one(t, code):
    u = "https://api.mymemory.translated.net/get?" + urllib.parse.urlencode({"q": t, "langpair": f"fr|{MM.get(code, code)}"})
    r = http_json(u, tries=3, timeout=30)
    try:
        s = r["responseData"]["translatedText"]
        if r.get("responseStatus") in (200, "200") and s and "MYMEMORY WARNING" not in s.upper(): return s
    except Exception: pass
    return None

def mymemory(texts, code):
    with ThreadPoolExecutor(4) as ex: out = list(ex.map(lambda t: mymemory_one(t, code), texts))
    return out if all(out) else None

def ts(t):
    h, rem = divmod(int(t * 1000), 3600000); m, rem = divmod(rem, 60000); s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def split_cue(text, maxc=84):
    if len(text) <= maxc: return [text]
    sents = re.split(r"(?<=[.!?。！？])\s+", text)
    chunks, cur = [], ""
    for s in sents:
        if cur and len(cur) + len(s) + 1 > maxc: chunks.append(cur); cur = s
        else: cur = (cur + " " + s).strip()
    if cur: chunks.append(cur)
    out = []
    for c in chunks:
        while len(c) > maxc * 1.4:
            cut = c.rfind(" ", 0, maxc) if " " in c[:maxc] else maxc
            cut = cut if cut > 20 else maxc
            out.append(c[:cut].strip()); c = c[cut:].strip()
        out.append(c)
    return out

def write_srt(path, lines, texts):
    cues, n = [], 1
    for ln, tx in zip(lines, texts):
        parts = split_cue(tx); tot = sum(len(p) for p in parts) or 1; t = ln["t0"]; dur = ln["t1"] - ln["t0"] + 0.25
        for p in parts:
            d = dur * len(p) / tot
            cues.append(f"{n}\n{ts(t)} --> {ts(t + d - 0.05)}\n{p}\n"); n += 1; t += d
    open(path, "w", encoding="utf-8").write("\n".join(cues))

def main():
    name = sys.argv[1]
    B = os.path.join(ROOT, "series", "build")
    tl = json.load(open(os.path.join(B, f"{name}.timeline.json")))
    outd = os.path.join(B, name, "subs"); os.makedirs(outd, exist_ok=True)
    fr = [l["text"] for l in tl["lines"]]
    write_srt(os.path.join(outd, f"{name}.fr.srt"), tl["lines"], fr)
    items = fr + [tl["title"]]
    tr, engines, failed = {"fr": items}, {}, []
    for code, lname in LANGS.items():
        arr = pollinations(items, lname); eng = "pollinations"
        if arr is None: arr = mymemory(items, code); eng = "mymemory"
        if arr is None: failed.append(code); print(f"  {code}: FAILED on both services"); continue
        tr[code] = arr; engines[code] = eng
        write_srt(os.path.join(outd, f"{name}.{code}.srt"), tl["lines"], arr[:-1])
        print(f"  {code}: ok ({eng})")
        time.sleep(3)
    json.dump(tr, open(os.path.join(B, name, "translations.json"), "w"), ensure_ascii=False, indent=1)
    json.dump(dict(engines=engines, failed=failed), open(os.path.join(B, name, "translation_status.json"), "w"))
    print(f"{name}: {len(engines)}/14 languages translated, failed: {failed or 'none'}")
main()
