# Année 1970 — cloud video factory

30 French documentary episodes (`ep01`–`ep30`) about 1970, built **entirely on GitHub Actions** (`ubuntu-latest`), nothing local.

| Piece | How |
|---|---|
| Look | Lemo-Opuscar styles **Halftone Dossier** + **Mid-century Cartoon**, drawn by code (`engine/index.html`), rules in [`LEMO_STYLE.md`](LEMO_STYLE.md) |
| Puppets | breathing, talking hop + 2–3 % lean, walk-in, shock/anger shake, turn toward the speaker |
| Script | `series/episodes.py` (French, 2 puppets: l'Archiviste / la Reporter) |
| Voice | `edge-tts` (`fr-FR-HenriNeural`, `fr-FR-DeniseNeural`) |
| Music | Wikimedia Commons, licence exactly **CC0**, instrumental only (covers, audiobooks, vocals, speech filtered out) — `scripts/music.py` |
| Ambience | FFmpeg `anoisesrc` synthesis (wind, fire, nature, city, sea), no recordings |
| Loudness | two-pass `loudnorm` −14 LUFS, true peak ≤ −1 dBTP (`core/render/mux.sh`) |
| Subtitles | fr + 14 languages (Pollinations LLM, MyMemory fallback) as `.srt` |
| Release | each episode → GitHub Release `annee1970-epNN` with `mp4 + srt + thumbnail + metadata.json` |

## Run
Actions → **render** → *Run workflow* (`episodes`: `all` or `ep01,ep02`).

## Notes
- Output: 1280×720 @ 24 fps, ~55–70 s per episode.
- If no usable CC0 track is found for an episode, it is made with voice + ambience only (stated in the release notes).
- A language that fails on both translation services is skipped and listed in `metadata.json` (never faked).
- `core/` is vendored from [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) (MIT); its docs are CC BY-NC 4.0.
