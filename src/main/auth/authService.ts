import { kullaniciRepo } from '../db/repositories'
import type { KullaniciRol, KullaniciRow } from '../db/types'
import { DogrulamaHatasi, GirisBasarisizHatasi } from '../hatalar'
import { aktifOturumuGetir, oturumAc, oturumKapat, type OturumBilgisi } from './oturum'
import { sifreDuzMetinHashleEsitMi, sifreyiHashle } from './sifre'

const KULLANICI_ADI_MIN_UZUNLUK = 3
const KULLANICI_ADI_MAKS_UZUNLUK = 50
const SIFRE_MIN_UZUNLUK = 6

/**
 * Renderer'a dönen "güvenli" kullanıcı görünümü — `sifre_hash` alanı BİLEREK
 * yok. Hash bir sır değeri değildir ama yine de dışarı (arayüz sürecine,
 * oradan da olası bir log/ekran görüntüsüne) hiç sızdırılmaması en güvenlisi.
 */
export interface GuvenliKullanici {
  id: number
  kullanici_adi: string
  rol: KullaniciRol
  aktif: boolean
}

function disaAktar(k: KullaniciRow): GuvenliKullanici {
  return { id: k.id, kullanici_adi: k.kullanici_adi, rol: k.rol, aktif: k.aktif === 1 }
}

function kullaniciAdiDogrula(deger: unknown): string {
  if (typeof deger !== 'string') throw new DogrulamaHatasi('Kullanıcı adı geçersiz.')
  const temiz = deger.trim()
  if (temiz.length < KULLANICI_ADI_MIN_UZUNLUK || temiz.length > KULLANICI_ADI_MAKS_UZUNLUK) {
    throw new DogrulamaHatasi(
      `Kullanıcı adı ${KULLANICI_ADI_MIN_UZUNLUK}-${KULLANICI_ADI_MAKS_UZUNLUK} karakter olmalı.`
    )
  }
  return temiz
}

function sifreDogrula(deger: unknown): string {
  if (typeof deger !== 'string' || deger.length < SIFRE_MIN_UZUNLUK) {
    throw new DogrulamaHatasi(`Şifre en az ${SIFRE_MIN_UZUNLUK} karakter olmalı.`)
  }
  return deger
}

function rolDogrula(deger: unknown): KullaniciRol {
  if (deger === 'sahip' || deger === 'calisan') return deger
  throw new DogrulamaHatasi('Geçersiz rol ("sahip" veya "calisan" olmalı).')
}

/**
 * Yerel giriş + kullanıcı yönetimi. Rol YETKİSİ burada kontrol edilmez —
 * "kullaniciOlustur" ve "sifreSifirla" yalnızca sahip tarafından
 * çağrılabilmeli, ama bu kural TEK yerde (src/main/ipc/yetki.ts →
 * IPC handler seviyesinde) uygulanır (bkz. dokumanlar/MIMARI.md Böl.5).
 * Bu servis, çağıranın kim olduğuna güvenmez; onu yetkilendiren katmandır.
 */
export const authService = {
  /** İlk açılışta hiç kullanıcı yoksa true — giriş yerine "kurulum" akışı gösterilmeli. */
  ilkKurulumGerekliMi(): boolean {
    return kullaniciRepo.listele().length === 0
  },

  /** Yalnızca hiç kullanıcı yokken çağrılabilir: ilk "sahip" hesabını oluşturur. */
  ilkSahipOlustur(kullaniciAdiGirdi: unknown, sifreGirdi: unknown): GuvenliKullanici {
    if (!authService.ilkKurulumGerekliMi()) {
      throw new DogrulamaHatasi(
        'Kurulum zaten tamamlanmış. Yeni kullanıcı eklemek için Ayarlar ekranını kullanın.'
      )
    }
    const kullaniciAdi = kullaniciAdiDogrula(kullaniciAdiGirdi)
    const sifre = sifreDogrula(sifreGirdi)
    const kullanici = kullaniciRepo.ekle({
      kullanici_adi: kullaniciAdi,
      sifre_hash: sifreyiHashle(sifre),
      rol: 'sahip'
    })
    return disaAktar(kullanici)
  },

  /** Kullanıcı adı + şifre ile giriş; başarılıysa oturumu ana süreçte açar. */
  girisYap(kullaniciAdiGirdi: unknown, sifreGirdi: unknown): GuvenliKullanici {
    if (typeof kullaniciAdiGirdi !== 'string' || typeof sifreGirdi !== 'string') {
      throw new GirisBasarisizHatasi()
    }
    const kullaniciAdi = kullaniciAdiGirdi.trim()
    if (!kullaniciAdi || !sifreGirdi) throw new GirisBasarisizHatasi()

    const kullanici = kullaniciRepo.getirByKullaniciAdi(kullaniciAdi)
    // Kullanıcı yok / pasif / şifre yanlış — ÜÇÜNDE DE aynı mesaj: hangisinin
    // doğru olduğunu (ör. "bu kullanıcı adı var ama şifre yanlış") dışarı
    // sızdırmamak, kaba kuvvet denemelerine ipucu vermemek için.
    if (!kullanici || kullanici.aktif !== 1 || !sifreDuzMetinHashleEsitMi(sifreGirdi, kullanici.sifre_hash)) {
      throw new GirisBasarisizHatasi()
    }

    oturumAc({ kullaniciId: kullanici.id, kullaniciAdi: kullanici.kullanici_adi, rol: kullanici.rol })
    return disaAktar(kullanici)
  },

  cikisYap(): void {
    oturumKapat()
  },

  aktifOturum(): OturumBilgisi | null {
    return aktifOturumuGetir()
  },

  /** Yeni kullanıcı ekler — çağıranın "sahip" olduğu IPC katmanında doğrulanmış olmalı. */
  kullaniciOlustur(kullaniciAdiGirdi: unknown, sifreGirdi: unknown, rolGirdi: unknown): GuvenliKullanici {
    const kullaniciAdi = kullaniciAdiDogrula(kullaniciAdiGirdi)
    const sifre = sifreDogrula(sifreGirdi)
    const rol = rolDogrula(rolGirdi)
    if (kullaniciRepo.getirByKullaniciAdi(kullaniciAdi)) {
      throw new DogrulamaHatasi('Bu kullanıcı adı zaten kullanılıyor.')
    }
    const kullanici = kullaniciRepo.ekle({
      kullanici_adi: kullaniciAdi,
      sifre_hash: sifreyiHashle(sifre),
      rol
    })
    return disaAktar(kullanici)
  },

  /** Şartname Böl.2: "Şifre unutulursa kilitlenme olmamalı; sahip çalışan şifresini sıfırlayabilmeli." */
  sifreSifirla(kullaniciIdGirdi: unknown, yeniSifreGirdi: unknown): void {
    if (typeof kullaniciIdGirdi !== 'number' || !Number.isInteger(kullaniciIdGirdi) || kullaniciIdGirdi <= 0) {
      throw new DogrulamaHatasi('Geçersiz kullanıcı.')
    }
    const yeniSifre = sifreDogrula(yeniSifreGirdi)
    const kullanici = kullaniciRepo.getirById(kullaniciIdGirdi)
    if (!kullanici) throw new DogrulamaHatasi('Kullanıcı bulunamadı.')
    kullaniciRepo.sifreHashGuncelle(kullaniciIdGirdi, sifreyiHashle(yeniSifre))
  },

  kullanicilariListele(): GuvenliKullanici[] {
    return kullaniciRepo.listele().map(disaAktar)
  }
}
