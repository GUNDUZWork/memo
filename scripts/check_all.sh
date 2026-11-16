#!/bin/sh
# Local sanity check of all 30 episodes: placeholder-voice timelines + two stills each (no network, no release).
cd "$(dirname "$0")/.."
mkdir -p /tmp/chk
for i in $(seq 1 30); do
  e=$(printf ep%02d "$i")
  [ -f series/build/$e.timeline.json ] || python3 scripts/voice.py $e --dry > /dev/null 2>&1 || echo "voice fail $e"
  tm=$(python3 -c "import json;t=json.load(open('series/build/$e.timeline.json'));l=t['lines'];print(round(l[1]['t0']+1.0,1), round(l[-1]['t0']+0.8,1))")
  node core/render/still.mjs engine 2.9 $tm --size 960x540 --q "ep=$e&w=960" --out /tmp/chk/$e 2>&1 | grep -iE "error|fail"
done
ls /tmp/chk | wc -l
