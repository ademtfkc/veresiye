import type Database from 'better-sqlite3'
import type { Migration } from './migration'
import { ilkSema } from './001_ilk_sema'
import { ayarlarSemasi } from './002_ayarlar'
import { perdeTutarSemasi } from './003_perde_tutar'
import { elleToplamSemasi } from './004_elle_toplam'

/**
 * Migration listesi — SIRAYLA, version numarasına göre artan. Yeni bir şema
 * değişikliği gerektiğinde buraya yeni bir madde eklenir; var olanlar asla
 * değiştirilmez (zaten canlıda çalışmış olabilirler).
 */
const migrations: Migration[] = [ilkSema, ayarlarSemasi, perdeTutarSemasi, elleToplamSemasi]

/**
 * Bekleyen migration'ları sırayla uygular. Versiyon takibi SQLite'ın kendi
 * `PRAGMA user_version` alanında tutulur (dosyanın başlığında saklanır, ayrı
 * bir "schema_version" tablosu gerektirmez). Her migration kendi işlem
 * (transaction) içinde çalışır; yarıda hata olursa o adım hiç uygulanmamış
 * gibi geri alınır.
 *
 * İDEMPOTENT: Uygulama her açılışında çağrılır. Zaten uygulanmış bir
 * migration'ın version'ı mevcut user_version'dan küçük/eşitse atlanır — yani
 * iki kez çalıştırmak hiçbir hataya veya bozulmaya yol açmaz.
 */
export function calistirMigrationlar(db: Database.Database): void {
  const mevcutVersiyon = db.pragma('user_version', { simple: true }) as number

  const bekleyenler = migrations
    .filter((m) => m.version > mevcutVersiyon)
    .sort((a, b) => a.version - b.version)

  if (bekleyenler.length === 0) {
    console.log(`[db] şema güncel (versiyon ${mevcutVersiyon}) — uygulanacak migration yok`)
    return
  }

  for (const migration of bekleyenler) {
    const uygula = db.transaction(() => {
      migration.up(db)
      // PRAGMA'ya parametre bağlanamaz (SQLite kısıtı); version her zaman
      // bizim kendi sabit listemizden geldiği için (kullanıcı girdisi değil)
      // string enjeksiyon riski yoktur.
      db.pragma(`user_version = ${migration.version}`)
    })
    uygula()
    console.log(`[db] migration uygulandı → v${migration.version}: ${migration.name}`)
  }
}

export type { Migration }
