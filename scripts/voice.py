#!/usr/bin/env python3
"""Voice + timeline for one episode.
  python3 scripts/voice.py ep01            # Edge TTS (fr-FR-HenriNeural / DeniseNeural), writes series/build/ep01/*.mp3
  python3 scripts/voice.py ep01 --dry      # placeholder audio (local pipeline test only, never used in releases)
Outputs series/build/ep01.timeline.json: per-line t0/t1, mood, amplitude envelope (30 Hz) for lip-sync / puppet hop.
"""
import asyncio, json, math, os, subprocess, sys, struct
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "series"))
from episodes import EPISODES

VOICES = {"A": "fr-FR-HenriNeural", "R": "fr-FR-DeniseNeural"}
MOODS = {  # rate, pitch
    "shock": ("+6%", "+3Hz"), "anger": ("+8%", "-2Hz"), "sad": ("-10%", "-3Hz"), "joy": ("+4%", "+4Hz"), None: ("+0%", "+0Hz"),
}
INTRO, GAP, OUTRO = 3.6, 0.45, 4.6
ENV_HZ = 30

async def synth(text, voice, rate, pitch, out):
    import edge_tts
    proxy = os.environ.get("HTTPS_PROXY") or None
    for attempt in range(5):
        try:
            await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, proxy=proxy).save(out)
            if os.path.getsize(out) > 2000: return
        except Exception as e:
            print("tts retry", attempt, e, file=sys.stderr)
        await asyncio.sleep(2 + attempt * 3)
    raise SystemExit(f"TTS failed for: {text[:50]}")

def dry(text, out):
    d = max(1.5, len(text) / 15.0)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anoisesrc=d={d}:c=pink:a=0.2,tremolo=f=4:d=0.9", "-c:a", "libmp3lame", out], check=True)

def duration(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode().strip())

def envelope(path):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"])
    n = len(raw) // 2
    s = struct.unpack("<%dh" % n, raw)
    win = 8000 // ENV_HZ
    rms = []
    for i in range(0, n, win):
        seg = s[i:i + win]
        if not seg: break
        rms.append(math.sqrt(sum(x * x for x in seg) / len(seg)))
    peak = max(rms) or 1
    return [round(min(1.0, (r / peak) ** 0.8), 3) for r in rms]

def main():
    name = sys.argv[1]; is_dry = "--dry" in sys.argv
    n = int(name[2:])
    ep = EPISODES[n - 1]
    outdir = os.path.join(ROOT, "series", "build", name); os.makedirs(outdir, exist_ok=True)
    lines, t = [], INTRO
    for i, ln in enumerate(ep["lines"]):
        f = os.path.join(outdir, f"L{i:02d}.mp3")
        if not (os.path.exists(f) and os.path.getsize(f) > 2000):
            if is_dry: dry(ln["text"], f)
            else:
                rate, pitch = MOODS.get(ln.get("mood"), MOODS[None])
                asyncio.run(synth(ln["text"], VOICES[ln["who"]], rate, pitch, f))
        d = duration(f)
        o = dict(ln); o.update(file=os.path.relpath(f, ROOT), t0=round(t, 3), t1=round(t + d, 3), env=envelope(f), envHz=ENV_HZ)
        o["stampAt"] = round(t + min(1.3, d * 0.6), 3) if ln.get("stamp") else None
        lines.append(o); t += d + GAP
    last = lines[-1]["t1"]
    total = round(last + 0.45 + OUTRO, 3)
    nxt = EPISODES[n]["title"] if n < 30 else None
    tl = dict(id=name, n=n, title=ep["title"], dateLabel=ep["date"], style=ep["style"], motif=ep["motif"], amb=ep["amb"], next=nxt, total=total, lines=lines, dry=is_dry)
    json.dump(tl, open(os.path.join(ROOT, "series", "build", f"{name}.timeline.json"), "w"), ensure_ascii=False)
    print(f"{name}: {len(lines)} lines, {total:.1f}s{' (DRY audio)' if is_dry else ''}")

main()
