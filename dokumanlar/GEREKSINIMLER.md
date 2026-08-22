# Perde Satış ve Cari Hesap Takip Uygulaması — Teknik Şartname v2

## 1. Amaç ve Bağlam

Bir **perde dükkanı** için satış, perde ölçüsü ve **cari hesap (açık hesap) takibi** yapan bir web uygulaması. Şu an dükkandaki tüm kayıtlar **kağıt defterde** tutuluyor; bu uygulama defterin yerini alacak.

**Kullanıcı profili çok önemli:** Uygulamayı kullanacak kişiler teknik değil. Ömürleri boyunca defter tutmuş esnaf ve tezgahtarlar. Arayüz bu yüzden **defter kadar basit** olmalı: az buton, büyük yazı, net Türkçe. Teknik terim (kayıt/entity/senkronizasyon vb.) kullanılmayacak.

**Kritik kural:** Bu bir "sabit taksit" sistemi **DEĞİLDİR**. Müşteriler düzensiz tutarlarda, canları ne zaman isterse ödeme yapar. Sistem sabit aylık taksit beklemez. Tek formül:

> **Kalan Bakiye = Toplam Borç − Yapılan Ödemeler**

---

## 2. Kullanıcılar ve Roller

| Rol | Yetkiler |
|-----|----------|
| **Dükkan Sahibi** | Her şey: kayıt ekleme, **düzenleme**, **silme**, raporlar, yedekleme |
| **Çalışan** | **Sadece**: yeni satış/ölçü girer, tahsilat girer. Silme ve düzenleme **yapamaz**. Raporları görebilir ama değiştiremez. |

- Giriş ekranı: kullanıcı adı + şifre. Karmaşık üyelik sistemi yok, kullanıcıları Dükkan Sahibi tanımlar.
- Şifre unutulursa kilitlenme olmamalı; Dükkan Sahibi çalışan şifresini sıfırlayabilmeli.

---

## 3. Teknik Gereksinimler ve Kurulum

- **Tip:** Web uygulaması, tarayıcıda çalışır.
- **Çalışma yeri:** Dükkandaki **tek bir bilgisayar** (Windows). Makine gün boyu açık kalacak.
- **Platform:** **Windows'ta çalışacak, ancak geliştirme/test macOS'ta yapılacağı için her ikisinde de sorunsuz çalışmalı.**
- **İnternet:** Uygulama **internet olmadan** da tam çalışmalı. Hiçbir dış servise (API, lisans sunucusu, CDN, yazı tipi indirme vb.) bağımlı olmamalı. İnternet kesikken hiçbir özellik bozulmamalı.
- **Veritabanı:** **SQLite** — tek dosya, yerel. ~1000 müşteri için fazlasıyla yeterli.
- **Kurulum:** Bir kez kurulup teslim edilecek; geliştirici sonrasında sisteme müdahale etmeyecek. Bu yüzden:
  - Kurulum **tek seferlik ve basit** olmalı.
  - Uygulama, bilgisayar açıldığında veya bir kısayola çift tıklandığında çalışmalı. Kullanıcıdan terminal/komut satırı **beklenmemeli**.
  - Otomatik güncelleme, lisans kontrolü, uzaktan bağlantı gibi **bozulabilecek hiçbir mekanizma olmasın**.
- **Gelecek uyumu:** İleride bir sunucuya taşınabilir olmalı. Veritabanı erişimi tek bir katmanda toplanmalı ki SQLite → PostgreSQL geçişi kolay olsun.
- **Dil:** Arayüzün tamamı **Türkçe**.
- **Para birimi:** Türk Lirası. Format: `12.500,00 ₺` (binlik nokta, ondalık virgül).
- **Tarih formatı:** `GG.AA.YYYY` (ör. 14.07.2026).

---

## 4. Yedekleme (ZORUNLU — atlanamaz)

Bu bölüm hayati. Tüm alacak kayıtları tek bir bilgisayarda duracak ve destek verecek bir teknik kişi olmayacak.

