import { musteriRepo, satisRepo } from '../db/repositories'
import type { SatisBakiye } from '../db/types'
import { DogrulamaHatasi } from '../hatalar'
import { idDogrula } from './dogrulama'

/**
 * İnce bir sarmalayıcı (thin wrapper). Asıl bakiye hesabı zaten
 * satis_bakiye_view üzerinde CANLI çözülü (Şartname 6.1: "asla elle
 * girilmez"); satisRepo.bakiye()/musteriRepo.toplamBakiye() bunu okur.
 * Satış kapanışı (6.2) da repo katmanında otomatik (perdeKalemiRepo /
 * tahsilatRepo her yazmadan sonra durumuTazele çağırıyor) — burada TEKRAR
 * hesaplanmaz, sadece güncel durum okunup dönülür.
 */
export const bakiyeService = {
  satisBakiyesi(satisIdGirdi: unknown): SatisBakiye {
    const satisId = idDogrula(satisIdGirdi, 'Satış')
    const bakiye = satisRepo.bakiye(satisId)
    if (!bakiye) throw new DogrulamaHatasi('Satış bulunamadı.')
    return bakiye
  },

  /** Müşteri Kartı üst bölümü (Şartname 8.3): büyük puntoyla toplam kalan bakiye. */
  musteriBakiyesi(musteriIdGirdi: unknown): { musteriId: number; kalanBakiye: number } {
    const musteriId = idDogrula(musteriIdGirdi, 'Müşteri')
    if (!musteriRepo.getirById(musteriId)) throw new DogrulamaHatasi('Müşteri bulunamadı.')
    return { musteriId, kalanBakiye: musteriRepo.toplamBakiye(musteriId) }
  }
}
