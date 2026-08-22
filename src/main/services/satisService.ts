import { getDb } from '../db/connection'
import { musteriRepo, perdeKalemiRepo, satisRepo, tahsilatRepo } from '../db/repositories'
import type {
  PerdeKalemiRow,
  SatisBakiye,
  SatisRow,
  TahsilatRow,
  YeniPerdeKalemi
} from '../db/types'
import { DogrulamaHatasi } from '../hatalar'
import {
  idDogrula,
  kurusDogrula,
  nesneDogrula,
  opsiyonelMetin,
  opsiyonelPozitifSayi,
  pozitifTamSayiDogrula,
  tarihDogrula
} from './dogrulama'

/** Renderer'a (Faz 3) dönen satış ayrıntısı — bakiye + kalemler + tahsilatlar bir arada. */
export interface SatisDetay {
  satis: SatisRow
  bakiye: SatisBakiye
  kalemler: PerdeKalemiRow[]
  tahsilatlar: TahsilatRow[]
}

/** Renderer'ın "Yeni Satış" ekranından göndereceği girdi biçimi (bkz. Şartname 8.4). */
export interface YeniSatisGirdisi {
  musteri_id: number
  tarih: string
  aciklama?: string | null
  kalemler: Array<Omit<YeniPerdeKalemi, 'satis_id'>>
  /**
   * Kuruş — ELLE yazılan satış toplamı (02.08.2026). Verilirse satışın toplamı
   * budur ve kalem tutarları (hepsi 0 olabilir) toplama karışmaz; verilmezse
   * eski davranış: toplam = kalem tutarlarının toplamı.
   */
  elle_toplam?: number | null
}

/** Yeni Satış tablosundaki "Oda" / "Model-Kumaş" kutularının otomatik önerileri. */
export interface KalemOnerileri {
  odalar: string[]
  modeller: string[]
}

/**
 * Her dükkanda bulunan standart odalar — öneri listesi ilk gün BOŞ olmasın diye
 * (CEO kararı 02.08.2026). Veritabanına YAZILMAZ, sadece öneri listesinin
 * sonuna eklenir; dükkanın kendi yazdıkları (kullanım sayısına göre) hep üstte
 * kalır. Kumaş/model için böyle bir hazır liste YOK — her dükkanın kumaşı
 * farklı, tahmin etmek yanlış olurdu; o liste kullanıldıkça dolar.
 */
const VARSAYILAN_ODALAR = [
  'Salon',
  'Yatak Odası',
  'Çocuk Odası',
  'Mutfak',
  'Banyo',
  'Balkon',
  'Hol',
  'Çalışma Odası'
]

/** Renderer'ın "Devir Kaydı" ekranından göndereceği girdi biçimi (bkz. Şartname 8.5). */
export interface YeniDevirGirdisi {
  musteri_id: number
  tarih: string
  devir_tutari: number // kuruş
  not?: string | null
}

type KalemGirdisi = Omit<YeniPerdeKalemi, 'satis_id'>

function kalemDogrula(girdi: unknown, sira: number): KalemGirdisi {
  const g = nesneDogrula(girdi, `${sira}. perde kalemi`)
  return {
    oda: opsiyonelMetin(g.oda, `${sira}. kalem oda`, 100),
    model_kumas: opsiyonelMetin(g.model_kumas, `${sira}. kalem model/kumaş`, 200),
    en: opsiyonelPozitifSayi(g.en, `${sira}. kalem en (cm)`),
    boy: opsiyonelPozitifSayi(g.boy, `${sira}. kalem boy (cm)`),
    adet: pozitifTamSayiDogrula(g.adet, `${sira}. kalem adet`),
    // 02.08.2026: satır tutarı artık SIFIR olabilir — dükkan sahibi toptan fiyat
    // verip satırlara fiyat yazmayabiliyor (ölçüler yine kayda geçsin diye).
    // Satışın toplamı 0 kalamaz; bu kontrol aşağıda toplamDogrula'da yapılır.
    satir_tutari: kurusDogrula(g.satir_tutari, `${sira}. kalem tutar`, true)
  }
}

/**
 * Bir satışın toplamının nereden geleceğini belirler (02.08.2026):
 *   - `elle_toplam` verilmişse (sayı)   → toplam odur, kalem tutarları karışmaz
 *   - verilmemişse (undefined)          → toplam kalem tutarlarının toplamıdır
 * Her iki durumda da toplam 0'dan büyük olmalı — sıfır tutarlı bir satış
 * kaydetmek kullanıcı hatasıdır (kalemlere de toplam kutusuna da bir şey
 * yazılmamış demektir).
 */
