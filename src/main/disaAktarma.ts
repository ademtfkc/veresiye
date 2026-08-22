import { writeFileSync } from 'node:fs'
import { dialog } from 'electron'
import ExcelJS from 'exceljs'

/**
 * DOSYA / DİYALOG İŞLERİ — SADECE ANA SÜREÇTE (bkz. PROJE_DURUMU.md Böl.3).
 * Raporlar ekranının "CSV'ye Aktar" / "Excel'e Aktar" düğmeleri buraya çıkar.
 * Şartname Böl.3: internetsiz — dışa aktarma DAİMA yerel dosyaya, dış servise
 * ASLA gönderilmez (e-posta/bulut yükleme yok).
 *
 * İKİ KATMANLI TASARIM (bilinçli karar):
 *  - Alt seviye (`csvIcerigiYaz`/`xlsxIcerigiYaz`): VERİLEN bir dosya yoluna
 *    yazar, `dialog`'a dokunmaz. Otomatikleştirilmiş kanıt testleri (bkz.
 *    scripts/rapor-test.ts) bunları doğrudan çağırıp gerçek bir dosya üretip
 *    içeriğini doğrulayabilir — native "Farklı Kaydet" penceresi test
 *    ortamında insan etkileşimi olmadan açılamayacağı için.
 *  - Üst seviye (`csvDosyasiKaydet`/`xlsxDosyasiKaydet`): kullanıcıya native
 *    "Farklı Kaydet" penceresini açar, seçilen yola alt seviyeyi çağırarak
 *    yazar. IPC (`src/main/ipc/disaAktarmaIpc.ts`) SADECE bunları kullanır.
 */

export interface DisaAktarSonucu {
  /** Kullanıcı "Farklı Kaydet" penceresini iptal ettiyse true — bu bir HATA değildir. */
  iptal: boolean
  yol?: string
}

export interface DisaAktarSayfa {
  sayfaAdi: string
  basliklar: string[]
  satirlar: (string | number | null)[][]
}

/** CSV içeriğini VERİLEN yola yazar. UTF-8 BOM eklenir — Türkçe karakterler (ş,ğ,ı,ö,ü,ç) Excel'de bozuk görünmesin diye. */
const UTF8_BOM = String.fromCharCode(0xfeff)

export function csvIcerigiYaz(dosyaYolu: string, icerik: string): void {
  writeFileSync(dosyaYolu, UTF8_BOM + icerik, 'utf8')
}

/** Excel (.xlsx) içeriğini VERİLEN yola yazar — offline, gömülü `exceljs` ile (CDN/dış servis YOK). */
export async function xlsxIcerigiYaz(dosyaYolu: string, sayfa: DisaAktarSayfa): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  // Excel sayfa adı en fazla 31 karakter olabilir.
  const worksheet = workbook.addWorksheet((sayfa.sayfaAdi || 'Rapor').slice(0, 31))
  const baslikSatiri = worksheet.addRow(sayfa.basliklar)
  baslikSatiri.font = { bold: true }
  for (const satir of sayfa.satirlar) worksheet.addRow(satir)
  worksheet.columns.forEach((sutun) => {
    sutun.width = 22
  })
  await workbook.xlsx.writeFile(dosyaYolu)
}

/** Kullanıcıya "Farklı Kaydet" penceresi açar (CSV), seçilen yola yazar. */
export async function csvDosyasiKaydet(oneriDosyaAdi: string, icerik: string): Promise<DisaAktarSonucu> {
  const sonuc = await dialog.showSaveDialog({
    title: 'CSV Olarak Kaydet',
    defaultPath: `${oneriDosyaAdi}.csv`,
    filters: [{ name: 'CSV Dosyası', extensions: ['csv'] }]
  })
  if (sonuc.canceled || !sonuc.filePath) return { iptal: true }
  csvIcerigiYaz(sonuc.filePath, icerik)
  return { iptal: false, yol: sonuc.filePath }
}

/** Kullanıcıya "Farklı Kaydet" penceresi açar (Excel), seçilen yola yazar. */
export async function xlsxDosyasiKaydet(oneriDosyaAdi: string, sayfa: DisaAktarSayfa): Promise<DisaAktarSonucu> {
  const sonuc = await dialog.showSaveDialog({
    title: 'Excel Olarak Kaydet',
    defaultPath: `${oneriDosyaAdi}.xlsx`,
    filters: [{ name: 'Excel Dosyası', extensions: ['xlsx'] }]
  })
  if (sonuc.canceled || !sonuc.filePath) return { iptal: true }
  await xlsxIcerigiYaz(sonuc.filePath, sayfa)
  return { iptal: false, yol: sonuc.filePath }
}
