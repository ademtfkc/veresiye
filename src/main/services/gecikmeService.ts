import { musteriRepo, satisRepo, tahsilatRepo } from '../db/repositories'

/**
 * Şartname 6.3 — GECİKME KURALI (kritik, değişmez).
 *
 * Bir satış "geciken" sayılır ANCAK VE ANCAK:
 *   1) kalan bakiyesi 0'dan BÜYÜK,   VE
 *   2) son tahsilat tarihinden (hiç tahsilat yoksa satış tarihinden) bu yana
 *      30 GÜN VEYA DAHA FAZLA geçmiş.
 *
 * Bir müşteri, açık satışlarından EN AZ BİRİ bu tanıma göre gecikmişse
 * "kırmızı liste"ye girer (bkz. Şartname 8.1). SMS/WhatsApp/e-posta YOK —
 * bu servis yalnızca veri döner, hiçbir bildirim göndermez.
 */
const GECIKME_ESIGI_GUN = 30

export interface KirmiziListeSatiri {
  musteri_id: number
  ad_soyad: string
  telefon: string | null
  kalan_bakiye: number // kuruş — müşterinin TÜM açık satışlarının toplamı (Şartname 6.1)
  son_odeme_tarihi: string // en gecikmiş açık satışın son ödeme (veya hiç yoksa satış) tarihi
  kac_gun_gecti: number
}

/** Yalnızca tarih kısmını (ilk 10 karakter) alıp UTC gece yarısına sabitler — saat/dilim farkları "kaç gün geçti" kararını asla etkilemesin diye. */
function gunBasiUtcMs(tarihMetni: string): number {
  const [yil, ay, gun] = tarihMetni.slice(0, 10).split('-').map(Number)
  return Date.UTC(yil, (ay || 1) - 1, gun || 1)
}

function bugununUtcMs(bugun: Date): number {
  return Date.UTC(bugun.getUTCFullYear(), bugun.getUTCMonth(), bugun.getUTCDate())
}

/** İki tarih arasındaki tam gün sayısı (bugün − eskiTarih). Test edilebilirlik için "bugün" dışarıdan verilebilir. */
export function gecenGunSayisi(eskiTarih: string, bugun: Date = new Date()): number {
  const farkMs = bugununUtcMs(bugun) - gunBasiUtcMs(eskiTarih)
  return Math.floor(farkMs / (1000 * 60 * 60 * 24))
}

function satisReferansTarihi(satisId: number, satisTarihi: string): string {
  return tahsilatRepo.sonTahsilatTarihi(satisId) ?? satisTarihi
}

export const gecikmeService = {
  /** Tek bir satış için gecikme kontrolü — 6.3'ün birebir uygulanışı. */
  satisGecikmisMi(satisId: number, bugun: Date = new Date()): boolean {
    const bakiye = satisRepo.bakiye(satisId)
    const satis = satisRepo.getirById(satisId)
    if (!bakiye || !satis) return false
    if (bakiye.kalan_bakiye <= 0) return false // şart 1: kalan > 0 değilse asla geciken değildir

    const referansTarih = satisReferansTarihi(satisId, satis.tarih)
    return gecenGunSayisi(referansTarih, bugun) >= GECIKME_ESIGI_GUN // şart 2
  },

  /**
   * Kontrol Paneli "Kırmızı Liste" (Şartname 8.1) — en çok geciken üstte.
   *
   * 02.08.2026: ham veri artık TEK SQL sorgusundan geliyor
   * (`musteriRepo.gecikmeAdaylari()`); eskiden müşteri başına birkaç ayrı sorgu
   * yapılıyordu ve 25.000 müşteride ~3 saniye sürüyordu (PROJE_DURUMU.md Böl.10 T6).
   * 30 GÜN KURALI DEĞİŞMEDİ — eşik kararı hâlâ burada, parametrik "bugün" ile
   * (aday satırın en eski referans tarihi 30+ gün önceyse müşteri listeye girer;
   * en eski referans zaten en çok gecikmiş satışa aittir).
   */
  kirmiziListe(bugun: Date = new Date()): KirmiziListeSatiri[] {
    return musteriRepo
      .gecikmeAdaylari()
      .map((aday) => ({
        musteri_id: aday.musteri_id,
        ad_soyad: aday.ad_soyad,
        telefon: aday.telefon,
        kalan_bakiye: aday.kalan_bakiye,
        son_odeme_tarihi: aday.referans_tarih,
        kac_gun_gecti: gecenGunSayisi(aday.referans_tarih, bugun)
      }))
      .filter((satir) => satir.kac_gun_gecti >= GECIKME_ESIGI_GUN)
      .sort((a, b) => b.kac_gun_gecti - a.kac_gun_gecti)
  }
}
