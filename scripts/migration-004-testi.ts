/**
 * MIGRATION 004 (elle_toplam) VERİ GÜVENLİĞİ KANITI — 02.08.2026.
 *
 * Sorulan soru: "İçinde zaten satış/tahsilat olan bir veritabanı yeni sürüme
 * yükseltilince rakamlar kayar mı?"
 *
 * Yöntem: v3 şemasıyla (004 UYGULANMADAN) gerçek bir veritabanı kurulur,
 * içine satış + perde kalemleri + tahsilat + devir kaydı yazılır, bakiyeler
 * ÖLÇÜLÜR. Sonra migration 004 uygulanır ve AYNI bakiyeler tekrar ölçülüp
 * birebir karşılaştırılır. `npm run migration:test` ile çalıştırılır.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { ilkSema } from '../src/main/db/migrations/001_ilk_sema'
import { ayarlarSemasi } from '../src/main/db/migrations/002_ayarlar'
import { perdeTutarSemasi } from '../src/main/db/migrations/003_perde_tutar'
import { calistirMigrationlar } from '../src/main/db/migrations'

let basarisiz = 0
function esitMi(aciklama: string, beklenen: unknown, gercek: unknown): void {
  const gecti = beklenen === gercek
  console.log(`${gecti ? '✅' : '❌'} ${aciklama} — beklenen: ${beklenen}, gerçek: ${gercek}`)
  if (!gecti) basarisiz++
}
function dogruMu(aciklama: string, kosul: boolean): void {
  console.log(`${kosul ? '✅' : '❌'} ${aciklama}`)
  if (!kosul) basarisiz++
}

const tempDir = mkdtempSync(join(tmpdir(), 'veresiye-migration-test-'))
const dbPath = join(tempDir, 'eski.db')

console.log('[migration-004-test] başlıyor…')

try {
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')

  // --- 1) v3 şeması (004 YOK) + gerçekçi veri --------------------------------
  ilkSema.up(db)
  ayarlarSemasi.up(db)
  perdeTutarSemasi.up(db)
  db.pragma('user_version = 3')
  esitMi('Kurulum: şema v3', 3, db.pragma('user_version', { simple: true }))
  dogruMu(
    'v3 şemasında elle_toplam sütunu YOK',
    !(db.prepare('PRAGMA table_info(satis)').all() as { name: string }[]).some((s) => s.name === 'elle_toplam')
  )

  const musteriId = Number(
    db.prepare("INSERT INTO musteri (ad_soyad, telefon) VALUES ('Eski Müşteri', '0500 000 00 00')").run()
      .lastInsertRowid
  )
  const satisId = Number(
    db
      .prepare("INSERT INTO satis (musteri_id, tarih, aciklama, tip, durum) VALUES (?, '2026-07-01', 'Eski satış', 'satis', 'acik')")
      .run(musteriId).lastInsertRowid
  )
  db.prepare(
    'INSERT INTO perde_kalemi (satis_id, oda, adet, satir_tutari) VALUES (?, ?, ?, ?)'
  ).run(satisId, 'Salon', 2, 250_000)
  db.prepare(
    'INSERT INTO perde_kalemi (satis_id, oda, adet, satir_tutari) VALUES (?, ?, ?, ?)'
  ).run(satisId, 'Mutfak', 1, 240_000)
  db.prepare("INSERT INTO tahsilat (satis_id, tarih, tutar, odeme_sekli) VALUES (?, '2026-07-05', ?, 'nakit')").run(
    satisId,
    200_000
  )
  const devirId = Number(
    db
      .prepare("INSERT INTO satis (musteri_id, tarih, tip, devir_tutari, durum) VALUES (?, '2026-06-01', 'devir', ?, 'acik')")
      .run(musteriId, 500_000).lastInsertRowid
  )

  type Bakiye = { toplam_tutar: number; odenen_tutar: number; kalan_bakiye: number }
  const oku = (id: number): Bakiye =>
    db.prepare('SELECT toplam_tutar, odenen_tutar, kalan_bakiye FROM satis_bakiye_view WHERE satis_id = ?').get(id) as Bakiye

  const oncesiSatis = oku(satisId)
  const oncesiDevir = oku(devirId)
  console.log(`   yükseltme ÖNCESİ satış: toplam ${oncesiSatis.toplam_tutar}, kalan ${oncesiSatis.kalan_bakiye}`)
  esitMi('Yükseltme öncesi satış toplamı (250.000 + 240.000)', 490_000, oncesiSatis.toplam_tutar)
  esitMi('Yükseltme öncesi kalan (490.000 − 200.000)', 290_000, oncesiSatis.kalan_bakiye)
  esitMi('Yükseltme öncesi devir toplamı', 500_000, oncesiDevir.toplam_tutar)

  // --- 2) YÜKSELTME: bekleyen migration (004) uygulanır ----------------------
  calistirMigrationlar(db)
  esitMi('Yükseltme sonrası şema v4', 4, db.pragma('user_version', { simple: true }))
  dogruMu(
    'elle_toplam sütunu eklendi',
    (db.prepare('PRAGMA table_info(satis)').all() as { name: string }[]).some((s) => s.name === 'elle_toplam')
  )

  // --- 3) RAKAMLAR AYNI MI? (asıl kanıt) ------------------------------------
  const sonrasiSatis = oku(satisId)
  const sonrasiDevir = oku(devirId)
  esitMi('Yükseltmeden SONRA satış toplamı DEĞİŞMEDİ', oncesiSatis.toplam_tutar, sonrasiSatis.toplam_tutar)
  esitMi('Yükseltmeden SONRA ödenen DEĞİŞMEDİ', oncesiSatis.odenen_tutar, sonrasiSatis.odenen_tutar)
  esitMi('Yükseltmeden SONRA kalan bakiye DEĞİŞMEDİ', oncesiSatis.kalan_bakiye, sonrasiSatis.kalan_bakiye)
  esitMi('Yükseltmeden SONRA devir toplamı DEĞİŞMEDİ', oncesiDevir.toplam_tutar, sonrasiDevir.toplam_tutar)
  esitMi(
    'Eski satışların elle_toplam değeri NULL (eski davranış korunuyor)',
    null,
    (db.prepare('SELECT elle_toplam FROM satis WHERE id = ?').get(satisId) as { elle_toplam: number | null }).elle_toplam
  )
  esitMi('Perde kalemleri korundu (2 satır)', 2, (db.prepare('SELECT COUNT(*) c FROM perde_kalemi WHERE satis_id = ?').get(satisId) as { c: number }).c)

  // --- 4) YENİ DAVRANIŞ: elle toplam yazılınca view onu kullanıyor mu? ------
  db.prepare('UPDATE satis SET elle_toplam = ? WHERE id = ?').run(400_000, satisId)
  const elleSonrasi = oku(satisId)
  esitMi('Elle toplam yazılınca toplam o oldu (490.000 → 400.000)', 400_000, elleSonrasi.toplam_tutar)
  esitMi('Elle toplamla kalan yeniden hesaplandı (400.000 − 200.000)', 200_000, elleSonrasi.kalan_bakiye)
  db.prepare('UPDATE satis SET elle_toplam = NULL WHERE id = ?').run(satisId)
  esitMi('Elle toplam kaldırılınca kalemlere geri dönüldü', 490_000, oku(satisId).toplam_tutar)

  // --- 5) İDEMPOTENT: tekrar çalıştırmak bozmuyor ---------------------------
  calistirMigrationlar(db)
  esitMi('Tekrar çalıştırınca şema hâlâ v4', 4, db.pragma('user_version', { simple: true }))
  esitMi('Tekrar çalıştırınca satış toplamı hâlâ aynı', 490_000, oku(satisId).toplam_tutar)

  db.close()

  console.log('')
  if (basarisiz > 0) {
    console.error(`[migration-004-test] HATA — ${basarisiz} kontrol başarısız.`)
    process.exitCode = 1
  } else {
    console.log('[migration-004-test] BAŞARILI — yükseltmede hiçbir rakam kaymadı.')
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
