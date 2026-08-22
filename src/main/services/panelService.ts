import { musteriRepo, tahsilatRepo } from '../db/repositories'
import { gecikmeService, type KirmiziListeSatiri } from './gecikmeService'

/** Kontrol Paneli üstteki 3 kutu + kırmızı liste (Şartname 8.1). */
export interface PanelOzeti {
  toplamAcikAlacak: number // kuruş — tüm müşterilerin açık bakiyeleri toplamı
  buAyTahsilEdilen: number // kuruş — bu ay içindeki tüm tahsilatların toplamı (kasa)
  gecikenMusteriSayisi: number
  kirmiziListe: KirmiziListeSatiri[]
}

/** Verilen tarihin ait olduğu ayın ilk ve son günü, ISO (YYYY-AA-GG). */
function ayAraligi(bugun: Date): { baslangic: string; bitis: string } {
  const yil = bugun.getUTCFullYear()
  const ay = bugun.getUTCMonth() // 0-indeksli
  const baslangic = `${yil}-${String(ay + 1).padStart(2, '0')}-01`
  const ayinSonGunuMs = Date.UTC(yil, ay + 1, 1) - 1 // bir sonraki ayın 1'inden 1ms önce
  const bitis = new Date(ayinSonGunuMs).toISOString().slice(0, 10)
  return { baslangic, bitis }
}

/**
 * Panel KPI'ları. **Her üç değer de TEK SQL sorgusuyla hesaplanır** — bu ekran
 * program her açıldığında ilk gelen ekran olduğu için müşteri sayısıyla birlikte
 * yavaşlamamalı.
 *
 * 02.08.2026 düzeltmesi (PROJE_DURUMU.md Böl.10 T6): eskiden "Bu Ay Tahsil
 * Edilen" tüm müşteri→satış→tahsilat zincirini tek tek çekip JS'te süzüyordu ve
 * Kırmızı Liste de müşteri başına birkaç sorgu yapıyordu; müşteri sayısıyla
 * doğrusal binlerce sorgu oluyordu (10.000 müşteride ~1,2 sn, 25.000'de ~3 sn).
 * Ölçüm betiği: `.tmp/kapasite-olcum.ts`.
 */
export const panelService = {
  ozet(bugun: Date = new Date()): PanelOzeti {
    const toplamAcikAlacak = musteriRepo.toplamAcikAlacak()

    const { baslangic, bitis } = ayAraligi(bugun)
    const buAyTahsilEdilen = tahsilatRepo.donemToplami(baslangic, bitis)

    const kirmiziListe = gecikmeService.kirmiziListe(bugun)

    return {
      toplamAcikAlacak,
      buAyTahsilEdilen,
      gecikenMusteriSayisi: kirmiziListe.length,
      kirmiziListe
    }
  }
}
