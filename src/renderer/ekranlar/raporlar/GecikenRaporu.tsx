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
import type { GecikenRaporu as GecikenRaporuVerisi } from '../../../main/services'
import type { KirmiziListeSatiri } from '../../../main/services/gecikmeService'

interface Props extends NavProps {
  dukkanAdi: string
  logo: string | null
}

/**
 * Geciken Hesaplar Raporu (Şartname 9.3) — 30+ gündür ödemesi olmayan
 * borçlular. Gecikme tanımı DAİMA "bugün"e göre sabit (Şartname 6.3,
 * değişmez kural); tarih aralığı burada yalnızca listeyi son ödeme/satış
 * tarihine göre DARALTAN ek bir süzgeçtir, 30 gün kuralını değiştirmez.
 */
export function GecikenRaporu({ dukkanAdi, logo, git }: Props) {
  const toast = useToast()
  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')
  const [durum, setDurum] = useState<'yukleniyor' | 'hata' | 'hazir'>('yukleniyor')
  const [hata, setHata] = useState('')
  const [veri, setVeri] = useState<GecikenRaporuVerisi | null>(null)
  const [aktarimDevamEdiyor, setAktarimDevamEdiyor] = useState(false)

  const yukle = useCallback(() => {
    setDurum('yukleniyor')
    window.api.raporGeciken(baslangic || undefined, bitis || undefined).then((sonuc) => {
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

  const altBilgi =
    (baslangic || bitis
      ? `Son ödeme tarihi: ${baslangic ? tarihFormatla(baslangic) : 'başlangıç yok'} – ${bitis ? tarihFormatla(bitis) : 'bugün'}`
      : 'Tüm gecikmiş hesaplar') + ' — 30 gün ve üzeri, bugüne göre hesaplanır'

  const sutunlar: TabloSutunu<KirmiziListeSatiri>[] = [
    { anahtar: 'ad', baslik: 'Ad Soyad', render: (r) => <span style={{ fontWeight: 500 }}>{r.ad_soyad}</span> },
    { anahtar: 'tel', baslik: 'Telefon', render: (r) => <span className="mono" style={{ color: 'var(--text2)' }}>{r.telefon || '—'}</span> },
    { anahtar: 'bakiye', baslik: 'Kalan Bakiye', hizalama: 'right', render: (r) => <ParaGoster kurus={r.kalan_bakiye} renk="var(--danger)" /> },
    { anahtar: 'sonOdeme', baslik: 'Son Ödeme', render: (r) => <span className="mono" style={{ color: 'var(--text2)' }}>{tarihFormatla(r.son_odeme_tarihi)}</span> },
    { anahtar: 'gecikme', baslik: 'Gecikme', hizalama: 'right', render: (r) => <span className="mono" style={{ fontWeight: 600, color: 'var(--danger)' }}>{r.kac_gun_gecti} gün</span> }
  ]

  function tabloOlustur() {
    if (!veri) return null
    return {
      dosyaAdi: raporDosyaAdi('geciken-hesaplar-raporu'),
      baslik: 'Geciken Hesaplar Raporu',
      altBilgi: [dukkanAdi, altBilgi],
      basliklar: ['Ad Soyad', 'Telefon', 'Kalan Bakiye', 'Son Ödeme', 'Gecikme (gün)'],
      satirlar: veri.satirlar.map((r) => [r.ad_soyad, r.telefon || '', paraFormatla(r.kalan_bakiye), tarihFormatla(r.son_odeme_tarihi), r.kac_gun_gecti])
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

      <RaporBasligi dukkanAdi={dukkanAdi} logo={logo} raporAdi="Geciken Hesaplar Raporu" altBilgi={altBilgi} />

      {durum === 'hata' && <HataBaneri mesaj={hata} tekrarDene={yukle} />}

      {veri && durum !== 'hata' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <Tablo
            sutunlar={sutunlar}
            satirlar={veri.satirlar}
            satirAnahtari={(r) => r.musteri_id}
            onSatirTikla={(r) => git({ tur: 'kart', musteriId: r.musteri_id })}
            yukleniyor={durum === 'yukleniyor'}
            bosDurumMesaji="Gecikmiş ödemesi olan müşteri yok — harika gidiyor!"
            bosDurumIkon="ph-confetti"
          />
        </div>
      )}
    </div>
  )
}
