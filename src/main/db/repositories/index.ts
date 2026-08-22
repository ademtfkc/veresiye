/**
 * Repository barrel — Faz 2 (backend-gelistirici) servis/IPC katmanı SQL
 * yazmaz, yalnızca buradan import eder. Örnek:
 *   import { musteriRepo, satisRepo } from '../db/repositories'
 */
export { musteriRepo } from './musteriRepo'
export { satisRepo } from './satisRepo'
export { perdeKalemiRepo } from './perdeKalemiRepo'
export { tahsilatRepo } from './tahsilatRepo'
export { kullaniciRepo } from './kullaniciRepo'
export { ayarRepo } from './ayarRepo'
export { raporRepo } from './raporRepo'
export type { AcikBakiyeSatiri, KasaHareketSatiri, KasaKirilimSatiri } from './raporRepo'
