import { dialog, ipcMain } from 'electron'
import { readFileSync, statSync } from 'node:fs'
import { extname } from 'node:path'
import { DogrulamaHatasi } from '../hatalar'
import { ayarService, type AyarlarGorunumu } from '../services'
import { guvenliCagri, guvenliCagriAsync, type IpcSonuc } from './guvenliCagri'
import { oturumGerekli, sahipGerekli } from './yetki'

/** Logo dosyası üst sınırı — data URL olarak DB'de saklandığı için makul tutuldu. */
const LOGO_MAKS_BAYT = 2 * 1024 * 1024 // 2 MB

/** Logo yükleme sonucu — bridge.ts/preload.ts ile paylaşılır. */
export interface AyarLogoYukleSonucu {
  iptal: boolean
  ayarlar?: AyarlarGorunumu
}

/** Herhangi bir oturum görebilir — dükkan adı + logo sol menüde herkese görünür. */
export function ayarGetirIsle(): IpcSonuc<AyarlarGorunumu> {
  return guvenliCagri('ayar:getir', () => {
    oturumGerekli()
    return ayarService.getir()
  })
}

/** SADECE sahip (Şartname 8.7: Ayarlar ekranı Dükkan Sahibi'ne özel). */
export function ayarDukkanAdiGuncelleIsle(deger: unknown): IpcSonuc<AyarlarGorunumu> {
  return guvenliCagri('ayar:dukkanAdiGuncelle', () => {
    sahipGerekli()
    return ayarService.dukkanAdiGuncelle(deger)
  })
}

/**
 * Logo yükle (SADECE sahip). Native "Resim Seç" penceresi açar, seçilen
 * görseli okur, data URL'e çevirip `ayar` tablosuna yazar. Dosya/dialog/fs
 * işleri SADECE burada (main süreç) — renderer'ın fs erişimi yok.
 */
export function ayarLogoYukleIsle(): Promise<IpcSonuc<AyarLogoYukleSonucu>> {
  return guvenliCagriAsync('ayar:logoYukle', async () => {
    sahipGerekli()
    const sonuc = await dialog.showOpenDialog({
      title: 'Dükkan Logosu Seç',
      properties: ['openFile'],
      filters: [{ name: 'Resim', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
    })
    if (sonuc.canceled || sonuc.filePaths.length === 0) return { iptal: true }
    const yol = sonuc.filePaths[0]
    if (statSync(yol).size > LOGO_MAKS_BAYT) {
      throw new DogrulamaHatasi('Logo dosyası çok büyük (en fazla 2 MB). Lütfen daha küçük bir görsel seçin.')
    }
    const uzanti = extname(yol).slice(1).toLowerCase()
    const mime = uzanti === 'jpg' ? 'jpeg' : uzanti
    const veri = readFileSync(yol).toString('base64')
    const ayarlar = ayarService.logoGuncelle(`data:image/${mime};base64,${veri}`)
    return { iptal: false, ayarlar }
  })
}

/** Logoyu kaldır (SADECE sahip). */
export function ayarLogoSilIsle(): IpcSonuc<AyarlarGorunumu> {
  return guvenliCagri('ayar:logoSil', () => {
    sahipGerekli()
    return ayarService.logoSil()
  })
}

export function ayarIpcKaydet(): void {
  ipcMain.handle('ayar:getir', () => ayarGetirIsle())
  ipcMain.handle('ayar:dukkanAdiGuncelle', (_e, deger) => ayarDukkanAdiGuncelleIsle(deger))
  ipcMain.handle('ayar:logoYukle', () => ayarLogoYukleIsle())
  ipcMain.handle('ayar:logoSil', () => ayarLogoSilIsle())
}
