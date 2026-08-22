/**
 * Faz 1 kanıt testi — veritabani-uzmani.
 *
 * Gerçek repository katmanını (src/main/db/repositories) ve migration
 * mekanizmasını (src/main/db/migrations) geçici, atılabilir bir SQLite
 * dosyası üzerinde uçtan uca çalıştırır. Hiçbir şekilde gerçek uygulama
 * veritabanına (userData/veresiye.db) dokunmaz.
 *
 * Neden derlenip (esbuild) öyle çalıştırılıyor?
 * Kaynak dosyalar (src/main/db/**) projenin geri kalanıyla aynı üslupta
 * uzantısız import kullanıyor (`from '../connection'`), tıpkı gerçek
 * uygulamada electron-vite'ın derlediği gibi. Node'un çıplak TypeScript
 * çalıştırıcısı uzantısız import'ları çözemediği için, gerçek üretim
 * derlemesiyle aynı yolu (esbuild) kullanıp tek dosyaya paketliyoruz — bkz.
 * `npm run db:test` (package.json).
 *
 * Neden Electron ile (`ELECTRON_RUN_AS_NODE=1 electron`) ve düz `node` ile
 * değil? better-sqlite3 native modülü Electron'un Node ABI'sine göre
 * derlendi (bkz. scripts/db-smoke.mjs'teki aynı not).
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baglantiAyarla, baglantiOlustur } from '../src/main/db/connection'
import { calistirMigrationlar } from '../src/main/db/migrations'
import {
  kullaniciRepo,
  musteriRepo,
  perdeKalemiRepo,
  satisRepo,
  tahsilatRepo
} from '../src/main/db/repositories'

let basarisizSayisi = 0

function esitMi(aciklama: string, beklenen: unknown, gercek: unknown): void {
  const gecti = beklenen === gercek
  console.log(`${gecti ? '✅' : '❌'} ${aciklama} — beklenen: ${beklenen}, gerçek: ${gercek}`)
  if (!gecti) basarisizSayisi++
}

function dogruMu(aciklama: string, kosul: boolean): void {
  console.log(`${kosul ? '✅' : '❌'} ${aciklama}`)
  if (!kosul) basarisizSayisi++
}

function kurus(tl: number): number {
  return Math.round(tl * 100)
}

function tl(kurusDegeri: number): string {
  return (kurusDegeri / 100).toFixed(2) + ' ₺'
}

const tempDir = mkdtempSync(join(tmpdir(), 'veresiye-db-test-'))
const dbPath = join(tempDir, 'test.db')

console.log('[db-test] Faz 1 kanıt testi başlıyor…')
console.log(`[db-test] geçici veritabanı: ${dbPath}`)

try {
  // -------------------------------------------------------------------
  // 1) Migration çalışıyor mu + idempotent mi (2. çalıştırmada hata yok)?
  // -------------------------------------------------------------------
  const baglanti = baglantiOlustur(dbPath) // 1. çalıştırma (baglantiOlustur içinde)
  baglantiAyarla(baglanti) // repository'lerin getDb() ile bulacağı aktif bağlantı

  const tabloSayisi = baglanti
    .prepare(
      `SELECT COUNT(*) AS n FROM sqlite_master
       WHERE type = 'table' AND name IN ('musteri','satis','perde_kalemi','tahsilat','kullanici')`
    )
    .get() as { n: number }
  esitMi('5 tablo oluştu (musteri, satis, perde_kalemi, tahsilat, kullanici)', 5, tabloSayisi.n)

  const indeksSayisi = baglanti
    .prepare(
      `SELECT COUNT(*) AS n FROM sqlite_master
       WHERE type = 'index' AND name LIKE 'idx_%'`
    )
    .get() as { n: number }
  esitMi('5 indeks oluştu', 5, indeksSayisi.n)

  let ikinciCalistirmaHataVerdi = false
  try {
    calistirMigrationlar(baglanti) // 2. çalıştırma — idempotent olmalı
  } catch {
    ikinciCalistirmaHataVerdi = true
  }
  dogruMu('Migration 2. kez çalıştırılınca hata vermiyor (idempotent)', !ikinciCalistirmaHataVerdi)

  // 02.08.2026: 004_elle_toplam migration'ı eklendiği için beklenen versiyon artık 4
  // (001 ilk şema, 002 ayar tablosu, 003 perde kalemi satır tutarı).
  const versiyon = baglanti.pragma('user_version', { simple: true }) as number
  esitMi('schema_version (user_version) 4', 4, versiyon)

  // -------------------------------------------------------------------
  // 2) Müşteri + satış + 2 perde kalemi + 1 tahsilat → kalan bakiye doğru
  // -------------------------------------------------------------------
  const musteri = musteriRepo.ekle({
    ad_soyad: 'Ahmet Yılmaz',
    telefon: '0532 111 22 33',
    adres: 'Cumhuriyet Mah. Atatürk Cad. No:14 Kadıköy/İstanbul',
    not: 'Salon takımı sipariş etti, kumaş rengi bej.'
  })
  dogruMu('Müşteri eklendi (id atandı)', musteri.id > 0)

  const satis1 = satisRepo.ekle({
    musteri_id: musteri.id,
    tarih: '2026-07-10',
    aciklama: 'Salon + yatak odası perdeleri',
    tip: 'satis'
  })

  const kalem1 = perdeKalemiRepo.ekle({
    satis_id: satis1.id,
    oda: 'Salon',
    model_kumas: 'Blackout krem',
    en: 350,
    boy: 260,
    adet: 2,
    satir_tutari: kurus(2500) // satır tutarı ELLE girilir
  })
  const kalem2 = perdeKalemiRepo.ekle({
    satis_id: satis1.id,
    oda: 'Yatak Odası',
    model_kumas: 'Tül desenli',
    en: 200,
    boy: 240,
    adet: 3,
    satir_tutari: kurus(2400) // satır tutarı ELLE girilir
  })

  esitMi('Kalem 1 satır tutarı (2.500,00₺)', kurus(2500), kalem1.satir_tutari)
  esitMi('Kalem 2 satır tutarı (2.400,00₺)', kurus(2400), kalem2.satir_tutari)

  const beklenenToplam1 = kurus(2500) + kurus(2400) // 4.900,00 ₺
  const tahsilat1 = tahsilatRepo.ekle({
    satis_id: satis1.id,
    tarih: '2026-07-10',
    tutar: kurus(2000),
    odeme_sekli: 'nakit',
    not: 'peşinat'
  })
  dogruMu('Tahsilat eklendi (id atandı)', tahsilat1.id > 0)

  const bakiye1 = satisRepo.bakiye(satis1.id)!
  esitMi('Satış 1 — toplam tutar (4.900,00₺)', beklenenToplam1, bakiye1.toplam_tutar)
  esitMi('Satış 1 — ödenen (2.000,00₺)', kurus(2000), bakiye1.odenen_tutar)
  esitMi('Satış 1 — kalan bakiye (2.900,00₺)', beklenenToplam1 - kurus(2000), bakiye1.kalan_bakiye)
  esitMi('Satış 1 — durum hâlâ açık (kalan > 0)', 'acik', bakiye1.durum)

  const musteriBakiye1 = musteriRepo.toplamBakiye(musteri.id)
  esitMi(
    'Müşteri toplam bakiyesi = tek açık satışın kalanı (2.900,00₺)',
    beklenenToplam1 - kurus(2000),
    musteriBakiye1
  )
  console.log(`   (okunabilir: toplam ${tl(bakiye1.toplam_tutar)}, ödenen ${tl(bakiye1.odenen_tutar)}, kalan ${tl(bakiye1.kalan_bakiye)})`)

  // -------------------------------------------------------------------
  // 3) Devir kaydı (tip='devir', devir_tutari) → bakiyesi devir_tutari−tahsilat
  // -------------------------------------------------------------------
  const musteri2 = musteriRepo.ekle({
    ad_soyad: 'Fatma Şahin',
    telefon: '0544 222 33 44',
    adres: 'Barış Mah. İnönü Sok. No:7 Bornova/İzmir',
    not: 'Eski defterden aktarıldı.'
  })

  const devirTutari = kurus(1500) // eski defterden kalan 1.500,00 ₺
  const devirSatis = satisRepo.ekle({
    musteri_id: musteri2.id,
    tarih: '2026-01-15',
    aciklama: 'Devir (eski defter)',
    tip: 'devir',
    devir_tutari: devirTutari
  })
  dogruMu('Devir kaydında perde kalemi YOK (gerekmiyor)', perdeKalemiRepo.satisaGoreListele(devirSatis.id).length === 0)

  tahsilatRepo.ekle({
    satis_id: devirSatis.id,
    tarih: '2026-03-01',
    tutar: kurus(500),
    odeme_sekli: 'havale'
  })

  const devirBakiye = satisRepo.bakiye(devirSatis.id)!
  esitMi('Devir — toplam tutar = devir_tutari (1.500,00₺)', devirTutari, devirBakiye.toplam_tutar)
  esitMi('Devir — kalan bakiye (1.500,00₺ − 500,00₺ = 1.000,00₺)', devirTutari - kurus(500), devirBakiye.kalan_bakiye)

  // -------------------------------------------------------------------
  // 4) Tam ödeme → otomatik 'kapandi'. Fazla ödeme → eksi bakiye, engellenmiyor.
  // -------------------------------------------------------------------
  // satis1'in kalanı 2.900,00₺ idi — tam kapatan bir tahsilat girelim.
  tahsilatRepo.ekle({
    satis_id: satis1.id,
    tarih: '2026-07-20',
    tutar: beklenenToplam1 - kurus(2000), // kalan neyse tam onu öde
    odeme_sekli: 'kart'
  })
  const bakiye1TamOdeme = satisRepo.bakiye(satis1.id)!
  esitMi('Tam ödeme sonrası kalan bakiye 0', 0, bakiye1TamOdeme.kalan_bakiye)
  esitMi('Tam ödeme sonrası satış otomatik "kapandi"', 'kapandi', satisRepo.getirById(satis1.id)!.durum)

  // Fazla ödeme: kapanmış satışa bir tahsilat daha girilirse bakiye eksiye düşer.
  tahsilatRepo.ekle({
    satis_id: satis1.id,
    tarih: '2026-07-25',
    tutar: kurus(300),
    odeme_sekli: 'nakit',
    not: 'fazla ödeme'
  })
  const bakiye1FazlaOdeme = satisRepo.bakiye(satis1.id)!
  esitMi('Fazla ödeme sonrası kalan bakiye eksiye düşüyor (−300,00₺)', -kurus(300), bakiye1FazlaOdeme.kalan_bakiye)
  dogruMu('Fazla ödeme ENGELLENMEDİ (kayıt başarıyla girildi)', true)
  esitMi('Fazla ödemede de durum "kapandi" kalıyor (kalan ≤ 0)', 'kapandi', satisRepo.getirById(satis1.id)!.durum)

  // -------------------------------------------------------------------
  // 5) Arama (ad / telefon) çalışıyor mu?
  // -------------------------------------------------------------------
  const adAramasi = musteriRepo.ara('Yılmaz')
  dogruMu('Ad ile arama "Yılmaz" → Ahmet Yılmaz bulundu', adAramasi.some((m) => m.id === musteri.id))

  const telefonAramasi = musteriRepo.ara('0544 222')
  dogruMu('Telefon ile arama "0544 222" → Fatma Şahin bulundu', telefonAramasi.some((m) => m.id === musteri2.id))

  const bulunamayanArama = musteriRepo.ara('olmayan-bir-isim-xyz')
  dogruMu('Sonuç olmayan arama boş dizi döndürüyor', bulunamayanArama.length === 0)

  // -------------------------------------------------------------------
  // Bonus: veri bütünlüğü — CHECK kısıtı ve CASCADE (yetim kayıt kalmıyor)
  // -------------------------------------------------------------------
  let checkKisitiCalisti = false
  try {
    baglanti
      .prepare(`INSERT INTO satis (musteri_id, tarih, tip, devir_tutari) VALUES (?, ?, 'satis', 100)`)
      .run(musteri.id, '2026-07-11')
  } catch {
    checkKisitiCalisti = true
  }
  dogruMu('CHECK kısıtı çalışıyor (tip=satis iken devir_tutari dolu olamaz)', checkKisitiCalisti)

  const caizSatis = satisRepo.ekle({ musteri_id: musteri.id, tarih: '2026-07-12', tip: 'satis' })
  perdeKalemiRepo.ekle({ satis_id: caizSatis.id, en: 100, boy: 100, adet: 1, satir_tutari: kurus(100) })
  tahsilatRepo.ekle({ satis_id: caizSatis.id, tarih: '2026-07-12', tutar: kurus(50), odeme_sekli: 'nakit' })
  satisRepo.sil(caizSatis.id)
  const yetimKalem = perdeKalemiRepo.satisaGoreListele(caizSatis.id)
  const yetimTahsilat = tahsilatRepo.satisaGoreListele(caizSatis.id)
  dogruMu('Satış silinince kalemler de gidiyor (yetim kayıt yok)', yetimKalem.length === 0)
  dogruMu('Satış silinince tahsilatlar da gidiyor (yetim kayıt yok)', yetimTahsilat.length === 0)

  // -------------------------------------------------------------------
  // Bonus: kullaniciRepo temel CRUD (şifre_hash gerçek bir değer değil —
  // Faz 2'nin bcrypt/argon2 ile üreteceği hash'in yer tutucusu)
  // -------------------------------------------------------------------
  const kullanici = kullaniciRepo.ekle({
    kullanici_adi: 'ornek.kullanici',
    sifre_hash: 'FAZ2_TARAFINDAN_DOLDURULACAK_HASH_YER_TUTUCU',
    rol: 'sahip'
  })
  dogruMu('Kullanıcı eklendi', kullanici.id > 0 && kullanici.rol === 'sahip')
  dogruMu('Kullanıcı adıyla bulunuyor', kullaniciRepo.getirByKullaniciAdi('ornek.kullanici')?.id === kullanici.id)

  console.log('')
  if (basarisizSayisi > 0) {
    console.error(`[db-test] HATA — ${basarisizSayisi} kontrol başarısız oldu.`)
    process.exitCode = 1
  } else {
    console.log('[db-test] BAŞARILI — tüm kontroller geçti.')
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
