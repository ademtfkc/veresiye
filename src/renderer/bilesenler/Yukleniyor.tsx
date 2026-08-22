/**
 * Yükleniyor durumu — hiçbir ekran veri gelene kadar boş beyaz kalmaz.
 * Basit ama net: dönen ikon + Türkçe mesaj.
 */
export function Yukleniyor({ mesaj = 'Yükleniyor…' }: { mesaj?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '48px 0',
        color: 'var(--text2)',
        fontSize: 16
      }}
    >
      <i
        className="ph ph-spinner"
        aria-hidden="true"
        style={{ fontSize: 22, animation: 'donDur 0.9s linear infinite' }}
      />
      <span>{mesaj}</span>
      <style>{'@keyframes donDur { to { transform: rotate(360deg); } }'}</style>
    </div>
  )
}
