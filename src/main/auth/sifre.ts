import bcrypt from 'bcryptjs'

/**
 * Şifre hash'leme — bcryptjs.
 *
 * KARAR (bkz. PROJE_DURUMU.md Böl.7): native `bcrypt` yerine saf JavaScript
 * olan `bcryptjs` seçildi. Neden: bu proje Windows'a native derlenen
 * better-sqlite3 dışında BAŞKA bir native modül riskine girmek istemiyor —
 * `bcryptjs`'in sıfır bağımlılığı ve derleme adımı yok, hem macOS
 * geliştirmede hem paketlenmiş Windows .exe'de aynı şekilde çalışır. Karşılığı
 * (native bcrypt'e göre biraz daha yavaş hash'leme) bu ölçekte (tek dükkan,
 * birkaç kullanıcı) hissedilmez.
 *
 * Şifre ASLA düz metin saklanmaz — yalnızca bu modülden geçen hash saklanır
 * (bkz. kullaniciRepo.sifre_hash).
 */
const TUR_SAYISI = 10 // bcrypt "cost factor" (2^10 tur) — masaüstü/offline kullanım için standart ve yeterli

export function sifreyiHashle(duzMetin: string): string {
  return bcrypt.hashSync(duzMetin, TUR_SAYISI)
}

export function sifreDuzMetinHashleEsitMi(duzMetin: string, hash: string): boolean {
  return bcrypt.compareSync(duzMetin, hash)
}
