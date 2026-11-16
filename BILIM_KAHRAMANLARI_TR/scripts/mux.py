#!/usr/bin/env python3
"""Video + karışım -> -14 LUFS (iki geçişli loudnorm) + sıcak baskı LUT'u -> out/epNN/epNN.mp4.  python3 scripts/mux.py ep01 video.mp4"""
import json, pathlib, re, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
LUT = "curves=r='0/0 0.5/0.515 1/1':g='0/0 0.5/0.5 1/0.995':b='0/0.015 0.5/0.485 1/0.97',eq=contrast=1.03:saturation=1.04"   # warm print LUT (cheap, deterministic)
TARGET = "I=-14:TP=-1.5:LRA=11"

def main():
    eid, video = sys.argv[1], sys.argv[2]; d = ROOT / "out" / eid; mix = d / "mix.wav"; out = d / f"{eid}.mp4"
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(mix), "-af", f"loudnorm={TARGET}:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S).group(0))
    ln = f"loudnorm={TARGET}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", video, "-i", str(mix), "-map", "0:v", "-map", "1:a", "-vf", LUT + ",format=yuv420p",
        "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-af", ln + ",aresample=48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", str(out)], check=True)
    q = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(out), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    I = re.findall(r"I:\s+(-?[\d.]+) LUFS", q); print(eid, "final loudness:", I[-1] if I else "?", "LUFS ->", out)

main()