1. **Otomatik yedek:** Uygulama her açıldığında ve günde bir kez, veritabanı dosyasının tarihli bir kopyasını `yedekler/` klasörüne alsın (ör. `yedek_2026-07-14.db`). Son **30 gün** saklansın, eskiler otomatik silinsin.
2. **"Yedek Al" butonu:** Ayarlar ekranında tek tıkla, seçilen bir klasöre (USB bellek vb.) yedek alma. Kullanıcıya net bir onay mesajı: *"Yedek alındı: 14.07.2026"*.
3. **"Yedekten Geri Yükle":** Dosya seçip geri yükleme. Öncesinde büyük bir uyarı ve onay istesin.
4. **Yedek hatırlatması:** Son 7 gündür harici yedek alınmamışsa, kontrol panelinde sarı bir uyarı şeridi: *"Uzun süredir yedek almadınız. USB belleğe yedek almanız önerilir."*
5. **Excel'e dışa aktarma:** Müşteri ve bakiye listesi CSV/Excel olarak dışa aktarılabilsin. (En kötü ihtimalde veri elde kalır.)

---

## 5. Veri Modeli

İlişkiler: Bir **Müşteri**'nin çok **Satış**'ı olur → bir **Satış**'ın çok **Perde Kalemi** ve çok **Tahsilat**'ı olur.

### 5.1. Müşteri (musteri)
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | integer | Otomatik |
| ad_soyad | metin | Zorunlu |
| telefon | metin | |
| adres | metin | |
| not | metin | Serbest not |
| kayit_tarihi | tarih | Otomatik |

### 5.2. Satış (satis)
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | integer | Otomatik |
| musteri_id | integer | Zorunlu |
| tarih | tarih | Satış tarihi |
| aciklama | metin | Örn. "Salon + yatak odası perdeleri" |
| tip | metin | `"satis"` veya `"devir"` (bkz. 5.5) |
| devir_tutari | ondalık | Yalnızca `tip = "devir"` ise dolu; eski defterden aktarılan borç |
| durum | metin | `"acik"` / `"kapandi"` — bakiye 0 olunca otomatik `kapandi` |

> Satışın toplam tutarı **ayrı bir alan değildir**; perde kalemlerinden otomatik hesaplanır. (Devir kaydında ise `devir_tutari` toplam tutardır.)

### 5.3. Perde Kalemi (perde_kalemi)
Her satır bir perde. Bir satışta **birden fazla** kalem olabilir.

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | integer | Otomatik |
| satis_id | integer | Satışa bağlı |
| oda | metin | "Salon", "Yatak Odası" vb. |
| model_kumas | metin | Model / kumaş bilgisi |
| en | ondalık | **santimetre (cm)** |
| boy | ondalık | **santimetre (cm)** |
| adet | integer | |
| birim_fiyat | ondalık | Bir adedin fiyatı |
| satir_tutari | ondalık | = birim_fiyat × adet (otomatik) |

### 5.4. Tahsilat (tahsilat)
Müşteriden alınan **her** ödeme. **Peşinat da ayrı bir alan değil, ilk tahsilat kaydıdır.**

| Alan | Tip | Açıklama |
|------|-----|----------|
| id | integer | Otomatik |
| satis_id | integer | Satışa bağlı |
| tarih | tarih | Ödeme tarihi |
| tutar | ondalık | Alınan tutar |
| odeme_sekli | metin | `nakit` / `kart` / `havale` |
| not | metin | Örn. "peşinat" |

### 5.5. Devir Bakiyesi (eski defterden aktarım)
Dükkanda **~1000 müşterinin** kaydı kağıt defterde. Bunlar **elle** girilecek. Eski müşterilerin geçmiş perde ölçülerini tek tek girmek pratik değil.

Çözüm: `tip = "devir"` olan özel bir satış kaydı.
- Kullanıcı sadece **müşteri + kalan borç tutarı + tarih + not** girer. Perde kalemi girmesi **gerekmez**.
- Bu kaydın toplam tutarı `devir_tutari` alanıdır.
- Bakiye, gecikme, rapor mantığı normal satışlarla **tamamen aynı** şekilde işler.
- Ekranlarda bu kayıt **"Devir (eski defter)"** etiketiyle görünür.

---

## 6. İş Mantığı (Uygulamanın Kalbi)

### 6.1. Bakiye
```
Satış Toplamı  = perde kalemlerinin satir_tutari toplamı
                 (devir kaydında: devir_tutari)
Ödenen         = o satışa ait tahsilatların toplamı
Kalan Bakiye   = Satış Toplamı − Ödenen
```
Müşterinin **toplam bakiyesi** = tüm açık satışlarının kalan bakiyeleri toplamı.

