#!/usr/bin/env python3
"""Narration builder: edge-tts (fr-FR-RemyMultilingualNeural) -> narration.wav + timeline.json + SRT.

Usage:
  python3 scripts/tts.py episodes/ep01.json --mode main  --out build/ep01/main
  python3 scripts/tts.py episodes/ep01.json --mode short --out build/ep01/short
  add --mock to produce silent audio with estimated timings (offline testing).
"""
import argparse
import asyncio
import json
import os
import random
import re
import subprocess
import sys
import wave

VOICE = os.environ.get("TTS_VOICE", "fr-FR-RemyMultilingualNeural")
SR = 48000
GAP_MAIN = 0.45
GAP_SHORT = 0.12
SHORT_MAX = 56.0  # seconds of narration; the short is padded to ~50-58 s total


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def wav_duration(path):
    with wave.open(path, "rb") as w:
        return w.getnframes() / float(w.getframerate())


def silence(path, seconds):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"\x00\x00" * int(round(seconds * SR)))


async def synth_edge(text, mp3_path, rate):
    import edge_tts  # imported lazily so --mock works without the package

    words = []
    last_err = None
    for attempt in range(6):
        try:
            words = []
            comm = edge_tts.Communicate(text, VOICE, rate=rate, boundary="WordBoundary")
            with open(mp3_path, "wb") as f:
                async for chunk in comm.stream():
                    if chunk["type"] == "audio":
                        f.write(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        words.append({
                            "t": chunk["offset"] / 1e7,
                            "d": chunk["duration"] / 1e7,
                            "w": chunk["text"],
                        })
            if os.path.getsize(mp3_path) > 0:
                return words
            raise RuntimeError("empty audio")
        except Exception as e:  # network hiccups / throttling on shared runners
            last_err = e
            wait = 2 ** attempt + random.random()
            print(f"  edge-tts retry {attempt + 1}/6 in {wait:.1f}s: {e}", file=sys.stderr)
            await asyncio.sleep(wait)
    raise RuntimeError(f"edge-tts failed: {last_err}")


def synth_mock(text, wav_path, rate):
    speed = 1 + int(rate.strip("%+") or 0) / 100.0
    tokens = text.split()
    words, t = [], 0.25
    for tok in tokens:
        d = max(0.18, 0.06 * len(tok)) / speed
        words.append({"t": t, "d": d, "w": re.sub(r"[.,;:!?…«»\"]", "", tok)})
        t += d + (0.25 if re.search(r"[.!?…]$", tok) else 0.05) / speed
    silence(wav_path, t + 0.2)
    return words


def _norm(s):
    s = s.lower().replace("’", "'")
    n = re.sub(r"[^\w]", "", s)
    return n or re.sub(r"\s", "", s)  # symbols such as "€" or "%" keep their form


def _is_punct(tok):
    return re.fullmatch(r"[^\w€$%]+", tok) is not None


def realign(words, text):
    """edge-tts word boundaries carry no punctuation: map them back onto the
    original script tokens so subtitles keep punctuation and sentence breaks."""
    tokens = text.split()
    out, cur = [], 0
    for w in words:
        nw = _norm(w["w"])
        hit = None
        for j in range(cur, min(cur + 5, len(tokens))):
            nt = _norm(tokens[j])
            if nw and nt and (nt.startswith(nw) or nw.startswith(nt) or nw in nt):
                hit = j
                break
        if hit is None:
            if out and nw and nw in _norm(out[-1]["w"]):
                continue  # boundary split of a token already emitted
            out.append(dict(w))
            continue
        span = tokens[cur:hit + 1]
        while span and out and _is_punct(span[0]):  # "seconde ?" -> keep "?" on the previous word
            out[-1]["w"] += " " + span.pop(0)
        out.append(dict(w, w=" ".join(span)))
        cur = hit + 1
    if out and cur < len(tokens):
        out[-1]["w"] += " " + " ".join(tokens[cur:])
    return out


def synth_scene(text, base, rate, mock):
    wav_path = base + ".wav"
    if mock:
        words = synth_mock(text, wav_path, rate)
    else:
        mp3 = base + ".mp3"
        words = asyncio.run(synth_edge(text, mp3, rate))
        run(["ffmpeg", "-y", "-v", "error", "-i", mp3, "-ac", "1", "-ar", str(SR), wav_path])
    return wav_path, realign(words, text)


def fmt_ts(t):
    t = max(0.0, t)
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def build_cues(words, max_chars=42, max_words=7, max_dur=3.2):
    """Group word boundaries into readable subtitle cues (<= 2 lines style)."""
    cues, cur = [], []

    def flush():
        if cur:
            cues.append({
                "start": cur[0]["t"],
                "end": cur[-1]["t"] + cur[-1]["d"],
                "text": " ".join(w["w"] for w in cur),
            })
            cur.clear()

    for w in words:
        if cur:
            text = " ".join(x["w"] for x in cur + [w])
            if (len(text) > max_chars or len(cur) >= max_words
                    or w["t"] + w["d"] - cur[0]["t"] > max_dur
                    or w["t"] - (cur[-1]["t"] + cur[-1]["d"]) > 0.6):
                flush()
        cur.append(w)
        if re.search(r"[.!?…]$", w["w"]):
            flush()
    flush()
    for a, b in zip(cues, cues[1:]):  # small hold, never overlapping
        a["end"] = min(max(a["end"], a["start"] + 0.8), b["start"] - 0.02)
    return cues


def write_srt(cues, path):
    with open(path, "w", encoding="utf-8") as f:
        for i, c in enumerate(cues, 1):
            f.write(f"{i}\n{fmt_ts(c['start'])} --> {fmt_ts(c['end'])}\n{c['text']}\n\n")


def build(ep, mode, out, mock, rate="+0%"):
    os.makedirs(out, exist_ok=True)
    if mode == "main":
        parts = [dict(s, index=i) for i, s in enumerate(ep["scenes"])]
        gap = GAP_MAIN
    else:
        parts = [{"index": 0, "type": "short", "title": ep["short"].get("hook_text", ""),
                  "narration": ep["short"]["narration"]}]
        gap = GAP_SHORT

    lead = 0.6 if mode == "main" else 0.2
    files, timeline, all_words, t = [], [], [], lead
    lead_wav = os.path.join(out, "lead.wav")
    silence(lead_wav, lead)
    files.append(lead_wav)
    gap_wav = os.path.join(out, "gap.wav")
    silence(gap_wav, gap)

    for p in parts:
        base = os.path.join(out, f"scene_{p['index']:02d}")
        print(f"  TTS [{mode}] scene {p['index']:02d} ({len(p['narration'].split())} mots)")
        wav_path, words = synth_scene(p["narration"], base, rate, mock)
        dur = wav_duration(wav_path)
        timeline.append({"index": p["index"], "type": p["type"], "title": p.get("title", ""),
                         "start": round(t, 3), "end": round(t + dur, 3)})
        all_words += [dict(w, t=round(w["t"] + t, 3)) for w in words]
        files += [wav_path, gap_wav]
        t += dur + gap

    tail = 2.5 if mode == "main" else 0.0
    tail_wav = os.path.join(out, "tail.wav")
    silence(tail_wav, tail)
    files.append(tail_wav)
    total = t + tail

    lst = os.path.join(out, "concat.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{os.path.abspath(x)}'\n" for x in files)
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst,
         "-c:a", "pcm_s16le", "-ar", str(SR), "-ac", "1", os.path.join(out, "narration.wav")])

    cues = build_cues(all_words)
    write_srt(cues, os.path.join(out, "subtitles.srt"))
    with open(os.path.join(out, "timeline.json"), "w", encoding="utf-8") as f:
        json.dump({"mode": mode, "duration": round(total, 3), "rate": rate, "voice": VOICE,
                   "scenes": timeline, "cues": cues,
                   "words": [{"t": round(w["t"], 3), "d": round(w["d"], 3), "w": w["w"]} for w in all_words]},
                  f, ensure_ascii=False)
    return total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--mode", choices=["main", "short"], default="main")
    ap.add_argument("--out", required=True)
    ap.add_argument("--mock", action="store_true")
    a = ap.parse_args()
    with open(a.episode, encoding="utf-8") as f:
        ep = json.load(f)

    total = build(ep, a.mode, a.out, a.mock)
    if a.mode == "short":
        rate = 0
        while total > SHORT_MAX and rate < 30:  # keep the short under 60 s
            rate += max(4, int((total / SHORT_MAX - 1) * 100) + 2)
            print(f"  short = {total:.1f}s > {SHORT_MAX}s -> rate +{rate}%")
            total = build(ep, a.mode, a.out, a.mock, rate=f"+{rate}%")
    print(f"OK {a.mode}: {total:.1f}s -> {a.out}")


if __name__ == "__main__":
    main()
