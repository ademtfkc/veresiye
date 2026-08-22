import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readdirSync, readSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { baglantiAyarla, baglantiOlustur, closeDb } from '../db/connection'
import { ayarRepo } from '../db/repositories'
import { DogrulamaHatasi } from '../hatalar'
import { gecenGunSayisi } from './gecikmeService'

/**
 * YEDEKLEME (Şartname Böl.4 — ZORUNLU, "hayati, atlanamaz"). Tüm müşteri
 * alacakları TEK bilgisayarda duruyor, destek verecek teknik kişi yok — veri
 * kaybı burada felaket demek. Bu yüzden en yüksek özen: her adım doğrulanmış,
 * geri alınamaz işlemden önce ayrı bir güvenlik yedeği alınıyor.
 *
 * İKİ KATMANLI TASARIM (`src/main/disaAktarma.ts` ile AYNI ruhta — bkz. o
 * dosyanın başlığı): buradaki fonksiyonlar ALT SEVİYE — VERİLEN bir dosya/
 * klasör yoluna çalışır, `dialog`'a hiç dokunmaz. Otomatik kanıt testi
 * (`scripts/yedek-test.ts`) bunları doğrudan çağırıp gerçek dosya üretip
 * doğrulayabilir — native "Klasör/Dosya Seç" penceresi insan etkileşimi
 * olmadan test ortamında açılamaz. Üst seviye (`src/main/ipc/yedekIpc.ts`)
 * native pencereleri açar, seçilen yolla bu alt seviyeyi çağırır.
 *
 * GÜVENLİ KOPYALAMA KARARI: Dosyayı elle `fs.copyFileSync` ile kopyalamak
 * YERİNE better-sqlite3'ün `db.backup(hedefYol)` API'si (SQLite'ın kendi
 * "Online Backup API"si) kullanılıyor. Neden: uygulama WAL modunda çalışıyor
 * (bkz. connection.ts) — o an commit edilmiş ama henüz ana dosyaya
 * checkpoint'lenmemiş veri `-wal` dosyasında durabilir; ham bir dosya
 * kopyası bunu kaçırıp bozuk/eksik bir yedek üretebilir. `backup()` SQLite'ın
 * kendisine "tutarlı bir anlık görüntü çıkar" dedirtir; hem otomatik/harici
 * yedek alırken (kaynak) hem de geri yükleme öncesi güvenlik yedeğinde
 * kullanılıyor.
 */

const OTOMATIK_YEDEK_ONEKI = 'yedek_'
const HARICI_YEDEK_ONEKI = 'veresiye_yedek_'
const GERI_YUKLEME_ONCESI_ONEKI = 'geri_yukleme_oncesi_'
const UZANTI = '.db'

/**
 * CEO kararı 02.08.2026: bilgisayarda en fazla **5 günlük** otomatik yedek dursun
 * (öncesi: 30 gün). Kural "5 günden eski dosyayı sil" DEĞİL, **"en yeni 5 dosyayı
 * tut"** olarak uygulanır. Neden: dükkan bilgisayarı bir hafta kapalı kalırsa
 * (tatil, arıza) tarihe göre silme TÜM yedekleri süpürür ve elde HİÇ yedek
 * kalmaz; dosya sayısına göre tutmak her koşulda son 5 çalışma gününü korur.
 */
const SAKLANACAK_YEDEK_SAYISI = 5
/** Şartname 4.4: "son 7 gündür harici yedek alınmamışsa" uyarı göster. */
const HATIRLATMA_ESIK_GUN = 7

const AYAR_SON_OTOMATIK_YEDEK = 'son_otomatik_yedek'
const AYAR_SON_HARICI_YEDEK = 'son_harici_yedek'

/** Veresiye'nin kendi şemasında MUTLAKA bulunması gereken çekirdek tablolar (geri yükleme doğrulaması için). */
const BEKLENEN_TABLOLAR = ['musteri', 'satis', 'perde_kalemi', 'tahsilat', 'kullanici']

/** CEO kararı 02.08.2026: günlük otomatik yedek her akşam bu saatte alınır. */
export const GECELIK_YEDEK_SAATI = 23
export const GECELIK_YEDEK_DAKIKASI = 55

/**
 * Bir sonraki gecelik yedek anını (bugün 23.55 geçmişse yarın 23.55) döner.
 * `main.ts`'teki zamanlayıcı bunu kullanır. Saat hesabı buraya alındı ki
 * otomatik testle doğrulanabilsin (main.ts Electron'a bağlı, test edilemez).
 * Tam 23.55'te çağrılırsa ERTESİ günü döner — aynı anda ikinci kez tetiklenip
 * sonsuz döngüye girmesin diye.
 */