function elleToplamDogrula(
  ham: unknown,
  kalemler: KalemGirdisi[]
): number | null {
  if (ham === undefined || ham === null || ham === '') {
    const kalemToplami = kalemler.reduce((toplam, k) => toplam + k.satir_tutari, 0)
    if (kalemToplami <= 0) {
      throw new DogrulamaHatasi(
        'Satış toplamı 0 olamaz. Ya satırlara tutar yazın ya da "Satış Toplamı" kutusuna toplam fiyatı yazın.'
      )
    }
    return null
  }
  return kurusDogrula(ham, 'Satış toplamı', false)
}

function musteriVarligiKontrolEt(musteriId: number): void {
  if (!musteriRepo.getirById(musteriId)) throw new DogrulamaHatasi('Müşteri bulunamadı.')
}

function satisDetayOlustur(satisId: number): SatisDetay {
  const satis = satisRepo.getirById(satisId)
  if (!satis) throw new DogrulamaHatasi('Satış bulunamadı.')
  const bakiye = satisRepo.bakiye(satisId)!
  return {
    satis,
    bakiye,
    kalemler: perdeKalemiRepo.satisaGoreListele(satisId),
    tahsilatlar: tahsilatRepo.satisaGoreListele(satisId)
  }
}

/**
 * Satış / devir iş mantığı. TÜM SQL satisRepo/perdeKalemiRepo'da — burası
 * yalnızca girdiyi doğrular, çok kalemli satışı TEK İŞLEMDE (transaction)
 * kaydeder ve zenginleştirilmiş sonucu döner. Kapanış (Şartname 6.2) repo
 * katmanında otomatik (her kalem/tahsilat ekle-sil sonrası durumuTazele),
 * burada tekrar hesaplanmaz. Rol yetkisi (düzenle/sil yalnızca sahip)
 * src/main/ipc/satisIpc.ts'te uygulanır.
 */
