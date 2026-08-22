import type { Migration } from './migration'

/**
 * ELLE SATIŞ TOPLAMI (CEO isteği 02.08.2026).
 *
 * Dükkan sahibi pazarlıkta toptan fiyat veriyor ("indirim yaptım, 8.500'e
 * anlaştık") ve satır satır fiyat girmek istemiyor — ama perde ölçülerini
 * (oda/en/boy/adet) yine kayda geçirmek istiyor. Bu yüzden `satis` tablosuna
 * opsiyonel `elle_toplam` sütunu eklendi:
 *
 *   - `elle_toplam` NULL ise  → satışın toplamı ESKİSİ GİBİ perde kalemlerinin
 *     `satir_tutari` toplamıdır (bugüne kadarki tüm kayıtlar böyle kalır).
 *   - `elle_toplam` DOLU ise  → satışın toplamı doğrudan bu rakamdır; kalem
 *     tutarları (hepsi 0 olabilir) toplama karışmaz.
 *
 * MEVCUT VERİ HİÇ DEĞİŞMEZ: yeni sütun her eski satırda NULL olur, `COALESCE`
 * mantığı eski davranışa düşer — hiçbir satışın toplamı/bakiyesi kaymaz.
 *
 * `satis_bakiye_view` bu kuralı uygulayacak şekilde yeniden yazılıyor (görünüm
 * TANIMI değiştiği için 003'teki "tanımı sqlite_master'dan okuyup aynen geri
 * koy" numarası burada KULLANILMAZ; yeni tanım açıkça yazılır).
 *
 * Devir kayıtları etkilenmez: onların toplamı hâlâ `devir_tutari`.
 */
export const elleToplamSemasi: Migration = {
  version: 4,
  name: 'elle_toplam',
  up(db): void {
    db.exec(`
      ALTER TABLE satis
        ADD COLUMN elle_toplam INTEGER
        CHECK (elle_toplam IS NULL OR elle_toplam >= 0);

      DROP VIEW IF EXISTS satis_bakiye_view;

      -- Bakiye ASLA bir sütunda saklanmaz (Şartname 6.1) — canlı hesaplanır.
      -- Toplam tutar önceliği:
      --   1) devir kaydıysa            → devir_tutari
      --   2) elle toplam yazılmışsa    → elle_toplam
      --   3) aksi halde (eski davranış) → perde kalemlerinin toplamı
      CREATE VIEW satis_bakiye_view AS
      SELECT
        s.id AS satis_id,
        s.musteri_id AS musteri_id,
        s.durum AS durum,
        CASE
          WHEN s.tip = 'devir' THEN COALESCE(s.devir_tutari, 0)
          WHEN s.elle_toplam IS NOT NULL THEN s.elle_toplam
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
            WHEN s.elle_toplam IS NOT NULL THEN s.elle_toplam
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
