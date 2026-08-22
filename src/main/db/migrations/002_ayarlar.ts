import type { Migration } from './migration'

/**
 * Ayarlar — basit anahtar/değer (key/value) tablosu (Şartname 8.7: dükkan
 * adı ekstre/başlıkta görünecek). Anahtar/değer seçildi çünkü ileride Faz
 * 6'da yedekleme ayarları (ör. "son_yedek_tarihi") gerektiğinde yeni bir
 * migration/sütun eklemeden aynı tabloya yeni bir satır eklenebilir.
 */
export const ayarlarSemasi: Migration = {
  version: 2,
  name: 'ayarlar',
  up(db): void {
    db.exec(`
      CREATE TABLE ayar (
        anahtar TEXT PRIMARY KEY,
        deger   TEXT NOT NULL
      );
    `)
  }
}
