/**
 * Basit durum tabanlı gezinme (Faz 0'daki yaklaşımın devamı) — ağır bir
 * router kütüphanesi eklenmedi (Faz 3 kuralı). Her ekran kendi parametresini
 * taşır (ör. hangi müşteri kartı açık, Yeni Satış/Tahsilat'a hangi müşteriyle
 * girildi).
 */
/** Raporlar ekranındaki 4 sekme (Şartname Böl.9 — Faz 5). */
export type RaporTuru = 'acikBakiye' | 'kasa' | 'geciken' | 'ekstre'

export type Ekran =
  | { tur: 'panel' }
  | { tur: 'musteriler' }
  | { tur: 'kart'; musteriId: number }
  | { tur: 'yeniSatis'; musteriId?: number }
  | { tur: 'satisDuzenle'; satisId: number }
  | { tur: 'devir' }
  | { tur: 'tahsilat'; musteriId?: number; satisId?: number }
  | { tur: 'raporlar'; raporTuru?: RaporTuru; musteriId?: number }
  | { tur: 'ayarlar' }

export interface NavProps {
  git: (ekran: Ekran) => void
}
