import type { Variant } from './api'

export const number = new Intl.NumberFormat('es-NI', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})
export const money = (value: number) => 'C$' + number.format(value)

export function shareUrl(kind: 'prendas' | 'selecciones', id: number | string) {
  return new URL('/compartir/' + kind + '/' + id, window.location.origin).href
}

export function productInquiryMessage(code: number, variant?: Pick<Variant, 'size' | 'presentation'>) {
  const selection = variant ? [`talla ${variant.size}`, variant.presentation && `color ${variant.presentation}`]
    .filter(Boolean).join(', ') : ''
  return `Hola, me interesa la prenda con código ${code}${selection ? ` (${selection})` : ''}.`
}

export const whatsAppUrl = (message: string) => 'https://wa.me/50586153754?text=' + encodeURIComponent(message)
