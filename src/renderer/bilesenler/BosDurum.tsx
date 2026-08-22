/** Boş durum — "hiç kayıt yok" ekranını beyaz bırakmak yerine anlamlı bir mesaj gösterir. */
export function BosDurum({ ikon = 'ph-tray', mesaj }: { ikon?: string; mesaj: string }) {
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--text2)',
        fontSize: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10
      }}
    >
      <i className={`ph ${ikon}`} aria-hidden="true" style={{ fontSize: 32, opacity: 0.6 }} />
      <span>{mesaj}</span>
    </div>
  )
}
