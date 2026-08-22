import { aktifOturumuGetir, type OturumBilgisi } from '../auth/oturum'
import { OturumGerekliHatasi, YetkiHatasi } from '../hatalar'

/**
 * ★ ROL YETKİSİ TEK YERDE (main süreç) — bkz. dokumanlar/MIMARI.md Böl.5 ve
 * dokumanlar/GEREKSINIMLER.md Böl.2.
 *
 * Her hassas IPC ucu, iş mantığını çalıştırmadan ÖNCE bu iki fonksiyondan
 * birini çağırır (bkz. ipc/musteriIpc.ts, satisIpc.ts, tahsilatIpc.ts,
 * authIpc.ts). Arayüz (renderer) bir düğmeyi gizlese bile bu kontrol
 * atlanamaz: renderer'ın oturum durumuna VEYA veritabanına doğrudan erişimi
 * yok, her çağrı zorunlu olarak buradan geçer.
 */

/** Herhangi bir oturum açık olmalı (sahip VEYA çalışan). */
export function oturumGerekli(): OturumBilgisi {
  const oturum = aktifOturumuGetir()
  if (!oturum) throw new OturumGerekliHatasi()
  return oturum
}

/** Yalnızca Dükkan Sahibi. Çalışan burada RED edilir (Şartname Böl.2: "silme ve düzenleme yapamaz"). */
export function sahipGerekli(): OturumBilgisi {
  const oturum = oturumGerekli()
  if (oturum.rol !== 'sahip') throw new YetkiHatasi()
  return oturum
}
