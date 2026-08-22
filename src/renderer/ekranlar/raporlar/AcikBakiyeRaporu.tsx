import { useCallback, useEffect, useState } from 'react'
import { HataBaneri } from '../../bilesenler/HataBaneri'
import { ParaGoster } from '../../bilesenler/ParaGoster'
import { RaporAraclari } from '../../bilesenler/RaporAraclari'
import { RaporBasligi } from '../../bilesenler/RaporBasligi'
import { Tablo, type TabloSutunu } from '../../bilesenler/Tablo'
import { useToast } from '../../bilesenler/Toast'
import { paraFormatla, tarihFormatla } from '../../lib/bicim'
import { raporDosyaAdi } from '../../lib/disaAktar'
import { csvyeAktar, excelAktar } from '../../lib/disaAktarApi'
import type { NavProps } from '../../lib/navigasyon'
import type { AcikBakiyeRaporu as AcikBakiyeRaporuVerisi } from '../../../main/services'
import type { AcikBakiyeSatiri } from '../../../main/db/repositories'

interface Props extends NavProps {
  dukkanAdi: string
  logo: string | null
}

/** Açık Bakiye Raporu (Şartname 9.1) — kim ne kadar borçlu, büyükten küçüğe. */
export function AcikBakiyeRaporu({ dukkanAdi, logo, git }: Props) {
  const toast = useToast()
  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')
  const [durum, setDurum] = useState<'yukleniyor' | 'hata' | 'hazir'>('yukleniyor')
  const [hata, setHata] = useState('')
  const [veri, setVeri] = useState<AcikBakiyeRaporuVerisi | null>(null)
  const [aktarimDevamEdiyor, setAktarimDevamEdiyor] = useState(false)

  const yukle = useCallback(() => {
    setDurum('yukleniyor')
    window.api.raporAcikBakiye(baslangic || undefined, bitis || undefined).then((sonuc) => {
      if (sonuc.basarili) {
        setVeri(sonuc.veri)
        setDurum('hazir')
      } else {
        // Tarih aralığı geçersizse (ör. başlangıç > bitiş) backend zaten sade
        // Türkçe bir hata döner — burada ikinci bir kontrol tekrarlanmıyor.
        setHata(sonuc.hata)
        setDurum('hata')
      }
    })
  }, [baslangic, bitis])

  useEffect(() => {
    yukle()
  }, [yukle])

  const altBilgi = baslangic || bitis
    ? `Satış tarihi: ${baslangic ? tarihFormatla(baslangic) : 'başlangıç yok'} – ${bitis ? tarihFormatla(bitis) : 'bugün'}`
    : 'Tüm zamanlar — güncel açık bakiyeler'

  const sutunlar: TabloSutunu<AcikBakiyeSatiri>[] = [
    { anahtar: 'ad', baslik: 'Müşteri', render: (s) => <span style={{ fontWeight: 500 }}>{s.ad_soyad}</span> },
    {
      anahtar: 'tel',
      baslik: 'Telefon',
      render: (s) => (
        <span className="mono" style={{ color: 'var(--text2)' }}>
          {s.telefon || '—'}
        </span>
      )
    },
    { anahtar: 'toplam', baslik: 'Toplam', hizalama: 'right', render: (s) => <ParaGoster kurus={s.toplam} boyut="kucuk" /> },
    {
      anahtar: 'odenen',
      baslik: 'Ödenen',
      hizalama: 'right',
      render: (s) => <ParaGoster kurus={s.odenen} boyut="kucuk" renk="var(--success)" />
    },
    { anahtar: 'kalan', baslik: 'Kalan Bakiye', hizalama: 'right', render: (s) => <ParaGoster kurus={s.kalan} renk="var(--danger)" /> }
  ]

  function tabloOlustur() {
    if (!veri) return null
    return {
      dosyaAdi: raporDosyaAdi('acik-bakiye-raporu'),
      baslik: 'Açık Bakiye Raporu',
      altBilgi: [dukkanAdi, altBilgi],
      basliklar: ['Müşteri', 'Telefon', 'Toplam', 'Ödenen', 'Kalan Bakiye'],
      satirlar: [
        ...veri.satirlar.map((s) => [s.ad_soyad, s.telefon || '', paraFormatla(s.toplam), paraFormatla(s.odenen), paraFormatla(s.kalan)]),
        ['', '', '', 'GENEL TOPLAM', paraFormatla(veri.genelToplam.kalan)]
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
        onTemizle={baslangic || bitis ? () => { setBaslangic(''); setBitis('') } : undefined}
        onCsv={csvIndir}
        onExcel={excelIndir}
        disabled={durum !== 'hazir' || !veri || veri.satirlar.length === 0}
        csvExcelDevamEdiyor={aktarimDevamEdiyor}
      />

      <RaporBasligi dukkanAdi={dukkanAdi} logo={logo} raporAdi="Açık Bakiye Raporu" altBilgi={altBilgi} />

      {durum === 'hata' && <HataBaneri mesaj={hata} tekrarDene={yukle} />}

      {veri && durum !== 'hata' && (
        <>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <Tablo
              sutunlar={sutunlar}
              satirlar={veri.satirlar}
              satirAnahtari={(s) => s.musteri_id}
              onSatirTikla={(s) => git({ tur: 'kart', musteriId: s.musteri_id })}
              yukleniyor={durum === 'yukleniyor'}
              bosDurumMesaji="Seçilen aralıkta açık bakiyesi olan müşteri yok."
              bosDurumIkon="ph-confetti"
            />
          </div>

          {veri.satirlar.length > 0 && (
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 28,
                padding: '14px 20px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase' }}>Toplam</div>
                <ParaGoster kurus={veri.genelToplam.toplam} boyut="normal" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase' }}>Ödenen</div>
                <ParaGoster kurus={veri.genelToplam.odenen} boyut="normal" renk="var(--success)" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase' }}>Genel Kalan</div>
                <ParaGoster kurus={veri.genelToplam.kalan} boyut="buyuk" renk="var(--danger)" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
