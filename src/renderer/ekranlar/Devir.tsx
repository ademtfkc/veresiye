import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Buton } from '../bilesenler/Buton'
import { GelecekTarihUyarisi } from '../bilesenler/GelecekTarihUyarisi'
import { Girdi } from '../bilesenler/Girdi'
import { HataBaneri } from '../bilesenler/HataBaneri'
import { ParaGoster } from '../bilesenler/ParaGoster'
import { SegmentliSecim, type SegmentSecenegi } from '../bilesenler/SegmentliSecim'
import { useToast } from '../bilesenler/Toast'
import { bugunIso, paraFormatla, paraGirdisiniKurusaCevir } from '../lib/bicim'
import type { NavProps } from '../lib/navigasyon'
import type { MusteriRow } from '../../main/db/types'

type KayitTuru = 'satis' | 'devir'
const KAYIT_TURU_SECENEKLERI: SegmentSecenegi<KayitTuru>[] = [
  { deger: 'satis', etiket: 'Yeni Satış' },
  { deger: 'devir', etiket: 'Devir (eski defter)' }
]

/**
 * Devir Hızlı Giriş (Şartname 8.5) — ~1000 kayıt eski defterden buraya
 * girilecek, HIZ kritik. Ekran değişmez: "Kaydet ve Yeni Ekle" kaydettikten
 * sonra formu temizler ve imleci doğrudan müşteri arama kutusuna geri
 * götürür. Tamamı klavyeyle: müşteri adını yaz → Enter (bul/oluştur) →
 * tutarı yaz → Enter (kaydet, bir sonrakine geç).
 */
