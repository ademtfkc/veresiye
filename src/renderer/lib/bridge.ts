/**
 * `window.api` için tip tanımı — src/main/preload.ts'teki `api` nesnesiyle
 * BİREBİR eşleşmeli. Arayüz kodu veritabanına/Node'a asla doğrudan erişmez;
 * her çağrı bu tipte tanımlı köprüden geçer (bkz. dokumanlar/MIMARI.md Böl.5).
 *
 * Aşağıdaki tipler main sürecindeki gerçek kaynaklarından (`import type` —
 * derleme sırasında tamamen silinir, renderer paketine tek bir satır bile
 * kod olarak girmez) alınıyor; böylece backend değişince bu dosya elle senkron
 * tutulmaya çalışılmaz, TypeScript uyuşmazlığı derleme anında yakalar.
 *
 * Her metot HER ZAMAN aynı zarfı (IpcSonuc<T>) döner:
 *   { basarili: true, veri }  veya  { basarili: false, hata: "sade Türkçe mesaj" }
 * Para alanları KURUŞ tamsayı, tarihler ISO (YYYY-AA-GG) — ekrana basmadan
 * önce `lib/bicim.ts` ile "12.500,00 ₺" / "GG.AA.YYYY" biçimine çevrilmeli.
 */
import type { GuvenliKullanici, OturumBilgisi } from '../../main/auth'
import type {
  KullaniciRol,
  MusteriBakiyeSatiri,
  MusteriGuncelleme,
  MusteriRow,
  SatisGuncelleme,
  SatisRow,
  YeniMusteri,
  YeniTahsilat
} from '../../main/db/types'
import type { DisaAktarSayfa, DisaAktarSonucu } from '../../main/disaAktarma'
import type {
  AyarLogoYukleSonucu,
  IpcSonuc,
  YedekAlIpcSonucu,
  YedekGeriYuklemeDosyasiSecIpcSonucu,
  YedekGeriYuklemeUygulaIpcSonucu,
  YedekOtomatikCalistirSonucu
} from '../../main/ipc'
import type {
  AcikBakiyeRaporu,
  AyarlarGorunumu,
  KalemOnerileri,
  EkstreRaporu,
  GecikenRaporu,
  KasaRaporu,
  PanelOzeti,
  SatisDetay,
  TahsilatSilSonucu,
  TahsilatSonucu,
  YedekDurumu,
  YeniDevirGirdisi,
  YeniSatisGirdisi
} from '../../main/services'

export interface VeresiyeApi {
  // -- Giriş / Oturum / Kullanıcı Yönetimi ---------------------------------
  /** İlk açılışta hiç kullanıcı yoksa true döner (kurulum akışı gösterilmeli). */
  authIlkKurulumGerekliMi: () => Promise<IpcSonuc<boolean>>
  /** Yalnızca hiç kullanıcı yokken çağrılabilir: ilk "sahip" hesabını oluşturur. */
  authIlkSahipOlustur: (kullaniciAdi: string, sifre: string) => Promise<IpcSonuc<GuvenliKullanici>>
  /** Kullanıcı adı + şifre ile giriş yapar, oturumu ana süreçte açar. */
  authGirisYap: (kullaniciAdi: string, sifre: string) => Promise<IpcSonuc<GuvenliKullanici>>
  /** Aktif oturumu kapatır. */
  authCikisYap: () => Promise<IpcSonuc<{ basarili: true }>>
  /** Şu an giriş yapmış kullanıcıyı döner (oturum yoksa veri: null). */
  authAktifOturum: () => Promise<IpcSonuc<OturumBilgisi | null>>
  /** Yeni kullanıcı ekler — SADECE sahip. */
  authKullaniciOlustur: (
    kullaniciAdi: string,
    sifre: string,
    rol: KullaniciRol
  ) => Promise<IpcSonuc<GuvenliKullanici>>
  /** Bir kullanıcının şifresini sıfırlar — SADECE sahip. */
  authSifreSifirla: (kullaniciId: number, yeniSifre: string) => Promise<IpcSonuc<{ basarili: true }>>
  /** Tüm kullanıcıları listeler — SADECE sahip. */
  authKullanicilariListele: () => Promise<IpcSonuc<GuvenliKullanici[]>>

