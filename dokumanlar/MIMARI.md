# 🏗️ MIMARI KARARLARI — Veresiye Cari Hesap Defteri

> Bu dosya "neyi hangi teknolojiyle, neden yapıyoruz" sorusunun cevabıdır.
> Kod yazan her uzman işe başlamadan önce bunu okur. Karar değişirse burada güncellenir.
> **Durum: ÖNERİ — CEO mimari onayı bekliyor (bkz. PROJE_DURUMU.md Bölüm 8).**

---

## 0. Tek Cümlelik Karar

> **Uygulama, bir Windows bilgisayarına çift tıkla kurulan, internetsiz çalışan, tek bir SQLite dosyasına yazan bir masaüstü programı olacak; teknoloji olarak Electron + React + better-sqlite3 seçildi.**

**CEO'ya benzetme:** Bu programı bir "web sitesi" gibi değil, tıpkı Word ya da hesap makinesi gibi bilgisayara kurulan, açıp kapatılan bir program gibi düşün. İnternet olmasa da, elektrik varken çalışır. Tüm defter tek bir dosyada durur; o dosyayı USB belleğe kopyalamak = defterin fotokopisini kasaya koymak.

---

## 1. Kısıtlar (Şartname bize neyi dayatıyor?)

Şartname (Bölüm 3 ve 11) mimariyi neredeyse tek seçeneğe indiriyor:

| # | Kısıt | Sonucu |
|---|---|---|
| 1 | **İnternetsiz tam çalışma** — hiçbir dış servise (CDN, API, lisans, font indirme) bağımlı olamaz | Bulut mimarisi (Supabase/Vercel) **elenir**; her şey bilgisayarda gömülü olmalı |
| 2 | **Tek Windows bilgisayarı**, gün boyu açık | Sunucu kiralamaya, çok kullanıcılı eşzamanlılığa gerek yok |
| 3 | **SQLite tek dosya**, yerel | Gömülü, kurulum gerektirmeyen veritabanı; dosya = tüm veri |
| 4 | **Çift tıkla açılır, terminal istenmez** | Kullanıcıya `.exe` / masaüstü kısayolu; komut satırı yasak |
| 5 | **Tek seferlik basit kurulum**, sonra müdahale yok | Kurulum sihirbazı (.exe), otomatik güncelleme/lisans **YOK** (bozulabilecek mekanizma istenmiyor) |
| 6 | **Gelecekte sunucuya taşınabilir** olmalı; DB erişimi tek katmanda | Tüm SQL tek bir "veri erişim katmanı"nda toplanır → ileride PostgreSQL'e geçiş kolay |
| 7 | Geliştirme **macOS**, teslim **Windows** | Aynı kodun iki işletim sisteminde de çalışması gerekir |
| 8 | Arayüz tamamen **Türkçe**, para `12.500,00 ₺`, tarih `GG.AA.YYYY` | Biçimlendirme tek bir yardımcı katmanda toplanır |

**Not:** Onaylı tasarım dosyası (`tasarim/Perde Takip.dc.html`) zaten **React** tabanlı bir bileşen olarak yazılmış. Yani arayüzün "beyni" hâlihazırda React ile kurgulanmış; bu, aşağıdaki teknoloji seçimiyle birebir örtüşüyor (tasarımı yeniden kurgulamak gerekmeyecek, taşınacak).

---

## 2. Seçenekler ve Karşılaştırma

İnternetsiz masaüstü için üç gerçekçi yol değerlendirildi:

| Ölçüt | **A) Electron** ✅ | B) Tauri | C) Yerel Node sunucu + tarayıcı |
|---|---|---|---|
| Dil | JS/TS (ekibin dili) | JS/TS **+ Rust** (çekirdek Rust) | JS/TS |
| Popülerlik / dokümantasyon | En yüksek, olgun | Yükseliyor ama daha genç | Orta |
| Çift tıkla `.exe` | ✅ (electron-builder) | ✅ ama Rust zinciri gerekir | ⚠️ kısayol server'ı başlatır, tarayıcı açar |
| Gömülü SQLite | ✅ better-sqlite3 (JS) | Rust tarafı/eklenti ile | ✅ better-sqlite3 |
| "Tek program" hissi | ✅ tek pencere, native | ✅ native | ❌ iki parça (server + tarayıcı sekmesi) |
| İnternetsiz garanti | ✅ her şey gömülü | ✅ ama WebView2 çalışma zamanı | ✅ ama tarayıcıya bağımlı |
| Yazdırma / dosya kaydetme (yedek, Excel) | ✅ native diyaloglar | ✅ ama Rust köprüsü | ⚠️ tarayıcı kısıtları |
| Ekibe uygunluk (JS/TS) | ✅ **tam** | ❌ Rust öğrenme yükü | ✅ |
| Kırılganlık | Düşük (tek süreç) | Orta (Rust + WebView2) | **Yüksek** (server kapanırsa bozulur) |
| Bedeli | **Ücretsiz / açık kaynak** | Ücretsiz | Ücretsiz |

