import type Database from 'better-sqlite3'
import { getDb } from '../connection'
import type {
  GecikmeAdayiSatiri,
  MusteriBakiyeSatiri,
  MusteriGuncelleme,
  MusteriRow,
  YeniMusteri
} from '../types'

function db(): Database.Database {
  return getDb()
}

/**
 * Müşteri kartları. TÜM SQL burada — ekran/servis katmanı asla doğrudan SQL
 * yazmaz, hep bu katmana sorar (bkz. dokumanlar/MIMARI.md Böl.7).
 */
export const musteriRepo = {
  ekle(input: YeniMusteri): MusteriRow {
    const sonuc = db()
      .prepare(
        `INSERT INTO musteri (ad_soyad, telefon, adres, "not")
         VALUES (@ad_soyad, @telefon, @adres, @not)`
      )
      .run({
        ad_soyad: input.ad_soyad,
        telefon: input.telefon ?? null,
        adres: input.adres ?? null,
        not: input.not ?? null
      })
    return musteriRepo.getirById(Number(sonuc.lastInsertRowid))!
  },

  getirById(id: number): MusteriRow | undefined {
    return db().prepare('SELECT * FROM musteri WHERE id = ?').get(id) as MusteriRow | undefined
  },

  /** Bakiyeye bakmadan tüm müşteriler, ada göre sıralı. */
  listele(): MusteriRow[] {
    return db().prepare('SELECT * FROM musteri ORDER BY ad_soyad ASC').all() as MusteriRow[]
  },

  /** Ad soyad veya telefonda anlık arama (Şartname 8.2: "en önemli öğe"). */
  ara(sorgu: string): MusteriRow[] {
    const desen = `%${sorgu}%`
    return db()
      .prepare(
        `SELECT * FROM musteri
         WHERE ad_soyad LIKE ? OR telefon LIKE ?
         ORDER BY ad_soyad ASC`
      )
      .all(desen, desen) as MusteriRow[]
  },

  guncelle(id: number, patch: MusteriGuncelleme): void {
    const mevcut = musteriRepo.getirById(id)
    if (!mevcut) throw new Error(`Müşteri bulunamadı: ${id}`)

    db()
      .prepare(
        `UPDATE musteri SET
           ad_soyad = @ad_soyad,
           telefon = @telefon,
           adres = @adres,
           "not" = @not
         WHERE id = @id`
      )
      .run({
        id,
        ad_soyad: patch.ad_soyad ?? mevcut.ad_soyad,
        telefon: patch.telefon !== undefined ? patch.telefon : mevcut.telefon,
        adres: patch.adres !== undefined ? patch.adres : mevcut.adres,
        not: patch.not !== undefined ? patch.not : mevcut.not
      })
  },

  /**
   * DİKKAT: ON DELETE CASCADE nedeniyle bu müşteriye ait TÜM satışlar,
   * perde kalemleri ve tahsilatlar da silinir. Çağıran katman (servis/IPC)
   * bunu kullanıcıya büyük bir onay penceresiyle sormalı (Faz 2/3).
   */
  sil(id: number): void {
    db().prepare('DELETE FROM musteri WHERE id = ?').run(id)
  },

  /**
   * Müşterinin toplam kalan bakiyesi = açık (durum='acik') satışlarının
   * kalan_bakiye toplamı (Şartname 6.1). Asla saklanmaz, her çağrıda canlı
   * hesaplanır (satis_bakiye_view üzerinden).
   */
  toplamBakiye(musteriId: number): number {
    const satir = db()
      .prepare(
        `SELECT COALESCE(SUM(kalan_bakiye), 0) AS toplam
         FROM satis_bakiye_view
         WHERE musteri_id = ? AND durum = 'acik'`
      )
      .get(musteriId) as { toplam: number }
    return satir.toplam
  },

  /**
   * Faz 4 performans ucu — bkz. PROJE_DURUMU.md Böl.10 ("~1000 müşteride
   * Müşteriler ekranı yavaşlayabilir": eskiden müşteri başına 1 sorgu).
   * TÜM müşterileri + açık bakiyelerini TEK sorguda döner (LEFT JOIN +
   * GROUP BY) — müşteri sayısından bağımsız olarak tek round-trip.
   */
  listeleBakiyeli(): MusteriBakiyeSatiri[] {
    return db()
      .prepare(
        `SELECT
           m.*,
           COALESCE(SUM(CASE WHEN sb.durum = 'acik' THEN sb.kalan_bakiye ELSE 0 END), 0) AS bakiye
         FROM musteri m
         LEFT JOIN satis_bakiye_view sb ON sb.musteri_id = m.id
         GROUP BY m.id
         ORDER BY m.ad_soyad ASC`
      )
      .all() as MusteriBakiyeSatiri[]
  },

  /**
   * 02.08.2026 performans ucu — Kontrol Paneli'nin "Toplam Açık Alacak" kutusu.
   * Eskiden TÜM müşteri satırları çekilip JS'te toplanıyordu; artık tek SUM.
   * `listeleBakiyeli()`'nin bakiye toplamıyla BİREBİR aynı sonucu verir
   * (aynı süzgeç: durum='acik'), backend testinde karşılaştırmayla doğrulanır.
   */
  toplamAcikAlacak(): number {
    const satir = db()
      .prepare(
        `SELECT COALESCE(SUM(kalan_bakiye), 0) AS toplam
         FROM satis_bakiye_view
         WHERE durum = 'acik'`
      )
      .get() as { toplam: number }
    return satir.toplam
  },

  /**
   * 02.08.2026 performans ucu — Kırmızı Liste'nin ham verisi TEK sorguda.
   * Eskiden `gecikmeService.kirmiziListe()` her müşteri için ayrı `acikSatislar`,
   * her satış için ayrı `bakiye`/`getirById`/`sonTahsilatTarihi` ve müşteri
   * başına bir de `toplamBakiye` çağırıyordu (müşteri sayısıyla doğrusal binlerce
   * sorgu → 25.000 müşteride ~3 sn, bkz. PROJE_DURUMU.md Böl.10 T6).
   *
   * Burada müşteri başına TEK satır döner:
   *  - `referans_tarih`: açık satışları arasındaki EN ESKİ referans tarih
   *    (o satışın son tahsilatı, hiç yoksa satış tarihi) — eski kodun
   *    "en gecikmiş satışın tarihi" değeriyle aynıdır: en eski referans zaten
   *    en çok gecikmiş olandır, yani biri gecikmişse minimum da gecikmiştir.
   *  - `kalan_bakiye`: `toplamBakiye()` ile AYNI alt sorgu (drift olmasın diye
   *    birebir aynı süzgeç: durum='acik').
   *
   * "30 gün" eşiği BURADA UYGULANMAZ — o kural `gecikmeService`'te tek yerde
   * kalır (Şartname 6.3, parametrik "bugün" ile test edilebilir).
   */
  gecikmeAdaylari(): GecikmeAdayiSatiri[] {
    return db()
      .prepare(
        `SELECT
           m.id AS musteri_id,
           m.ad_soyad,
           m.telefon,
           MIN(
             COALESCE(
               (SELECT MAX(t.tarih) FROM tahsilat t WHERE t.satis_id = sb.satis_id),
               s.tarih
             )
           ) AS referans_tarih,
           (SELECT COALESCE(SUM(v.kalan_bakiye), 0)
              FROM satis_bakiye_view v
             WHERE v.musteri_id = m.id AND v.durum = 'acik') AS kalan_bakiye
         FROM musteri m
         JOIN satis_bakiye_view sb ON sb.musteri_id = m.id
         JOIN satis s ON s.id = sb.satis_id
         WHERE sb.durum = 'acik' AND sb.kalan_bakiye > 0
         GROUP BY m.id`
      )
      .all() as GecikmeAdayiSatiri[]
  }
}
