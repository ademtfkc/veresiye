# Veresiye — Kullanım Rehberi

## Bu Program Ne İşe Yarar?

Yıllardan beri **kağıt defterde** tuttuğunuz müşteri adları, perde ölçüleri ve borç bakiyeleri — hepsi artık bilgisayarda, defter kadar basit. Bir müşteri geldiğinde, satış yaptığınızda, ödeme aldığınızda bilgisayara 30 saniyede not düşebilirsiniz. Borç listesi, kırmızı liste (gecikme yapanlar), raporlar — hepsi otomatik ve anlık.

---

## Kurulum

Program, Windows bilgisayara **bir kez** kurulur. Kurulum dosyası: **`Veresiye Setup 1.0.0.exe`** (yaklaşık 115 MB).

**İndirme linki:**
https://github.com/ademtfkc/veresiye/releases/tag/v1.0.0

### Adımlar
1. Yukarıdaki linki Windows bilgisayarında açın ve `Veresiye.Setup.1.0.0.exe` dosyasını indirin.
2. İnen dosyaya **çift tıklayın**.
3. ⚠️ **Windows bir uyarı gösterebilir:** *"Windows bilgisayarınızı korudu"* (mavi pencere). Bunun sebebi programın pahalı bir "dijital imza sertifikası" taşımamasıdır — ücretsiz/açık kaynak programlarda bu normaldir, zararlı değildir.
   - Uyarıdaki **"Daha fazla bilgi"** yazısına tıklayın.
   - Ardından çıkan **"Yine de çalıştır"** düğmesine basın.
4. Kurulum sihirbazı açılır: **İleri → Kur**. Masaüstüne **"Veresiye"** simgesi eklenir.
5. Her gün bu simgeye çift tıklayarak programı açarsınız. **İnternet gerekmez.**

> **Not:** Programın tüm verisi (defter dosyası ve yedekler) bilgisayarınızda kalır, hiçbir yere gönderilmez. Güncelleme/lisans kontrolü gibi internete ihtiyaç duyan hiçbir mekanizma yoktur.

---

## İlk Kez Açtığınızda (İlk Kurulum)

Bilgisayar programı ilk defa açtığında, şu ekran görünecek:

### "Dükkan Sahibi Hesabı Oluştur"

**1. Kullanıcı Adı yazın**
   - En az 3 harf (örn: `ahmet` veya `dukkansahipi`)
   - Boş bırakmayın

**2. Şifre yazın**
   - En az 6 karakter
   - Unutmayacağınız bir şey olsun (örn: doğum tarihi + ev numarası)
   - Yazdıktan sonra bir kez daha okuyup doğruluğunu kontrol edin

**3. Şifreyi tekrar yazın**
   - Birinci şifrenizle birebir aynı olmalı
   - İkisinden biri yanlışsa "Şifreler eşleşmiyor" yazısı çıkacak, düzeltin

**4. Hesabı Oluştur butonuna tıklayın**

Bundan sonra her açılışta bu kullanıcı adı + şifre ile giriş yapacaksınız.

---

## Her Gün Program Açılışı

1. Masaüstündeki **Veresiye** simgesine çift tıklayın.
2. Kullanıcı adınızı ve şifrenizi yazıp **Giriş Yap** butonuna tıklayın.
3. **Kontrol Paneli** ekranı açılacak.

---

## Günlük İşler — Adım Adım

### A. Yeni Müşteri Ekleme

Daha önce defterde kayıtlı olmayan yeni bir müşteri geldiğinde:

**1. Müşteriler sekmesine tıklayın** (sol menüden)

**2. Yeni Müşteri butonuna tıklayın** (sağ üstte)

**3. Form açılır — şu alanları doldurun:**
   - **Ad-Soyad** (zorunlu)
   - **Telefon** (isteğe bağlı, arama için çok yararlı)
   - **Adres** (isteğe bağlı)
   - **Not** (isteğe bağlı — müşteriyle ilgili hatırlatmalar, örn: "Yazlık için her yıl perde değiştiriyor")
   - **Açılış Bakiyesi (isteğe bağlı)** — ⭐ **yeni özellik**

**4. Müşteriyi Kaydet butonuna tıklayın**

Müşteri kaydedildi. Şimdi bu müşteride satış/tahsilat yapabilirsiniz.

#### ⭐ Açılış Bakiyesi nedir?

Müşterinin **eski defterden gelen borcu** varsa, o rakamı buraya yazın (örn: `3.500`). Program müşteriyi kaydettikten sonra otomatik olarak bugün tarihli bir **"Devir (eski defter)"** kaydı oluşturur ve notuna *"Açılış bakiyesi"* yazar.

- Boş bırakırsanız hiçbir şey olmaz — müşteri sıfır bakiyeyle açılır.
- Yani tek tek "önce müşteriyi ekle, sonra Devir ekranına git" derdi kalktı: **bir formda ikisi birden.**
- Toplu (1000 kayıtlık) eski defter aktarımı için yine **Devir Girişi** ekranı daha hızlıdır (aşağıda **D** bölümü). Açılış bakiyesi, gün içinde tek tük gelen "bunun eski borcu da vardı" durumları için pratiktir.