**Neden Tauri değil?** Daha küçük dosya boyutu güzel ama çekirdeği **Rust**; şartname "en basit, en popüler, en iyi dokümante, **JS/TS ekibine uygun**" diyor. Rust öğrenme/bakım yükü ve Windows'ta WebView2 çalışma zamanı bağımlılığı, bu proje için gereksiz risk. Tek dükkan bilgisayarında dosya boyutu/RAM sorun değil.

**Neden "sunucu + tarayıcı" değil?** İki hareketli parça (arka planda çalışan sunucu + ayrı tarayıcı sekmesi) demek. Kullanıcı tarayıcıyı kapatınca ya da yanlış sekmeyi açınca kafa karışır; "bozulabilecek mekanizma istemiyoruz" kuralına aykırı.

---

## 3. KARAR — Electron (Karar Kaydı)

**Seçim: Electron + React + TypeScript + better-sqlite3, electron-builder ile Windows `.exe`.**

**Neden (tek cümle):** Çift tıkla açılan, internetsiz çalışan, gömülü SQLite'lı bir Windows programını, ekibin zaten bildiği JS/TS ile, Rust'sız ve ayrı sunucu/tarayıcı olmadan paketlemenin **en popüler ve en iyi dokümante** yolu Electron olduğu için.

**CEO'ya benzetme:** Electron, "hazır bir kutu" gibidir; içine bizim programı koyup kapağını kapatınca, o kutu her Windows bilgisayarında aynı şekilde açılır — ekstra hiçbir şey kurmaya gerek kalmadan.

---

## 4. Teknoloji Yığını (hepsi ücretsiz / açık kaynak — sıfır aylık maliyet)

| Katman | Araç | Ne işe yarar (benzetme) | Neden bu |
|---|---|---|---|
| Kabuk | **Electron** | Programın "penceresi ve gövdesi" | En olgun, en popüler masaüstü JS çatısı |
| Arayüz | **React + TypeScript** | Kullanıcının gördüğü ekranlar | Tasarım zaten React; TS = yazım hatalarını erken yakalar |
| Geliştirme/derleme | **Vite** | Kodu hızlıca çalıştıran/paketleyen "mutfak" | Hızlı, standart, iyi dokümante |
| Stil | **Tailwind + tasarım token'ları (CSS değişkenleri)** | Renk/font/boşluk kuralları | Tasarım token'ları (`--primary` vb.) hazır; offline **self-host** font/ikon |
| Veritabanı | **better-sqlite3** | Defterin kendisi — tek dosya | Gömülü, senkron, hızlı; Electron'un standart SQLite yolu |
| Veri erişim katmanı | **Tek "repository" katmanı** (düz SQL) | Deftere yazan/okuyan tek kapı | İleride PostgreSQL'e geçişi tek yerden yapmak için |
| Paketleme | **electron-builder** | Programı `.exe` kurulum dosyasına çeviren "ambalajlama" | Windows NSIS kurulumu, kısayol, standart |
| Excel/CSV | **CSV (yerleşik)** + gerek/istenirse **exceljs** (gömülü) | Rapor dışa aktarma | CSV Excel'de açılır; gerçek `.xlsx` istenirse exceljs eklenir, ikisi de offline |
| Şifre güvenliği | **bcrypt/argon2 (yerel)** | Şifreyi okunamaz hale getirir | Yerel giriş için; şifre asla düz metin saklanmaz |

**Kritik offline kuralı:** Tasarım prototipi fontları (Cabinet Grotesk, IBM Plex) ve Phosphor ikonlarını web'den çekiyor. **Üretimde bunlar programın içine gömülecek (self-host);** hiçbir CDN/internet bağlantısı kalmayacak. Bu, Faz 0'ın bitti ölçütüne dahildir.

---

## 5. Program Nasıl Çalışır? (Süreç Mimarisi)

Electron iki bölümden oluşur; aralarında güvenli bir "köprü" vardır:

```
┌─────────────────────────────────────────────────────────┐
│  ANA SÜREÇ (main) — Node tarafı, bilgisayarın "eli"      │
│  • Pencereyi açar/kapatır                                 │
│  • SQLite dosyasına yazar/okur (better-sqlite3)           │
│  • Yedek alır, USB'ye kopyalar, dosya kaydeder            │
│  • İş mantığı: bakiye, gecikme, satış kapanışı            │
│  • Yerel giriş + rol kontrolü (çalışan silemez)           │
└───────────────▲─────────────────────────────────────────┘
                │  güvenli köprü (preload + contextBridge)
                │  window.api.musteriListele() gibi çağrılar
┌───────────────▼─────────────────────────────────────────┐
│  ARAYÜZ SÜRECİ (renderer) — React ekranları              │
│  • Panel, Müşteriler, Kart, Yeni Satış, Tahsilat…        │
│  • Kullanıcı butona basar → köprüden ana sürece sorar    │
│  • Veriye/DB'ye DOĞRUDAN erişemez (güvenlik)             │
└─────────────────────────────────────────────────────────┘
```

