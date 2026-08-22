import { contextBridge, ipcRenderer } from 'electron'
import type { GuvenliKullanici, OturumBilgisi } from './auth'
import type {
  KullaniciRol,
  MusteriBakiyeSatiri,
  MusteriGuncelleme,
  MusteriRow,
  SatisGuncelleme,
  SatisRow,
  YeniMusteri,
  YeniTahsilat
} from './db/types'
import type { DisaAktarSayfa, DisaAktarSonucu } from './disaAktarma'
import type {
  AyarLogoYukleSonucu,
  IpcSonuc,
  YedekAlIpcSonucu,
  YedekOtomatikCalistirSonucu,
  YedekGeriYuklemeDosyasiSecIpcSonucu,
  YedekGeriYuklemeUygulaIpcSonucu
} from './ipc'
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
} from './services'

/**
 * GÜVENLİ KÖPRÜ (preload)
 *
 * Arayüz (renderer) süreci Node.js'e veya Electron'un iç API'lerine doğrudan
 * erişemez (contextIsolation:true, nodeIntegration:false, sandbox:true — bkz.
 * src/main/main.ts). Renderer'ın kullanabileceği TEK şey, burada `window.api`
 * altında açıkça tanımlanan işlevlerdir. Veritabanı erişimi ve rol yetkisi
 * DAİMA ana süreçte kalır; arayüz asla SQLite'a doğrudan dokunamaz, düz veri
 * (kuruş tamsayı + ISO tarih) alır/gönderir — biçimlendirme (₺, GG.AA.YYYY)
 * renderer'ın işi (bkz. src/renderer/lib/bicim.ts).
 *
 * Her metot HER ZAMAN aynı zarfı (IpcSonuc) döner:
 *   { basarili: true, veri }  veya  { basarili: false, hata: "sade Türkçe mesaj" }
 * Ham istisna/hata asla buradan geçip renderer'a sızmaz — bkz.
 * src/main/ipc/guvenliCagri.ts.
 *
 * Bu dosya src/renderer/lib/bridge.ts'teki tip tanımıyla BİREBİR eşleşmeli.
 */
