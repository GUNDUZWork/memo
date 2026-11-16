# CLAUDE.md — Bilimin Unutulan Kahramanları (BILIM_KAHRAMANLARI_TR)

Kurallar (kalıcı):
1. **Harici GPU/API kotası yok.** Görüntü yalnızca kod: Canvas 2D + tipli-dizi post geçişleri (`film/`). Görsel üretici yapay zekâ, Kaggle/Colab, stok görüntü kullanma.
2. **Stil havuzu:** `film/styles/index.js` içindeki 10 stil (pixel, chalkboard, lineart, ps2, comic, flatvector, goldline, cgi, lego, neon) + `midcentury` (varsayılan). Ayrıntı: `LEMO_STYLE.md`.
3. **Her bölüm** `series/episodes.json` içinde `style` (ana anlatım) ve `info` (harita/sayı/kronoloji sahnesi: `chalkboard` | `goldline`) taşır; değiştirmek için `series/build_episodes.py` düzenlenip çalıştırılır.
4. **Kukla fiziği ve dinamik kamera tüm stillerde standarttır** (`pose()` in `film/scene.js`): konuşurken sıçrama (ses zarfı), %2-3 eğilme, nefes, yürüyerek giriş, şok/öfke sarsıntısı, konuşana yüz dönme, yavaş zoom. Stil bunu bozmaz; yalnızca yeniden boyar.
5. **Ses:** edge-tts; müzik yalnızca Wikimedia Commons CC0 enstrümantal (cover/sesli kitap/vokal elenir); ambiyans yalnızca FFmpeg `anoisesrc`; −14 LUFS.
6. **Tek dil, ÇEVİRİ YOK (kalıcı):** her proje yalnızca kendi ana dilinde üretilir (Türkçe→`tr`, Fransızca→`fr`, İngilizce→`en`). Altyazı, başlık, açıklama, etiketler (`metadata.json`) ve thumbnail yalnızca o dilde. `translate` adımı, MyMemory/Pollinations döngüleri ve çoklu SRT yasaktır. Çıktı: Release `bilim-epNN` = mp4 + `epNN.tr.srt` + thumbnail + metadata.json.
7. **Lisans:** Lemo-Opuscar kodu MIT (uyarlandı); `.md` belgeleri CC BY-NC olduğundan kopyalanmaz. Kredi: "Lemo-Opuscar by Lemomo (LemoLab)". Clawd karakteri ve gerçek marka/logo kullanılmaz.
8. **Önizleme:** stil değişikliklerinden sonra `masterpiece_showcase.jpg` yeniden üretilir (her stil için `still.mjs … ?style=`).
