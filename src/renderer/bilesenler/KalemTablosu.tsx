import { useEffect, useId, useState, type Dispatch, type SetStateAction } from 'react'
import {
  kurusuGirdiMetnineCevir,
  paraGirdisiniKurusaCevir,
  sayiGirdisiniCevir,
  sayiyiGirdiMetnineCevir
} from '../lib/bicim'
import type { PerdeKalemiRow, YeniPerdeKalemi } from '../../main/db/types'

/**
 * PERDE KALEMLERİ TABLOSU (tek kaynak) — hem "Yeni Satış" (Şartname 8.4) hem
 * "Satışı Düzenle" ekranı bu bileşeni kullanır. Daha önce tablo Yeni Satış'ın
 * içine gömülüydü; düzenleme ekranı gelince ikinci bir kopya açmak yerine
 * buraya taşındı — ölçü/tutar davranışı iki ekranda birbirinden kaymasın.
 *
 * Satır tutarı ELLE girilir; en/boy/adet fiyata karışmaz (bilgi amaçlı, Faz 10).
 */

export interface KalemTaslak {
  anahtar: string
  oda: string
  model: string
  en: string
  boy: string
  adet: string
  tutar: string
}

let kalemSayaci = 0
export function bosKalem(): KalemTaslak {
  kalemSayaci += 1
  return { anahtar: `k${kalemSayaci}`, oda: '', model: '', en: '', boy: '', adet: '1', tutar: '' }
}

/** Kayıtlı bir perde kalemini (veritabanı satırı) düzenlenebilir taslağa çevirir. */
export function kalemTaslagaCevir(kalem: PerdeKalemiRow): KalemTaslak {
  kalemSayaci += 1
  return {
    anahtar: `k${kalemSayaci}`,
    oda: kalem.oda ?? '',
    model: kalem.model_kumas ?? '',
    en: sayiyiGirdiMetnineCevir(kalem.en),
    boy: sayiyiGirdiMetnineCevir(kalem.boy),
    adet: String(kalem.adet),
    tutar: kurusuGirdiMetnineCevir(kalem.satir_tutari)
  }
}

/** Bir taslağın kuruş cinsinden satır tutarı. */
export function kalemTutariKurus(k: KalemTaslak): number {
  return paraGirdisiniKurusaCevir(k.tutar)
}

/** Taslak listesini backend'in beklediği kalem dizisine çevirir (tutarı 0 olanlar atılır). */
/**
 * Bir satırın "dolu" sayılıp sayılmayacağı. 02.08.2026'dan önce ölçüt sadece
 * "tutarı 0'dan büyük mü" idi; artık toptan fiyat verilebildiği için tutarı 0
 * ama ölçüsü/odası girilmiş satırlar da KAYDEDİLİR (ölçüler kayda geçsin diye).
 * Tamamen boş satırlar (kullanıcının doldurmadığı fazlalık satırlar) elenir —
 * "adet" tek başına doluluk sayılmaz, çünkü varsayılanı "1".
 */
export function kalemDoluMu(k: KalemTaslak): boolean {
  return (
    kalemTutariKurus(k) > 0 ||
    k.oda.trim() !== '' ||
    k.model.trim() !== '' ||
    k.en.trim() !== '' ||
    k.boy.trim() !== ''
  )
}

export function kalemleriGirdiyeCevir(kalemler: KalemTaslak[]): Array<Omit<YeniPerdeKalemi, 'satis_id'>> {
  return kalemler
    .filter(kalemDoluMu)
    .map((k) => ({
      oda: k.oda.trim() || undefined,
      model_kumas: k.model.trim() || undefined,
      en: k.en.trim() ? sayiGirdisiniCevir(k.en) : null,
      boy: k.boy.trim() ? sayiGirdisiniCevir(k.boy) : null,
      adet: Math.round(sayiGirdisiniCevir(k.adet)) || 1,
      satir_tutari: kalemTutariKurus(k)
    }))
}

interface KalemTablosuProps {
  kalemler: KalemTaslak[]
  setKalemler: Dispatch<SetStateAction<KalemTaslak[]>>
  etiket?: string
}

