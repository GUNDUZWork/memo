#!/usr/bin/env python3
"""Mix one episode: voices + (optional) CC0 music ducked under the voice + ambience synthesised with FFmpeg anoisesrc
(wind / fire / nature / city / sea: pure noise synthesis, no recordings, no speech) + stamp / whoosh effects.
  python3 scripts/mix.py ep01  ->  series/build/ep01/mix.wav   (loudness -14 LUFS is applied later by core/render/mux.sh)
"""
import json, os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name = sys.argv[1]
B = os.path.join(ROOT, "series", "build")
tl = json.load(open(os.path.join(B, f"{name}.timeline.json")))
T = tl["total"]
ST = "aformat=sample_rates=48000:channel_layouts=stereo"

AMB = {
    "wind":   f"anoisesrc=c=brown:r=48000:a=0.7:d={T},lowpass=f=650,highpass=f=50,tremolo=f=0.2:d=0.6",
    "sea":    f"anoisesrc=c=brown:r=48000:a=0.9:d={T},lowpass=f=520,tremolo=f=0.12:d=0.8",
    "city":   f"anoisesrc=c=pink:r=48000:a=0.5:d={T},lowpass=f=1500,highpass=f=100,tremolo=f=0.15:d=0.3",
    "nature": f"anoisesrc=c=pink:r=48000:a=0.4:d={T},bandpass=f=4500:w=2500,tremolo=f=0.35:d=0.7",
    "fire":   f"anoisesrc=c=white:r=48000:a=0.35:d={T},highpass=f=1800,lowpass=f=8000,tremolo=f=11:d=0.95",
}

inputs, parts, mixin = [], [], []
def add_input(path):
    inputs.extend(["-i", path]); return len(inputs) // 2 - 1

# voices
vl = []
for i, ln in enumerate(tl["lines"]):
    k = add_input(os.path.join(ROOT, ln["file"]))
    ms = int(ln["t0"] * 1000)
    parts.append(f"[{k}:a]{ST},adelay={ms}|{ms},volume=1.0[v{i}]"); vl.append(f"[v{i}]")
parts.append("".join(vl) + f"amix=inputs={len(vl)}:normalize=0,atrim=0:{T},apad=whole_dur={T}[voice0]")
parts.append("[voice0]asplit=2[voice][key]")
mixin.append("[voice]")

# music (optional)
mp = os.path.join(B, name, "music.wav"); music = os.path.exists(mp)
if music:
    k = add_input(mp)
    parts.append(f"[{k}:a]{ST},atrim=0:{T},afade=t=in:d=2,afade=t=out:st={max(0, T-3.5):.2f}:d=3.5,volume=-15dB[m0]")
    parts.append("[m0][key]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450:makeup=1[m]")
    mixin.append("[m]")
else:
    parts.append("[key]anullsink")

# ambience (synthesised)
amb = AMB.get(tl.get("amb"))
if amb:
    parts.append(f"{amb},{ST},volume=-24dB[amb]"); mixin.append("[amb]")

# effects
def thump(t, g, idx, f0=95):
    ms = int(max(0, t) * 1000)
    parts.append(f"aevalsrc='sin(2*PI*({f0}-70*t)*t)*exp(-9*t)':d=0.5:s=48000,{ST},volume={g}dB,adelay={ms}|{ms}[s{idx}]"); mixin.append(f"[s{idx}]")
def whoosh(t, idx):
    ms = int(max(0, t - 0.1) * 1000)
    parts.append(f"anoisesrc=d=0.45:c=pink:r=48000,bandpass=f=1800:w=1600,afade=t=in:d=0.18,afade=t=out:st=0.22:d=0.22,{ST},volume=-22dB,adelay={ms}|{ms}[s{idx}]"); mixin.append(f"[s{idx}]")
idx = 0
thump(2.2, -8, idx); idx += 1                       # intro stamp
for i, ln in enumerate(tl["lines"]):
    whoosh(ln["t0"] - 0.1, idx); idx += 1
    if ln.get("stampAt"): thump(ln["stampAt"], -8, idx); idx += 1
    if ln.get("mood") == "shock": thump(ln["t0"], -12, idx, 60); idx += 1
out_t = tl["lines"][-1]["t1"] + 0.45
whoosh(out_t, idx); idx += 1
thump(out_t + 0.6, -8, idx); idx += 1

parts.append("".join(mixin) + f"amix=inputs={len(mixin)}:normalize=0,alimiter=limit=0.9,atrim=0:{T}[out]")
out = os.path.join(B, name, "mix.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(parts), "-map", "[out]", "-ar", "48000", "-ac", "2", out], check=True)
print("mix:", out, f"{T:.1f}s", "music" if music else "no music", tl.get("amb"))
