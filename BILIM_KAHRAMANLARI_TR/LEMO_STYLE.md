# LEMO_STYLE — Bilimin Unutulan Kahramanları

Kaynak: **Lemo-Opuscar** (Lemomo / LemoLab) — https://github.com/lemomo-ai/lemo-opuscar
Kod (`core/render`, `film/engine/toon.js|icons.js|chars.js`) MIT lisanslıdır ve bu depoya uyarlanarak kopyalandı (`LICENSES/MIT.txt`).
Kütüphanenin `.md` belgeleri CC BY-NC 4.0 olduğundan **kopyalanmadı**; aşağıdaki metin bizim kendi özetimizdir.

## Seçim (harici görsel üretici İSTEMEYEN, tamamen kodla çizilen iki stil)
`comic-history`, `manga-panels`, `text-flash-cuts` (AI görsel gerektirir) kullanılmadı. Eski basit geometrik çizimler (`folkDocEngine` vb.) kullanılmıyor.

| Rol | Stil | Neden |
|---|---|---|
| 1. Baskı / renk / tipografi / kamera | **midcentury-toon** (`styles/midcentury-toon`) | Krem kâğıt, yumuşak atom-çağı tamamlayıcı renkler; her dolgu ink çizgisinden birkaç piksel kaymış "ofset cel" (12 fps'te titrer); kırık mürekkep çizgisi; sunburst, 4 köşe yıldız, madalyon; Oleo Script / Alfa Slab One / Jost; "sehpa" kamerası (yavaş itme, son karede tam durgunluk). |
| 2. Kukla anatomisi ve "canlılık" fiziği | **rubber-hose** (`styles/rubber-hose`) | Dolgun makaron uzuvlar, beyaz eldiven, büyük ayakkabı; her şey nefes alır, ikilide (twos) çizilir, beklenti–tutuş–aksiyon, darbede sıkışma ve yaylanma. Renk paleti midcentury'ye çevrildi (rubber-hose'un gri tonlaması kullanılmıyor). |

## Sadık kalınan kurallar
- **Ofset cel + ink**: `toon.js` `shape()`/`ink()`; ofset `reg()` ile 12 fps'te yeniden zar atılır; kâğıt greni + sıcak vinyet (`paperFinish`).
- **Renk (LUT)**: bölüm başına tek zemin rengi seti (duvar tonu / zemin gölgesi / vurgu); kâğıt `#F4EAD5`, mürekkep `#2B2420`. Kodlamada hafif "sıcak baskı" eğrisi (`scripts/mux.py` içindeki `LUT`).
- **Işık**: tek yönlü (sol-üst) — her şekilde tek bir düz koyu düzlem, asla gradyan.
- **Altyazı**: kâğıt rengi yuvarlak kart, ince mürekkep kenar, uçlarda dönen yıldız; ≥ max(1,8 sn, konuşma + 0,6 sn, karakter/12 + 1 sn).
- **Sahne**: soyut renk düzlemi + zemin bandı + kırık ufuk çizgisi + tek ikon (sunburst arkası); gerçek oda çizilmez.
- **Kamera**: sehpa; hareket 24 fps (birlik), kuklalar 12 fps (ikilik); kesme/iris, çözülme (dissolve) yok.
- **Ses**: konuşma + müzik + ambiyans üç katman; müzik konuşmada sidechain ile ~8-10 dB kısılır; hedef −14 LUFS.

## Kukla fiziği (`film/puppet.js`, `film/scene.js → pose()`)
| Davranış | Uygulama |
|---|---|
| Konuşurken dikey zıplama | Ses zarfı (24 fps RMS, `timeline.json`) ile `y -= env^0.8 × 22 px`; ağız açıklığı aynı zarfla |
| %2-3 öne eğilme | Konuşan kukla ortağına doğru `lean = ±0.026 rad` (+ yavaş salınım); dinleyici ±0.012 |
| Nefes alma | Tüm kuklalarda `scaleY 1 ± %1,2` (3,2 sn periyot), x'te ters faz |
| Sahneye yürüyerek giriş | Kenardan 1,9 sn eased yürüyüş, adım başına bobbing, ileri eğim, bacak/ayakkabı döngüsü |
| Şok | Sıçrama + sıkışma-gerilme yayı (üst üste sönümlü), geniş gözler, "O" ağız, "!" işareti; ortak geri sarsılır |
| Öfke | 190 rad/s yatay sarsıntı (üstel sönüm), yumruk el, inik kaşlar, kızgın buhar yıldızları |
| Konuşana yüz dönme | Baş dönüşü `tl` (kamera → konuşan) 0,25 sn'de; burun silüetin parçası; konuşma bitince kameraya dönüş |
| Veda | Final: ağız kapalı gülümseme, uzak kol sallama |

## Üretim hattı
`scripts/tts.py` (edge-tts) → `music.py` (Commons CC0) → `mix.py` (FFmpeg `anoisesrc`) → `core/render/video.mjs` → `mux.py` (−14 LUFS) → `translate.py` (14 dil) → `package.py` → `gh release`.

## Atıf
"Lemo-Opuscar by Lemomo (LemoLab)", https://github.com/lemomo-ai/lemo-opuscar — kod MIT; biz stil gramerini ve kodu uyarladık, değişiklik yaptık. Hiçbir karakter, çizim, yazı biçimi ya da müzik demo filmlerinden alınmadı.