export function KalemTablosu({ kalemler, setKalemler, etiket = 'Perde Kalemleri' }: KalemTablosuProps) {
  // OTOMATİK ÖNERİ (02.08.2026 — CEO isteği): daha önce yazılmış oda ve
  // model/kumaş adları kutuların altında öneri olarak çıkar ("mu" → Mutfak).
  // Tarayıcının KENDİ <datalist> özelliği kullanılıyor — ek kütüphane, ek
  // klavye/odak kodu yok; yazmaya devam edip listede olmayan yeni bir değer
  // girmek de serbest. Öneriler ekran açılırken bir kez yüklenir.
  const odaListeId = useId()
  const modelListeId = useId()
  const [odaOnerileri, setOdaOnerileri] = useState<string[]>([])
  const [modelOnerileri, setModelOnerileri] = useState<string[]>([])

  useEffect(() => {
    let iptalEdildi = false
    window.api.satisOneriler().then((sonuc) => {
      if (iptalEdildi || !sonuc.basarili) return // öneri gelmezse kutular normal metin kutusu gibi çalışır
      setOdaOnerileri(sonuc.veri.odalar)
      setModelOnerileri(sonuc.veri.modeller)
    })
    return () => {
      iptalEdildi = true
    }
  }, [])

  function kalemGuncelle(anahtar: string, alan: keyof KalemTaslak, deger: string) {
    setKalemler((liste) => liste.map((k) => (k.anahtar === anahtar ? { ...k, [alan]: deger } : k)))
  }

  function kalemSil(anahtar: string) {
    setKalemler((liste) => (liste.length > 1 ? liste.filter((k) => k.anahtar !== anahtar) : [bosKalem()]))
  }

  return (
    <div>
      {/* Öneri kaynakları — görünmez; yukarıdaki kutular list={...} ile bunlara bağlı. */}
      <datalist id={odaListeId}>
        {odaOnerileri.map((oda) => (
          <option key={oda} value={oda} />
        ))}
      </datalist>
      <datalist id={modelListeId}>
        {modelOnerileri.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>
      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{etiket}</label>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th style={thStil}>Oda</th>
                <th style={thStil}>Model / Kumaş</th>
                <th style={{ ...thStil, textAlign: 'right', width: 80 }}>En cm</th>
                <th style={{ ...thStil, textAlign: 'right', width: 80 }}>Boy cm</th>
                <th style={{ ...thStil, textAlign: 'right', width: 70 }}>Adet</th>
                <th style={{ ...thStil, textAlign: 'right', width: 150 }}>Tutar</th>
                <th style={{ ...thStil, width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {kalemler.map((k) => (
                <tr key={k.anahtar}>
                  <td style={tdStil}>
                    <input
                      value={k.oda}
                      onChange={(e) => kalemGuncelle(k.anahtar, 'oda', e.target.value)}
                      placeholder="Salon"
                      list={odaListeId}
                      autoComplete="off"
                      style={hucreGirdiStil}
                    />
                  </td>
                  <td style={tdStil}>
                    <input
                      value={k.model}
                      onChange={(e) => kalemGuncelle(k.anahtar, 'model', e.target.value)}
                      placeholder="Kadife blackout"
                      list={modelListeId}
                      autoComplete="off"
                      style={hucreGirdiStil}
                    />
                  </td>
                  <td style={tdStil}>
                    <input
                      value={k.en}
                      onChange={(e) => kalemGuncelle(k.anahtar, 'en', e.target.value)}
                      inputMode="decimal"
                      className="mono"
                      style={{ ...hucreGirdiStil, textAlign: 'right' }}
                    />
                  </td>
                  <td style={tdStil}>
                    <input
                      value={k.boy}
                      onChange={(e) => kalemGuncelle(k.anahtar, 'boy', e.target.value)}
                      inputMode="decimal"
                      className="mono"
                      style={{ ...hucreGirdiStil, textAlign: 'right' }}
                    />
                  </td>
                  <td style={tdStil}>
                    <input
                      value={k.adet}
                      onChange={(e) => kalemGuncelle(k.anahtar, 'adet', e.target.value)}
                      inputMode="numeric"
                      className="mono"
                      style={{ ...hucreGirdiStil, textAlign: 'right' }}
                    />
                  </td>
                  <td style={tdStil}>
                    <input
                      value={k.tutar}
                      onChange={(e) => kalemGuncelle(k.anahtar, 'tutar', e.target.value)}
                      inputMode="decimal"
                      className="mono"
                      placeholder="0,00"
                      style={{ ...hucreGirdiStil, textAlign: 'right', fontWeight: 600 }}
                    />
                  </td>
                  <td style={{ ...tdStil, textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => kalemSil(k.anahtar)}
                      aria-label="Bu kalemi sil"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text2)',
                        cursor: 'pointer',
                        fontSize: 18,
                        lineHeight: 1
                      }}
                    >
                      <i className="ph ph-x" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => setKalemler((liste) => [...liste, bosKalem()])}
          style={{
            width: '100%',
            padding: 12,
            background: 'var(--bg)',
            border: 'none',
            borderTop: '1px solid var(--border)',
            color: 'var(--primary)',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <i className="ph ph-plus" style={{ fontSize: 16, marginRight: 6 }} aria-hidden="true" />
          Kalem Ekle
        </button>
      </div>
    </div>
  )
}

const thStil = {
  textAlign: 'left' as const,
  padding: '10px 12px',
  fontSize: 12,
  color: 'var(--text2)',
  borderBottom: '1px solid var(--border)'
}

const tdStil = {
  padding: '6px 8px',
  borderBottom: '1px solid var(--border)'
}

const hucreGirdiStil = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid var(--border)',
  borderRadius: 5,
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 15
}
