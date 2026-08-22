import type { OdemeSekli } from '../db/types'
import { DogrulamaHatasi } from '../hatalar'

/**
 * Ortak girdi doğrulayıcılar — TÜM servisler kullanıcıdan (renderer'dan)
 * gelen veriyi buradan geçirir. Kural: hiçbir girdiye "tipi doğrudur, uzunluğu
 * makuldür" diye güvenilmez; her alan burada tek tek kontrol edilir. Bir
 * kontrol başarısız olursa DogrulamaHatasi fırlatılır — bu, guvenliCagri
 * tarafından kullanıcıya OLDUĞU GİBİ gösterilmesi güvenli tek hata türüdür.
 */

/** ISO tarih (YYYY-AA-GG, sonuna saat eklenmiş olabilir) biçimini kontrol eder. */
const TARIH_DESENI = /^\d{4}-\d{2}-\d{2}/

export function idDogrula(deger: unknown, alanAdi = 'Kayıt'): number {
  if (typeof deger !== 'number' || !Number.isInteger(deger) || deger <= 0) {
    throw new DogrulamaHatasi(`${alanAdi} numarası geçersiz.`)
  }
  return deger
}

export function zorunluMetin(deger: unknown, alanAdi: string, maksUzunluk = 500): string {
  if (typeof deger !== 'string' || deger.trim().length === 0) {
    throw new DogrulamaHatasi(`${alanAdi} boş olamaz.`)
  }
  const temiz = deger.trim()
  if (temiz.length > maksUzunluk) {
    throw new DogrulamaHatasi(`${alanAdi} çok uzun (en fazla ${maksUzunluk} karakter).`)
  }
  return temiz
}

export function opsiyonelMetin(deger: unknown, alanAdi: string, maksUzunluk = 500): string | null {
  if (deger === undefined || deger === null) return null
  if (typeof deger !== 'string') throw new DogrulamaHatasi(`${alanAdi} geçersiz.`)
  const temiz = deger.trim()
  if (temiz.length === 0) return null
  if (temiz.length > maksUzunluk) {
    throw new DogrulamaHatasi(`${alanAdi} çok uzun (en fazla ${maksUzunluk} karakter).`)
  }
  return temiz
}

export function tarihDogrula(deger: unknown, alanAdi = 'Tarih'): string {
  if (typeof deger !== 'string' || !TARIH_DESENI.test(deger)) {
    throw new DogrulamaHatasi(`${alanAdi} geçersiz (beklenen biçim: YYYY-AA-GG).`)
  }
  return deger
}

/** Kuruş cinsinden tamsayı para alanı. `sifirIzinli=false` iken 0 da reddedilir. */
export function kurusDogrula(deger: unknown, alanAdi: string, sifirIzinli = true): number {
  if (typeof deger !== 'number' || !Number.isInteger(deger)) {
    throw new DogrulamaHatasi(`${alanAdi} geçersiz (kuruş cinsinden tam sayı olmalı).`)
  }
  if (sifirIzinli ? deger < 0 : deger <= 0) {
    throw new DogrulamaHatasi(`${alanAdi} ${sifirIzinli ? 'negatif olamaz.' : 'sıfırdan büyük olmalı.'}`)
  }
  return deger
}

/** Ölçü alanları (en/boy, cm) — ondalık olabilir, sıfırdan büyük olmalı. */
export function pozitifSayiDogrula(deger: unknown, alanAdi: string): number {
  if (typeof deger !== 'number' || !Number.isFinite(deger) || deger <= 0) {
    throw new DogrulamaHatasi(`${alanAdi} sıfırdan büyük bir sayı olmalı.`)
  }
  return deger
}

/** Opsiyonel ölçü (en/boy) — boşsa null, verilmişse sıfırdan büyük olmalı. */
export function opsiyonelPozitifSayi(deger: unknown, alanAdi: string): number | null {
  if (deger === undefined || deger === null || deger === '') return null
  return pozitifSayiDogrula(deger, alanAdi)
}

export function pozitifTamSayiDogrula(deger: unknown, alanAdi: string): number {
  if (typeof deger !== 'number' || !Number.isInteger(deger) || deger <= 0) {
    throw new DogrulamaHatasi(`${alanAdi} sıfırdan büyük bir tam sayı olmalı.`)
  }
  return deger
}

export function odemeSekliDogrula(deger: unknown): OdemeSekli {
  if (deger === 'nakit' || deger === 'kart' || deger === 'havale') return deger
  throw new DogrulamaHatasi('Ödeme şekli geçersiz (nakit / kart / havale olmalı).')
}

/** Girdinin en azından bir nesne (obje) olduğunu doğrular — servisler bunun üstüne alan bazlı kontrol ekler. */
export function nesneDogrula(deger: unknown, alanAdi: string): Record<string, unknown> {
  if (typeof deger !== 'object' || deger === null || Array.isArray(deger)) {
    throw new DogrulamaHatasi(`${alanAdi} bilgisi geçersiz.`)
  }
  return deger as Record<string, unknown>
}
