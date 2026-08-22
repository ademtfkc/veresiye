import { bugunIso, tarihFormatla } from '../lib/bicim'

/**
 * Yazdırılabilir rapor başlığı (Şartname 9 + 7: "dükkan adı başlıkta") — TÜM
 * raporlarda + Müşteri Ekstresi'nde aynı, tek gerçek kaynak. Ekranda VE
 * yazdırılan çıktıda görünür (no-print DEĞİL — bilerek, ekstre müşteriye
 * verilebilecek temiz bir çıktı olmalı, bkz. Şartname 8.3/9.4).
 */
export function RaporBasligi({
  dukkanAdi,
  raporAdi,
  altBilgi,
  logo
}: {
  dukkanAdi: string
  raporAdi: string
  altBilgi?: string
  logo?: string | null
}) {
  return (
    <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      {logo && (
        <img
          src={logo}
          alt=""
          style={{ height: 56, width: 'auto', maxWidth: 160, objectFit: 'contain', flex: 'none' }}
        />
      )}
      <div>
      <div
        style={{
          fontFamily: "'Cabinet Grotesk', 'IBM Plex Sans', sans-serif",
          fontWeight: 700,
          fontSize: 22
        }}
      >
        {dukkanAdi}
      </div>
      <div style={{ fontSize: 18, marginTop: 4, fontWeight: 600 }}>{raporAdi}</div>
      {altBilgi && (
        <div style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>{altBilgi}</div>
      )}
      <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>
        Oluşturulma tarihi: {tarihFormatla(bugunIso())}
      </div>
      </div>
    </div>
  )
}
