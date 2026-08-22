/**
 * ipc barrel — main.ts açılışta tek bir `tumIpcUclariniKaydet()` çağırır.
 * Her IPC ucu için: preload.ts (köprü) + bridge.ts (renderer tipleri) ile
 * BİREBİR eşleşen bir kanal adı burada kayıtlıdır (bkz. PROJE_DURUMU.md Böl.5).
 */
import { authIpcKaydet } from './authIpc'
import { ayarIpcKaydet } from './ayarIpc'
import { disaAktarmaIpcKaydet } from './disaAktarmaIpc'
import { musteriIpcKaydet } from './musteriIpc'
import { panelIpcKaydet } from './panelIpc'
import { raporIpcKaydet } from './raporIpc'
import { satisIpcKaydet } from './satisIpc'
import { tahsilatIpcKaydet } from './tahsilatIpc'
import { yedekIpcKaydet } from './yedekIpc'

export function tumIpcUclariniKaydet(): void {
  authIpcKaydet()
  musteriIpcKaydet()
  satisIpcKaydet()
  tahsilatIpcKaydet()
  panelIpcKaydet()
  ayarIpcKaydet()
  raporIpcKaydet()
  disaAktarmaIpcKaydet()
  yedekIpcKaydet()
}

export * from './authIpc'
export * from './musteriIpc'
export * from './satisIpc'
export * from './tahsilatIpc'
export * from './panelIpc'
export * from './ayarIpc'
export * from './raporIpc'
export * from './disaAktarmaIpc'
export * from './yedekIpc'
export { guvenliCagri, guvenliCagriAsync } from './guvenliCagri'
export type { IpcSonuc } from './guvenliCagri'
export { oturumGerekli, sahipGerekli } from './yetki'
