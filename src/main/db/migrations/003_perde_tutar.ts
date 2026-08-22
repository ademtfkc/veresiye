import type { Migration } from './migration'

/**
 * Perde kaleminde fiyatlama sadeleştirildi: artık "birim fiyat × adet"
 * hesaplaması yerine kullanıcı doğrudan satır TUTARINI yazar. `birim_fiyat`
 * sütunu kaldırıldı; `satir_tutari` artık GENERATED değil, elle girilen düz
 * bir INTEGER (kuruş). En/boy ölçüleri KORUNUR ama artık opsiyonel (bilgi
 * amaçlı) — fiyata karışmaz.
 *
 * SQLite'ta bir GENERATED sütunu düz sütuna çeviremediğimiz için standart
 * "yeni tablo → kopyala → sil → yeniden adlandır" tablo yeniden kurulumu
 * kullanılır (bkz. https://sqlite.org/lang_altertable.html). MEVCUT KAYITLARIN
 * TUTARI KORUNUR: eski `satir_tutari` (birim_fiyat×adet) yeni sütuna aynen
 * taşınır — hiçbir satışın toplamı/bakiyesi değişmez.
 *
 * `satir_tutari` adı DEĞİŞMEDİĞİ için `satis_bakiye_view` (bu sütunu toplar)
 * AYNI kalır. Ancak tabloyu yeniden adlandırırken SQLite bu görünümü doğrular
 * ve o an perde_kalemi geçici olarak yok olduğu için hata verir; bu yüzden
 * görünüm önce KENDİ tanımından okunup kaldırılır, tablo yeniden kurulduktan
 * sonra AYNEN geri oluşturulur (tanım çoğaltılmaz — sqlite_master'dan alınır).
 * perde_kalemi'ye FK ile bağlı başka tablo yok, güvenle yeniden kurulur.
 */
export const perdeTutarSemasi: Migration = {
  version: 3,
  name: 'perde_tutar',
  up(db): void {
    const gorunum = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='view' AND name='satis_bakiye_view'")
      .get() as { sql: string } | undefined

    db.exec(`
      DROP VIEW IF EXISTS satis_bakiye_view;
      CREATE TABLE perde_kalemi_yeni (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        satis_id      INTEGER NOT NULL REFERENCES satis(id) ON DELETE CASCADE,
        oda           TEXT,
        model_kumas   TEXT,
        en            REAL,   -- santimetre (bilgi amaçlı, opsiyonel)
        boy           REAL,   -- santimetre (bilgi amaçlı, opsiyonel)
        adet          INTEGER NOT NULL DEFAULT 1 CHECK (adet > 0),
        satir_tutari  INTEGER NOT NULL CHECK (satir_tutari >= 0) -- kuruş, ELLE girilir
      );
      INSERT INTO perde_kalemi_yeni (id, satis_id, oda, model_kumas, en, boy, adet, satir_tutari)
        SELECT id, satis_id, oda, model_kumas, en, boy, adet, satir_tutari FROM perde_kalemi;
      DROP TABLE perde_kalemi;
      ALTER TABLE perde_kalemi_yeni RENAME TO perde_kalemi;
      CREATE INDEX idx_perde_kalemi_satis_id ON perde_kalemi(satis_id);
    `)

    // Görünümü kendi orijinal tanımından geri oluştur (yoksa 001'deki tanımla).
    if (gorunum?.sql) db.exec(gorunum.sql)
  }
}
