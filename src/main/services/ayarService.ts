import { ayarRepo } from '../db/repositories'
import { DogrulamaHatasi } from '../hatalar'
import { zorunluMetin } from './dogrulama'

const DUKKAN_ADI_ANAHTARI = 'dukkan_adi'
const LOGO_ANAHTARI = 'logo'
const VARSAYILAN_DUKKAN_ADI = 'Dükkanım'

/** Renderer'a (Ayarlar ekranı + sol menü) dönen ayar görünümü. */
export interface AyarlarGorunumu {
  dukkanAdi: string
  /** Dükkan logosu — data URL (`data:image/...;base64,...`). Hiç yüklenmediyse null. */
  logo: string | null
}

/**
 * Ayarlar iş mantığı (Şartname 8.7). Şimdilik yalnızca dükkan adı; Faz 6'da
 * yedekleme ayarları (son yedek tarihi vb.) aynı `ayar` tablosuna yeni
 * anahtarlarla eklenebilir, yeni bir migration gerekmez. Rol yetkisi (yalnızca
 * sahip değiştirebilir) burada DEĞİL, src/main/ipc/ayarIpc.ts'te uygulanır —
 * "tek yerde main" kuralı (bkz. dokumanlar/MIMARI.md Böl.5).
 */
export const ayarService = {
  getir(): AyarlarGorunumu {
    const logo = ayarRepo.getir(LOGO_ANAHTARI)
    return {
      dukkanAdi: ayarRepo.getir(DUKKAN_ADI_ANAHTARI) ?? VARSAYILAN_DUKKAN_ADI,
      logo: logo && logo.length > 0 ? logo : null
    }
  },

  dukkanAdiGuncelle(deger: unknown): AyarlarGorunumu {
    const temiz = zorunluMetin(deger, 'Dükkan adı', 120)
    ayarRepo.set(DUKKAN_ADI_ANAHTARI, temiz)
    return ayarService.getir()
  },

  /** Logoyu data URL olarak saklar (biçim doğrulaması yapılır). Dosya seçimi/
   *  okuma ana süreçte (ayarIpc) yapılır; burada yalnızca değer doğrulanıp yazılır. */
  logoGuncelle(dataUrl: unknown): AyarlarGorunumu {
    if (typeof dataUrl !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(dataUrl)) {
      throw new DogrulamaHatasi('Geçersiz logo verisi.')
    }
    ayarRepo.set(LOGO_ANAHTARI, dataUrl)
    return ayarService.getir()
  },

  logoSil(): AyarlarGorunumu {
    ayarRepo.set(LOGO_ANAHTARI, '')
    return ayarService.getir()
  }
}
