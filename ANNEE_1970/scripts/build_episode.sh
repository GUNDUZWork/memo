#!/bin/sh
# Build one episode end to end, 100% in the cloud runner:  sh scripts/build_episode.sh ep07
# env: DRY=1 placeholder voice (local tests only) · SKIP_TRANSLATE=1 · WORKERS=2
set -e
EP=$1; [ -n "$EP" ] || { echo "usage: build_episode.sh epNN"; exit 2; }
N=$(echo "$EP" | sed 's/^ep0*//')
cd "$(dirname "$0")/.."
B=series/build; mkdir -p $B/$EP
GRADE="curves=r='0/0.02 0.5/0.52 1/0.98':b='0/0.04 0.5/0.47 1/0.93',eq=saturation=1.08:contrast=1.04"   # warm 1970 print grade

python3 scripts/voice.py $EP ${DRY:+--dry}
CAT=$B/music_catalog.json
if [ -f "$CAT" ]; then python3 scripts/music.py pick "$CAT" "$N" $B/$EP/music.wav 75 || echo "no music for $EP (ambience + voice only)"; else echo "no music catalogue"; fi
python3 scripts/mix.py $EP
node core/render/video.mjs engine --fps 24 --workers ${WORKERS:-2} --size 1280x720 --q "ep=$EP&w=1280" --out $B/$EP/video.mp4
LEMO_VF_EXTRA="$GRADE" sh core/render/mux.sh $B/$EP/video.mp4 $B/$EP/mix.wav $B/$EP/$EP.mp4 24 0
node core/render/still.mjs engine 2.9 --size 1280x720 --q "ep=$EP&w=1280" --out $B/$EP/still
cp $B/$EP/still/t_2.9.jpg $B/$EP/thumbnail.jpg
if [ -z "$SKIP_TRANSLATE" ]; then python3 scripts/translate.py $EP; else mkdir -p $B/$EP/subs; fi
python3 scripts/package.py $EP
