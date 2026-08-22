/**
 * VERİ TOPLAMA YARDIMCILARI — `window.api` uçlarını birleştirip ekranların
 * ihtiyaç duyduğu şekle getirir. Repository/servis/IPC katmanına DOKUNULMAZ
 * (Faz 3 kuralı); burası SADECE renderer içinde, var olan uçları birleştirir.
 *
 * ✅ FAZ 4 PERFORMANS DÜZELTMESİ (bkz. PROJE_DURUMU.md Böl.10, eski not):
 * Eskiden backend'de "tüm müşterileri bakiyeleriyle listele" ucu yoktu ve bu
 * dosya müşteri başına 1 + açık satış başına 1 IPC çağrısı yapıyordu (N+M) —
 * ~1000 müşteride yavaşlama riski taşıyordu. Artık backend'de TEK SQL
 * sorgusuyla çalışan `musteriListeleBakiyeli()` ucu var (bkz.
 * src/main/db/repositories/musteriRepo.ts → listeleBakiyeli), bu dosya onu
 * kullanıyor: müşteri sayısından bağımsız olarak sabit sayıda IPC çağrısı.
 */
import type { MusteriRow } from '../../main/db/types'

export type MusteriDurum = 'temiz' | 'borclu' | 'geciken'

export interface MusteriBakiyeli extends MusteriRow {
  bakiye: number // kuruş — açık satışların kalan bakiye toplamı
  durum: MusteriDurum
}

/** panelOzet()'ten geciken müşteri id'lerinin kümesi — 30 gün kuralını main süreçten (tek kaynak) alır. */
export async function gecikenMusteriIdSetiGetir(): Promise<Set<number>> {
  const sonuc = await window.api.panelOzet()
  if (!sonuc.basarili) return new Set()
  return new Set(sonuc.veri.kirmiziListe.map((r) => r.musteri_id))
}

export function musteriDurumBelirle(bakiyeKurus: number, gecikenMi: boolean): MusteriDurum {
  if (gecikenMi) return 'geciken'
  if (bakiyeKurus > 0) return 'borclu'
  return 'temiz'
}

/**
 * Müşteriler ekranı ve panel için: tüm müşteriler + her birinin bakiyesi +
 * durumu. TEK toplu bakiye çağrısı (musteriListeleBakiyeli) + TEK panel
 * çağrısı (gecikme kümesi) — müşteri sayısından bağımsız, sabit IPC sayısı.
 */
export async function tumMusterileriBakiyeIleGetir(): Promise<
  { basarili: true; veri: MusteriBakiyeli[] } | { basarili: false; hata: string }
> {
  const [listeSonuc, gecikenSeti] = await Promise.all([
    window.api.musteriListeleBakiyeli(),
    gecikenMusteriIdSetiGetir()
  ])
  if (!listeSonuc.basarili) return { basarili: false, hata: listeSonuc.hata }

  const veri: MusteriBakiyeli[] = listeSonuc.veri.map((musteri) => ({
    ...musteri,
    durum: musteriDurumBelirle(musteri.bakiye, gecikenSeti.has(musteri.id))
  }))

  return { basarili: true, veri }
}

/**
 * Arama sonucu az sayıda müşteri için (Tahsilat Ekle, Devir Kaydı) — toplu
 * bakiye listesinden id'ye göre eşleştirir (ekstra N çağrı yapmaz).
 */
export async function musterileriBakiyeIleZenginlestir(
  musteriler: MusteriRow[]
): Promise<MusteriBakiyeli[]> {
  const sonuc = await window.api.musteriListeleBakiyeli()
  const bakiyeMap = new Map((sonuc.basarili ? sonuc.veri : []).map((m) => [m.id, m.bakiye]))
  return musteriler.map((musteri) => {
    const bakiye = bakiyeMap.get(musteri.id) ?? 0
    return {
      ...musteri,
      bakiye,
      durum: musteriDurumBelirle(bakiye, false) // geciken bilgisi burada önemli değil (sadece renk/tutar gösteriliyor)
    }
  })
}

/** Bir bakiye tutarına göre para rengi — borç kırmızı, fazla ödeme amber, sıfır/temiz yeşil. */
export function bakiyeRenkDegiskeni(kurus: number): string {
  if (kurus > 0) return 'var(--danger)'
  if (kurus < 0) return 'var(--warning)'
  return 'var(--success)'
}
