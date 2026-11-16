#!/usr/bin/env python3
"""Seri kaynağı: 30 bölüm. `python3 series/build_episodes.py` -> series/episodes.json
A = Usta (tr-TR-AhmetNeural), B = Çırak (tr-TR-EmelNeural). fx: shock | anger | none."""
import json, pathlib
A, B = "A", "B"
E = []
def ep(title, year, tag, icon, amb, pal, lines):
    E.append(dict(n=len(E) + 1, title=title, year=year, tag=tag, icon=icon, amb=amb, pal=pal,
                  lines=[dict(who=l[0], text=l[1], fx=(l[2] if len(l) > 2 else "")) for l in lines]))

ep("Dünyanın İlk Programcısı", "1843", "Ada Lovelace", "bulb", "wind", 0, [
 (B, "Usta, dünyanın ilk programcısı kimdi?"),
 (A, "Ada Lovelace. İngiliz bir matematikçiydi."),
 (A, "1843'te, Charles Babbage'ın Analitik Makine'si için bir algoritma yazdı."),
 (B, "Makine o zaman çalışıyor muydu?", "shock"),
 (A, "Hayır, hiç tamamlanmadı. Ama Ada'nın notları programlamanın temeli sayılır."),
 (B, "Ada makineler hakkında ne düşünüyordu?"),
 (A, "Makinelerin sadece sayıları değil, müziği bile işleyebileceğini öngördü."),
 (B, "Bilgisayarı bir asır önceden hayal etmiş!")])
ep("Telefonsuz Kablosuz Fikir", "1942", "Hedy Lamarr", "wifi", "nature", 1, [
 (B, "Usta, ünlü bir film yıldızı mucit olabilir mi?"),
 (A, "Olur! Hedy Lamarr hem oyuncuydu hem mucit."),
 (A, "1942'de besteci George Antheil ile frekans atlama sistemi için patent aldı."),
 (B, "Bu ne işe yarıyordu?"),
 (A, "Torpidoların radyo sinyalinin karıştırılmasını önlemek için tasarlanmıştı."),
 (B, "Donanma bunu hemen kullandı mı?", "shock"),
 (A, "Hayır, yıllarca rafta kaldı. Ama benzer fikirler bugün Wi-Fi ve Bluetooth gibi teknolojilerde yaşıyor."),
 (B, "Demek ki fikirler zamanını bekliyor!")])
ep("Ellerini Yıka, Doktor!", "1847", "Ignaz Semmelweis", "water", "wind", 2, [
 (B, "Usta, doktorlar eskiden ellerini yıkamaz mıydı?"),
 (A, "Pek yıkamazdı. Macar doktor Semmelweis, Viyana'da bir hastanede çalışıyordu."),
 (A, "Doktorların baktığı serviste lohusa ölümleri çok fazlaydı."),
 (B, "Neden böyle oluyordu?", "shock"),
 (A, "Doktorlar otopsiden sonra ellerini yıkamadan doğuma giriyordu. 1847'de klorlu suyla el yıkamayı zorunlu kıldı."),
 (A, "Ölümler çok belirgin biçimde azaldı."),
 (B, "O zaman herkes ona teşekkür etmiştir!"),
 (A, "Ne yazık ki hayır. Meslektaşları fikrini yıllarca reddetti.", "anger")])
ep("Alternatif Akımın Hikâyesi", "1888", "Nikola Tesla", "plug", "fire", 3, [
 (B, "Usta, evimizdeki elektrik nasıl geliyor?"),
 (A, "Alternatif akımla. Yönü saniyede onlarca kez değişen bir akım."),
 (A, "Nikola Tesla 1888'de alternatif akımla çalışan motoru patentledi."),
 (B, "Peki neden alternatif akım tercih edildi?"),
 (A, "Çünkü transformatörle gerilimi yükseltip uzak mesafelere az kayıpla taşımak mümkündü."),
 (B, "Yani elektrik şehirlere böyle yayıldı!"),
 (A, "Evet. Westinghouse ile birlikte 1893 Chicago Fuarı'nı alternatif akımla aydınlattılar."),
 (B, "Bir fikir tüm dünyayı aydınlattı!")])
