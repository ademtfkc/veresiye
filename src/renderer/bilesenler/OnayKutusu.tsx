import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Modal } from './Modal'

/**
 * OnayKutusu — silme gibi geri dönüşü olmayan işlemlerden önce ZORUNLU onay
 * (Şartname 7.1: "Silme işlemlerinde mutlaka onay sorulsun"). Uygulama
 * kökünde <OnaySaglayici> ile sarmalanır; herhangi bir ekran
 * `const onaylandi = await useOnay().sor('… silinecek.')` şeklinde kullanır.
 */
interface OnayBaglami {
  sor: (mesaj: string) => Promise<boolean>
}

const OnayContext = createContext<OnayBaglami | null>(null)

export function useOnay(): OnayBaglami {
  const baglam = useContext(OnayContext)
  if (!baglam) throw new Error('useOnay, <OnaySaglayici> içinde kullanılmalı.')
  return baglam
}

interface BekleyenOnay {
  mesaj: string
  cozumle: (sonuc: boolean) => void
}

export function OnaySaglayici({ children }: { children: ReactNode }) {
  const [bekleyen, setBekleyen] = useState<BekleyenOnay | null>(null)

  const sor = useCallback((mesaj: string) => {
    return new Promise<boolean>((cozumle) => {
      setBekleyen({ mesaj, cozumle })
    })
  }, [])

  const kapat = useCallback(
    (sonuc: boolean) => {
      bekleyen?.cozumle(sonuc)
      setBekleyen(null)
    },
    [bekleyen]
  )

  const deger = useMemo(() => ({ sor }), [sor])

  return (
    <OnayContext.Provider value={deger}>
      {children}
      {bekleyen && (
        <Modal kapat={() => kapat(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <i className="ph ph-warning" style={{ fontSize: 28, color: 'var(--danger)' }} aria-hidden="true" />
            <h3 style={{ fontSize: 20 }}>Emin misiniz?</h3>
          </div>
          <div style={{ marginTop: 12, color: 'var(--text2)', fontSize: 16 }}>{bekleyen.mesaj}</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <button
              type="button"
              onClick={() => kapat(false)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '12px 20px',
                borderRadius: 6,
                fontSize: 16,
                cursor: 'pointer'
              }}
            >
              Vazgeç
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => kapat(true)}
              style={{
                background: 'var(--danger)',
                color: '#fff',
                border: 'none',
                padding: '12px 22px',
                borderRadius: 6,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Sil
            </button>
          </div>
        </Modal>
      )}
    </OnayContext.Provider>
  )
}