---

### B. Yeni Satış (Perde Ölçüleri) Girme

Müşteri perdeyi almaya karar verdi ve ölçüleri aldınız:

**1. Yeni Satış sekmesine tıklayın** (sol menüden)

**2. Müşteri seçin**
   - Kutuya müşteri adı yazın (arama kutusu otomatik öneriler gösterecek)
   - Sağında listeden tıklayın
   - Eğer müşteri yoksa, doğrudan bu sayfada "Yeni Müşteri Ekle" yazısını tıklayarak anında oluşturup seçebilirsiniz

**3. Açıklama yazın** (opsiyonel)
   - Örn: "Salon 3 perde, yatak odası 2 perde"

**4. Perde Kalemi Ekleyin — satır satır:**
   - **Oda:** "Salon", "Yatak Odası", "Mutfak"
   - **Model / Kumaş:** "Fon Perdesi Ekru", "Düz Beyaz"
   - **En cm:** Ölçü bandıyla aldığınız genişlik (örn: `150`) — **isteğe bağlı**
   - **Boy cm:** Yükseklik (örn: `210`) — **isteğe bağlı**
   - **Adet:** Kaç perde? (örn: `2`)
   - **Tutar:** ⭐ O satırın **toplam parası**, lira (örn: `3000`)

   Yazıp Enter tuşuna basın veya "+ Kalem Ekle" butonuna tıklayın.

   **Ekran, tüm satırların toplamını büyük rakamla gösterir:**
   ```
   TOPLAM: 3.000,00 ₺
   ```

   Daha fazla kalem varsa 4. adımı tekrarlayın.

#### ⭐ Tutar nasıl çalışıyor?

Eskiden program "birim fiyat × adet" hesabı yapıyordu. **Artık yapmıyor** — çünkü perdede fiyat çoğu zaman metrekareye, kumaşa ve işçiliğe göre pazarlıkla belirleniyor; hazır formül tutmuyordu.

- **Tutar sütununa siz ne yazarsanız o geçerlidir.** Program sadece satırları toplar.
- **En / Boy artık zorunlu değil, bilgi amaçlıdır.** İstediğiniz gibi doldurun (müşteri "geçen seferki ölçü neydi?" diye sorduğunda işinize yarar), boş da bırakabilirsiniz.
- **Adet** de bilgi amaçlıdır, fiyata karışmaz.

> **Eski kayıtlarınız güvende:** Sürüm yükseltilirken daha önce girilmiş satışların tutarları olduğu gibi korundu, hiçbir rakam değişmedi.

**5. Hepsi bittiyse "Kaydet" butonuna tıklayın**

Program soracak: *"Peşinat aldınız mı?"*
   - **Evet** tıklarsanız → Tahsilat ekranı açılacak (aşağıdaki **C** bölümüne gidin)
   - **Hayır** tıklarsanız → Satış kaydedilir, menüye dönüp diğer işe geçersiniz

---

#### ⭐ Oda ve Kumaş Kutuları Sizi Hatırlıyor

Aynı oda adını ve kumaşı her seferinde baştan yazmanıza gerek yok:

