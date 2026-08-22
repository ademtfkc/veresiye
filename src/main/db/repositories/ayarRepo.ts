import type Database from 'better-sqlite3'
import { getDb } from '../connection'
import type { AyarRow } from '../types'

function db(): Database.Database {
  return getDb()
}

/**
 * Basit anahtar/değer ayar deposu (Şartname 8.7: dükkan adı; Faz 6'da
 * yedekleme ayarları da aynı tabloya yeni anahtarlarla eklenebilir).
 * TÜM SQL burada — ekran/servis katmanı doğrudan SQL yazmaz.
 */
export const ayarRepo = {
  getir(anahtar: string): string | null {
    const satir = db().prepare('SELECT deger FROM ayar WHERE anahtar = ?').get(anahtar) as
      | AyarRow
      | undefined
    return satir?.deger ?? null
  },

  set(anahtar: string, deger: string): void {
    db()
      .prepare(
        `INSERT INTO ayar (anahtar, deger) VALUES (@anahtar, @deger)
         ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger`
      )
      .run({ anahtar, deger })
  }
}
