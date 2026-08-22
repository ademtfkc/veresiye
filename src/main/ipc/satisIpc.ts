import { ipcMain } from 'electron'
import type { SatisRow } from '../db/types'
import { satisService, type KalemOnerileri, type SatisDetay } from '../services'
import { guvenliCagri, type IpcSonuc } from './guvenliCagri'
import { oturumGerekli, sahipGerekli } from './yetki'

/** Herhangi bir oturum — çalışan satış/devir EKLEYEBİLİR (Şartname Böl.2). */
export function satisEkleIsle(girdi: unknown): IpcSonuc<SatisDetay> {
  return guvenliCagri('satis:ekle', () => {
    oturumGerekli()
    return satisService.ekle(girdi)
  })
}

export function satisDevirEkleIsle(girdi: unknown): IpcSonuc<SatisDetay> {
  return guvenliCagri('satis:devirEkle', () => {
    oturumGerekli()
    return satisService.devirEkle(girdi)
  })
}

export function satisGetirIsle(id: unknown): IpcSonuc<SatisDetay> {
  return guvenliCagri('satis:getir', () => {
    oturumGerekli()
    return satisService.getir(id)
  })
}

/**
 * 02.08.2026 — Yeni Satış tablosundaki "Oda"/"Model-Kumaş" kutularının otomatik
 * önerileri. Herkes: veri DEĞİŞTİRMEZ, sadece daha önce girilenleri okur.
 */
export function satisOnerilerIsle(): IpcSonuc<KalemOnerileri> {
  return guvenliCagri('satis:oneriler', () => {
    oturumGerekli()
    return satisService.oneriler()
  })
}

export function satisMusteriyeGoreListeleIsle(musteriId: unknown): IpcSonuc<SatisRow[]> {
  return guvenliCagri('satis:musteriyeGoreListele', () => {
    oturumGerekli()
    return satisService.musteriyeGoreListele(musteriId)
  })
}

/** SADECE sahip (Şartname Böl.2: çalışan düzenleyemez). */
export function satisGuncelleIsle(id: unknown, girdi: unknown): IpcSonuc<SatisDetay> {
  return guvenliCagri('satis:guncelle', () => {
    sahipGerekli()
    return satisService.guncelle(id, girdi)
  })
}

/** SADECE sahip (Şartname Böl.2: çalışan silemez). */
export function satisSilIsle(id: unknown): IpcSonuc<{ silindi: true }> {
  return guvenliCagri('satis:sil', () => {
    sahipGerekli()
    return satisService.sil(id)
  })
}

export function satisIpcKaydet(): void {
  ipcMain.handle('satis:ekle', (_e, girdi) => satisEkleIsle(girdi))
  ipcMain.handle('satis:devirEkle', (_e, girdi) => satisDevirEkleIsle(girdi))
  ipcMain.handle('satis:getir', (_e, id) => satisGetirIsle(id))
  ipcMain.handle('satis:oneriler', () => satisOnerilerIsle())
  ipcMain.handle('satis:musteriyeGoreListele', (_e, musteriId) => satisMusteriyeGoreListeleIsle(musteriId))
  ipcMain.handle('satis:guncelle', (_e, id, girdi) => satisGuncelleIsle(id, girdi))
  ipcMain.handle('satis:sil', (_e, id) => satisSilIsle(id))
}
