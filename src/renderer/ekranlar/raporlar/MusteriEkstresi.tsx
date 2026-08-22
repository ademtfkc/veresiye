import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { BosDurum } from '../../bilesenler/BosDurum'
import { Buton } from '../../bilesenler/Buton'
import { HataBaneri } from '../../bilesenler/HataBaneri'
import { ParaGoster } from '../../bilesenler/ParaGoster'
import { RaporAraclari } from '../../bilesenler/RaporAraclari'
import { RaporBasligi } from '../../bilesenler/RaporBasligi'
import { Yukleniyor } from '../../bilesenler/Yukleniyor'
import { useToast } from '../../bilesenler/Toast'
import { bakiyeRenkDegiskeni } from '../../lib/veri'
import { paraFormatla, tarihFormatla } from '../../lib/bicim'
import { raporDosyaAdi } from '../../lib/disaAktar'
import { csvyeAktar, excelAktar } from '../../lib/disaAktarApi'
import type { NavProps } from '../../lib/navigasyon'
import type { MusteriRow } from '../../../main/db/types'
import type { EkstreRaporu as EkstreRaporuVerisi } from '../../../main/services'

interface Props extends NavProps {
  dukkanAdi: string
  logo: string | null
  baslangicMusteriId?: number
}

/**
 * Müşteri Ekstresi (Şartname 9.4 + 8.3 "Ekstre Yazdır") — tek müşteri için
 * satır satır cari döküm + yürüyen bakiye. Müşteri Kartı'ndaki "Ekstre
 * Yazdır" butonu bu ekrana `musteriId` ile önceden doldurulmuş gelir (bkz.
 * App.tsx/MusteriKarti.tsx) — kullanıcı sadece "Yazdır"a basar.
 */
