import { useEffect, useRef, useState } from 'react'
import { Buton } from '../bilesenler/Buton'
import { Girdi } from '../bilesenler/Girdi'
import { HataBaneri } from '../bilesenler/HataBaneri'
import { Modal } from '../bilesenler/Modal'
import { SegmentliSecim, type SegmentSecenegi } from '../bilesenler/SegmentliSecim'
import { useToast } from '../bilesenler/Toast'
import {
  KalemTablosu,
  bosKalem,
  kalemTutariKurus,
  kalemleriGirdiyeCevir,
  type KalemTaslak
} from '../bilesenler/KalemTablosu'
import { SatisToplamKutusu } from '../bilesenler/SatisToplamKutusu'
import { bugunIso, paraFormatla, paraGirdisiniKurusaCevir } from '../lib/bicim'
import type { NavProps } from '../lib/navigasyon'
import type { MusteriRow } from '../../main/db/types'

interface YeniSatisProps extends NavProps {
  musteriId?: number
}

type KayitTuru = 'satis' | 'devir'
const KAYIT_TURU_SECENEKLERI: SegmentSecenegi<KayitTuru>[] = [
  { deger: 'satis', etiket: 'Yeni Satış' },
  { deger: 'devir', etiket: 'Devir (eski defter)' }
]

