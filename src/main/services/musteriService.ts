import { musteriRepo } from '../db/repositories'
import type { MusteriBakiyeSatiri, MusteriGuncelleme, MusteriRow, YeniMusteri } from '../db/types'
import { DogrulamaHatasi } from '../hatalar'
import { idDogrula, nesneDogrula, opsiyonelMetin, zorunluMetin } from './dogrulama'

function musteriGirdisiniAyristir(girdi: unknown): YeniMusteri {
  const g = nesneDogrula(girdi, 'Müşteri')
  return {
    ad_soyad: zorunluMetin(g.ad_soyad, 'Ad soyad', 200),
    telefon: opsiyonelMetin(g.telefon, 'Telefon', 30),
    adres: opsiyonelMetin(g.adres, 'Adres', 500),
    not: opsiyonelMetin(g.not, 'Not', 1000)
  }
}

function musteriGuncellemeGirdisiniAyristir(girdi: unknown): MusteriGuncelleme {
  const g = nesneDogrula(girdi, 'Müşteri')
  const patch: MusteriGuncelleme = {}
  if (g.ad_soyad !== undefined) patch.ad_soyad = zorunluMetin(g.ad_soyad, 'Ad soyad', 200)
  if (g.telefon !== undefined) patch.telefon = opsiyonelMetin(g.telefon, 'Telefon', 30)
  if (g.adres !== undefined) patch.adres = opsiyonelMetin(g.adres, 'Adres', 500)
  if (g.not !== undefined) patch.not = opsiyonelMetin(g.not, 'Not', 1000)
  return patch
}

/**
 * Müşteri iş mantığı — TÜM SQL musteriRepo'da (bkz. db/repositories).
 * Bu katman yalnızca girdiyi doğrular ve repo'yu çağırır. Rol yetkisi
 * (güncelle/sil yalnızca sahip) burada DEĞİL, src/main/ipc/musteriIpc.ts'te
 * uygulanır — "tek yerde main" kuralı (bkz. dokumanlar/MIMARI.md Böl.5).
 */
export const musteriService = {
  listele(): MusteriRow[] {
    return musteriRepo.listele()
  },

  /** Faz 4 performans ucu — tüm müşteriler + bakiyeleri TEK sorguda (bkz. musteriRepo.listeleBakiyeli). */
  listeleBakiyeli(): MusteriBakiyeSatiri[] {
    return musteriRepo.listeleBakiyeli()
  },

  /** Boş sorgu → tüm liste (arama kutusu temizlenince "0 sonuç" görünmesin). */
  ara(sorguGirdi: unknown): MusteriRow[] {
    if (typeof sorguGirdi !== 'string') throw new DogrulamaHatasi('Arama sorgusu geçersiz.')
    const temiz = sorguGirdi.trim()
    return temiz.length === 0 ? musteriRepo.listele() : musteriRepo.ara(temiz)
  },

  getir(idGirdi: unknown): MusteriRow {
    const id = idDogrula(idGirdi, 'Müşteri')
    const musteri = musteriRepo.getirById(id)
    if (!musteri) throw new DogrulamaHatasi('Müşteri bulunamadı.')
    return musteri
  },

  ekle(girdi: unknown): MusteriRow {
    return musteriRepo.ekle(musteriGirdisiniAyristir(girdi))
  },

  guncelle(idGirdi: unknown, girdi: unknown): MusteriRow {
    const id = idDogrula(idGirdi, 'Müşteri')
    if (!musteriRepo.getirById(id)) throw new DogrulamaHatasi('Müşteri bulunamadı.')
    musteriRepo.guncelle(id, musteriGuncellemeGirdisiniAyristir(girdi))
    return musteriRepo.getirById(id)!
  },

  /** DİKKAT: CASCADE — müşteriye ait tüm satış/kalem/tahsilat de silinir (bkz. musteriRepo.sil). */
  sil(idGirdi: unknown): { silindi: true } {
    const id = idDogrula(idGirdi, 'Müşteri')
    if (!musteriRepo.getirById(id)) throw new DogrulamaHatasi('Müşteri bulunamadı.')
    musteriRepo.sil(id)
    return { silindi: true }
  }
}
