/**
 * Veritabanı satır tipleri ve "yeni kayıt" girdi tipleri.
 *
 * KURAL: Para alanları (devir_tutari, satir_tutari, tutar) her
 * zaman TAMSAYI KURUŞ olarak saklanır (12.500,00 ₺ = 1_250_000). Neden:
 * ondalık (REAL/float) sayılarla para toplarken yuvarlama hatası birikir
 * (ör. 0.1 + 0.2 tam olarak 0.3 etmez). Kuruş cinsinden tamsayı kullanınca bu
 * risk tamamen ortadan kalkar. Ekran katmanı (Faz 3) kuruşu "12.500,00 ₺"
 * biçimine çevirir; kullanıcı asla kuruş görmez.
 *
 * Ölçü alanları (en, boy) santimetre, ondalık (REAL) olabilir — para değil,
 * kuruş kısıtı onlar için geçerli değil.
 */

export type SatisTipi = 'satis' | 'devir'
export type SatisDurumu = 'acik' | 'kapandi'
export type OdemeSekli = 'nakit' | 'kart' | 'havale'
export type KullaniciRol = 'sahip' | 'calisan'

// ---------------------------------------------------------------------------
// musteri
// ---------------------------------------------------------------------------

export interface MusteriRow {
  id: number
  ad_soyad: string
  telefon: string | null
  adres: string | null
  not: string | null
  kayit_tarihi: string
}

export interface YeniMusteri {
  ad_soyad: string
  telefon?: string | null
  adres?: string | null
  not?: string | null
}

export interface MusteriGuncelleme {
  ad_soyad?: string
  telefon?: string | null
  adres?: string | null
  not?: string | null
}

// ---------------------------------------------------------------------------
// satis
// ---------------------------------------------------------------------------

export interface SatisRow {
  id: number
  musteri_id: number
  tarih: string
  aciklama: string | null
  tip: SatisTipi
  devir_tutari: number | null // kuruş — sadece tip='devir' iken dolu
  /**
   * Kuruş — ELLE yazılan satış toplamı (02.08.2026). NULL ise toplam eskisi
   * gibi perde kalemlerinin `satir_tutari` toplamıdır; DOLU ise satışın
   * toplamı doğrudan budur (kalem tutarları toplama karışmaz, hepsi 0 olabilir).
   * Yalnızca tip='satis' için anlamlı.
   */
  elle_toplam: number | null
  durum: SatisDurumu
}

export interface YeniSatis {
  musteri_id: number
  tarih: string
  aciklama?: string | null
  tip: SatisTipi
  /** Yalnızca tip='devir' iken zorunlu (kuruş). tip='satis' iken görmezden gelinir. */
  devir_tutari?: number | null
  /** Kuruş — elle yazılan satış toplamı; verilmezse kalem tutarları toplanır. Yalnızca tip='satis'. */
  elle_toplam?: number | null
}

export interface SatisGuncelleme {
  tarih?: string
  aciklama?: string | null
  /** Yalnızca devir kayıtlarında anlamlı. */
  devir_tutari?: number
  /**
   * Kuruş — elle yazılan satış toplamı (yalnızca tip='satis'). Sayı verilirse
   * toplam o olur; **`null` verilirse elle toplam KALDIRILIR** ve toplam yine
   * kalemlerden hesaplanmaya döner. Alan hiç gönderilmezse mevcut değer korunur.
   */
  elle_toplam?: number | null
  /**
   * Yalnızca `tip='satis'` kayıtlarında anlamlı — VERİLİRSE satışın perde
   * kalemleri bu listeyle TAMAMEN değiştirilir (eskiler silinir, yeniler
   * yazılır; hepsi tek işlemde). Verilmezse kalemlere dokunulmaz.
   * Bu alanı satisService işler; satisRepo (SQL) görmez.
   */
  kalemler?: Array<Omit<YeniPerdeKalemi, 'satis_id'>>
}

// ---------------------------------------------------------------------------
// perde_kalemi
// ---------------------------------------------------------------------------

