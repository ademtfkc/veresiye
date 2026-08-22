import { useCallback, useEffect, useState } from 'react'
import { Buton } from '../bilesenler/Buton'
import { Girdi } from '../bilesenler/Girdi'
import { HataBaneri } from '../bilesenler/HataBaneri'
import { Modal } from '../bilesenler/Modal'
import { useOnay } from '../bilesenler/OnayKutusu'
import { SegmentliSecim, type SegmentSecenegi } from '../bilesenler/SegmentliSecim'
import { useToast } from '../bilesenler/Toast'
import { Yukleniyor } from '../bilesenler/Yukleniyor'
import { tarihFormatla } from '../lib/bicim'
import type { GuvenliKullanici } from '../../main/auth'
import type { KullaniciRol } from '../../main/db/types'
import type { YedekDurumu } from '../../main/services'

interface AyarlarProps {
  isSahip: boolean
  dukkanAdi: string
  onDukkanAdiDegisti: (yeniAd: string) => void
  logo: string | null
  onLogoDegisti: (logo: string | null) => void
}

const ROL_SECENEKLERI: SegmentSecenegi<KullaniciRol>[] = [
  { deger: 'calisan', etiket: 'Çalışan' },
  { deger: 'sahip', etiket: 'Dükkan Sahibi' }
]

const bosYeniKullanici = { kullaniciAdi: '', sifre: '', rol: 'calisan' as KullaniciRol }

/**
 * Ayarlar (Şartname 8.7) — SADECE Dükkan Sahibi. Dükkan adı (sol menü +
 * ekstre/başlıklarda görünür) ve kullanıcı yönetimi (ekle + şifre sıfırla,
 * "kilitlenme olmasın" — Şartname Böl.2). Yedek Al/Geri Yükle Faz 6'da
 * bağlanacak; burada yer tutucu olarak pasif durur.
 */
