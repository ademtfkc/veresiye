import { ParaGoster } from './ParaGoster'
import { paraFormatla, paraGirdisiniKurusaCevir } from '../lib/bicim'

/**
 * SATIŞ TOPLAMI KUTUSU (02.08.2026 — CEO isteği).
 *
 * Dükkan sahibi pazarlıkta toptan fiyat veriyor ("indirim yaptım, 8.500'e
 * anlaştık") ve satır satır fiyat girmek istemiyor; ama perde ölçülerini yine
 * kayda geçirmek istiyor. Bu yüzden toplam artık SADECE hesaplanan bir rakam
 * değil, ÜZERİNE YAZILABİLİR bir kutu:
 *
 *   - Kutu BOŞSA  → toplam = satırların toplamı (eski davranış, hiçbir şey değişmez)
 *   - Kutu DOLUSA → toplam odur; satır tutarları (hepsi 0 olabilir) karışmaz
 *
 * İkisi çakışırsa (satırlarda da fiyat var, kutuya da rakam yazılmış) yazılan
 * kazanır ve aradaki fark "indirim" olarak açıkça gösterilir — yanlış yazılan
 * bir rakam gözden kaçmasın diye (CEO kararı: "uyarı göster").
 *
 * Hem Yeni Satış hem Satışı Düzenle ekranı bunu kullanır.
 */
interface SatisToplamKutusuProps {
  /** Satır tutarlarının toplamı (kuruş) — kutu boşken geçerli olan değer. */
  satirlarToplami: number
  /** Kullanıcının kutuya yazdığı ham metin ("8.500" gibi); boş metin = "hesapla". */
  deger: string
  onDegis: (yeniDeger: string) => void
  etiket?: string
}

export function SatisToplamKutusu({
  satirlarToplami,
  deger,
  onDegis,
  etiket = 'Satış Toplamı'
}: SatisToplamKutusuProps) {
  const elleYazildi = deger.trim() !== ''
  const elleToplam = paraGirdisiniKurusaCevir(deger)
  const gecerliToplam = elleYazildi ? elleToplam : satirlarToplami
  const fark = satirlarToplami - elleToplam

  return (
    <div
      style={{
        padding: '18px 22px',
        background: 'var(--primary-soft)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <label
          htmlFor="satis-toplami"
          style={{ fontSize: 15, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}
        >
          {etiket}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            id="satis-toplami"
            value={deger}
            onChange={(e) => onDegis(e.target.value)}
            inputMode="decimal"
            className="mono"
            placeholder={paraFormatla(satirlarToplami).replace(' ₺', '')}
            aria-label="Satış toplamı — boş bırakırsanız satırların toplamı kullanılır"
            style={{
              width: 220,
              padding: '10px 14px',
              fontSize: 26,
              fontWeight: 700,
              textAlign: 'right',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--surface)',
              color: 'var(--primary)'
            }}
          />
          <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--primary)' }}>
            ₺
          </span>
        </div>
      </div>

      {!elleYazildi && (
        <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'right' }}>
          Boş bırakırsanız satırların toplamı yazılır. Toptan fiyat verdiyseniz buraya son rakamı yazın.
        </div>
      )}

      {elleYazildi && satirlarToplami > 0 && fark !== 0 && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 13.5
          }}
        >
          <i className="ph ph-info" style={{ fontSize: 18, flex: 'none', color: 'var(--text2)' }} aria-hidden="true" />
          <div>
            Satırların toplamı <b className="mono">{paraFormatla(satirlarToplami)}</b>, siz{' '}
            <b className="mono">{paraFormatla(elleToplam)}</b> yazdınız —{' '}
            {fark > 0 ? (
              <>
                <b>{paraFormatla(fark)} indirim</b> uygulanmış olacak.
              </>
            ) : (
              <>
                <b>{paraFormatla(-fark)} fazla</b> yazılmış olacak.
              </>
            )}
          </div>
        </div>
      )}

      {elleYazildi && (
        <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'right' }}>
          Bu satış <ParaGoster kurus={gecerliToplam} renk="var(--primary)" /> olarak kaydedilecek.
        </div>
      )}
    </div>
  )
}
