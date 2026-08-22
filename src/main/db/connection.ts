import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { calistirMigrationlar } from './migrations'

let db: Database.Database | null = null

/**
 * Verilen dosya yolunda bir SQLite bağlantısı açar: WAL + foreign_keys
 * pragma'larını ayarlar ve bekleyen migration'ları çalıştırır. Şemayla ilgili
 * TÜM açılış mantığı burada toplanır ki hem gerçek uygulama (userData yolu)
 * hem de testler/yedek geri yükleme gibi başka senaryolar (geçici veya farklı
 * bir dosya yolu) aynı garantili yoldan geçsin.
 */
export function baglantiOlustur(dbPath: string): Database.Database {
  const baglanti = new Database(dbPath)

  // WAL: aynı anda okuma/yazma yapılırken dosyanın bozulmasını engeller.
  baglanti.pragma('journal_mode = WAL')
  // İlişkili kayıtlar (örn. bir satışın kalemleri) tutarlılığı için.
  baglanti.pragma('foreign_keys = ON')

  calistirMigrationlar(baglanti)

  return baglanti
}

/**
 * Aktif bağlantıyı dışarıdan (test kurulumu veya yedekten geri yükleme
 * sonrası yeni dosyaya geçiş için) ayarlar. Normal uygulama akışında
 * kullanılmaz — `getDb()` kendi bağlantısını kendisi açar.
 */
export function baglantiAyarla(baglanti: Database.Database): void {
  db = baglanti
}

/**
 * Gerçek uygulamanın TEK SQLite veritabanı dosyasının yolu: {userData}/veresiye.db.
 * "Program Files" değil "userData" kullanılıyor çünkü Program Files klasörü
 * normal kullanıcı için yazmaya kapalıdır; userData her zaman yazılabilir ve
 * program güncellense bile veri orada kalıcı kalır. (bkz. dokumanlar/MIMARI.md Böl.6)
 *
 * Tek yerde tutuluyor ki `getDb()` VE yedekleme (Faz 6, `src/main/services/
 * yedekService.ts`) aynı yolu kullansın — iki ayrı yerde "userData/veresiye.db"
 * yazıp aralarında sessizce kayma (drift) riski almayalım.
 */
export function dbDosyaYolu(): string {
  return join(app.getPath('userData'), 'veresiye.db')
}

/** Otomatik günlük yedeklerin durduğu klasör: {userData}/yedekler (Şartname Böl.4.1). */
export function yedeklerKlasoru(): string {
  return join(app.getPath('userData'), 'yedekler')
}

/**
 * Uygulamanın TEK SQLite veritabanı dosyasına bağlantısını açar (ilk çağrıda
 * oluşturur, sonrasında aynı bağlantıyı döndürür).
 */
export function getDb(): Database.Database {
  if (db) return db

  const dbPath = dbDosyaYolu()
  const klasor = dirname(dbPath)
  if (!existsSync(klasor)) {
    mkdirSync(klasor, { recursive: true })
  }

  db = baglantiOlustur(dbPath)

  console.log(`[db] SQLite bağlantısı açıldı: ${dbPath}`)

  return db
}

/** Uygulama kapanırken bağlantıyı düzgünce kapatır. */
export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
