import { useState } from 'react'
import { Buton } from './Buton'
import { HataBaneri } from './HataBaneri'
import { Modal } from './Modal'
import { useToast } from './Toast'
import { gecenGunSayisi, tarihFormatla } from '../lib/bicim'

interface YedekHatirlatmaModalProps {
  /** ISO tarih — son harici (USB) yedek; hiç alınmadıysa null. */
  sonHariciYedek: string | null
  onKapat: () => void
}

/**
 * Açılışta bir kez çıkan yedek hatırlatma penceresi (Şartname 4.4).
 * Kontrol Paneli'ndeki sarı şeritle AYNI `yedekAl`/`yedekDurumu` ucunu
 * kullanır; sadece son harici yedek 7+ gün önceyse (veya hiç yoksa) gösterilir.
 */
export function YedekHatirlatmaModal({ sonHariciYedek, onKapat }: YedekHatirlatmaModalProps) {
  const toast = useToast()
  const [aliniyor, setAliniyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  const gunMetni = sonHariciYedek
    ? `Son USB yedeğiniz ${gecenGunSayisi(sonHariciYedek)} gün önce (${tarihFormatla(sonHariciYedek)}) alındı.`
    : 'Henüz hiç USB (harici) yedek almadınız.'

  function yedekAl() {
    setHata(null)
    setAliniyor(true)
    window.api.yedekAl().then((sonuc) => {
      setAliniyor(false)
      if (!sonuc.basarili) {
        setHata(sonuc.hata)
        return
      }
      if (sonuc.veri.iptal) return // klasör seçimi iptal edildi — pencere açık kalsın
      toast.goster(`Yedek alındı: ${tarihFormatla(sonuc.veri.tarih ?? null)}`)
      onKapat()
    })
  }

  return (
    <Modal genislikPx={460} kapat={aliniyor ? undefined : onKapat}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <i className="ph ph-warning-circle" style={{ fontSize: 32, color: 'var(--warning)', flex: 'none' }} aria-hidden="true" />
        <h3 style={{ fontSize: 21 }}>Yedek almanız önerilir</h3>
      </div>
      <p style={{ marginTop: 12, color: 'var(--text2)', fontSize: 16, lineHeight: 1.5 }}>
        {gunMetni} Verilerinizin kaybolmaması için USB belleğe yedek almanız önerilir.
      </p>
      {hata && (
        <div style={{ marginTop: 12 }}>
          <HataBaneri mesaj={hata} />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
        <Buton onClick={onKapat} disabled={aliniyor}>
          Şimdi Değil
        </Buton>
        <Buton tur="birincil" disabled={aliniyor} onClick={yedekAl} style={{ background: 'var(--warning)', whiteSpace: 'nowrap' }}>
          {aliniyor ? 'Yedek alınıyor…' : "USB'ye Yedek Al"}
        </Buton>
      </div>
    </Modal>
  )
}