/** Yeni Satış (Şartname 8.4) — müşteri seç/oluştur + perde kalemleri, toplam anlık. */
export function YeniSatis({ musteriId, git }: YeniSatisProps) {
  const toast = useToast()

  const [musteri, setMusteri] = useState<MusteriRow | null>(null)
  const [presetYukleniyor, setPresetYukleniyor] = useState(!!musteriId)
  const [sorgu, setSorgu] = useState('')
  const [sonuclar, setSonuclar] = useState<MusteriRow[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [aciklama, setAciklama] = useState('')
  const [kalemler, setKalemler] = useState<KalemTaslak[]>([bosKalem()])
  // Boş = "satırların toplamını kullan"; dolu = elle yazılan toptan fiyat (02.08.2026).
  const [elleToplam, setElleToplam] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  // Senkron kilit — React'in disabled state'i render'a bağlı olduğu için hızlı
  // çift tıklamada (aynı tick'te iki submit) ikinci çağrıyı durduramaz. Bu
  // useRef GERÇEK zamanda (senkron) kontrol edildiği için ikinci çağrı fonksiyonun
  // en başında yakalanıp iptal edilir (bkz. PROJE_DURUMU.md Böl.10, Faz 7 bulgusu).
  const kaydediliyorRef = useRef(false)
  const [pesinat, setPesinat] = useState<{ musteriId: number; satisId: number; toplamStr: string } | null>(null)

  useEffect(() => {
    if (!musteriId) return
    setPresetYukleniyor(true)
    window.api.musteriGetir(musteriId).then((sonuc) => {
      setPresetYukleniyor(false)
      if (sonuc.basarili) setMusteri(sonuc.veri)
    })
  }, [musteriId])

  useEffect(() => {
    if (musteri || !sorgu.trim()) {
      setSonuclar([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      window.api.musteriAra(sorgu.trim()).then((sonuc) => {
        if (sonuc.basarili) setSonuclar(sonuc.veri.slice(0, 6))
      })
    }, 180)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [sorgu, musteri])

  function yeniMusteriOlustur() {
    const ad = sorgu.trim()
    if (!ad) return
    window.api.musteriEkle({ ad_soyad: ad }).then((sonuc) => {
      if (sonuc.basarili) {
        setMusteri(sonuc.veri)
        setSorgu('')
        setSonuclar([])
      } else {
        toast.goster(sonuc.hata)
      }
    })
  }

  const satirlarToplami = kalemler.reduce((toplam, k) => toplam + kalemTutariKurus(k), 0)

  function kaydet() {
    if (kaydediliyorRef.current) return
    kaydediliyorRef.current = true

    function hataVer(mesaj: string) {
      setHata(mesaj)
      kaydediliyorRef.current = false
    }

    if (!musteri) {
      hataVer('Lütfen önce müşteri seçin.')
      return
    }
    const doluKalemler = kalemleriGirdiyeCevir(kalemler)
    if (doluKalemler.length === 0) {
      hataVer('En az bir satır girin (oda/ölçü ya da tutar yazın).')
      return
    }
    // Toplam kutusu boşsa satırların toplamı geçerli; ikisi de 0 ise kaydetme.
    const elleToplamKurus = elleToplam.trim() ? paraGirdisiniKurusaCevir(elleToplam) : null
    if (elleToplamKurus === null && satirlarToplami <= 0) {
      hataVer('Satış toplamı 0 olamaz. Satırlara tutar yazın ya da "Satış Toplamı" kutusuna toplam fiyatı yazın.')
      return
    }
    if (elleToplamKurus !== null && elleToplamKurus <= 0) {
      hataVer('Satış toplamı 0\'dan büyük olmalı.')
      return
    }

    setHata(null)
    setKaydediliyor(true)
    window.api
      .satisEkle({
        musteri_id: musteri.id,
        tarih: bugunIso(),
        aciklama: aciklama.trim() || undefined,
        kalemler: doluKalemler,
        elle_toplam: elleToplamKurus
      })
      .then((sonuc) => {
        setKaydediliyor(false)
        if (!sonuc.basarili) {
          setHata(sonuc.hata)
          return
        }
        setPesinat({
          musteriId: musteri.id,
          satisId: sonuc.veri.satis.id,
          toplamStr: paraFormatla(sonuc.veri.bakiye.toplam_tutar)
        })
      })
      .finally(() => {
        kaydediliyorRef.current = false
      })
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1050 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 30 }}>Yeni Satış</h1>
        <div style={{ minWidth: 260 }}>
          <SegmentliSecim
            secenekler={KAYIT_TURU_SECENEKLERI}
            secili="satis"
            onSec={(v) => {
              if (v === 'devir') git({ tur: 'devir' })
            }}
            esitGenislik
          />
        </div>
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
        {presetYukleniyor ? (
          <div style={{ color: 'var(--text2)' }}>Müşteri yükleniyor…</div>
        ) : musteri ? (
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
            <Buton onClick={() => setMusteri(null)}>Değiştir</Buton>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Müşteri Seç</label>
            <div style={{ position: 'relative' }}>
              <i
                className="ph ph-magnifying-glass"
                aria-hidden="true"
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: 'var(--text2)' }}
              />
              <input
                value={sorgu}
                onChange={(e) => setSorgu(e.target.value)}
                placeholder="Müşteri ara ya da yeni ad yaz…"
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 46px',
                  fontSize: 17,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--surface)',
                  color: 'var(--text)'
                }}
              />
            </div>
            {sonuclar.length > 0 && (
              <div style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {sonuclar.map((r) => (
                  <div
                    key={r.id}
                    data-row
                    tabIndex={0}
                    onClick={() => {
                      setMusteri(r)
                      setSorgu('')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setMusteri(r)
                        setSorgu('')
                      }
                    }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between'
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
              <button
                type="button"
                onClick={yeniMusteriOlustur}
                style={{
                  marginTop: 8,
                  background: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  border: '1px dashed var(--primary)',
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left'
                }}
              >
                <i className="ph ph-user-plus" style={{ fontSize: 18, marginRight: 8 }} aria-hidden="true" />“
                {sorgu.trim()}” adıyla yeni müşteri oluştur
              </button>
            )}
          </div>
        )}

        <Girdi
          etiket="Açıklama"
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="Örn. Salon perdesi + tül"
        />

        <KalemTablosu kalemler={kalemler} setKalemler={setKalemler} />

        <SatisToplamKutusu satirlarToplami={satirlarToplami} deger={elleToplam} onDegis={setElleToplam} />

        {hata && <HataBaneri mesaj={hata} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Buton onClick={() => git({ tur: 'panel' })}>Vazgeç</Buton>
          <Buton tur="birincil" type="submit" buyuk disabled={kaydediliyor}>
            {kaydediliyor ? 'Kaydediliyor…' : 'Satışı Kaydet'}
          </Buton>
        </div>
      </form>

      {pesinat && (
        <Modal merkezliMetin genislikPx={440}>
          <i className="ph ph-hand-coins" style={{ fontSize: 44, color: 'var(--primary)' }} aria-hidden="true" />
          <h3 style={{ fontSize: 22, marginTop: 12 }}>Peşinat aldınız mı?</h3>
          <div style={{ marginTop: 8, color: 'var(--text2)', fontSize: 16 }}>
            Satış kaydedildi. Toplam tutar <b className="mono" style={{ color: 'var(--text)' }}>{pesinat.toplamStr}</b>. Peşinat
            aldıysanız ilk tahsilatı hemen girebilirsiniz.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <Buton
              style={{ flex: 1, justifyContent: 'center' }}
              buyuk
              onClick={() => {
                const hedefMusteri = pesinat.musteriId
                setPesinat(null)
                toast.goster('Satış kaydedildi.')
                git({ tur: 'kart', musteriId: hedefMusteri })
              }}
            >
              Hayır, sonra
            </Buton>
            <Buton
              tur="birincil"
              style={{ flex: 1, justifyContent: 'center' }}
              buyuk
              onClick={() => {
                const hedef = pesinat
                setPesinat(null)
                git({ tur: 'tahsilat', musteriId: hedef.musteriId, satisId: hedef.satisId })
              }}
            >
              Evet, tahsilat gir
            </Buton>
          </div>
        </Modal>
      )}
    </div>
  )
}
