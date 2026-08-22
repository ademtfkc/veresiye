import { useEffect, useRef, useState } from 'react'
import { Buton } from '../bilesenler/Buton'
import { GelecekTarihUyarisi } from '../bilesenler/GelecekTarihUyarisi'
import { Girdi } from '../bilesenler/Girdi'
import { HataBaneri } from '../bilesenler/HataBaneri'
import { ParaGoster } from '../bilesenler/ParaGoster'
import { useToast } from '../bilesenler/Toast'
import { Yukleniyor } from '../bilesenler/Yukleniyor'
import {
  KalemTablosu,
  bosKalem,
  kalemTaslagaCevir,
  kalemTutariKurus,
  kalemleriGirdiyeCevir,
  type KalemTaslak
} from '../bilesenler/KalemTablosu'
import { SatisToplamKutusu } from '../bilesenler/SatisToplamKutusu'
import {
  bugunIso,
  kurusuGirdiMetnineCevir,
  paraFormatla,
  paraGirdisiniKurusaCevir,
  tarihFormatla
} from '../lib/bicim'
import type { NavProps } from '../lib/navigasyon'
import type { MusteriRow } from '../../main/db/types'
import type { SatisDetay } from '../../main/services'

interface SatisDuzenleProps extends NavProps {
  satisId: number
}

/**
 * SATIŞI DÜZENLE (Şartname Böl.2 — yalnızca dükkan sahibi; rol kontrolü ayrıca
 * ana süreçte `satis:guncelle` ucunda da yapılır).
 *
 * Müşteri Kartı'nda bir satış satırı açılıp "Düzenle" denince gelinir. Yanlış
 * girilmiş tarih / açıklama / perde ölçüsü / satır tutarı burada düzeltilir;
 * satışı silip yeniden girmeye gerek kalmaz.
 *
 * Tahsilatlara BURADAN dokunulmaz (onlar Müşteri Kartı'ndan tek tek silinir) —
 * bu yüzden ekranda "şu ana kadar ödenen" bilgisi ve toplam düşerse oluşacak
 * fazla ödeme uyarısı gösterilir.
 */
