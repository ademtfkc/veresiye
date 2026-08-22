/**
 * Faz 6 kanıt testi — backend-gelistirici (Yedekleme, Şartname Böl.4 —
 * ZORUNLU, "hayati, atlanamaz"). Bu proje için EN KRİTİK test: veri kaybı
 * felaket demek, bu yüzden her adım GERÇEK dosyalarla kanıtlanıyor.
 *
 * `src/main/services/yedekService.ts`'in ALT SEVİYE fonksiyonlarını (dosya/
 * klasör yolu VERİLEN, `dialog`'a dokunmayan — bkz. o dosyanın başlığı)
 * doğrudan çağırır; `src/main/ipc/musteriIpc.ts`'teki GERÇEK `*Isle`
 * fonksiyonlarıyla veri yazıp okuyarak "geri yüklenen veri gerçekten eski
 * veri mi?" sorusunu somut biçimde kanıtlar. TÜM dosyalar `.tmp/` altındaki
 * geçici bir klasörde üretilir — gerçek `userData/veresiye.db`'ye ASLA
 * dokunulmaz.
 *
 * Neden esbuild+electron ile? bkz. scripts/db-test.ts başlığındaki aynı not.
 * `npm run yedek:test` ile çalıştırılır.
 */
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { baglantiAyarla, baglantiOlustur, getDb } from '../src/main/db/connection'
import { ayarRepo } from '../src/main/db/repositories'
import { authGirisYapIsle, authIlkSahipOlusturIsle } from '../src/main/ipc/authIpc'
import type { IpcSonuc } from '../src/main/ipc/guvenliCagri'
import { musteriEkleIsle, musteriListeleIsle, musteriSilIsle } from '../src/main/ipc/musteriIpc'
import { siradakiGecelikYedekZamani, yedekService } from '../src/main/services/yedekService'

let basarisizSayisi = 0

function esitMi(aciklama: string, beklenen: unknown, gercek: unknown): void {
  const gecti = beklenen === gercek
  console.log(`${gecti ? '✅' : '❌'} ${aciklama} — beklenen: ${beklenen}, gerçek: ${gercek}`)
  if (!gecti) basarisizSayisi++
}

function dogruMu(aciklama: string, kosul: boolean): void {
  console.log(`${kosul ? '✅' : '❌'} ${aciklama}`)
  if (!kosul) basarisizSayisi++
}

/** IpcSonuc<T> içindeki veriyi çıkarır — başarısız olursa testi hemen durdurur (kurulum adımları için). */
function veriYoksaPatlat<T>(sonuc: IpcSonuc<T>, aciklama: string): T {
  if (!sonuc.basarili) {
    throw new Error(`Kurulum adımı başarısız olmamalıydı — "${aciklama}": ${sonuc.hata}`)
  }
  return sonuc.veri
}

/** UTC gece yarısına göre "bugün"den N gün önceki tarihi ISO (YYYY-AA-GG) döner. */
function gunOnce(bugun: Date, gunSayisi: number): string {
  const ms = Date.UTC(bugun.getUTCFullYear(), bugun.getUTCMonth(), bugun.getUTCDate() - gunSayisi)
  return new Date(ms).toISOString().slice(0, 10)
}

// 30 gün / 7 gün eşiklerini belirsiz bir gerçek saatle değil, deterministik
// bir referans tarihle test etmek için SABİT bir "bugün" (backend-test.ts'teki
// aynı desen — bkz. o dosyadaki not).
const BUGUN = new Date('2026-07-16T09:00:00Z')
const isoBugun = BUGUN.toISOString().slice(0, 10)

const tempDir = mkdtempSync(join(tmpdir(), 'veresiye-yedek-test-'))
const dbPath = join(tempDir, 'test.db')
// userData/yedekler'in test karşılığı — otomatik yedekler + 30 gün temizlik + geri-yükleme-öncesi güvenlik yedekleri buraya yazılır.
const yedeklerDir = join(tempDir, 'yedekler')
// Kullanıcının "USB bellek" olarak seçtiği klasörün test karşılığı.
const hariciDir = join(tempDir, 'harici-usb')

console.log('[yedek-test] Faz 6 kanıt testi başlıyor…')
console.log(`[yedek-test] geçici veritabanı: ${dbPath}`)
console.log(`[yedek-test] sabit "bugün": ${BUGUN.toISOString().slice(0, 10)}`)

