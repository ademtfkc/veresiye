/**
 * Ortak hata türleri — servis (services/) VE köprü (ipc/) katmanları bunları
 * kullanır. Ayrım şu yüzden önemli:
 *
 *   Buradaki sınıflardan biriyse → mesaj zaten kullanıcı dostu Türkçe, olduğu
 *   gibi renderer'a gösterilebilir ("Ad soyad boş olamaz." gibi).
 *
 *   Başka bir hataysa (SQL hatası, beklenmeyen istisna vb.) → renderer'a ASLA
 *   ham haliyle gitmez; `src/main/ipc/guvenliCagri.ts` bunu sade bir mesaja
 *   indirger, teknik detay yalnızca sunucu konsoluna (log) yazılır. Sistemin
 *   iç yapısını (veritabanı hatası, dosya yolu vb.) kullanıcıya sızdırmamak
 *   için bu ayrım şart.
 */

/** Girdi doğrulama hatası (boş/çok uzun/yanlış tip/aralık dışı vb.). */
export class DogrulamaHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj)
    this.name = 'DogrulamaHatasi'
  }
}

/** Oturum açık ama rol bu işlem için yetersiz (ör. çalışan silme/düzenleme denedi). */
export class YetkiHatasi extends Error {
  constructor(mesaj = 'Bu işlem için yetkiniz yok.') {
    super(mesaj)
    this.name = 'YetkiHatasi'
  }
}

/** Hiç oturum açık değilken yetki gerektiren bir uç çağrıldı. */
export class OturumGerekliHatasi extends Error {
  constructor(mesaj = 'Önce giriş yapmalısınız.') {
    super(mesaj)
    this.name = 'OturumGerekliHatasi'
  }
}

/** Kullanıcı adı/şifre eşleşmedi (hangisinin yanlış olduğu bilerek söylenmez). */
export class GirisBasarisizHatasi extends Error {
  constructor(mesaj = 'Kullanıcı adı veya şifre hatalı.') {
    super(mesaj)
    this.name = 'GirisBasarisizHatasi'
  }
}

/** guvenliCagri bu listeye bakarak "mesajı olduğu gibi gösterebilir miyim?" kararını verir. */
export const KULLANICIYA_GOSTERILEBILIR_HATALAR = [
  DogrulamaHatasi,
  YetkiHatasi,
  OturumGerekliHatasi,
  GirisBasarisizHatasi
] as const
