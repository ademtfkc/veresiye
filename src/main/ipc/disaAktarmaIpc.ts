import { ipcMain } from 'electron'
import { csvDosyasiKaydet, xlsxDosyasiKaydet, type DisaAktarSayfa, type DisaAktarSonucu } from '../disaAktarma'
import { DogrulamaHatasi } from '../hatalar'
import { guvenliCagriAsync, type IpcSonuc } from './guvenliCagri'
import { oturumGerekli } from './yetki'

/**
 * Raporlar ekranının "CSV'ye Aktar" / "Excel'e Aktar" düğmeleri (Şartname
 * 4.5, 9). Dosya/dialog işleri SADECE burada ve `src/main/disaAktarma.ts`'te
 * — SQL yok, veri zaten renderer'da rapor uçlarından gelmiş biçimli metin
 * satırları (bkz. src/renderer/lib/disaAktar.ts). HERKES dışa aktarabilir
 * (raporları görme yetkisiyle aynı — veri değiştirmiyor).
 */

function dosyaAdiDogrula(deger: unknown): string {
  if (typeof deger !== 'string' || !deger.trim()) throw new DogrulamaHatasi('Dosya adı geçersiz.')
  // Windows/macOS dosya sisteminde sorun çıkarabilecek karakterleri temizle.
  return deger.trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 150)
}

export function raporDisaAktarCsvIsle(oneriDosyaAdi: unknown, icerik: unknown): Promise<IpcSonuc<DisaAktarSonucu>> {
  return guvenliCagriAsync('rapor:disaAktarCsv', async () => {
    oturumGerekli()
    const ad = dosyaAdiDogrula(oneriDosyaAdi)
    if (typeof icerik !== 'string' || !icerik) throw new DogrulamaHatasi('Dışa aktarılacak veri boş.')
    return csvDosyasiKaydet(ad, icerik)
  })
}

export function raporDisaAktarXlsxIsle(oneriDosyaAdi: unknown, sayfa: unknown): Promise<IpcSonuc<DisaAktarSonucu>> {
  return guvenliCagriAsync('rapor:disaAktarXlsx', async () => {
    oturumGerekli()
    const ad = dosyaAdiDogrula(oneriDosyaAdi)
    const s = sayfa as Partial<DisaAktarSayfa> | null
    if (!s || !Array.isArray(s.basliklar) || !Array.isArray(s.satirlar)) {
      throw new DogrulamaHatasi('Dışa aktarılacak veri geçersiz.')
    }
    return xlsxDosyasiKaydet(ad, { sayfaAdi: s.sayfaAdi || ad, basliklar: s.basliklar, satirlar: s.satirlar })
  })
}

export function disaAktarmaIpcKaydet(): void {
  ipcMain.handle('rapor:disaAktarCsv', (_e, ad, icerik) => raporDisaAktarCsvIsle(ad, icerik))
  ipcMain.handle('rapor:disaAktarXlsx', (_e, ad, sayfa) => raporDisaAktarXlsxIsle(ad, sayfa))
}