  // -- Müşteri --------------------------------------------------------------
  /** Tüm müşterileri ada göre sıralı listeler. */
  musteriListele: () => Promise<IpcSonuc<MusteriRow[]>>
  /** Faz 4 performans ucu: tüm müşteriler + açık bakiyeleri TEK çağrıda (~1000 müşteride hızlı). */
  musteriListeleBakiyeli: () => Promise<IpcSonuc<MusteriBakiyeSatiri[]>>
  /** Ad soyad veya telefonda anlık arama yapar. */
  musteriAra: (sorgu: string) => Promise<IpcSonuc<MusteriRow[]>>
  /** Tek bir müşterinin kartını getirir. */
  musteriGetir: (id: number) => Promise<IpcSonuc<MusteriRow>>
  /** Yeni müşteri ekler. */
  musteriEkle: (girdi: YeniMusteri) => Promise<IpcSonuc<MusteriRow>>
  /** Müşteri bilgilerini günceller — SADECE sahip. */
  musteriGuncelle: (id: number, girdi: MusteriGuncelleme) => Promise<IpcSonuc<MusteriRow>>
  /** Müşteriyi (ve CASCADE ile tüm satış/tahsilat geçmişini) siler — SADECE sahip. */
  musteriSil: (id: number) => Promise<IpcSonuc<{ silindi: true }>>

  // -- Satış / Devir ----------------------------------------------------------
  /** Yeni satış + perde kalemlerini tek işlemde (transaction) kaydeder. */
  satisEkle: (girdi: YeniSatisGirdisi) => Promise<IpcSonuc<SatisDetay>>
  /** Eski defterden devir kaydı ekler (perde kalemi gerekmez, hızlı giriş). */
  satisDevirEkle: (girdi: YeniDevirGirdisi) => Promise<IpcSonuc<SatisDetay>>
  /** "Oda"/"Model-Kumaş" kutularının otomatik önerileri (daha önce girilenlerden öğrenilir). */
  satisOneriler: () => Promise<IpcSonuc<KalemOnerileri>>
  /** Bir satışın tüm ayrıntısını (bakiye + kalemler + tahsilatlar) getirir. */
  satisGetir: (id: number) => Promise<IpcSonuc<SatisDetay>>
  /** Bir müşterinin tüm satışlarını (açık+kapalı), en yeni önce listeler. */
  satisMusteriyeGoreListele: (musteriId: number) => Promise<IpcSonuc<SatisRow[]>>
  /** Satış bilgilerini günceller — SADECE sahip. */
  satisGuncelle: (id: number, girdi: SatisGuncelleme) => Promise<IpcSonuc<SatisDetay>>
  /** Satışı (ve kalemlerini/tahsilatlarını) siler — SADECE sahip. */
  satisSil: (id: number) => Promise<IpcSonuc<{ silindi: true }>>

  // -- Tahsilat ---------------------------------------------------------------
  /** Bir satışa tahsilat ekler; güncel kalan bakiyeyi ve durumu döner. */
  tahsilatEkle: (girdi: YeniTahsilat) => Promise<IpcSonuc<TahsilatSonucu>>
  /** Bir tahsilatı siler — SADECE sahip. */
  tahsilatSil: (id: number) => Promise<IpcSonuc<TahsilatSilSonucu>>

  // -- Panel / Bakiye -----------------------------------------------------------
  /** Kontrol Paneli özeti: 3 KPI kutusu + kırmızı liste (Şartname 8.1). */
  panelOzet: () => Promise<IpcSonuc<PanelOzeti>>

