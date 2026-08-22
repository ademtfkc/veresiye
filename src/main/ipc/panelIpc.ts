import { ipcMain } from 'electron'
import { panelService, type PanelOzeti } from '../services'
import { guvenliCagri, type IpcSonuc } from './guvenliCagri'
import { oturumGerekli } from './yetki'

/** Herhangi bir oturum görebilir (Şartname Böl.2: "raporları görebilir"). */
export function panelOzetIsle(): IpcSonuc<PanelOzeti> {
  return guvenliCagri('panel:ozet', () => {
    oturumGerekli()
    return panelService.ozet()
  })
}

export function panelIpcKaydet(): void {
  ipcMain.handle('panel:ozet', () => panelOzetIsle())
}
