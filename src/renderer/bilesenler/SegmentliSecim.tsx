/**
 * Yan yana seçim düğmeleri — Müşteriler filtre çipleri (Hepsi/Borçlular/
 * Gecikenler) ve Tahsilat "Ödeme Şekli" seçimi bu tek bileşeni kullanır.
 */
export interface SegmentSecenegi<T extends string> {
  deger: T
  etiket: string
  sayac?: number
}

interface SegmentliSecimProps<T extends string> {
  secenekler: SegmentSecenegi<T>[]
  secili: T
  onSec: (deger: T) => void
  esitGenislik?: boolean
}

export function SegmentliSecim<T extends string>({
  secenekler,
  secili,
  onSec,
  esitGenislik = false
}: SegmentliSecimProps<T>) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {secenekler.map((secenek) => {
        const aktif = secenek.deger === secili
        return (
          <button
            key={secenek.deger}
            type="button"
            aria-pressed={aktif}
            onClick={() => onSec(secenek.deger)}
            style={{
              flex: esitGenislik ? 1 : 'none',
              background: aktif ? 'var(--primary)' : 'var(--surface)',
              color: aktif ? '#fff' : 'var(--text)',
              border: `1px solid ${aktif ? 'var(--primary)' : 'var(--border)'}`,
              padding: '9px 16px',
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {secenek.etiket}
            {secenek.sayac !== undefined && <span style={{ opacity: 0.7 }}> ({secenek.sayac})</span>}
          </button>
        )
      })}
    </div>
  )
}
