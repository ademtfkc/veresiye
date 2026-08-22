import type { CSSProperties, ReactNode } from 'react'

/**
 * Ortak modal kabuğu — OnayKutusu, "Peşinat aldınız mı?" ve "Yeni Müşteri"
 * pencereleri bunun üstüne kurulur (bkz. tasarim/Perde Takip.dc.html, confirm/
 * pesinat blokları). Tek gerçek kaynak: kenar boşluğu/gölge/animasyon burada.
 */
interface ModalProps {
  children: ReactNode
  genislikPx?: number
  merkezliMetin?: boolean
  kapat?: () => void
}

const ustKatmanStil: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 70,
  background: 'rgba(20,25,28,.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'fadeIn .15s ease',
  padding: 20
}

export function Modal({ children, genislikPx = 420, merkezliMetin = false, kapat }: ModalProps) {
  return (
    <div
      style={ustKatmanStil}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) kapat?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 26,
          maxWidth: genislikPx,
          width: '100%',
          textAlign: merkezliMetin ? 'center' : 'left'
        }}
      >
        {children}
      </div>
    </div>
  )
}
