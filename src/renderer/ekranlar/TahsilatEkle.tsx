import { useCallback, useEffect, useRef, useState } from 'react'
import { Buton } from '../bilesenler/Buton'
import { GelecekTarihUyarisi } from '../bilesenler/GelecekTarihUyarisi'
import { Girdi } from '../bilesenler/Girdi'
import { HataBaneri } from '../bilesenler/HataBaneri'
import { ParaGoster } from '../bilesenler/ParaGoster'
import { SegmentliSecim, type SegmentSecenegi } from '../bilesenler/SegmentliSecim'
import { Yukleniyor } from '../bilesenler/Yukleniyor'
import { useToast } from '../bilesenler/Toast'
import { bugunIso, paraFormatla, paraGirdisiniKurusaCevir, tarihFormatla } from '../lib/bicim'
import { bakiyeRenkDegiskeni, musterileriBakiyeIleZenginlestir, type MusteriBakiyeli } from '../lib/veri'
import type { NavProps } from '../lib/navigasyon'
import type { MusteriRow, OdemeSekli } from '../../main/db/types'

interface TahsilatEkleProps extends NavProps {
  musteriId?: number
  satisId?: number
}

interface AcikSatis {
  id: number
  aciklama: string
  tarih: string
  kalanKurus: number
}

const ODEME_SECENEKLERI: SegmentSecenegi<OdemeSekli>[] = [
  { deger: 'nakit', etiket: 'Nakit' },
  { deger: 'kart', etiket: 'Kart' },
  { deger: 'havale', etiket: 'Havale' }
]

