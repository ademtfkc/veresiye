import type Database from 'better-sqlite3'
import { getDb } from '../connection'
import type { KullaniciRow, YeniKullanici } from '../types'

function db(): Database.Database {
  return getDb()
}

/**
 * Kullanıcılar (Dükkan Sahibi / Çalışan). Şifre üretimi ve doğrulaması
 * (bcrypt/argon2) Faz 2'nin işi — burada yalnızca tablo ve temel CRUD hazır.
 * sifre_hash NEVER holds a plaintext password; caller (Faz 2 auth servisi)
 * hash'i hesaplayıp buraya geçirir.
 */
export const kullaniciRepo = {
  ekle(input: YeniKullanici): KullaniciRow {
    const sonuc = db()
      .prepare(
        `INSERT INTO kullanici (kullanici_adi, sifre_hash, rol, aktif)
         VALUES (@kullanici_adi, @sifre_hash, @rol, 1)`
      )
      .run(input)
    return kullaniciRepo.getirById(Number(sonuc.lastInsertRowid))!
  },

  getirById(id: number): KullaniciRow | undefined {
    return db().prepare('SELECT * FROM kullanici WHERE id = ?').get(id) as
      | KullaniciRow
      | undefined
  },

  /** Giriş ekranı bunu kullanacak (Şartname 2). */
  getirByKullaniciAdi(kullaniciAdi: string): KullaniciRow | undefined {
    return db().prepare('SELECT * FROM kullanici WHERE kullanici_adi = ?').get(kullaniciAdi) as
      | KullaniciRow
      | undefined
  },

  listele(): KullaniciRow[] {
    return db().prepare('SELECT * FROM kullanici ORDER BY kullanici_adi ASC').all() as KullaniciRow[]
  },

  /** Dükkan Sahibi çalışan şifresini sıfırlayabilmeli (Şartname 2). */
  sifreHashGuncelle(id: number, yeniHash: string): void {
    db().prepare('UPDATE kullanici SET sifre_hash = ? WHERE id = ?').run(yeniHash, id)
  },

  aktifDurumGuncelle(id: number, aktif: boolean): void {
    db()
      .prepare('UPDATE kullanici SET aktif = ? WHERE id = ?')
      .run(aktif ? 1 : 0, id)
  }
}
