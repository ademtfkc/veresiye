// db-smoke: better-sqlite3'ün bu makinede (ve bu Node/Electron ABI'siyle)
// gerçekten çalıştığını kanıtlayan basit bir "duman testi".
//
// Neden `electron` ile çalıştırılıyor (plain `node` ile değil)?
// better-sqlite3 bir native (derlenmiş) modüldür. Uygulama içinde Electron'un
// ana sürecinden kullanılacağı için `npm install` sonrası (postinstall:
// electron-builder install-app-deps) Electron'un Node ABI'sine göre yeniden
// derlenir. Bu yüzden bu testi de aynı ABI ile (Electron'u "düz Node gibi"
// çalıştırarak — ELECTRON_RUN_AS_NODE=1) çalıştırmak gerekir; aksi halde
// "NODE_MODULE_VERSION uyuşmuyor" hatası alınır. Komut: `npm run db:smoke`.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'

console.log('[db-smoke] better-sqlite3 duman testi başlıyor…')
console.log(`[db-smoke] Çalışma zamanı: ${process.versions.electron ? `Electron ${process.versions.electron}` : `Node ${process.version}`} (ABI ${process.versions.modules})`)

const tempDir = mkdtempSync(join(tmpdir(), 'veresiye-db-smoke-'))
const dbPath = join(tempDir, 'smoke.db')

let basarili = false

try {
  const db = new Database(dbPath)

  db.exec('CREATE TABLE t (x TEXT)')
  db.prepare('INSERT INTO t (x) VALUES (?)').run('merhaba veresiye')
  const satir = db.prepare('SELECT x FROM t').get()

  console.log('[db-smoke] SELECT sonucu:', satir)

  basarili = Boolean(satir) && satir.x === 'merhaba veresiye'

  db.close()
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}

if (!basarili) {
  console.error('[db-smoke] HATA: beklenen satır bulunamadı — better-sqlite3 çalışmıyor.')
  process.exit(1)
}

console.log('[db-smoke] BAŞARILI — better-sqlite3 okuma/yazma çalışıyor.')
