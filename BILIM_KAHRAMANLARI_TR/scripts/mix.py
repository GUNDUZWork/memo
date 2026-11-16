#!/usr/bin/env python3
"""Ses karması: konuşma + (Commons CC0) müzik + FFmpeg anoisesrc ambiyansı.  python3 scripts/mix.py ep01
Ambiyans (rüzgâr / ateş / doğa) tamamen FFmpeg'in anoisesrc sentezleyicisiyle üretilir: konuşma ve melodi içermez.
Müzik konuşma altında sidechain ile kısılır. -14 LUFS normalizasyonu mux.py'de yapılır."""
import json, pathlib, subprocess, sys
import numpy as np
import wave

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 48000

def synth_pad(path, dur):
    """CC0 parça yoksa: temiz, sözsüz akor zemini (Am9 - Fmaj7 - Cmaj7 - G6), yavaş atak."""
    chords = [[220, 261.63, 329.63, 392, 493.88], [174.61, 220, 261.63, 329.63, 392], [196, 261.63, 329.63, 392, 493.88], [196, 246.94, 293.66, 329.63, 392]]
    n = int((dur + 2) * SR); t = np.arange(n) / SR; out = np.zeros(n, dtype=np.float64); seg = 4.0
    for i in range(int((dur + 2) / seg) + 1):
        a, b = int(i * seg * SR), min(n, int((i + 1) * seg * SR) + int(0.8 * SR))
        if a >= n: break
        tt = t[a:b] - i * seg; env = np.minimum(1, tt / 1.2) * np.minimum(1, (seg + 0.8 - tt) / 1.4)
        for f in chords[i % 4]:
            out[a:b] += env * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt + 0.7)) / 5
    out *= 0.6 * (0.9 + 0.1 * np.sin(2 * np.pi * 0.11 * t))
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())

def amb_graph(kind, D):
    d = f"d={D:.3f}:r={SR}"
    if kind == "fire":
        return (f"anoisesrc={d}:c=brown:a=0.9,lowpass=f=240[a1];anoisesrc={d}:c=white:a=0.7,highpass=f=1800,lowpass=f=7500,tremolo=f=13:d=0.95[a2];"
                f"anoisesrc={d}:c=pink:a=0.7,highpass=f=1200,lowpass=f=5000,tremolo=f=7.3:d=0.9[a3];[a1][a2][a3]amix=inputs=3:normalize=0,volume=0.8")
    if kind == "nature":
        return (f"anoisesrc={d}:c=pink:a=0.6,bandpass=f=3500:w=2500,tremolo=f=0.23:d=0.7[a1];anoisesrc={d}:c=brown:a=0.9,lowpass=f=320,tremolo=f=0.09:d=0.4[a2];"
                f"[a1][a2]amix=inputs=2:normalize=0,volume=0.9")
    return (f"anoisesrc={d}:c=brown:a=0.9,lowpass=f=520,highpass=f=40,tremolo=f=0.17:d=0.55[a1];anoisesrc={d}:c=pink:a=0.35,bandpass=f=900:w=500,tremolo=f=0.11:d=0.9[a2];"
            f"[a1][a2]amix=inputs=2:normalize=0,volume=1.0")

def main():
    eid = sys.argv[1]; d = ROOT / "out" / eid
    tl = json.loads((d / "timeline.json").read_text(encoding="utf-8")); D = tl["dur"]
    ep = json.loads((ROOT / "series/episodes.json").read_text(encoding="utf-8"))["episodes"][int(eid[2:]) - 1]
    mj = json.loads((d / "music.json").read_text(encoding="utf-8")) if (d / "music.json").exists() else dict(synth=True)
    music = None
    if not (mj.get("synth") or not mj.get("file")):
        # gerçek CC0 parçayı önce temiz 48 kHz stereo WAV'a çevir (kapak resmi/video akışı/garip kodek sorunlarına karşı); olmazsa sentez fon
        wav = d / "music_clean.wav"
        r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(d / mj["file"]), "-vn", "-map", "0:a:0", "-ac", "2", "-ar", str(SR), "-t", "600", str(wav)], capture_output=True, text=True)
        if r.returncode == 0 and wav.exists() and wav.stat().st_size > 100000: music = wav
        else:
            print("MUSIC DECODE FAILED -> synth fallback:", r.stderr[-300:], file=sys.stderr)
            mj = dict(synth=True, credit="Müzik: sentezlenmiş fon (CC0 parça çözülemedi)"); (d / "music.json").write_text(json.dumps(mj, ensure_ascii=False), encoding="utf-8")
    if music is None:
        music = d / "music_synth.wav"; synth_pad(music, D)
    g = (f"[0:a]aformat=sample_rates={SR}:channel_layouts=stereo,asplit=2[v1][v2];"
         f"[1:a]aresample={SR},aformat=channel_layouts=stereo,aloop=loop=-1:size=2000000000,atrim=0:{D:.3f},asetpts=PTS-STARTPTS,loudnorm=I=-25:TP=-3:LRA=7,afade=t=in:d=2.5,afade=t=out:st={D-3.5:.3f}:d=3.5[m];"
         f"[m][v2]sidechaincompress=threshold=0.015:ratio=10:attack=15:release=500:makeup=1[md];"
         f"{amb_graph(ep.get('amb', 'wind'), D)},aformat=channel_layouts=stereo,volume=0.045,afade=t=in:d=1.5,afade=t=out:st={D-2:.3f}:d=2[am];"
         f"[v1][md][am]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.92[out]")
    def run(m):
        return subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(d / "voice.wav"), "-i", str(m), "-filter_complex", g, "-map", "[out]", "-ar", str(SR), "-ac", "2", "-t", f"{D:.3f}", str(d / "mix.wav")], capture_output=True, text=True)
    r = run(music)
    if r.returncode != 0:
        print("MIX FAILED:", r.stderr[-800:], file=sys.stderr)
        music = d / "music_synth.wav"; synth_pad(music, D); mj = dict(synth=True, credit="Müzik: sentezlenmiş fon (CC0 parça karıştırılamadı)")
        (d / "music.json").write_text(json.dumps(mj, ensure_ascii=False), encoding="utf-8")
        r = run(music)
        if r.returncode != 0: raise SystemExit("mix failed even with synth: " + r.stderr[-800:])
    print(eid, "mix ->", d / "mix.wav", "| ambience:", ep.get("amb"), "| music:", mj.get("title", "synth"))

main()