ep("Depremi Haber Veren Ejderha", "132", "Zhang Heng", "gear", "wind", 4, [
 (B, "Usta, depremleri eskiden nasıl anlıyorlardı?"),
 (A, "Çin'de Zhang Heng, milattan sonra 132'de bir sismoskop yaptı."),
 (A, "Bronzdan bir vazoydu. Etrafında sekiz ejderha başı vardı."),
 (B, "Ejderhalar ne yapıyordu?"),
 (A, "Deprem olunca, yönündeki ejderhanın ağzından bir bronz top aşağıdaki kurbağanın ağzına düşerdi."),
 (B, "Yani depremin yönünü gösteriyordu!", "shock"),
 (A, "Evet. Uzaktaki bir depremi bile haber verdiği anlatılır."),
 (B, "Modern sismografın atası bir ejderha!")])
ep("Robot Kuyumcusu Cezeri", "1206", "El-Cezeri", "gear", "fire", 5, [
 (B, "Usta, robotları kim icat etti?"),
 (A, "Tam öyle demek zor. Ama Cizreli El-Cezeri 1206'da otomatlarla dolu bir kitap yazdı."),
 (A, "Kitabın adı, Zekice Mekanik Aygıtlar Bilgisi'ydi."),
 (B, "İçinde neler vardı?"),
 (A, "Su saatleri, el yıkama otomatları, müzisyen figürleri ve krank mili gibi mekanizmalar."),
 (B, "Krank mili mi? Motorlarda kullanılan!", "shock"),
 (A, "Aynen. Bugünkü makinelerin birçok fikri o kitapta çizilmişti."),
 (B, "Demek ki mühendislik çok eski bir sanat!")])
ep("Yörüngeyi Hesaplayan Zihin", "1962", "Katherine Johnson", "clock", "wind", 3, [
 (B, "Usta, astronotlar bilgisayara güvenir miydi?"),
 (A, "Katherine Johnson'ın olduğu yerde, önce onun hesabına güvenirlerdi."),
 (A, "1962'de John Glenn dünyanın yörüngesine çıkacaktı."),
 (B, "Bilgisayar hesap yapmıyor muydu?"),
 (A, "Yapıyordu. Ama Glenn, hesapların Katherine tarafından kontrol edilmesini istedi."),
 (B, "Yani uçuştan önce son söz onda mıydı?", "shock"),
 (A, "Evet. Hesapları elle yaptı ve doğrulandığında uçuş yapıldı."),
 (B, "Bazen insan aklı en güvenilir bilgisayar!")])
ep("Küfün Tesadüfü", "1928", "Alexander Fleming", "leaf", "nature", 4, [
 (B, "Usta, penisilin nasıl bulundu?"),
 (A, "Biraz tesadüf, biraz dikkat. Alexander Fleming 1928'de laboratuvarına tatilden döndü."),
 (A, "Bir petri kabında küf oluşmuştu ve çevresindeki bakteriler ölmüştü."),
 (B, "Çoğu kişi kabı atardı!", "shock"),
 (A, "Fleming atmadı, incelemeye karar verdi. Küf, penisilin üretiyordu."),
 (A, "Sonra Florey ve Chain onu ilaç haline getirdi. Üçü 1945'te Nobel aldı."),
 (B, "Milyonlarca hayat bir küften kurtuldu!"),
 (A, "Bilim, merakla başlar.")])
ep("İki Nobelli Kadın", "1911", "Marie Curie", "spark", "fire", 0, [
 (B, "Usta, iki Nobel ödülü alan var mı?"),
 (A, "Var! Marie Curie. 1903'te fizikte, 1911'de kimyada aldı."),
 (A, "Eşi Pierre ile 1898'de polonyum ve radyumu keşfetti."),
 (B, "Bu çok nadir bir başarı mı?", "shock"),
 (A, "İki farklı bilim dalında Nobel alan ilk kişi oldu."),
 (A, "Savaşta, taşınabilir röntgen araçlarıyla yaralıların tedavisine de yardım etti."),
 (B, "Hem bilim insanı hem kahraman!"),
 (A, "Doğru. Merak ve cesaret, birlikte yürür.")])
ep("Gözün Işık Sırrı", "1011", "İbn el-Heysem", "bulb", "wind", 1, [
 (B, "Usta, görmek nasıl oluyor?"),
 (A, "Bin yıl önce bu soruyu İbn el-Heysem cevapladı."),
 (A, "Eski düşünürler gözden ışık çıktığını sanıyordu."),
 (B, "Peki o ne dedi?"),
 (A, "Işık nesnelerden göze gelir. Deneylerle bunu gösterdi."),
 (B, "Deney mi? O dönemde bu yenilikti!", "shock"),
 (A, "Evet. Kitabı, Optik Kitabı, deneysel bilimin öncülerinden sayılır. Karanlık oda düzeneğini de inceledi."),
 (B, "Yani fotoğraf makinesinin dedesi!")])