// esbuild bu dosyayı CJS'e derliyor (bkz. package.json "yedek:test") — CJS
// üst seviye `await` desteklemez, bu yüzden gövde bir async IIFE'ye alındı.
void (async () => {
try {
  let baglanti = baglantiOlustur(dbPath)
  baglantiAyarla(baglanti)

  veriYoksaPatlat(authIlkSahipOlusturIsle('ornek.kullanici', 'GucluSifre123'), 'ilkSahipOlustur')
  veriYoksaPatlat(authGirisYapIsle('ornek.kullanici', 'GucluSifre123'), 'girisYap')

  // =====================================================================
  // 0) HİÇ HARİCİ YEDEK ALINMAMIŞKEN — hatırlatma baştan GEREKLİ olmalı
  //    (Şartname 4.4'ün "hiç alınmadıysa" ucu — bkz. yedekService.ts durum()).
  // =====================================================================
  const baslangicDurumu = yedekService.durum(BUGUN)
  esitMi('Başlangıçta son_otomatik_yedek yok', null, baslangicDurumu.sonOtomatikYedek)
  esitMi('Başlangıçta son_harici_yedek yok', null, baslangicDurumu.sonHariciYedek)
  dogruMu('Hiç harici yedek alınmamışken hatırlatma GEREKLİ', baslangicDurumu.hatirlatmaGerekli === true)

  // =====================================================================
  // 1) OTOMATİK + HARİCİ YEDEK — dosya GERÇEKTEN oluşuyor, içeriği geçerli
  //    SQLite ve veri canlı veritabanıyla AYNI (Şartname 4.1/4.2).
  // =====================================================================
  veriYoksaPatlat(musteriEkleIsle({ ad_soyad: 'Kanıt Müşteri 1', telefon: '0500 000 00 01' }), 'musteriEkle K1')
  veriYoksaPatlat(musteriEkleIsle({ ad_soyad: 'Kanıt Müşteri 2', telefon: '0500 000 00 02' }), 'musteriEkle K2')

  const otomatikSonuc = await yedekService.otomatikYedekCalistir(baglanti, yedeklerDir, BUGUN)
  dogruMu('Otomatik yedek dosyası GERÇEKTEN oluştu', existsSync(otomatikSonuc.yol))
  dogruMu('Otomatik yedek dosya adı bugünün tarihini taşıyor', otomatikSonuc.yol.endsWith('yedek_2026-07-16.db'))

  const otomatikYedekOkuma = new Database(otomatikSonuc.yol, { readonly: true, fileMustExist: true })
  const yedektekiMusteriSayisi = (
    otomatikYedekOkuma.prepare('SELECT COUNT(*) AS adet FROM musteri').get() as { adet: number }
  ).adet
  otomatikYedekOkuma.close()
  esitMi('Otomatik yedekteki müşteri sayısı canlı veritabanıyla AYNI (2)', 2, yedektekiMusteriSayisi)
  esitMi('"son_otomatik_yedek" ayarı bugünün tarihiyle güncellendi', '2026-07-16', ayarRepo.getir('son_otomatik_yedek'))

  const hariciSonuc = await yedekService.hariciYedekAl(baglanti, hariciDir, BUGUN)
  dogruMu('Harici (USB) yedek dosyası GERÇEKTEN oluştu', existsSync(hariciSonuc.yol))
  esitMi('"son_harici_yedek" ayarı bugünün tarihiyle güncellendi', '2026-07-16', ayarRepo.getir('son_harici_yedek'))
  dogruMu('Bugün harici yedek alındıktan SONRA hatırlatma GEREKSİZ', yedekService.durum(BUGUN).hatirlatmaGerekli === false)

  // =====================================================================
  // 2) TEMİZLİK — bilgisayarda EN FAZLA 5 otomatik yedek kalır (CEO kararı
  //    02.08.2026; öncesi "30 günden eskiyi sil"di). Kural tarihe göre DEĞİL,
  //    dosya sayısına göre: en yeni 5 dosya tutulur, fazlası silinir. Böylece
  //    bilgisayar uzun süre kapalı kalsa bile elde HER ZAMAN 5 yedek olur.
  // =====================================================================
  // Bugünden geriye 10 günlük sahte yedek üret (içerik önemsiz — temizlik
  // SADECE dosya adındaki tarihe bakar). Bugünün dosyası ayrıca gerçek yedek
  // olarak da yazılacağı için 1..10 gün öncesini üretiyoruz.
  const sahteGunler = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => gunOnce(BUGUN, g))
  for (const gun of sahteGunler) {
    writeFileSync(join(yedeklerDir, `yedek_${gun}.db`), `sahte-yedek-${gun}`)
  }
  // Temizliğin DOKUNMAMASI gereken iki dosya (kendi desenimiz değil):
  const harietDosya = join(yedeklerDir, `veresiye_yedek_${gunOnce(BUGUN, 9)}.db`)
  const guvenlikDosyasi = join(yedeklerDir, 'geri_yukleme_oncesi_2020-01-01T00-00-00-000Z.db')
  writeFileSync(harietDosya, 'harici-yedek-dokunulmamali')
  writeFileSync(guvenlikDosyasi, 'guvenlik-yedegi-dokunulmamali')

  const temizlikSonucu = await yedekService.otomatikYedekCalistir(baglanti, yedeklerDir, BUGUN)

  const kalanOtomatikler = readdirSync(yedeklerDir)
    .filter((d) => /^yedek_\d{4}-\d{2}-\d{2}\.db$/.test(d))
    .sort()
    .reverse()
  esitMi('Temizlik sonrası bilgisayarda EN FAZLA 5 otomatik yedek kaldı', 5, kalanOtomatikler.length)
  dogruMu(
    'Kalanlar EN YENİ 5 tarih (bugün + son 4 gün)',
    JSON.stringify(kalanOtomatikler) ===
      JSON.stringify([
        `yedek_${isoBugun}.db`,
        `yedek_${gunOnce(BUGUN, 1)}.db`,
        `yedek_${gunOnce(BUGUN, 2)}.db`,
        `yedek_${gunOnce(BUGUN, 3)}.db`,
        `yedek_${gunOnce(BUGUN, 4)}.db`
      ])
  )
  dogruMu(
    'En eski dosya (10 gün önce) SİLİNDİ',
    !existsSync(join(yedeklerDir, `yedek_${gunOnce(BUGUN, 10)}.db`))
  )
  esitMi('Silinen dosya sayısı 6 (10 sahte + bugünkü = 11 → 5 kalır)', 6, temizlikSonucu.silinenler.length)
  dogruMu('Harici (USB) yedek dosyasına DOKUNULMADI', existsSync(harietDosya))
  dogruMu('Geri-yükleme-öncesi güvenlik yedeğine DOKUNULMADI', existsSync(guvenlikDosyasi))

  // Temizlik idempotent: tekrar çalıştırınca yine 5 kalır, silinecek fazlalık yok.
  const ikinciTemizlik = await yedekService.otomatikYedekCalistir(baglanti, yedeklerDir, BUGUN)
  esitMi('Tekrar çalıştırıldığında silinecek fazla yedek YOK', 0, ikinciTemizlik.silinenler.length)
  esitMi(
    'Tekrar çalıştırıldıktan sonra hâlâ 5 otomatik yedek var',
    5,
    readdirSync(yedeklerDir).filter((d) => /^yedek_\d{4}-\d{2}-\d{2}\.db$/.test(d)).length
  )

  // =====================================================================
  // 2.5) GECELİK YEDEK SAATİ (23.55) — zamanlayıcının hangi ana kurulacağını
  //      hesaplayan fonksiyon (main.ts bunu kullanır). CEO kararı 02.08.2026.
  // =====================================================================
  const ogleVakti = new Date('2026-07-16T12:00:00')
  const ogleHedefi = siradakiGecelikYedekZamani(ogleVakti)
  esitMi('Öğlen açılışta: yedek AYNI günün 23.55\'ine kuruluyor (gün)', 16, ogleHedefi.getDate())
  esitMi('… saat 23', 23, ogleHedefi.getHours())
  esitMi('… dakika 55', 55, ogleHedefi.getMinutes())

  const geceYarisi = new Date('2026-07-16T23:58:00')
  const geceHedefi = siradakiGecelikYedekZamani(geceYarisi)
  esitMi('23.58\'de açılışta: yedek ERTESİ güne (17) kuruluyor', 17, geceHedefi.getDate())
  esitMi('… yine 23.55', 55, geceHedefi.getMinutes())

  const tamSaatinde = new Date('2026-07-16T23:55:00')
  esitMi(
    'TAM 23.55\'te: ertesi güne kuruluyor (aynı anda ikinci kez tetiklenmesin)',
    17,
    siradakiGecelikYedekZamani(tamSaatinde).getDate()
  )

  const ayinSonGunu = new Date('2026-07-31T23:59:00')
  const ayGecisi = siradakiGecelikYedekZamani(ayinSonGunu)
  esitMi('Ay sonunda (31 Temmuz 23.59) doğru şekilde 1 Ağustos\'a geçiyor (gün)', 1, ayGecisi.getDate())
  esitMi('… ay Ağustos (0-indeksli 7)', 7, ayGecisi.getMonth())

  // =====================================================================
  // 3) GERİ YÜKLEME — en riskli ve en kritik adım (veri üzerine yazar).
  //    DB'ye veri A yaz → yedek al → veriyi B ile DEĞİŞTİR → yedekten geri
  //    yükle → veri TEKRAR A oldu. Geri-yükleme-öncesi otomatik yedek
  //    oluştu. Bozuk/yanlış dosya REDDEDİLDİ.
  // =====================================================================
  const veriA = veriYoksaPatlat(
    musteriEkleIsle({ ad_soyad: 'Veri A İşareti', telefon: '0500 000 00 0A' }),
    'musteriEkle (Veri A)'
  )
  const aYedekSonucu = await yedekService.hariciYedekAl(baglanti, join(tempDir, 'geri-yukleme-testi'), BUGUN)
  dogruMu('"A" durumunun yedeği alındı', existsSync(aYedekSonucu.yol))

  // Veriyi B ile DEĞİŞTİR: A'yı sil, B'yi ekle — artık canlı veritabanında SADECE B var.
  veriYoksaPatlat(musteriSilIsle(veriA.id), 'musteriSil (A, B ile değiştirmek için)')
  veriYoksaPatlat(musteriEkleIsle({ ad_soyad: 'Veri B İşareti', telefon: '0500 000 00 0B' }), 'musteriEkle (Veri B)')

  const bDurumuListesi = veriYoksaPatlat(musteriListeleIsle(), 'musteriListele (B durumu, geri yüklemeden önce)')
  dogruMu('DEĞİŞİKLİKTEN SONRA: Veri B mevcut', bDurumuListesi.some((m) => m.ad_soyad === 'Veri B İşareti'))
  dogruMu('DEĞİŞİKLİKTEN SONRA: Veri A ARTIK YOK', !bDurumuListesi.some((m) => m.ad_soyad === 'Veri A İşareti'))

  const yedeklerKlasorSayisiOncesi = existsSync(yedeklerDir) ? readdirSync(yedeklerDir).length : 0

  const geriYuklemeSonucu = await yedekService.geriYukle(baglanti, dbPath, yedeklerDir, aYedekSonucu.yol, BUGUN)
  dogruMu(
    'Geri-yükleme-öncesi güvenlik yedeği dosyası GERÇEKTEN oluştu',
    existsSync(geriYuklemeSonucu.geriYuklemeOncesiYedekYolu)
  )
  const yedeklerKlasorSayisiSonrasi = readdirSync(yedeklerDir).length
  dogruMu(
    'Yedekler klasöründe geri-yükleme-öncesi yeni bir dosya belirdi',
    yedeklerKlasorSayisiSonrasi > yedeklerKlasorSayisiOncesi
  )

  // ÖNEMLİ: geriYukle() eski bağlantıyı KAPATTI ve YENİ bir bağlantı açtı
  // (bkz. yedekService.ts). Repo katmanı `getDb()` ile bu YENİ bağlantıyı
  // otomatik kullanır; testin geri kalanı için referansımızı tazeliyoruz.
  baglanti = getDb()

  const geriYuklemeSonrasiListe = veriYoksaPatlat(musteriListeleIsle(), 'musteriListele (geri yükleme SONRASI)')
  dogruMu(
    'GERİ YÜKLEME SONRASI: Veri A GERİ GELDİ (KANIT)',
    geriYuklemeSonrasiListe.some((m) => m.ad_soyad === 'Veri A İşareti')
  )
  dogruMu(
    'GERİ YÜKLEME SONRASI: Veri B ARTIK YOK (üzerine yazıldı)',
    !geriYuklemeSonrasiListe.some((m) => m.ad_soyad === 'Veri B İşareti')
  )
  esitMi('GERİ YÜKLEME SONRASI: müşteri sayısı geri yüklenen "A" anına döndü (3)', 3, geriYuklemeSonrasiListe.length)

  // -- Bozuk dosya reddediliyor (SQLite başlığı geçersiz) -------------------
  const bozukDosyaYolu = join(tempDir, 'bozuk-dosya.db')
  writeFileSync(bozukDosyaYolu, 'Bu dosya bir SQLite veritabanı değil, düz metin.')

  let bozukDosyaReddedildi = false
  try {
    await yedekService.geriYukle(baglanti, dbPath, yedeklerDir, bozukDosyaYolu, BUGUN)
  } catch {
    bozukDosyaReddedildi = true
  }
  dogruMu('Bozuk (geçersiz SQLite başlıklı) dosya REDDEDİLDİ', bozukDosyaReddedildi)

  // -- Geçerli bir SQLite dosyası AMA Veresiye şeması OLMAYAN dosya reddediliyor --
  const yanlisSemaYolu = join(tempDir, 'yanlis-sema.db')
  const yanlisSemaBaglanti = new Database(yanlisSemaYolu)
  yanlisSemaBaglanti.exec('CREATE TABLE rastgele_tablo (id INTEGER PRIMARY KEY)')
  yanlisSemaBaglanti.close()

  const yanlisSemaGecerliligi = yedekService.dosyaGecerliMi(yanlisSemaYolu)
  dogruMu('Geçerli SQLite AMA Veresiye şeması OLMAYAN dosya REDDEDİLİYOR', yanlisSemaGecerliligi.gecerli === false)

  let yanlisSemaReddedildi = false
  try {
    await yedekService.geriYukle(baglanti, dbPath, yedeklerDir, yanlisSemaYolu, BUGUN)
  } catch {
    yanlisSemaReddedildi = true
  }
  dogruMu('Yanlış şemalı dosyayla geri yükleme REDDEDİLDİ', yanlisSemaReddedildi)

  // İki reddedilen denemeden SONRA da veri HÂLÂ "A" olmalı — hiçbir şey bozulmadı.
  const reddSonrasiListe = veriYoksaPatlat(musteriListeleIsle(), 'musteriListele (ret denemeleri sonrası)')
  dogruMu(
    'Reddedilen denemelerden SONRA da veri A hâlâ duruyor (hiçbir şeye dokunulmadı)',
    reddSonrasiListe.some((m) => m.ad_soyad === 'Veri A İşareti')
  )
  esitMi('Reddedilen denemelerden sonra müşteri sayısı DEĞİŞMEDİ (3)', 3, reddSonrasiListe.length)

  // =====================================================================
  // 4) HATIRLATMA — son_harici_yedek 8 gün önce → GEREKLİ; 3 gün önce → DEĞİL
  //    (Şartname 4.4: "son 7 gündür harici yedek alınmamışsa").
  // =====================================================================
  const sekizGunOnce = gunOnce(BUGUN, 8)
  ayarRepo.set('son_harici_yedek', sekizGunOnce)
  dogruMu(`Son harici yedek 8 gün önce (${sekizGunOnce}) → hatırlatma GEREKLİ`, yedekService.durum(BUGUN).hatirlatmaGerekli === true)

  const ucGunOnce = gunOnce(BUGUN, 3)
  ayarRepo.set('son_harici_yedek', ucGunOnce)
  dogruMu(`Son harici yedek 3 gün önce (${ucGunOnce}) → hatırlatma GEREKSİZ`, yedekService.durum(BUGUN).hatirlatmaGerekli === false)

  const yediGunOnce = gunOnce(BUGUN, 7)
  ayarRepo.set('son_harici_yedek', yediGunOnce)
  dogruMu(`Son harici yedek TAM 7 gün önce (${yediGunOnce}) → hatırlatma GEREKSİZ (sınır dahil)`, yedekService.durum(BUGUN).hatirlatmaGerekli === false)

  console.log('')
  if (basarisizSayisi > 0) {
    console.error(`[yedek-test] HATA — ${basarisizSayisi} kontrol başarısız oldu.`)
    process.exitCode = 1
  } else {
    console.log('[yedek-test] BAŞARILI — tüm kontroller geçti.')
  }
} catch (hata) {
  console.error('[yedek-test] BEKLENMEYEN HATA:', hata)
  process.exitCode = 1
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
})()