export function siradakiGecelikYedekZamani(simdi: Date = new Date()): Date {
  const hedef = new Date(simdi)
  hedef.setHours(GECELIK_YEDEK_SAATI, GECELIK_YEDEK_DAKIKASI, 0, 0)
  if (hedef.getTime() <= simdi.getTime()) hedef.setDate(hedef.getDate() + 1)
  return hedef
}

function isoTarih(tarih: Date): string {
  return tarih.toISOString().slice(0, 10)
}

function otomatikYedekDosyaAdi(iso: string): string {
  return `${OTOMATIK_YEDEK_ONEKI}${iso}${UZANTI}`
}

/** "yedek_2026-07-16.db" → "2026-07-16". Desene uymayan (bizim üretmediğimiz) dosyalara dokunmaz. */
function otomatikYedekTarihiniCikar(dosyaAdi: string): string | null {
  const eslesme = dosyaAdi.match(/^yedek_(\d{4}-\d{2}-\d{2})\.db$/)
  return eslesme ? eslesme[1] : null
}

/**
 * {klasor}'de EN YENİ 5 otomatik yedeği bırakıp fazlasını siler (Şartname 4.1 +
 * CEO kararı 02.08.2026 — bkz. SAKLANACAK_YEDEK_SAYISI). Dosya adındaki tarihe
 * göre sıralar, en yenileri tutar.
 *
 * Yalnızca kendi ürettiğimiz "yedek_YYYY-AA-GG.db" adlı dosyalara dokunur —
 * "geri_yukleme_oncesi_*" güvenlik yedekleri ve USB'ye alınan harici yedekler
 * BİLEREK bu temizliğin dışında (riskli bir işlemden hemen önceki anlık
 * görüntü nadir üretilir, süresiz saklanması daha değerli; harici yedekler
 * zaten başka bir diskte).
 */
function fazlaOtomatikYedekleriTemizle(klasor: string): string[] {
  if (!existsSync(klasor)) return []
  const yedekler = readdirSync(klasor)
    .map((dosyaAdi) => ({ dosyaAdi, tarih: otomatikYedekTarihiniCikar(dosyaAdi) }))
    .filter((y): y is { dosyaAdi: string; tarih: string } => y.tarih !== null)
    .sort((a, b) => b.tarih.localeCompare(a.tarih)) // en yeni önce

  const silinenler: string[] = []
  for (const fazla of yedekler.slice(SAKLANACAK_YEDEK_SAYISI)) {
    unlinkSync(join(klasor, fazla.dosyaAdi))
    silinenler.push(fazla.dosyaAdi)
  }
  return silinenler
}

/**
 * SQLite dosya biçiminin RESMİ 16 baytık imzası ("SQLite format 3" + NUL).
 * Byte dizisi olarak tanımlandı (metin/kaçış dizisi DEĞiL) ki kodlama/kaçış
 * belirsizliği yüzünden yanlışlıkla hatalı bir karşılaştırma oluşmasın.
 */
const SQLITE_BASLIK_IMZASI = Buffer.from([
  0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00
])

/** Dosyanın ilk 16 baytı SQLite'in kendi imzasıyla (SQLITE_BASLIK_IMZASI) eşleşiyor mu? */
function sqliteBasligiGecerliMi(dosyaYolu: string): boolean {
  let fd: number
  try {
    fd = openSync(dosyaYolu, 'r')
  } catch {
    return false
  }
  try {
    const arabellek = Buffer.alloc(16)
    const okunanBayt = readSync(fd, arabellek, 0, 16, 0)
    return okunanBayt === 16 && arabellek.equals(SQLITE_BASLIK_IMZASI)
  } catch {
    return false
  } finally {
    closeSync(fd)
  }
}

export interface DosyaGecerliligi {
  gecerli: boolean
  neden?: string
}

/**
 * Seçilen dosya gerçekten geri yüklemeye uygun bir Veresiye veritabanı mı?
 * (Şartname 4.3: "bozuk/yanlış dosya reddedilsin"). İki aşamalı kontrol:
 *   1) SQLite dosya başlığı (16 bayt imza) — rastgele/bozuk bir dosyayı anında eler.
 *   2) Beklenen çekirdek tablolar (musteri/satis/perde_kalemi/tahsilat/kullanici)
 *      — geçerli bir SQLite dosyası ama Veresiye'ye ait OLMAYAN bir dosyayı eler.
 */
