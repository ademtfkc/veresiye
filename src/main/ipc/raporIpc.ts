import { ipcMain } from 'electron'
import { raporService } from '../services'
import type { AcikBakiyeRaporu, EkstreRaporu, GecikenRaporu, KasaRaporu } from '../services'
import { guvenliCagri, type IpcSonuc } from './guvenliCagri'
import { oturumGerekli } from './yetki'

/**
 * Raporlar (Şartname Böl.9) — HERKES görebilir (sahip VEYA çalışan); hiçbir
 * uç veri DEĞİŞTİRMEZ (salt okunur), bu yüzden `sahipGerekli()` yok — bkz.
 * dokumanlar/GEREKSINIMLER.md Böl.2 "raporları görebilir ama değiştiremez".
 */

export function raporAcikBakiyeIsle(baslangic: unknown, bitis: unknown): IpcSonuc<AcikBakiyeRaporu> {
  return guvenliCagri('rapor:acikBakiye', () => {
    oturumGerekli()
    return raporService.acikBakiye(baslangic, bitis)
  })
}

export function raporKasaIsle(baslangic: unknown, bitis: unknown): IpcSonuc<KasaRaporu> {
  return guvenliCagri('rapor:kasa', () => {
    oturumGerekli()
    return raporService.kasa(baslangic, bitis)
  })
}

export function raporGecikenIsle(baslangic: unknown, bitis: unknown): IpcSonuc<GecikenRaporu> {
  return guvenliCagri('rapor:geciken', () => {
    oturumGerekli()
    return raporService.geciken(baslangic, bitis)
  })
}

export function raporEkstreIsle(musteriId: unknown, baslangic: unknown, bitis: unknown): IpcSonuc<EkstreRaporu> {
  return guvenliCagri('rapor:ekstre', () => {
    oturumGerekli()
    return raporService.ekstre(musteriId, baslangic, bitis)
  })
}

export function raporIpcKaydet(): void {
  ipcMain.handle('rapor:acikBakiye', (_e, baslangic, bitis) => raporAcikBakiyeIsle(baslangic, bitis))
  ipcMain.handle('rapor:kasa', (_e, baslangic, bitis) => raporKasaIsle(baslangic, bitis))
  ipcMain.handle('rapor:geciken', (_e, baslangic, bitis) => raporGecikenIsle(baslangic, bitis))
  ipcMain.handle('rapor:ekstre', (_e, musteriId, baslangic, bitis) => raporEkstreIsle(musteriId, baslangic, bitis))
}