Bakiye **asla elle girilmez**, her zaman canlı hesaplanır.

### 6.2. Satış kapanışı
Kalan bakiye **0 veya altına** düşünce satış otomatik `"kapandi"` olur. (Fazla ödeme olursa bakiye eksi görünebilir; engellenmesin ama ekranda belirgin olsun.)

### 6.3. Gecikme kuralı (kırmızı liste)
Bir müşteri şu **iki şartı birden** sağlıyorsa "geciken" sayılır ve **kırmızı** gösterilir:
1. Kalan bakiyesi **0'dan büyük**, **VE**
2. **Son tahsilat tarihinin üzerinden 30 gün veya daha fazla** geçmiş. (Hiç ödeme yapılmamışsa satış tarihinden itibaren sayılır.)

> **SMS / WhatsApp / e-posta GÖNDERİLMEYECEK.** Sadece ekranda liste. Dükkan sahibi kendisi arayacak.

---

## 7. Arayüz Tasarımı

### 7.1. Genel prensipler
- **Defter mantığı:** Kullanıcı yıllardır defter tuttu. Ekran ona defterin dijitali gibi gelmeli.
- **Okunabilirlik:** Yaşlı gözler için büyük ve net yazı, yüksek kontrast. Gövde metni en az 16px, tablolarda rahat satır yüksekliği.
- **Az seçenek:** Ekran başına tek bir ana iş. Gereksiz buton, ikon kalabalığı, süsleme yok.
- **Para her zaman öne çıksın:** Bakiye rakamları büyük ve kalın. Borç kırmızı, ödeme yeşil.
- **Hızlı giriş:** Veriler klavyeyle hızlı girilecek. Tab ile alanlar arası geçiş akıcı olsun, Enter kaydetsin. Fare zorunlu olmasın.
- **Onay ve geri bildirim:** Her kayıttan sonra net bir mesaj (*"Tahsilat kaydedildi. Kalan bakiye: 4.500,00 ₺"*). Silme işlemlerinde mutlaka onay sorulsun.
- Masaüstü ekran öncelikli (dükkan bilgisayarı). Mobil şart değil ama daralınca bozulmasın.

### 7.2. Renk dili
| Anlam | Renk |
|-------|------|
| Borçlu / geciken | Kırmızı |
| Ödeme / kapanmış hesap | Yeşil |
| Uyarı (yedek hatırlatma vb.) | Sarı/amber |
| Nötr arayüz | Sade, sakin bir taban renk |

### 7.3. Navigasyon
Sol tarafta sabit, **5 maddelik** basit bir menü:
`Kontrol Paneli` · `Müşteriler` · `Yeni Satış` · `Raporlar` · `Ayarlar`

---

## 8. Ekranlar

### 8.1. Kontrol Paneli (açılış ekranı)
- Üstte 3 büyük kutu:
  - **Toplam Açık Alacak** (tüm müşterilerin kalan bakiye toplamı)
  - **Bu Ay Tahsil Edilen** (kasa)
  - **Geciken Müşteri Sayısı**
- Altında **Kırmızı Liste**: 30+ gündür ödemesi olmayan borçlular → *ad soyad, telefon, kalan bakiye, son ödeme tarihi, kaç gün geçti*. Satıra tıklayınca müşteri kartı açılır.
- Gerekirse üstte sarı yedek hatırlatma şeridi (bkz. 4.4).
- Sağ üstte hızlı erişim: **"Tahsilat Ekle"** ve **"Yeni Satış"** butonları.

### 8.2. Müşteri Listesi
- Büyük bir **arama kutusu** (ad veya telefon ile anlık arama) — bu ekranın en önemli öğesi.
- Tablo: ad soyad, telefon, **toplam kalan bakiye**, durum rozeti (Borçlu / Geciken / Temiz).
- Bakiyeye göre sıralanabilsin. Filtre: *Hepsi / Borçlular / Gecikenler*.
- **"Yeni Müşteri"** butonu.

