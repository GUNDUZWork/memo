#!/usr/bin/env python3
"""Bruitages de transition : un whoosh à chaque changement de beat, un impact grave à chaque
changement de scène. Génération procédurale (aucun droit d'auteur), WAV mono 48 kHz.

Usage: python3 scripts/sfx.py beats.json duration_seconds out.wav
"""
import json
import math
import random
import sys
import wave
from array import array

SR = 48000


def whoosh(strong):
    n = int(SR * (0.5 if strong else 0.38))
    rnd = random.Random(7 if strong else 3)
    out, y, y2 = [], 0.0, 0.0
    for i in range(n):
        k = i / n
        fc = 250 + 7000 * (k ** 2.2)                      # balayage grave -> aigu
        a = 1 - math.exp(-2 * math.pi * fc / SR)
        x = rnd.uniform(-1, 1)
        y += a * (x - y)
        y2 += 0.002 * (y - y2)
        env = math.sin(math.pi * min(1.0, k * 1.15)) ** 2 * (0.5 + 0.5 * k)
        out.append((y - y2) * env * (0.55 if strong else 0.38))
    return out


def boom():
    n = int(SR * 0.55)
    return [math.sin(2 * math.pi * (70 - 35 * (i / n)) * i / SR) * math.exp(-6.5 * i / n) * 0.55 for i in range(n)]


def main():
    beats_path, duration, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
    beats = json.load(open(beats_path, encoding="utf-8"))
    total = int(SR * duration)
    buf = array("f", [0.0]) * total
    cache = {False: whoosh(False), True: whoosh(True)}
    hit = boom()

    def add(samples, start):
        s0 = int(start * SR)
        for j, v in enumerate(samples):
            p = s0 + j
            if 0 <= p < total:
                buf[p] += v

    for b in beats:
        if b["start"] < 0.05:
            continue
        strong = bool(b.get("sceneStart"))
        add(cache[strong], max(0.0, b["start"] - (0.34 if strong else 0.26)))   # le whoosh arrive sur la coupe
        if strong:
            add(hit, b["start"] - 0.02)
    pcm = array("h", (max(-32767, min(32767, int(v * 32767))) for v in buf))
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"OK sfx: {sum(1 for b in beats if b['start'] >= 0.05)} transitions -> {out}")


if __name__ == "__main__":
    main()
