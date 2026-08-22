import { musteriRepo, raporRepo, satisRepo, tahsilatRepo } from '../db/repositories'
import type { AcikBakiyeSatiri, KasaHareketSatiri, KasaKirilimSatiri } from '../db/repositories'
import type { MusteriRow, OdemeSekli } from '../db/types'
import { DogrulamaHatasi } from '../hatalar'
import { ayarService } from './ayarService'
import { idDogrula, tarihDogrula } from './dogrulama'
import { gecikmeService, type KirmiziListeSatiri } from './gecikmeService'

/**
 * Rapor iş mantığı (Faz 5 — Şartname Böl.9). TÜM SQL raporRepo'da (Açık
 * Bakiye/Kasa) veya mevcut satisRepo/tahsilatRepo/gecikmeService'te (Ekstre/
 * Geciken) — burası yalnızca tarih aralığını doğrular, dükkan adını ekler ve
 * sonucu zenginleştirir. Rol yetkisi burada DEĞİL, src/main/ipc/raporIpc.ts'te
 * (Şartname Böl.2: raporları herkes görebilir, hiçbiri "düzenler" değildir).
 */

const ODEME_SEKLI_ETIKETI: Record<OdemeSekli, string> = { nakit: 'Nakit', kart: 'Kart', havale: 'Havale' }

/** Opsiyonel tarih aralığı — boş/undefined/null hepsi "sınır yok" (null) anlamına gelir. */
function opsiyonelTarihAraligiDogrula(
  baslangicGirdi: unknown,
  bitisGirdi: unknown
): { baslangic: string | null; bitis: string | null } {
  const baslangic =
    baslangicGirdi === undefined || baslangicGirdi === null || baslangicGirdi === ''
      ? null
      : tarihDogrula(baslangicGirdi, 'Başlangıç tarihi')
  const bitis =
    bitisGirdi === undefined || bitisGirdi === null || bitisGirdi === ''
      ? null
      : tarihDogrula(bitisGirdi, 'Bitiş tarihi')
  if (baslangic && bitis && baslangic > bitis) {
    throw new DogrulamaHatasi('Başlangıç tarihi bitiş tarihinden sonra olamaz.')
  }
  return { baslangic, bitis }
}

/** Kasa Raporu için ZORUNLU tarih aralığı (Şartname 9.2: "seçilen tarih aralığındaki tüm tahsilatlar"). */
function zorunluTarihAraligiDogrula(baslangicGirdi: unknown, bitisGirdi: unknown): { baslangic: string; bitis: string } {
  const baslangic = tarihDogrula(baslangicGirdi, 'Başlangıç tarihi')
  const bitis = tarihDogrula(bitisGirdi, 'Bitiş tarihi')
  if (baslangic > bitis) throw new DogrulamaHatasi('Başlangıç tarihi bitiş tarihinden sonra olamaz.')
  return { baslangic, bitis }
}

// ---------------------------------------------------------------------------
// 1) Açık Bakiye Raporu
// ---------------------------------------------------------------------------

export interface AcikBakiyeRaporu {
  dukkanAdi: string
  baslangic: string | null
  bitis: string | null
  satirlar: AcikBakiyeSatiri[]
  genelToplam: { toplam: number; odenen: number; kalan: number }
}

// ---------------------------------------------------------------------------
// 2) Kasa (Tahsilat) Raporu
// ---------------------------------------------------------------------------

export interface KasaRaporu {
  dukkanAdi: string
  baslangic: string
  bitis: string
  hareketler: KasaHareketSatiri[]
  genelToplam: number
  kirilim: KasaKirilimSatiri[]
}

// ---------------------------------------------------------------------------
// 3) Geciken Hesaplar Raporu
// ---------------------------------------------------------------------------

export interface GecikenRaporu {
  dukkanAdi: string
  baslangic: string | null
  bitis: string | null
  satirlar: KirmiziListeSatiri[]
}

// ---------------------------------------------------------------------------
// 4) Müşteri Ekstresi
// ---------------------------------------------------------------------------

export interface EkstreHareketi {
  tarih: string
  tur: 'satis' | 'tahsilat'
  aciklama: string
  borc: number // kuruş
  alacak: number // kuruş
  yuruyenBakiye: number // kuruş — TÜM geçmiş üzerinden hesaplanır (filtre ne olursa olsun doğru kalır)
}

export interface EkstreRaporu {
  musteri: MusteriRow
  dukkanAdi: string
  baslangic: string | null
  bitis: string | null
  devredenBakiye: number // kuruş — baslangic öncesindeki hareketlerin toplamı (baslangic yoksa 0)
  hareketler: EkstreHareketi[]
  guncelBakiye: number // kuruş — tüm geçmişin sonundaki GERÇEK güncel bakiye
}