### 8.3. Müşteri Kartı (detay)
- Üstte: müşteri bilgileri + **büyük puntoyla toplam kalan bakiye**.
- Satış listesi: her satır → tarih, açıklama, toplam, ödenen, kalan, durum. Devir kayıtları "Devir (eski defter)" etiketli.
- Bir satışı açınca: **perde kalemleri (ölçüler) tablosu** ve **tahsilat geçmişi**.
- Butonlar: `Yeni Satış`, `Tahsilat Ekle`, `Ekstre Yazdır`.
- Düzenle/Sil butonları **yalnızca Dükkan Sahibi'ne** görünür.

### 8.4. Yeni Satış
- Müşteri seç (aramalı) veya anında yeni müşteri oluştur.
- Açıklama alanı.
- **Perde kalemleri tablosu:** satır satır ekleme → *oda, model/kumaş, en (cm), boy (cm), adet, birim fiyat*. Her satır eklendikçe **toplam anlık güncellensin** ve ekranda büyük görünsün.
- Kaydettikten sonra: *"Peşinat aldınız mı?"* diye sorup doğrudan tahsilat ekranına yönlendirsin.

### 8.5. Devir Kaydı (eski defterden aktarım)
- Ayrı ve **çok hızlı** bir ekran — 1000 kayıt buradan girilecek.
- Alanlar: müşteri (yoksa aynı ekrandan oluştur), **kalan borç tutarı**, tarih, not.
- **Kaydet ve Yeni Ekle** butonu olsun; kaydettikten sonra imleç doğrudan bir sonraki kayda geçsin. Ekran değişmesin.
- Bu ekran hız için tasarlanmalı: sadece klavye ile arka arkaya kayıt girilebilmeli.

### 8.6. Tahsilat Ekle
- Müşteri ara → açık satışları listelensin → hangisine ödeme yapıldığını seç.
- Alanlar: tutar, tarih (varsayılan bugün), ödeme şekli, not.
- Kaydet → *"Tahsilat kaydedildi. Kalan bakiye: X ₺"* mesajı ve bakiye anında güncellensin.

### 8.7. Ayarlar
- Kullanıcılar (ekle/şifre sıfırla) — sadece Dükkan Sahibi.
- **Yedek Al** / **Yedekten Geri Yükle** / son yedek tarihi.
- Dükkan adı (ekstre çıktısında görünecek).

---

## 9. Raporlar

Ayrı bir bölüm. Tarih aralığı filtresi. Hepsi **yazdırılabilir** ve **CSV/Excel'e aktarılabilir** olmalı.

1. **Açık Bakiye Raporu** — kim ne kadar borçlu? (müşteri, toplam, ödenen, kalan) büyükten küçüğe sıralı.
2. **Tahsilat Raporu (Kasa)** — seçilen tarih aralığındaki tüm tahsilatlar + toplam, ödeme şekline göre kırılım.
3. **Geciken Hesaplar Raporu** — 30+ gündür ödemesi olmayan borçlular.
4. **Müşteri Ekstresi** — tek müşteri için satır satır cari döküm (tarih, açıklama, borç, alacak, bakiye). Dükkan adı başlıkta, müşteriye verilebilecek temiz bir çıktı.

---

## 10. Geliştirme Sırası

1. Veritabanı ve tablolar
2. Müşteri ekleme / listeleme / arama
3. Satış + perde kalemleri (ölçüler)
4. Tahsilat ve bakiye hesabı
5. **Devir kaydı ekranı** (defter aktarımı buradan başlayacak)
6. Kontrol paneli + kırmızı liste
7. Raporlar ve yazdırma
8. **Yedekleme**
9. Kullanıcı girişi ve rol yetkileri

---

## 11. Değişmez Kurallar

- Sabit taksit **yok**; ödemeler değişken tutarlı ve düzensiz.
- Bakiye **her zaman** `toplam − tahsilatlar` ile canlı hesaplanır, elle girilmez.
- Peşinat ayrı bir alan değil, ilk **tahsilat** kaydıdır.
- Bir satışta **birden fazla** perde kalemi olabilir.
- Ölçü birimi **santimetre**.
- Gecikme eşiği **30 gün ve üzeri**; sadece ekranda liste, **mesaj gönderme yok**.
- **Çalışan** silemez/düzenleyemez; sadece satış ve tahsilat ekler.
- Uygulama **internetsiz** tam çalışır; hiçbir dış servise bağımlı değildir.
- **Yedekleme atlanamaz.**
- Arayüz baştan sona **Türkçe**, tutarlar `₺` ve binlik ayraçlı, tarihler `GG.AA.YYYY`.
