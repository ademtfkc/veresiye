import { dialog, ipcMain } from 'electron'
import { dbDosyaYolu, getDb, yedeklerKlasoru } from '../db/connection'
import { DogrulamaHatasi } from '../hatalar'
import { yedekService, type YedekDurumu } from '../services'
import { guvenliCagri, guvenliCagriAsync, type IpcSonuc } from './guvenliCagri'
import { oturumGerekli, sahipGerekli } from './yetki'

/**
 * Yedekleme uçları (Şartname Böl.4 — ZORUNLU). Dosya/dialog işleri SADECE
 * burada (main süreç) — asıl kopyalama/doğrulama mantığı
 * `src/main/services/yedekService.ts`'te (dialog'suz, kanıt testinin
 * doğrudan çağırdığı alt seviye).
 */

/** Sonuç tipleri — bridge.ts/preload.ts ile paylaşılır. */
export interface YedekAlIpcSonucu {
  iptal: boolean
  yol?: string
  tarih?: string
}
export interface YedekGeriYuklemeDosyasiSecIpcSonucu {
  iptal: boolean
  yol?: string
  gecerli?: boolean
  neden?: string
}
export interface YedekGeriYuklemeUygulaIpcSonucu {
  geriYuklemeOncesiYedekYolu: string
}
export interface YedekOtomatikCalistirSonucu {
  yol: string
  silinenler: string[]
}

/**
 * Şartname 4.1 — otomatik yedek + 30 gün temizlik. SADECE `main.ts` tarafından
 * uygulama açılışında DOĞRUDAN (bir TypeScript fonksiyon çağrısı olarak,
 * `ipcMain`/`ipcRenderer` üzerinden DEĞİL) çağrılır — bu yüzden BİLEREK
 * `ipcMain.handle`'a kayıtlı DEĞİL ve `preload.ts`/`window.api`'de YOK: hiçbir
 * ekran/buton bunu tetiklemiyor (tamamen otomatik), gerçek bir çağıranı
 * olmayan bir köprü ucu açmak gereksiz saldırı yüzeyi/ölü kod olurdu. Yetki
 * kontrolü de YOK — daha giriş ekranı açılmadan, hiç oturum yokken çalışması
 * gerekiyor (bkz. `authIlkKurulumGerekliMi` ile aynı "Herkes, oturumsuz da"
 * mantığı).
 */
export async function yedekOtomatikCalistirIsle(): Promise<IpcSonuc<YedekOtomatikCalistirSonucu>> {
  return guvenliCagriAsync('yedek:otomatikCalistir', () =>
    yedekService.otomatikYedekCalistir(getDb(), yedeklerKlasoru())
  )
}

/**
 * 02.08.2026 (CEO isteği) — "Bilgisayara Şimdi Yedek Al": ELLE tetiklenen,
 * klasör SORMAYAN yedek. Gecelik 23.55 yedeği için bilgisayarın açık olması
 * gerekiyor; kullanıcı o saatte müsait olmayabileceği için istediği an aynı
 * yedeği kendisi alabilmeli (ör. çok kayıt girmeden önce).
 *
 * Gecelik/açılış yedeğiyle AYNI fonksiyonu çağırır: aynı klasöre, aynı
 * `yedek_YYYY-AA-GG.db` adıyla yazar (bugünün dosyası varsa üzerine — en
 * güncel hali kalır) ve aynı "en yeni 5 yedek" temizliğini uygular. Böylece
 * elle ve otomatik yedekler tek bir düzende toplanır, ikinci bir kural doğmaz.
 *
 * Yetki: Herkes (`oturumGerekli`) — yedek almak veriyi BOZMAZ, bir çalışan da
 * alabilsin (USB yedeğiyle aynı gerekçe).
 */
export function yedekBilgisayaraAlIsle(): Promise<IpcSonuc<YedekOtomatikCalistirSonucu>> {
  return guvenliCagriAsync('yedek:bilgisayaraAl', async () => {
    oturumGerekli()
    return yedekService.otomatikYedekCalistir(getDb(), yedeklerKlasoru())
  })
}