export function MusteriEkstresi({ dukkanAdi, logo, git, baslangicMusteriId }: Props) {
  const toast = useToast()
  const aramaRef = useRef<HTMLInputElement>(null)

  const [musteri, setMusteri] = useState<MusteriRow | null>(null)
  const [sorgu, setSorgu] = useState('')
  const [sonuclar, setSonuclar] = useState<MusteriRow[]>([])
  const [vurgulanan, setVurgulanan] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')
  const [durum, setDurum] = useState<'bos' | 'yukleniyor' | 'hata' | 'hazir'>('bos')
  const [hata, setHata] = useState('')
  const [veri, setVeri] = useState<EkstreRaporuVerisi | null>(null)
  const [aktarimDevamEdiyor, setAktarimDevamEdiyor] = useState(false)

  // Müşteri Kartı'ndan "Ekstre Yazdır" ile önceden doldurulmuş geldiyse
  // müşteriyi otomatik yükle — kullanıcı arama yapmasın.
  useEffect(() => {
    if (!baslangicMusteriId) return
    window.api.musteriGetir(baslangicMusteriId).then((sonuc) => {
      if (sonuc.basarili) {
        setMusteri(sonuc.veri)
        toast.goster('Ekstre hazır — yazdırmak için "Yazdır" düğmesine basabilirsiniz.')
      } else {
        toast.goster(sonuc.hata)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baslangicMusteriId])

  const yukle = useCallback(() => {
    if (!musteri) return
    setDurum('yukleniyor')
    window.api.raporEkstre(musteri.id, baslangic || undefined, bitis || undefined).then((sonuc) => {
      if (sonuc.basarili) {
        setVeri(sonuc.veri)
        setDurum('hazir')
      } else {
        setHata(sonuc.hata)
        setDurum('hata')
      }
    })
  }, [musteri, baslangic, bitis])

  useEffect(() => {
    yukle()
  }, [yukle])

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
  }

  function aramaTusYonet(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setVurgulanan((v) => Math.min(v + 1, Math.max(sonuclar.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setVurgulanan((v) => Math.max(v - 1, 0))
    } else if (e.key === 'Enter' && sonuclar.length > 0) {
      e.preventDefault()
      musteriSecildi(sonuclar[vurgulanan] ?? sonuclar[0])
    }
  }

  const altBilgi = musteri
    ? `${musteri.ad_soyad}${musteri.telefon ? ' · ' + musteri.telefon : ''}${
        baslangic || bitis
          ? ` — ${baslangic ? tarihFormatla(baslangic) : 'başlangıç'} – ${bitis ? tarihFormatla(bitis) : 'bugün'}`
          : ' — tüm hesap geçmişi'
      }`
    : undefined

  function tabloOlustur() {
    if (!veri || !musteri) return null
    const satirlar: (string | number)[][] = []
    if (veri.baslangic) {
      satirlar.push(['', 'Devreden Bakiye', '', '', paraFormatla(veri.devredenBakiye)])
    }
    for (const h of veri.hareketler) {
      satirlar.push([
        tarihFormatla(h.tarih),
        h.aciklama,
        h.borc > 0 ? paraFormatla(h.borc) : '',
        h.alacak > 0 ? paraFormatla(h.alacak) : '',
        paraFormatla(h.yuruyenBakiye)
      ])
    }
    return {
      dosyaAdi: raporDosyaAdi(`ekstre-${musteri.ad_soyad.toLocaleLowerCase('tr-TR').replace(/\s+/g, '-')}`),
      baslik: `Cari Hesap Ekstresi — ${musteri.ad_soyad}`,
      altBilgi: [dukkanAdi, altBilgi ?? '', `Güncel Bakiye: ${paraFormatla(veri.guncelBakiye)}`],
      basliklar: ['Tarih', 'Açıklama', 'Borç', 'Alacak', 'Bakiye'],
      satirlar
    }
  }

  async function csvIndir() {
    const tablo = tabloOlustur()
    if (!tablo) return
    setAktarimDevamEdiyor(true)
    const sonuc = await csvyeAktar(tablo)
    setAktarimDevamEdiyor(false)
    if (!sonuc.basarili) toast.goster(sonuc.hata)
    else if (!sonuc.iptal) toast.goster(`CSV dosyası kaydedildi: ${sonuc.yol}`)
  }

  async function excelIndir() {
    const tablo = tabloOlustur()
    if (!tablo) return
    setAktarimDevamEdiyor(true)
    const sonuc = await excelAktar(tablo)
    setAktarimDevamEdiyor(false)
    if (!sonuc.basarili) toast.goster(sonuc.hata)
    else if (!sonuc.iptal) toast.goster(`Excel dosyası kaydedildi: ${sonuc.yol}`)
  }

  return (
    <div className="yazdir-alani">
      <div className="no-print" style={{ marginBottom: 20 }}>
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
              background: 'var(--surface)'
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Müşteri</div>
              <div style={{ fontSize: 19, fontWeight: 600 }}>{musteri.ad_soyad}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Buton onClick={() => git({ tur: 'kart', musteriId: musteri.id })}>Müşteri Kartını Aç</Buton>
              <Buton
                onClick={() => {
                  setMusteri(null)
                  setVeri(null)
                  setDurum('bos')
                  requestAnimationFrame(() => aramaRef.current?.focus())
                }}
              >
                Değiştir
              </Buton>
            </div>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Ekstresi alınacak müşteriyi ara
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
                placeholder="Ad soyad veya telefon ile ara…"
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
          </div>
        )}
      </div>

      {!musteri ? (
        <BosDurum ikon="ph-file-text" mesaj="Ekstre görmek için önce yukarıdan bir müşteri seçin." />
      ) : (
        <>
          <RaporAraclari
            baslangic={baslangic}
            bitis={bitis}
            onBaslangicDegisti={setBaslangic}
            onBitisDegisti={setBitis}
            onTemizle={baslangic || bitis ? () => { setBaslangic(''); setBitis('') } : undefined}
            onCsv={csvIndir}
            onExcel={excelIndir}
            disabled={durum !== 'hazir' || !veri}
            csvExcelDevamEdiyor={aktarimDevamEdiyor}
          />

          <RaporBasligi dukkanAdi={dukkanAdi} logo={logo} raporAdi="Cari Hesap Ekstresi" altBilgi={altBilgi} />

          {durum === 'yukleniyor' && <Yukleniyor mesaj="Ekstre hazırlanıyor…" />}
          {durum === 'hata' && <HataBaneri mesaj={hata} tekrarDene={yukle} />}

          {durum === 'hazir' && veri && (
            <>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Tarih', 'Açıklama', 'Borç', 'Alacak', 'Bakiye'].map((baslik, i) => (
                        <th
                          key={baslik}
                          style={{
                            textAlign: i === 0 || i === 1 ? 'left' : 'right',
                            padding: '11px 16px',
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
                    {veri.baslangic && (
                      <tr style={{ background: 'var(--bg)' }}>
                        <td className="mono" style={{ padding: '0 16px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)', color: 'var(--text2)' }}>
                          —
                        </td>
                        <td style={{ padding: '0 16px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)', fontStyle: 'italic', color: 'var(--text2)' }}>
                          Devreden Bakiye
                        </td>
                        <td style={{ padding: '0 16px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)' }} />
                        <td style={{ padding: '0 16px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)' }} />
                        <td
                          className="mono"
                          style={{
                            padding: '0 16px',
                            height: 'var(--row-h)',
                            borderBottom: '1px solid var(--border)',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: bakiyeRenkDegiskeni(veri.devredenBakiye)
                          }}
                        >
                          {paraFormatla(veri.devredenBakiye)}
                        </td>
                      </tr>
                    )}
                    {veri.hareketler.length === 0 && !veri.baslangic ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 0 }}>
                          <BosDurum ikon="ph-file-text" mesaj="Bu müşterinin henüz hiç satış/tahsilat hareketi yok." />
                        </td>
                      </tr>
                    ) : (
                      veri.hareketler.map((h, i) => (
                        <tr key={i}>
                          <td className="mono" style={{ padding: '0 16px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                            {tarihFormatla(h.tarih)}
                          </td>
                          <td style={{ padding: '0 16px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)' }}>{h.aciklama}</td>
                          <td className="mono" style={{ padding: '0 16px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--danger)' }}>
                            {h.borc > 0 ? paraFormatla(h.borc) : '—'}
                          </td>
                          <td className="mono" style={{ padding: '0 16px', height: 'var(--row-h)', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--success)' }}>
                            {h.alacak > 0 ? paraFormatla(h.alacak) : '—'}
                          </td>
                          <td
                            className="mono"
                            style={{
                              padding: '0 16px',
                              height: 'var(--row-h)',
                              borderBottom: '1px solid var(--border)',
                              textAlign: 'right',
                              fontWeight: 600,
                              color: bakiyeRenkDegiskeni(h.yuruyenBakiye)
                            }}
                          >
                            {paraFormatla(h.yuruyenBakiye)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  padding: '16px 22px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8
                }}
              >
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Güncel Bakiye
                  </div>
                  <ParaGoster kurus={veri.guncelBakiye} boyut="devasa" renk={bakiyeRenkDegiskeni(veri.guncelBakiye)} />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
