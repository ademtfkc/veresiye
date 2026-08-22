/**
 * Faz 2 kanıt testi — backend-gelistirici.
 *
 * Gerçek IPC handler fonksiyonlarını (src/main/ipc/*Isle — ipcMain.handle'a
 * kayıtlı olanlarla BİREBİR aynı kod, ayrı bir "test kopyası" yok), servis
 * katmanını (src/main/services) ve auth/oturum katmanını (src/main/auth),
 * geçici/atılabilir bir SQLite dosyası üzerinde uçtan uca çalıştırır.
 * Gerçek uygulama veritabanına (userData/veresiye.db) dokunmaz.
 *
 * Neden esbuild+electron ile? bkz. scripts/db-test.ts başlığındaki aynı not
 * (uzantısız import + better-sqlite3'ün Electron Node ABI'sine derlenmiş
 * olması). `npm run backend:test` ile çalıştırılır.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baglantiAyarla, baglantiOlustur } from '../src/main/db/connection'
import { kullaniciRepo, musteriRepo, satisRepo, tahsilatRepo } from '../src/main/db/repositories'
import {
  authAktifOturumIsle,
  authCikisYapIsle,
  authGirisYapIsle,
  authIlkKurulumGerekliMiIsle,
  authIlkSahipOlusturIsle,
  authKullaniciOlusturIsle
} from '../src/main/ipc/authIpc'
import { ayarDukkanAdiGuncelleIsle, ayarGetirIsle } from '../src/main/ipc/ayarIpc'
import {
  musteriAraIsle,
  musteriEkleIsle,
  musteriGetirIsle,
  musteriGuncelleIsle,
  musteriListeleBakiyeliIsle,
  musteriListeleIsle,
  musteriSilIsle
} from '../src/main/ipc/musteriIpc'
import { panelOzetIsle } from '../src/main/ipc/panelIpc'
import {
  satisDevirEkleIsle,
  satisEkleIsle,
  satisGetirIsle,
  satisGuncelleIsle,
  satisOnerilerIsle,
  satisSilIsle
} from '../src/main/ipc/satisIpc'
import { tahsilatEkleIsle, tahsilatSilIsle } from '../src/main/ipc/tahsilatIpc'
import type { IpcSonuc } from '../src/main/ipc/guvenliCagri'
import { gecikmeService, panelService } from '../src/main/services'

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

// Gecikme testleri için SABİT bir "bugün" (Şartname 6.3'ün 30 gün eşiğini
// belirsiz bir gerçek saatle değil, deterministik bir referans tarihle test
// etmek için — bkz. görev talimatı "bugünü sabitlemek için parametrik bugün ver").
const BUGUN = new Date('2026-07-15T12:00:00Z')

const tempDir = mkdtempSync(join(tmpdir(), 'veresiye-backend-test-'))
const dbPath = join(tempDir, 'test.db')

console.log('[backend-test] Faz 2 kanıt testi başlıyor…')
console.log(`[backend-test] geçici veritabanı: ${dbPath}`)
console.log(`[backend-test] sabit "bugün": ${BUGUN.toISOString().slice(0, 10)}`)

try {
  const baglanti = baglantiOlustur(dbPath)
  baglantiAyarla(baglanti)

  // =====================================================================
  // 1) Giriş / kurulum — yanlış şifre reddedilir, doğru şifre kabul edilir,
  //    hash düz metin DEĞİLDİR.
  // =====================================================================
  const kurulumGerekliBaslangic = veriYoksaPatlat(authIlkKurulumGerekliMiIsle(), 'ilkKurulumGerekliMi')
  dogruMu('Hiç kullanıcı yokken kurulum gerekli = true', kurulumGerekliBaslangic === true)

  const sahipSonuc = authIlkSahipOlusturIsle('ornek.kullanici', 'GucluSifre123')
  dogruMu('İlk sahip hesabı oluşturuldu', sahipSonuc.basarili === true)
  const sahip = veriYoksaPatlat(sahipSonuc, 'ilkSahipOlustur')
  esitMi('İlk hesabın rolü "sahip"', 'sahip', sahip.rol)

  const hashliDeger = kullaniciRepo.getirByKullaniciAdi('ornek.kullanici')!.sifre_hash
  dogruMu(
    'Şifre hash\'i düz metin DEĞİL (bcrypt biçiminde, "$2" ile başlıyor)',
    hashliDeger.startsWith('$2') && hashliDeger !== 'GucluSifre123'
  )

  const ikinciKurulumSonuc = authIlkSahipOlusturIsle('baska.kullanici', 'DigerSifre123')
  dogruMu('Kurulum tamamlandıktan sonra ikinci "ilk sahip" reddediliyor', ikinciKurulumSonuc.basarili === false)

  const yanlisSifreSonuc = authGirisYapIsle('ornek.kullanici', 'yanlisSifre123')
  dogruMu('Yanlış şifreyle giriş REDDEDİLİYOR', yanlisSifreSonuc.basarili === false)

  const dogruGirisSonuc = authGirisYapIsle('ornek.kullanici', 'GucluSifre123')
  dogruMu('Doğru şifreyle giriş KABUL ediliyor', dogruGirisSonuc.basarili === true)

  const aktifOturumSonuc = veriYoksaPatlat(authAktifOturumIsle(), 'aktifOturum')
  dogruMu('Giriş sonrası aktif oturum sahip olarak görünüyor', aktifOturumSonuc?.rol === 'sahip')

  // =====================================================================
  // 2) Bakiye — çok kalemli satış + kısmi tahsilatlar → Kalan doğru;
  //    tam ödeme → 'kapandi'; fazla ödeme → eksi, ENGELLENMİYOR.
  // =====================================================================
  const musteri = veriYoksaPatlat(
    musteriEkleIsle({ ad_soyad: 'Ahmet Yılmaz', telefon: '0532 111 22 33' }),
    'musteriEkle'
  )
  dogruMu('Müşteri eklendi (id atandı)', musteri.id > 0)

  const satisSonuc = satisEkleIsle({
    musteri_id: musteri.id,
    tarih: '2026-07-01',
    aciklama: 'Salon + yatak odası perdeleri',
    kalemler: [
      { oda: 'Salon', model_kumas: 'Blackout krem', en: 350, boy: 260, adet: 2, satir_tutari: kurus(2500) },
      { oda: 'Yatak Odası', model_kumas: 'Tül desenli', en: 200, boy: 240, adet: 3, satir_tutari: kurus(2400) }
    ]
  })
  dogruMu('Çok kalemli satış işlemi (transaction) başarılı', satisSonuc.basarili === true)
  const satisDetay = veriYoksaPatlat(satisSonuc, 'satisEkle')
  const beklenenToplam = kurus(2500) + kurus(2400) // 4.900,00 ₺
  esitMi('Satış toplamı (2 kalem)', beklenenToplam, satisDetay.bakiye.toplam_tutar)
  esitMi('Perde kalemi sayısı', 2, satisDetay.kalemler.length)

  const kismiTahsilatSonuc = veriYoksaPatlat(
    tahsilatEkleIsle({ satis_id: satisDetay.satis.id, tarih: '2026-07-02', tutar: kurus(2000), odeme_sekli: 'nakit' }),
    'tahsilatEkle (kısmi)'
  )
  esitMi('Kısmi tahsilat sonrası kalan bakiye (2.900,00₺)', beklenenToplam - kurus(2000), kismiTahsilatSonuc.kalanBakiye)
  esitMi('Kısmi tahsilat sonrası durum hâlâ "acik"', 'acik', kismiTahsilatSonuc.durum)

  const tamOdemeSonuc = veriYoksaPatlat(
    tahsilatEkleIsle({
      satis_id: satisDetay.satis.id,
      tarih: '2026-07-05',
      tutar: beklenenToplam - kurus(2000),
      odeme_sekli: 'kart'
    }),
    'tahsilatEkle (tam ödeme)'
  )
  esitMi('Tam ödeme sonrası kalan bakiye 0', 0, tamOdemeSonuc.kalanBakiye)
  esitMi('Tam ödeme sonrası durum otomatik "kapandi"', 'kapandi', tamOdemeSonuc.durum)

  const fazlaOdemeSonuc = veriYoksaPatlat(
    tahsilatEkleIsle({
      satis_id: satisDetay.satis.id,
      tarih: '2026-07-06',
      tutar: kurus(300),
      odeme_sekli: 'nakit',
      not: 'fazla ödeme'
    }),
    'tahsilatEkle (fazla ödeme)'
  )
  esitMi('Fazla ödeme ENGELLENMİYOR, kalan bakiye eksiye düşüyor', -kurus(300), fazlaOdemeSonuc.kalanBakiye)
  esitMi('Fazla ödemede durum "kapandi" kalmaya devam ediyor', 'kapandi', fazlaOdemeSonuc.durum)

  // =====================================================================
  // 2.5) Faz 4 — Ayarlar (dükkan adı) + toplu müşteri bakiye ucu.
  // =====================================================================
  const ayarBaslangicSonuc = veriYoksaPatlat(ayarGetirIsle(), 'ayarGetir (varsayılan)')
  esitMi('Varsayılan dükkan adı "Dükkanım"', 'Dükkanım', ayarBaslangicSonuc.dukkanAdi)

  const ayarGuncelleSonuc = veriYoksaPatlat(
    ayarDukkanAdiGuncelleIsle('Dükkanım Vitrin'),
    'ayarDukkanAdiGuncelle (sahip)'
  )
  esitMi('Dükkan adı güncellendi', 'Dükkanım Vitrin', ayarGuncelleSonuc.dukkanAdi)
  const ayarTekrarSonuc = veriYoksaPatlat(ayarGetirIsle(), 'ayarGetir (güncel)')
  esitMi('ayarGetir güncel değeri döndürüyor', 'Dükkanım Vitrin', ayarTekrarSonuc.dukkanAdi)

  const bakiyeliListe = veriYoksaPatlat(musteriListeleBakiyeliIsle(), 'musteriListeleBakiyeli')
  const bakiyeliSatir = bakiyeliListe.find((m) => m.id === musteri.id)
  dogruMu('Toplu bakiye listesinde müşteri var', bakiyeliSatir !== undefined)
  esitMi(
    'Toplu bakiye ucu (tek SQL), tek tek hesaplanan bakiyeyle birebir eşleşiyor',
    musteriRepo.toplamBakiye(musteri.id),
    bakiyeliSatir?.bakiye
  )

  // =====================================================================
  // 2.7) ELLE SATIŞ TOPLAMI (02.08.2026 — CEO isteği: toptan/indirimli fiyat).
  //      Kalem tutarları 0 olabilir; toplam elle yazılırsa O geçerlidir.
  // =====================================================================
  // (a) Kalemlerin HEPSİ 0, toplam elle yazıldı → toplam = elle yazılan.
  const toptanSatis = veriYoksaPatlat(
    satisEkleIsle({
      musteri_id: musteri.id,
      tarih: '2026-07-20',
      aciklama: 'Toptan fiyat (indirimli)',
      kalemler: [
        { oda: 'Salon', model_kumas: 'Blackout', en: 350, boy: 260, adet: 2, satir_tutari: 0 },
        { oda: 'Mutfak', model_kumas: 'Tül', en: 150, boy: 200, adet: 1, satir_tutari: 0 }
      ],
      elle_toplam: kurus(8500)
    }),
    'satisEkle (elle toplam)'
  )
  esitMi('Elle toplam: satış toplamı elle yazılan rakam', kurus(8500), toptanSatis.bakiye.toplam_tutar)
  esitMi('Elle toplam: ölçüler KAYDEDİLDİ (2 kalem)', 2, toptanSatis.kalemler.length)
  esitMi('Elle toplam: kalem tutarları 0 kalabildi', 0, toptanSatis.kalemler[0].satir_tutari)
  esitMi('Elle toplam: ölçü bilgisi korundu (1. kalem en)', 350, toptanSatis.kalemler[0].en)
  esitMi('Elle toplam: satis.elle_toplam sütununa yazıldı', kurus(8500), toptanSatis.satis.elle_toplam)
  esitMi('Elle toplam: kalan bakiye = elle toplam (hiç tahsilat yok)', kurus(8500), toptanSatis.bakiye.kalan_bakiye)

  // (b) Tahsilat girilince bakiye elle toplama göre düşer.
  const toptanTahsilat = veriYoksaPatlat(
    tahsilatEkleIsle({ satis_id: toptanSatis.satis.id, tarih: '2026-07-21', tutar: kurus(3000), odeme_sekli: 'nakit' }),
    'tahsilatEkle (elle toplamlı satışa)'
  )
  esitMi('Elle toplam: tahsilat sonrası kalan (8.500 − 3.000)', kurus(5500), toptanTahsilat.kalanBakiye)

  // (c) Elle toplam VERİLMEZSE eski davranış: toplam = kalemlerin toplamı.
  const normalSatis = veriYoksaPatlat(
    satisEkleIsle({
      musteri_id: musteri.id,
      tarih: '2026-07-20',
      kalemler: [
        { adet: 1, satir_tutari: kurus(1000) },
        { adet: 1, satir_tutari: kurus(500) }
      ]
    }),
    'satisEkle (elle toplamsız)'
  )
  esitMi('Elle toplam YOK: toplam kalemlerden hesaplandı', kurus(1500), normalSatis.bakiye.toplam_tutar)
  esitMi('Elle toplam YOK: elle_toplam sütunu NULL', null, normalSatis.satis.elle_toplam)

  // (d) Tüm kalemler 0 VE elle toplam da yoksa → REDDEDİLİR (sıfır tutarlı satış).
  dogruMu(
    'Tüm kalemler 0 + elle toplam yok → REDDEDİLİYOR',
    satisEkleIsle({
      musteri_id: musteri.id,
      tarih: '2026-07-20',
      kalemler: [{ oda: 'Salon', adet: 1, satir_tutari: 0 }]
    }).basarili === false
  )
  dogruMu(
    'Elle toplam 0 verilirse REDDEDİLİYOR',
    satisEkleIsle({
      musteri_id: musteri.id,
      tarih: '2026-07-20',
      kalemler: [{ adet: 1, satir_tutari: 0 }],
      elle_toplam: 0
    }).basarili === false
  )

  // (e) Düzenleme: mevcut satışa sonradan elle toplam yazma (indirim) ve kaldırma.
  const indirimli = veriYoksaPatlat(
    satisGuncelleIsle(normalSatis.satis.id, { elle_toplam: kurus(1200) }),
    'satisGuncelle (elle toplam ekle)'
  )
  esitMi('Düzenleme: elle toplam yazılınca toplam değişti (1.500 → 1.200)', kurus(1200), indirimli.bakiye.toplam_tutar)
  esitMi('Düzenleme: kalem tutarları DEĞİŞMEDİ', kurus(1000), indirimli.kalemler[0].satir_tutari)

  const geriAlindi = veriYoksaPatlat(
    satisGuncelleIsle(normalSatis.satis.id, { elle_toplam: null }),
    'satisGuncelle (elle toplam kaldır)'
  )
  esitMi('Düzenleme: elle toplam kaldırılınca toplam kalemlere döndü', kurus(1500), geriAlindi.bakiye.toplam_tutar)
  esitMi('Düzenleme: elle_toplam sütunu tekrar NULL', null, geriAlindi.satis.elle_toplam)

  // (f) Devir kaydına elle toplam yazılamaz (toplamı devir_tutari'dır).
  const devirElleToplam = veriYoksaPatlat(
    satisDevirEkleIsle({ musteri_id: musteri.id, tarih: '2026-06-01', devir_tutari: kurus(2000) }),
    'satisDevirEkle (elle toplam kontrolü)'
  )
  esitMi('Devir kaydında elle_toplam NULL kalır', null, devirElleToplam.satis.elle_toplam)
  esitMi('Devir kaydının toplamı devir_tutari', kurus(2000), devirElleToplam.bakiye.toplam_tutar)

  // Bu bölümde eklenen satışlar sonraki testlerin bakiye/gecikme beklentilerini
  // bozmasın diye temizleniyor (sahip oturumu açık).
  for (const id of [toptanSatis.satis.id, normalSatis.satis.id, devirElleToplam.satis.id]) {
    veriYoksaPatlat(satisSilIsle(id), `satisSil (elle toplam testi temizliği ${id})`)
  }

  // =====================================================================
  // 2.8) OTOMATİK ÖNERİ (02.08.2026 — CEO isteği): daha önce yazılan oda ve
  //      model/kumaş adları "Oda"/"Model" kutularında öneri olarak çıkar.
  // =====================================================================
  const onerilerOnce = veriYoksaPatlat(satisOnerilerIsle(), 'satisOneriler')
  dogruMu(
    'Öneri: hiç kayıt yokken bile standart odalar geliyor (Salon)',
    onerilerOnce.odalar.includes('Salon')
  )
  dogruMu('Öneri: standart oda listesi 8 adet', onerilerOnce.odalar.length >= 8)

  // "Veranda" standart listede YOK — kullanıcı yazınca öneriye girmeli.
  dogruMu('Öneri: "Veranda" başlangıçta önerilerde YOK', !onerilerOnce.odalar.includes('Veranda'))
  veriYoksaPatlat(
    satisEkleIsle({
      musteri_id: musteri.id,
      tarih: '2026-07-20',
      kalemler: [
        { oda: 'Veranda', model_kumas: 'Bambu stor', adet: 1, satir_tutari: kurus(750) },
        { oda: 'Veranda', model_kumas: 'Bambu stor', adet: 1, satir_tutari: kurus(750) },
        { oda: 'Kiler', model_kumas: 'Keten tül', adet: 1, satir_tutari: kurus(300) }
      ]
    }),
    'satisEkle (öneri kaynağı)'
  )
  const onerilerSonra = veriYoksaPatlat(satisOnerilerIsle(), 'satisOneriler (kayıt sonrası)')
  dogruMu('Öneri: yazılan oda ("Veranda") artık önerilerde', onerilerSonra.odalar.includes('Veranda'))
  dogruMu('Öneri: yazılan kumaş ("Bambu stor") önerilerde', onerilerSonra.modeller.includes('Bambu stor'))
  esitMi(
    'Öneri: EN ÇOK kullanılan oda listenin başında (Veranda 2 kez)',
    'Veranda',
    onerilerSonra.odalar[0]
  )
  esitMi(
    'Öneri: en çok kullanılan kumaş başta (Bambu stor 2 kez)',
    'Bambu stor',
    onerilerSonra.modeller[0]
  )
  esitMi(
    'Öneri: aynı değer iki kez listelenmiyor (Veranda 1 kez görünür)',
    1,
    onerilerSonra.odalar.filter((o) => o === 'Veranda').length
  )
  dogruMu(
    'Öneri: standart odalar hâlâ listede (kullanılanların ardından)',
    onerilerSonra.odalar.includes('Salon') && onerilerSonra.odalar.includes('Çalışma Odası')
  )

  // Boş/boşluklu değerler öneri listesini kirletmemeli.
  veriYoksaPatlat(
    satisEkleIsle({
      musteri_id: musteri.id,
      tarih: '2026-07-20',
      kalemler: [{ oda: '   ', model_kumas: '  ', adet: 1, satir_tutari: kurus(100) }]
    }),
    'satisEkle (boş oda/model)'
  )
  const onerilerBoslukSonrasi = veriYoksaPatlat(satisOnerilerIsle(), 'satisOneriler (boşluk sonrası)')
  dogruMu(
    'Öneri: boş/boşluklu değerler listeye GİRMİYOR',
    onerilerBoslukSonrasi.odalar.every((o) => o.trim() !== '') &&
      onerilerBoslukSonrasi.modeller.every((m) => m.trim() !== '')
  )

  // =====================================================================
  // 3) Gecikme (Şartname 6.3) — kalan>0 VE son ödeme/satıştan 30+ gün.
  // =====================================================================
  const gecikmeMusterisi = veriYoksaPatlat(musteriEkleIsle({ ad_soyad: 'Fatma Şahin' }), 'musteriEkle (gecikme)')

  // A) kalan > 0, son ödeme 20 gün önce → GECİKEN DEĞİL
  const satisA = veriYoksaPatlat(
    satisEkleIsle({
      musteri_id: gecikmeMusterisi.id,
      tarih: gunOnce(BUGUN, 90),
      kalemler: [{ en: 100, boy: 100, adet: 1, satir_tutari: kurus(1000) }]
    }),
    'satisEkle (A)'
  )
  veriYoksaPatlat(
    tahsilatEkleIsle({ satis_id: satisA.satis.id, tarih: gunOnce(BUGUN, 20), tutar: kurus(200), odeme_sekli: 'nakit' }),
    'tahsilatEkle (A)'
  )
  dogruMu(
    'Gecikme A: kalan>0, son ödeme 20 gün önce → GECİKEN DEĞİL',
    gecikmeService.satisGecikmisMi(satisA.satis.id, BUGUN) === false
  )

  // B) kalan > 0, son ödeme tam 30 gün önce → GECİKEN
  const satisB = veriYoksaPatlat(
    satisEkleIsle({
      musteri_id: gecikmeMusterisi.id,
      tarih: gunOnce(BUGUN, 90),
      kalemler: [{ en: 100, boy: 100, adet: 1, satir_tutari: kurus(1000) }]
    }),
    'satisEkle (B)'
  )
  veriYoksaPatlat(
    tahsilatEkleIsle({ satis_id: satisB.satis.id, tarih: gunOnce(BUGUN, 30), tutar: kurus(200), odeme_sekli: 'nakit' }),
    'tahsilatEkle (B)'
  )
  dogruMu(
    'Gecikme B: kalan>0, son ödeme 30 gün önce → GECİKEN',
    gecikmeService.satisGecikmisMi(satisB.satis.id, BUGUN) === true
  )

  // C) kalan = 0 (tam ödendi), son ödeme 60 gün önce → GECİKEN DEĞİL
  const satisC = veriYoksaPatlat(
    satisEkleIsle({
      musteri_id: gecikmeMusterisi.id,
      tarih: gunOnce(BUGUN, 90),
      kalemler: [{ en: 100, boy: 100, adet: 1, satir_tutari: kurus(1000) }]
    }),
    'satisEkle (C)'
  )
  veriYoksaPatlat(
    tahsilatEkleIsle({ satis_id: satisC.satis.id, tarih: gunOnce(BUGUN, 60), tutar: kurus(1000), odeme_sekli: 'nakit' }),
    'tahsilatEkle (C)'
  )
  dogruMu(
    'Gecikme C: kalan=0, son ödeme 60 gün önce → GECİKEN DEĞİL (kalan>0 şartı sağlanmıyor)',
    gecikmeService.satisGecikmisMi(satisC.satis.id, BUGUN) === false
  )

  // D) hiç tahsilat yok, satış tarihi 35 gün önce → GECİKEN (satış tarihinden sayılır)
  const satisD = veriYoksaPatlat(
    satisEkleIsle({
      musteri_id: gecikmeMusterisi.id,
      tarih: gunOnce(BUGUN, 35),
      kalemler: [{ en: 100, boy: 100, adet: 1, satir_tutari: kurus(1000) }]
    }),
    'satisEkle (D)'
  )
  dogruMu(
    'Gecikme D: hiç tahsilat yok, satış 35 gün önce → GECİKEN (satış tarihinden sayılıyor)',
    gecikmeService.satisGecikmisMi(satisD.satis.id, BUGUN) === true
  )

  const kirmiziListe = gecikmeService.kirmiziListe(BUGUN)
  dogruMu(
    'Kırmızı liste: gecikme müşterisi (B ve D açık satışları geciken) listede',
    kirmiziListe.some((s) => s.musteri_id === gecikmeMusterisi.id)
  )
  dogruMu(
    'Kırmızı liste: ilk (bakiye) müşteri listede DEĞİL (satışı kapandı/geciken değil)',
    !kirmiziListe.some((s) => s.musteri_id === musteri.id)
  )

  const panelOzeti = panelService.ozet(BUGUN)
  dogruMu('Panel özeti: gecikenMusteriSayisi kırmızı liste uzunluğuyla eşleşiyor', panelOzeti.gecikenMusteriSayisi === kirmiziListe.length)
  dogruMu('Panel özeti: toplamAcikAlacak sayısal ve negatif değil', panelOzeti.toplamAcikAlacak >= 0)

  // ---------------------------------------------------------------------
  // 3.5) 02.08.2026 PERFORMANS DÜZELTMESİNİN DENKLİK KANITI (Böl.10 T6).
  //      Kontrol Paneli'nin 3 değeri artık toplu SQL ile hesaplanıyor.
  //      Burada AYNI değerler ESKİ (yavaş, müşteri-müşteri dolaşan) yöntemle
  //      bağımsızca yeniden hesaplanıp birebir karşılaştırılır — hız için
  //      doğruluktan taviz verilmediğinin kanıtı.
  // ---------------------------------------------------------------------
  const eskiYontemToplamAcikAlacak = musteriRepo
    .listeleBakiyeli()
    .reduce((toplam, m) => toplam + m.bakiye, 0)
  esitMi(
    'Denklik: toplamAcikAlacak (yeni tek SUM) = eski müşteri-müşteri toplamı',
    eskiYontemToplamAcikAlacak,
    panelOzeti.toplamAcikAlacak
  )

  const ayBaslangic = `${BUGUN.getUTCFullYear()}-${String(BUGUN.getUTCMonth() + 1).padStart(2, '0')}-01`
  const ayBitis = new Date(Date.UTC(BUGUN.getUTCFullYear(), BUGUN.getUTCMonth() + 1, 1) - 1)
    .toISOString()
    .slice(0, 10)
  const eskiYontemBuAyTahsilat = musteriRepo
    .listele()
    .flatMap((m) => satisRepo.musteriyeGoreListele(m.id))
    .flatMap((s) => tahsilatRepo.satisaGoreListele(s.id))
    .filter((t) => t.tarih.slice(0, 10) >= ayBaslangic && t.tarih.slice(0, 10) <= ayBitis)
    .reduce((toplam, t) => toplam + t.tutar, 0)
  esitMi(
    'Denklik: buAyTahsilEdilen (yeni tek SUM) = eski müşteri→satış→tahsilat döngüsü',
    eskiYontemBuAyTahsilat,
    panelOzeti.buAyTahsilEdilen
  )

  // Kırmızı liste: eski algoritmanın birebir kopyası (müşteri başına açık
  // satışları gez, her satışta satisGecikmisMi çağır, en eski referans tarihi al).
  const eskiYontemKirmizi = musteriRepo
    .listele()
    .map((m) => {
      const geciken = satisRepo
        .acikSatislar(m.id)
        .filter((s) => gecikmeService.satisGecikmisMi(s.id, BUGUN))
      if (geciken.length === 0) return null
      const enEski = geciken
        .map((s) => tahsilatRepo.sonTahsilatTarihi(s.id) ?? s.tarih)
        .reduce((eski, aday) => (aday < eski ? aday : eski))
      return {
        musteri_id: m.id,
        kalan_bakiye: musteriRepo.toplamBakiye(m.id),
        son_odeme_tarihi: enEski
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.musteri_id - b.musteri_id)

  const yeniKirmizi = [...kirmiziListe].sort((a, b) => a.musteri_id - b.musteri_id)
  esitMi('Denklik: kırmızı liste müşteri SAYISI eski algoritmayla aynı', eskiYontemKirmizi.length, yeniKirmizi.length)
  dogruMu(
    'Denklik: kırmızı listedeki her müşteri, bakiyesi ve son ödeme tarihi eski algoritmayla BİREBİR aynı',
    eskiYontemKirmizi.every(
      (eski, i) =>
        yeniKirmizi[i] !== undefined &&
        yeniKirmizi[i].musteri_id === eski.musteri_id &&
        yeniKirmizi[i].kalan_bakiye === eski.kalan_bakiye &&
        yeniKirmizi[i].son_odeme_tarihi === eski.son_odeme_tarihi
    )
  )
  dogruMu(
    'Kırmızı liste en çok gecikenden aza doğru sıralı',
    kirmiziListe.every((s, i) => i === 0 || kirmiziListe[i - 1].kac_gun_gecti >= s.kac_gun_gecti)
  )
  dogruMu(
    'Kırmızı listedeki her satır gerçekten 30+ gün gecikmiş',
    kirmiziListe.every((s) => s.kac_gun_gecti >= 30)
  )

  // =====================================================================
  // 4) Rol yetkisi — çalışan sil/düzenle/kullaniciYonet REDDEDİLİR;
  //    satış/tahsilat EKLEME izinlidir. Sahip → hepsi izin.
  // =====================================================================
  const calisanOlusturSonuc = veriYoksaPatlat(
    authKullaniciOlusturIsle('ayse.tezgahtar', 'CalisanSifre1', 'calisan'),
    'kullaniciOlustur (sahip olarak)'
  )
  esitMi('Sahip yeni bir "calisan" kullanıcı oluşturabiliyor', 'calisan', calisanOlusturSonuc.rol)

  // Silinecek/güncellenecek "kurban" kayıtlar — sahip oturumuyla, çalışan testinden ÖNCE hazırlanır.
  const silinecekMusteri = veriYoksaPatlat(musteriEkleIsle({ ad_soyad: 'Silinecek Müşteri' }), 'musteriEkle (kurban)')
  const guncellenecekSatis = veriYoksaPatlat(
    satisEkleIsle({
      musteri_id: musteri.id,
      tarih: '2026-07-10',
      kalemler: [{ en: 100, boy: 100, adet: 1, satir_tutari: kurus(500) }]
    }),
    'satisEkle (kurban)'
  )
  const silinecekTahsilatSonuc = veriYoksaPatlat(
    tahsilatEkleIsle({ satis_id: guncellenecekSatis.satis.id, tarih: '2026-07-11', tutar: kurus(100), odeme_sekli: 'nakit' }),
    'tahsilatEkle (kurban)'
  )

  const calisanGirisSonuc = authGirisYapIsle('ayse.tezgahtar', 'CalisanSifre1')
  dogruMu('Çalışan kullanıcı adı/şifresiyle giriş yapabiliyor', calisanGirisSonuc.basarili === true)
  const calisanOturum = veriYoksaPatlat(authAktifOturumIsle(), 'aktifOturum (calisan)')
  esitMi('Aktif oturum şimdi "calisan"', 'calisan', calisanOturum?.rol)

  // --- RED beklenenler (çalışan silemez/düzenleyemez/kullanıcı yönetemez) ---
  dogruMu('Çalışan: musteriSil REDDEDİLİYOR', musteriSilIsle(silinecekMusteri.id).basarili === false)
  dogruMu(
    'Çalışan: satisGuncelle REDDEDİLİYOR',
    satisGuncelleIsle(guncellenecekSatis.satis.id, { aciklama: 'çalışan değiştirmeye çalıştı' }).basarili === false
  )
  dogruMu(
    'Çalışan: kullaniciOlustur REDDEDİLİYOR',
    authKullaniciOlusturIsle('baska.calisan', 'Sifre123456', 'calisan').basarili === false
  )
  dogruMu('Çalışan: tahsilatSil REDDEDİLİYOR', tahsilatSilIsle(silinecekTahsilatSonuc.tahsilat.id).basarili === false)
  dogruMu(
    'Çalışan: musteriGuncelle REDDEDİLİYOR',
    musteriGuncelleIsle(musteri.id, { ad_soyad: 'Değiştirilmiş Ad' }).basarili === false
  )
  dogruMu('Çalışan: satisSil REDDEDİLİYOR', satisSilIsle(guncellenecekSatis.satis.id).basarili === false)
  dogruMu(
    'Çalışan: ayarDukkanAdiGuncelle REDDEDİLİYOR',
    ayarDukkanAdiGuncelleIsle('Çalışanın Dükkanı').basarili === false
  )

  // Kurban kayıtlar hâlâ duruyor mu? (RED gerçekten hiçbir şey silmedi/değiştirmedi)
  dogruMu('RED sonrası "kurban" müşteri hâlâ mevcut', musteriGetirIsle(silinecekMusteri.id).basarili === true)

  // --- İZİN beklenenler (çalışan satış/tahsilat/müşteri EKLEYEBİLİR) ---
  dogruMu('Çalışan: musteriEkle İZİNLİ', musteriEkleIsle({ ad_soyad: 'Çalışanın Eklediği Müşteri' }).basarili === true)
  const calisanSatisSonuc = satisEkleIsle({
    musteri_id: musteri.id,
    tarih: '2026-07-12',
    kalemler: [{ en: 100, boy: 100, adet: 1, satir_tutari: kurus(400) }]
  })
  dogruMu('Çalışan: satisEkle İZİNLİ', calisanSatisSonuc.basarili === true)
  const calisanSatis = veriYoksaPatlat(calisanSatisSonuc, 'satisEkle (calisan)')
  dogruMu(
    'Çalışan: tahsilatEkle İZİNLİ',
    tahsilatEkleIsle({ satis_id: calisanSatis.satis.id, tarih: '2026-07-13', tutar: kurus(100), odeme_sekli: 'nakit' })
      .basarili === true
  )
  dogruMu('Çalışan: müşteri listesini görebiliyor', musteriListeleIsle().basarili === true)
  dogruMu('Çalışan: müşteri arayabiliyor', musteriAraIsle('Yılmaz').basarili === true)
  dogruMu('Çalışan: satış ayrıntısını görebiliyor', satisGetirIsle(guncellenecekSatis.satis.id).basarili === true)
  dogruMu('Çalışan: paneli görebiliyor', panelOzetIsle().basarili === true)
  dogruMu('Çalışan: toplu bakiye listesini görebiliyor', musteriListeleBakiyeliIsle().basarili === true)
  dogruMu('Çalışan: dükkan adını görebiliyor (ayarGetir)', ayarGetirIsle().basarili === true)

  // --- Sahibe geri dön: hepsi İZİNLİ ---
  const sahipTekrarGirisSonuc = authGirisYapIsle('ornek.kullanici', 'GucluSifre123')
  dogruMu('Sahip tekrar giriş yapabiliyor', sahipTekrarGirisSonuc.basarili === true)

  dogruMu('Sahip: musteriGuncelle İZİNLİ', musteriGuncelleIsle(musteri.id, { telefon: '0533 999 88 77' }).basarili === true)
  dogruMu(
    'Sahip: satisGuncelle İZİNLİ',
    satisGuncelleIsle(guncellenecekSatis.satis.id, { aciklama: 'sahip düzenledi' }).basarili === true
  )
  dogruMu(
    'Sahip: kullaniciOlustur İZİNLİ',
    authKullaniciOlusturIsle('mehmet.tezgahtar', 'Sifre123456', 'calisan').basarili === true
  )
  dogruMu('Sahip: tahsilatSil İZİNLİ', tahsilatSilIsle(silinecekTahsilatSonuc.tahsilat.id).basarili === true)
  dogruMu('Sahip: musteriSil İZİNLİ', musteriSilIsle(silinecekMusteri.id).basarili === true)
  dogruMu('Silinen müşteri artık bulunamıyor', musteriGetirIsle(silinecekMusteri.id).basarili === false)

  // =====================================================================
  // 4.5) SATIŞI DÜZENLE ekranının arka ucu — satis:guncelle artık perde
  //      kalemlerini de değiştirebiliyor (kalemler VERİLİRSE tamamı yenisiyle
  //      değişir; verilmezse kalemlere dokunulmaz). Sahip oturumu açık.
  // =====================================================================
  const duzenlenecek = veriYoksaPatlat(
    satisEkleIsle({
      musteri_id: musteri.id,
      tarih: '2026-07-08',
      aciklama: 'Yanlış girilmiş satış',
      kalemler: [
        { oda: 'Salon', model_kumas: 'Blackout', en: 300, boy: 250, adet: 1, satir_tutari: kurus(1000) },
        { oda: 'Mutfak', model_kumas: 'Tül', en: 150, boy: 200, adet: 1, satir_tutari: kurus(500) }
      ]
    }),
    'satisEkle (düzenlenecek)'
  )
  veriYoksaPatlat(
    tahsilatEkleIsle({ satis_id: duzenlenecek.satis.id, tarih: '2026-07-09', tutar: kurus(400), odeme_sekli: 'nakit' }),
    'tahsilatEkle (düzenlenecek satışa)'
  )

  // (a) Kalemler VERİLMEZSE kalemlere dokunulmaz — sadece tarih/açıklama değişir.
  const sadeceBaslikGuncel = veriYoksaPatlat(
    satisGuncelleIsle(duzenlenecek.satis.id, { tarih: '2026-07-03', aciklama: 'Düzeltilmiş açıklama' }),
    'satisGuncelle (kalemsiz)'
  )
  esitMi('Düzenle: tarih güncellendi', '2026-07-03', sadeceBaslikGuncel.satis.tarih)
  esitMi('Düzenle: açıklama güncellendi', 'Düzeltilmiş açıklama', sadeceBaslikGuncel.satis.aciklama)
  esitMi('Düzenle: kalemler verilmeyince kalem sayısı DEĞİŞMEDİ', 2, sadeceBaslikGuncel.kalemler.length)
  esitMi('Düzenle: kalemler verilmeyince toplam DEĞİŞMEDİ', kurus(1500), sadeceBaslikGuncel.bakiye.toplam_tutar)

  // (b) Kalemler VERİLİRSE tamamı değişir; tahsilat korunur, bakiye yeniden hesaplanır.
  const kalemliGuncel = veriYoksaPatlat(
    satisGuncelleIsle(duzenlenecek.satis.id, {
      kalemler: [
        { oda: 'Salon', model_kumas: 'Kadife', en: 320, boy: 260, adet: 2, satir_tutari: kurus(2000) }
      ]
    }),
    'satisGuncelle (kalemli)'
  )
  esitMi('Düzenle: kalemler yenisiyle TAMAMEN değişti (2 → 1)', 1, kalemliGuncel.kalemler.length)
  esitMi('Düzenle: yeni toplam', kurus(2000), kalemliGuncel.bakiye.toplam_tutar)
  esitMi('Düzenle: tahsilat KORUNDU (ödenen aynı)', kurus(400), kalemliGuncel.bakiye.odenen_tutar)
  esitMi('Düzenle: kalan bakiye yeniden hesaplandı', kurus(1600), kalemliGuncel.bakiye.kalan_bakiye)
  esitMi('Düzenle: durum "acik"', 'acik', kalemliGuncel.satis.durum)
  esitMi('Düzenle: eski açıklama korundu (bu çağrıda gönderilmedi)', 'Düzeltilmiş açıklama', kalemliGuncel.satis.aciklama)

  // (c) Toplam, ödenenin ALTINA düşerse satış otomatik kapanır (Şartname 6.2).
  const kucultulmus = veriYoksaPatlat(
    satisGuncelleIsle(duzenlenecek.satis.id, {
      kalemler: [{ adet: 1, satir_tutari: kurus(300) }]
    }),
    'satisGuncelle (ödenenin altına düşen toplam)'
  )
  esitMi('Düzenle: toplam ödenenin altına düşünce kalan eksi', -kurus(100), kucultulmus.bakiye.kalan_bakiye)
  esitMi('Düzenle: toplam ödenenin altına düşünce durum "kapandi"', 'kapandi', kucultulmus.satis.durum)

  // (d) Boş kalem listesi ve geçersiz kalem REDDEDİLİR; red sonrası kayıt BOZULMAZ.
  dogruMu('Düzenle: boş kalem listesi REDDEDİLİYOR', satisGuncelleIsle(duzenlenecek.satis.id, { kalemler: [] }).basarili === false)
  dogruMu(
    'Düzenle: geçersiz kalem (negatif tutar) REDDEDİLİYOR',
    satisGuncelleIsle(duzenlenecek.satis.id, {
      kalemler: [{ adet: 1, satir_tutari: kurus(700) }, { adet: 1, satir_tutari: -5 }]
    }).basarili === false
  )
  const redSonrasi = veriYoksaPatlat(satisGetirIsle(duzenlenecek.satis.id), 'satisGetir (red sonrası)')
  esitMi('Düzenle: RED sonrası kalem sayısı bozulmadı (işlem geri alındı)', 1, redSonrasi.kalemler.length)
  esitMi('Düzenle: RED sonrası toplam bozulmadı', kurus(300), redSonrasi.bakiye.toplam_tutar)

  // (e) Devir kaydı: tutarı düzenlenebilir, ama perde kalemi gönderilemez.
  const devirKaydi = veriYoksaPatlat(
    satisDevirEkleIsle({ musteri_id: musteri.id, tarih: '2026-06-01', devir_tutari: kurus(5000), not: 'eski defter s.42' }),
    'satisDevirEkle (düzenlenecek)'
  )
  const devirGuncel = veriYoksaPatlat(
    satisGuncelleIsle(devirKaydi.satis.id, { devir_tutari: kurus(4500), aciklama: 'eski defter s.43' }),
    'satisGuncelle (devir tutarı)'
  )
  esitMi('Düzenle: devir tutarı güncellendi', kurus(4500), devirGuncel.bakiye.toplam_tutar)
  dogruMu(
    'Düzenle: devir kaydına perde kalemi gönderimi REDDEDİLİYOR',
    satisGuncelleIsle(devirKaydi.satis.id, { kalemler: [{ adet: 1, satir_tutari: kurus(100) }] }).basarili === false
  )

  // =====================================================================
  // 5) Oturum kontrolü — çıkış yapıldıktan sonra hiçbir uç çalışmaz.
  // =====================================================================
  veriYoksaPatlat(authCikisYapIsle(), 'cikisYap')
  const cikisSonrasiOturum = veriYoksaPatlat(authAktifOturumIsle(), 'aktifOturum (çıkış sonrası)')
  dogruMu('Çıkış sonrası aktif oturum null', cikisSonrasiOturum === null)
  dogruMu('Çıkış sonrası musteriListele REDDEDİLİYOR (oturum gerekli)', musteriListeleIsle().basarili === false)

  console.log('')
  if (basarisizSayisi > 0) {
    console.error(`[backend-test] HATA — ${basarisizSayisi} kontrol başarısız oldu.`)
    process.exitCode = 1
  } else {
    console.log('[backend-test] BAŞARILI — tüm kontroller geçti.')
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
