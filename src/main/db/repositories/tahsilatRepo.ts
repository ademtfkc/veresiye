import type Database from 'better-sqlite3'
import { getDb } from '../connection'
import { satisRepo } from './satisRepo'
import type { TahsilatGuncelleme, TahsilatRow, YeniTahsilat } from '../types'

function db(): Database.Database {
  return getDb()
}

/**
 * Tahsilatlar (peşinat dahil her ödeme — ayrı bir "peşinat" alanı yok,
 * Şartname 5.4/5.5). Her ekle/güncelle/sil sonrası ilgili satışın bakiyesi
 * değiştiği için durum (açık/kapandı) yeniden değerlendirilir.
 */
export const tahsilatRepo = {
  ekle(input: YeniTahsilat): TahsilatRow {
    const sonuc = db()
      .prepare(
        `INSERT INTO tahsilat (satis_id, tarih, tutar, odeme_sekli, "not")
         VALUES (@satis_id, @tarih, @tutar, @odeme_sekli, @not)`
      )
      .run({
        satis_id: input.satis_id,
        tarih: input.tarih,
        tutar: input.tutar,
        odeme_sekli: input.odeme_sekli,
        not: input.not ?? null
      })
    const tahsilat = tahsilatRepo.getirById(Number(sonuc.lastInsertRowid))!
    satisRepo.durumuTazele(input.satis_id)
    return tahsilat
  },

  getirById(id: number): TahsilatRow | undefined {
    return db().prepare('SELECT * FROM tahsilat WHERE id = ?').get(id) as TahsilatRow | undefined
  },

  satisaGoreListele(satisId: number): TahsilatRow[] {
    return db()
      .prepare('SELECT * FROM tahsilat WHERE satis_id = ? ORDER BY tarih ASC, id ASC')
      .all(satisId) as TahsilatRow[]
  },

  /**
   * 02.08.2026 performans ucu — Kontrol Paneli'nin "Bu Ay Tahsil Edilen" kutusu.
   * Eskiden panelService tüm müşterileri → satışlarını → tahsilatlarını tek tek
   * çekip JS'te süzüyordu (müşteri sayısıyla doğrusal binlerce sorgu, bkz.
   * PROJE_DURUMU.md Böl.10 T6). Artık tek SUM: tarih aralığı SQL'de süzülüyor.
   * Her tahsilat zaten bir satışa, her satış bir müşteriye bağlı olduğundan
   * sonuç eski döngünün toplamıyla birebir aynıdır (backend testinde doğrulanır).
   */
  donemToplami(baslangic: string, bitis: string): number {
    const satir = db()
      .prepare(
        `SELECT COALESCE(SUM(tutar), 0) AS toplam
         FROM tahsilat
         WHERE tarih >= @baslangic AND tarih <= @bitis`
      )
      .get({ baslangic, bitis }) as { toplam: number }
    return satir.toplam
  },

  /** Gecikme kuralı (Şartname 6.3) için: bu satışa yapılan son ödemenin tarihi. */
  sonTahsilatTarihi(satisId: number): string | undefined {
    const satir = db()
      .prepare(
        'SELECT tarih FROM tahsilat WHERE satis_id = ? ORDER BY tarih DESC, id DESC LIMIT 1'
      )
      .get(satisId) as { tarih: string } | undefined
    return satir?.tarih
  },

  guncelle(id: number, patch: TahsilatGuncelleme): void {
    const mevcut = tahsilatRepo.getirById(id)
    if (!mevcut) throw new Error(`Tahsilat bulunamadı: ${id}`)

    db()
      .prepare(
        `UPDATE tahsilat SET
           tarih = @tarih,
           tutar = @tutar,
           odeme_sekli = @odeme_sekli,
           "not" = @not
         WHERE id = @id`
      )
      .run({
        id,
        tarih: patch.tarih ?? mevcut.tarih,
        tutar: patch.tutar ?? mevcut.tutar,
        odeme_sekli: patch.odeme_sekli ?? mevcut.odeme_sekli,
        not: patch.not !== undefined ? patch.not : mevcut.not
      })
    satisRepo.durumuTazele(mevcut.satis_id)
  },

  sil(id: number): void {
    const tahsilat = tahsilatRepo.getirById(id)
    db().prepare('DELETE FROM tahsilat WHERE id = ?').run(id)
    if (tahsilat) satisRepo.durumuTazele(tahsilat.satis_id)
  }
}
