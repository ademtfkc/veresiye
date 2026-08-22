/** Faz 3 kapsamı dışındaki ekranlar (Raporlar, Ayarlar) için geçici "yakında" içeriği. */
export function YakindaEkrani({ baslik, ikon }: { baslik: string; ikon: string }) {
  return (
    <div style={{ padding: '28px 32px', maxWidth: 700 }}>
      <h1 style={{ fontSize: 30 }}>{baslik}</h1>
      <div
        style={{
          marginTop: 20,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 40,
          textAlign: 'center',
          color: 'var(--text2)'
        }}
      >
        <i className={`ph ${ikon}`} style={{ fontSize: 36, opacity: 0.6 }} aria-hidden="true" />
        <div style={{ marginTop: 12, fontSize: 17 }}>Bu ekran yakında hazır olacak.</div>
        <div style={{ marginTop: 4, fontSize: 14 }}>Veresiye geliştirmesinin sonraki bir aşamasında eklenecek.</div>
      </div>
    </div>
  )
}