const api = {
  // -- Giriş / Oturum / Kullanıcı Yönetimi ---------------------------------
  /** İlk açılışta hiç kullanıcı yoksa true döner (kurulum akışı gösterilmeli). */
  authIlkKurulumGerekliMi: (): Promise<IpcSonuc<boolean>> =>
    ipcRenderer.invoke('auth:ilkKurulumGerekliMi'),
  /** Yalnızca hiç kullanıcı yokken çağrılabilir: ilk "sahip" hesabını oluşturur. */
  authIlkSahipOlustur: (kullaniciAdi: string, sifre: string): Promise<IpcSonuc<GuvenliKullanici>> =>
    ipcRenderer.invoke('auth:ilkSahipOlustur', kullaniciAdi, sifre),
  /** Kullanıcı adı + şifre ile giriş yapar, oturumu ana süreçte açar. */
  authGirisYap: (kullaniciAdi: string, sifre: string): Promise<IpcSonuc<GuvenliKullanici>> =>
    ipcRenderer.invoke('auth:girisYap', kullaniciAdi, sifre),
  /** Aktif oturumu kapatır. */
  authCikisYap: (): Promise<IpcSonuc<{ basarili: true }>> => ipcRenderer.invoke('auth:cikisYap'),
  /** Şu an giriş yapmış kullanıcıyı döner (oturum yoksa veri: null). */
  authAktifOturum: (): Promise<IpcSonuc<OturumBilgisi | null>> => ipcRenderer.invoke('auth:aktifOturum'),
  /** Yeni kullanıcı ekler — SADECE sahip. */
  authKullaniciOlustur: (
    kullaniciAdi: string,
    sifre: string,
    rol: KullaniciRol
  ): Promise<IpcSonuc<GuvenliKullanici>> => ipcRenderer.invoke('auth:kullaniciOlustur', kullaniciAdi, sifre, rol),
  /** Bir kullanıcının şifresini sıfırlar — SADECE sahip. */
  authSifreSifirla: (kullaniciId: number, yeniSifre: string): Promise<IpcSonuc<{ basarili: true }>> =>
    ipcRenderer.invoke('auth:sifreSifirla', kullaniciId, yeniSifre),
  /** Tüm kullanıcıları listeler — SADECE sahip. */
  authKullanicilariListele: (): Promise<IpcSonuc<GuvenliKullanici[]>> =>
    ipcRenderer.invoke('auth:kullanicilariListele'),

  // -- Müşteri --------------------------------------------------------------
  /** Tüm müşterileri ada göre sıralı listeler. */
  musteriListele: (): Promise<IpcSonuc<MusteriRow[]>> => ipcRenderer.invoke('musteri:listele'),
  /** Faz 4 performans ucu: tüm müşteriler + açık bakiyeleri TEK çağrıda (~1000 müşteride hızlı). */
  musteriListeleBakiyeli: (): Promise<IpcSonuc<MusteriBakiyeSatiri[]>> =>
    ipcRenderer.invoke('musteri:listeleBakiyeli'),
  /** Ad soyad veya telefonda anlık arama yapar. */
  musteriAra: (sorgu: string): Promise<IpcSonuc<MusteriRow[]>> => ipcRenderer.invoke('musteri:ara', sorgu),
  /** Tek bir müşterinin kartını getirir. */
  musteriGetir: (id: number): Promise<IpcSonuc<MusteriRow>> => ipcRenderer.invoke('musteri:getir', id),
  /** Yeni müşteri ekler. */
  musteriEkle: (girdi: YeniMusteri): Promise<IpcSonuc<MusteriRow>> => ipcRenderer.invoke('musteri:ekle', girdi),
  /** Müşteri bilgilerini günceller — SADECE sahip. */
  musteriGuncelle: (id: number, girdi: MusteriGuncelleme): Promise<IpcSonuc<MusteriRow>> =>
    ipcRenderer.invoke('musteri:guncelle', id, girdi),
  /** Müşteriyi (ve CASCADE ile tüm satış/tahsilat geçmişini) siler — SADECE sahip. */
  musteriSil: (id: number): Promise<IpcSonuc<{ silindi: true }>> => ipcRenderer.invoke('musteri:sil', id),

  // -- Satış / Devir ----------------------------------------------------------
  /** Yeni satış + perde kalemlerini tek işlemde (transaction) kaydeder. */
  satisEkle: (girdi: YeniSatisGirdisi): Promise<IpcSonuc<SatisDetay>> => ipcRenderer.invoke('satis:ekle', girdi),
  /** Eski defterden devir kaydı ekler (perde kalemi gerekmez, hızlı giriş). */
  satisDevirEkle: (girdi: YeniDevirGirdisi): Promise<IpcSonuc<SatisDetay>> =>
    ipcRenderer.invoke('satis:devirEkle', girdi),
  /** "Oda"/"Model-Kumaş" kutularının otomatik önerileri (daha önce girilenlerden öğrenilir). */
  satisOneriler: (): Promise<IpcSonuc<KalemOnerileri>> => ipcRenderer.invoke('satis:oneriler'),
  /** Bir satışın tüm ayrıntısını (bakiye + kalemler + tahsilatlar) getirir. */
  satisGetir: (id: number): Promise<IpcSonuc<SatisDetay>> => ipcRenderer.invoke('satis:getir', id),
  /** Bir müşterinin tüm satışlarını (açık+kapalı), en yeni önce listeler. */
  satisMusteriyeGoreListele: (musteriId: number): Promise<IpcSonuc<SatisRow[]>> =>
    ipcRenderer.invoke('satis:musteriyeGoreListele', musteriId),
  /** Satış bilgilerini günceller — SADECE sahip. */
  satisGuncelle: (id: number, girdi: SatisGuncelleme): Promise<IpcSonuc<SatisDetay>> =>
    ipcRenderer.invoke('satis:guncelle', id, girdi),
  /** Satışı (ve kalemlerini/tahsilatlarını) siler — SADECE sahip. */
  satisSil: (id: number): Promise<IpcSonuc<{ silindi: true }>> => ipcRenderer.invoke('satis:sil', id),

  // -- Tahsilat ---------------------------------------------------------------
  /** Bir satışa tahsilat ekler; güncel kalan bakiyeyi ve durumu döner. */
  tahsilatEkle: (girdi: YeniTahsilat): Promise<IpcSonuc<TahsilatSonucu>> =>
    ipcRenderer.invoke('tahsilat:ekle', girdi),
  /** Bir tahsilatı siler — SADECE sahip. */
  tahsilatSil: (id: number): Promise<IpcSonuc<TahsilatSilSonucu>> => ipcRenderer.invoke('tahsilat:sil', id),

  // -- Panel / Bakiye -----------------------------------------------------------
  /** Kontrol Paneli özeti: 3 KPI kutusu + kırmızı liste (Şartname 8.1). */
  panelOzet: (): Promise<IpcSonuc<PanelOzeti>> => ipcRenderer.invoke('panel:ozet'),

  // -- Ayarlar ------------------------------------------------------------------
  /** Ayarları getirir (şimdilik dükkan adı) — sol menü + Ayarlar ekranı kullanır. */
  ayarGetir: (): Promise<IpcSonuc<AyarlarGorunumu>> => ipcRenderer.invoke('ayar:getir'),
  /** Dükkan adını günceller — SADECE sahip. */
  ayarDukkanAdiGuncelle: (deger: string): Promise<IpcSonuc<AyarlarGorunumu>> =>
    ipcRenderer.invoke('ayar:dukkanAdiGuncelle', deger),
  /** Logo yükle (native "Resim Seç" penceresi açar) — SADECE sahip. */
  ayarLogoYukle: (): Promise<IpcSonuc<AyarLogoYukleSonucu>> => ipcRenderer.invoke('ayar:logoYukle'),
  /** Logoyu kaldır — SADECE sahip. */
  ayarLogoSil: (): Promise<IpcSonuc<AyarlarGorunumu>> => ipcRenderer.invoke('ayar:logoSil'),

  // -- Raporlar (Faz 5, Şartname Böl.9) — HERKES görebilir, hiçbiri değiştirmez. --
  /** Açık Bakiye Raporu — baslangic/bitis opsiyonel (boşsa tüm zamanlar). */
  raporAcikBakiye: (baslangic?: string, bitis?: string): Promise<IpcSonuc<AcikBakiyeRaporu>> =>
    ipcRenderer.invoke('rapor:acikBakiye', baslangic, bitis),
  /** Kasa (Tahsilat) Raporu — baslangic/bitis ZORUNLU. */
  raporKasa: (baslangic: string, bitis: string): Promise<IpcSonuc<KasaRaporu>> =>
    ipcRenderer.invoke('rapor:kasa', baslangic, bitis),
  /** Geciken Hesaplar Raporu — baslangic/bitis opsiyonel (listeyi daraltır, 30 gün kuralını DEĞİŞTİRMEZ). */
  raporGeciken: (baslangic?: string, bitis?: string): Promise<IpcSonuc<GecikenRaporu>> =>
    ipcRenderer.invoke('rapor:geciken', baslangic, bitis),
  /** Müşteri Ekstresi — baslangic/bitis opsiyonel (verilirse "Devreden Bakiye" satırı eklenir). */
  raporEkstre: (musteriId: number, baslangic?: string, bitis?: string): Promise<IpcSonuc<EkstreRaporu>> =>
    ipcRenderer.invoke('rapor:ekstre', musteriId, baslangic, bitis),
  /** Bir raporu CSV dosyası olarak kaydeder — "Farklı Kaydet" penceresi açar. */
  raporDisaAktarCsv: (oneriDosyaAdi: string, icerik: string): Promise<IpcSonuc<DisaAktarSonucu>> =>
    ipcRenderer.invoke('rapor:disaAktarCsv', oneriDosyaAdi, icerik),
  /** Bir raporu Excel (.xlsx) dosyası olarak kaydeder — "Farklı Kaydet" penceresi açar. */
  raporDisaAktarXlsx: (oneriDosyaAdi: string, sayfa: DisaAktarSayfa): Promise<IpcSonuc<DisaAktarSonucu>> =>
    ipcRenderer.invoke('rapor:disaAktarXlsx', oneriDosyaAdi, sayfa),

  // -- Yedekleme (Faz 6, Şartname Böl.4 — ZORUNLU) -------------------------
  /** Son otomatik/harici yedek tarihleri + Kontrol Paneli'nde sarı şerit gerekli mi. */
  yedekDurumu: (): Promise<IpcSonuc<YedekDurumu>> => ipcRenderer.invoke('yedek:durumu'),
  /** ELLE "şimdi yedek al" — bilgisayarın kendi yedek klasörüne yazar, klasör SORMAZ. */
  yedekBilgisayaraAl: (): Promise<IpcSonuc<YedekOtomatikCalistirSonucu>> =>
    ipcRenderer.invoke('yedek:bilgisayaraAl'),
  /** Seçilen klasöre (USB vb.) harici yedek alır — native "Klasör Seç" penceresi açar. */
  yedekAl: (): Promise<IpcSonuc<YedekAlIpcSonucu>> => ipcRenderer.invoke('yedek:al'),
  /** Geri yüklenecek yedek dosyasını seçtirir ve HEMEN doğrular (onaydan önce) — SADECE sahip. */
  yedekGeriYuklemeDosyasiSec: (): Promise<IpcSonuc<YedekGeriYuklemeDosyasiSecIpcSonucu>> =>
    ipcRenderer.invoke('yedek:geriYuklemeDosyasiSec'),
  /** Asıl (geri alınamaz) geri yükleme — arayüzde BÜYÜK UYARI + onaydan SONRA çağrılmalı. SADECE sahip. */
  yedekGeriYuklemeUygula: (yol: string): Promise<IpcSonuc<YedekGeriYuklemeUygulaIpcSonucu>> =>
    ipcRenderer.invoke('yedek:geriYuklemeUygula', yol)
}

export type VeresiyeApi = typeof api

contextBridge.exposeInMainWorld('api', api)
