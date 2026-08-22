import type { ReactNode } from 'react'
import type { MusteriDurum } from '../lib/veri'

/**
 * Küçük renkli durum etiketi — müşteri durumu (Temiz/Borçlu/Geciken) ve satış
 * durumu (Açık/Kapandı/Fazla Ödeme) için kullanılır. Renkler tasarımdaki
 * badge()/dcol mantığıyla birebir: SADECE "Geciken" kırmızı rozet alır;
 * "Borçlu" nötr gridir — kırmızı, dükkan sahibinin ACİL araması gereken
 * (30+ gün) müşteriye ayrılmış (bkz. tasarim/Perde Takip.dc.html badge()).
 * Para tutarının rengi (ParaGoster) bundan ayrı, borç/ödeme anlamını taşır.
 */
export type RozetRenk = 'basari' | 'tehlike' | 'uyari' | 'notr'

const RENK_STILLERI: Record<RozetRenk, { arka: string; yazi: string }> = {
  basari: { arka: 'var(--success-soft)', yazi: 'var(--success)' },
  tehlike: { arka: 'var(--danger-soft)', yazi: 'var(--danger)' },
  uyari: { arka: 'var(--warning-soft)', yazi: 'var(--warning)' },
  notr: { arka: 'color-mix(in srgb, var(--text) 8%, transparent)', yazi: 'var(--text2)' }
}

export function DurumRozeti({ renk, children }: { renk: RozetRenk; children: ReactNode }) {
  const stil = RENK_STILLERI[renk]
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 13,
        fontWeight: 600,
        padding: '3px 11px',
        borderRadius: 5,
        background: stil.arka,
        color: stil.yazi,
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </span>
  )
}

const MUSTERI_DURUM_BILGISI: Record<MusteriDurum, { renk: RozetRenk; etiket: string }> = {
  temiz: { renk: 'basari', etiket: 'Temiz' },
  borclu: { renk: 'notr', etiket: 'Borçlu' },
  geciken: { renk: 'tehlike', etiket: 'Geciken' }
}

export function MusteriDurumRozeti({ durum }: { durum: MusteriDurum }) {
  const bilgi = MUSTERI_DURUM_BILGISI[durum]
  return <DurumRozeti renk={bilgi.renk}>{bilgi.etiket}</DurumRozeti>
}

export type SatisDurumGorunumu = 'acik' | 'kapandi' | 'fazla'

/** Satış durumu (Açık/Kapandı/Fazla Ödeme) — kalan bakiyeden türetilir. */
export function satisDurumGorunumuHesapla(kalanKurus: number, backendDurum: 'acik' | 'kapandi'): SatisDurumGorunumu {
  if (backendDurum === 'acik') return 'acik'
  return kalanKurus < 0 ? 'fazla' : 'kapandi'
}

const SATIS_DURUM_BILGISI: Record<SatisDurumGorunumu, { renk: RozetRenk; etiket: string }> = {
  acik: { renk: 'tehlike', etiket: 'Açık' },
  kapandi: { renk: 'basari', etiket: 'Kapandı' },
  fazla: { renk: 'uyari', etiket: 'Fazla Ödeme' }
}

export function SatisDurumEtiketi({ gorunum }: { gorunum: SatisDurumGorunumu }) {
  const bilgi = SATIS_DURUM_BILGISI[gorunum]
  return <DurumRozeti renk={bilgi.renk}>{bilgi.etiket}</DurumRozeti>
}
