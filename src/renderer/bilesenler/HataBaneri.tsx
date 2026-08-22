import { Buton } from './Buton'

/**
 * Hata durumu — backend'den gelen `{basarili:false, hata:"…"}` mesajı OLDUĞU
 * GİBİ gösterilir (zaten sade Türkçe, bkz. src/main/ipc/guvenliCagri.ts).
 */
export function HataBaneri({ mesaj, tekrarDene }: { mesaj: string; tekrarDene?: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        background: 'var(--danger-soft)',
        border: '1px solid var(--danger)',
        borderRadius: 8,
        color: 'var(--danger)'
      }}
    >
      <i className="ph ph-warning-circle" style={{ fontSize: 24, flex: 'none' }} aria-hidden="true" />
      <div style={{ color: 'var(--text)', flex: 1 }}>{mesaj}</div>
      {tekrarDene && (
        <Buton tur="ikincil" onClick={tekrarDene}>
          Tekrar Dene
        </Buton>
      )}
    </div>
  )
}
