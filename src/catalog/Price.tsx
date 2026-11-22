import { money } from './contactLinks'

export function Price({ original, final, range = false }: { original: number; final: number; range?: boolean }) {
  return <span className="price">
    {range && 'Desde '}{money(final)} {original > final && <del>{money(original)}</del>}
  </span>
}

const discountFormat = new Intl.NumberFormat('es-NI', { style: 'percent', maximumFractionDigits: 1 })

export function DiscountBadge({ original, final }: { original: number; final: number }) {
  if (original <= 0 || final >= original) return null

  const discount = (original - final) / original
  const discountPercent = discount < 0.001
    ? `<${discountFormat.format(0.001)}` : discountFormat.format(discount)
  return <span className="discount-badge">
    <span className="visually-hidden">Descuento: </span><span aria-hidden="true">{discount >= 0.001 && '−'}</span>{discountPercent}
  </span>
}
