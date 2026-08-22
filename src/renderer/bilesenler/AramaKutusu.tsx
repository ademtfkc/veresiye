import type { InputHTMLAttributes } from 'react'

/**
 * Büyük arama kutusu — Şartname 8.2: "Müşteriler ekranının en önemli öğesi."
 * Solda büyüteç ikonu, geniş dolgu, büyük yazı (tasarımdaki gibi).
 */
interface AramaKutusuProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  deger: string
  onDegisti: (deger: string) => void
}

export function AramaKutusu({ deger, onDegisti, placeholder, ...rest }: AramaKutusuProps) {
  return (
    <div style={{ position: 'relative' }}>
      <i
        className="ph ph-magnifying-glass"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 18,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 22,
          color: 'var(--text2)'
        }}
      />
      <input
        {...rest}
        type="text"
        value={deger}
        onChange={(e) => onDegisti(e.target.value)}
        placeholder={placeholder ?? 'Ara…'}
        aria-label={placeholder ?? 'Ara'}
        style={{
          width: '100%',
          padding: '17px 18px 17px 52px',
          fontSize: 19,
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: 'var(--surface)',
          color: 'var(--text)'
        }}
      />
    </div>
  )
}
