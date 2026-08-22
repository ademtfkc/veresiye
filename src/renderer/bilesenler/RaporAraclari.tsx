import { useState } from 'react'
import { Buton } from './Buton'
import { yazdir, type KagitBoyutu } from '../lib/yazdirma'

const tarihGirdiStili = {
  padding: '11px 14px',
  fontSize: 15,
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--text)'
} as const

/**
 * Tüm raporlarda ORTAK araç çubuğu (Şartname 9: "hepsi tarih aralığı
 * filtreli + yazdırılabilir + CSV/Excel'e aktarılabilir"). Yazdırma/CSV/Excel
 * butonları yazdırılan çıktıda GÖRÜNMEZ (`no-print`, bkz. global.css).
 */
export interface RaporAraclariProps {
  baslangic: string
  bitis: string
  onBaslangicDegisti: (deger: string) => void
  onBitisDegisti: (deger: string) => void
  onTemizle?: () => void
  onCsv: () => void
  onExcel: () => void
  disabled?: boolean
  csvExcelDevamEdiyor?: boolean
}

export function RaporAraclari({
  baslangic,
  bitis,
  onBaslangicDegisti,
  onBitisDegisti,
  onTemizle,
  onCsv,
  onExcel,
  disabled = false,
  csvExcelDevamEdiyor = false
}: RaporAraclariProps) {
  const [kagit, setKagit] = useState<KagitBoyutu>('A4')
  return (
    <div
      className="no-print"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 12,
        flexWrap: 'wrap',
        padding: '16px 18px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        marginBottom: 20
      }}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>
            Başlangıç
          </label>
          <input
            type="date"
            value={baslangic}
            onChange={(e) => onBaslangicDegisti(e.target.value)}
            className="mono"
            style={tarihGirdiStili}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>
            Bitiş
          </label>
          <input
            type="date"
            value={bitis}
            onChange={(e) => onBitisDegisti(e.target.value)}
            className="mono"
            style={tarihGirdiStili}
          />
        </div>
        {onTemizle && (
          <button
            type="button"
            onClick={onTemizle}
            style={{
              alignSelf: 'flex-end',
              background: 'none',
              border: 'none',
              color: 'var(--text2)',
              fontSize: 14,
              cursor: 'pointer',
              padding: '11px 4px'
            }}
          >
            Tarihi Temizle
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text2)' }}>
            Kağıt
          </label>
          <select
            value={kagit}
            onChange={(e) => setKagit(e.target.value as KagitBoyutu)}
            aria-label="Kağıt boyutu"
            style={tarihGirdiStili}
          >
            <option value="A4">A4</option>
            <option value="A3">A3</option>
          </select>
        </div>
        <Buton ikon="ph-printer" onClick={() => yazdir(kagit)} disabled={disabled}>
          Yazdır
        </Buton>
        <Buton ikon="ph-file-csv" onClick={onCsv} disabled={disabled || csvExcelDevamEdiyor}>
          CSV'ye Aktar
        </Buton>
        <Buton ikon="ph-file-xls" onClick={onExcel} disabled={disabled || csvExcelDevamEdiyor}>
          Excel'e Aktar
        </Buton>
      </div>
    </div>
  )
}
