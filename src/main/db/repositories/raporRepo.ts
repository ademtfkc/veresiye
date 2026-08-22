import type Database from 'better-sqlite3'
import { getDb } from '../connection'
import type { OdemeSekli } from '../types'

function db(): Database.Database {
  return getDb()
}

/** Açık Bakiye Raporu (Şartname 9.1) — bir satırı bir müşteriyi temsil eder. */
export interface AcikBakiyeSatiri {
  musteri_id: number
  ad_soyad: string
  telefon: string | null
  toplam: number // kuruş — dahil edilen açık satışların toplam tutarı
  odenen: number // kuruş
  kalan: number // kuruş
}

/** Kasa (Tahsilat) Raporu (Şartname 9.2) — tek bir tahsilat hareketi. */
export interface KasaHareketSatiri {
  id: number
  tarih: string
  tutar: number // kuruş
  odeme_sekli: OdemeSekli
  not: string | null
  musteri_id: number
  ad_soyad: string
  satis_id: number
}

/** Kasa Raporu — ödeme şekline göre kırılım (tutarların toplamı genel toplama eşit olmalı). */
export interface KasaKirilimSatiri {
  odeme_sekli: OdemeSekli
  adet: number
  toplam: number // kuruş
}

/**
 * Rapor sorguları (Faz 5 — Şartname Böl.9). TÜM SQL burada (bkz. musteriRepo
 * başlığı, dokumanlar/MIMARI.md Böl.7). Diğer repository'lerdeki mevcut
 * metotlar (musteriRepo.listeleBakiyeli, satisRepo.*, tahsilatRepo.*) Geciken
 * Hesaplar ve Müşteri Ekstresi raporları için zaten yeterli (bkz.
 * raporService) — burada SADECE Açık Bakiye ve Kasa raporlarının ihtiyaç
 * duyduğu, tek SQL sorgusunda tarih aralığı + agregasyon gerektiren yeni
 * sorgular var.
 */
export const raporRepo = {
  /**
   * Açık Bakiye Raporu: kim ne kadar borçlu (müşteri, toplam, ödenen, kalan),
   * büyükten küçüğe. `baslangic`/`bitis` verilirse yalnızca o aralıkta SATIŞ
   * TARİHİ olan açık satışlar sayılır (ikisi de null ise tüm zamanlar —
   * müşterinin GÜNCEL toplam açık bakiyesiyle birebir aynı sonucu verir).
   */
  acikBakiye(baslangic: string | null, bitis: string | null): AcikBakiyeSatiri[] {
    return db()
      .prepare(
        `SELECT
           m.id AS musteri_id,
           m.ad_soyad,
           m.telefon,
           SUM(sb.toplam_tutar) AS toplam,
           SUM(sb.odenen_tutar) AS odenen,
           SUM(sb.kalan_bakiye) AS kalan
         FROM musteri m
         JOIN satis_bakiye_view sb ON sb.musteri_id = m.id
         JOIN satis s ON s.id = sb.satis_id
         WHERE sb.durum = 'acik'
           AND (@baslangic IS NULL OR s.tarih >= @baslangic)
           AND (@bitis IS NULL OR s.tarih <= @bitis)
         GROUP BY m.id
         HAVING kalan > 0
         ORDER BY kalan DESC`
      )
      .all({ baslangic, bitis }) as AcikBakiyeSatiri[]
  },

  /** Kasa Raporu: tarih aralığındaki tüm tahsilatlar, en eski önce. */
  kasaListesi(baslangic: string, bitis: string): KasaHareketSatiri[] {
    return db()
      .prepare(
        `SELECT t.id, t.tarih, t.tutar, t.odeme_sekli, t."not",
                m.id AS musteri_id, m.ad_soyad, s.id AS satis_id
         FROM tahsilat t
         JOIN satis s ON s.id = t.satis_id
         JOIN musteri m ON m.id = s.musteri_id
         WHERE t.tarih >= @baslangic AND t.tarih <= @bitis
         ORDER BY t.tarih ASC, t.id ASC`
      )
      .all({ baslangic, bitis }) as KasaHareketSatiri[]
  },

  /** Kasa Raporu — ödeme şekline göre kırılım (nakit/kart/havale). */
  kasaKirilimi(baslangic: string, bitis: string): KasaKirilimSatiri[] {
    return db()
      .prepare(
        `SELECT odeme_sekli, COUNT(*) AS adet, SUM(tutar) AS toplam
         FROM tahsilat
         WHERE tarih >= @baslangic AND tarih <= @bitis
         GROUP BY odeme_sekli`
      )
      .all({ baslangic, bitis }) as KasaKirilimSatiri[]
  }
}
