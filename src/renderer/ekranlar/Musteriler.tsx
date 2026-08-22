import { useCallback, useEffect, useMemo, useState } from 'react'
import { AramaKutusu } from '../bilesenler/AramaKutusu'
import { Buton } from '../bilesenler/Buton'
import { MusteriDurumRozeti } from '../bilesenler/DurumRozeti'
import { Girdi } from '../bilesenler/Girdi'
import { HataBaneri } from '../bilesenler/HataBaneri'
import { Modal } from '../bilesenler/Modal'
import { ParaGoster } from '../bilesenler/ParaGoster'
import { SegmentliSecim, type SegmentSecenegi } from '../bilesenler/SegmentliSecim'
import { Tablo, type TabloSutunu } from '../bilesenler/Tablo'
import { useToast } from '../bilesenler/Toast'
import { bugunIso, paraFormatla, paraGirdisiniKurusaCevir } from '../lib/bicim'
import { bakiyeRenkDegiskeni, tumMusterileriBakiyeIleGetir, type MusteriBakiyeli } from '../lib/veri'
import type { NavProps } from '../lib/navigasyon'

type Filtre = 'hepsi' | 'borclular' | 'gecikenler'

const bosForm = { ad_soyad: '', telefon: '', adres: '', not: '', acilis: '' }

