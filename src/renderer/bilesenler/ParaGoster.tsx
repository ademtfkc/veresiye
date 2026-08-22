import type { CSSProperties } from 'react'
import { paraFormatla } from '../lib/bicim'
import { bakiyeRenkDegiskeni } from '../lib/veri'

/**
 * Para her zaman öne çıksın (Şartname 7.1) — tek bileşenden formatlanır ve
 * renklenir: borç kırmızı, ödeme/temiz yeşil, fazla ödeme amber.
 */
export type ParaBoyutu = 'kucuk' | 'normal' | 'buyuk' | 'devasa'

const BOYUT_PX: Record<ParaBoyutu, number> = { kucuk: 14, normal: 16, buyuk: 36, devasa: 52 }

interface ParaGosterProps {
  kurus: number | null | undefined
  boyut?: ParaBoyutu
  renk?: string
  kalin?: boolean
  otomatikRenk?: boolean
  style?: CSSProperties
}

export function ParaGoster({
  kurus,
  boyut = 'normal',
  renk,
  kalin = true,
  otomatikRenk = false,
  style
}: ParaGosterProps) {
  const gercekRenk = renk ?? (otomatikRenk ? bakiyeRenkDegiskeni(kurus ?? 0) : 'inherit')
  return (
    <span
      className="mono"
      style={{
        fontSize: BOYUT_PX[boyut],
        fontWeight: kalin ? 600 : 400,
        color: gercekRenk,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {paraFormatla(kurus)}
    </span>
  )
}
