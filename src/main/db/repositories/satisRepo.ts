import type Database from 'better-sqlite3'
import { getDb } from '../connection'
import type { SatisBakiye, SatisGuncelleme, SatisRow, YeniSatis } from '../types'

function db(): Database.Database {
  return getDb()
}

/**
 * Satış / devir kayıtları. TÜM SQL burada (bkz. musteriRepo başlığı).
 * Satış toplamı bir sütun DEĞİLDİR; perde_kalemi'nden (veya devir kaydında
 * devir_tutari'ndan) satis_bakiye_view ile canlı hesaplanır.
 */
export const satisRepo = {
  ekle(input: YeniSatis): SatisRow {
    const sonuc = db()
      .prepare(
        `INSERT INTO satis (musteri_id, tarih, aciklama, tip, devir_tutari, elle_toplam, durum)
         VALUES (@musteri_id, @tarih, @aciklama, @tip, @devir_tutari, @elle_toplam, 'acik')`
      )
      .run({
        musteri_id: input.musteri_id,
        tarih: input.tarih,
        aciklama: input.aciklama ?? null,
        tip: input.tip,
        // CHECK kısıtı: tip='satis' iken devir_tutari NULL olmalı.
        devir_tutari: input.tip === 'devir' ? (input.devir_tutari ?? 0) : null,
        // Elle toplam yalnızca normal satışta anlamlı; devirde toplam zaten devir_tutari.
        elle_toplam: input.tip === 'satis' ? (input.elle_toplam ?? null) : null
      })
    return satisRepo.getirById(Number(sonuc.lastInsertRowid))!
  },

  getirById(id: number): SatisRow | undefined {
    return db().prepare('SELECT * FROM satis WHERE id = ?').get(id) as SatisRow | undefined
  },

  /** Bir müşterinin tüm satışları (açık+kapalı), en yeni önce. */
  musteriyeGoreListele(musteriId: number): SatisRow[] {
    return db()
      .prepare('SELECT * FROM satis WHERE musteri_id = ? ORDER BY tarih DESC, id DESC')
      .all(musteriId) as SatisRow[]
  },

  /** Tahsilat Ekle ekranında "hangisine ödeme yapıldı" seçimi için. */
  acikSatislar(musteriId: number): SatisRow[] {
    return db()
      .prepare("SELECT * FROM satis WHERE musteri_id = ? AND durum = 'acik' ORDER BY tarih ASC")
      .all(musteriId) as SatisRow[]
  },

  guncelle(id: number, patch: SatisGuncelleme): void {
    const mevcut = satisRepo.getirById(id)
    if (!mevcut) throw new Error(`Satış bulunamadı: ${id}`)

    db()
      .prepare(
        `UPDATE satis SET
           tarih = @tarih,
           aciklama = @aciklama,
           devir_tutari = @devir_tutari,
           elle_toplam = @elle_toplam
         WHERE id = @id`
      )
      .run({
        id,
        tarih: patch.tarih ?? mevcut.tarih,
        aciklama: patch.aciklama !== undefined ? patch.aciklama : mevcut.aciklama,
        devir_tutari:
          mevcut.tip === 'devir' ? (patch.devir_tutari ?? mevcut.devir_tutari) : null,
        // `undefined` = "dokunma" (mevcut korunur), `null` = "elle toplamı KALDIR"
        // (toplam yine kalemlerden hesaplanır). Devirde her zaman NULL.
        elle_toplam:
          mevcut.tip !== 'satis'
            ? null
            : patch.elle_toplam !== undefined
              ? patch.elle_toplam
              : mevcut.elle_toplam
      })
    satisRepo.durumuTazele(id)
  },

  /** ON DELETE CASCADE: kalemler ve tahsilatlar da gider. */
  sil(id: number): void {
    db().prepare('DELETE FROM satis WHERE id = ?').run(id)
  },

  /**
   * Canlı bakiye — Şartname 6.1 formülü:
   *   Satış Toplamı = perde kalemleri satir_tutarı toplamı (devirde devir_tutari)
   *   Ödenen        = tahsilatlar toplamı
   *   Kalan         = Toplam − Ödenen
   * Hiçbir yerde saklanmaz, satis_bakiye_view'dan her seferinde okunur.
   */
  bakiye(satisId: number): SatisBakiye | undefined {
    return db()
      .prepare('SELECT * FROM satis_bakiye_view WHERE satis_id = ?')
      .get(satisId) as SatisBakiye | undefined
  },

  /**
   * Şartname 6.2: kalan bakiye 0 veya altına düşünce satış otomatik
   * 'kapandi' olur; kalan tekrar pozitife dönerse (ör. bir tahsilat silinirse)
   * 'acik'a geri döner. perdeKalemiRepo/tahsilatRepo her yazmadan sonra bunu
   * çağırır — durum asla elle set edilmez.
   */
  durumuTazele(satisId: number): void {
    const bakiye = satisRepo.bakiye(satisId)
    if (!bakiye) return
    const yeniDurum = bakiye.kalan_bakiye <= 0 ? 'kapandi' : 'acik'
    db().prepare('UPDATE satis SET durum = ? WHERE id = ?').run(yeniDurum, satisId)
  }
}