- **Oda** kutusuna `mu` yazın → altında **Mutfak** önerisi çıkar, tıklayın (ya da ok tuşuyla
  seçip Enter'a basın).
- Aynısı **Model / Kumaş** kutusu için de geçerli.
- **En çok kullandığınız üstte** çıkar. Yani "Salon" perdesini çok satıyorsanız o hep elinizin altında olur.
- **Salon, Yatak Odası, Çocuk Odası, Mutfak, Banyo, Balkon, Hol, Çalışma Odası** ilk günden hazır gelir.
- **Kumaş listesi boş başlar** ve siz yazdıkça dolar — çünkü her dükkanın kumaşı farklıdır,
  program size olmayan bir şey dayatmaz.
- Listede olmayan yeni bir oda/kumaş yazmak **her zaman serbesttir**; yazdığınız anda o da
  listeye katılır ve bir dahaki sefere öneri olarak çıkar.

> Bir şeyi yanlış yazarsanız (örn. "Mutfk") o da öneride görünür — ama az kullanıldığı için
> listenin dibinde kalır, doğrusunu seçmeye devam edersiniz.

---

#### ⭐ Toptan / İndirimli Fiyat — satır satır fiyat girmeden

Müşteriyle pazarlık edip toplu bir fiyatta anlaştıysanız ("hepsi 8.500'e olsun"),
her satıra ayrı fiyat yazmanıza gerek yok:

**1. Perde kalemlerini her zamanki gibi girin** — oda, model/kumaş, en, boy, adet.
   Ölçüler kayda geçsin ki sonradan "hangi perdeydi" diye baktığınızda görün.

**2. Satırlardaki "Tutar" kutularını BOŞ bırakın.**

**3. En alttaki "SATIŞ TOPLAMI" kutusuna anlaştığınız rakamı yazın** (örn. `8.500`).

**4. "Satışı Kaydet" deyin.** Satış 8.500,00 ₺ olarak kaydedilir.

**İndirim yaptığınızda:** Satırlara fiyat yazdıysanız ve sonra toplamı düşürürseniz,
program farkı kendiliğinden gösterir:

> ℹ Satırların toplamı **9.000,00 ₺**, siz **8.500,00 ₺** yazdınız — **500,00 ₺ indirim** uygulanmış olacak.

Böylece yanlış bir rakam yazdıysanız hemen fark edersiniz.

> **Kutuyu boş bırakırsanız** hiçbir şey değişmez: program eskisi gibi satırların
> toplamını alır. Yani alışkanlığınızı bozmak zorunda değilsiniz.

Müşteri kartında bu tür satışların altında küçük bir not görürsünüz: "Bu satışın toplamı
elle girilmiş (toptan fiyat)". Böylece satır tutarları 0 görünse de kafanız karışmaz.

---

### C. Tahsilat (Ödeme) Girme

Müşteri ödeme yapmışsa:

**1. Tahsilat Ekle sekmesine tıklayın** (sol menüden — veya Yeni Satış'tan doğrudan gelmiş olabilirsiniz)

**2. Müşteri adı yazıp seçin**
   - Müşteri yazınca onun **açık satışları** aşağıda listelenecek (henüz bakiye kalmış satışlar)
   - Hangisine ödeme yapılacağını tıklayarak seçin

**3. Ödeme bilgilerini girin:**
   - **Tutar:** Kaç lira ödedi? (örn: `500`)
   - **Tarih:** Ödeme ne zaman yapıldı? (Varsayılan: bugün; değiştirme ihtiyacınız yoksa boş bırakın)
   - **Ödeme Şekli:** Nakit / Kart / Havale (Seçin)
   - **Not:** (opsiyonel, örn: "peşinat" veya "kalan yarısı")

**4. Kaydet butonuna tıklayın**

Ekran otomatik mesaj gösterecek:
```
Tahsilat kaydedildi. Kalan bakiye: 2.500,00 ₺
```

Müşterinin toplam bakiyesi anında güncellenir.

---

### D. Eski Defterin Devri (Başlangıçta ~1000 kayıt) — HIZLI GIRIŞ

Başlangıçta eski defterdeki müşterilerin borçlarını aktarmanız gerekecek. **Bu iş hızlı olmalı** — 1000 kayıt 2-3 saatte girilecek.

**Devir ekranı nedir?**
- Normal satışta perde ölçülerini tek tek girersiniz; devir kaydında ise sadece **müşteri adı + borç tutarı** yeterlidir.
- Örn: Ayşe Hanım eski defterde 5.000 ₺ borçlu → `devir` kaydı açıyorsunuz, `5.000 ₺` yazıyorsunuz, kaydediliyor.

**Adımlar:**

**1. Kontrol Paneli ekranında "Devir Girişi" butonuna tıklayın**
   - (veya sol menüdeki Yeni Satış → "Devir" sekmesi)

**2. Müşteri ara kutusu — yazın ve Enter basın**
   ```
   Örn: "Ayşe Hanım"
   ```
   Müşteri listeden seçilecek.

   **Eğer müşteri defterde yoksa:**
   - Arama kutusunda yazıyken "Yeni Müşteri Ekle" yazısı çıkacak, tıklayın.
   - Ad-Soyad ve telefon hızlı girin, kaydettirin.
   - Otomatik olarak seçilecek, devam edin.

**3. Eski Defter Borç Tutarı yazın**
   - Eski defterdeki borç ne kadarsa (örn: `5000`) yazın.
   - Program otomatik `5.000,00 ₺` biçimine çevirecek.

**4. Tarih** (opsiyonel)
   - Varsayılan: bugün
   - Eski defter kaydıysa, deftere aktarma tarihini yazabilirsiniz (örn: 01.01.2026)

**5. Not** (opsiyonel)
   - Örn: "Eski defter devrinden" yazarsanız, sonra kontrol etmesi kolaylaşır

**6. "Kaydet ve Yeni Ekle" butonuna tıklayın**
   - ⭐ İmportant: Form temizlenir, ekran DEĞİŞMEZ.
   - İmleç doğrudan müşteri arama kutusuna geri döner.
   - Hemen bir sonraki devir kaydını girebilirsiniz — fare toplamaksızın klavyeyle.

**7. Üstte sayaç görürsünüz:**
   ```
   Bu oturumda: 45 kayıt / toplam 225.000,00 ₺
   ```

**Hız İpuçları:**
- Tüm alanlar Tab tuşu ile dolaşılır (mouse gerekli değil).
- Müşteri adının ilk harfini yazıp Ok tuşları ile listede dolaşıp Enter basın.
- Tutar yazıp Enter → otomatik kaydediliyor.

---

### E. Müşteri Arama ve Kontrol

Bir müşteri hakkında hızlı bilgi almanız gerekirse:

**1. Müşteriler sekmesine tıklayın**

**2. En üstteki **Arama Kutusu**'nda adı (veya telefonu) yazın**
   - Otomatik filtreleme — yazarken liste güncelleniyor
   - Sağında durum rozeti görünür:
     - **Borçlu** (pembe/kırmızı): Para borç var
     - **Geciken** (kırmızı): 30+ gündür ödeme yapmamış
     - **Temiz** (yeşil): Bakiye 0

**3. Müşteri satırını tıklayın → Müşteri Kartı açılır**

---

### F. Müşteri Kartı (Detay Görüntülemek)

Müşterinin tüm satış geçmişini görmek istiyorsanız:

**1. Müşteriler'den müşteri seçin veya Kontrol Paneli'nin Kırmızı Listesi'nden tıklayın**
   - **Müşteri Kartı** ekranı açılır

**2. Üstte müşteri bilgileri ve BÜYÜK bir rakam:**
   ```
   TOPLAM KALAN BAKIYE: 12.500,00 ₺
   ```

**3. Altında Satış Listesi tablosu:**
   - Tarih, Açıklama, Toplam, Ödenen, Kalan, Durum
   - `"Devir (eski defter)"` etiketli satırlar devir kayıtlarıdır

**4. Bir satışı açmak isterseniz:**
   - Satır üzerine tıklayın
   - Perde kalemlerini (ölçüler) ve tahsilat geçmişini görebilirsiniz

**5. Hızlı işlemler (sağ üstte):**
   - **Yeni Satış:** Bu müşteri için yeni perde ölçüsü girin
   - **Tahsilat Ekle:** Ödeme kaydı ekleyin
   - **Ekstre Yazdır:** Müşteriye verebileceğiniz temiz bir çıktı (detaylı bakiye hareketleri)

---

### F2. Yanlış Girilen Bir Satışı Düzeltme (Satışı Düzenle)

Rakamı yanlış yazdınız, ölçüyü hatalı girdiniz veya tarihi karıştırdınız mı? Satışı
**silip yeniden girmenize gerek yok** — düzeltebilirsiniz.

> Bu işlemi **yalnızca Dükkan Sahibi** yapabilir. Çalışan hesabında "Düzenle" butonu
> hiç görünmez.

**1. Müşteri Kartı'nda ilgili satış satırına tıklayın** (satır açılır)

**2. Açılan bölümün altındaki "Düzenle" butonuna basın**
   - **Satışı Düzenle** ekranı açılır ve **tüm alanlar dolu gelir** — kayıtta ne varsa o.

**3. Neyi değiştirebilirsiniz:**
   - **Tarih** (takvimden seçilir)
   - **Açıklama**
   - **Perde kalemleri:** oda, model/kumaş, en, boy, adet, **tutar** — satırın sağındaki
     **×** ile bir satırı silebilir, **"+ Kalem Ekle"** ile yeni satır ekleyebilirsiniz
   - Kayıt bir **devir (eski defter)** kaydıysa kalem tablosu yerine tek bir
     **"Devir Tutarı"** kutusu çıkar

**4. "Yeni Toplam" rakamı siz yazdıkça anında güncellenir.**

**5. "Değişiklikleri Kaydet" deyince müşteri kartına dönersiniz, bakiye yeni tutara göre yenilenir.**

**Bilmeniz gereken iki şey:**
- **Tahsilatlar bu ekrandan DEĞİŞMEZ.** Daha önce alınan ödemeler olduğu gibi durur.
  Ekranda "Bu satışa şimdiye kadar 1.000,00 ₺ tahsilat girilmiş" diye hatırlatılır.
  Yanlış girilmiş bir tahsilatı silmek isterseniz, Müşteri Kartı'ndaki tahsilat
  satırının yanındaki çöp kutusu ikonunu kullanın.
- **Yeni toplamı alınan ödemenin altına düşürürseniz** program turuncu bir uyarı gösterir
  ("fazla ödenmiş görünecek"). Kaydetmenizi engellemez — ama rakamı bir kez daha kontrol edin.

---

### G. Raporlar

Program dört farklı rapor üretir — hepsi **yazdırılabilir** ve **Excel'e aktarılabilir**:

**1. Raporlar sekmesine tıklayın**
   - 4 sekme görünecek: Açık Bakiye / Kasa / Geciken / Müşteri Ekstresi

#### **1.1. Açık Bakiye Raporu**
Şu an kim ne kadar borçlu?
- Tablosu: Müşteri Adı, Toplam Borç, Ödenen, Kalan Bakiye
- Büyük borçlular üstte

#### **1.2. Tahsilat Raporu (Kasa)**
Seçilen tarih aralığında ne kadar tahsilat aldınız?
- Tarih aralığı seçin (örn: 01.07.2026 - 31.07.2026)
- Tüm tahsilatlar listelenecek
- Altta toplam + ödeme şekkine göre kırılım (Nakit X lira, Kart Y lira vb.)

#### **1.3. Geciken Hesaplar Raporu**
30+ gündür ödeme yapmayan borçlular
- Müşteri Adı, Telefon, Kalan Bakiye, Son Ödeme Tarihi, Kaç gün geçti

#### **1.4. Müşteri Ekstresi**
Bir müşterinin satır-satır bakiye hareketleri
- Müşteri seçin
- Tarih aralığı filtreleyin (opsiyonel)
- Kağıda yazılmış defter gibi görünür: Tarih, Ne Yapıldı, Giriş (satış), Çıkış (tahsilat), Bakiye
- Müşteriye verebileceğiniz temiz bir çıktı

**Yazdırma / Dosya Aktarma:**

Her raporun üstünde bir araç çubuğu vardır:

| Buton | Ne yapar |
|---|---|
| **Tarih aralığı** | Raporu iki tarih arasına daraltır |
| **Kağıt: A4 / A3** | ⭐ **Yeni.** Çıktının kağıt boyutunu seçer |
| **🖨️ Yazdır** | Yazıcıdan kağıda basar |
| **📋 CSV** | Excel'de açılabilen sade tablo dosyası |
| **📊 Excel** | Doğrudan Excel dosyası (`.xlsx`) |

#### ⭐ A4 / A3 kağıt seçimi

Sütunu bol raporlar (özellikle **Açık Bakiye** ve **Müşteri Ekstresi**) A4'e sığmayıp kenardan kesilebiliyordu. Artık yazdırmadan önce **A3**'ü seçerseniz çıktı geniş kağıda göre düzenlenir.

- Varsayılan **A4**'tür — normal işlerde değiştirmenize gerek yok.
- A3 seçtiğinizde yazıcının kağıt tepsisinde de A3 kağıt olmalı; yoksa yazıcı küçültüp basar.

#### ⭐ Çıktıların üstünde dükkan logonuz

Ayarlar'dan bir logo yüklerseniz (aşağıda **H** bölümü), **yazdırılan tüm raporların ve müşteri ekstrelerinin** üst köşesinde dükkan adınızla birlikte logonuz görünür. Müşteriye verdiğiniz ekstre böylece dükkanın antetli kağıdı gibi çıkar.

---

### H. Ayarlar — Dükkan Adı ve Logo

> Bu ekranı **yalnızca dükkan sahibi** görebilir.

**1. Ayarlar sekmesine tıklayın** (sol menüden)

**Dükkan Adı kartı:** Buraya yazdığınız isim (örn: "Yılmaz Perde") programın üst köşesinde ve **tüm yazdırılan raporların başlığında** görünür.

**Logo kartı** ⭐:
1. **"Logo Yükle"** butonuna tıklayın.
2. Bilgisayarınızdan bir resim dosyası seçin (`.png`, `.jpg` — en fazla **2 MB**).
3. Logo hemen ekranda görünür ve bundan sonraki tüm çıktılara eklenir.
4. Beğenmezseniz **"Logoyu Kaldır"** ile silebilirsiniz; program logosuz haline döner.

> **İpucu:** Beyaz zeminli, kare veya yatay bir logo kağıtta en iyi görünür. Logo dosyası da veritabanının içinde saklanır — yani yedek aldığınızda logo da yedeğe dahil olur.

---

## Kullanıcılar ve Roller

### Sahip (Dükkan Sahibi)
**Yapabilir:** Her şey.
- Müşteri ekle / düzenle / sil
- Satış ekle / düzenle / sil (düzenleme: Müşteri Kartı → satışa tıkla → **Düzenle**, bkz. **F2** bölümü)
- Tahsilat ekle / sil (yanlış girilen tahsilat silinir, doğrusu yeniden girilir)
- Raporlar, yazdırma, Excel'e aktarma
- Yedek alma **ve yedekten geri yükleme**
- Ayarlar (dükkan adı, logo, kullanıcı ekleme/şifre sıfırlama)

### Çalışan
**Yapabilir:**
- Müşteri ekleme, yeni satış, tahsilat, devir kaydı
- Raporları görüntüleme ve yazdırma (değiştiremez)
- **USB'ye yedek alma** — Kontrol Paneli'ndeki sarı şeritten ya da açılıştaki hatırlatma penceresinden (yedek almak veriyi bozmadığı için bilerek herkese açık bırakıldı)

**Yapamaz:** Kayıt **silme**, kayıt **düzenleme** (müşteri bilgisi/satış değiştirme), **yedekten geri yükleme**, Ayarlar ekranı (dükkan adı, logo, kullanıcı yönetimi).

> Mantık şu: çalışan **yeni kayıt girebilir**, ama girilmiş bir kaydı **değiştiremez veya silemez**. Bir hata olursa dükkan sahibi düzeltir — böylece defter kimsenin sessizce silemeyeceği bir kayıt olur.

### Şifremi Unuttum
- **Çalışansanız:** Dükkan sahibine söyleyin. Sahip, Ayarlar → Kullanıcılar'dan şifrenizi saniyeler içinde sıfırlar.
- **Dükkan sahibiyseniz:** Şifrenizi sıfırlayabilecek tek kişi yine bir "Dükkan Sahibi" hesabıdır. Tek sahip hesabı varsa ve şifresi unutulursa program açılamaz.

> ⚠️ **Bunu bugün yapın — 2 dakikalık sigorta:** Ayarlar → Kullanıcılar → "Yeni Kullanıcı" ile **ikinci bir "Dükkan Sahibi" hesabı** açın (örn. eşinize/ortağınıza ait). Şifrelerden biri unutulursa, diğeriyle girip sıfırlarsınız. Ayrıca ilk şifreyi bir kağıda yazıp kasada saklamakta fayda var.

---

## YEDEKLEME — EN ÖNEMLİ BÖLÜM ⚠️

**Bu bölümü okumazsanız, bir gün tüm verileri kaybetme riski vardır.**

Tüm müşteri, satış ve ödeme kayıtları tek bir bilgisayarda duruyor. Bilgisayar çalınabilir, format atılabilir, sürücü bozulabilir. **Yedekleme** veriyi güvende tutar.

### Otomatik Yedek (Her Gün, Otomatik)
Program günlük yedeği **iki fırsatta** alır — hiçbirini sizin yapmanız gerekmez:

1. **Her akşam 23.55'te** (program o saatte açıksa) — günün tüm işi yedeğe girmiş olur.
2. **Her program açılışında** — bilgisayar gece kapalıydıysa 23.55'i kaçırır; ertesi sabah program açılınca yedek yine alınır. Yani bilgisayarı akşam kapatsanız da her gün yedeğiniz olur.

- Dosyalar: defter dosyasının **tarihli kopyaları** (örn: `yedek_2026-07-14.db`)
- **Bilgisayarda en fazla 5 yedek durur**; yenisi geldikçe en eskisi otomatik silinir. Yani her zaman son 5 çalışma gününüz elinizin altında olur, disk de gereksiz şişmez.
- **Nerede duruyor?** Windows'ta dosya gezgininin adres çubuğuna `%APPDATA%\veresiye\yedekler` yazıp Enter'a basarsanız klasörü görürsünüz. Bu, açık adresiyle şuraya denk gelir:
  `C:\Users\<KullanıcıAdı>\AppData\Roaming\veresiye\yedekler`
  (Defterin kendisi de aynı klasörde: `veresiye.db`. Bu klasörü elle karıştırmanıza gerek yok — bilmeniz yeterli.)

**İyi haber:** Sizin hiçbir şey yapmanıza gerek yok, otomatik çalışıyor.

#### İstediğiniz An Elle Yedek — "Bilgisayara Yedek Al"

Akşam 23.55'i beklemek istemiyorsanız (ya da o saatte bilgisayar başında olmayacaksanız),
yedeği kendiniz de aldırabilirsiniz:

**Ayarlar → Yedekleme → "Bilgisayara Yedek Al"**

Tek tıklama; klasör falan sormaz, otomatik yedeğin gittiği yere aynı şekilde kaydeder ve
"Yedek alındı" yazısını gösterir. Ne zaman işinize gelirse basabilirsiniz — özellikle **çok
sayıda kayıt girmeden önce** bir kez basmak iyi bir alışkanlıktır.

> Aynı gün içinde birkaç kez basarsanız o günün yedeği en son haliyle güncellenir; klasör
> gereksiz dosyayla dolmaz.

**⚠️ Ama yetmez:** Bu yedekler **aynı bilgisayarın içinde** duruyor. Bilgisayar çalınır ya da diski bozulursa, yedekler de gider. Asıl güvence bir alttaki **USB yedeğidir.**

### Harici Yedek (USB Belleğe) — HAFTADA BİR YAPIN

**⚠️ MUTLAKA yapın — bu en güvenli yedektir.**

**1. Ayarlar sekmesine tıklayın** (sol menüden)

**2. "Yedekleme" kartını bulun**

**3. "Yedek Al" butonuna tıklayın**
   - Bilgisayar **klasör seçme penceresi** açacak
   - USB bellek takın (varsa)
   - USB'yi tıklayıp "Seç" deyin
   - (veya bilgisayarın herhangi bir klasörü, örn: Masaüstü)

**4. Program mesaj gösterecek:**
   ```
   Yedek alındı: 14.07.2026
   ```

**5. Yedeğin gerçekten oluştuğunu gözünüzle kontrol edin**
   - USB'yi açtığınızda `veresiye_yedek_2026-07-14.db` isimli bir dosya görmelisiniz
   - USB'yi bilgisayardan **ayrı** bir yerde saklayın (kasada, evde, arabada) — bilgisayarın yanında duran yedek, yangında/hırsızlıkta beraber gider

### Yedekten Geri Yükleme (İmdat Anı)

Bilgisayar bozulduysa veya veri silindiyse:

**1. Ayarlar'da "Yedekten Geri Yükle" butonuna tıklayın**

**2. Dosya seçme penceresi açılacak**
   - Daha önce aldığınız yedek dosyasını (`.db` uzantılı) bulup seçin
   - **USB'deki yedek** için: soldan USB sürücüsünü seçin, `veresiye_yedek_*.db` dosyasını tıklayın
   - **Bilgisayardaki otomatik yedek** için: pencerenin adres çubuğuna `%APPDATA%\veresiye\yedekler` yazıp Enter'a basın, oradan `yedek_*.db` dosyalarından birini seçin
   - Yanlış/bozuk bir dosya seçerseniz program **hemen uyarır** ve hiçbir şeye dokunmaz

**3. ⛔ BÜYÜK UYARI çıkacak:**
   ```
   DİKKAT! Seçilen dosyadan geri yükleme yapılacak.
   Sonraki tüm veriler SİLİNECEK.
   
   Yedek dosyası: veresiye_yedek_2026-07-01.db
   
   Emin misiniz? (EVET / HAYIR)
   ```

**4. Onaylarsanız:**
   - Program **önce mevcut halin güvenlik yedeğini** alır (`geri_yukleme_oncesi_*.db`) — yani yanlışlıkla geri yüklerseniz bile eski haline dönme şansınız kalır
   - Seçilen yedek dosyası yerine konur
   - Ekran kendini yeniler ve karşınıza **yedekteki tarihe ait veriler** gelir
   - Bu işlem **geri alınamaz**: o tarihten sonra girilen satış ve tahsilatlar görünmez olur. Bu yüzden ancak gerçekten veri kaybı yaşadığınızda kullanın.

### Program Sizi İki Şekilde Uyarır

#### 1. ⭐ Açılışta Hatırlatma Penceresi

Programa girdiğinizde ekranın ortasında şöyle bir pencere çıkabilir:

```
⚠️ Yedek almanız önerilir

Son USB yedeğiniz 12 gün önce (20.07.2026) alındı.
Verilerinizin kaybolmaması için USB belleğe yedek
almanız önerilir.

        [ Şimdi Değil ]   [ USB'ye Yedek Al ]
```

- **"USB'ye Yedek Al"** derseniz klasör seçme penceresi açılır — USB'yi seçin, yedek alınır, pencere kapanır.
- **"Şimdi Değil"** derseniz pencere kapanır, işinize devam edersiniz.
- Bu pencere **her açılışta değil**, yalnızca son USB yedeğinizin üzerinden **7 gün veya daha fazla** geçtiyse (ya da hiç yedek almadıysanız) çıkar.
- **Neden eklendi:** Sarı şerit ekranın üstünde durup gözden kaçabiliyordu. Bu pencere yolu kapatır — görmezden gelinmesi zordur. Yedeklemenin unutulması bu projedeki en büyük risktir.

#### 2. Sarı Uyarı Şeridi

Kontrol Paneli'nin üstünde sarı bir şerit görürsünüz:

```
⚠️ Uzun süredir yedek almadınız.
   USB belleğe yedek almanız önerilir.          [ Yedek Al ]
```

Bu şerit de **son 7 gündür USB yedek almadığınızda** çıkar ve üstündeki "Yedek Al" butonuyla tek tıkla yedek alabilirsiniz. Yedeği aldığınız anda hem şerit hem açılış penceresi kaybolur.

---

## Sık Sorular ve Çözümleri

### S: Program açılmıyor
**Çözüm:**
1. Masaüstündeki **Veresiye** simgesine çift tıklayın ve 5-10 saniye bekleyin (ilk açılış biraz uzun sürebilir)
2. Hâlâ açılmadıysa bilgisayarı yeniden başlatıp tekrar deneyin
3. Yine açılmıyorsa programı kaldırıp kurulum dosyasından yeniden kurun — **veriniz silinmez**, defter dosyası programdan ayrı bir klasörde durur

### S: Şifre yanlış, giriş yapamıyorum
**Çözüm:**
1. Dükkan sahibisiyseniz veya başka bir dükkan sahibine erişebiliyorsanız: Ayarlar → Kullanıcılar → şifresini sıfırla
2. Çalışansanız: Dükkan sahibinden yardım isteyin

### S: Müşteri kaydı sildim, geri getirmek istiyorum
**Çözüm:**
1. Sil işleminden hemen sonra yapıyorsanız: dükkan sahibi, Kontrol Paneli'ndeki bir önceki otomatik yedeği kullanabilir (Ayarlar → Yedekten Geri Yükle)
2. Müşteri verisini yeniden girmek gerekebilir

### S: Para rakamları yanlış mı gözüküyor?
**Program para tutarını otomatik biçimlendiriyor:**
- Giriş: `12500` yazarsanız
- Ekran: `12.500,00 ₺` gösterir

Bu normal ve doğru. Bilgisayar 12.500,00 lira (oniki bin beş yüz) anlamını yapıyor.

### S: Yazıcı bağlı, rapor yazdıramıyorum
**Çözüm:**
1. Yazıcı bilgisayara bağlı mı, açık mı?
2. Rapor ekranı'nda **Yazdır** butonuna tıklayın
3. Yazıcı listesinde doğru yazıcı seçili mi? Seçin ve yazdırın

### S: Excel dosyası açamıyorum veya içi boş gözüküyor
**Çözüm:**
1. Raporun üstündeki **Excel** butonuna tıklayın
2. "Farklı Kaydet" penceresi açılır — dosyayı nereye kaydedeceğinizi seçin (örn. Masaüstü) ve **Kaydet** deyin
3. Kaydettiğiniz yerden dosyaya çift tıklayıp Excel ile açın — içi dolu olmalı (müşteriler, satışlar, bakiyeler)

### S: Devir kaydı giriyorum, çok yavaş gidiyor
**İpucu:**
- Yazdığınız müşteri ismi yanlışsa, "Yeni Müşteri Ekle" yazısı çıkacak — tıklayıp hızlı ekleyin
- Ok tuşları ve Enter kullanarak fare kullanmayın — daha hızlı

### S: Eğer eski defterde müşterinin telefonu yoksa?
**Çözüm:** Devir sırasında telefon boş bırakın. Daha sonra, müşteri geldiğinde, Müşteri Kartı'nda düzenle tuşu ile eklemeyi seçebilir sahibi.

### S: "Peşinat aldınız mı?" sorusu neden çıkıyor?
**Açıklama:** Satış kaydettikten sonra, çoğunlukla müşteri peşinat verir. Program direkt tahsilat ekranına gitmeyi teklif ediyor (hız için). Hayır derseniz, daha sonra Tahsilat Ekle'den ekleyebilirsiniz.

---

## Terimler Sözlüğü (Teknik Olmayan Açıklamalar)

| Terim | Ne Demek? | Günlük Örnek |
|-------|-----------|-------------|
| **Bakiye** | Müşterinin o an borç ettiği para miktarı | Ayşe 5.000 lira mal aldı, 2.000 ödedi → bakiye 3.000 |
| **Cari Hesap** | Müşteri ile alacak-veresiye ilişkisi | "Ayşe'nin cari hesabı açık" = Ayşe'ye veresiye satış var |
| **Tahsilat** | Müşteriden alınan ödeme | Müşteri geldi, 1.000 ödedi → tahsilat kaydı açtınız |
| **Devir** | Eski defterdeki borçların sisteme aktarılması | Eski defterde kaydedilen borçları bilgisayara devir ettiniz |
| **Perde Kalemi** | Bir satıştaki tek perde satırı (oda, kumaş, ölçü ve **tutar**) | Salon için 150×210 cm fon perdesi, 3.000 ₺ = 1 kalem |
| **Açılış Bakiyesi** | Yeni müşteri eklerken girilen, eski defterden gelen borç | Ayşe Hanım kaydedilirken 3.500 ₺ yazılır → borcuyla birlikte açılır |
| **Satış Durumu** | Satışın açık mı, kapalı mı olduğu | Açık = henüz borç var; Kapalı = ödenmiş |
| **Gecikme** | 30+ gün boyunca ödeme yapmayan müşteri | Müşteri 15 Mayıs'ta ödedi, şu 20 Temmuz → 66 gün geçmiş = geciken |
| **Kırmızı Liste** | Geciken müşterilerin listesi | Dükkan sahibi bu listeyi görüp kim arayacağını bilebilir |
| **Ödeme Şekli** | Nasıl ödedi? | Nakit (parça para), Kart (kredi kartı), Havale (banka) |
| **Ekstre** | Müşterinin satır-satır borç-ödeme geçmişi | Müşteriye "işte sizin 6 aylık kaydınız" diye verebileceğiniz temiz çıktı |
| **Yedek** | Veritabanının kopyası (güvenlik için) | Bilgisayar bozulursa, yedeğin kopyasından veri geri gelir |
| **Yedekleme** | Veri kopyasını almak | Haftada bir USB belleğe yedek aldınız = yedekleme yaptınız |

---

## Güvenlik Önerisi (Opsiyonel ama Önemli)

**Bilgisayarını kilitlemek istesem?**

Windows sürümünüzde **BitLocker** adlı bir disk şifreleme aracı var. Şifre koymaksızın tüm sürücüyü şifreler; başka biri bilgisayarı çalıp açmaya çalışsa, veri kriptik görünür.

- **Kapalı konumu:** Ayarlar → Sistem → Şifreleme (BitLocker) → Aç
- **Basit:** Tıkla, bekle, bitti.

Eğer bilgisayarı kaybedersen, verilerin güvenli kalır.

---

## Son Noktalar

### İnternet Gerekli Mi?
**Hayır.** Program internetsiz tamamen çalışır. Yazılım, raporlar, yedekleme — hepsi sadece bilgisayarınızda.

### Eski Defterdeki Kayıtlar Nasıl Aktarılır?
**Devir Girişi** sekmesinden (Bölüm D). Müşteri adı + borç tutarı yeterli. 1000 kayıt ~2-3 saatte girilir.

### İkinci Bilgisayara Taşıyabilir Miyim?
**Şimdilik: Hayır.** Bu versiyon tek bilgisayar için tasarlandı. İleride ağ sürümü yapılabilir.

### Verilerimi Başka Bir Yerde Kullanabilir Miyim?
Evet. Her raporu **Excel** veya **CSV** olarak dışa aktarabilirsiniz (Raporlar → araç çubuğu). Ayrıca USB'deki yedek dosyası (`veresiye_yedek_*.db`) verinin tamamının kopyasıdır; ileride başka bir programa aktarmak gerekirse bu dosya yeterlidir.

---

## Rehberi Güncel Tutmak

Program güncellenerek yeni özellikler eklenirse, bu rehber de güncellenir.
**Program sürümü:** v1.0.0 · **Son güncelleme:** 22 Ağustos 2026.

İşte bu kadar. Artık defter kadar basit, hızlı bir sistem var. Sorularınız olursa, bu rehberi tekrar okuyunuz — çoğu cevap burada.

**Başarılar!** 🎯
