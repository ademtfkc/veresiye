/**
 * Faz 5 kanıt testi — frontend-gelistirici (Raporlar & Yazdırma).
 *
 * Gerçek rapor IPC handler fonksiyonlarını (src/main/ipc/raporIpc.ts —
 * ipcMain.handle'a kayıtlı olanlarla BİREBİR aynı kod) ve dosya yazma
 * katmanını (src/main/disaAktarma.ts) geçici bir SQLite dosyası + `.tmp/`
 * altına yazılan gerçek CSV/Excel dosyalarıyla uçtan uca doğrular.
 *
 * `csvDosyasiKaydet`/`xlsxDosyasiKaydet` (üst seviye, `dialog.showSaveDialog`
 * açan) buradan ÇAĞRILMAZ — native "Farklı Kaydet" penceresi otomatik testte
 * insan etkileşimi olmadan açılamaz. Bunun yerine alt seviye
 * `csvIcerigiYaz`/`xlsxIcerigiYaz` (VERİLEN bir yola yazan, dialog'suz)
 * doğrudan çağrılır — IPC katmanının kullandığı GERÇEK yazma kodu budur,
 * sadece dosya SEÇME adımı atlanır (bkz. src/main/disaAktarma.ts başlığı).
 *
 * Neden esbuild+electron ile? bkz. scripts/db-test.ts başlığındaki aynı not.
 * `npm run rapor:test` ile çalıştırılır.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { baglantiAyarla, baglantiOlustur } from '../src/main/db/connection'
import { csvIcerigiYaz, xlsxIcerigiYaz } from '../src/main/disaAktarma'
import { authGirisYapIsle, authIlkSahipOlusturIsle } from '../src/main/ipc/authIpc'
import { musteriEkleIsle } from '../src/main/ipc/musteriIpc'
import { raporAcikBakiyeIsle, raporEkstreIsle, raporGecikenIsle, raporKasaIsle } from '../src/main/ipc/raporIpc'
import { satisDevirEkleIsle, satisEkleIsle } from '../src/main/ipc/satisIpc'
import { tahsilatEkleIsle } from '../src/main/ipc/tahsilatIpc'
import type { IpcSonuc } from '../src/main/ipc/guvenliCagri'
import { csvOlustur, raporDosyaAdi, type DisaAktarTablo } from '../src/renderer/lib/disaAktar'

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

function kurus(tl: number): number {
  return Math.round(tl * 100)
}

function veriYoksaPatlat<T>(sonuc: IpcSonuc<T>, aciklama: string): T {
  if (!sonuc.basarili) {
    throw new Error(`Kurulum adımı başarısız olmamalıydı — "${aciklama}": ${sonuc.hata}`)
  }
  return sonuc.veri
}

/**
 * Geciken Hesaplar Raporu GERÇEK sistem saatine göre hesaplanır (Şartname
 * 6.3 — "bugün"e göre, `raporService.geciken()`'de parametrik bir "bugün"
 * YOK, backend-test.ts'teki gecikmeService testlerinden farklı olarak).
 * Bu yüzden burada sabit takvim tarihleri DEĞİL, GERÇEK "şimdi"den N gün
 * öncesini hesaplayan bir yardımcı kullanılıyor — test hangi gün çalışırsa
 * çalışsın deterministik kalsın diye (UTC gün sınırı, gecikmeService ile
 * birebir aynı yöntem).
 */
function gunOnce(gunSayisi: number): string {
  const suAn = new Date()
  const ms = Date.UTC(suAn.getUTCFullYear(), suAn.getUTCMonth(), suAn.getUTCDate() - gunSayisi)
  return new Date(ms).toISOString().slice(0, 10)
}

const tempDir = mkdtempSync(join(tmpdir(), 'veresiye-rapor-test-'))
const dbPath = join(tempDir, 'test.db')
const tmpDosyaKlasoru = join(process.cwd(), '.tmp')
if (!existsSync(tmpDosyaKlasoru)) mkdirSync(tmpDosyaKlasoru, { recursive: true })

