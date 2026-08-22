import { KULLANICIYA_GOSTERILEBILIR_HATALAR } from '../hatalar'

/**
 * TUTARLI CEVAP BİÇİMİ — her IPC ucu bu zarfla döner, frontend'in işi
 * kolaylaşsın (bkz. dokumanlar/PROJE_DURUMU.md "Uzmanlık İlkeleri").
 */
export type IpcSonuc<T> =
  | { basarili: true; veri: T }
  | { basarili: false; hata: string }

/**
 * Her IPC handler'ı bu sarmalayıcıdan geçer. İki görevi var:
 *  1) Tutarlı zarf: {basarili:true, veri} / {basarili:false, hata}
 *  2) HATA SIZDIRMAMA: DogrulamaHatasi/YetkiHatasi/OturumGerekliHatasi/
 *     GirisBasarisizHatasi gibi "beklenen" hatalar kullanıcı dostu Türkçe
 *     mesajlarıyla olduğu gibi gösterilir. Bunların DIŞINDAKİ her şey (SQL
 *     hatası, beklenmeyen istisna) sade bir mesaja indirgenir; teknik detay
 *     yalnızca sunucu konsoluna (log) yazılır — kullanıcıya sistemin iç
 *     yapısı asla sızdırılmaz.
 */
export function guvenliCagri<T>(kanal: string, isle: () => T): IpcSonuc<T> {
  try {
    return { basarili: true, veri: isle() }
  } catch (hata) {
    const beklenenHataMi = KULLANICIYA_GOSTERILEBILIR_HATALAR.some((Sinif) => hata instanceof Sinif)
    if (beklenenHataMi) {
      return { basarili: false, hata: (hata as Error).message }
    }
    console.error(`[ipc:${kanal}] beklenmeyen hata:`, hata)
    return { basarili: false, hata: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' }
  }
}

/**
 * Async sürüm — dosya/dialog gibi Promise dönen işlemler için (Faz 5: CSV/
 * Excel dışa aktarma, `src/main/ipc/disaAktarmaIpc.ts`). Aynı hata sızdırmama
 * kuralı burada da geçerli; mantık kasıtlı olarak yukarıdakiyle birebir aynı
 * (ekstra soyutlama eklemeye değmeyecek kadar küçük bir kopya).
 */
export async function guvenliCagriAsync<T>(kanal: string, isle: () => Promise<T>): Promise<IpcSonuc<T>> {
  try {
    return { basarili: true, veri: await isle() }
  } catch (hata) {
    const beklenenHataMi = KULLANICIYA_GOSTERILEBILIR_HATALAR.some((Sinif) => hata instanceof Sinif)
    if (beklenenHataMi) {
      return { basarili: false, hata: (hata as Error).message }
    }
    console.error(`[ipc:${kanal}] beklenmeyen hata:`, hata)
    return { basarili: false, hata: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' }
  }
}
