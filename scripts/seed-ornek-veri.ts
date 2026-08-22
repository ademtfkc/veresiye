/**
 * Örnek veri (seed) — Faz 1.
 *
 * Ekip boş ekranla test etmesin diye gerçekçi Türkçe örnek müşteri/satış/
 * tahsilat verisi üretir. GERÇEK uygulama veritabanına (userData/veresiye.db)
 * ASLA dokunmaz — kendi ayrı, atılabilir dosyasına (.tmp/ornek-veri.db) yazar.
 * Bu dosya git'e girmez (.gitignore: .tmp/), yalnızca bu script git'e girer.
 *
 * Çalıştırma: `npm run db:seed`
 * Faz 3'te frontend-gelistirici gerçek veriyle ekran bağlarken, bu dosyayı
 * geçici olarak userData yoluna kopyalayıp gözle kontrol edebilir (isteğe bağlı).
 */
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { baglantiAyarla, baglantiOlustur } from '../src/main/db/connection'
import { kullaniciRepo, musteriRepo, perdeKalemiRepo, satisRepo, tahsilatRepo } from '../src/main/db/repositories'

function kurus(tl: number): number {
  return Math.round(tl * 100)
}

const dbPath = join(__dirname, '..', '.tmp', 'ornek-veri.db')
mkdirSync(dirname(dbPath), { recursive: true })
if (existsSync(dbPath)) rmSync(dbPath) // her çalıştırmada temiz baştan

console.log(`[db-seed] örnek veri üretiliyor → ${dbPath}`)

const baglanti = baglantiOlustur(dbPath)
baglantiAyarla(baglanti)

// ---------------------------------------------------------------------------
// 1) Ahmet Yılmaz — açık satış, kısmi ödeme yapılmış (borçlu, güncel)
// ---------------------------------------------------------------------------
const ahmet = musteriRepo.ekle({
  ad_soyad: 'Ahmet Yılmaz',
  telefon: '0532 111 22 33',
  adres: 'Cumhuriyet Mah. Atatürk Cad. No:14 Kadıköy/İstanbul',
  not: 'Salon takımı, kumaş rengi bej.'
})
const ahmetSatis = satisRepo.ekle({
  musteri_id: ahmet.id,
  tarih: '2026-07-01',
  aciklama: 'Salon + yatak odası perdeleri',
  tip: 'satis'
})
perdeKalemiRepo.ekle({ satis_id: ahmetSatis.id, oda: 'Salon', model_kumas: 'Blackout krem', en: 350, boy: 260, adet: 2, satir_tutari: kurus(2500) })
perdeKalemiRepo.ekle({ satis_id: ahmetSatis.id, oda: 'Yatak Odası', model_kumas: 'Tül desenli', en: 200, boy: 240, adet: 3, satir_tutari: kurus(2400) })
tahsilatRepo.ekle({ satis_id: ahmetSatis.id, tarih: '2026-07-01', tutar: kurus(2000), odeme_sekli: 'nakit', not: 'peşinat' })

// ---------------------------------------------------------------------------
// 2) Fatma Şahin — devir kaydı (eski defter), uzun süredir ödeme yok → GECİKMİŞ
// ---------------------------------------------------------------------------
const fatma = musteriRepo.ekle({
  ad_soyad: 'Fatma Şahin',
  telefon: '0544 222 33 44',
  adres: 'Barış Mah. İnönü Sok. No:7 Bornova/İzmir',
  not: 'Eski defterden aktarıldı.'
})
const fatmaSatis = satisRepo.ekle({
  musteri_id: fatma.id,
  tarih: '2026-01-15',
  aciklama: 'Devir (eski defter)',
  tip: 'devir',
  devir_tutari: kurus(1500)
})
tahsilatRepo.ekle({ satis_id: fatmaSatis.id, tarih: '2026-03-01', tutar: kurus(500), odeme_sekli: 'havale' })

// ---------------------------------------------------------------------------
// 3) Mehmet Demir — satış tam ödenmiş (temiz, kapandı)
// ---------------------------------------------------------------------------
const mehmet = musteriRepo.ekle({
  ad_soyad: 'Mehmet Demir',
  telefon: '0555 333 44 55',
  adres: 'Yeşiltepe Mah. Gül Sok. No:22 Osmangazi/Bursa',
  not: null
})
const mehmetSatis = satisRepo.ekle({ musteri_id: mehmet.id, tarih: '2026-06-10', aciklama: 'Mutfak perdesi', tip: 'satis' })
perdeKalemiRepo.ekle({ satis_id: mehmetSatis.id, oda: 'Mutfak', model_kumas: 'Kısa fon', en: 120, boy: 150, adet: 2, satir_tutari: kurus(900) })
tahsilatRepo.ekle({ satis_id: mehmetSatis.id, tarih: '2026-06-10', tutar: kurus(900), odeme_sekli: 'kart' })