  // -- Ayarlar ------------------------------------------------------------------
  /** Ayarları getirir (şimdilik dükkan adı) — sol menü + Ayarlar ekranı kullanır. */
  ayarGetir: () => Promise<IpcSonuc<AyarlarGorunumu>>
  /** Dükkan adını günceller — SADECE sahip. */
  ayarDukkanAdiGuncelle: (deger: string) => Promise<IpcSonuc<AyarlarGorunumu>>
  /** Logo yükle (native "Resim Seç" penceresi açar) — SADECE sahip. */
  ayarLogoYukle: () => Promise<IpcSonuc<AyarLogoYukleSonucu>>
  /** Logoyu kaldır — SADECE sahip. */
  ayarLogoSil: () => Promise<IpcSonuc<AyarlarGorunumu>>

  // -- Raporlar (Faz 5, Şartname Böl.9) — HERKES görebilir, hiçbiri değiştirmez. --
  /** Açık Bakiye Raporu — baslangic/bitis opsiyonel (boşsa tüm zamanlar). */
  raporAcikBakiye: (baslangic?: string, bitis?: string) => Promise<IpcSonuc<AcikBakiyeRaporu>>
  /** Kasa (Tahsilat) Raporu — baslangic/bitis ZORUNLU. */
  raporKasa: (baslangic: string, bitis: string) => Promise<IpcSonuc<KasaRaporu>>
  /** Geciken Hesaplar Raporu — baslangic/bitis opsiyonel (listeyi daraltır, 30 gün kuralını DEĞİŞTİRMEZ). */
  raporGeciken: (baslangic?: string, bitis?: string) => Promise<IpcSonuc<GecikenRaporu>>
  /** Müşteri Ekstresi — baslangic/bitis opsiyonel (verilirse "Devreden Bakiye" satırı eklenir). */
  raporEkstre: (musteriId: number, baslangic?: string, bitis?: string) => Promise<IpcSonuc<EkstreRaporu>>
  /** Bir raporu CSV dosyası olarak kaydeder — "Farklı Kaydet" penceresi açar. */
  raporDisaAktarCsv: (oneriDosyaAdi: string, icerik: string) => Promise<IpcSonuc<DisaAktarSonucu>>
  /** Bir raporu Excel (.xlsx) dosyası olarak kaydeder — "Farklı Kaydet" penceresi açar. */
  raporDisaAktarXlsx: (oneriDosyaAdi: string, sayfa: DisaAktarSayfa) => Promise<IpcSonuc<DisaAktarSonucu>>

  // -- Yedekleme (Faz 6, Şartname Böl.4 — ZORUNLU) -------------------------
  /** Son otomatik/harici yedek tarihleri + Kontrol Paneli'nde sarı şerit gerekli mi. */
  yedekDurumu: () => Promise<IpcSonuc<YedekDurumu>>
  /** ELLE "şimdi yedek al" — bilgisayarın kendi yedek klasörüne yazar, klasör SORMAZ. */
  yedekBilgisayaraAl: () => Promise<IpcSonuc<YedekOtomatikCalistirSonucu>>
  /** Seçilen klasöre (USB vb.) harici yedek alır — native "Klasör Seç" penceresi açar. */
  yedekAl: () => Promise<IpcSonuc<YedekAlIpcSonucu>>
  /** Geri yüklenecek yedek dosyasını seçtirir ve HEMEN doğrular (onaydan önce) — SADECE sahip. */
  yedekGeriYuklemeDosyasiSec: () => Promise<IpcSonuc<YedekGeriYuklemeDosyasiSecIpcSonucu>>
  /** Asıl (geri alınamaz) geri yükleme — arayüzde BÜYÜK UYARI + onaydan SONRA çağrılmalı. SADECE sahip. */
  yedekGeriYuklemeUygula: (yol: string) => Promise<IpcSonuc<YedekGeriYuklemeUygulaIpcSonucu>>
}

declare global {
  interface Window {
    api: VeresiyeApi
  }
}

export {}