**Güvenlik ilkeleri (standart, tartışılmaz):** `contextIsolation: true`, `nodeIntegration: false`, tüm veri/dosya işleri yalnızca ana süreçte. Arayüz, veritabanına asla doğrudan dokunmaz; her şey köprüden geçer. Böylece rol kontrolü (çalışan sil/düzenle yapamaz) tek yerde, sağlam durur.

---

## 6. Veri ve Yedek Nerede Durur?

- **Veritabanı dosyası:** Windows'un kullanıcı verisi klasöründe (`app.getPath('userData')`), örn. `…/veresiye/veresiye.db`. **Neden "Program Files" değil?** O klasör yazmaya kapalıdır; veri yazılamaz. Kullanıcı verisi klasörü hem yazılabilir hem de program güncellense bile veri kaybolmaz.
- **Otomatik yedekler:** Aynı yerin altında `yedekler/` klasörü — `yedek_2026-07-14.db` gibi tarihli kopyalar; her akşam 23.55'te ve her açılışta alınır, bilgisayarda **en yeni 5 yedek** durur, fazlası otomatik silinir.
- **USB yedeği:** Kullanıcı "Yedek Al" deyince, seçtiği klasöre (USB) veritabanı dosyasının kopyası yazılır.
- **Excel/CSV:** Raporlar kullanıcının seçtiği klasöre dosya olarak kaydedilir.

---

## 7. Gelecek: Sunucuya Taşıma Yolu (şartname Bölüm 3)

Bugün: tek bilgisayar + SQLite. Yarın istenirse: sunucu + PostgreSQL.

Bunu kolaylaştıran tek kural: **Tüm veri okuma/yazma işleri `db/repositories/` altındaki tek katmandan geçer.** Ekranlar ve iş mantığı asla doğrudan SQL yazmaz; hep bu katmana sorar. Geçiş günü geldiğinde yalnızca bu katmanın içi PostgreSQL'e çevrilir; üstteki her şey aynı kalır.

