import type Database from 'better-sqlite3'
import { getDb } from '../connection'
import { satisRepo } from './satisRepo'
import type { PerdeKalemiGuncelleme, PerdeKalemiRow, YeniPerdeKalemi } from '../types'

function db(): Database.Database {
  return getDb()
}

/**
 * Perde ölçü satırları. satir_tutari artık ELLE girilir (kullanıcı satır
 * tutarını doğrudan yazar; en/boy sadece bilgi amaçlı, opsiyonel). Bir satış
 * toplamı değiştiği için her ekle/güncelle/sil sonrası satışın durumu
 * (açık/kapandı) yeniden değerlendirilir.
 */
export const perdeKalemiRepo = {
  ekle(input: YeniPerdeKalemi): PerdeKalemiRow {
    const sonuc = db()
      .prepare(
        `INSERT INTO perde_kalemi (satis_id, oda, model_kumas, en, boy, adet, satir_tutari)
         VALUES (@satis_id, @oda, @model_kumas, @en, @boy, @adet, @satir_tutari)`
      )
      .run({
        satis_id: input.satis_id,
        oda: input.oda ?? null,
        model_kumas: input.model_kumas ?? null,
        en: input.en ?? null,
        boy: input.boy ?? null,
        adet: input.adet,
        satir_tutari: input.satir_tutari
      })
    const kalem = perdeKalemiRepo.getirById(Number(sonuc.lastInsertRowid))!
    satisRepo.durumuTazele(input.satis_id)
    return kalem
  },

  getirById(id: number): PerdeKalemiRow | undefined {
    return db().prepare('SELECT * FROM perde_kalemi WHERE id = ?').get(id) as
      | PerdeKalemiRow
      | undefined
  },

  /**
   * 02.08.2026 — Yeni Satış tablosundaki "Oda" ve "Model/Kumaş" kutularına
   * otomatik öneri (CEO isteği: "bir kere yazılınca hafızaya kaydedilsin").
   *
   * Ayrı bir "öneri listesi" tablosu AÇILMADI: öneriler zaten girilmiş
   * kalemlerden okunur — yeni bir kayıt girildiği anda öneri de doğmuş olur,
   * bakım gerektirmez (CEO kararı: "kendiliğinden öğrensin").
   *
   * Sıralama ÖNCE kullanım sayısına göre (en çok yazılan üstte), sonra alfabetik.
   * Boş/sadece boşluk olan değerler elenir. `LIMIT` ile üst sınır konur —
   * öneri kutusu yüzlerce satırla şişmesin (en çok kullanılanlar zaten üstte).
   */
  oneriler(sutun: 'oda' | 'model_kumas', ustSinir = 200): string[] {
    // Sütun adı SABİT bir birleşim tipinden geliyor (kullanıcı girdisi DEĞİL),
    // parametre olarak bağlanamaz — SQL enjeksiyon riski yok.
    const satirlar = db()
      .prepare(
        `SELECT TRIM(${sutun}) AS deger, COUNT(*) AS adet
           FROM perde_kalemi
          WHERE ${sutun} IS NOT NULL AND TRIM(${sutun}) <> ''
          GROUP BY LOWER(TRIM(${sutun}))
          ORDER BY adet DESC, deger COLLATE NOCASE ASC
          LIMIT ?`
      )
      .all(ustSinir) as { deger: string; adet: number }[]
    return satirlar.map((s) => s.deger)
  },

  satisaGoreListele(satisId: number): PerdeKalemiRow[] {
    return db()
      .prepare('SELECT * FROM perde_kalemi WHERE satis_id = ? ORDER BY id ASC')
      .all(satisId) as PerdeKalemiRow[]
  },

  guncelle(id: number, patch: PerdeKalemiGuncelleme): void {
    const mevcut = perdeKalemiRepo.getirById(id)
    if (!mevcut) throw new Error(`Perde kalemi bulunamadı: ${id}`)

    db()
      .prepare(
        `UPDATE perde_kalemi SET
           oda = @oda,
           model_kumas = @model_kumas,
           en = @en,
           boy = @boy,
           adet = @adet,
           satir_tutari = @satir_tutari
         WHERE id = @id`
      )
      .run({
        id,
        oda: patch.oda !== undefined ? patch.oda : mevcut.oda,
        model_kumas: patch.model_kumas !== undefined ? patch.model_kumas : mevcut.model_kumas,
        en: patch.en !== undefined ? patch.en : mevcut.en,
        boy: patch.boy !== undefined ? patch.boy : mevcut.boy,
        adet: patch.adet ?? mevcut.adet,
        satir_tutari: patch.satir_tutari ?? mevcut.satir_tutari
      })
    satisRepo.durumuTazele(mevcut.satis_id)
  },

  sil(id: number): void {
    const kalem = perdeKalemiRepo.getirById(id)
    db().prepare('DELETE FROM perde_kalemi WHERE id = ?').run(id)
    if (kalem) satisRepo.durumuTazele(kalem.satis_id)
  }
}
