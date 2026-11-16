# Bilimin Unutulan Kahramanları — 30 bölümlük bulut video fabrikası

Konu: bilim ve teknoloji tarihinin az bilinen ya da hakkı yenmiş kahramanları (Ada Lovelace, Hedy Lamarr, Semmelweis, El-Cezeri, Rosalind Franklin, Aziz Sancar, Cahit Arf …). Her bölüm ~45 sn, iki kukla (Usta ve Çırak) diyalogu.

Her şey GitHub Actions'ta çalışır; yerel makine, GPU ya da harici görsel AI gerekmez.

| Adım | Araç |
|---|---|
| Görüntü | Canvas2D, Lemo-Opuscar `midcentury-toon` + `rubber-hose` kukla fiziği → `LEMO_STYLE.md` |
| Seslendirme | `edge-tts` (tr-TR-AhmetNeural / tr-TR-EmelNeural) |
| Müzik | Wikimedia Commons, yalnızca CC0 enstrümantal (cover / sesli kitap / vokal filtrelenir) |
| Ambiyans | FFmpeg `anoisesrc` (rüzgâr, ateş, doğa) — konuşmasız |
| Mastering | −14 LUFS (iki geçişli `loudnorm`) |
| Çeviri | 14 dil: Pollinations LLM (`text.pollinations.ai/openai`), yedek MyMemory |
| Çıktı | Bölüm başına Release `bilim-epNN`: `epNN.mp4`, `epNN.<dil>.srt` (tr + 14), `epNN_thumb.jpg`, `metadata.json` |

## Çalıştırma
Actions → **Render — Bilimin Unutulan Kahramanları** → *Run workflow* → `episodes: all` (veya `1,4,12`, `1-10`).
Ya da `RUN_REQUEST.txt` içindeki `episodes=` değerini değiştirip `claude/**` dalına push'layın.

## Yerel test (isteğe bağlı)
`python3 series/build_episodes.py` senaryoyu yeniden üretir (`series/episodes.json`). Ağ gerektiren adımlar (edge-tts, Commons, Pollinations) yalnızca Actions'ta çalışır; `scripts/tts.py ep01 --fake` ağsız test içindir.

Lisans/atıf: `LEMO_STYLE.md`, `LICENSES/`. Fontlar SIL OFL 1.1 (Oleo Script, Alfa Slab One, Jost), çalışma anında indirilir.