ep("Fotoğraf 51", "1952", "Rosalind Franklin", "spark", "wind", 5, [
 (B, "Usta, DNA'nın şeklini kim buldu?"),
 (A, "Watson ve Crick 1953'te modeli yayımladı. Ama büyük bir ipucu Rosalind Franklin'den geldi."),
 (A, "1952'de çektiği Fotoğraf 51, DNA'nın sarmal yapısını gösteriyordu."),
 (B, "Fotoğrafı onun izni olmadan mı gösterdiler?", "anger"),
 (A, "Fotoğraf, Franklin'in bilgisi dışında Watson'a gösterildi."),
 (A, "Franklin 1958'de genç yaşta öldü. Nobel ise 1962'de verildi."),
 (B, "Ne büyük haksızlık!", "anger"),
 (A, "Bugün onun emeği bilim tarihinde hak ettiği yeri alıyor.")])
ep("Fosil Avcısı Mary", "1811", "Mary Anning", "gear", "nature", 2, [
 (B, "Usta, fosil bulmak için profesör olmak gerekir mi?"),
 (A, "Hayır. Mary Anning, 12 yaşında fosil topluyordu."),
 (A, "İngiltere'nin Lyme Regis kıyısında bir ihtiyozor iskeleti buldu."),
 (B, "Kızlar o zaman bilim yapabiliyor muydu?", "shock"),
 (A, "Zor. Mary, Jeoloji Cemiyeti'ne kadın olduğu için giremedi."),
 (A, "Ama 1823'te bir plesiyozor iskeleti de buldu."),
 (B, "Bilimde fırsat eşitliği önemli!"),
 (A, "Bugün dünyanın en ünlü fosil avcılarından biri olarak anılıyor.")])
ep("Yıldızların Metresi", "1912", "Henrietta Leavitt", "spark", "wind", 3, [
 (B, "Usta, yıldızların uzaklığı nasıl ölçülür?"),
 (A, "Henrietta Leavitt bir yöntem buldu. Harvard Gözlemevi'nde çalışan bir astronomdu."),
 (A, "1912'de Sefeid değişen yıldızlarda parlaklık ile periyot arasında bir ilişki fark etti."),
 (B, "Bu ne işe yarıyor?"),
 (A, "Yıldız ne kadar yavaş parlıyorsa o kadar gerçekten parlak. Bu sayede uzaklık hesaplanır."),
 (B, "Evrenin ölçüsü bir hesapla belli oldu!", "shock"),
 (A, "Hubble, galaksilerin uzaklığını bu yöntemle ölçtü."),
 (B, "Bu işin Nobel'i ona gitmeliydi!")])
ep("İlk Aşı", "1796", "Edward Jenner", "leaf", "nature", 4, [
 (B, "Usta, ilk aşı ne zaman yapıldı?"),
 (A, "1796'da Edward Jenner, çiçek hastalığına karşı ilk aşıyı denedi."),
 (A, "İnek çiçeği geçiren sağıcıların çiçek hastalığına yakalanmadığını fark etmişti."),
 (B, "Ne yaptı peki?"),
 (A, "Sekiz yaşındaki James Phipps'e inek çiçeği bulaştırdı."),
 (B, "Çocuk hasta oldu mu?", "shock"),
 (A, "Hafif bir hastalık geçirdi ve sonra çiçeğe karşı bağışık kaldı."),
 (A, "Çiçek hastalığı 1980'de resmen yok edildi. İnsanlığın en büyük başarılarından biri.")])
ep("Sıfırın Kuralları", "628", "Brahmagupta", "gear", "fire", 1, [
 (B, "Usta, sıfır nereden çıktı?"),
 (A, "Hint matematikçi Brahmagupta, 628'de sıfırla işlem kurallarını yazdı."),
 (A, "Sıfır bir sayıydı. Toplanır, çıkarılır, çarpılırdı."),
 (B, "Negatif sayılar da var mıydı?"),
 (A, "Evet. Borçları ve varlıkları ifade eden negatif sayıların kurallarını da anlattı."),
 (B, "Bu kurallar olmasaydı bilgisayar olmazdı!", "shock"),
 (A, "Sıfır ve ikilik sistem, bugünkü dijital dünyanın temelidir."),
 (B, "Hiçlik bile büyük iş görmüş!")])