export interface PerdeKalemiRow {
  id: number
  satis_id: number
  oda: string | null
  model_kumas: string | null
  en: number | null // santimetre (bilgi amaçlı, opsiyonel)
  boy: number | null // santimetre (bilgi amaçlı, opsiyonel)
  adet: number
  satir_tutari: number // kuruş — ELLE girilen satır tutarı
}

export interface YeniPerdeKalemi {
  satis_id: number
  oda?: string | null
  model_kumas?: string | null
  en?: number | null
  boy?: number | null
  adet: number
  satir_tutari: number // kuruş
}

export interface PerdeKalemiGuncelleme {
  oda?: string | null
  model_kumas?: string | null
  en?: number | null
  boy?: number | null
  adet?: number
  satir_tutari?: number
}

// ---------------------------------------------------------------------------
// tahsilat
// ---------------------------------------------------------------------------

export interface TahsilatRow {
  id: number
  satis_id: number
  tarih: string
  tutar: number // kuruş
  odeme_sekli: OdemeSekli
  not: string | null
}

export interface YeniTahsilat {
  satis_id: number
  tarih: string
  tutar: number // kuruş
  odeme_sekli: OdemeSekli
  not?: string | null
}

export interface TahsilatGuncelleme {
  tarih?: string
  tutar?: number
  odeme_sekli?: OdemeSekli
  not?: string | null
}

// ---------------------------------------------------------------------------
// kullanici (Faz 2 dolduracak — burada yalnızca tablo/CRUD hazır)
// ---------------------------------------------------------------------------

export interface KullaniciRow {
  id: number
  kullanici_adi: string
  sifre_hash: string
  rol: KullaniciRol
  aktif: number // 0 | 1
}

export interface YeniKullanici {
  kullanici_adi: string
  sifre_hash: string
  rol: KullaniciRol
}

// ---------------------------------------------------------------------------
// Bakiye (satis_bakiye_view'dan gelir — hiçbir zaman elle saklanmaz)
// ---------------------------------------------------------------------------

export interface SatisBakiye {
  satis_id: number
  musteri_id: number
  durum: SatisDurumu
  toplam_tutar: number // kuruş
  odenen_tutar: number // kuruş
  kalan_bakiye: number // kuruş — negatifse fazla ödeme demektir, engellenmez
}

// ---------------------------------------------------------------------------
// Müşteri + toplu bakiye (Faz 4 performans notu — bkz. PROJE_DURUMU.md Böl.10:
// "~1000 müşteride Müşteriler ekranı yavaşlayabilir"). TEK SQL sorgusuyla tüm
// müşteriler + açık bakiyeleri birlikte döner (musteriRepo.listeleBakiyeli).
// ---------------------------------------------------------------------------

export interface MusteriBakiyeSatiri extends MusteriRow {
  bakiye: number // kuruş — açık (durum='acik') satışların kalan bakiye toplamı
}

/**
 * Kırmızı Liste (Kontrol Paneli) hesabının TEK SQL sorgusundan dönen ham satırı
 * (musteriRepo.gecikmeAdaylari). "30 gün geçti mi?" kararı burada VERİLMEZ —
 * o kural tek yerde, `gecikmeService`'te kalır (Şartname 6.3, test edilebilir
 * "bugün" parametresiyle). Bu satır sadece gerekli ham veriyi getirir.
 */
export interface GecikmeAdayiSatiri {
  musteri_id: number
  ad_soyad: string
  telefon: string | null
  /** Müşterinin AÇIK satışları arasındaki EN ESKİ referans tarih (son tahsilat, yoksa satış tarihi). */
  referans_tarih: string
  /** Müşterinin tüm açık satışlarının kalan bakiye toplamı (kuruş). */
  kalan_bakiye: number
}

// ---------------------------------------------------------------------------
// ayar (Faz 4 — basit anahtar/değer ayar tablosu, Şartname 8.7: dükkan adı)
// ---------------------------------------------------------------------------

export interface AyarRow {
  anahtar: string
  deger: string
}
