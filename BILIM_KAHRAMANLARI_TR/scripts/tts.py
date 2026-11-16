#!/usr/bin/env python3
"""Seslendirme (edge-tts) + zaman çizelgesi.  python3 scripts/tts.py ep01 [--fake]
Çıktı: out/epNN/voice.wav, out/epNN/timeline.json (satır zamanları, 24 fps ses zarfı, kredi satırları).
--fake: YALNIZCA yerel test için (ağ yokken) konuşma benzeri sentetik ses üretir; Actions bunu kullanmaz."""
import asyncio, json, pathlib, subprocess, sys, wave
import numpy as np

SR, FPS = 48000, 24
VOICES = {"A": ("tr-TR-AhmetNeural", "-6%", "-2Hz"), "B": ("tr-TR-EmelNeural", "+2%", "+0Hz")}
FIRST, GAP, GAP_FX, OUTRO = 3.3, 0.45, 0.95, 4.4
ROOT = pathlib.Path(__file__).resolve().parent.parent

def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ar", str(SR), "-ac", "1", "-f", "s16le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768

def trim(x, thr=0.008):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0: return x
    return x[max(0, idx[0] - int(0.03 * SR)): idx[-1] + int(0.08 * SR)]

async def edge(text, who, out):
    import edge_tts
    v, rate, pitch = VOICES[who]
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, v, rate=rate, pitch=pitch).save(str(out)); return
        except Exception as e:
            print("edge-tts retry", attempt, e, file=sys.stderr); await asyncio.sleep(2 + attempt * 3)
    raise SystemExit(f"edge-tts failed for: {text}")

def fake(text, who):
    n = int(len(text) * 0.062 * SR); t = np.arange(n) / SR
    rng = np.random.default_rng(len(text) * 7 + (who == "A"))
    f0 = 110 if who == "A" else 205
    syl = np.abs(np.sin(2 * np.pi * (3.6 + rng.random() * 1.2) * t + rng.random())) ** 0.6
    sig = sum(np.sin(2 * np.pi * f0 * k * t * (1 + 0.02 * np.sin(2 * np.pi * 0.7 * t))) / k for k in range(1, 8))
    return (0.25 * sig * syl * np.minimum(1, np.minimum(t, t[::-1]) * 40)).astype(np.float32)

def main():
    eid = sys.argv[1]; is_fake = "--fake" in sys.argv
    data = json.loads((ROOT / "series/episodes.json").read_text(encoding="utf-8"))
    ep = data["episodes"][int(eid[2:]) - 1]
    out = ROOT / "out" / eid; out.mkdir(parents=True, exist_ok=True)
    clips = []
    for i, l in enumerate(ep["lines"]):
        if is_fake: x = fake(l["text"], l["who"])
        else:
            mp3 = out / f"line{i:02d}.mp3"; asyncio.run(edge(l["text"], l["who"], mp3)); x = trim(decode(mp3))
        clips.append(x)
    t = FIRST; lines = []
    for l, x in zip(ep["lines"], clips):
        d = len(x) / SR; lines.append(dict(who=l["who"], text=l["text"], fx=l.get("fx", ""), t0=round(t, 3), t1=round(t + d, 3)))
        t += d + (GAP_FX if l.get("fx") else GAP)
    dur = round(lines[-1]["t1"] + OUTRO, 3)
    voice = np.zeros(int(dur * SR) + SR, dtype=np.float32)
    for l, x in zip(lines, clips):
        a = int(l["t0"] * SR); voice[a:a + len(x)] += x
    peak = np.abs(voice).max() or 1; voice = voice / peak * 0.89
    voice = voice[:int(dur * SR)]
    with wave.open(str(out / "voice.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((voice * 32767).astype(np.int16).tobytes())
    # 24 fps speech envelope: drives mouth + talk-bounce in the page
    hop = SR // FPS; n = len(voice) // hop
    rms = np.sqrt((voice[:n * hop].reshape(n, hop) ** 2).mean(axis=1))
    ref = np.percentile(rms[rms > 0.01], 90) if (rms > 0.01).any() else 1
    env = np.clip(rms / ref, 0, 1); env = np.maximum(env, np.roll(env, 1) * 0.6)
    env[rms < 0.012] = 0
    credit = ["Seslendirme: Microsoft Edge TTS (tr-TR) · Çizim ve animasyon: kodla üretildi (Lemo-Opuscar by Lemomo / LemoLab)"]
    mj = out / "music.json"
    if mj.exists():
        m = json.loads(mj.read_text(encoding="utf-8")); credit.insert(0, m.get("credit", ""))
    (out / "timeline.json").write_text(json.dumps(dict(fps=FPS, dur=dur, lines=lines, env=[round(float(e), 3) for e in env], credit=[c for c in credit if c]), ensure_ascii=False), encoding="utf-8")
    print(eid, "dur", dur, "lines", len(lines))

main()
