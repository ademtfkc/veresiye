import type { KullaniciRol } from '../db/types'

/**
 * Aktif oturum durumu — ANA SÜREÇTE (main), tek bir modül değişkeninde
 * tutulur (bkz. dokumanlar/MIMARI.md Böl.5: "Yerel giriş + rol kontrolü main
 * süreçte"). Program tek dükkan bilgisayarında, tek seferde tek kullanıcı ile
 * çalışır (Şartname Böl.3) — bu yüzden token/çoklu-oturum yönetimi gibi bir
 * karmaşıklığa gerek yok; basit bir değişken yeterli ve daha güvenilir
 * (renderer'ın bu değişkene hiçbir doğrudan erişimi yok, sadece IPC ile
 * dolaylı sorgulayabilir — bkz. src/main/ipc/yetki.ts).
 */
export interface OturumBilgisi {
  kullaniciId: number
  kullaniciAdi: string
  rol: KullaniciRol
}

let aktifOturum: OturumBilgisi | null = null

/** girisYap başarılı olunca çağrılır. */
export function oturumAc(bilgi: OturumBilgisi): void {
  aktifOturum = bilgi
}

/** cikisYap veya uygulama kapanışında çağrılır. */
export function oturumKapat(): void {
  aktifOturum = null
}

/** Şu an giriş yapmış kullanıcı, yoksa null. */
export function aktifOturumuGetir(): OturumBilgisi | null {
  return aktifOturum
}
