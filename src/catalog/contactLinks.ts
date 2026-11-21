import { apiOrigin } from './api'

export const number = new Intl.NumberFormat('es-NI', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})
export const money = (value: number) => 'C$' + number.format(value)

export function shareUrl(kind: 'prendas' | 'selecciones', id: number | string) {
  return new URL('/compartir/' + kind + '/' + id, apiOrigin || window.location.origin).href
}

export const whatsAppUrl = (message: string) => 'https://wa.me/50586153754?text=' + encodeURIComponent(message)
