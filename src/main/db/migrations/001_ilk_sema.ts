import type { Migration } from './migration'

/**
 * İlk şema — Şartname Bölüm 5 (Veri Modeli).
 *
 * Tablolar: musteri, satis, perde_kalemi, tahsilat, kullanici.
 * Ayrıca bakiyeyi HİÇBİR ZAMAN saklamayan, her sorguda canlı hesaplayan bir
 * SQL VIEW (satis_bakiye_view) — bkz. Şartname Bölüm 6.1.
 *
 * Not: `not` sütun adı SQLite'ta ayrılmış bir kelime (NOT operatörü) olduğu
 * için her yerde çift tırnakla ("not") yazılmalı. Şartname alan adını böyle
 * verdiği için (musteri.not, tahsilat.not) korundu.
 */
export const ilkSema: Migration = {
  version: 1,
  name: 'ilk_sema',
  up(db): void {
    db.exec(`
      CREATE TABLE musteri (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_soyad      TEXT NOT NULL,
        telefon       TEXT,
        adres         TEXT,
        "not"         TEXT,
        kayit_tarihi  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE satis (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        musteri_id    INTEGER NOT NULL REFERENCES musteri(id) ON DELETE CASCADE,
        tarih         TEXT NOT NULL,
        aciklama      TEXT,
        tip           TEXT NOT NULL CHECK (tip IN ('satis', 'devir')),
        -- devir_tutari kuruş cinsinden: yalnızca tip='devir' iken dolu olabilir.
        devir_tutari  INTEGER,
        durum         TEXT NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik', 'kapandi')),
        CHECK (
          (tip = 'devir' AND devir_tutari IS NOT NULL AND devir_tutari >= 0)
          OR
          (tip = 'satis' AND devir_tutari IS NULL)
        )
      );

      CREATE TABLE perde_kalemi (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        satis_id      INTEGER NOT NULL REFERENCES satis(id) ON DELETE CASCADE,
        oda           TEXT,
        model_kumas   TEXT,
        en            REAL NOT NULL CHECK (en > 0),   -- santimetre
        boy           REAL NOT NULL CHECK (boy > 0),  -- santimetre
        adet          INTEGER NOT NULL DEFAULT 1 CHECK (adet > 0),
        birim_fiyat   INTEGER NOT NULL CHECK (birim_fiyat >= 0), -- kuruş
        -- satir_tutari ASLA elle yazılmaz; SQLite otomatik hesaplar ve saklar.
        -- Tek gerçek kaynak birim_fiyat*adet'tir, iki yerde tutulup unutulma riski yok.
        satir_tutari  INTEGER GENERATED ALWAYS AS (birim_fiyat * adet) STORED
      );

      CREATE TABLE tahsilat (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        satis_id      INTEGER NOT NULL REFERENCES satis(id) ON DELETE CASCADE,
        tarih         TEXT NOT NULL,
        tutar         INTEGER NOT NULL CHECK (tutar > 0), -- kuruş
        odeme_sekli   TEXT NOT NULL CHECK (odeme_sekli IN ('nakit', 'kart', 'havale')),
        "not"         TEXT
      );

      CREATE TABLE kullanici (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        kullanici_adi  TEXT NOT NULL UNIQUE,
        sifre_hash     TEXT NOT NULL,
        rol            TEXT NOT NULL CHECK (rol IN ('sahip', 'calisan')),
        aktif          INTEGER NOT NULL DEFAULT 1 CHECK (aktif IN (0, 1))
      );

      -- İndeksler: ~1000 müşteride arama ve satışa/tahsilata bağlı kalemleri
      -- anında bulmak için. (Kitabın arka sözlüğü gibi — her alana değil,
      -- sadece sık aranan alanlara.)
      CREATE INDEX idx_musteri_ad_soyad     ON musteri(ad_soyad);
      CREATE INDEX idx_musteri_telefon      ON musteri(telefon);
      CREATE INDEX idx_satis_musteri_id     ON satis(musteri_id);
      CREATE INDEX idx_perde_kalemi_satis_id ON perde_kalemi(satis_id);
      CREATE INDEX idx_tahsilat_satis_id    ON tahsilat(satis_id);

      -- Bakiye ASLA bir sütunda saklanmaz (Şartname 6.1: "elle girilmez").
      -- Bu view her satış için toplam/ödenen/kalanı satırdan satıra canlı
      -- hesaplar; satır ekleyip/silmek otomatik olarak doğru sonucu verir.
      CREATE VIEW satis_bakiye_view AS
      SELECT
        s.id AS satis_id,
        s.musteri_id AS musteri_id,
        s.durum AS durum,
        CASE
          WHEN s.tip = 'devir' THEN COALESCE(s.devir_tutari, 0)
          ELSE COALESCE(
            (SELECT SUM(pk.satir_tutari) FROM perde_kalemi pk WHERE pk.satis_id = s.id),
            0
          )
        END AS toplam_tutar,
        COALESCE(
          (SELECT SUM(t.tutar) FROM tahsilat t WHERE t.satis_id = s.id),
          0
        ) AS odenen_tutar,
        (
          CASE
            WHEN s.tip = 'devir' THEN COALESCE(s.devir_tutari, 0)
            ELSE COALESCE(
              (SELECT SUM(pk.satir_tutari) FROM perde_kalemi pk WHERE pk.satis_id = s.id),
              0
            )
          END
          -
          COALESCE(
            (SELECT SUM(t.tutar) FROM tahsilat t WHERE t.satis_id = s.id),
            0
          )
        ) AS kalan_bakiye
      FROM satis s;
    `)
  }
}