/**
 * Şartname 4.2 — "Yedek Al" (USB vb. seçilen klasöre). Herkes (Kontrol
 * Paneli'ndeki sarı şerit + Ayarlar'daki buton — dükkan sahibi olmak gerekmez,
 * bir çalışan da fark edip yedek alabilsin).
 */
export function yedekAlIsle(): Promise<IpcSonuc<YedekAlIpcSonucu>> {
  return guvenliCagriAsync('yedek:al', async () => {
    oturumGerekli()
    const sonuc = await dialog.showOpenDialog({
      title: 'Yedek İçin Klasör Seç (USB bellek vb.)',
      properties: ['openDirectory', 'createDirectory']
    })
    if (sonuc.canceled || sonuc.filePaths.length === 0) return { iptal: true }
    const yedek = await yedekService.hariciYedekAl(getDb(), sonuc.filePaths[0])
    return { iptal: false, yol: yedek.yol, tarih: yedek.tarih }
  })
}

/**
 * Şartname 4.3 (1/2) — geri yüklenecek dosyayı seçtirir ve HEMEN doğrular.
 * Doğrulama burada (onay sorulmadan ÖNCE) yapılıyor ki kullanıcı geçersiz bir
 * dosya için boşuna "emin misiniz?" büyük uyarısıyla karşılaşmasın — arayüz
 * geçersizse net nedeni hemen gösterir. SADECE sahip (veri üzerine yazan bir
 * işlemin başlangıcı).
 */
export function yedekGeriYuklemeDosyasiSecIsle(): Promise<IpcSonuc<YedekGeriYuklemeDosyasiSecIpcSonucu>> {
  return guvenliCagriAsync('yedek:geriYuklemeDosyasiSec', async () => {
    sahipGerekli()
    const sonuc = await dialog.showOpenDialog({
      title: 'Geri Yüklenecek Yedek Dosyasını Seç',
      properties: ['openFile'],
      filters: [{ name: 'Veresiye Veritabanı Yedeği', extensions: ['db'] }]
    })
    if (sonuc.canceled || sonuc.filePaths.length === 0) return { iptal: true }
    const yol = sonuc.filePaths[0]
    const gecerlilik = yedekService.dosyaGecerliMi(yol)
    return { iptal: false, yol, gecerli: gecerlilik.gecerli, neden: gecerlilik.neden }
  })
}

/**
 * Şartname 4.3 (2/2) — asıl (geri alınamaz) geri yükleme. Arayüzde BÜYÜK
 * UYARI + onaydan SONRA çağrılır (bkz. Ayarlar.tsx). Seçilen dosya BURADA DA
 * yeniden doğrulanır — seçim ile onay arasında dosya değişmiş/silinmiş
 * olabilir, arayüzün önceki kontrolüne körü körüne güvenilmez. SADECE sahip.
 */
export function yedekGeriYuklemeUygulaIsle(yol: unknown): Promise<IpcSonuc<YedekGeriYuklemeUygulaIpcSonucu>> {
  return guvenliCagriAsync('yedek:geriYuklemeUygula', async () => {
    sahipGerekli()
    if (typeof yol !== 'string' || !yol.trim()) {
      throw new DogrulamaHatasi('Geri yüklenecek dosya seçilmedi.')
    }
    return yedekService.geriYukle(getDb(), dbDosyaYolu(), yedeklerKlasoru(), yol)
  })
}

/** Şartname 4.4 — son yedek tarihleri + hatırlatma gerekli mi. Herkes (Kontrol Paneli şeridi tüm rollerde görünür). */
export function yedekDurumuIsle(): IpcSonuc<YedekDurumu> {
  return guvenliCagri('yedek:durumu', () => {
    oturumGerekli()
    return yedekService.durum()
  })
}

export function yedekIpcKaydet(): void {
  ipcMain.handle('yedek:bilgisayaraAl', () => yedekBilgisayaraAlIsle())
  ipcMain.handle('yedek:al', () => yedekAlIsle())
  ipcMain.handle('yedek:geriYuklemeDosyasiSec', () => yedekGeriYuklemeDosyasiSecIsle())
  ipcMain.handle('yedek:geriYuklemeUygula', (_e, yol) => yedekGeriYuklemeUygulaIsle(yol))
  ipcMain.handle('yedek:durumu', () => yedekDurumuIsle())
}