export function Ayarlar({ isSahip, dukkanAdi, onDukkanAdiDegisti, logo, onLogoDegisti }: AyarlarProps) {
  const toast = useToast()
  const onay = useOnay()

  // -- Logo ---------------------------------------------------------------
  const [logoYukleniyor, setLogoYukleniyor] = useState(false)
  const [logoHata, setLogoHata] = useState<string | null>(null)

  function logoYukle() {
    setLogoHata(null)
    setLogoYukleniyor(true)
    window.api.ayarLogoYukle().then((sonuc) => {
      setLogoYukleniyor(false)
      if (!sonuc.basarili) {
        setLogoHata(sonuc.hata)
        return
      }
      if (sonuc.veri.iptal || !sonuc.veri.ayarlar) return // dosya seçimi iptal — hata değil
      onLogoDegisti(sonuc.veri.ayarlar.logo)
      toast.goster('Logo güncellendi.')
    })
  }

  function logoSil() {
    setLogoHata(null)
    setLogoYukleniyor(true)
    window.api.ayarLogoSil().then((sonuc) => {
      setLogoYukleniyor(false)
      if (!sonuc.basarili) {
        setLogoHata(sonuc.hata)
        return
      }
      onLogoDegisti(sonuc.veri.logo)
      toast.goster('Logo kaldırıldı.')
    })
  }

  // -- Dükkan adı ---------------------------------------------------------
  const [dukkanAdiTaslak, setDukkanAdiTaslak] = useState(dukkanAdi)
  const [dukkanHata, setDukkanHata] = useState<string | null>(null)
  const [dukkanKaydediliyor, setDukkanKaydediliyor] = useState(false)

  useEffect(() => setDukkanAdiTaslak(dukkanAdi), [dukkanAdi])

  function dukkanAdiKaydet() {
    const temiz = dukkanAdiTaslak.trim()
    if (!temiz) {
      setDukkanHata('Lütfen dükkan adını gir.')
      return
    }
    setDukkanHata(null)
    setDukkanKaydediliyor(true)
    window.api.ayarDukkanAdiGuncelle(temiz).then((sonuc) => {
      setDukkanKaydediliyor(false)
      if (!sonuc.basarili) {
        setDukkanHata(sonuc.hata)
        return
      }
      onDukkanAdiDegisti(sonuc.veri.dukkanAdi)
      toast.goster('Dükkan adı güncellendi.')
    })
  }

  // -- Kullanıcılar ---------------------------------------------------------
  const [kullanicilar, setKullanicilar] = useState<GuvenliKullanici[]>([])
  const [durum, setDurum] = useState<'yukleniyor' | 'hata' | 'hazir'>('yukleniyor')
  const [hata, setHata] = useState('')

  const kullanicilariYukle = useCallback(() => {
    setDurum('yukleniyor')
    window.api.authKullanicilariListele().then((sonuc) => {
      if (sonuc.basarili) {
        setKullanicilar(sonuc.veri)
        setDurum('hazir')
      } else {
        setHata(sonuc.hata)
        setDurum('hata')
      }
    })
  }, [])

  useEffect(() => {
    if (isSahip) kullanicilariYukle()
  }, [isSahip, kullanicilariYukle])

  const [yeniModalAcik, setYeniModalAcik] = useState(false)
  const [yeniForm, setYeniForm] = useState(bosYeniKullanici)
  const [yeniHata, setYeniHata] = useState<string | null>(null)
  const [yeniKaydediliyor, setYeniKaydediliyor] = useState(false)

  function yeniKullaniciKaydet() {
    const ad = yeniForm.kullaniciAdi.trim()
    if (ad.length < 3) {
      setYeniHata('Kullanıcı adı en az 3 karakter olmalı.')
      return
    }
    if (yeniForm.sifre.length < 6) {
      setYeniHata('Şifre en az 6 karakter olmalı.')
      return
    }
    setYeniHata(null)
    setYeniKaydediliyor(true)
    window.api.authKullaniciOlustur(ad, yeniForm.sifre, yeniForm.rol).then((sonuc) => {
      setYeniKaydediliyor(false)
      if (!sonuc.basarili) {
        setYeniHata(sonuc.hata)
        return
      }
      setYeniModalAcik(false)
      setYeniForm(bosYeniKullanici)
      toast.goster(`Kullanıcı eklendi: ${sonuc.veri.kullanici_adi}`)
      kullanicilariYukle()
    })
  }

  const [sifreModal, setSifreModal] = useState<{ id: number; ad: string } | null>(null)
  const [yeniSifre, setYeniSifre] = useState('')
  const [sifreHata, setSifreHata] = useState<string | null>(null)
  const [sifreKaydediliyor, setSifreKaydediliyor] = useState(false)

  function sifreSifirlaKaydet() {
    if (!sifreModal) return
    if (yeniSifre.length < 6) {
      setSifreHata('Şifre en az 6 karakter olmalı.')
      return
    }
    setSifreHata(null)
    setSifreKaydediliyor(true)
    window.api.authSifreSifirla(sifreModal.id, yeniSifre).then((sonuc) => {
      setSifreKaydediliyor(false)
      if (!sonuc.basarili) {
        setSifreHata(sonuc.hata)
        return
      }
      toast.goster(`${sifreModal.ad} kullanıcısının şifresi sıfırlandı.`)
      setSifreModal(null)
      setYeniSifre('')
    })
  }

  // -- Yedekleme (Şartname Böl.4, Faz 6 — ZORUNLU) -------------------------
  const [yedekDurum, setYedekDurum] = useState<YedekDurumu | null>(null)
  const [yedekHata, setYedekHata] = useState<string | null>(null)
  const [yedekAliniyor, setYedekAliniyor] = useState(false)
  const [bilgisayaraAliniyor, setBilgisayaraAliniyor] = useState(false)
  const [geriYukleniyor, setGeriYukleniyor] = useState(false)

  const yedekDurumuYukle = useCallback(() => {
    window.api.yedekDurumu().then((sonuc) => {
      if (sonuc.basarili) setYedekDurum(sonuc.veri)
    })
  }, [])

  useEffect(() => {
    if (isSahip) yedekDurumuYukle()
  }, [isSahip, yedekDurumuYukle])

  /**
   * "Bilgisayara Şimdi Yedek Al" (02.08.2026 — CEO isteği). Gecelik 23.55
   * yedeği için bilgisayarın açık olması gerekiyor; kullanıcı o saatte müsait
   * olmayabileceği için istediği an aynı yedeği kendisi alabilsin. Klasör
   * SORMAZ — gecelik yedekle aynı yere, aynı adla yazar.
   */
  function bilgisayaraYedekAl() {
    setYedekHata(null)
    setBilgisayaraAliniyor(true)
    window.api.yedekBilgisayaraAl().then((sonuc) => {
      setBilgisayaraAliniyor(false)
      if (!sonuc.basarili) {
        setYedekHata(sonuc.hata)
        return
      }
      toast.goster('Yedek alındı — bilgisayarınızın yedek klasörüne kaydedildi.')
      yedekDurumuYukle()
    })
  }

  function yedekAl() {
    setYedekHata(null)
    setYedekAliniyor(true)
    window.api.yedekAl().then((sonuc) => {
      setYedekAliniyor(false)
      if (!sonuc.basarili) {
        setYedekHata(sonuc.hata)
        return
      }
      if (sonuc.veri.iptal) return // kullanıcı klasör seçimini iptal etti — bu bir hata değil
      toast.goster(`Yedek alındı: ${tarihFormatla(sonuc.veri.tarih ?? null)}`)
      yedekDurumuYukle()
    })
  }

  async function yedektenGeriYukle() {
    setYedekHata(null)
    // Butonu EN BAŞTAN (dosya seçim penceresi açılmadan önce) kilitliyoruz —
    // çift tıklama iki native dosya penceresi birden açmasın diye (idempotency
    // ilkesi: aynı işlem iki kez tetiklenmesin).
    setGeriYukleniyor(true)
    try {
      const secim = await window.api.yedekGeriYuklemeDosyasiSec()
      if (!secim.basarili) {
        setYedekHata(secim.hata)
        return
      }
      if (secim.veri.iptal) return // dosya seçimi iptal edildi — hata değil
      if (!secim.veri.gecerli) {
        setYedekHata(secim.veri.neden ?? 'Seçilen dosya geçersiz.')
        return
      }
      const dosyaAdi = secim.veri.yol?.split(/[\\/]/).pop() ?? secim.veri.yol ?? 'seçilen dosya'
      const onaylandi = await onay.sor(
        `"${dosyaAdi}" dosyasından geri yüklenecek. Bu işlem ŞU ANKİ TÜM VERİNİN ÜZERİNE YAZAR ve GERİ ALINAMAZ. Emin misiniz?`
      )
      if (!onaylandi || !secim.veri.yol) return

      const sonuc = await window.api.yedekGeriYuklemeUygula(secim.veri.yol)
      if (!sonuc.basarili) {
        setYedekHata(sonuc.hata)
        return
      }
      toast.goster('Yedekten geri yükleme tamamlandı. Uygulama yenileniyor…')
      // DB bağlantısı ana süreçte tamamen değişti; tüm ekranların TAZE veriyle
      // yeniden yüklenmesi için en güvenli yol tam bir sayfa yenilemesi (eski
      // hafızadaki state'lere güvenmiyoruz — bkz. yedekService.ts geriYukle).
      setTimeout(() => window.location.reload(), 1200)
    } finally {
      setGeriYukleniyor(false)
    }
  }

  if (!isSahip) {
    return (
      <div style={{ padding: '28px 32px', maxWidth: 700 }}>
        <h1 style={{ fontSize: 30 }}>Ayarlar</h1>
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
          <i className="ph ph-lock-key" style={{ fontSize: 36, opacity: 0.6 }} aria-hidden="true" />
          <div style={{ marginTop: 12, fontSize: 17 }}>Bu bölüm yalnızca Dükkan Sahibi tarafından görüntülenebilir.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 30 }}>Ayarlar</h1>

      <section style={kartStil}>
        <h3 style={{ fontSize: 19 }}>Dükkan Adı</h3>
        <div style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>Sol menüde ve ekstre başlığında görünür.</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Girdi value={dukkanAdiTaslak} onChange={(e) => setDukkanAdiTaslak(e.target.value)} hata={dukkanHata} />
          </div>
          <Buton
            tur="birincil"
            onClick={dukkanAdiKaydet}
            disabled={dukkanKaydediliyor || dukkanAdiTaslak.trim() === dukkanAdi}
          >
            {dukkanKaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </Buton>
        </div>
      </section>

      <section style={kartStil}>
        <h3 style={{ fontSize: 19 }}>Logo</h3>
        <div style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>
          Sol menüde ve rapor/ekstre çıktılarının başında görünür. PNG veya JPG, en fazla 2 MB.
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 84,
              height: 84,
              flex: 'none',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {logo ? (
              <img src={logo} alt="Dükkan logosu" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <i className="ph ph-image" style={{ fontSize: 30, color: 'var(--text2)' }} aria-hidden="true" />
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Buton tur="birincil" ikon="ph-upload-simple" disabled={logoYukleniyor} onClick={logoYukle}>
              {logoYukleniyor ? 'Yükleniyor…' : logo ? 'Logoyu Değiştir' : 'Logo Yükle'}
            </Buton>
            {logo && (
              <Buton ikon="ph-trash" disabled={logoYukleniyor} onClick={logoSil}>
                Kaldır
              </Buton>
            )}
          </div>
        </div>
        {logoHata && (
          <div style={{ marginTop: 14 }}>
            <HataBaneri mesaj={logoHata} />
          </div>
        )}
      </section>

      <section style={kartStil}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 19 }}>Kullanıcılar</h3>
            <div style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>
              Çalışanlar sadece satış/tahsilat girer; silme ve düzenleme yapamaz.
            </div>
          </div>
          <Buton tur="birincil" ikon="ph-user-plus" onClick={() => setYeniModalAcik(true)}>
            Yeni Kullanıcı
          </Buton>
        </div>

        <div style={{ marginTop: 16 }}>
          {durum === 'yukleniyor' && <Yukleniyor mesaj="Kullanıcılar yükleniyor…" />}
          {durum === 'hata' && <HataBaneri mesaj={hata} tekrarDene={kullanicilariYukle} />}
          {durum === 'hazir' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {kullanicilar.map((k) => (
                <div
                  key={k.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{k.kullanici_adi}</span>
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
                      {k.rol === 'sahip' ? 'Dükkan Sahibi' : 'Çalışan'}
                    </span>
                    {!k.aktif && <span style={{ fontSize: 12, color: 'var(--text2)' }}>(pasif)</span>}
                  </div>
                  <Buton
                    ikon="ph-key"
                    onClick={() => {
                      setSifreModal({ id: k.id, ad: k.kullanici_adi })
                      setYeniSifre('')
                      setSifreHata(null)
                    }}
                  >
                    Şifre Sıfırla
                  </Buton>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={kartStil}>
        <h3 style={{ fontSize: 19 }}>Yedekleme</h3>
        <div style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>
          Son harici (USB) yedek:{' '}
          <b className="mono" style={{ color: yedekDurum?.hatirlatmaGerekli ? 'var(--warning)' : 'var(--text)' }}>
            {yedekDurum?.sonHariciYedek ? tarihFormatla(yedekDurum.sonHariciYedek) : 'Hiç alınmadı'}
          </b>
          {' · '}Otomatik (günlük) yedek:{' '}
          <b className="mono">{yedekDurum?.sonOtomatikYedek ? tarihFormatla(yedekDurum.sonOtomatikYedek) : '—'}</b>
        </div>
        <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
          Uygulama her akşam <b>23.55</b>'te ve her açılışta bilgisayarınıza otomatik yedek alır; bilgisayarda en fazla{' '}
          <b>5 yedek</b> tutulur. İstediğiniz an <b>"Bilgisayara Yedek Al"</b> ile elle de alabilirsiniz. Verileriniz
          bilgisayar arızasında da güvende olsun diye ayrıca düzenli olarak bir <b>USB belleğe</b> yedek alın.
        </div>

        {yedekHata && (
          <div style={{ marginTop: 14 }}>
            <HataBaneri mesaj={yedekHata} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Buton
            tur="birincil"
            ikon="ph-floppy-disk"
            disabled={bilgisayaraAliniyor}
            onClick={bilgisayaraYedekAl}
          >
            {bilgisayaraAliniyor ? 'Yedek alınıyor…' : 'Bilgisayara Yedek Al'}
          </Buton>
          <Buton ikon="ph-usb" disabled={yedekAliniyor} onClick={yedekAl}>
            {yedekAliniyor ? 'Yedek alınıyor…' : "USB'ye Yedek Al"}
          </Buton>
          <Buton tur="tehlike" ikon="ph-upload-simple" disabled={geriYukleniyor} onClick={yedektenGeriYukle}>
            {geriYukleniyor ? 'Geri yükleniyor…' : 'Yedekten Geri Yükle'}
          </Buton>
        </div>
      </section>

      {yeniModalAcik && (
        <Modal
          kapat={() => {
            setYeniModalAcik(false)
            setYeniForm(bosYeniKullanici)
            setYeniHata(null)
          }}
        >
          <h3 style={{ fontSize: 20 }}>Yeni Kullanıcı</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            <Girdi
              etiket="Kullanıcı Adı"
              value={yeniForm.kullaniciAdi}
              onChange={(e) => setYeniForm((f) => ({ ...f, kullaniciAdi: e.target.value }))}
              placeholder="Örn. ayse.tezgahtar"
              autoFocus
            />
            <Girdi
              etiket="Şifre"
              type="password"
              value={yeniForm.sifre}
              onChange={(e) => setYeniForm((f) => ({ ...f, sifre: e.target.value }))}
              placeholder="En az 6 karakter"
              hata={yeniHata}
            />
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Rol</label>
              <SegmentliSecim
                secenekler={ROL_SECENEKLERI}
                secili={yeniForm.rol}
                onSec={(rol) => setYeniForm((f) => ({ ...f, rol }))}
                esitGenislik
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <Buton onClick={() => setYeniModalAcik(false)}>Vazgeç</Buton>
            <Buton tur="birincil" disabled={yeniKaydediliyor} onClick={yeniKullaniciKaydet}>
              {yeniKaydediliyor ? 'Kaydediliyor…' : 'Kullanıcıyı Kaydet'}
            </Buton>
          </div>
        </Modal>
      )}

      {sifreModal && (
        <Modal kapat={() => setSifreModal(null)}>
          <h3 style={{ fontSize: 20 }}>{sifreModal.ad} — Şifre Sıfırla</h3>
          <div style={{ marginTop: 16 }}>
            <Girdi
              etiket="Yeni Şifre"
              type="password"
              value={yeniSifre}
              onChange={(e) => setYeniSifre(e.target.value)}
              hata={sifreHata}
              placeholder="En az 6 karakter"
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <Buton onClick={() => setSifreModal(null)}>Vazgeç</Buton>
            <Buton tur="birincil" disabled={sifreKaydediliyor} onClick={sifreSifirlaKaydet}>
              {sifreKaydediliyor ? 'Kaydediliyor…' : 'Şifreyi Sıfırla'}
            </Buton>
          </div>
        </Modal>
      )}
    </div>
  )
}

const kartStil = {
  marginTop: 20,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '22px 24px'
}
