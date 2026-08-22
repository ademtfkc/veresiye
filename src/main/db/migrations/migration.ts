import type Database from 'better-sqlite3'

/**
 * Tek bir şema adımı. `version` sıra numarasıdır ve asla değiştirilmez /
 * tekrar kullanılmaz — yeni bir değişiklik gerektiğinde yeni bir dosya ve bir
 * sonraki numara eklenir (ör. 002_...). Böylece her adım geri izlenebilir ve
 * canlıda hangi sürümde olunduğu tek bir sayıyla bilinir.
 */
export interface Migration {
  version: number
  name: string
  up: (db: Database.Database) => void
}
