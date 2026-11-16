#!/usr/bin/env python3
"""Traduit titre / description / sous-titres d'un épisode en 14 langues (MyMemory, secours : Pollinations Text).
Ne bloque jamais le rendu : toute erreur est consignée et l'on passe à la suite.
usage : translate.py <dist/epXX> [--budget-min 12]   (écrit <dist/epXX>/translations/<lang>/...)"""
import json, os, re, sys, time, urllib.parse, urllib.request

LANGS = ["en", "es", "de", "pt", "it", "nl", "pl", "ru", "tr", "ar", "hi", "id", "ja", "ko"]
UA = {"User-Agent": "histoires-fr-pipeline/1.0"}


def http_json(url, data=None, timeout=25):
    req = urllib.request.Request(url, data=data, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def mymemory(text, lang):
    q = urllib.parse.urlencode({"q": text, "langpair": f"fr|{lang}"})
    d = json.loads(http_json("https://api.mymemory.translated.net/get?" + q))
    out = (d.get("responseData") or {}).get("translatedText") or ""
    if d.get("responseStatus") not in (200, "200") or not out or "MYMEMORY WARNING" in out.upper():
        raise RuntimeError(f"mymemory: {d.get('responseDetails') or d.get('responseStatus')}")
    return out


def pollinations(text, lang):
    prompt = f"Translate from French to the language with ISO code '{lang}'. Output only the translation, nothing else:\n\n{text}"
    out = http_json("https://text.pollinations.ai/" + urllib.parse.quote(prompt)).strip()
    if not out or len(out) > len(text) * 4 + 80:
        raise RuntimeError("pollinations: réponse vide/anormale")
    return out


def tr(text, lang, state):
    if not text.strip():
        return text
    for name, fn in (("mymemory", mymemory), ("pollinations", pollinations)):
        if state["dead"].get(name, 0) >= 4:
            continue
        for attempt in range(2):
            try:
                out = fn(text[:480] if name == "mymemory" else text, lang)
                state["dead"][name] = 0
                state["used"][name] = state["used"].get(name, 0) + 1
                return out
            except Exception as e:  # noqa
                state["dead"][name] = state["dead"].get(name, 0) + 1
                state["errors"].append(f"{name}/{lang}: {str(e)[:90]}")
                time.sleep(1.5)
    return None


def chunks(text, n=450):
    out, cur = [], ""
    for para in re.split(r"(?<=[.!?\n])\s+", text):
        if len(cur) + len(para) + 1 > n and cur:
            out.append(cur); cur = para
        else:
            cur = (cur + " " + para).strip()
    if cur:
        out.append(cur)
    return out


def tr_long(text, lang, state):
    parts = [tr(c, lang, state) for c in chunks(text)]
    return None if any(p is None for p in parts) else " ".join(parts)


def read_fields(md):
    def grab(label):
        m = re.search(r"\*\*" + label + r"\*\*\s*\n\s*\n(.*?)(?=\n\s*\n\*\*|\n## |\Z)", md, re.S)
        return m.group(1).strip() if m else ""
    return grab("Titre"), grab("Description")


def parse_srt(path):
    if not os.path.exists(path):
        return []
    blocks = re.split(r"\n\s*\n", open(path, encoding="utf-8").read().strip())
    cues = []
    for b in blocks:
        ln = b.split("\n")
        if len(ln) >= 3:
            cues.append((ln[0], ln[1], " ".join(ln[2:])))
    return cues


def main():
    d = sys.argv[1]
    budget = float(sys.argv[sys.argv.index("--budget-min") + 1]) * 60 if "--budget-min" in sys.argv else 720
    t0 = time.time()
    ep = os.path.basename(d.rstrip("/"))
    md_path = next((os.path.join(d, f) for f in os.listdir(d) if f.endswith("_youtube_metadata.md")), None)
    title, desc = read_fields(open(md_path, encoding="utf-8").read()) if md_path else ("", "")
    cues = parse_srt(os.path.join(d, f"{ep}_fr.srt"))
    state = {"dead": {}, "used": {}, "errors": []}
    report = {"langs": {}, "limit": "100 caractères max pour les titres"}
    for lang in LANGS:
        if time.time() - t0 > budget:
            report["langs"][lang] = "ignorée (budget temps)"; continue
        out = os.path.join(d, "translations", lang); os.makedirs(out, exist_ok=True)
        status = {}
        t = tr(title, lang, state) if title else None
        if t:
            t = t[:100].rstrip(); open(os.path.join(out, "title.txt"), "w", encoding="utf-8").write(t + "\n"); status["title"] = "ok"
        else:
            status["title"] = "échec"
        ds = tr_long(desc, lang, state) if desc else None
        if ds:
            open(os.path.join(out, "description.txt"), "w", encoding="utf-8").write(ds + "\n"); status["description"] = "ok"
        else:
            status["description"] = "échec"
        # sous-titres : tentative par paquets de cues, abandon propre si le quota est épuisé
        if cues and status["title"] == "ok" and time.time() - t0 < budget:
            done, lines = 0, []
            for i in range(0, len(cues), 8):
                if time.time() - t0 > budget:
                    break
                grp = cues[i:i + 8]
                joined = " ¶ ".join(c[2] for c in grp)
                res = tr(joined, lang, state)
                parts = [p.strip() for p in res.split("¶")] if res else None
                if not parts or len(parts) != len(grp):
                    break
                for c, p in zip(grp, parts):
                    lines.append(f"{c[0]}\n{c[1]}\n{p}\n")
                done += len(grp)
            if done == len(cues):
                open(os.path.join(out, f"{ep}_{lang}.srt"), "w", encoding="utf-8").write("\n".join(lines)); status["srt"] = "ok"
            else:
                status["srt"] = f"partiel/échec ({done}/{len(cues)})"
        report["langs"][lang] = status
    report["sources"] = state["used"]; report["erreurs_exemples"] = state["errors"][:8]
    os.makedirs(os.path.join(d, "translations"), exist_ok=True)
    json.dump(report, open(os.path.join(d, "translations", "_rapport.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    ok = sum(1 for v in report["langs"].values() if isinstance(v, dict) and v.get("title") == "ok")
    print(f"traductions {ep} : {ok}/{len(LANGS)} langues (titre) ; sources {state['used']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # ne bloque jamais le rendu
        print(f"::warning::traduction ignorée : {e}")
