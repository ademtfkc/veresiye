import { useCallback, useEffect, useState } from 'react'
import { Buton } from '../bilesenler/Buton'
import { HataBaneri } from '../bilesenler/HataBaneri'
import { KpiKutusu } from '../bilesenler/KpiKutusu'
import { ParaGoster } from '../bilesenler/ParaGoster'
import { Tablo, type TabloSutunu } from '../bilesenler/Tablo'
import { useToast } from '../bilesenler/Toast'
import { Yukleniyor } from '../bilesenler/Yukleniyor'
import { ayYilTr, bugunUzunTr, tarihFormatla } from '../lib/bicim'
import type { NavProps } from '../lib/navigasyon'
import type { PanelOzeti, YedekDurumu } from '../../main/services'
import type { KirmiziListeSatiri } from '../../main/services/gecikmeService'

/**
 * Kontrol Paneli (Şartname 8.1) — açılış ekranı. Tek çağrı: panelOzet().
 * Sarı yedek hatırlatma şeridi (Şartname 4.4, Faz 6) ayrı ve bağımsız bir
 * çağrıyla (`yedekDurumu`) yükleniyor — panelOzet başarısız olsa bile bu
 * şerit kendi başına çalışmaya devam etsin diye kasıtlı olarak ayrıldı.
 */
