#!/usr/bin/env python3
"""Mix narration + procedural music bed (per formula), ducked under the voice,
then two-pass EBU R128 loudnorm to -14 LUFS integrated / -1 dBTP.

Usage: python3 scripts/mix.py narration.wav <formula> out.wav
"""
import json
import re
import subprocess
import sys

TARGET_I, TARGET_TP, TARGET_LRA = -14.0, -1.0, 11.0

# Procedural beds (no copyrighted music, generated on the runner).
BEDS = {
    "etsilab": "0.22*sin(2*PI*55*t)*(0.6+0.4*sin(2*PI*0.5*t))"
               "+0.10*sin(2*PI*82.41*t)+0.05*sin(2*PI*880*t)*exp(-40*mod(t,0.5))",
    "homodeus": "(0.12*sin(2*PI*110*t)+0.09*sin(2*PI*164.81*t)+0.07*sin(2*PI*220*t)"
                "+0.05*sin(2*PI*277.18*t))*(0.75+0.25*sin(2*PI*0.08*t))",
    "izranoff": "0.22*sin(2*PI*41.2*t)+0.14*sin(2*PI*43.65*t)"
                "+0.06*sin(2*PI*329.6*t)*(0.5+0.5*sin(2*PI*0.05*t))",
    "30jours": "0.16*sin(2*PI*261.63*pow(2,if(eq(floor(mod(t*4,4)),0),0,if(eq(floor(mod(t*4,4)),1),4,"
               "if(eq(floor(mod(t*4,4)),2),7,12)))/12)*t)*exp(-14*mod(t,0.25))"
               "+0.10*sin(2*PI*65.41*t)*exp(-8*mod(t,0.5))",
}
NOISE = {"izranoff": 0.035, "etsilab": 0.012, "homodeus": 0.006, "30jours": 0.0}


def probe_duration(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "default=nw=1:nk=1", path], text=True)
    return float(out.strip())


def main():
    narration, formula, out = sys.argv[1:4]
    sfx = sys.argv[4] if len(sys.argv) > 4 else None  # whoosh / impacts de transition (scripts/sfx.py)
    dur = probe_duration(narration)
    expr = BEDS.get(formula, BEDS["homodeus"])
    noise = NOISE.get(formula, 0)
    bed_src = f"aevalsrc='{expr}':s=48000:d={dur:.3f}"
    graph = (
        "[0:a]aformat=sample_rates=48000:channel_layouts=mono,asplit=2[voice][side];"
        "[1:a]volume=0.12,afade=t=in:d=2,"
        f"afade=t=out:st={max(0, dur - 3):.3f}:d=3"
        + (f"[tone];[2:a]volume={noise},lowpass=f=400[nz];[tone][nz]amix=inputs=2:normalize=0[bedraw];"
           if noise else "[bedraw];")
        + "[bedraw][side]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450:makeup=1[bed];"
        "[voice][bed]amix=inputs=2:normalize=0:duration=first[vb];"
        + ("[vb][sfx]amix=inputs=2:normalize=0:duration=first[vbs];[vbs]" if sfx else "[vb]")
        + "aformat=channel_layouts=stereo,highpass=f=40[mix]"
    )
    inputs = ["-i", narration, "-f", "lavfi", "-i", bed_src]
    if noise:
        inputs += ["-f", "lavfi", "-i", f"anoisesrc=color=brown:r=48000:d={dur:.3f}"]
    if sfx:
        graph = f"[{inputs.count('-i')}:a]aformat=sample_rates=48000:channel_layouts=mono,volume=0.8[sfx];" + graph
        inputs += ["-i", sfx]

    # Pass 1: measure
    p1 = subprocess.run(
        ["ffmpeg", "-hide_banner", "-y", *inputs, "-filter_complex",
         graph + f";[mix]loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}:print_format=json[o]",
         "-map", "[o]", "-f", "null", "-"],
        capture_output=True, text=True, check=True)
    m = json.loads(re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", p1.stderr)[-1])

    # Pass 2: apply with measured values (linear normalisation when possible)
    ln = (f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}:"
          f"measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=json")
    p2 = subprocess.run(
        ["ffmpeg", "-hide_banner", "-y", *inputs, "-filter_complex", graph + f";[mix]{ln},aresample=48000[o]",
         "-map", "[o]", "-c:a", "pcm_s16le", out],
        capture_output=True, text=True, check=True)
    r = json.loads(re.findall(r"\{[^{}]*\"output_i\"[^{}]*\}", p2.stderr)[-1])
    print(f"OK mix {formula}: {r['output_i']} LUFS, TP {r['output_tp']} dBTP, {dur:.1f}s -> {out}")


if __name__ == "__main__":
    main()