console.log('[rapor-test] Faz 5 kanıt testi başlıyor…')
console.log(`[rapor-test] geçici veritabanı: ${dbPath}`)

// esbuild bu dosyayı CJS'e derliyor (bkz. package.json "rapor:test") — CJS
// üst seviye `await` desteklemez, bu yüzden gövde bir async IIFE'ye alındı.
void (async () => {
try {
  const baglanti = baglantiOlustur(dbPath)
  baglantiAyarla(baglanti)

  veriYoksaPatlat(authIlkSahipOlusturIsle('ornek.kullanici', 'GucluSifre123'), 'ilkSahipOlustur')
  veriYoksaPatlat(authGirisYapIsle('ornek.kullanici', 'GucluSifre123'), 'girisYap (sahip)')

  // =====================================================================
  // Senaryo — 3 müşteri. TÜM tarihler GERÇEK "bugün"e göre GÖRECELİ (gunOnce)
  // — Geciken Raporu gerçek sistem saatini kullandığı için (yukarı bkz.),
  // tarihler hangi gün çalıştırılırsa çalıştırılsın hep aynı ilişkiyi korur:
  //   S1(90g önce) < S2(20g önce) < T1(10g önce) < T2(5g önce) < T3(3g önce)
  // =====================================================================

  // --- M1: Ayşe Demir — 2 açık satış, YAKIN zamanda ödemeler (geciken DEĞİL) ---
  const m1 = veriYoksaPatlat(musteriEkleIsle({ ad_soyad: 'Ayşe Demir', telefon: '0532 111 11 11' }), 'musteriEkle M1')
  const s1 = veriYoksaPatlat(
    satisEkleIsle({
      musteri_id: m1.id,
      tarih: gunOnce(90),
      kalemler: [{ oda: 'Salon', model_kumas: 'Blackout', en: 200, boy: 200, adet: 1, satir_tutari: kurus(1000) }]
    }),
    'satisEkle S1'
  )
  veriYoksaPatlat(tahsilatEkleIsle({ satis_id: s1.satis.id, tarih: gunOnce(10), tutar: kurus(400), odeme_sekli: 'nakit' }), 'T1')
  veriYoksaPatlat(tahsilatEkleIsle({ satis_id: s1.satis.id, tarih: gunOnce(5), tutar: kurus(300), odeme_sekli: 'kart' }), 'T2')
  const s2 = veriYoksaPatlat(
    satisDevirEkleIsle({ musteri_id: m1.id, tarih: gunOnce(20), devir_tutari: kurus(500) }),
    'satisDevirEkle S2'
  )
  veriYoksaPatlat(tahsilatEkleIsle({ satis_id: s2.satis.id, tarih: gunOnce(3), tutar: kurus(200), odeme_sekli: 'havale' }), 'T3')

  // --- M2: Mehmet Kara — tek satış, HİÇ ödeme yok, 44 gün önce → GECİKEN ---
  const m2 = veriYoksaPatlat(musteriEkleIsle({ ad_soyad: 'Mehmet Kara', telefon: '0533 222 22 22' }), 'musteriEkle M2')
  veriYoksaPatlat(
    satisEkleIsle({
      musteri_id: m2.id,
      tarih: gunOnce(44),
      kalemler: [{ en: 100, boy: 100, adet: 1, satir_tutari: kurus(1000) }]
    }),
    'satisEkle S3 (M2)'
  )

  // --- M3: Zeynep Aydın — tam ödenmiş, ESKİ satış → Açık Bakiye raporunda GÖRÜNMEMELİ ---
  const m3 = veriYoksaPatlat(musteriEkleIsle({ ad_soyad: 'Zeynep Aydın' }), 'musteriEkle M3')
  const s4 = veriYoksaPatlat(
    satisEkleIsle({ musteri_id: m3.id, tarih: gunOnce(90), kalemler: [{ en: 50, boy: 50, adet: 1, satir_tutari: kurus(500) }] }),
    'satisEkle S4 (M3)'
  )
  veriYoksaPatlat(tahsilatEkleIsle({ satis_id: s4.satis.id, tarih: gunOnce(80), tutar: kurus(500), odeme_sekli: 'nakit' }), 'T4 (M3, tam ödeme)')

  // =====================================================================
  // 1) Açık Bakiye Raporu (Şartname 9.1)
  // =====================================================================
  const acikTum = veriYoksaPatlat(raporAcikBakiyeIsle(undefined, undefined), 'raporAcikBakiye (tüm zamanlar)')
  const m1SatiriTum = acikTum.satirlar.find((s) => s.musteri_id === m1.id)
  const m2SatiriTum = acikTum.satirlar.find((s) => s.musteri_id === m2.id)
  const m3SatiriTum = acikTum.satirlar.find((s) => s.musteri_id === m3.id)
  dogruMu('Açık Bakiye: M1 listede (kalan>0)', m1SatiriTum !== undefined)
  esitMi('Açık Bakiye: M1 toplam (1.500,00₺)', kurus(1500), m1SatiriTum?.toplam)
  esitMi('Açık Bakiye: M1 ödenen (900,00₺)', kurus(900), m1SatiriTum?.odenen)
  esitMi('Açık Bakiye: M1 kalan (600,00₺)', kurus(600), m1SatiriTum?.kalan)
  dogruMu('Açık Bakiye: M2 listede (hiç ödenmemiş, kalan>0)', m2SatiriTum !== undefined)
  dogruMu('Açık Bakiye: M3 listede DEĞİL (tam ödendi, kalan=0)', m3SatiriTum === undefined)
  dogruMu(
    'Açık Bakiye: büyükten küçüğe sıralı',
    acikTum.satirlar.every((s, i) => i === 0 || acikTum.satirlar[i - 1].kalan >= s.kalan)
  )
  esitMi(
    'Açık Bakiye: genelToplam.kalan = tüm satırların toplamı',
    acikTum.satirlar.reduce((t, s) => t + s.kalan, 0),
    acikTum.genelToplam.kalan
  )

  // Satış tarihi aralığı filtresi: [90g,10g] arası dışlanır, S2'nin (20g önce) etrafında dar bir pencere → M1'in sadece S2'si dahil.
  const acikDarPencere = veriYoksaPatlat(raporAcikBakiyeIsle(gunOnce(30), gunOnce(10)), 'raporAcikBakiye (dar pencere, sadece S2)')
  const m1SatiriDarPencere = acikDarPencere.satirlar.find((s) => s.musteri_id === m1.id)
  dogruMu('Açık Bakiye (dar pencere): M1 hâlâ listede (S2 pencere içinde)', m1SatiriDarPencere !== undefined)
  esitMi('Açık Bakiye (dar pencere): M1 toplam SADECE S2 (500,00₺)', kurus(500), m1SatiriDarPencere?.toplam)
  esitMi('Açık Bakiye (dar pencere): M1 ödenen SADECE S2 (200,00₺)', kurus(200), m1SatiriDarPencere?.odenen)
  esitMi('Açık Bakiye (dar pencere): M1 kalan SADECE S2 (300,00₺)', kurus(300), m1SatiriDarPencere?.kalan)
  dogruMu(
    'Açık Bakiye (dar pencere): M2 listede DEĞİL (S3 satışı 44 gün önce, pencere dışında)',
    !acikDarPencere.satirlar.some((s) => s.musteri_id === m2.id)
  )

  const acikHataliAralik = raporAcikBakiyeIsle(gunOnce(-30), gunOnce(30))
  dogruMu('Açık Bakiye: başlangıç > bitiş REDDEDİLİYOR (sade Türkçe hata)', acikHataliAralik.basarili === false)

  // =====================================================================
  // 2) Kasa (Tahsilat) Raporu (Şartname 9.2)
  // =====================================================================
  const kasaSonGunler = veriYoksaPatlat(raporKasaIsle(gunOnce(15), gunOnce(0)), 'raporKasa (son 15 gün)')
  esitMi('Kasa (son 15 gün): hareket sayısı (T1,T2,T3)', 3, kasaSonGunler.hareketler.length)
  esitMi('Kasa (son 15 gün): genel toplam (900,00₺)', kurus(900), kasaSonGunler.genelToplam)
  const kirilimToplami = kasaSonGunler.kirilim.reduce((t, k) => t + k.toplam, 0)
  esitMi('Kasa (son 15 gün): kırılım toplamı genel toplama EŞİT', kasaSonGunler.genelToplam, kirilimToplami)
  esitMi('Kasa (son 15 gün): nakit kırılımı (400,00₺)', kurus(400), kasaSonGunler.kirilim.find((k) => k.odeme_sekli === 'nakit')?.toplam)
  esitMi('Kasa (son 15 gün): kart kırılımı (300,00₺)', kurus(300), kasaSonGunler.kirilim.find((k) => k.odeme_sekli === 'kart')?.toplam)
  esitMi('Kasa (son 15 gün): havale kırılımı (200,00₺)', kurus(200), kasaSonGunler.kirilim.find((k) => k.odeme_sekli === 'havale')?.toplam)
  dogruMu(
    'Kasa (son 15 gün): en eski önce sıralı',
    kasaSonGunler.hareketler.every((h, i) => i === 0 || kasaSonGunler.hareketler[i - 1].tarih <= h.tarih)
  )

  const kasaEskiPencere = veriYoksaPatlat(raporKasaIsle(gunOnce(85), gunOnce(75)), 'raporKasa (85-75 gün önce — sadece M3 tahsilatı)')
  esitMi('Kasa (85-75 gün önce): sadece M3 tahsilatı (T4)', 1, kasaEskiPencere.hareketler.length)

  const kasaZorunluTarihEksik = raporKasaIsle(undefined as unknown as string, undefined as unknown as string)
  dogruMu('Kasa: tarih aralığı ZORUNLU, boş bırakılınca REDDEDİLİYOR', kasaZorunluTarihEksik.basarili === false)

  // =====================================================================
  // 3) Geciken Hesaplar Raporu (Şartname 9.3) — gecikmeService mantığı DEĞİŞMEDİ.
  // =====================================================================
  const gecikenTum = veriYoksaPatlat(raporGecikenIsle(undefined, undefined), 'raporGeciken (tüm zamanlar)')
  const m2GecikenSatir = gecikenTum.satirlar.find((s) => s.musteri_id === m2.id)
  dogruMu('Geciken: M2 listede (44 gün, hiç ödeme yok)', m2GecikenSatir !== undefined)
  esitMi('Geciken: M2 kaç gün geçti (44)', 44, m2GecikenSatir?.kac_gun_gecti)
  dogruMu('Geciken: M1 listede DEĞİL (son ödemeler 30 günden yakın)', !gecikenTum.satirlar.some((s) => s.musteri_id === m1.id))

  const gecikenDaraltilmisDisinda = veriYoksaPatlat(raporGecikenIsle(undefined, gunOnce(50)), 'raporGeciken (bitis 50 gün önce, M2 dışarıda kalmalı)')
  dogruMu(
    'Geciken (bitiş 50 gün önce): M2 listeden DIŞARIDA (referans tarihi 44 gün önce, aralık dışı)',
    !gecikenDaraltilmisDisinda.satirlar.some((s) => s.musteri_id === m2.id)
  )
  const gecikenDaraltilmisIcinde = veriYoksaPatlat(raporGecikenIsle(gunOnce(44), undefined), 'raporGeciken (baslangic 44 gün önce, M2 içeride kalmalı)')
  dogruMu(
    'Geciken (başlangıç 44 gün önce): M2 listede (referans tarihi tam sınırda, dahil)',
    gecikenDaraltilmisIcinde.satirlar.some((s) => s.musteri_id === m2.id)
  )

  // =====================================================================
  // 4) Müşteri Ekstresi (Şartname 9.4) — yürüyen bakiye elle doğrulanıyor.
  // =====================================================================
  const ekstreTum = veriYoksaPatlat(raporEkstreIsle(m1.id, undefined, undefined), 'raporEkstre M1 (tüm geçmiş)')
  esitMi('Ekstre M1: hareket sayısı (S1,S2,T1,T2,T3)', 5, ekstreTum.hareketler.length)
  esitMi('Ekstre M1: devredenBakiye 0 (tarih filtresi yok)', 0, ekstreTum.devredenBakiye)
  esitMi('Ekstre M1: 1. hareket S1 borç (1.000,00₺)', kurus(1000), ekstreTum.hareketler[0]?.borc)
  esitMi('Ekstre M1: 1. hareket sonrası yürüyen bakiye (1.000,00₺)', kurus(1000), ekstreTum.hareketler[0]?.yuruyenBakiye)
  esitMi('Ekstre M1: 2. hareket S2 (devir) borç (500,00₺)', kurus(500), ekstreTum.hareketler[1]?.borc)
  esitMi('Ekstre M1: 2. hareket sonrası yürüyen bakiye (1.500,00₺)', kurus(1500), ekstreTum.hareketler[1]?.yuruyenBakiye)
  esitMi('Ekstre M1: 3. hareket T1 alacak (400,00₺)', kurus(400), ekstreTum.hareketler[2]?.alacak)
  esitMi('Ekstre M1: 3. hareket sonrası yürüyen bakiye (1.100,00₺)', kurus(1100), ekstreTum.hareketler[2]?.yuruyenBakiye)
  esitMi('Ekstre M1: 4. hareket sonrası yürüyen bakiye (800,00₺)', kurus(800), ekstreTum.hareketler[3]?.yuruyenBakiye)
  esitMi('Ekstre M1: 5. (son) hareket sonrası yürüyen bakiye (600,00₺)', kurus(600), ekstreTum.hareketler[4]?.yuruyenBakiye)
  esitMi('Ekstre M1: güncelBakiye = son hareketin yürüyen bakiyesi (600,00₺)', ekstreTum.hareketler[4]?.yuruyenBakiye, ekstreTum.guncelBakiye)
  esitMi('Ekstre M1: güncelBakiye = Açık Bakiye raporundaki kalan (çapraz kontrol)', m1SatiriTum?.kalan, ekstreTum.guncelBakiye)

  const ekstreBaslangicli = veriYoksaPatlat(raporEkstreIsle(m1.id, gunOnce(20), undefined), 'raporEkstre M1 (S2 tarihinden itibaren)')
  esitMi('Ekstre M1 (S2 tarihi+): devredenBakiye = S1 sonrası bakiye (1.000,00₺)', kurus(1000), ekstreBaslangicli.devredenBakiye)
  esitMi('Ekstre M1 (S2 tarihi+): görünen hareket sayısı (S2,T1,T2,T3)', 4, ekstreBaslangicli.hareketler.length)
  esitMi(
    'Ekstre M1 (S2 tarihi+): son hareketin yürüyen bakiyesi hâlâ TAM GEÇMİŞTEN (600,00₺)',
    kurus(600),
    ekstreBaslangicli.hareketler[ekstreBaslangicli.hareketler.length - 1]?.yuruyenBakiye
  )

  const ekstreAralikli = veriYoksaPatlat(raporEkstreIsle(m1.id, gunOnce(10), gunOnce(5)), 'raporEkstre M1 (T1–T2 aralığı)')
  esitMi('Ekstre M1 (T1–T2 aralığı): sadece T1,T2 görünüyor', 2, ekstreAralikli.hareketler.length)
  esitMi('Ekstre M1 (T1–T2 aralığı): devredenBakiye = S1+S2 sonrası (1.500,00₺)', kurus(1500), ekstreAralikli.devredenBakiye)

  const ekstreYokMusteri = raporEkstreIsle(999999, undefined, undefined)
  dogruMu('Ekstre: olmayan müşteri REDDEDİLİYOR ("Müşteri bulunamadı.")', ekstreYokMusteri.basarili === false)

  // =====================================================================
  // 5) CSV/Excel dışa aktarma — GERÇEK dosya üretilir, geri okunup doğrulanır.
  //    (dialog.showSaveDialog burada ÇAĞRILMAZ — bkz. dosya başlığı.)
  // =====================================================================
  const csvTablo: DisaAktarTablo = {
    dosyaAdi: raporDosyaAdi('acik-bakiye-raporu'),
    baslik: 'Açık Bakiye Raporu',
    altBilgi: ['Dükkanım', 'Tüm zamanlar'],
    basliklar: ['Müşteri', 'Telefon', 'Toplam', 'Ödenen', 'Kalan Bakiye'],
    satirlar: [
      ['Ayşe Demir', '0532 111 11 11', '1.500,00 ₺', '900,00 ₺', '600,00 ₺'],
      ['Mehmet Kara', '0533 222 22 22', '1.000,00 ₺', '0,00 ₺', '1.000,00 ₺']
    ]
  }
  const csvIcerik = csvOlustur(csvTablo)
  const csvYolu = join(tmpDosyaKlasoru, 'faz5-ornek-acik-bakiye-raporu.csv')
  csvIcerigiYaz(csvYolu, csvIcerik)
  const csvGeriOkunan = readFileSync(csvYolu, 'utf8')
  dogruMu('CSV: dosya gerçekten oluştu', existsSync(csvYolu))
  dogruMu('CSV: UTF-8 BOM ile başlıyor (Türkçe karakterler Excel\'de bozulmasın)', csvGeriOkunan.charCodeAt(0) === 0xfeff)
  dogruMu('CSV: başlık satırı doğru (noktalı virgülle ayrılmış)', csvGeriOkunan.includes('Müşteri;Telefon;Toplam;Ödenen;Kalan Bakiye'))
  dogruMu('CSV: Ayşe Demir satırı doğru', csvGeriOkunan.includes('Ayşe Demir;0532 111 11 11;1.500,00 ₺;900,00 ₺;600,00 ₺'))
  dogruMu('CSV: rapor başlığı satırda var', csvGeriOkunan.includes('Açık Bakiye Raporu'))
  console.log('   (CSV örneği kaydedildi ve okunabildi):', csvYolu)
  console.log('   --- CSV içeriği (ilk 400 karakter) ---')
  console.log('   ' + csvGeriOkunan.slice(0, 400).replace(/\r\n/g, '\n   '))

  const xlsxYolu = join(tmpDosyaKlasoru, 'faz5-ornek-acik-bakiye-raporu.xlsx')
  await xlsxIcerigiYaz(xlsxYolu, {
    sayfaAdi: 'Açık Bakiye Raporu',
    basliklar: csvTablo.basliklar,
    satirlar: csvTablo.satirlar
  })
  dogruMu('Excel: dosya gerçekten oluştu', existsSync(xlsxYolu))
  const okumaKitabi = new ExcelJS.Workbook()
  await okumaKitabi.xlsx.readFile(xlsxYolu)
  const sayfa = okumaKitabi.worksheets[0]
  dogruMu('Excel: sayfa geri okunabildi', sayfa !== undefined)
  esitMi('Excel: başlık satırı 1. hücre ("Müşteri")', 'Müşteri', sayfa?.getRow(1).getCell(1).value)
  esitMi('Excel: başlık satırı KALIN (bold)', true, sayfa?.getRow(1).font?.bold)
  esitMi('Excel: 2. satır 1. hücre ("Ayşe Demir")', 'Ayşe Demir', sayfa?.getRow(2).getCell(1).value)
  esitMi('Excel: 2. satır 5. hücre (kalan bakiye, "600,00 ₺")', '600,00 ₺', sayfa?.getRow(2).getCell(5).value)
  esitMi('Excel: 3. satır 1. hücre ("Mehmet Kara")', 'Mehmet Kara', sayfa?.getRow(3).getCell(1).value)
  console.log('   (Excel örneği kaydedildi ve okunabildi):', xlsxYolu)

  console.log('')
  if (basarisizSayisi > 0) {
    console.error(`[rapor-test] HATA — ${basarisizSayisi} kontrol başarısız oldu.`)
    process.exitCode = 1
  } else {
    console.log('[rapor-test] BAŞARILI — tüm kontroller geçti.')
  }
} catch (hata) {
  console.error('[rapor-test] BEKLENMEYEN HATA:', hata)
  process.exitCode = 1
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
})()