/** Tahsilat Ekle (Şartname 8.6) — müşteri ara → açık satış seç → tutar/tarih/şekil. */
export function TahsilatEkle({ musteriId, satisId, git }: TahsilatEkleProps) {
  const toast = useToast()

  const [musteri, setMusteri] = useState<MusteriRow | null>(null)
  const [presetYukleniyor, setPresetYukleniyor] = useState(!!musteriId)

  const [sorgu, setSorgu] = useState('')
  const [sonuclar, setSonuclar] = useState<MusteriBakiyeli[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [acikSatislar, setAcikSatislar] = useState<AcikSatis[]>([])
  const [satislarYukleniyor, setSatislarYukleniyor] = useState(false)
  const [secilenSatisId, setSecilenSatisId] = useState<number | null>(null)
  const onSelectUygulandi = useRef(false)

  const [tutar, setTutar] = useState('')
  const [tarih, setTarih] = useState(bugunIso())
  const [odemeSekli, setOdemeSekli] = useState<OdemeSekli>('nakit')
  const [not, setNot] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  // Senkron kilit — bkz. YeniSatis.tsx aynı desen (PROJE_DURUMU.md Böl.10,
  // Faz 7: racy `disabled={kaydediliyor}` hızlı çift tıklamada yinelenen
  // tahsilat oluşturuyordu).
  const kaydediliyorRef = useRef(false)

  const acikSatislariYukle = useCallback((mId: number) => {
    setSatislarYukleniyor(true)
    window.api.satisMusteriyeGoreListele(mId).then(async (sonuc) => {
      if (!sonuc.basarili) {
        setSatislarYukleniyor(false)
        return
      }
      const acikliste = sonuc.veri.filter((s) => s.durum === 'acik')
      const detaylar = await Promise.all(acikliste.map((s) => window.api.satisGetir(s.id)))
      const zenginlestirilmis: AcikSatis[] = []
      detaylar.forEach((d, i) => {
        if (!d.basarili) return
        zenginlestirilmis.push({
          id: acikliste[i].id,
          aciklama: acikliste[i].aciklama || (acikliste[i].tip === 'devir' ? 'Devir (eski defter)' : 'Perde satışı'),
          tarih: acikliste[i].tarih,
          kalanKurus: d.veri.bakiye.kalan_bakiye
        })
      })
      setAcikSatislar(zenginlestirilmis)
      setSatislarYukleniyor(false)
    })
  }, [])

  useEffect(() => {
    if (!musteriId) return
    setPresetYukleniyor(true)
    window.api.musteriGetir(musteriId).then((sonuc) => {
      setPresetYukleniyor(false)
      if (sonuc.basarili) {
        setMusteri(sonuc.veri)
        acikSatislariYukle(musteriId)
      }
    })
  }, [musteriId, acikSatislariYukle])

  // satisId ön-seçili geldiyse (Peşinat akışı), açık satışlar yüklenince otomatik seç.
  useEffect(() => {
    if (satisId && !onSelectUygulandi.current && acikSatislar.some((s) => s.id === satisId)) {
      setSecilenSatisId(satisId)
      onSelectUygulandi.current = true
    }
  }, [satisId, acikSatislar])

  useEffect(() => {
    if (musteri || !sorgu.trim()) {
      setSonuclar([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const sonuc = await window.api.musteriAra(sorgu.trim())
      if (!sonuc.basarili) return
      const ilkAlti = sonuc.veri.slice(0, 6)
      const zenginlestirilmis = await musterileriBakiyeIleZenginlestir(ilkAlti)
      setSonuclar(zenginlestirilmis)
    }, 180)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [sorgu, musteri])

  function musteriSec(m: MusteriRow) {
    setMusteri(m)
    setSorgu('')
    setSonuclar([])
    setSecilenSatisId(null)
    acikSatislariYukle(m.id)
  }

  function musteriDegistir() {
    setMusteri(null)
    setAcikSatislar([])
    setSecilenSatisId(null)
    setHata(null)
  }

  const guncelBakiye = acikSatislar.reduce((toplam, s) => toplam + s.kalanKurus, 0)

  function kaydet() {
    if (kaydediliyorRef.current) return
    kaydediliyorRef.current = true

    function hataVer(mesaj: string) {
      setHata(mesaj)
      kaydediliyorRef.current = false
    }

    if (!secilenSatisId) {
      hataVer('Lütfen bir satış/hesap seçin.')
      return
    }
    const tutarKurus = paraGirdisiniKurusaCevir(tutar)
    if (tutarKurus <= 0) {
      hataVer('Lütfen geçerli bir tutar gir.')
      return
    }
    setHata(null)
    setKaydediliyor(true)
    window.api
      .tahsilatEkle({
        satis_id: secilenSatisId,
        tarih,
        tutar: tutarKurus,
        odeme_sekli: odemeSekli,
        not: not.trim() || undefined
      })
      .then((sonuc) => {
        setKaydediliyor(false)
        if (!sonuc.basarili) {
          setHata(sonuc.hata)
          return
        }
        toast.goster(`Tahsilat kaydedildi. Kalan bakiye: ${paraFormatla(sonuc.veri.kalanBakiye)}`)
        setTutar('')
        setNot('')
        setSecilenSatisId(null)
        if (musteri) acikSatislariYukle(musteri.id)
      })
      .finally(() => {
        kaydediliyorRef.current = false
      })
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 820 }}>
      <h1 style={{ fontSize: 30 }}>Tahsilat Ekle</h1>

      {presetYukleniyor && <Yukleniyor mesaj="Müşteri yükleniyor…" />}

      {!presetYukleniyor && !musteri && (
        <div style={{ marginTop: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 24 }}>
          <label style={{ display: 'block', fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
            Hangi müşteriden tahsilat alıyorsunuz?
          </label>
          <div style={{ position: 'relative' }}>
            <i
              className="ph ph-magnifying-glass"
              aria-hidden="true"
              style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 22, color: 'var(--text2)' }}
            />
            <input
              value={sorgu}
              onChange={(e) => setSorgu(e.target.value)}
              placeholder="Ad Soyad veya telefon ile ara…"
              style={{
                width: '100%',
                padding: '17px 18px 17px 52px',
                fontSize: 19,
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface)',
                color: 'var(--text)'
              }}
            />
          </div>
          {sonuclar.length > 0 && (
            <div style={{ marginTop: 12, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {sonuclar.map((r) => (
                <div
                  key={r.id}
                  data-row
                  tabIndex={0}
                  onClick={() => musteriSec(r)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') musteriSec(r)
                  }}
                  style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 17 }}>{r.ad_soyad}</div>
                    <div className="mono" style={{ color: 'var(--text2)', fontSize: 14 }}>
                      {r.telefon || '—'}
                    </div>
                  </div>
                  <ParaGoster kurus={r.bakiye} renk={bakiyeRenkDegiskeni(r.bakiye)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {musteri && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            kaydet()
          }}
          style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Müşteri</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{musteri.ad_soyad}</div>
              <div className="mono" style={{ color: 'var(--text2)', fontSize: 14 }}>
                {musteri.telefon || '—'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Güncel Bakiye
              </div>
              <ParaGoster kurus={guncelBakiye} boyut="buyuk" renk={bakiyeRenkDegiskeni(guncelBakiye)} style={{ marginTop: 4 }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={musteriDegistir}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text2)', textDecoration: 'underline', fontSize: 13, cursor: 'pointer' }}
                >
                  müşteri değiştir
                </button>
                <button
                  type="button"
                  onClick={() => git({ tur: 'kart', musteriId: musteri.id })}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text2)', textDecoration: 'underline', fontSize: 13, cursor: 'pointer' }}
                >
                  müşteri kartına dön
                </button>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 22px' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Hangi satışa/hesaba ödeme yapılıyor?</div>
            {satislarYukleniyor && <Yukleniyor mesaj="Açık hesaplar yükleniyor…" />}
            {!satislarYukleniyor && acikSatislar.length === 0 && (
              <div style={{ color: 'var(--text2)', padding: '8px 0' }}>
                Bu müşterinin açık hesabı yok — tüm satışları kapanmış görünüyor.
              </div>
            )}
            {!satislarYukleniyor && acikSatislar.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {acikSatislar.map((s) => {
                  const secili = secilenSatisId === s.id
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSecilenSatisId(s.id)}
                      role="radio"
                      aria-checked={secili}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSecilenSatisId(s.id)
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '14px 16px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        border: `1px solid ${secili ? 'var(--primary)' : 'var(--border)'}`,
                        background: secili ? 'var(--primary-soft)' : 'var(--surface)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <i
                          className={`ph ${secili ? 'ph-radio-button' : 'ph-circle'}`}
                          style={{ fontSize: 22, color: secili ? 'var(--primary)' : 'var(--text2)' }}
                          aria-hidden="true"
                        />
                        <div>
                          <div style={{ fontWeight: 500 }}>{s.aciklama}</div>
                          <div className="mono" style={{ fontSize: 13, color: 'var(--text2)' }}>
                            {tarihFormatla(s.tarih)}
                          </div>
                        </div>
                      </div>
                      <ParaGoster kurus={s.kalanKurus} renk="var(--danger)" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {secilenSatisId && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Girdi
                etiket="Tahsil Edilen Tutar"
                value={tutar}
                onChange={(e) => setTutar(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="mono"
                sagIkon="₺"
                style={{ fontSize: 32, fontWeight: 600, textAlign: 'right' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Tarih</label>
                  <input
                    type="date"
                    value={tarih}
                    onChange={(e) => setTarih(e.target.value)}
                    className="mono"
                    style={{ width: '100%', padding: '13px 16px', fontSize: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ödeme Şekli</label>
                  <SegmentliSecim secenekler={ODEME_SECENEKLERI} secili={odemeSekli} onSec={setOdemeSekli} esitGenislik />
                </div>
              </div>
              <GelecekTarihUyarisi gorunurMu={tarih > bugunIso()} />
              <Girdi
                etiket="Not (isteğe bağlı)"
                value={not}
                onChange={(e) => setNot(e.target.value)}
                placeholder="Örn. ay sonu bakiye kapatıldı"
              />

              {hata && <HataBaneri mesaj={hata} />}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Buton onClick={musteriDegistir}>Vazgeç</Buton>
                <Buton tur="birincil" type="submit" buyuk ikon="ph-check" disabled={kaydediliyor}>
                  {kaydediliyor ? 'Kaydediliyor…' : 'Tahsilatı Kaydet'}
                </Buton>
              </div>
            </div>
          )}
          {!secilenSatisId && hata && <HataBaneri mesaj={hata} />}
        </form>
      )}
    </div>
  )
}
