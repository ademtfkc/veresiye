import { satisRepo, tahsilatRepo } from '../db/repositories'
import type { SatisDurumu, TahsilatRow } from '../db/types'
import { DogrulamaHatasi } from '../hatalar'
import { idDogrula, kurusDogrula, nesneDogrula, odemeSekliDogrula, opsiyonelMetin, tarihDogrula } from './dogrulama'

/** Tahsilat eklendikten sonra ekrana basılacak "Kalan bakiye: X" bilgisiyle birlikte (Şartname 8.6). */
export interface TahsilatSonucu {
  tahsilat: TahsilatRow
  kalanBakiye: number // kuruş — negatifse fazla ödeme, ENGELLENMEZ
  durum: SatisDurumu
}

export interface TahsilatSilSonucu {
  silindi: true
  satisId: number
  kalanBakiye: number
  durum: SatisDurumu
}

/**
 * Tahsilat iş mantığı. TÜM SQL tahsilatRepo'da. Kapanış (Şartname 6.2) repo
 * katmanında otomatik tazelenir (durumuTazele) — burada tekrar hesaplanmaz,
 * yalnızca güncel bakiye okunup dönülür. Fazla ödeme burada da ENGELLENMEZ;
 * yalnızca tutar>0 olması zorunlu (kurusDogrula sıfırı reddeder).
 */
export const tahsilatService = {
  ekle(girdi: unknown): TahsilatSonucu {
    const g = nesneDogrula(girdi, 'Tahsilat')
    const satisId = idDogrula(g.satis_id, 'Satış')
    if (!satisRepo.getirById(satisId)) throw new DogrulamaHatasi('Satış bulunamadı.')

    const tarih = tarihDogrula(g.tarih)
    const tutar = kurusDogrula(g.tutar, 'Tutar', false)
    const odemeSekli = odemeSekliDogrula(g.odeme_sekli)
    const not = opsiyonelMetin(g.not, 'Not', 500)

    const tahsilat = tahsilatRepo.ekle({ satis_id: satisId, tarih, tutar, odeme_sekli: odemeSekli, not })
    const bakiye = satisRepo.bakiye(satisId)!
    return { tahsilat, kalanBakiye: bakiye.kalan_bakiye, durum: bakiye.durum }
  },

  sil(idGirdi: unknown): TahsilatSilSonucu {
    const id = idDogrula(idGirdi, 'Tahsilat')
    const mevcut = tahsilatRepo.getirById(id)
    if (!mevcut) throw new DogrulamaHatasi('Tahsilat bulunamadı.')
    tahsilatRepo.sil(id)
    const bakiye = satisRepo.bakiye(mevcut.satis_id)!
    return { silindi: true, satisId: mevcut.satis_id, kalanBakiye: bakiye.kalan_bakiye, durum: bakiye.durum }
  }
}
