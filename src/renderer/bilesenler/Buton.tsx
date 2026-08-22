import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

/**
 * Tek düğme bileşeni — tüm renk/dolgu/köşe değerleri buradan gelir (tasarım
 * sistemine sadık kalmak için tek merkez). `tur` görsel ağırlığı belirler.
 */
export type ButonTuru = 'birincil' | 'ikincil' | 'tehlike' | 'hayalet'

interface ButonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tur?: ButonTuru
  ikon?: string
  buyuk?: boolean
  children: ReactNode
}

const TUR_STILLERI: Record<ButonTuru, CSSProperties> = {
  birincil: { background: 'var(--primary)', color: '#fff', border: 'none' },
  ikincil: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  tehlike: { background: 'transparent', color: 'var(--danger)', border: '1px solid var(--border)' },
  hayalet: { background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' }
}

export function Buton({ tur = 'ikincil', ikon, buyuk = false, children, style, type, disabled, ...rest }: ButonProps) {
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled}
      style={{
        ...TUR_STILLERI[tur],
        padding: buyuk ? '13px 22px' : '11px 16px',
        borderRadius: 6,
        fontSize: buyuk ? 16 : 15,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        whiteSpace: 'nowrap',
        ...style
      }}
      {...rest}
    >
      {ikon && <i className={`ph ${ikon}`} style={{ fontSize: buyuk ? 20 : 18 }} aria-hidden="true" />}
      {children}
    </button>
  )
}
