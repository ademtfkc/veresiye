/**
 * BİÇİMLEME (tek kaynak) — Şartname Böl.3: para `12.500,00 ₺`, tarih `GG.AA.YYYY`.
 *
 * Backend HER ZAMAN kuruş tamsayı (12500000 → 125.000,00 ₺) ve ISO tarih
 * (`"2026-07-15"`) döner/bekler. Ekrana basmadan önce `xFormatla`, kullanıcı
 * girdisini backend'e göndermeden önce `xGirdisiniCevir` kullanılır. Böylece
 * "12.500,00 ₺" ↔ `1250000` dönüşümü TEK yerde toplanır, ekranlara dağılmaz.
 */

const KURUS_CARPANI = 100

const AY_ADLARI_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık'
]

/** 1250000 (kuruş) → "12.500,00 ₺". Negatifse önünde "−" gösterir (fazla ödeme). */
export function paraFormatla(kurus: number | null | undefined): string {
  const guvenliKurus = typeof kurus === 'number' && Number.isFinite(kurus) ? kurus : 0
  const negatifMi = guvenliKurus < 0
  const tlDegeri = Math.abs(guvenliKurus) / KURUS_CARPANI
  const gosterim = tlDegeri.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${negatifMi ? '−' : ''}${gosterim} ₺`
}

/** Kullanıcının yazdığı "12.500,50" / "12500,5" / "12500" gibi bir metni kuruşa (tam sayı) çevirir. */
export function paraGirdisiniKurusaCevir(metin: string): number {
  const sayi = metinIStemeSayiyaCevir(metin)
  return Math.round(sayi * KURUS_CARPANI)
}

/**
 * `paraGirdisiniKurusaCevir`in TERSİ: 1250000 (kuruş) → "12.500,00" (₺ işareti
 * YOK — düzenleme kutusunun içine yazılır, kullanıcı üstüne yazabilsin diye).
 * Mevcut bir kaydı düzenleme ekranında geri doldururken kullanılır.
 */
export function kurusuGirdiMetnineCevir(kurus: number | null | undefined): string {
  const guvenliKurus = typeof kurus === 'number' && Number.isFinite(kurus) ? kurus : 0
  return (guvenliKurus / KURUS_CARPANI).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** Ölçü/adet gibi düz sayı girdilerini ("2,5" → 2.5) sayıya çevirir. */
export function sayiGirdisiniCevir(metin: string): number {
  return metinIStemeSayiyaCevir(metin)
}

/** `sayiGirdisiniCevir`in TERSİ: 320 → "320", 2.5 → "2,5". Boş/0 ise "". */
export function sayiyiGirdiMetnineCevir(deger: number | null | undefined): string {
  if (deger === null || deger === undefined || deger === 0) return ''
  return String(deger).replace('.', ',')
}

function metinIStemeSayiyaCevir(metin: string): number {
  if (!metin) return 0
  // Türkçe biçim: nokta binlik ayraç, virgül ondalık. Önce tüm noktalar
  // silinir (binlik), sonra ilk virgül ondalık noktaya çevrilir.
  const temiz = String(metin).trim().replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const sayi = parseFloat(temiz)
  return Number.isNaN(sayi) ? 0 : sayi
}

/** "2026-07-15" → "15.07.2026". Boş/geçersizse "—" döner. */
export function tarihFormatla(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return '—'
  const [yil, ay, gun] = iso.slice(0, 10).split('-')
  if (!yil || !ay || !gun) return '—'
  return `${gun}.${ay}.${yil}`
}

/** Bugünün tarihi, ISO (`YYYY-AA-GG`) — <input type="date"> varsayılanı için. */
export function bugunIso(): string {
  const simdi = new Date()
  const yil = simdi.getFullYear()
  const ay = String(simdi.getMonth() + 1).padStart(2, '0')
  const gun = String(simdi.getDate()).padStart(2, '0')
  return `${yil}-${ay}-${gun}`
}

/** Bu ayın ilk günü, ISO — Kasa Raporu'nun varsayılan başlangıç tarihi (Faz 5). */
export function buAyBaslangicIso(): string {
  const simdi = new Date()
  return `${simdi.getFullYear()}-${String(simdi.getMonth() + 1).padStart(2, '0')}-01`
}

/** "15.07.2026" tarzı bugünün Türkçe uzun biçimi (Kontrol Paneli üst yazısı için). */
export function bugunUzunTr(): string {
  const simdi = new Date()
  return `${tarihFormatla(bugunIso())} · ${AY_ADLARI_TR[simdi.getMonth()]} ${simdi.getFullYear()}`
}

/** "Temmuz 2026" — bir tarihin ay+yıl Türkçe adı (KPI alt yazısı için). */
export function ayYilTr(tarih: Date = new Date()): string {
  return `${AY_ADLARI_TR[tarih.getMonth()]} ${tarih.getFullYear()}`
}

/** Ölçü (cm) — 320 → "320 cm". Boş/0 ise "—". */
export function olcuFormatla(deger: number | null | undefined): string {
  if (deger === null || deger === undefined || deger <= 0) return '—'
  return `${deger.toLocaleString('tr-TR')} cm`
}

/** Ödeme şekli kodunu Türkçe etikete çevirir. */
export function odemeSekliEtiketi(sekil: 'nakit' | 'kart' | 'havale' | string): string {
  const etiketler: Record<string, string> = { nakit: 'Nakit', kart: 'Kart', havale: 'Havale' }
  return etiketler[sekil] ?? sekil
}

/** İki tarih arasındaki tam gün sayısı (bugün − eskiTarih), gün başına (UTC) sabitlenmiş. */
export function gecenGunSayisi(iso: string, bugun: Date = new Date()): number {
  const [yil, ay, gun] = iso.slice(0, 10).split('-').map(Number)
  const eskiMs = Date.UTC(yil || 1970, (ay || 1) - 1, gun || 1)
  const bugunMs = Date.UTC(bugun.getUTCFullYear(), bugun.getUTCMonth(), bugun.getUTCDate())
  return Math.floor((bugunMs - eskiMs) / (1000 * 60 * 60 * 24))
}
