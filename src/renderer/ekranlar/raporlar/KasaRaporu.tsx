import { useCallback, useEffect, useState } from 'react'
import { HataBaneri } from '../../bilesenler/HataBaneri'
import { KpiKutusu } from '../../bilesenler/KpiKutusu'
import { ParaGoster } from '../../bilesenler/ParaGoster'
import { RaporAraclari } from '../../bilesenler/RaporAraclari'
import { RaporBasligi } from '../../bilesenler/RaporBasligi'
import { Tablo, type TabloSutunu } from '../../bilesenler/Tablo'
import { useToast } from '../../bilesenler/Toast'
import { buAyBaslangicIso, bugunIso, odemeSekliEtiketi, paraFormatla, tarihFormatla } from '../../lib/bicim'
import { raporDosyaAdi } from '../../lib/disaAktar'
import { csvyeAktar, excelAktar } from '../../lib/disaAktarApi'
import type { NavProps } from '../../lib/navigasyon'
import type { KasaRaporu as KasaRaporuVerisi } from '../../../main/services'
import type { KasaHareketSatiri } from '../../../main/db/repositories'
import type { OdemeSekli } from '../../../main/db/types'

interface Props extends NavProps {
  dukkanAdi: string
  logo: string | null
}

const ODEME_SEKLI_IKONU: Record<OdemeSekli, string> = { nakit: 'ph-money', kart: 'ph-credit-card', havale: 'ph-bank' }

/** Kasa (Tahsilat) Raporu (Şartname 9.2) — tarih aralığı ZORUNLU + ödeme şekline göre kırılım. */
export function KasaRaporu({ dukkanAdi, logo, git }: Props) {
  const toast = useToast()
  const [baslangic, setBaslangic] = useState(buAyBaslangicIso())
  const [bitis, setBitis] = useState(bugunIso())
  const [durum, setDurum] = useState<'yukleniyor' | 'hata' | 'hazir'>('yukleniyor')
  const [hata, setHata] = useState('')
  const [veri, setVeri] = useState<KasaRaporuVerisi | null>(null)
  const [aktarimDevamEdiyor, setAktarimDevamEdiyor] = useState(false)

  const yukle = useCallback(() => {
    setDurum('yukleniyor')
    window.api.raporKasa(baslangic, bitis).then((sonuc) => {
      if (sonuc.basarili) {
        setVeri(sonuc.veri)
        setDurum('hazir')
      } else {
        setHata(sonuc.hata)
        setDurum('hata')
      }
    })
  }, [baslangic, bitis])

  useEffect(() => {
    yukle()
  }, [yukle])

  const altBilgi = `Tahsilat tarihi: ${tarihFormatla(baslangic)} – ${tarihFormatla(bitis)}`

  const sutunlar: TabloSutunu<KasaHareketSatiri>[] = [
    { anahtar: 'tarih', baslik: 'Tarih', render: (h) => <span className="mono" style={{ color: 'var(--text2)' }}>{tarihFormatla(h.tarih)}</span> },
    { anahtar: 'musteri', baslik: 'Müşteri', render: (h) => <span style={{ fontWeight: 500 }}>{h.ad_soyad}</span> },
    { anahtar: 'tutar', baslik: 'Tutar', hizalama: 'right', render: (h) => <ParaGoster kurus={h.tutar} renk="var(--success)" /> },
    { anahtar: 'sekil', baslik: 'Ödeme Şekli', render: (h) => odemeSekliEtiketi(h.odeme_sekli) },
    { anahtar: 'not', baslik: 'Not', render: (h) => <span style={{ color: 'var(--text2)' }}>{h.not || '—'}</span> }
  ]

  function tabloOlustur() {
    if (!veri) return null
    const kirilimMetni = veri.kirilim.map((k) => `${odemeSekliEtiketi(k.odeme_sekli)}: ${paraFormatla(k.toplam)}`).join(' · ')
    return {
      dosyaAdi: raporDosyaAdi('kasa-raporu'),
      baslik: 'Kasa (Tahsilat) Raporu',
      altBilgi: [dukkanAdi, altBilgi, kirilimMetni],
      basliklar: ['Tarih', 'Müşteri', 'Tutar', 'Ödeme Şekli', 'Not'],
      satirlar: [
        ...veri.hareketler.map((h) => [tarihFormatla(h.tarih), h.ad_soyad, paraFormatla(h.tutar), odemeSekliEtiketi(h.odeme_sekli), h.not || '']),
        ['', '', paraFormatla(veri.genelToplam), 'GENEL TOPLAM', '']
      ]
    }
  }

  async function csvIndir() {
    const tablo = tabloOlustur()
    if (!tablo) return
    setAktarimDevamEdiyor(true)
    const sonuc = await csvyeAktar(tablo)
    setAktarimDevamEdiyor(false)
    if (!sonuc.basarili) toast.goster(sonuc.hata)
    else if (!sonuc.iptal) toast.goster(`CSV dosyası kaydedildi: ${sonuc.yol}`)
  }

  async function excelIndir() {
    const tablo = tabloOlustur()
    if (!tablo) return
    setAktarimDevamEdiyor(true)
    const sonuc = await excelAktar(tablo)
    setAktarimDevamEdiyor(false)
    if (!sonuc.basarili) toast.goster(sonuc.hata)
    else if (!sonuc.iptal) toast.goster(`Excel dosyası kaydedildi: ${sonuc.yol}`)
  }

  return (
    <div className="yazdir-alani">
      <RaporAraclari
        baslangic={baslangic}
        bitis={bitis}
        onBaslangicDegisti={setBaslangic}
        onBitisDegisti={setBitis}
        onCsv={csvIndir}
        onExcel={excelIndir}
        disabled={durum !== 'hazir' || !veri || veri.hareketler.length === 0}
        csvExcelDevamEdiyor={aktarimDevamEdiyor}
      />

      <RaporBasligi dukkanAdi={dukkanAdi} logo={logo} raporAdi="Kasa (Tahsilat) Raporu" altBilgi={altBilgi} />

      {durum === 'hata' && <HataBaneri mesaj={hata} tekrarDene={yukle} />}

      {veri && durum !== 'hata' && (
        <>
          <div className="no-print" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <KpiKutusu ikon="ph-coins" baslik="Toplam Tahsilat" kurus={veri.genelToplam} renk="var(--success)" altYazi="Seçilen aralık" />
            {(['nakit', 'kart', 'havale'] as OdemeSekli[]).map((sekil) => {
              const kirilimSatiri = veri.kirilim.find((k) => k.odeme_sekli === sekil)
              return (
                <KpiKutusu
                  key={sekil}
                  ikon={ODEME_SEKLI_IKONU[sekil]}
                  baslik={odemeSekliEtiketi(sekil)}
                  kurus={kirilimSatiri?.toplam ?? 0}
                  renk="var(--primary)"
                  altYazi={`${kirilimSatiri?.adet ?? 0} tahsilat`}
                />
              )
            })}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <Tablo
              sutunlar={sutunlar}
              satirlar={veri.hareketler}
              satirAnahtari={(h) => h.id}
              onSatirTikla={(h) => git({ tur: 'kart', musteriId: h.musteri_id })}
              yukleniyor={durum === 'yukleniyor'}
              bosDurumMesaji="Seçilen tarih aralığında tahsilat yok."
              bosDurumIkon="ph-hand-coins"
            />
          </div>

          {veri.hareketler.length > 0 && (
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '14px 20px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase' }}>Genel Toplam</div>
                <ParaGoster kurus={veri.genelToplam} boyut="buyuk" renk="var(--success)" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