ep("Algoritmanın Adı", "820", "El-Harezmi", "gear", "wind", 5, [
 (B, "Usta, algoritma kelimesi nereden geliyor?"),
 (A, "El-Harezmi'nin adından. Bağdat'ta yaşayan bir matematikçiydi."),
 (A, "Latinceye çevrilince adı Algoritmi oldu."),
 (B, "Cebir kelimesi de ondan mı?", "shock"),
 (A, "Evet. Kitabının adındaki el-cebir sözcüğünden geliyor."),
 (A, "Denklemleri adım adım çözme yöntemini anlattı."),
 (B, "Yani bugünkü yapay zekanın atası o!"),
 (A, "Her program, onun fikrinin torunu.")])
ep("Gazel Derisindeki Dünya", "1513", "Piri Reis", "leaf", "wind", 2, [
 (B, "Usta, bir haritayı gazel derisine kim çizdi?"),
 (A, "Osmanlı denizcisi Piri Reis. 1513'te bir dünya haritası çizdi."),
 (A, "Harita, 1929'da İstanbul'da Topkapı Sarayı'nda bulundu."),
 (B, "Harita çok mu doğruydu?"),
 (A, "Kıyı çizgileri ve rüzgâr yönleri için dönemin en iyi kaynaklarını kullandı."),
 (B, "Kaç haritadan yararlanmış?", "shock"),
 (A, "Kendisi yaklaşık yirmi kaynak haritadan söz eder."),
 (A, "Bu eser, denizcilik tarihinin en değerli belgelerinden biri.")])
ep("Semerkant'ın Yıldız Sultanı", "1437", "Uluğ Bey", "spark", "wind", 3, [
 (B, "Usta, bir sultan aynı zamanda astronom olabilir mi?"),
 (A, "Olur! Uluğ Bey, Timur'un torunuydu ve Semerkant'ta gözlemevi kurdu."),
 (A, "Gözlemevinin dev bir sekstantı vardı."),
 (B, "Orada ne yaptılar?"),
 (A, "Yıldızları tek tek gözlediler. 1437'de bin yirmi yıldızlık bir katalog tamamladı."),
 (B, "Teleskop olmadan mı?", "shock"),
 (A, "Evet, çıplak gözle ve çok hassas aletlerle."),
 (B, "Yıldızları saymak sultanlara yakışır!")])
ep("Enigma'yı Çözen Adam", "1940", "Alan Turing", "gear", "fire", 5, [
 (B, "Usta, savaşı bir matematikçi kazandırabilir mi?"),
 (A, "Alan Turing'in katkısı büyüktü. Bletchley Park'ta Enigma şifresini kırmaya çalıştı."),
 (A, "1940'ta Bombe adlı makineyi geliştirmeye yardım etti."),
 (B, "Makine ne yapıyordu?"),
 (A, "Almanların günlük şifre ayarlarını hızla deniyordu."),
 (B, "Bu savaşı etkiledi mi?", "shock"),
 (A, "Tarihçiler savaşı yaklaşık iki yıl kısalttığını tahmin ediyor."),
 (A, "Turing aynı zamanda bilgisayar biliminin kurucularından biri sayılır.")])
ep("Hareketli Harfler", "1450", "Johannes Gutenberg", "box", "fire", 1, [
 (B, "Usta, kitaplar eskiden nasıl çoğaltılırdı?"),
 (A, "Elle kopyalanırdı. Bir kitap aylar sürerdi."),
 (A, "1450 civarında Johannes Gutenberg, Almanya'da hareketli harflerle baskı makinesi geliştirdi."),
 (B, "Harfler tek tek mi dizilirdi?"),
 (A, "Evet. Metal harfler dizilir, mürekkeplenir ve preste basılırdı."),
 (B, "İlk büyük kitap hangisiydi?", "shock"),
 (A, "Gutenberg İncili, yaklaşık 1455'te basıldı."),
 (A, "Bilgi artık herkese ulaşabilirdi.")])
ep("Zıplayan Genler", "1948", "Barbara McClintock", "leaf", "nature", 4, [
 (B, "Usta, genler yerinde mi durur?"),
 (A, "Barbara McClintock, mısır bitkisinde genlerin yer değiştirebildiğini gösterdi."),
 (A, "Buna zıplayan genler, yani transpozon denir."),
 (B, "Bilim dünyası inandı mı?", "shock"),
 (A, "Başta kimse onu ciddiye almadı."),
 (A, "Yıllar sonra haklı çıktı ve 1983'te tek başına Nobel aldı."),
 (B, "Sabretmenin ödülü!"),
 (A, "Doğru. Kendi gözlemine inanmak bazen yıllar sürer.")])
