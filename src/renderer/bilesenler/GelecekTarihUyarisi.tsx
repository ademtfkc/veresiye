/**
 * Girilen tarih bugünden ileriyse nazik bir amber uyarı gösterir (Şartname
 * bunu yasaklamıyor, kayıt engellenmez — Tahsilat Ekle ve Devir ekranlarında
 * kullanılır, bkz. PROJE_DURUMU.md Böl.10, Faz 7 "gelecek tarih" bulgusu).
 */
export function GelecekTarihUyarisi({ gorunurMu }: { gorunurMu: boolean }) {
  if (!gorunurMu) return null
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'var(--warning-soft)',
        border: '1px solid var(--warning)',
        borderRadius: 8,
        color: 'var(--warning)',
        fontSize: 13.5
      }}
    >
      <i className="ph ph-warning-circle" style={{ fontSize: 18, flex: 'none' }} aria-hidden="true" />
      <div style={{ color: 'var(--text)' }}>Seçtiğiniz tarih bugünden ileride. Doğru olduğundan emin misiniz?</div>
    </div>
  )
}
