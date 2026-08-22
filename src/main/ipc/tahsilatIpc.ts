import { ipcMain } from 'electron'
import { tahsilatService, type TahsilatSilSonucu, type TahsilatSonucu } from '../services'
import { guvenliCagri, type IpcSonuc } from './guvenliCagri'
import { oturumGerekli, sahipGerekli } from './yetki'

/** Herhangi bir oturum — çalışan tahsilat EKLEYEBİLİR (Şartname Böl.2). */
export function tahsilatEkleIsle(girdi: unknown): IpcSonuc<TahsilatSonucu> {
  return guvenliCagri('tahsilat:ekle', () => {
    oturumGerekli()
    return tahsilatService.ekle(girdi)
  })
}

/** SADECE sahip (Şartname Böl.2: çalışan silemez). */
export function tahsilatSilIsle(id: unknown): IpcSonuc<TahsilatSilSonucu> {
  return guvenliCagri('tahsilat:sil', () => {
    sahipGerekli()
    return tahsilatService.sil(id)
  })
}

export function tahsilatIpcKaydet(): void {
  ipcMain.handle('tahsilat:ekle', (_e, girdi) => tahsilatEkleIsle(girdi))
  ipcMain.handle('tahsilat:sil', (_e, id) => tahsilatSilIsle(id))
}
