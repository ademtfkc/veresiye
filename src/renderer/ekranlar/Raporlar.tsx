import { useState } from 'react'
import { SegmentliSecim, type SegmentSecenegi } from '../bilesenler/SegmentliSecim'
import type { NavProps } from '../lib/navigasyon'
import type { RaporTuru } from '../lib/navigasyon'
import { AcikBakiyeRaporu } from './raporlar/AcikBakiyeRaporu'
import { KasaRaporu } from './raporlar/KasaRaporu'
import { GecikenRaporu } from './raporlar/GecikenRaporu'
import { MusteriEkstresi } from './raporlar/MusteriEkstresi'

interface RaporlarProps extends NavProps {
  dukkanAdi: string
  logo: string | null
  baslangicTuru?: RaporTuru
  baslangicMusteriId?: number
}

const SEKME_SECENEKLERI: SegmentSecenegi<RaporTuru>[] = [
  { deger: 'acikBakiye', etiket: 'Açık Bakiye' },
  { deger: 'kasa', etiket: 'Kasa (Tahsilat)' },
  { deger: 'geciken', etiket: 'Geciken Hesaplar' },
  { deger: 'ekstre', etiket: 'Müşteri Ekstresi' }
]

/**
 * Raporlar (Şartname Böl.9) — 4 rapor, hepsi tarih aralığı filtreli + A4
 * yazdırılabilir (`@media print`, bkz. global.css) + CSV/Excel'e aktarılabilir
 * (bkz. lib/disaAktar.ts). Sekmeler + araç çubuğu `.no-print` — yazdırılan
 * çıktıda sadece dükkan başlığı + tablo görünür.
 */
export function Raporlar({ git, dukkanAdi, logo, baslangicTuru, baslangicMusteriId }: RaporlarProps) {
  const [sekme, setSekme] = useState<RaporTuru>(baslangicTuru ?? 'acikBakiye')

  return (
    <div className="yazdir-alani" style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div className="no-print" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 30 }}>Raporlar</h1>
        <div style={{ marginTop: 16 }}>
          <SegmentliSecim secenekler={SEKME_SECENEKLERI} secili={sekme} onSec={setSekme} />
        </div>
      </div>

      {sekme === 'acikBakiye' && <AcikBakiyeRaporu dukkanAdi={dukkanAdi} logo={logo} git={git} />}
      {sekme === 'kasa' && <KasaRaporu dukkanAdi={dukkanAdi} logo={logo} git={git} />}
      {sekme === 'geciken' && <GecikenRaporu dukkanAdi={dukkanAdi} logo={logo} git={git} />}
      {sekme === 'ekstre' && (
        <MusteriEkstresi dukkanAdi={dukkanAdi} logo={logo} git={git} baslangicMusteriId={baslangicMusteriId} />
      )}
    </div>
  )
}