ep("Çürümeyen Süt", "1864", "Louis Pasteur", "water", "nature", 2, [
 (B, "Usta, süt neden uzun süre bozulmuyor?"),
 (A, "Pastörizasyon sayesinde. Louis Pasteur 1864'te bu yöntemi geliştirdi."),
 (A, "Önce şarap ve biranın bozulmasını inceliyordu."),
 (B, "Yöntem neydi?"),
 (A, "Sıvıyı belirli bir sıcaklığa kadar ısıtıp zararlı mikroorganizmaları azaltmak."),
 (B, "Tadı da bozulmuyor mu?", "shock"),
 (A, "Hayır. Üstelik 1885'te kuduz aşısını da geliştirdi."),
 (B, "Mikroplara karşı büyük bir kahraman!")])
ep("Arf Değişmezi", "1941", "Cahit Arf", "gear", "wind", 3, [
 (B, "Usta, Türkiye'den ünlü matematikçi var mı?"),
 (A, "Var. Cahit Arf, dünyaca tanınan bir matematikçiydi."),
 (A, "1941'de Arf değişmezi olarak bilinen sonucu yayımladı."),
 (B, "Bu ne işe yarıyor?"),
 (A, "Topolojide bazı yüzeyleri ve yapıları ayırt etmeye yarar."),
 (B, "Banknotta yüzü var mıydı?", "shock"),
 (A, "Evet, 10 liralık banknotta resmi yer aldı."),
 (B, "Matematik de ülkeyi gururlandırıyor!")])
ep("DNA'nın Tamircisi", "2015", "Aziz Sancar", "gear", "nature", 0, [
 (B, "Usta, DNA hasar görünce ne olur?"),
 (A, "Hücreler onu onarır. Bu mekanizmayı Aziz Sancar anlattı."),
 (A, "Mardin'in Savur ilçesinde doğan Sancar, 2015'te Nobel Kimya Ödülü'nü aldı."),
 (B, "Nasıl bir onarım?", "shock"),
 (A, "Mesela güneş ışığının DNA'da yaptığı hasarı hücrenin nasıl onardığını gösterdi."),
 (A, "Bu çalışmalar kanser araştırmalarına ışık tutuyor."),
 (B, "Köyden Nobel'e uzanan bir yol!"),
 (A, "Merak ve emek, sınır tanımaz.")])
ep("Tıbbın Kanunu", "1025", "İbn Sina", "leaf", "fire", 1, [
 (B, "Usta, tıp kitabı asırlarca nasıl okutuldu?"),
 (A, "İbn Sina'nın El-Kanun fi't-Tıb'ı sayesinde."),
 (A, "Eser yaklaşık 1025'te tamamlandı. Beş ciltlik bir tıp ansiklopedisiydi."),
 (B, "Latinceye çevrildi mi?"),
 (A, "Evet. Avrupa üniversitelerinde yüzyıllarca ders kitabı olarak okutuldu."),
 (B, "Neler anlatıyordu?", "shock"),
 (A, "Hastalıkları, ilaçları ve bulaşıcı hastalıkların yayılmasını."),
 (A, "Bilgi, kuşaktan kuşağa taşınır.")])
ep("Jüpiter'in Dört Uydusu", "1610", "Galileo Galilei", "spark", "wind", 5, [
 (B, "Usta, başka bir gezegenin uydusunu ilk kim gördü?"),
 (A, "Galileo. 1610'da teleskopunu Jüpiter'e çevirdi."),
 (A, "Gezegenin yanında dört küçük ışık noktası gördü."),
 (B, "Bunlar yıldız mıydı?"),
 (A, "Hayır. Geceler boyunca yerlerini değiştirdiler. Jüpiter'in uydularıydı."),
 (B, "Demek her şey Dünya'nın çevresinde dönmüyor!", "shock"),
 (A, "Evet. Bu keşif, Dünya merkezli evren görüşüne ağır bir darbe vurdu."),
 (B, "Bir teleskop, bir devrim!")])
