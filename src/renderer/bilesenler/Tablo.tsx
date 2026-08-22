import type { ReactNode } from 'react'
import { BosDurum } from './BosDurum'
import { Yukleniyor } from './Yukleniyor'

/**
 * Tek genel tablo bileşeni — Kırmızı Liste, Müşteriler, Satışlar vb. tüm
 * tablolar bunu kullanır (başlık/satır yüksekliği/kenarlık tek yerden).
 */
export interface TabloSutunu<T> {
  anahtar: string
  baslik: ReactNode
  hizalama?: 'left' | 'right'
  genislikPx?: number
  render: (satir: T) => ReactNode
}

interface TabloProps<T> {
  sutunlar: TabloSutunu<T>[]
  satirlar: T[]
  satirAnahtari: (satir: T) => string | number
  onSatirTikla?: (satir: T) => void
  yukleniyor?: boolean
  bosDurumMesaji?: string
  bosDurumIkon?: string
}

export function Tablo<T>({
  sutunlar,
  satirlar,
  satirAnahtari,
  onSatirTikla,
  yukleniyor = false,
  bosDurumMesaji = 'Kayıt bulunamadı.',
  bosDurumIkon
}: TabloProps<T>) {
  if (yukleniyor) return <Yukleniyor />
  if (satirlar.length === 0) return <BosDurum mesaj={bosDurumMesaji} ikon={bosDurumIkon} />

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {sutunlar.map((sutun) => (
            <th
              key={sutun.anahtar}
              style={{
                textAlign: sutun.hizalama ?? 'left',
                padding: '12px 16px',
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                color: 'var(--text2)',
                borderBottom: '2px solid var(--border)',
                width: sutun.genislikPx
              }}
            >
              {sutun.baslik}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {satirlar.map((satir) => (
          <tr
            key={satirAnahtari(satir)}
            data-row={onSatirTikla ? true : undefined}
            tabIndex={onSatirTikla ? 0 : undefined}
            onClick={onSatirTikla ? () => onSatirTikla(satir) : undefined}
            onKeyDown={
              onSatirTikla
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSatirTikla(satir)
                    }
                  }
                : undefined
            }
          >
            {sutunlar.map((sutun) => (
              <td
                key={sutun.anahtar}
                style={{
                  textAlign: sutun.hizalama ?? 'left',
                  padding: '0 16px',
                  height: 'var(--row-h)',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                {sutun.render(satir)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