// ---------------------------------------------------------------------------
// 4) Ayşe Kaya — yeni satış, hiç ödeme yok ama henüz 30 gün geçmedi (borçlu, gecikmemiş)
// ---------------------------------------------------------------------------
const ayse = musteriRepo.ekle({
  ad_soyad: 'Ayşe Kaya',
  telefon: '0533 444 55 66',
  adres: 'Fevzi Çakmak Mah. Zafer Cad. No:5 Selçuklu/Konya',
  not: null
})
const ayseSatis = satisRepo.ekle({ musteri_id: ayse.id, tarih: '2026-07-12', aciklama: 'Çocuk odası perdesi', tip: 'satis' })
perdeKalemiRepo.ekle({ satis_id: ayseSatis.id, oda: 'Çocuk Odası', model_kumas: 'Karikatürlü', en: 150, boy: 200, adet: 2, satir_tutari: kurus(1300) })

// ---------------------------------------------------------------------------
// 5) Hüseyin Yılmaz — devir kaydı, tam ödenmiş (kapandı)
// ---------------------------------------------------------------------------
const huseyin = musteriRepo.ekle({
  ad_soyad: 'Hüseyin Yılmaz',
  telefon: '0536 555 66 77',
  adres: 'Karşıyaka Mah. Deniz Cad. No:31 Karşıyaka/İzmir',
  not: 'Eski defterden aktarıldı.'
})
const huseyinSatis = satisRepo.ekle({ musteri_id: huseyin.id, tarih: '2025-11-01', aciklama: 'Devir (eski defter)', tip: 'devir', devir_tutari: kurus(800) })
tahsilatRepo.ekle({ satis_id: huseyinSatis.id, tarih: '2026-01-10', tutar: kurus(800), odeme_sekli: 'nakit' })

// ---------------------------------------------------------------------------
// 6) Zeynep Arslan — satış + fazla ödeme (kapandı, eksi bakiye görünür)
// ---------------------------------------------------------------------------
const zeynep = musteriRepo.ekle({
  ad_soyad: 'Zeynep Arslan',
  telefon: '0538 666 77 88',
  adres: 'Aydınlıkevler Mah. Menekşe Sok. No:9 Altındağ/Ankara',
  not: null
})
const zeynepSatis = satisRepo.ekle({ musteri_id: zeynep.id, tarih: '2026-06-20', aciklama: 'Ofis perdesi', tip: 'satis' })
perdeKalemiRepo.ekle({ satis_id: zeynepSatis.id, oda: 'Ofis', model_kumas: 'Zebra perde', en: 180, boy: 220, adet: 1, satir_tutari: kurus(1100) })
tahsilatRepo.ekle({ satis_id: zeynepSatis.id, tarih: '2026-06-25', tutar: kurus(1300), odeme_sekli: 'havale', not: 'yuvarlama / fazla ödeme' })

// ---------------------------------------------------------------------------
// Sahip kullanıcısı (Faz 2 gerçek şifre hash'i üretecek — burada yer tutucu)
// ---------------------------------------------------------------------------
kullaniciRepo.ekle({
  kullanici_adi: 'ornek.kullanici',
  sifre_hash: 'FAZ2_TARAFINDAN_DOLDURULACAK_HASH_YER_TUTUCU',
  rol: 'sahip'
})

// ---------------------------------------------------------------------------
// Özet tablo — göz kontrolü için
// ---------------------------------------------------------------------------
console.log('')
console.log('[db-seed] Müşteri özeti:')
for (const musteri of musteriRepo.listele()) {
  // Not: toplamBakiye yalnızca AÇIK satışları toplar (Şartname 6.1) ve
  // durumuTazele her yazmadan sonra kalan<=0 olan satışı 'kapandi' yaptığı
  // için bu toplam pratikte hiç negatif çıkmaz — negatif bakiye yalnızca tek
  // bir satışın kendi kartında (satisRepo.bakiye) görünür (bkz. db-test.ts).
  const bakiye = musteriRepo.toplamBakiye(musteri.id)
  const durum = bakiye > 0 ? 'BORÇLU' : 'TEMİZ'
  console.log(
    `  - ${musteri.ad_soyad.padEnd(16)} ${(musteri.telefon ?? '').padEnd(15)} kalan: ${(bakiye / 100).toFixed(2).padStart(10)} ₺  [${durum}]`
  )
}

console.log('')
console.log(`[db-seed] BAŞARILI — 6 müşteri, satış/devir/tahsilat kayıtları ve 1 kullanıcı (${dbPath}) içine yazıldı.`)