export function Devir({ git }: NavProps) {
  const toast = useToast()

  const aramaRef = useRef<HTMLInputElement>(null)
  const tutarRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [musteri, setMusteri] = useState<MusteriRow | null>(null)
  const [sorgu, setSorgu] = useState('')
  const [sonuclar, setSonuclar] = useState<MusteriRow[]>([])
  const [vurgulanan, setVurgulanan] = useState(0)

  const [tutar, setTutar] = useState('')
  const [tarih, setTarih] = useState(bugunIso())
  const [not, setNot] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  // Senkron kilit — bkz. YeniSatis.tsx aynı desen (PROJE_DURUMU.md Böl.10,
  // Faz 7: bu ekran art arda Enter'a basılarak kullanıldığı için EN KRİTİK
  // ekrandı — form onSubmit her iki yolu da (buton tıklaması VE Enter ile
  // gönderim) buradaki kaydet()'e yönlendirdiği için TEK kilit yeterli).
  const kaydediliyorRef = useRef(false)

  const [sayac, setSayac] = useState(0)
  const [oturumToplami, setOturumToplami] = useState(0)

  useEffect(() => {
    aramaRef.current?.focus()
  }, [])

  useEffect(() => {
    if (musteri || !sorgu.trim()) {
      setSonuclar([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      window.api.musteriAra(sorgu.trim()).then((sonuc) => {
        if (sonuc.basarili) {
          setSonuclar(sonuc.veri.slice(0, 6))
          setVurgulanan(0)
        }
      })
    }, 150)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [sorgu, musteri])

  function musteriSecildi(m: MusteriRow) {
    setMusteri(m)
    setSorgu('')
    setSonuclar([])
    setHata(null)
    requestAnimationFrame(() => tutarRef.current?.focus())
  }

  function yeniMusteriOlustur() {
    const ad = sorgu.trim()
    if (!ad) return
    window.api.musteriEkle({ ad_soyad: ad }).then((sonuc) => {
      if (sonuc.basarili) {
        musteriSecildi(sonuc.veri)
      } else {
        toast.goster(sonuc.hata)
      }
    })
  }

  /** Arama kutusunda ok tuşlarıyla gezinme, Enter ile seç/oluştur — fareye gerek yok. */
  function aramaTusYonet(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setVurgulanan((v) => Math.min(v + 1, Math.max(sonuclar.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setVurgulanan((v) => Math.max(v - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (sonuclar.length > 0) {
        musteriSecildi(sonuclar[vurgulanan] ?? sonuclar[0])
      } else if (sorgu.trim()) {
        yeniMusteriOlustur()
      }
    }
  }

  function kaydet() {
    if (kaydediliyorRef.current) return
    kaydediliyorRef.current = true

    function hataVer(mesaj: string) {
      setHata(mesaj)
      kaydediliyorRef.current = false
    }

    if (!musteri) {
      hataVer('Lütfen önce müşteriyi bul (veya yaz, Enter tuşuna bas).')
      return
    }
    const tutarKurus = paraGirdisiniKurusaCevir(tutar)
    if (tutarKurus <= 0) {
      hataVer('Lütfen geçerli bir kalan borç tutarı gir.')
      return
    }
    setHata(null)
    setKaydediliyor(true)
    window.api
      .satisDevirEkle({
        musteri_id: musteri.id,
        tarih,
        devir_tutari: tutarKurus,
        not: not.trim() || undefined
      })
      .then((sonuc) => {
        setKaydediliyor(false)
        if (!sonuc.basarili) {
          setHata(sonuc.hata)
          return
        }
        setSayac((n) => n + 1)
        setOturumToplami((t) => t + tutarKurus)
        toast.goster(`Devir kaydedildi: ${musteri.ad_soyad} — ${paraFormatla(tutarKurus)}`)
        // "ekran değişmesin", form temizlensin, imleç bir sonraki kaydın ilk
        // alanına (müşteri arama kutusu) geri gitsin — Şartname 8.5.
        setMusteri(null)
        setSorgu('')
        setTutar('')
        setNot('')
        requestAnimationFrame(() => aramaRef.current?.focus())
      })
      .finally(() => {
        kaydediliyorRef.current = false
      })
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 30 }}>Devir Kaydı</h1>
          <div style={{ color: 'var(--text2)', marginTop: 4 }}>Eski defterden aktarım — sadece klavyeyle hızlı giriş</div>
        </div>
        <div style={{ minWidth: 260 }}>
          <SegmentliSecim
            secenekler={KAYIT_TURU_SECENEKLERI}
            secili="devir"
            onSec={(v) => {
              if (v === 'satis') git({ tur: 'yeniSatis' })
            }}
            esitGenislik
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 20px',
          background: 'var(--primary-soft)',
          borderRadius: 8,
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ph ph-lightning" style={{ fontSize: 20, color: 'var(--primary)' }} aria-hidden="true" />
          <span style={{ fontWeight: 600 }}>Bu oturumda girilen:</span>
        </div>
        <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
          {sayac} kayıt
        </span>
        <span style={{ color: 'var(--text2)' }}>·</span>
        <ParaGoster kurus={oturumToplami} boyut="normal" renk="var(--primary)" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          kaydet()
        }}
        style={{
          marginTop: 20,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18
        }}
      >
        {musteri ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 16px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--bg)'
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Müşteri</div>
              <div style={{ fontSize: 19, fontWeight: 600 }}>{musteri.ad_soyad}</div>
            </div>
            <Buton
              onClick={() => {
                setMusteri(null)
                requestAnimationFrame(() => aramaRef.current?.focus())
              }}
            >
              Değiştir
            </Buton>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Müşteri (yaz, Enter'a bas)
            </label>
            <div style={{ position: 'relative' }}>
              <i
                className="ph ph-magnifying-glass"
                aria-hidden="true"
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: 'var(--text2)' }}
              />
              <input
                ref={aramaRef}
                value={sorgu}
                onChange={(e) => setSorgu(e.target.value)}
                onKeyDown={aramaTusYonet}
                placeholder="Müşteri ara ya da yeni ad yaz, sonra Enter…"
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 46px',
                  fontSize: 18,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--surface)',
                  color: 'var(--text)'
                }}
              />
            </div>
            {sonuclar.length > 0 && (
              <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {sonuclar.map((r, i) => (
                  <div
                    key={r.id}
                    onClick={() => musteriSecildi(r)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: i === vurgulanan ? 'var(--primary-soft)' : 'transparent'
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{r.ad_soyad}</span>
                    <span className="mono" style={{ color: 'var(--text2)' }}>
                      {r.telefon || '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {sorgu.trim() && sonuclar.length === 0 && (
              <div
                style={{
                  marginTop: 8,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px dashed var(--primary)',
                  background: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  fontSize: 14
                }}
              >
                <i className="ph ph-user-plus" style={{ marginRight: 8 }} aria-hidden="true" />
                Enter'a basarsan "{sorgu.trim()}" adıyla yeni müşteri oluşturulur.
              </div>
            )}
          </div>
        )}

        {musteri && (
          <>
            <Girdi
              ref={tutarRef}
              etiket="Kalan Borç Tutarı"
              value={tutar}
              onChange={(e) => setTutar(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="mono"
              sagIkon="₺"
              style={{ fontSize: 28, fontWeight: 600, textAlign: 'right' }}
            />
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 170 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Tarih</label>
                <input
                  type="date"
                  value={tarih}
                  onChange={(e) => setTarih(e.target.value)}
                  className="mono"
                  style={{
                    width: '100%',
                    padding: '13px 16px',
                    fontSize: 16,
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: 'var(--surface)',
                    color: 'var(--text)'
                  }}
                />
              </div>
              <div style={{ flex: 2, minWidth: 220 }}>
                <Girdi
                  etiket="Not (isteğe bağlı)"
                  value={not}
                  onChange={(e) => setNot(e.target.value)}
                  placeholder="Örn. eski defter sayfa 42"
                />
              </div>
            </div>

            <GelecekTarihUyarisi gorunurMu={tarih > bugunIso()} />

            {hata && <HataBaneri mesaj={hata} />}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Buton onClick={() => git({ tur: 'musteriler' })}>Bitti, Müşterilere Dön</Buton>
              <Buton tur="birincil" type="submit" buyuk ikon="ph-check" disabled={kaydediliyor}>
                {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet ve Yeni Ekle'}
              </Buton>
            </div>
          </>
        )}
        {!musteri && hata && <HataBaneri mesaj={hata} />}
      </form>
    </div>
  )
}