ep("Gölgeden Dünyayı Ölçmek", "-240", "Eratosthenes", "clock", "nature", 2, [
 (B, "Usta, Dünya'nın çevresi nasıl ölçüldü?"),
 (A, "Eratosthenes milattan önce 240 civarında bir gölgeyle ölçtü."),
 (A, "Syene'de öğle güneşi kuyunun dibini aydınlatıyordu."),
 (B, "İskenderiye'de de öyle miydi?"),
 (A, "Hayır. İskenderiye'de bir çubuğun gölgesi, yaklaşık yedi derecelik açı yapıyordu."),
 (B, "Bu farktan çevre nasıl çıktı?", "shock"),
 (A, "Açı, tam dairenin elli de biri. Mesafeyi elli ile çarptı."),
 (A, "Sonuç gerçeğe şaşırtıcı derecede yakındı.")])
ep("On İki Saniyelik Uçuş", "1903", "Wright Kardeşler", "gear", "wind", 0, [
 (B, "Usta, ilk uçak ne kadar uçtu?"),
 (A, "17 Aralık 1903'te Wright kardeşlerin uçağı, yaklaşık on iki saniye havada kaldı."),
 (A, "Kitty Hawk'ta, Kuzey Karolina'da."),
 (B, "Bu kadar kısa mı?", "shock"),
 (A, "Evet, ama kontrollü ve motorlu bir uçuştu. Bir ilkti."),
 (A, "Önce rüzgâr tüneli kurup yüzlerce kanat modeli denediler."),
 (B, "Yani şans değil, deneydi!"),
 (A, "Bilim, deneme yanılmayı disipline eder.")])
ep("Pelin Otunun Armağanı", "1972", "Tu Youyou", "leaf", "nature", 4, [
 (B, "Usta, sıtmaya çare nasıl bulundu?"),
 (A, "Çinli bilim insanı Tu Youyou, 1972'de tatlı pelin bitkisinden artemisinin elde etti."),
 (A, "Eski Çin tıp kitaplarını taradı."),
 (B, "Bitki işe yaradı mı?"),
 (A, "Evet. Sıtma parazitlerine karşı çok etkili çıktı."),
 (B, "Bu ilacı kendi üzerinde de denedi mi?", "shock"),
 (A, "Ekibiyle birlikte kendilerini de gönüllü olarak denedikleri anlatılır."),
 (A, "2015'te Tıp Nobel Ödülü'nü aldı.")])
ep("Radyodan Gelen Ritim", "1967", "Jocelyn Bell", "spark", "wind", 3, [
 (B, "Usta, atarcaları kim keşfetti?"),
 (A, "Jocelyn Bell, 1967'de öğrenciyken fark etti."),
 (A, "Radyo teleskop verilerinde düzenli aralıkla tekrarlanan bir sinyal buldu."),
 (B, "Uzaylılar mıydı?", "shock"),
 (A, "Önce şaka olarak yeşil adamlar dendi. Sonra hızla dönen nötron yıldızları olduğu anlaşıldı."),
 (A, "Nobel 1974'te danışmanı Antony Hewish'e verildi."),
 (B, "Peki Bell'e ne oldu?", "anger"),
 (A, "Bell ödül almadı ama bilim camiası emeğini tanıyor.")])

# --- stil seçimi: konunun duygusuna göre ana stil + bilgi sahnesi (harita/matematik/kronoloji) stili ---
STYLE = {1: "pixel", 2: "neon", 3: "comic", 4: "goldline", 5: "goldline", 6: "goldline", 7: "flatvector", 8: "cgi", 9: "flatvector",
         10: "goldline", 11: "lineart", 12: "lego", 13: "flatvector", 14: "comic", 15: "goldline", 16: "goldline", 17: "goldline", 18: "goldline",
         19: "ps2", 20: "goldline", 21: "lineart", 22: "cgi", 23: "chalkboard", 24: "flatvector", 25: "goldline", 26: "cgi", 27: "chalkboard",
         28: "lego", 29: "flatvector", 30: "neon"}
INFO_CHALK = {1, 13, 17, 18, 22, 26, 29, 30, 15, 16, 7, 2}   # harita / sayı / yıldız / kronoloji anları: tebeşir tahtası şeması
for e in E:
    e["style"] = STYLE[e["n"]]
    e["info"] = None if e["style"] in ("chalkboard", "goldline") else ("chalkboard" if e["n"] in INFO_CHALK else "goldline")
out = pathlib.Path(__file__).with_name("episodes.json")
out.write_text(json.dumps(dict(series="Bilimin Unutulan Kahramanları", lang="tr", episodes=E), ensure_ascii=False, indent=1), encoding="utf-8")
print(len(E), "episodes ->", out)
