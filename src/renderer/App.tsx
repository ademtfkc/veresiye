import { useCallback, useEffect, useState } from 'react'
import './lib/bridge'
import type { OturumBilgisi } from '../main/auth'
import { OnaySaglayici } from './bilesenler/OnayKutusu'
import { ToastSaglayici } from './bilesenler/Toast'
import { HataBaneri } from './bilesenler/HataBaneri'
import { Yukleniyor } from './bilesenler/Yukleniyor'
import { YedekHatirlatmaModal } from './bilesenler/YedekHatirlatmaModal'
import { KontrolPaneli } from './ekranlar/KontrolPaneli'
import { Musteriler } from './ekranlar/Musteriler'
import { MusteriKarti } from './ekranlar/MusteriKarti'
import { YeniSatis } from './ekranlar/YeniSatis'
import { SatisDuzenle } from './ekranlar/SatisDuzenle'
import { Devir } from './ekranlar/Devir'
import { TahsilatEkle } from './ekranlar/TahsilatEkle'
import { Raporlar } from './ekranlar/Raporlar'
import { Ayarlar } from './ekranlar/Ayarlar'
import { Giris } from './ekranlar/Giris'
import type { Ekran } from './lib/navigasyon'

type Tema = 'light' | 'dark'
type OturumDurumu = 'yukleniyor' | 'hata' | 'girisGerekli' | 'hazir'

interface NavOgesi {
  anahtar: string
  etiket: string
  ikon: string
  ekran: Ekran
}

const VARSAYILAN_DUKKAN_ADI = 'Dükkanım'

// Sol menü — tasarım dosyasındaki (tasarim/Perde Takip.dc.html) 5 madde ve
// Phosphor ikon adlarıyla birebir aynı (Şartname 7.3). "Yeni Satış" her
// tıklamada baştan bir form açar (bkz. navSayaci ile zorunlu yeniden kurulum).
const NAV_OGELERI: NavOgesi[] = [
  { anahtar: 'panel', etiket: 'Kontrol Paneli', ikon: 'ph-squares-four', ekran: { tur: 'panel' } },
  { anahtar: 'musteriler', etiket: 'Müşteriler', ikon: 'ph-users-three', ekran: { tur: 'musteriler' } },
  { anahtar: 'yeniSatis', etiket: 'Yeni Satış', ikon: 'ph-shopping-bag-open', ekran: { tur: 'yeniSatis' } },
  { anahtar: 'raporlar', etiket: 'Raporlar', ikon: 'ph-chart-bar', ekran: { tur: 'raporlar' } },
  { anahtar: 'ayarlar', etiket: 'Ayarlar', ikon: 'ph-gear-six', ekran: { tur: 'ayarlar' } }
]

function App() {
  return (
    <ToastSaglayici>
      <OnaySaglayici>
        <Kabuk />
      </OnaySaglayici>
    </ToastSaglayici>
  )
}

