import { ParaGoster, type ParaBoyutu } from './ParaGoster'

/** Kontrol Paneli'ndeki 3 büyük özet kutusu (Şartname 8.1). */
interface KpiKutusuProps {
  ikon: string
  baslik: string
  kurus?: number
  metin?: string
  renk: string
  altYazi: string
}

export function KpiKutusu({ ikon, baslik, kurus, metin, renk, altYazi }: KpiKutusuProps) {
  const boyut: ParaBoyutu = 'buyuk'
  return (
    <div
      style={{
        flex: 1,
        minWidth: 240,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '20px 22px'
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: 'var(--text2)',
          textTransform: 'uppercase',
          letterSpacing: '.05em',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <i className={`ph ${ikon}`} style={{ fontSize: 18 }} aria-hidden="true" />
        {baslik}
      </div>
      <div style={{ marginTop: 12 }}>
        {metin !== undefined ? (
          <span className="mono" style={{ fontSize: 36, fontWeight: 600, color: renk, lineHeight: 1 }}>
            {metin}
          </span>
        ) : (
          <ParaGoster kurus={kurus} boyut={boyut} renk={renk} />
        )}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>{altYazi}</div>
    </div>
  )
}