function dosyaGecerliligiKontrolEt(dosyaYolu: string): DosyaGecerliligi {
  if (!existsSync(dosyaYolu)) return { gecerli: false, neden: 'Seçilen dosya bulunamadı.' }
  if (!sqliteBasligiGecerliMi(dosyaYolu)) {
    return { gecerli: false, neden: 'Bu dosya geçerli bir veritabanı dosyası değil (bozuk veya yanlış dosya).' }
  }
  let test: Database.Database | null = null
  try {
    test = new Database(dosyaYolu, { readonly: true, fileMustExist: true })
    const tablolar = new Set(
      (test.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map(
        (r) => r.name
      )
    )
    const eksikTablolar = BEKLENEN_TABLOLAR.filter((t) => !tablolar.has(t))
    if (eksikTablolar.length > 0) {
      return {
        gecerli: false,
        neden: 'Bu dosya bir Veresiye veritabanı yedeği gibi görünmüyor (beklenen tablolar eksik).'
      }
    }
    return { gecerli: true }
  } catch {
    return { gecerli: false, neden: 'Dosya açılamadı veya bozuk.' }
  } finally {
    test?.close()
  }
}

export interface YedekDurumu {
  /** ISO tarih (YYYY-AA-GG) — otomatik/günlük yedeğin son alındığı gün. Hiç alınmadıysa null. */
  sonOtomatikYedek: string | null
  /** ISO tarih — harici (USB) yedeğin son alındığı gün. Hiç alınmadıysa null. */
  sonHariciYedek: string | null
  /** Şartname 4.4: son harici yedek 7+ gün önceyse (veya hiç alınmadıysa) true. */
  hatirlatmaGerekli: boolean
}

export interface YedekAlSonucu {
  yol: string
  tarih: string // ISO
}

export interface GeriYuklemeSonucu {
  /** Geri yüklemeden HEMEN önce alınan, mevcut verinin güvenlik yedeğinin tam yolu. */
  geriYuklemeOncesiYedekYolu: string
}

export const yedekService = {
  /**
   * Şartname 4.1 — günlük otomatik yedek. İKİ yerden çağrılır (bkz. main.ts):
   *   1) her akşam **23.55**'te (program açıksa) — günün tüm işi yedeklenmiş olur,
   *   2) uygulama HER açılışında — bilgisayar gece kapalıysa 23.55 kaçar, bu
   *      "yakalama" çağrısı sabah açılışta yine de günlük yedeği garantiler.
   *
   * Aynı güne ikinci kez çağrılırsa aynı dosyanın (`yedek_YYYY-AA-GG.db`)
   * üzerine yazar — yani akşamki yedek sabahkinin yerini alır, ki bu istenen
   * davranıştır (akşamki dosya günün tamamını içerir). Her çağrıda fazla
   * yedekler temizlenir: en yeni 5 dosya kalır.
   */
  async otomatikYedekCalistir(
    baglanti: Database.Database,
    klasor: string,
    bugun: Date = new Date()
  ): Promise<{ yol: string; silinenler: string[] }> {
    if (!existsSync(klasor)) mkdirSync(klasor, { recursive: true })
    const iso = isoTarih(bugun)
    const yol = join(klasor, otomatikYedekDosyaAdi(iso))
    await baglanti.backup(yol)
    ayarRepo.set(AYAR_SON_OTOMATIK_YEDEK, iso)
    const silinenler = fazlaOtomatikYedekleriTemizle(klasor)
    return { yol, silinenler }
  },

  /** Şartname 4.2 — kullanıcının seçtiği klasöre (USB vb.) harici yedek. */
  async hariciYedekAl(
    baglanti: Database.Database,
    hedefKlasor: string,
    bugun: Date = new Date()
  ): Promise<YedekAlSonucu> {
    if (!existsSync(hedefKlasor)) mkdirSync(hedefKlasor, { recursive: true })
    const iso = isoTarih(bugun)
    const yol = join(hedefKlasor, `${HARICI_YEDEK_ONEKI}${iso}${UZANTI}`)
    await baglanti.backup(yol)
    ayarRepo.set(AYAR_SON_HARICI_YEDEK, iso)
    return { yol, tarih: iso }
  },

  /** Bir dosyanın geri yüklemeye uygun, geçerli bir Veresiye veritabanı olup olmadığını kontrol eder (dosyayı DEĞİŞTİRMEZ). */
  dosyaGecerliMi(dosyaYolu: string): DosyaGecerliligi {
    return dosyaGecerliligiKontrolEt(dosyaYolu)
  },

  /**
   * Şartname 4.3 — YEDEKTEN GERİ YÜKLEME (en riskli işlem: veri üzerine
   * yazar, geri alınamaz). Sıra:
   *   1) Seçilen dosyayı doğrula (SQLite başlığı + beklenen tablolar) —
   *      geçersizse REDDET, mevcut veritabanına hiç dokunma.
   *   2) Aktif bağlantı HÂLÂ AÇIKKEN, şu anki veritabanının kendi bir
   *      "geri-yükleme-öncesi" güvenlik yedeğini al (`backup()` ile) — yanlış
   *      dosya seçilmiş olsa bile bir önceki durum asla kaybolmasın.
   *   3) Aktif bağlantıyı kapat (dosya kilidini bırak, WAL checkpoint'lenir).
   *   4) Olası eski `-wal`/`-shm` artıklarını sil — yoksa yeni dosyanın
   *      üzerine eski WAL içeriği yanlışlıkla "replay" edilebilir.
   *   5) Seçilen dosyayı gerçek veritabanı konumuna kopyala (ÜZERİNE YAZAR).
   *   6) Yeniden aç — bekleyen migration'lar varsa burada otomatik uygulanır
   *      (eski bir yedek geri yüklenirse şema güncel sürüme taşınır).
   * 5/6. adımlarda beklenmedik bir şey olursa, 2. adımdaki yedeği eski yerine
   * geri koyup uygulamayı ÇALIŞIR durumda tutmaya çalışır (en kötü ihtimalde
   * bile "uygulama hiç açılamıyor" durumuna düşülmesin).
   */
  async geriYukle(
    aktifBaglanti: Database.Database,
    dbYolu: string,
    yedeklerKlasoru: string,
    secilenDosyaYolu: string,
    bugun: Date = new Date()
  ): Promise<GeriYuklemeSonucu> {
    const gecerlilik = dosyaGecerliligiKontrolEt(secilenDosyaYolu)
    if (!gecerlilik.gecerli) {
      throw new DogrulamaHatasi(gecerlilik.neden ?? 'Seçilen dosya geri yüklemeye uygun değil.')
    }

    if (!existsSync(yedeklerKlasoru)) mkdirSync(yedeklerKlasoru, { recursive: true })
    const damga = bugun.toISOString().replace(/[:.]/g, '-') // ":"/"." Windows dosya adında yasak
    const oncesiYol = join(yedeklerKlasoru, `${GERI_YUKLEME_ONCESI_ONEKI}${damga}${UZANTI}`)
    await aktifBaglanti.backup(oncesiYol)

    try {
      closeDb()
      for (const ek of ['-wal', '-shm']) {
        const yardimciYol = dbYolu + ek
        if (existsSync(yardimciYol)) unlinkSync(yardimciYol)
      }
      copyFileSync(secilenDosyaYolu, dbYolu)
      const yeniBaglanti = baglantiOlustur(dbYolu)
      baglantiAyarla(yeniBaglanti)
      return { geriYuklemeOncesiYedekYolu: oncesiYol }
    } catch (hata) {
      try {
        // Kurtarma denemesinde de olası -wal/-shm artıklarını temizle (yukarıdaki
        // adımla aynı gerekçe) — aksi halde geri konan dosya bile eski/karışık
        // WAL içeriğiyle yanlış açılabilir.
        for (const ek of ['-wal', '-shm']) {
          const yardimciYol = dbYolu + ek
          if (existsSync(yardimciYol)) unlinkSync(yardimciYol)
        }
        copyFileSync(oncesiYol, dbYolu)
        baglantiAyarla(baglantiOlustur(dbYolu))
      } catch {
        // Kurtarma denemesi de başarısız oldu — elimizdeki en iyi durum bu;
        // asıl hata olduğu gibi yukarı fırlatılır ki loglansın.
      }
      throw hata
    }
  },

  /** Şartname 4.4 — son yedek tarihleri + Kontrol Paneli'nde sarı şerit gerekli mi. */
  durum(bugun: Date = new Date()): YedekDurumu {
    const sonOtomatikYedek = ayarRepo.getir(AYAR_SON_OTOMATIK_YEDEK)
    const sonHariciYedek = ayarRepo.getir(AYAR_SON_HARICI_YEDEK)
    // Hiç harici yedek alınmamışsa da hatırlatma gerekir — "sonsuz gün geçti" ile aynı anlamda.
    const hatirlatmaGerekli = !sonHariciYedek || gecenGunSayisi(sonHariciYedek, bugun) > HATIRLATMA_ESIK_GUN
    return { sonOtomatikYedek, sonHariciYedek, hatirlatmaGerekli }
  }
}
