import { ipcMain } from 'electron'
import type { MusteriBakiyeSatiri, MusteriRow } from '../db/types'
import { musteriService } from '../services'
import { guvenliCagri, type IpcSonuc } from './guvenliCagri'
import { oturumGerekli, sahipGerekli } from './yetki'

export function musteriListeleIsle(): IpcSonuc<MusteriRow[]> {
  return guvenliCagri('musteri:listele', () => {
    oturumGerekli()
    return musteriService.listele()
  })
}

/**
 * Faz 4 performans ucu (bkz. PROJE_DURUMU.md Böl.10) — Müşteriler ekranı ve
 * Kontrol Paneli, müşteri başına ayrı IPC çağrısı yapmak yerine tüm müşteri +
 * bakiye listesini TEK çağrıda alır (~1000 müşteride hızlı kalsın diye).
 */
export function musteriListeleBakiyeliIsle(): IpcSonuc<MusteriBakiyeSatiri[]> {
  return guvenliCagri('musteri:listeleBakiyeli', () => {
    oturumGerekli()
    return musteriService.listeleBakiyeli()
  })
}

export function musteriAraIsle(sorgu: unknown): IpcSonuc<MusteriRow[]> {
  return guvenliCagri('musteri:ara', () => {
    oturumGerekli()
    return musteriService.ara(sorgu)
  })
}

export function musteriGetirIsle(id: unknown): IpcSonuc<MusteriRow> {
  return guvenliCagri('musteri:getir', () => {
    oturumGerekli()
    return musteriService.getir(id)
  })
}

/**
 * Herhangi bir oturum (sahip VEYA çalışan) ekleyebilir — Şartname 8.4'te
 * "Yeni Satış" ekranı müşteri seçimi VEYA anında yeni müşteri oluşturmayı
 * aynı akışta sunuyor; çalışan satış girebildiği için bu akışın bir parçası
 * olan müşteri eklemeyi de yapabilmeli (bkz. PROJE_DURUMU.md Karar Kaydı).
 */
export function musteriEkleIsle(girdi: unknown): IpcSonuc<MusteriRow> {
  return guvenliCagri('musteri:ekle', () => {
    oturumGerekli()
    return musteriService.ekle(girdi)
  })
}

/** SADECE sahip (Şartname Böl.2: çalışan düzenleyemez). */
export function musteriGuncelleIsle(id: unknown, girdi: unknown): IpcSonuc<MusteriRow> {
  return guvenliCagri('musteri:guncelle', () => {
    sahipGerekli()
    return musteriService.guncelle(id, girdi)
  })
}

/** SADECE sahip (Şartname Böl.2: çalışan silemez). */
export function musteriSilIsle(id: unknown): IpcSonuc<{ silindi: true }> {
  return guvenliCagri('musteri:sil', () => {
    sahipGerekli()
    return musteriService.sil(id)
  })
}

export function musteriIpcKaydet(): void {
  ipcMain.handle('musteri:listele', () => musteriListeleIsle())
  ipcMain.handle('musteri:listeleBakiyeli', () => musteriListeleBakiyeliIsle())
  ipcMain.handle('musteri:ara', (_e, sorgu) => musteriAraIsle(sorgu))
  ipcMain.handle('musteri:getir', (_e, id) => musteriGetirIsle(id))
  ipcMain.handle('musteri:ekle', (_e, girdi) => musteriEkleIsle(girdi))
  ipcMain.handle('musteri:guncelle', (_e, id, girdi) => musteriGuncelleIsle(id, girdi))
  ipcMain.handle('musteri:sil', (_e, id) => musteriSilIsle(id))
}
