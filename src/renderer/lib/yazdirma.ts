export type KagitBoyutu = 'A4' | 'A3'

/**
 * Yazdırma kağıt boyutunu ayarlayıp yazdırma penceresini açar.
 * `@page` kuralı seçici ile daraltılamadığı için, boyut bir <style>
 * öğesinin içeriği DEĞİŞTİRİLEREK uygulanır (global.css'teki varsayılan
 * A4'ün üzerine yazar — head'e sonradan eklendiği için cascade'de kazanır).
 */
export function yazdir(boyut: KagitBoyutu): void {
  let el = document.getElementById('yazdirma-sayfa-boyutu') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'yazdirma-sayfa-boyutu'
    document.head.appendChild(el)
  }
  el.textContent = `@page { size: ${boyut}; margin: 14mm 12mm; }`
  window.print()
}
