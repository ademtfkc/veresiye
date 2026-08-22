/**
 * CSV METİN OLUŞTURMA — Faz 5 (Şartname 4.5, Böl.9). SAF fonksiyonlar,
 * `window`/Electron API'ye DOKUNMAZ — bilerek: `scripts/rapor-test.ts` bu
 * dosyayı main süreç (Node, DOM lib'i YOK) tarafında da doğrudan import edip
 * gerçek CSV üretim kodunu (bir kopyasını değil) test edebiliyor. `window.api`
 * çağıran kısım (`csvyeAktar`/`excelAktar`) kasıtlı olarak ayrı bir dosyada:
 * bkz. `lib/disaAktarApi.ts`.
 *
 * Biçimleme (para/tarih) DAİMA burada, renderer'da yapılır (bkz. lib/bicim.ts)
 * — main süreç yalnızca hazır metni verilen dosya yoluna yazar (bkz.
 * src/main/disaAktarma.ts).
 *
 * Türkçe Excel için iki pratik karar:
 *  1) Ayraç NOKTALI VİRGÜL (;) — Türkçe Excel kurulumlarında ondalık ayracı
 *     virgül (,) olduğu için CSV'nin standart alan ayracı da otomatik olarak
 *     ";" kabul edilir; "," kullansaydık "12.500,00" gibi bir para hücresi
 *     yanlışlıkla iki sütuna bölünürdü.
 *  2) Para/tarih hücreleri EKRANDAKİYLE BİREBİR AYNI biçimli METİN olarak
 *     yazılır ("12.500,00 ₺", "15.07.2026") — ham kuruş/ISO sayı değil.
 *     Esnaf için "gördüğün = dosyada olan" daha güvenilir; toplama/formül
 *     ihtiyacı olursa kullanıcı hücreyi kendisi sayıya çevirebilir.
 */

export interface DisaAktarTablo {
  /** Öerilen dosya adı (uzantısız) — main süreç .csv/.xlsx ekler. */
  dosyaAdi: string
  /** Rapor başlığı — dosyanın ilk satırı / Excel sayfa adı. */
  baslik: string
  /** Başlık altında gösterilecek ek satırlar (ör. dükkan adı, tarih aralığı). */
  altBilgi?: string[]
  basliklar: string[]
  satirlar: (string | number)[][]
}

/** Bugünün tarihini dosya adına ekler — aynı raporu farklı günlerde dışa aktarınca dosyalar üst üste yazılmasın. */
export function raporDosyaAdi(taban: string): string {
  const simdi = new Date()
  const iso = `${simdi.getFullYear()}-${String(simdi.getMonth() + 1).padStart(2, '0')}-${String(simdi.getDate()).padStart(2, '0')}`
  return `${taban}-${iso}`
}

function csvHucresi(deger: string | number): string {
  let metin = String(deger)
  // CSV formül enjeksiyonu önlemi: Excel/Sheets, `= + - @` (veya tab/CR) ile BAŞLAYAN
  // bir hücreyi formül sanıp çalıştırabilir. Başına tek tırnak (') ekleyince hücre
  // metin olarak yorumlanır; Excel bu tırnağı göstermez. Yalnızca metin değerlere
  // uygulanır — sayılar zaten güvenlidir ve negatif sayı gibi görünmemeleri gerekir.
  if (typeof deger === 'string' && /^[=+\-@\t\r]/.test(metin)) {
    metin = `'${metin}`
  }
  if (metin.includes(';') || metin.includes('"') || metin.includes('\n')) {
    return `"${metin.replace(/"/g, '""')}"`
  }
  return metin
}

/** Tabloyu noktalı virgülle ayrılmış CSV metnine çevirir (UTF-8 BOM main süreçte eklenir, bkz. disaAktarma.ts). */
export function csvOlustur(tablo: DisaAktarTablo): string {
  const satirlar: string[] = [csvHucresi(tablo.baslik)]
  for (const bilgi of tablo.altBilgi ?? []) satirlar.push(csvHucresi(bilgi))
  satirlar.push('')
  satirlar.push(tablo.basliklar.map(csvHucresi).join(';'))
  for (const satir of tablo.satirlar) satirlar.push(satir.map(csvHucresi).join(';'))
  return satirlar.join('\r\n')
}
