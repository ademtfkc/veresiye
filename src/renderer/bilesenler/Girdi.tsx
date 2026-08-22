import { forwardRef, type InputHTMLAttributes } from 'react'

/**
 * Etiketli metin/sayı girişi + Türkçe hata mesajı satırı. Form doğrulaması
 * her zaman bu bileşenin altında, sade Türkçe olarak gösterilir (Şartname
 * 7.1: "yazarken göster", "Lütfen…" tarzı anlaşılır mesaj).
 *
 * `forwardRef`: klavye-öncelikli ekranlarda (ör. Devir Kaydı — Şartname 8.5,
 * "sadece klavyeyle arka arkaya kayıt") bir alandan diğerine programatik
 * odak (`ref.current.focus()`) taşımak için gerekli.
 */
interface GirdiProps extends InputHTMLAttributes<HTMLInputElement> {
  etiket?: string
  hata?: string | null
  sagIkon?: string
}

export const Girdi = forwardRef<HTMLInputElement, GirdiProps>(function Girdi(
  { etiket, hata, sagIkon, id, style, ...rest },
  ref
) {
  const girdiId = id ?? rest.name
  return (
    <div>
      {etiket && (
        <label
          htmlFor={girdiId}
          style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}
        >
          {etiket}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          ref={ref}
          id={girdiId}
          {...rest}
          aria-invalid={hata ? true : undefined}
          style={{
            width: '100%',
            padding: sagIkon ? '14px 46px 14px 16px' : '14px 16px',
            fontSize: 17,
            border: `1px solid ${hata ? 'var(--danger)' : 'var(--border)'}`,
            borderRadius: 8,
            background: 'var(--surface)',
            color: 'var(--text)',
            ...style
          }}
        />
        {sagIkon && (
          <span
            className="mono"
            style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 20,
              color: 'var(--text2)'
            }}
          >
            {sagIkon}
          </span>
        )}
      </div>
      {hata && (
        <div style={{ marginTop: 6, fontSize: 13.5, color: 'var(--danger)', fontWeight: 500 }}>{hata}</div>
      )}
    </div>
  )
})