function Kabuk() {
  const [tema, setTema] = useState<Tema>('light')
  const [oturumDurumu, setOturumDurumu] = useState<OturumDurumu>('yukleniyor')
  const [oturumHata, setOturumHata] = useState('')
  const [ilkKurulum, setIlkKurulum] = useState(false)
  const [oturum, setOturum] = useState<OturumBilgisi | null>(null)
  const [dukkanAdi, setDukkanAdi] = useState(VARSAYILAN_DUKKAN_ADI)
  const [logo, setLogo] = useState<string | null>(null)

  const [ekran, setEkran] = useState<Ekran>({ tur: 'panel' })
  const [navSayaci, setNavSayaci] = useState(0)
  // Açılışta bir kez gösterilen yedek hatırlatma penceresi (Şartname 4.4).
  // null = gösterme; { sonHariciYedek } = göster.
  const [yedekHatirlatma, setYedekHatirlatma] = useState<{ sonHariciYedek: string | null } | null>(null)

  // Açılışta: hiç kullanıcı yoksa "İlk kurulum" ekranı (Giriş bileşeni,
  // ilkKurulum=true); varsa ve zaten açık bir oturum yoksa "Giriş Yap" ekranı.
  useEffect(() => {
    let iptalEdildi = false
    window.api.authIlkKurulumGerekliMi().then(async (kurulumSonuc) => {
      if (iptalEdildi) return
      if (!kurulumSonuc.basarili) {
        setOturumHata(kurulumSonuc.hata)
        setOturumDurumu('hata')
        return
      }
      if (kurulumSonuc.veri) {
        setIlkKurulum(true)
        setOturumDurumu('girisGerekli')
        return
      }
      const oturumSonuc = await window.api.authAktifOturum()
      if (iptalEdildi) return
      if (oturumSonuc.basarili && oturumSonuc.veri) {
        setOturum(oturumSonuc.veri)
        setOturumDurumu('hazir')
      } else {
        setOturumDurumu('girisGerekli')
      }
    })
    return () => {
      iptalEdildi = true
    }
  }, [])

  // Oturum açıldıktan sonra dükkan adını yükle (Şartname 8.7 — sol menü +
  // ekstre/başlıkta görünecek). Yüklenemezse sessizce varsayılanda kalır.
  useEffect(() => {
    if (oturumDurumu !== 'hazir') return
    let iptalEdildi = false
    window.api.ayarGetir().then((sonuc) => {
      if (iptalEdildi || !sonuc.basarili) return
      setDukkanAdi(sonuc.veri.dukkanAdi)
      setLogo(sonuc.veri.logo)
    })
    return () => {
      iptalEdildi = true
    }
  }, [oturumDurumu])

  // Açılışta bir kez: son USB yedeği 7+ gün önceyse (veya hiç yoksa) hatırlatma
  // penceresini göster. Sarı şeritle aynı `yedekDurumu` ucunu kullanır.
  useEffect(() => {
    if (oturumDurumu !== 'hazir') return
    let iptalEdildi = false
    window.api.yedekDurumu().then((sonuc) => {
      if (iptalEdildi || !sonuc.basarili) return
      if (sonuc.veri.hatirlatmaGerekli) setYedekHatirlatma({ sonHariciYedek: sonuc.veri.sonHariciYedek })
    })
    return () => {
      iptalEdildi = true
    }
  }, [oturumDurumu])

  const git = useCallback((yeniEkran: Ekran) => {
    setEkran(yeniEkran)
    setNavSayaci((n) => n + 1)
  }, [])

  function girisBasarili(yeniOturum: OturumBilgisi) {
    setOturum(yeniOturum)
    setIlkKurulum(false)
    setEkran({ tur: 'panel' })
    setNavSayaci((n) => n + 1)
    setOturumDurumu('hazir')
  }

  async function cikisYap() {
    await window.api.authCikisYap()
    setOturum(null)
    setDukkanAdi(VARSAYILAN_DUKKAN_ADI)
    setLogo(null)
    setEkran({ tur: 'panel' })
    setOturumDurumu('girisGerekli')
  }

  const isSahip = oturum?.rol === 'sahip'
  const aktifNavAnahtari =
    ekran.tur === 'kart' || ekran.tur === 'satisDuzenle'
      ? 'musteriler'
      : ekran.tur === 'tahsilat'
        ? ''
        : ekran.tur === 'devir'
          ? 'yeniSatis'
          : ekran.tur

  if (oturumDurumu === 'yukleniyor') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <Yukleniyor mesaj="Veresiye açılıyor…" />
      </div>
    )
  }

  if (oturumDurumu === 'hata') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
        <div style={{ maxWidth: 480 }}>
          <HataBaneri mesaj={oturumHata} />
        </div>
      </div>
    )
  }

  if (oturumDurumu === 'girisGerekli') {
    return <Giris ilkKurulum={ilkKurulum} onGirisBasarili={girisBasarili} />
  }

  return (
    <div data-theme={tema} style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <aside
        className="no-print"
        style={{
          width: 'var(--sidebar-w)',
          flex: 'none',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '22px 20px 18px', borderBottom: '1px solid var(--border)' }}>
          {logo ? (
            <img
              src={logo}
              alt=""
              style={{ width: 42, height: 42, flex: 'none', borderRadius: 8, objectFit: 'contain', background: '#fff' }}
            />
          ) : (
            <div
              style={{
                width: 42,
                height: 42,
                flex: 'none',
                borderRadius: 8,
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="ph ph-notebook" style={{ fontSize: 24 }} aria-hidden="true" />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Cabinet Grotesk', 'IBM Plex Sans', sans-serif",
                fontWeight: 700,
                fontSize: 17,
                lineHeight: 1.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={dukkanAdi}
            >
              {dukkanAdi}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Cari Hesap Defteri</div>
          </div>
        </div>

        <nav aria-label="Ana menü" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {NAV_OGELERI.map((oge) => {
            const aktif = aktifNavAnahtari === oge.anahtar
            return (
              <button
                key={oge.anahtar}
                type="button"
                aria-current={aktif ? 'page' : undefined}
                onClick={() => git(oge.ekran)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  padding: '12px 14px',
                  border: 'none',
                  background: aktif ? 'var(--primary-soft)' : 'transparent',
                  color: aktif ? 'var(--primary)' : 'var(--text)',
                  fontWeight: aktif ? 600 : 400,
                  borderRadius: 6,
                  fontSize: 16,
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <i className={`ph ${oge.ikon}`} style={{ fontSize: 20 }} aria-hidden="true" />
                <span>{oge.etiket}</span>
              </button>
            )
          })}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={() => setTema((onceki) => (onceki === 'light' ? 'dark' : 'light'))}
            style={navAltDugmeStil}
          >
            <i className={`ph ${tema === 'light' ? 'ph-moon' : 'ph-sun'}`} style={{ fontSize: 20 }} aria-hidden="true" />
            <span>{tema === 'light' ? 'Koyu Tema' : 'Açık Tema'}</span>
          </button>

          <div style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{oturum?.kullaniciAdi}</div>
            <div style={{ marginTop: 7 }}>
              <span
                style={{
                  fontSize: 12,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  fontWeight: 600
                }}
              >
                {isSahip ? 'Dükkan Sahibi' : 'Çalışan'}
              </span>
            </div>
          </div>

          <button type="button" onClick={cikisYap} style={{ ...navAltDugmeStil, color: 'var(--text2)' }}>
            <i className="ph ph-sign-out" style={{ fontSize: 20 }} aria-hidden="true" />
            <span>Çıkış</span>
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {ekran.tur === 'panel' && <KontrolPaneli git={git} />}
        {ekran.tur === 'musteriler' && <Musteriler git={git} />}
        {ekran.tur === 'kart' && (
          <MusteriKarti key={`kart-${navSayaci}`} musteriId={ekran.musteriId} isSahip={isSahip} git={git} />
        )}
        {ekran.tur === 'yeniSatis' && <YeniSatis key={`yeniSatis-${navSayaci}`} musteriId={ekran.musteriId} git={git} />}
        {ekran.tur === 'satisDuzenle' && (
          <SatisDuzenle key={`satisDuzenle-${navSayaci}`} satisId={ekran.satisId} git={git} />
        )}
        {ekran.tur === 'devir' && <Devir key={`devir-${navSayaci}`} git={git} />}
        {ekran.tur === 'tahsilat' && (
          <TahsilatEkle key={`tahsilat-${navSayaci}`} musteriId={ekran.musteriId} satisId={ekran.satisId} git={git} />
        )}
        {ekran.tur === 'raporlar' && (
          <Raporlar
            key={`raporlar-${navSayaci}`}
            git={git}
            dukkanAdi={dukkanAdi}
            logo={logo}
            baslangicTuru={ekran.raporTuru}
            baslangicMusteriId={ekran.musteriId}
          />
        )}
        {ekran.tur === 'ayarlar' && (
          <Ayarlar
            isSahip={isSahip}
            dukkanAdi={dukkanAdi}
            onDukkanAdiDegisti={setDukkanAdi}
            logo={logo}
            onLogoDegisti={setLogo}
          />
        )}
      </main>

      {yedekHatirlatma && (
        <YedekHatirlatmaModal sonHariciYedek={yedekHatirlatma.sonHariciYedek} onKapat={() => setYedekHatirlatma(null)} />
      )}
    </div>
  )
}

const navAltDugmeStil = {
  display: 'flex',
  alignItems: 'center',
  gap: 13,
  padding: '11px 14px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text)',
  borderRadius: 6,
  fontSize: 15,
  width: '100%',
  textAlign: 'left' as const,
  cursor: 'pointer'
}

export default App
