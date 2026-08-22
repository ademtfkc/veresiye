import { ipcMain } from 'electron'
import { authService, type GuvenliKullanici, type OturumBilgisi } from '../auth'
import { guvenliCagri, type IpcSonuc } from './guvenliCagri'
import { sahipGerekli } from './yetki'

/**
 * Her `*Isle` fonksiyonu, gerçek iş mantığını (yetki kontrolü DAHİL) taşır ve
 * hiçbir Electron bağımlılığı olmadan doğrudan çağrılabilir/test edilebilir
 * (bkz. scripts/backend-test.ts). `*IpcKaydet` bunları gerçek `ipcMain`
 * kanallarına bağlar — üretimde çalışan kod ile test edilen kod BİREBİR
 * aynıdır, ayrı bir "test kopyası" yoktur.
 */

export function authIlkKurulumGerekliMiIsle(): IpcSonuc<boolean> {
  return guvenliCagri('auth:ilkKurulumGerekliMi', () => authService.ilkKurulumGerekliMi())
}

export function authIlkSahipOlusturIsle(kullaniciAdi: unknown, sifre: unknown): IpcSonuc<GuvenliKullanici> {
  return guvenliCagri('auth:ilkSahipOlustur', () => authService.ilkSahipOlustur(kullaniciAdi, sifre))
}

export function authGirisYapIsle(kullaniciAdi: unknown, sifre: unknown): IpcSonuc<GuvenliKullanici> {
  return guvenliCagri('auth:girisYap', () => authService.girisYap(kullaniciAdi, sifre))
}

export function authCikisYapIsle(): IpcSonuc<{ basarili: true }> {
  return guvenliCagri('auth:cikisYap', () => {
    authService.cikisYap()
    return { basarili: true as const }
  })
}

export function authAktifOturumIsle(): IpcSonuc<OturumBilgisi | null> {
  return guvenliCagri('auth:aktifOturum', () => authService.aktifOturum())
}

/** SADECE sahip. */
export function authKullaniciOlusturIsle(
  kullaniciAdi: unknown,
  sifre: unknown,
  rol: unknown
): IpcSonuc<GuvenliKullanici> {
  return guvenliCagri('auth:kullaniciOlustur', () => {
    sahipGerekli()
    return authService.kullaniciOlustur(kullaniciAdi, sifre, rol)
  })
}

/** SADECE sahip — Şartname Böl.2: "Dükkan Sahibi çalışan şifresini sıfırlayabilmeli." */
export function authSifreSifirlaIsle(kullaniciId: unknown, yeniSifre: unknown): IpcSonuc<{ basarili: true }> {
  return guvenliCagri('auth:sifreSifirla', () => {
    sahipGerekli()
    authService.sifreSifirla(kullaniciId, yeniSifre)
    return { basarili: true as const }
  })
}

/** SADECE sahip. */
export function authKullanicilariListeleIsle(): IpcSonuc<GuvenliKullanici[]> {
  return guvenliCagri('auth:kullanicilariListele', () => {
    sahipGerekli()
    return authService.kullanicilariListele()
  })
}

export function authIpcKaydet(): void {
  ipcMain.handle('auth:ilkKurulumGerekliMi', () => authIlkKurulumGerekliMiIsle())
  ipcMain.handle('auth:ilkSahipOlustur', (_e, kullaniciAdi, sifre) =>
    authIlkSahipOlusturIsle(kullaniciAdi, sifre)
  )
  ipcMain.handle('auth:girisYap', (_e, kullaniciAdi, sifre) => authGirisYapIsle(kullaniciAdi, sifre))
  ipcMain.handle('auth:cikisYap', () => authCikisYapIsle())
  ipcMain.handle('auth:aktifOturum', () => authAktifOturumIsle())
  ipcMain.handle('auth:kullaniciOlustur', (_e, kullaniciAdi, sifre, rol) =>
    authKullaniciOlusturIsle(kullaniciAdi, sifre, rol)
  )
  ipcMain.handle('auth:sifreSifirla', (_e, kullaniciId, yeniSifre) =>
    authSifreSifirlaIsle(kullaniciId, yeniSifre)
  )
  ipcMain.handle('auth:kullanicilariListele', () => authKullanicilariListeleIsle())
}