export function KontrolPaneli({ git }: NavProps) {
  const toast = useToast()
  const [durum, setDurum] = useState<'yukleniyor' | 'hata' | 'hazir'>('yukleniyor')
  const [ozet, setOzet] = useState<PanelOzeti | null>(null)
  const [hata, setHata] = useState('')

  const yukle = useCallback(() => {
    setDurum('yukleniyor')
    window.api.panelOzet().then((sonuc) => {
      if (sonuc.basarili) {
        setOzet(sonuc.veri)
        setDurum('hazir')
      } else {
        setHata(sonuc.hata)
        setDurum('hata')
      }
    })
  }, [])

  useEffect(() => {
    yukle()
  }, [yukle])

  // -- Yedek hatırlatma şeridi (Şartname 4.4) -------------------------------
  const [yedekDurum, setYedekDurum] = useState<YedekDurumu | null>(null)
  const [yedekAliniyor, setYedekAliniyor] = useState(false)
  const [yedekHata, setYedekHata] = useState<string | null>(null)

  const yedekDurumuYukle = useCallback(() => {
    window.api.yedekDurumu().then((sonuc) => {
      if (sonuc.basarili) setYedekDurum(sonuc.veri)
    })
  }, [])

  useEffect(() => {
    yedekDurumuYukle()
  }, [yedekDurumuYukle])

  function yedekAl() {
    setYedekHata(null)
    setYedekAliniyor(true)
    window.api.yedekAl().then((sonuc) => {
      setYedekAliniyor(false)
      if (!sonuc.basarili) {
        setYedekHata(sonuc.hata)
        return
      }
      if (sonuc.veri.iptal) return // klasör seçimi iptal edildi — hata değil
      toast.goster(`Yedek alındı: ${tarihFormatla(sonuc.veri.tarih ?? null)}`)
      yedekDurumuYukle()
    })
  }

  const sutunlar: TabloSutunu<KirmiziListeSatiri>[] = [
    { anahtar: 'ad', baslik: 'Ad Soyad', render: (r) => <span style={{ fontWeight: 500 }}>{r.ad_soyad}</span> },
    {
      anahtar: 'tel',
      baslik: 'Telefon',
      render: (r) => (
        <span className="mono" style={{ color: 'var(--text2)' }}>
          {r.telefon || '—'}
        </span>
      )
    },
    {
      anahtar: 'bakiye',
      baslik: 'Kalan Bakiye',
      hizalama: 'right',
      render: (r) => <ParaGoster kurus={r.kalan_bakiye} renk="var(--danger)" boyut="normal" />
    },
    {
      anahtar: 'sonOdeme',
      baslik: 'Son Ödeme',
      render: (r) => (
        <span className="mono" style={{ color: 'var(--text2)' }}>
          {tarihFormatla(r.son_odeme_tarihi)}
        </span>
      )
    },
    {
      anahtar: 'gecikme',
      baslik: 'Gecikme',
      hizalama: 'right',
      render: (r) => (
        <span className="mono" style={{ fontWeight: 600, color: 'var(--danger)' }}>
          {r.kac_gun_gecti} gün
        </span>
      )
    }
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 30 }}>Kontrol Paneli</h1>
          <div style={{ color: 'var(--text2)', marginTop: 4 }}>{bugunUzunTr()} · günün özeti</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Buton ikon="ph-archive" onClick={() => git({ tur: 'devir' })}>
            Devir Girişi
          </Buton>
          <Buton ikon="ph-hand-coins" onClick={() => git({ tur: 'tahsilat' })}>
            Tahsilat Ekle
          </Buton>
          <Buton tur="birincil" ikon="ph-plus" buyuk onClick={() => git({ tur: 'yeniSatis' })}>
            Yeni Satış
          </Buton>
        </div>
      </div>

      {yedekDurum?.hatirlatmaGerekli && (
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            background: 'var(--warning-soft)',
            border: '1px solid var(--warning)',
            borderRadius: 8,
            color: 'var(--warning)',
            flexWrap: 'wrap'
          }}
        >
          <i className="ph ph-warning-circle" style={{ fontSize: 24, flex: 'none' }} aria-hidden="true" />
          <div style={{ color: 'var(--text)', flex: 1, minWidth: 220 }}>
            Uzun süredir yedek almadınız. Verilerinizin kaybolmaması için <b>USB belleğe yedek</b> almanız önerilir.
          </div>
          <Buton
            tur="birincil"
            disabled={yedekAliniyor}
            onClick={yedekAl}
            style={{ background: 'var(--warning)', whiteSpace: 'nowrap' }}
          >
            {yedekAliniyor ? 'Yedek alınıyor…' : 'Yedek Al'}
          </Buton>
        </div>
      )}
      {yedekHata && (
        <div style={{ marginTop: 12 }}>
          <HataBaneri mesaj={yedekHata} />
        </div>
      )}

      {durum === 'yukleniyor' && <Yukleniyor mesaj="Panel yükleniyor…" />}
      {durum === 'hata' && (
        <div style={{ marginTop: 20 }}>
          <HataBaneri mesaj={hata} tekrarDene={yukle} />
        </div>
      )}

      {durum === 'hazir' && ozet && (
        <>
          <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
            <KpiKutusu
              ikon="ph-scroll"
              baslik="Toplam Açık Alacak"
              kurus={ozet.toplamAcikAlacak}
              renk="var(--danger)"
              altYazi="Tüm müşterilerin toplam açık borcu"
            />
            <KpiKutusu
              ikon="ph-coins"
              baslik="Bu Ay Tahsil Edilen"
              kurus={ozet.buAyTahsilEdilen}
              renk="var(--success)"
              altYazi={`${ayYilTr()} tahsilatları`}
            />
            <KpiKutusu
              ikon="ph-clock-countdown"
              baslik="Geciken Müşteri"
              metin={String(ozet.gecikenMusteriSayisi)}
              renk="var(--danger)"
              altYazi="30+ gündür ödeme yok"
            />
          </div>

          <div
            style={{
              marginTop: 28,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)' }} />
              <h3 style={{ fontSize: 19 }}>Kırmızı Liste</h3>
              <span style={{ color: 'var(--text2)', fontSize: 14 }}>— 30+ gündür ödemesi olmayan borçlular</span>
            </div>
            <Tablo
              sutunlar={sutunlar}
              satirlar={ozet.kirmiziListe}
              satirAnahtari={(r) => r.musteri_id}
              onSatirTikla={(r) => git({ tur: 'kart', musteriId: r.musteri_id })}
              bosDurumMesaji="Gecikmiş ödemesi olan müşteri yok — harika gidiyor!"
              bosDurumIkon="ph-confetti"
            />
          </div>
        </>
      )}
    </div>
  )
}