/** Müşteriler (Şartname 8.2) — arama kutusu ekranın en önemli öğesi. */
export function Musteriler({ git }: NavProps) {
  const toast = useToast()
  const [durum, setDurum] = useState<'yukleniyor' | 'hata' | 'hazir'>('yukleniyor')
  const [musteriler, setMusteriler] = useState<MusteriBakiyeli[]>([])
  const [hata, setHata] = useState('')
  const [arama, setArama] = useState('')
  const [filtre, setFiltre] = useState<Filtre>('hepsi')
  const [azalan, setAzalan] = useState(true)

  const [modalAcik, setModalAcik] = useState(false)
  const [form, setForm] = useState(bosForm)
  const [formHata, setFormHata] = useState<string | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const yukle = useCallback(() => {
    setDurum('yukleniyor')
    tumMusterileriBakiyeIleGetir().then((sonuc) => {
      if (sonuc.basarili) {
        setMusteriler(sonuc.veri)
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

  const normalize = (metin: string) => metin.toLocaleLowerCase('tr-TR')

  const sayilar = useMemo(
    () => ({
      hepsi: musteriler.length,
      borclular: musteriler.filter((m) => m.bakiye > 0).length,
      gecikenler: musteriler.filter((m) => m.durum === 'geciken').length
    }),
    [musteriler]
  )

  const filtrelenmis = useMemo(() => {
    const aramaNorm = normalize(arama.trim())
    const aramaRakam = arama.replace(/\D/g, '')
    let sonuc = musteriler.filter((m) => {
      if (filtre === 'borclular' && !(m.bakiye > 0)) return false
      if (filtre === 'gecikenler' && m.durum !== 'geciken') return false
      if (!aramaNorm) return true
      const adUyumlu = normalize(m.ad_soyad).includes(aramaNorm)
      const telUyumlu = aramaRakam.length > 0 && (m.telefon ?? '').replace(/\D/g, '').includes(aramaRakam)
      return adUyumlu || telUyumlu
    })
    sonuc = sonuc.slice().sort((a, b) => (azalan ? b.bakiye - a.bakiye : a.bakiye - b.bakiye))
    return sonuc
  }, [musteriler, arama, filtre, azalan])

  const chipSecenekleri: SegmentSecenegi<Filtre>[] = [
    { deger: 'hepsi', etiket: 'Hepsi', sayac: sayilar.hepsi },
    { deger: 'borclular', etiket: 'Borçlular', sayac: sayilar.borclular },
    { deger: 'gecikenler', etiket: 'Gecikenler', sayac: sayilar.gecikenler }
  ]

  const sutunlar: TabloSutunu<MusteriBakiyeli>[] = [
    { anahtar: 'ad', baslik: 'Ad Soyad', render: (m) => <span style={{ fontWeight: 500 }}>{m.ad_soyad}</span> },
    {
      anahtar: 'tel',
      baslik: 'Telefon',
      render: (m) => (
        <span className="mono" style={{ color: 'var(--text2)' }}>
          {m.telefon || '—'}
        </span>
      )
    },
    { anahtar: 'durum', baslik: 'Durum', render: (m) => <MusteriDurumRozeti durum={m.durum} /> },
    {
      anahtar: 'bakiye',
      hizalama: 'right',
      baslik: (
        <button
          type="button"
          onClick={() => setAzalan((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            font: 'inherit',
            color: 'inherit',
            cursor: 'pointer',
            textTransform: 'inherit',
            letterSpacing: 'inherit'
          }}
        >
          Kalan Bakiye <span style={{ color: 'var(--primary)' }}>{azalan ? '▼' : '▲'}</span>
        </button>
      ),
      render: (m) => <ParaGoster kurus={m.bakiye} renk={bakiyeRenkDegiskeni(m.bakiye)} />
    }
  ]

  function formuKaydet() {
    const ad = form.ad_soyad.trim()
    if (!ad) {
      setFormHata('Lütfen müşterinin adını ve soyadını gir.')
      return
    }
    const acilisKurus = paraGirdisiniKurusaCevir(form.acilis)
    setFormHata(null)
    setKaydediliyor(true)
    window.api
      .musteriEkle({
        ad_soyad: ad,
        telefon: form.telefon.trim() || null,
        adres: form.adres.trim() || null,
        not: form.not.trim() || null
      })
      .then(async (sonuc) => {
        if (!sonuc.basarili) {
          setKaydediliyor(false)
          setFormHata(sonuc.hata)
          return
        }
        const musteri = sonuc.veri
        // Açılış bakiyesi girildiyse, eski defterden gelen borcu bir "Devir"
        // kaydı olarak oluştur — bakiye/gecikme/rapor mantığı bunu normal
        // satış gibi işler (Şartname 5.5).
        if (acilisKurus > 0) {
          const devir = await window.api.satisDevirEkle({
            musteri_id: musteri.id,
            tarih: bugunIso(),
            devir_tutari: acilisKurus,
            not: 'Açılış bakiyesi'
          })
          if (!devir.basarili) {
            // Müşteri kaydedildi ama açılış bakiyesi eklenemedi — karta yine götür,
            // kullanıcı gerekirse Devir ekranından tekrar girebilir.
            setKaydediliyor(false)
            setModalAcik(false)
            setForm(bosForm)
            toast.goster(`Müşteri eklendi ama açılış bakiyesi eklenemedi: ${devir.hata}`)
            git({ tur: 'kart', musteriId: musteri.id })
            return
          }
        }
        setKaydediliyor(false)
        setModalAcik(false)
        setForm(bosForm)
        toast.goster(
          acilisKurus > 0
            ? `Müşteri eklendi: ${musteri.ad_soyad} · açılış bakiyesi ${paraFormatla(acilisKurus)}`
            : `Müşteri eklendi: ${musteri.ad_soyad}`
        )
        git({ tur: 'kart', musteriId: musteri.id })
      })
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1150 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <h1 style={{ fontSize: 30 }}>Müşteriler</h1>
        <Buton tur="birincil" ikon="ph-user-plus" onClick={() => setModalAcik(true)}>
          Yeni Müşteri
        </Buton>
      </div>

      <div style={{ marginTop: 20 }}>
        <AramaKutusu deger={arama} onDegisti={setArama} placeholder="Ad Soyad veya telefon ile ara…" />
      </div>

      <div style={{ marginTop: 16 }}>
        <SegmentliSecim secenekler={chipSecenekleri} secili={filtre} onSec={setFiltre} />
      </div>

      <div style={{ marginTop: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        {durum === 'hata' ? (
          <div style={{ padding: 20 }}>
            <HataBaneri mesaj={hata} tekrarDene={yukle} />
          </div>
        ) : (
          <Tablo
            sutunlar={sutunlar}
            satirlar={filtrelenmis}
            satirAnahtari={(m) => m.id}
            onSatirTikla={(m) => git({ tur: 'kart', musteriId: m.id })}
            yukleniyor={durum === 'yukleniyor'}
            bosDurumMesaji={arama ? 'Aramanıza uygun müşteri bulunamadı.' : 'Henüz müşteri kaydı yok.'}
            bosDurumIkon="ph-users-three"
          />
        )}
      </div>

      {modalAcik && (
        <Modal
          kapat={() => {
            setModalAcik(false)
            setForm(bosForm)
            setFormHata(null)
          }}
        >
          <h3 style={{ fontSize: 20 }}>Yeni Müşteri</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            <Girdi
              etiket="Ad Soyad"
              value={form.ad_soyad}
              onChange={(e) => setForm((f) => ({ ...f, ad_soyad: e.target.value }))}
              placeholder="Örn. Ayşe Yılmaz"
              hata={formHata}
              autoFocus
            />
            <Girdi
              etiket="Telefon"
              value={form.telefon}
              onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
              placeholder="0532 000 00 00"
              inputMode="tel"
            />
            <Girdi
              etiket="Adres"
              value={form.adres}
              onChange={(e) => setForm((f) => ({ ...f, adres: e.target.value }))}
              placeholder="İsteğe bağlı"
            />
            <Girdi
              etiket="Not"
              value={form.not}
              onChange={(e) => setForm((f) => ({ ...f, not: e.target.value }))}
              placeholder="İsteğe bağlı"
            />
            <Girdi
              etiket="Açılış Bakiyesi (isteğe bağlı)"
              value={form.acilis}
              onChange={(e) => setForm((f) => ({ ...f, acilis: e.target.value }))}
              placeholder="Eski defterden gelen borç — örn. 3.500"
              inputMode="decimal"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <Buton onClick={() => setModalAcik(false)}>Vazgeç</Buton>
            <Buton tur="birincil" disabled={kaydediliyor} onClick={formuKaydet}>
              {kaydediliyor ? 'Kaydediliyor…' : 'Müşteriyi Kaydet'}
            </Buton>
          </div>
        </Modal>
      )}
    </div>
  )
}
