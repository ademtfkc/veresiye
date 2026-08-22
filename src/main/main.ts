import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import { closeDb, getDb } from './db/connection'
import { tumIpcUclariniKaydet, yedekOtomatikCalistirIsle } from './ipc'
import { siradakiGecelikYedekZamani } from './services/yedekService'

const isDev = !app.isPackaged

/**
 * Veri/yedek klasörünün adını SABİTLE. Electron bu adı normalde package.json'dan
 * türetir; burada açıkça vererek paketleme aracının ileride farklı bir ad
 * üretme ihtimalini kapatıyoruz. Böylece verinin yeri her kurulumda AYNI ve
 * rehberde yazdığı gibi olur: Windows'ta `%APPDATA%\veresiye`
 * (yedekler: `%APPDATA%\veresiye\yedekler`). `getDb()`'den ÖNCE çağrılmalı —
 * yol ilk kullanımda hesaplanıyor.
 */
app.setName('veresiye')

let gecelikYedekZamanlayici: ReturnType<typeof setTimeout> | null = null

/** Otomatik yedeği çalıştırır; hata KULLANICIYI ASLA KİLİTLEMEZ, sadece loglanır. */
async function otomatikYedekAl(kaynak: string): Promise<void> {
  try {
    const sonuc = await yedekOtomatikCalistirIsle()
    if (sonuc.basarili) {
      const { yol, silinenler } = sonuc.veri
      console.log(
        `[yedek] otomatik yedek alındı (${kaynak}) → ${yol}` +
          (silinenler.length > 0 ? ` (${silinenler.length} fazla yedek temizlendi)` : '')
      )
    } else {
      console.error(`[yedek] otomatik yedek başarısız (${kaynak}):`, sonuc.hata)
    }
  } catch (hata) {
    console.error(`[yedek] otomatik yedek sırasında beklenmeyen hata (${kaynak}):`, hata)
  }
}

/**
 * Şartname 4.1 + CEO kararı 02.08.2026 — HER AKŞAM 23.55'te otomatik yedek.
 * Bir sonraki 23.55'e kalan süre hesaplanıp tek bir zamanlayıcı kurulur; yedek
 * alındıktan sonra kendini ertesi akşam için yeniden kurar (24 saatlik sabit
 * aralık yerine her seferinde saat yeniden hesaplanır — yaz saati değişimi veya
 * bilgisayarın uyku/uyanma gecikmesi zamanı kaydırmasın diye).
 *
 * Bilgisayar 23.55'te KAPALIYSA bu yedek kaçar; o durumu `main`'deki açılış
 * yedeği yakalar (uygulama her açıldığında da yedek alınır). İkisi birlikte
 * "her gün en az bir yedek" garantisi verir.
 */
function gecelikYedegiZamanla(): void {
  const hedef = siradakiGecelikYedekZamani()
  const kalanMs = hedef.getTime() - Date.now()
  console.log(`[yedek] sıradaki gecelik yedek: ${hedef.toLocaleString('tr-TR')}`)

  gecelikYedekZamanlayici = setTimeout(() => {
    void otomatikYedekAl('gecelik 23.55').finally(() => gecelikYedegiZamanla())
  }, kalanMs)
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#F7F5F0',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      // Güvenlik ilkeleri (bkz. dokumanlar/MIMARI.md Böl.5) — tartışılmaz:
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Üretimde (paketlenmiş .exe) Geliştirici Araçları kapalı — derinlemesine
      // savunma. Geliştirmede (macOS) açık kalır. Tüm yetki zaten ana süreçte,
      // ama gereksiz yüzeyi kapatmak iyi pratiktir (Faz 7 güvenlik denetimi notu).
      devTools: isDev
    }
  })

  // Pencere hazır olmadan boş/beyaz ekran göstermemek için içerik çizilene kadar bekle.
  win.once('ready-to-show', () => win.show())

  // Dış bağlantılar sistem tarayıcısında açılsın, uygulama içinde değil.
  win.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Uygulama penceresi yalnızca kendi yerel içeriğinde kalsın; bir bağlantı yanlışlıkla
  // pencereyi dış bir adrese götürmeye çalışırsa engelle ve sistem tarayıcısına yönlendir
  // (derinlemesine savunma — Faz 7 güvenlik denetimi notu).
  win.webContents.on('will-navigate', (olay, url) => {
    const izinliOnEk =
      isDev && process.env.ELECTRON_RENDERER_URL ? process.env.ELECTRON_RENDERER_URL : 'file://'
    if (!url.startsWith(izinliOnEk)) {
      olay.preventDefault()
      void shell.openExternal(url)
    }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  console.log('[main] Electron hazır (ready) — pencere oluşturuluyor…')

  // Veritabanı bağlantısını uygulama açılışında erkenden kur (klasör/dosya
  // yoksa oluşturur, bekleyen migration'ları uygular).
  getDb()

  // Faz 2 — tüm güvenli köprü uçları (musteri/satis/tahsilat/panel/auth)
  // burada TEK seferde kaydedilir (bkz. src/main/ipc/index.ts).
  tumIpcUclariniKaydet()

  // Şartname Böl.4.1 — AÇILIŞ yedeği: HER açılışta, daha giriş ekranı bile
  // açılmadan. Asıl günlük yedek akşam 23.55'te alınır; bu açılış yedeği,
  // bilgisayar gece kapalı olduğu için 23.55'i kaçıran günleri yakalar.
  // Bir yedekleme hatası (ör. disk dolu) KULLANICIYI ASLA KİLİTLEMEMELİ —
  // hata yutulup loglanır, pencere açılışı bundan etkilenmez.
  await otomatikYedekAl('açılış')

  // Program açık kaldığı sürece her akşam 23.55'te tekrar yedek al.
  gecelikYedegiZamanla()

  createWindow()

  app.on('activate', () => {
    // macOS: dock ikonuna tıklanınca, açık pencere yoksa yeniden aç.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDb()
    app.quit()
  }
})

app.on('before-quit', () => {
  // Kapanış sırasında zamanlayıcı tetiklenip kapanmış bir veritabanına
  // yazmaya çalışmasın.
  if (gecelikYedekZamanlayici) clearTimeout(gecelikYedekZamanlayici)
  closeDb()
})