> **Opsiyon (mimar Faz 1'de kararlaştırır):** Bu katmanda düz SQL yerine **Kysely** (hem SQLite hem PostgreSQL "lehçesi"ni bilen, tip güvenli sorgu aracı) kullanmak, geçişi neredeyse "ayar değiştirme" seviyesine indirir. Basitlik uğruna düz SQL de yeterlidir; karar Faz 1'de netleşir.

---

## 8. Klasör Yapısı (taslak — Faz 0'da kesinleşir)

```
veresiye/
├─ package.json                 # bağımlılıklar + komutlar (dev, build, dist)
├─ electron-builder.yml         # .exe paketleme ayarları (Windows NSIS)
├─ tsconfig.json  vite.config.ts  tailwind.config.js
├─ src/
│  ├─ main/                     # ANA SÜREÇ (Node) — bilgisayarın eli
│  │  ├─ main.ts                # pencere + yaşam döngüsü
│  │  ├─ preload.ts             # güvenli köprü (window.api)
│  │  ├─ ipc/                   # arayüzden gelen çağrıların uçları
│  │  │  ├─ musteri.ipc.ts  satis.ipc.ts  tahsilat.ipc.ts
│  │  │  ├─ yedek.ipc.ts    rapor.ipc.ts   auth.ipc.ts
│  │  ├─ db/                    # ⭐ TEK VERİ ERİŞİM KATMANI (gelecek geçiş kapısı)
│  │  │  ├─ connection.ts       # better-sqlite3 bağlantısı
│  │  │  ├─ migrations/         # tablo kurulum adımları
│  │  │  └─ repositories/       # musteriRepo, satisRepo, perdeKalemiRepo, tahsilatRepo, kullaniciRepo
│  │  ├─ services/              # İŞ MANTIĞI
│  │  │  ├─ bakiyeService.ts    # Kalan = Toplam − Tahsilat
│  │  │  ├─ gecikmeService.ts   # bakiye>0 VE 30+ gün → kırmızı
│  │  │  ├─ yedekService.ts     # otomatik/USB yedek, geri yükle, temizlik
│  │  │  └─ raporService.ts     # 4 rapor + CSV/Excel
│  │  └─ auth/                  # yerel giriş, şifre hash, roller
│  └─ renderer/                 # ARAYÜZ (React) — tasarımdan taşınır
│     ├─ index.html  main.tsx  App.tsx
│     ├─ ekranlar/              # Panel, Musteriler, Kart, YeniSatis, Devir, Tahsilat, Raporlar, Ayarlar, Giris
│     ├─ bilesenler/            # Tablo, Toast, OnayKutusu, ParaGoster, AramaKutusu
│     ├─ stil/
│     │  ├─ tokens.css          # tasarım token'ları (--primary, --danger…)
│     │  └─ fonts/              # ⭐ self-host: Cabinet Grotesk, IBM Plex, Phosphor (CDN YOK)
│     └─ lib/
│        ├─ bridge.ts           # window.api tip tanımları
│        └─ bicim.ts            # 12.500,00 ₺ ve GG.AA.YYYY biçimleme
├─ dokumanlar/  tasarim/        # (mevcut)
└─ (çalışma anında, userData altında) yedekler/  veresiye.db
```

---

## 9. macOS'ta Geliştir, Windows'a Teslim — Nasıl?

- **Geliştirme/test (macOS):** Programın tamamı macOS'ta `npm run dev` ile açılır ve test edilir. İşlevsel testlerin %95'i burada yapılır — çünkü aynı kod iki sistemde de çalışır.
- **Windows `.exe` üretimi:** better-sqlite3 "yerel (native) modül"dür; Windows için ayrıca derlenmesi gerekir. Bunun iki yolu var:
  1. **Ücretsiz bulut derleme (GitHub Actions, Windows sunucusu):** Kodu gönderince otomatik `.exe` üretir. Ücretsiz, tekrarlanabilir. **(Önerilen varsayılan.)**
  2. **Windows bilgisayar/sanal makine** üzerinde `electron-builder` çalıştırmak.
- **Teslim öncesi kanıt:** Üretilen `.exe`, **gerçek bir Windows bilgisayarda** çift tıkla kurulup **internet kapalıyken** açılmalı ve veri kalıcı olmalı. Bu, teslim (canlıya alma) onay kapısının kanıtıdır (Faz 8).

> ⚠️ Bu, planın tek gerçek teknik pürüzü. Riski düşük ve yolu iyi bilinen bir konu; ama Faz 0'da erken denenmeli (native modülün Windows'ta derlendiğini baştan görmek için).

---

## 10. Bilinen Açık Noktalar / Riskler

| Konu | Durum | Plan |
|---|---|---|
| Native modülün (better-sqlite3) Windows derlemesi | Bilinen, düşük risk | Faz 0'da erken doğrula (GitHub Actions veya Windows VM) |
| **Devir hızlı giriş ekranı** tasarımda YOK | Tasarım boşluğu | Faz 4'te uiux-tasarimci mevcut dile uygun tasarlar (şartname 8.5) |
| **Giriş ekranı + kullanıcı yönetimi** tasarımda YOK | Tasarım boşluğu | Faz 4'te uiux-tasarimci ekler (şartname 2 ve 8.7) |
| Font/ikon şu an CDN'den | Prototip notu | Faz 0'da self-host'a çevrilir (offline şartı) |
| Otomatik başlatma tercihi | Varsayılan: her ikisi | Kurulumda hem masaüstü kısayolu hem "Windows açılınca başlat" (opsiyonel, Ayarlar'dan kapatılabilir) |

---

## 11. Karar Kaydı Özeti

| Tarih | Karar | Neden |
|---|---|---|
| 15.07.2026 | Bulut stack (Next.js+Supabase+Vercel) **kullanılmayacak** | Şartname internetsiz/tek bilgisayar/SQLite/çift tık şartı koyuyor |
| 15.07.2026 | **Electron** masaüstü çatısı | En popüler, en iyi dokümante, JS/TS'e uygun, çift tıkla .exe |
| 15.07.2026 | **better-sqlite3** gömülü SQLite | Electron'un standart, hızlı, gömülü SQLite yolu |
| 15.07.2026 | **React + TypeScript** arayüz | Onaylı tasarım zaten React; TS hataları erken yakalar |
| 15.07.2026 | **Tek veri erişim katmanı** (repository) | Gelecekte SQLite→PostgreSQL geçişini tek yerden yapmak için |
| 15.07.2026 | **electron-builder** ile Windows .exe | Standart, çift tıkla kurulum + kısayol |
| 15.07.2026 | Otomatik güncelleme/lisans **YOK** | Şartname "bozulabilecek mekanizma olmasın" diyor |

---

_İlgili dokümanlar: `dokumanlar/GEREKSINIMLER.md` (şartname v2) · `tasarim/Perde Takip.dc.html` (onaylı tasarım) · `PROJE_DURUMU.md` (ortak hafıza)._
