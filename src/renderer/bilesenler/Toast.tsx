import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

/**
 * Toast — her kayıttan sonra net bir onay mesajı göstermek için (Şartname
 * 7.1: "Tahsilat kaydedildi. Kalan bakiye: 4.500,00 ₺" gibi). Uygulama
 * kökünde bir kez <ToastSaglayici> ile sarmalanır; herhangi bir ekran
 * `useToast().goster('mesaj')` çağırarak üstte 3.8 saniyelik yeşil bir
 * bildirim gösterir (bkz. tasarim/Perde Takip.dc.html showToast).
 */
interface ToastBaglami {
  goster: (mesaj: string) => void
}

const ToastContext = createContext<ToastBaglami | null>(null)

export function useToast(): ToastBaglami {
  const baglam = useContext(ToastContext)
  if (!baglam) throw new Error('useToast, <ToastSaglayici> içinde kullanılmalı.')
  return baglam
}

export function ToastSaglayici({ children }: { children: ReactNode }) {
  const [mesaj, setMesaj] = useState<string | null>(null)
  const zamanlayiciRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goster = useCallback((yeniMesaj: string) => {
    if (zamanlayiciRef.current) clearTimeout(zamanlayiciRef.current)
    setMesaj(yeniMesaj)
    zamanlayiciRef.current = setTimeout(() => setMesaj(null), 3800)
  }, [])

  const deger = useMemo(() => ({ goster }), [goster])

  return (
    <ToastContext.Provider value={deger}>
      {children}
      {mesaj && (
        <div
          role="status"
          aria-live="polite"
          className="no-print"
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            background: 'var(--success)',
            color: '#fff',
            padding: '15px 24px',
            borderRadius: 8,
            fontSize: 17,
            fontWeight: 600,
            boxShadow: '0 10px 30px rgba(0,0,0,.22)',
            animation: 'toastIn .25s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            maxWidth: '90vw'
          }}
        >
          <i className="ph ph-check-circle" style={{ fontSize: 24, flex: 'none' }} aria-hidden="true" />
          <span>{mesaj}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}