export const raporService = {
  /** Şartname 9.1 — büyükten küçüğe (raporRepo zaten bu sırada döner). */
  acikBakiye(baslangicGirdi: unknown, bitisGirdi: unknown): AcikBakiyeRaporu {
    const { baslangic, bitis } = opsiyonelTarihAraligiDogrula(baslangicGirdi, bitisGirdi)
    const satirlar = raporRepo.acikBakiye(baslangic, bitis)
    const genelToplam = satirlar.reduce(
      (acc, s) => ({ toplam: acc.toplam + s.toplam, odenen: acc.odenen + s.odenen, kalan: acc.kalan + s.kalan }),
      { toplam: 0, odenen: 0, kalan: 0 }
    )
    return { dukkanAdi: ayarService.getir().dukkanAdi, baslangic, bitis, satirlar, genelToplam }
  },

  /** Şartname 9.2 — kırılım toplamı genel toplama eşit olmalı (aynı satırlardan gruplanır). */
  kasa(baslangicGirdi: unknown, bitisGirdi: unknown): KasaRaporu {
    const { baslangic, bitis } = zorunluTarihAraligiDogrula(baslangicGirdi, bitisGirdi)
    const hareketler = raporRepo.kasaListesi(baslangic, bitis)
    const kirilim = raporRepo.kasaKirilimi(baslangic, bitis)
    const genelToplam = hareketler.reduce((toplam, h) => toplam + h.tutar, 0)
    return { dukkanAdi: ayarService.getir().dukkanAdi, baslangic, bitis, hareketler, genelToplam, kirilim }
  },

  /**
   * Şartname 9.3 — mevcut gecikmeService mantığının (6.3 — 30 gün, "bugün"e
   * göre) AYNISI kullanılır, DEĞİŞTİRİLMEZ. Tarih aralığı yalnızca listeyi
   * (müşterinin referans/son ödeme tarihine göre) daraltan EK bir süzgeçtir —
   * "geciken" tanımının kendisini asla değiştirmez.
   */
  geciken(baslangicGirdi: unknown, bitisGirdi: unknown): GecikenRaporu {
    const { baslangic, bitis } = opsiyonelTarihAraligiDogrula(baslangicGirdi, bitisGirdi)
    let satirlar = gecikmeService.kirmiziListe()
    if (baslangic) satirlar = satirlar.filter((s) => s.son_odeme_tarihi >= baslangic)
    if (bitis) satirlar = satirlar.filter((s) => s.son_odeme_tarihi <= bitis)
    return { dukkanAdi: ayarService.getir().dukkanAdi, baslangic, bitis, satirlar }
  },

  /**
   * Şartname 9.4 — tek müşteri, satır satır cari döküm + yürüyen bakiye.
   * Mevcut satisRepo/tahsilatRepo metotları yeterli, yeni SQL gerekmiyor
   * (satış sayısı müşteri başına küçük, Faz 2 KPI kararıyla aynı gerekçe).
   */
  ekstre(musteriIdGirdi: unknown, baslangicGirdi: unknown, bitisGirdi: unknown): EkstreRaporu {
    const musteriId = idDogrula(musteriIdGirdi, 'Müşteri')
    const musteri = musteriRepo.getirById(musteriId)
    if (!musteri) throw new DogrulamaHatasi('Müşteri bulunamadı.')
    const { baslangic, bitis } = opsiyonelTarihAraligiDogrula(baslangicGirdi, bitisGirdi)

    const satislar = satisRepo
      .musteriyeGoreListele(musteriId)
      .slice()
      .sort((a, b) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : a.id - b.id))

    interface HamHareket {
      tarih: string
      tur: 'satis' | 'tahsilat'
      sira: number
      aciklama: string
      borc: number
      alacak: number
    }
    const hamHareketler: HamHareket[] = []

    for (const satis of satislar) {
      const bakiye = satisRepo.bakiye(satis.id)
      hamHareketler.push({
        tarih: satis.tarih,
        tur: 'satis',
        sira: satis.id * 2,
        aciklama: satis.aciklama || (satis.tip === 'devir' ? 'Devir (eski defter)' : 'Perde satışı'),
        borc: bakiye?.toplam_tutar ?? 0,
        alacak: 0
      })
      for (const t of tahsilatRepo.satisaGoreListele(satis.id)) {
        hamHareketler.push({
          tarih: t.tarih,
          tur: 'tahsilat',
          sira: t.id * 2 + 1,
          aciklama: `Tahsilat (${ODEME_SEKLI_ETIKETI[t.odeme_sekli]})${t.not ? ' — ' + t.not : ''}`,
          borc: 0,
          alacak: t.tutar
        })
      }
    }

    // Aynı gün içinde satış hareketi tahsilattan önce görünür (borç önce
    // doğar, ödeme sonra gelir) — okunabilirlik için, bakiyeyi etkilemez.
    hamHareketler.sort((a, b) => {
      if (a.tarih !== b.tarih) return a.tarih < b.tarih ? -1 : 1
      if (a.tur !== b.tur) return a.tur === 'satis' ? -1 : 1
      return a.sira - b.sira
    })

    let yuruyen = 0
    const hareketler: EkstreHareketi[] = hamHareketler.map((h) => {
      yuruyen += h.borc - h.alacak
      return { tarih: h.tarih, tur: h.tur, aciklama: h.aciklama, borc: h.borc, alacak: h.alacak, yuruyenBakiye: yuruyen }
    })
    const guncelBakiye = yuruyen

    let devredenBakiye = 0
    let gorunenHareketler = hareketler
    if (baslangic) {
      const oncekiler = hareketler.filter((h) => h.tarih < baslangic)
      devredenBakiye = oncekiler.length > 0 ? oncekiler[oncekiler.length - 1].yuruyenBakiye : 0
      gorunenHareketler = hareketler.filter((h) => h.tarih >= baslangic && (!bitis || h.tarih <= bitis))
    } else if (bitis) {
      gorunenHareketler = hareketler.filter((h) => h.tarih <= bitis)
    }

    return {
      musteri,
      dukkanAdi: ayarService.getir().dukkanAdi,
      baslangic,
      bitis,
      devredenBakiye,
      hareketler: gorunenHareketler,
      guncelBakiye
    }
  }
}
