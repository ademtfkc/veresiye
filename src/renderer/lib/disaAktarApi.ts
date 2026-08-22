/**
 * `window.api` ÇAĞIRAN dışa aktarma yardımcıları — bilerek `lib/disaAktar.ts`
 * (saf CSV üretimi, main süreç tarafında da test edilebilir) dosyasından
 * AYRI tutuldu. Bu dosya SADECE renderer'da (tarayıcı/Electron penceresi)
 * çalışır, `window` global'ine ihtiyaç duyar.
 */
import { csvOlustur, type DisaAktarTablo } from './disaAktar'

export type DisaAktarSonucu = { basarili: true; iptal: boolean; yol?: string } | { basarili: false; hata: string }

/** CSV dosyasını kaydeder — main süreçte "Farklı Kaydet" penceresi açılır. */
export async function csvyeAktar(tablo: DisaAktarTablo): Promise<DisaAktarSonucu> {
  const icerik = csvOlustur(tablo)
  const sonuc = await window.api.raporDisaAktarCsv(tablo.dosyaAdi, icerik)
  if (!sonuc.basarili) return { basarili: false, hata: sonuc.hata }
  return { basarili: true, iptal: sonuc.veri.iptal, yol: sonuc.veri.yol }
}

/** Excel (.xlsx) dosyasını kaydeder — main süreçte "Farklı Kaydet" penceresi açılır. */
export async function excelAktar(tablo: DisaAktarTablo): Promise<DisaAktarSonucu> {
  const altBilgiSatirlari = (tablo.altBilgi ?? []).map((bilgi) => [bilgi])
  const sonuc = await window.api.raporDisaAktarXlsx(tablo.dosyaAdi, {
    sayfaAdi: tablo.baslik,
    basliklar: tablo.basliklar,
    satirlar: [...altBilgiSatirlari, ...(altBilgiSatirlari.length > 0 ? [[]] : []), ...tablo.satirlar.map((s) => s.slice())]
  })
  if (!sonuc.basarili) return { basarili: false, hata: sonuc.hata }
  return { basarili: true, iptal: sonuc.veri.iptal, yol: sonuc.veri.yol }
}
