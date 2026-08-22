import { useState } from 'react'
import { Buton } from '../bilesenler/Buton'
import { Girdi } from '../bilesenler/Girdi'
import { HataBaneri } from '../bilesenler/HataBaneri'
import type { OturumBilgisi } from '../../main/auth'

interface GirisProps {
  /** Hiç kullanıcı yoksa true — "sahip hesabı oluştur" akışı gösterilir (Şartname Böl.2). */
  ilkKurulum: boolean
  onGirisBasarili: (oturum: OturumBilgisi) => void
}

/**
 * Giriş ekranı (Şartname Böl.2 + Faz 4 başlama notu) — Faz 3'ün geçici
 * otomatik oturum açmasının (lib/geciciOturum.ts, artık silindi) yerini alır.
 * İki mod: `ilkKurulum` true iken "dükkan sahibi hesabı oluştur" formu,
 * değilken normal "Kullanıcı Adı + Şifre" giriş formu.
 */
export function Giris({ ilkKurulum, onGirisBasarili }: GirisProps) {
  const [kullaniciAdi, setKullaniciAdi] = useState('')
  const [sifre, setSifre] = useState('')
  const [sifreTekrar, setSifreTekrar] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [gonderiliyor, setGonderiliyor] = useState(false)

  function girisYap() {
    if (!kullaniciAdi.trim() || !sifre) {
      setHata('Lütfen kullanıcı adı ve şifreni gir.')
      return
    }
    setHata(null)
    setGonderiliyor(true)
    window.api.authGirisYap(kullaniciAdi.trim(), sifre).then(async (sonuc) => {
      if (!sonuc.basarili) {
        setGonderiliyor(false)
        setHata(sonuc.hata)
        return
      }
      const oturumSonuc = await window.api.authAktifOturum()
      setGonderiliyor(false)
      if (oturumSonuc.basarili && oturumSonuc.veri) {
        onGirisBasarili(oturumSonuc.veri)
      } else {
        setHata('Giriş yapıldı ama oturum bilgisi okunamadı. Lütfen tekrar dene.')
      }
    })
  }

  function kurulumYap() {
    const ad = kullaniciAdi.trim()
    if (ad.length < 3) {
      setHata('Kullanıcı adı en az 3 karakter olmalı.')
      return
    }
    if (sifre.length < 6) {
      setHata('Şifre en az 6 karakter olmalı.')
      return
    }
    if (sifre !== sifreTekrar) {
      setHata('Girdiğin iki şifre birbiriyle uyuşmuyor.')
      return
    }
    setHata(null)
    setGonderiliyor(true)
    window.api.authIlkSahipOlustur(ad, sifre).then((sonuc) => {
      if (!sonuc.basarili) {
        setGonderiliyor(false)
        setHata(sonuc.hata)
        return
      }
      girisYap()
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 20
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (ilkKurulum) kurulumYap()
          else girisYap()
        }}
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '36px 32px',
          boxShadow: '0 20px 50px rgba(0,0,0,.08)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 26 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className="ph ph-notebook" style={{ fontSize: 30 }} aria-hidden="true" />
          </div>
          <div style={{ fontFamily: "'Cabinet Grotesk', 'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 22 }}>
            Veresiye
          </div>
          <div style={{ color: 'var(--text2)', fontSize: 14 }}>Cari Hesap Defteri</div>
        </div>

        {ilkKurulum && (
          <div
            style={{
              background: 'var(--primary-soft)',
              color: 'var(--primary)',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 14,
              marginBottom: 20,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className="ph ph-flag" style={{ fontSize: 18 }} aria-hidden="true" />
            İlk kurulum — dükkan sahibi hesabı oluştur
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Girdi
            etiket="Kullanıcı Adı"
            value={kullaniciAdi}
            onChange={(e) => setKullaniciAdi(e.target.value)}
            placeholder="Örn. ahmet.yilmaz"
            autoFocus
            autoComplete="username"
          />
          <Girdi
            etiket="Şifre"
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            placeholder="••••••"
            autoComplete={ilkKurulum ? 'new-password' : 'current-password'}
          />
          {ilkKurulum && (
            <Girdi
              etiket="Şifre (Tekrar)"
              type="password"
              value={sifreTekrar}
              onChange={(e) => setSifreTekrar(e.target.value)}
              placeholder="••••••"
              autoComplete="new-password"
            />
          )}
        </div>

        {hata && (
          <div style={{ marginTop: 16 }}>
            <HataBaneri mesaj={hata} />
          </div>
        )}

        <Buton
          tur="birincil"
          type="submit"
          buyuk
          disabled={gonderiliyor}
          style={{ width: '100%', justifyContent: 'center', marginTop: 22 }}
        >
          {gonderiliyor ? 'Lütfen bekleyin…' : ilkKurulum ? 'Hesabı Oluştur ve Gir' : 'Giriş Yap'}
        </Buton>
      </form>
    </div>
  )
}
