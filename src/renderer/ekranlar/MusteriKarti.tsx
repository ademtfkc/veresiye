import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Buton } from '../bilesenler/Buton'
import { MusteriDurumRozeti, SatisDurumEtiketi, satisDurumGorunumuHesapla } from '../bilesenler/DurumRozeti'
import { HataBaneri } from '../bilesenler/HataBaneri'
import { ParaGoster } from '../bilesenler/ParaGoster'
import { Tablo, type TabloSutunu } from '../bilesenler/Tablo'
import { useOnay } from '../bilesenler/OnayKutusu'
import { useToast } from '../bilesenler/Toast'
import { olcuFormatla, odemeSekliEtiketi, paraFormatla, tarihFormatla } from '../lib/bicim'
import { bakiyeRenkDegiskeni, musteriDurumBelirle, type MusteriDurum } from '../lib/veri'
import type { NavProps } from '../lib/navigasyon'
import type { MusteriRow, PerdeKalemiRow, TahsilatRow } from '../../main/db/types'
import type { SatisDetay } from '../../main/services'
import { Yukleniyor } from '../bilesenler/Yukleniyor'

interface MusteriKartiProps extends NavProps {
  musteriId: number
  isSahip: boolean
}

/** Müşteri Kartı (Şartname 8.3) — müşteri + bakiye + satış/tahsilat dökümü. */
export function MusteriKarti({ musteriId, isSahip, git }: MusteriKartiProps) {
  const toast = useToast()
  const onay = useOnay()

  const [durum, setDurum] = useState<'yukleniyor' | 'hata' | 'hazir'>('yukleniyor')
  const [hata, setHata] = useState('')
  const [musteri, setMusteri] = useState<MusteriRow | null>(null)
  const [satislar, setSatislar] = useState<SatisDetay[]>([])
  const [gecikenMi, setGecikenMi] = useState(false)
  const [genisletilen, setGenisletilen] = useState<number | null>(null)

  const yukle = useCallback(() => {
    setDurum('yukleniyor')
    setGenisletilen(null)
    Promise.all([
      window.api.musteriGetir(musteriId),
      window.api.satisMusteriyeGoreListele(musteriId),
      window.api.panelOzet()
    ]).then(async ([musteriSonuc, satislarSonuc, panelSonuc]) => {
      if (!musteriSonuc.basarili) {
        setHata(musteriSonuc.hata)
        setDurum('hata')
        return
      }
      if (!satislarSonuc.basarili) {
        setHata(satislarSonuc.hata)
        setDurum('hata')
        return
      }
      const detaylar = await Promise.all(satislarSonuc.veri.map((s) => window.api.satisGetir(s.id)))
      const basarisiz = detaylar.find((d) => !d.basarili)
      if (basarisiz && !basarisiz.basarili) {
        setHata(basarisiz.hata)
        setDurum('hata')
        return
      }
      setMusteri(musteriSonuc.veri)
      setSatislar(detaylar.map((d) => (d as { basarili: true; veri: SatisDetay }).veri))
      setGecikenMi(panelSonuc.basarili ? panelSonuc.veri.kirmiziListe.some((r) => r.musteri_id === musteriId) : false)
      setDurum('hazir')
    })
  }, [musteriId])

  useEffect(() => {
    yukle()
  }, [yukle])

  const toplamBakiye = useMemo(
    () => satislar.filter((s) => s.satis.durum === 'acik').reduce((toplam, s) => toplam + s.bakiye.kalan_bakiye, 0),
    [satislar]
  )
  const musteriDurumu: MusteriDurum = musteriDurumBelirle(toplamBakiye, gecikenMi)

  async function satisSilOnayla(satisId: number, aciklama: string) {
    const onaylandi = await onay.sor(`"${aciklama}" satışı ve tüm tahsilat geçmişi kalıcı olarak silinecek.`)
    if (!onaylandi) return
    const sonuc = await window.api.satisSil(satisId)
    if (!sonuc.basarili) {
      toast.goster(sonuc.hata)
      return
    }
    toast.goster('Satış silindi.')
    yukle()
  }

  async function tahsilatSilOnayla(tahsilatId: number, tutarStr: string) {
    const onaylandi = await onay.sor(
      `${tutarStr} tutarındaki tahsilat kalıcı olarak silinecek. Satışın bakiyesi bu tahsilat hiç girilmemiş gibi güncellenecek.`
    )
    if (!onaylandi) return
    const sonuc = await window.api.tahsilatSil(tahsilatId)
    if (!sonuc.basarili) {
      toast.goster(sonuc.hata)
      return
    }
    toast.goster(`Tahsilat silindi. Kalan bakiye: ${paraFormatla(sonuc.veri.kalanBakiye)}`)
    yukle()
  }

  async function musteriSilOnayla() {
    if (!musteri) return
    const onaylandi = await onay.sor(`${musteri.ad_soyad} ve tüm hesap geçmişi (satış, tahsilat) kalıcı olarak silinecek.`)
    if (!onaylandi) return
    const sonuc = await window.api.musteriSil(musteri.id)
    if (!sonuc.basarili) {
      toast.goster(sonuc.hata)
      return
    }
    toast.goster('Müşteri silindi.')
    git({ tur: 'musteriler' })
  }

  const kalemSutunlari: TabloSutunu<PerdeKalemiRow>[] = [
    { anahtar: 'oda', baslik: 'Oda', render: (k) => k.oda || '—' },
    { anahtar: 'model', baslik: 'Model / Kumaş', render: (k) => k.model_kumas || '—' },
    { anahtar: 'en', baslik: 'En', hizalama: 'right', render: (k) => <span className="mono">{olcuFormatla(k.en)}</span> },
    { anahtar: 'boy', baslik: 'Boy', hizalama: 'right', render: (k) => <span className="mono">{olcuFormatla(k.boy)}</span> },
    { anahtar: 'adet', baslik: 'Adet', hizalama: 'right', render: (k) => <span className="mono">{k.adet}</span> },
    {
      anahtar: 'tutar',
      baslik: 'Tutar',
      hizalama: 'right',
      render: (k) => (
        <span className="mono" style={{ fontWeight: 600 }}>
          {paraFormatla(k.satir_tutari)}
        </span>
      )
    }
  ]

  const tahsilatSutunlari: TabloSutunu<TahsilatRow>[] = [
    { anahtar: 'tarih', baslik: 'Tarih', render: (t) => <span className="mono" style={{ color: 'var(--text2)' }}>{tarihFormatla(t.tarih)}</span> },
    {
      anahtar: 'tutar',
      baslik: 'Tutar',
      hizalama: 'right',
      render: (t) => <ParaGoster kurus={t.tutar} renk="var(--success)" />
    },
    { anahtar: 'sekil', baslik: 'Ödeme Şekli', render: (t) => odemeSekliEtiketi(t.odeme_sekli) },
    { anahtar: 'not', baslik: 'Not', render: (t) => <span style={{ color: 'var(--text2)' }}>{t.not || '—'}</span> },
    ...(isSahip
      ? [
          {
            anahtar: 'islem',
            baslik: '',
            hizalama: 'right' as const,
            genislikPx: 48,
            render: (t) => (
              <button
                type="button"
                onClick={() => tahsilatSilOnayla(t.id, paraFormatla(t.tutar))}
                aria-label="Bu tahsilatı sil"
                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 4 }}
              >
                <i className="ph ph-trash" aria-hidden="true" />
              </button>
            )
          } satisfies TabloSutunu<TahsilatRow>
        ]
      : [])
  ]

  if (durum === 'yukleniyor') {
    return (
      <div style={{ padding: '24px 32px' }}>
        <Yukleniyor mesaj="Müşteri kartı yükleniyor…" />
      </div>
    )
  }

  if (durum === 'hata' || !musteri) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 700 }}>
        <HataBaneri mesaj={hata || 'Müşteri bulunamadı.'} tekrarDene={yukle} />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1150 }}>
      <button
        type="button"
        onClick={() => git({ tur: 'musteriler' })}
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
        Müşteriler
      </button>

      <div
        style={{
          marginTop: 12,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '24px 26px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap'
        }}
      >
        <div>
          <h1 style={{ fontSize: 28 }}>{musteri.ad_soyad}</h1>
          <div className="mono" style={{ color: 'var(--text2)', marginTop: 6, fontSize: 17 }}>
            {musteri.telefon || '—'}
          </div>
          <div style={{ marginTop: 12 }}>
            <MusteriDurumRozeti durum={musteriDurumu} />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Toplam Kalan Bakiye
          </div>
          <div style={{ marginTop: 6 }}>
            <ParaGoster kurus={toplamBakiye} boyut="devasa" renk={bakiyeRenkDegiskeni(toplamBakiye)} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <Buton tur="birincil" ikon="ph-plus" onClick={() => git({ tur: 'yeniSatis', musteriId })}>
          Yeni Satış
        </Buton>
        <Buton ikon="ph-hand-coins" onClick={() => git({ tur: 'tahsilat', musteriId })}>
          Tahsilat Ekle
        </Buton>
        <Buton ikon="ph-printer" onClick={() => git({ tur: 'raporlar', raporTuru: 'ekstre', musteriId })}>
          Ekstre Yazdır
        </Buton>
        {isSahip && (
          <>
            <div style={{ flex: 1 }} />
            <Buton tur="tehlike" ikon="ph-trash" onClick={musteriSilOnayla}>
              Müşteriyi Sil
            </Buton>
          </>
        )}
      </div>

      <div style={{ marginTop: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 18 }}>Satışlar & Hesap Hareketleri</h3>
        </div>

        {satislar.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
            Bu müşterinin henüz satışı yok. "Yeni Satış" ile ilk kaydı ekleyebilirsiniz.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Tarih', 'Açıklama', 'Toplam', 'Ödenen', 'Kalan', 'Durum'].map((baslik, i) => (
                  <th
                    key={baslik}
                    style={{
                      textAlign: i === 0 || i === 1 ? 'left' : 'right',
                      padding: i === 0 ? '11px 22px' : '11px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      color: 'var(--text2)',
                      borderBottom: '2px solid var(--border)'
                    }}
                  >
                    {baslik}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {satislar.map((s) => {
                const acik = genisletilen === s.satis.id
                const gorunum = satisDurumGorunumuHesapla(s.bakiye.kalan_bakiye, s.satis.durum)
                return (
                  <Fragment key={s.satis.id}>
                    <tr
                      data-row
                      tabIndex={0}
                      onClick={() => setGenisletilen(acik ? null : s.satis.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setGenisletilen(acik ? null : s.satis.id)
                        }
                      }}
                    >
                      <td className="mono" style={{ padding: '0 22px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                        {tarihFormatla(s.satis.tarih)}
                      </td>
                      <td style={{ padding: '0 16px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)' }}>
                        <i className={`ph ${acik ? 'ph-caret-down' : 'ph-caret-right'}`} style={{ fontSize: 14, color: 'var(--text2)', marginRight: 8 }} aria-hidden="true" />
                        {s.satis.aciklama || (s.satis.tip === 'devir' ? 'Devir (eski defter)' : 'Perde satışı')}
                        {s.satis.tip === 'devir' && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 11,
                              padding: '2px 7px',
                              borderRadius: 3,
                              background: 'var(--warning-soft)',
                              color: 'var(--warning)',
                              fontWeight: 600
                            }}
                          >
                            Devir · eski defter
                          </span>
                        )}
                      </td>
                      <td className="mono" style={{ padding: '0 16px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                        {paraFormatla(s.bakiye.toplam_tutar)}
                      </td>
                      <td className="mono" style={{ padding: '0 16px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--success)' }}>
                        {paraFormatla(s.bakiye.odenen_tutar)}
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: '0 16px',
                          height: 'var(--row-h)',
                          borderBottom: '1px solid var(--border)',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: bakiyeRenkDegiskeni(s.bakiye.kalan_bakiye)
                        }}
                      >
                        {paraFormatla(s.bakiye.kalan_bakiye)}
                      </td>
                      <td style={{ padding: '0 22px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                        <SatisDurumEtiketi gorunum={gorunum} />
                      </td>
                    </tr>
                    {acik && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {s.satis.elle_toplam !== null && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '10px 14px',
                                  background: 'var(--primary-soft)',
                                  borderRadius: 8,
                                  fontSize: 13.5
                                }}
                              >
                                <i className="ph ph-info" style={{ fontSize: 18, flex: 'none', color: 'var(--primary)' }} aria-hidden="true" />
                                <div>
                                  Bu satışın toplamı <b className="mono">{paraFormatla(s.satis.elle_toplam)}</b> olarak{' '}
                                  <b>elle girilmiş</b> (toptan fiyat). Aşağıdaki satır tutarları toplama karışmaz —
                                  ölçüler bilgi amaçlıdır.
                                </div>
                              </div>
                            )}
                            {s.kalemler.length > 0 && (
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                  Perde Kalemleri (Ölçü)
                                </div>
                                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                                  <Tablo sutunlar={kalemSutunlari} satirlar={s.kalemler} satirAnahtari={(k) => k.id} />
                                </div>
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                Tahsilat Geçmişi
                              </div>
                              {s.tahsilatlar.length > 0 ? (
                                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                                  <Tablo sutunlar={tahsilatSutunlari} satirlar={s.tahsilatlar} satirAnahtari={(t) => t.id} />
                                </div>
                              ) : (
                                <div style={{ color: 'var(--text2)', fontSize: 14, padding: '4px 0' }}>
                                  Bu satış için henüz tahsilat girilmemiş.
                                </div>
                              )}
                            </div>
                            {isSahip && (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Buton
                                  ikon="ph-pencil-simple"
                                  onClick={() => git({ tur: 'satisDuzenle', satisId: s.satis.id })}
                                >
                                  Düzenle
                                </Buton>
                                <Buton
                                  tur="tehlike"
                                  ikon="ph-trash"
                                  onClick={() => satisSilOnayla(s.satis.id, s.satis.aciklama || 'Satış')}
                                >
                                  Satışı Sil
                                </Buton>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