export function SatisDuzenle({ satisId, git }: SatisDuzenleProps) {
  const toast = useToast()

  const [durum, setDurum] = useState<'yukleniyor' | 'hata' | 'hazir'>('yukleniyor')
  const [yuklemeHatasi, setYuklemeHatasi] = useState('')
  const [detay, setDetay] = useState<SatisDetay | null>(null)
  const [musteri, setMusteri] = useState<MusteriRow | null>(null)

  const [tarih, setTarih] = useState(bugunIso())
  const [aciklama, setAciklama] = useState('')
  const [kalemler, setKalemler] = useState<KalemTaslak[]>([bosKalem()])
  const [devirTutari, setDevirTutari] = useState('')
  // Boş = "satırların toplamını kullan"; dolu = elle yazılan toptan fiyat (02.08.2026).
  const [elleToplam, setElleToplam] = useState('')

  const [hata, setHata] = useState<string | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  // Senkron kilit — hızlı çift tıklamada ikinci kaydı engeller (Yeni Satış ve
  // Devir ekranlarındaki desenin aynısı, bkz. PROJE_DURUMU.md Böl.10 Faz 7).
  const kaydediliyorRef = useRef(false)

  useEffect(() => {
    let iptalEdildi = false
    setDurum('yukleniyor')
    window.api.satisGetir(satisId).then(async (sonuc) => {
      if (iptalEdildi) return
      if (!sonuc.basarili) {
        setYuklemeHatasi(sonuc.hata)
        setDurum('hata')
        return
      }
      const veri = sonuc.veri
      setDetay(veri)
      setTarih(veri.satis.tarih.slice(0, 10))
      setAciklama(veri.satis.aciklama ?? '')
      setKalemler(veri.kalemler.length > 0 ? veri.kalemler.map(kalemTaslagaCevir) : [bosKalem()])
      setDevirTutari(kurusuGirdiMetnineCevir(veri.satis.devir_tutari))
      setElleToplam(veri.satis.elle_toplam !== null ? kurusuGirdiMetnineCevir(veri.satis.elle_toplam) : '')
      setDurum('hazir')

      const musteriSonuc = await window.api.musteriGetir(veri.satis.musteri_id)
      if (!iptalEdildi && musteriSonuc.basarili) setMusteri(musteriSonuc.veri)
    })
    return () => {
      iptalEdildi = true
    }
  }, [satisId])

  const devirMi = detay?.satis.tip === 'devir'
  const satirlarToplami = kalemler.reduce((toplam, k) => toplam + kalemTutariKurus(k), 0)
  const toplamKurus = devirMi
    ? paraGirdisiniKurusaCevir(devirTutari)
    : elleToplam.trim()
      ? paraGirdisiniKurusaCevir(elleToplam)
      : satirlarToplami
  const odenen = detay?.bakiye.odenen_tutar ?? 0
  const yeniKalan = toplamKurus - odenen

  function geriDon() {
    if (detay) git({ tur: 'kart', musteriId: detay.satis.musteri_id })
    else git({ tur: 'musteriler' })
  }

  function kaydet() {
    if (kaydediliyorRef.current || !detay) return
    kaydediliyorRef.current = true

    function hataVer(mesaj: string) {
      setHata(mesaj)
      kaydediliyorRef.current = false
    }

    if (!tarih) {
      hataVer('Lütfen bir tarih seçin.')
      return
    }

    // Toplam kutusu boşsa `null` gönderilir = "elle toplamı kaldır, satırları
    // topla"; doluysa yazılan rakam geçerli olur (02.08.2026).
    const elleToplamKurus = elleToplam.trim() ? paraGirdisiniKurusaCevir(elleToplam) : null
    const girdi = devirMi
      ? { tarih, aciklama: aciklama.trim() || null, devir_tutari: paraGirdisiniKurusaCevir(devirTutari) }
      : {
          tarih,
          aciklama: aciklama.trim() || null,
          kalemler: kalemleriGirdiyeCevir(kalemler),
          elle_toplam: elleToplamKurus
        }

    if (devirMi) {
      if (paraGirdisiniKurusaCevir(devirTutari) <= 0) {
        hataVer('Devir tutarı 0’dan büyük olmalı.')
        return
      }
    } else {
      if ((girdi as { kalemler: unknown[] }).kalemler.length === 0) {
        hataVer('En az bir satır girin (oda/ölçü ya da tutar yazın).')
        return
      }
      if (elleToplamKurus === null && satirlarToplami <= 0) {
        hataVer('Satış toplamı 0 olamaz. Satırlara tutar yazın ya da "Satış Toplamı" kutusuna toplam fiyatı yazın.')
        return
      }
      if (elleToplamKurus !== null && elleToplamKurus <= 0) {
        hataVer('Satış toplamı 0\'dan büyük olmalı.')
        return
      }
    }

    setHata(null)
    setKaydediliyor(true)
    window.api
      .satisGuncelle(satisId, girdi)
      .then((sonuc) => {
        setKaydediliyor(false)
        if (!sonuc.basarili) {
          setHata(sonuc.hata)
          return
        }
        toast.goster('Satış güncellendi.')
        git({ tur: 'kart', musteriId: sonuc.veri.satis.musteri_id })
      })
      .finally(() => {
        kaydediliyorRef.current = false
      })
  }

  if (durum === 'yukleniyor') {
    return (
      <div style={{ padding: '28px 32px' }}>
        <Yukleniyor mesaj="Satış yükleniyor…" />
      </div>
    )
  }

  if (durum === 'hata' || !detay) {
    return (
      <div style={{ padding: '28px 32px', maxWidth: 700 }}>
        <HataBaneri mesaj={yuklemeHatasi || 'Satış bulunamadı.'} />
        <div style={{ marginTop: 16 }}>
          <Buton onClick={() => git({ tur: 'musteriler' })}>Müşterilere Dön</Buton>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1050 }}>
      <button
        type="button"
        onClick={geriDon}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text2)',
          fontSize: 15,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 0'
        }}
      >
        <i className="ph ph-arrow-left" style={{ fontSize: 18 }} aria-hidden="true" />
        {musteri ? musteri.ad_soyad : 'Müşteri kartı'}
      </button>

      <h1 style={{ fontSize: 30, marginTop: 8 }}>{devirMi ? 'Devir Kaydını Düzenle' : 'Satışı Düzenle'}</h1>
      <div style={{ marginTop: 6, color: 'var(--text2)', fontSize: 15 }}>
        {musteri ? <b style={{ color: 'var(--text)' }}>{musteri.ad_soyad}</b> : 'Müşteri'} ·{' '}
        {tarihFormatla(detay.satis.tarih)} tarihli kayıt
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
          gap: 20
        }}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 170 }}>
            <label
              htmlFor="duzenle-tarih"
              style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}
            >
              Tarih
            </label>
            <input
              id="duzenle-tarih"
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
          <div style={{ flex: 2, minWidth: 240 }}>
            <Girdi
              etiket="Açıklama"
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder={devirMi ? 'Örn. eski defter sayfa 42' : 'Örn. Salon perdesi + tül'}
            />
          </div>
        </div>

        <GelecekTarihUyarisi gorunurMu={tarih > bugunIso()} />

        {devirMi ? (
          <Girdi
            etiket="Devir (kalan borç) Tutarı"
            value={devirTutari}
            onChange={(e) => setDevirTutari(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className="mono"
            sagIkon="₺"
            style={{ fontSize: 28, fontWeight: 600, textAlign: 'right' }}
          />
        ) : (
          <KalemTablosu kalemler={kalemler} setKalemler={setKalemler} />
        )}

        {devirMi ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '18px 22px',
              background: 'var(--primary-soft)',
              borderRadius: 8,
              flexWrap: 'wrap'
            }}
          >
            <div style={{ fontSize: 15, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>
              Yeni Toplam
            </div>
            <ParaGoster kurus={toplamKurus} boyut="devasa" renk="var(--primary)" />
          </div>
        ) : (
          <SatisToplamKutusu
            satirlarToplami={satirlarToplami}
            deger={elleToplam}
            onDegis={setElleToplam}
            etiket="Yeni Toplam"
          />
        )}

        {odenen > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              padding: '14px 22px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 15
            }}
          >
            <span style={{ color: 'var(--text2)' }}>
              Bu satışa şimdiye kadar <b style={{ color: 'var(--success)' }}>{paraFormatla(odenen)}</b> tahsilat girilmiş
              (tahsilatlar bu ekrandan değişmez).
            </span>
            <span className="mono" style={{ fontWeight: 600 }}>
              Yeni kalan: {paraFormatla(yeniKalan)}
            </span>
          </div>
        )}

        {yeniKalan < 0 && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'var(--warning-soft)',
              border: '1px solid var(--warning)',
              borderRadius: 8,
              fontSize: 13.5
            }}
          >
            <i className="ph ph-warning-circle" style={{ fontSize: 18, flex: 'none', color: 'var(--warning)' }} aria-hidden="true" />
            <div>
              Yeni toplam, alınan tahsilatın altında kalıyor. Kaydederseniz satış <b>fazla ödenmiş</b> görünecek ve
              kapanacak. Doğru olduğundan emin misiniz?
            </div>
          </div>
        )}

        {hata && <HataBaneri mesaj={hata} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Buton onClick={geriDon}>Vazgeç</Buton>
          <Buton tur="birincil" type="submit" buyuk ikon="ph-check" disabled={kaydediliyor}>
            {kaydediliyor ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
          </Buton>
        </div>
      </form>
    </div>
  )
}