export const satisService = {
  /** Şartname 8.4: satış + en az bir perde kalemi birlikte, tek işlemde. */
  ekle(girdi: unknown): SatisDetay {
    const g = nesneDogrula(girdi, 'Satış')
    const musteriId = idDogrula(g.musteri_id, 'Müşteri')
    musteriVarligiKontrolEt(musteriId)
    const tarih = tarihDogrula(g.tarih)
    const aciklama = opsiyonelMetin(g.aciklama, 'Açıklama', 500)

    if (!Array.isArray(g.kalemler) || g.kalemler.length === 0) {
      throw new DogrulamaHatasi('En az bir perde kalemi girilmeli.')
    }
    const kalemler = g.kalemler.map((k, i) => kalemDogrula(k, i + 1))
    const elleToplam = elleToplamDogrula(g.elle_toplam, kalemler)

    const calistir = getDb().transaction(() => {
      const satis = satisRepo.ekle({
        musteri_id: musteriId,
        tarih,
        aciklama,
        tip: 'satis',
        elle_toplam: elleToplam
      })
      for (const kalem of kalemler) {
        perdeKalemiRepo.ekle({ satis_id: satis.id, ...kalem })
      }
      return satis.id
    })

    return satisDetayOlustur(calistir())
  },

  /** Şartname 8.5: eski defterden devir — perde kalemi gerekmez, tek tutar. */
  devirEkle(girdi: unknown): SatisDetay {
    const g = nesneDogrula(girdi, 'Devir')
    const musteriId = idDogrula(g.musteri_id, 'Müşteri')
    musteriVarligiKontrolEt(musteriId)
    const tarih = tarihDogrula(g.tarih)
    const devirTutari = kurusDogrula(g.devir_tutari, 'Devir tutarı', true)
    const not = opsiyonelMetin(g.not, 'Not', 500)

    const satis = satisRepo.ekle({
      musteri_id: musteriId,
      tarih,
      aciklama: not ?? 'Devir (eski defter)',
      tip: 'devir',
      devir_tutari: devirTutari
    })
    return satisDetayOlustur(satis.id)
  },

  getir(idGirdi: unknown): SatisDetay {
    return satisDetayOlustur(idDogrula(idGirdi, 'Satış'))
  },

  /**
   * 02.08.2026 — "Oda" ve "Model/Kumaş" kutularının otomatik önerileri.
   * Daha önce girilmiş kayıtlardan öğrenilir (en çok kullanılan üstte);
   * odalarda ayrıca standart oda adları listenin sonuna eklenir (ilk gün boş
   * kalmasın diye). Zaten kullanılmış bir oda iki kez görünmez.
   */
  oneriler(): KalemOnerileri {
    const kullanilanOdalar = perdeKalemiRepo.oneriler('oda')
    const kucukHarfli = new Set(kullanilanOdalar.map((o) => o.toLocaleLowerCase('tr')))
    const eklenecekVarsayilanlar = VARSAYILAN_ODALAR.filter(
      (o) => !kucukHarfli.has(o.toLocaleLowerCase('tr'))
    )
    return {
      odalar: [...kullanilanOdalar, ...eklenecekVarsayilanlar],
      modeller: perdeKalemiRepo.oneriler('model_kumas')
    }
  },

  /** Müşteri Kartı ekranı (Şartname 8.3): tüm satışlar (açık+kapalı), en yeni önce. */
  musteriyeGoreListele(musteriIdGirdi: unknown): SatisRow[] {
    const musteriId = idDogrula(musteriIdGirdi, 'Müşteri')
    musteriVarligiKontrolEt(musteriId)
    return satisRepo.musteriyeGoreListele(musteriId)
  },

  /**
   * Şartname Böl.2: düzenleme YALNIZCA sahip (rol kontrolü satisIpc'te).
   * `kalemler` verilirse (yalnızca tip='satis') satışın perde kalemleri
   * TAMAMEN değiştirilir: eskiler silinir, yeniler yazılır. Tek işlemde
   * (transaction) yapılır — yarıda hata olursa satış eski haliyle kalır,
   * kalemsiz/yarım bir satış oluşmaz. Tahsilatlara DOKUNULMAZ; toplam
   * değişince satışın açık/kapandı durumu repo katmanında kendiliğinden
   * tazelenir (Şartname 6.2).
   */
  guncelle(idGirdi: unknown, girdi: unknown): SatisDetay {
    const id = idDogrula(idGirdi, 'Satış')
    const mevcut = satisRepo.getirById(id)
    if (!mevcut) throw new DogrulamaHatasi('Satış bulunamadı.')
    const g = nesneDogrula(girdi, 'Satış')

    const patch: {
      tarih?: string
      aciklama?: string | null
      devir_tutari?: number
      elle_toplam?: number | null
    } = {}
    if (g.tarih !== undefined) patch.tarih = tarihDogrula(g.tarih)
    if (g.aciklama !== undefined) patch.aciklama = opsiyonelMetin(g.aciklama, 'Açıklama', 500)
    if (mevcut.tip === 'devir' && g.devir_tutari !== undefined) {
      patch.devir_tutari = kurusDogrula(g.devir_tutari, 'Devir tutarı', true)
    }

    let yeniKalemler: KalemGirdisi[] | null = null
    if (g.kalemler !== undefined) {
      if (mevcut.tip !== 'satis') {
        throw new DogrulamaHatasi('Devir kaydında perde kalemi bulunmaz; sadece tutarı değiştirebilirsiniz.')
      }
      if (!Array.isArray(g.kalemler) || g.kalemler.length === 0) {
        throw new DogrulamaHatasi('En az bir perde kalemi girilmeli.')
      }
      yeniKalemler = g.kalemler.map((k, i) => kalemDogrula(k, i + 1))
    }

    // Elle toplam (02.08.2026): `undefined` = dokunma, `null` = kaldır (toplam
    // yine kalemlerden hesaplansın), sayı = toplam bu olsun. Kaldırılıyorsa
    // kalemlerin toplamı 0 kalmamalı — yoksa satış sıfır tutarlı olurdu.
    if (mevcut.tip === 'satis' && g.elle_toplam !== undefined) {
      if (g.elle_toplam === null) {
        const gecerliKalemler =
          yeniKalemler ??
          perdeKalemiRepo.satisaGoreListele(id).map((k) => ({ ...k, satir_tutari: k.satir_tutari }))
        patch.elle_toplam = elleToplamDogrula(undefined, gecerliKalemler as KalemGirdisi[])
      } else {
        patch.elle_toplam = kurusDogrula(g.elle_toplam, 'Satış toplamı', false)
      }
    }

    const calistir = getDb().transaction(() => {
      satisRepo.guncelle(id, patch)
      if (yeniKalemler) {
        for (const eski of perdeKalemiRepo.satisaGoreListele(id)) {
          perdeKalemiRepo.sil(eski.id)
        }
        for (const kalem of yeniKalemler) {
          perdeKalemiRepo.ekle({ satis_id: id, ...kalem })
        }
      }
    })
    calistir()

    return satisDetayOlustur(id)
  },

  /** DİKKAT: CASCADE — satışa ait kalemler/tahsilatlar de silinir (bkz. satisRepo.sil). */
  sil(idGirdi: unknown): { silindi: true } {
    const id = idDogrula(idGirdi, 'Satış')
    if (!satisRepo.getirById(id)) throw new DogrulamaHatasi('Satış bulunamadı.')
    satisRepo.sil(id)
    return { silindi: true }
  }
}
