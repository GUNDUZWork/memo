# Komik Postacı – Deneme Paketi

Fikir: Küçük köy postacısı, tek bir mektubu tepedeki evin kapısına bırakmaya çalışır; ama kapıyı bekleyen kaz buna izin vermez.
Süre: 12 saniye, tek klip, 16:9, sessiz slapstick (müzik/ses ayrı eklenebilir).

---

## 1. Hikaye (Türkçe)

**Hasan** adında kısa boylu, kocaman bıyıklı bir postacı, bisikletiyle sarp bir köy yokuşunu çıkar. Sepetinde tek bir mektup var. Tepedeki mavi kapılı evin önünde ise **Pembe Hanım**'ın azılı kazı **Fındık** nöbet tutmaktadır.

- Hasan mektubu posta kutusuna atmaya çalışır, kaz mektubu gagalayıp kapar.
- Hasan peşinden koşar, kaz bisikletin etrafında daireler çizer, Hasan kendi bisikletine dolanır.
- Sonunda kaz mektubu tam posta kutusuna kendisi bırakır. Hasan şapkasını çıkarıp saygıyla selam verir; kaz zafer pozu verir.

Komedi mantığı: küçük adam, kendini patron sanan hayvan, son sahnede rollerin tersine dönmesi.

---

## 2. Stil Kilidi (her prompta aynen eklenecek)

> **STYLE LOCK:** hand-painted gouache storybook animation, soft visible brush strokes, warm ochre / terracotta / sage-green palette with a pastel sky, gentle paper-grain texture, rounded friendly shapes, soft golden-hour lighting, subtle film grain, no text, no logos, no photorealism, no 3D render look.

---

## 3. Referans Görsel Promptları

Her biri ayrı üretilip `references/` klasörüne kaydedilecek. Hepsinin sonuna STYLE LOCK eklenir.

### 3.1 Karakter – Hasan (postacı)
```
Character sheet, front / three-quarter / side view, full body on a plain cream background.
Hasan, a short and round middle-aged village postman, huge curled black moustache, rosy cheeks,
oversized navy postman cap with a small yellow horn badge, faded blue uniform that is slightly
too big, brown leather mailbag across the chest, rolled-up trousers, mismatched socks.
Expressive, kind, easily flustered face. Neutral standing pose plus one panicked-expression inset.
[STYLE LOCK]
```

### 3.2 Karakter – Fındık (kaz)
```
Character sheet, front / three-quarter / side view, full body on a plain cream background.
Fındık, a plump, extremely smug white goose with a bright orange beak, tiny judgmental eyebrows,
a pink knitted scarf tied around the neck, chest puffed out, wings half-spread in a boss-like pose.
One inset of the beak holding a letter.
[STYLE LOCK]
```

### 3.3 Obje – Bisiklet ve mektup
```
Object sheet on a plain cream background: a rusty green delivery bicycle with a wicker front basket
and a tiny brass bell, shown from side and three-quarter view; beside it one cream-colored envelope
with a red wax seal and a blue stamp, shown front and back.
[STYLE LOCK]
```

### 3.4 Mekan – Yokuş ve mavi kapılı ev
```
Wide environment plate: a steep cobblestone village hill road winding up to a small whitewashed
stone house with a bright blue door, a crooked wooden mailbox on a post at the gate, hollyhocks along
the wall, a low stone fence, distant hills and a pastel sky. Empty of characters, camera slightly low,
golden-hour light.
[STYLE LOCK]
```

---

## 4. Master Video Promptu (12 sn, zaman damgalı)

Video aracında 3.1–3.4'teki plate'leri referans/image-input olarak ekleyin.

```
STYLE LOCK: hand-painted gouache storybook animation, soft visible brush strokes, warm ochre /
terracotta / sage-green palette with a pastel sky, gentle paper-grain texture, rounded friendly
shapes, soft golden-hour lighting, subtle film grain, no text, no logos, no photorealism,
no 3D render look.

Characters and setting exactly as in the reference images: Hasan the round, moustached postman in
a navy cap on a rusty green bicycle; Fındık the smug white goose with a pink scarf; the blue-door
stone house on the cobblestone hill. Consistent faces, outfits and colors in every shot.
Camera: stable, gentle, storybook framing. No dialogue, no on-screen text.

[00:00–00:03] Wide shot, low angle. Hasan pedals up the steep cobblestone hill, wobbling, cheeks
puffed, cap bouncing. At the top, Fındık stands stiffly beside the mailbox, chest out, arms
(wings) crossed. Hasan's bell goes "ting" and he squeaks to a stop in front of her.

[00:03–00:06] Medium two-shot. Hasan tiptoes toward the mailbox holding the envelope high.
Fındık snaps the envelope out of his hand with her beak in one lightning-fast move and waddles
away. Hasan's moustache droops, eyes go wide.

[00:06–00:09] Fast tracking shot. Hasan chases the goose in circles around his own bicycle;
the goose slips under the frame, Hasan loops the scarf-like handlebar basket around himself and
ends up tangled, hopping on one leg with the bicycle stuck to him. Cap spins in the air.

[00:09–00:12] Medium shot, calm after the chaos. The goose strolls to the mailbox and drops the
envelope in herself, then bows her head with a smug "job done" look. Hasan, still half-tangled,
catches his falling cap, lifts it to the goose in respectful salute. Final held frame:
goose proud, postman bowing, golden light on the blue door.
```

---

## 5. Üretim Sırası (öneri)

1. 3.1–3.4 görsellerini üretin → `references/`
2. Hasan ve Fındık yüzleri tutarlıysa 4'teki master promptu referanslarla videoya verin → `renders/`
3. Beğendiğinizi `final/`'e alın.

Tutarlılık sorunu çıkarsa: önce yalnızca ilk 3 saniyeyi üretip karakter eşleşmesini kontrol edin, sonra tam klibe geçin.
