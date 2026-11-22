import { useEffect, useRef, useState } from 'react'
import type { CartLine } from '../cart/cartStorage'
import type { Detail } from './api'
import { Price } from './Price'
import { useRequest } from './useRequest'

export function QuickAdd({ productId, code, colorId, sizeIds, onSale, add, close }: {
  productId: number
  code: number
  colorId?: number
  sizeIds: string[]
  onSale: boolean
  add: (line: CartLine) => string
  close: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { data, error } = useRequest<Detail>('/products/' + productId)
  const [selectedColor, setSelectedColor] = useState<number>()
  const [selectedSize, setSelectedSize] = useState<number>()
  const [quantity, setQuantity] = useState('1')
  const [feedback, setFeedback] = useState('')
  const variants = data?.variants.filter(item => item.maxQuantity > 0 &&
    (!sizeIds.length || sizeIds.includes(String(item.sizeId))) &&
    (!onSale || item.finalPrice < item.originalPrice)) ?? []
  const colors = new Map(variants.map(item => [item.presentationId, item.presentation]))
  const showColor = colors.size > 1 || [...colors.values()].some(Boolean)
  const currentColor = selectedColor ?? (colorId !== undefined && colors.has(colorId) ? colorId
    : colors.size === 1 ? variants[0].presentationId : undefined)
  const colorVariants = variants.filter(item => currentColor === undefined || item.presentationId === currentColor)
  const sizes = new Map(colorVariants.map(item => [item.sizeId, item.size]))
  const currentSize = selectedSize ?? (sizes.size === 1 ? colorVariants[0].sizeId : undefined)
  const variant = colorVariants.find(item => item.presentationId === currentColor && item.sizeId === currentSize)
  const amount = Number(quantity)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  return <dialog ref={dialog} className="quick-add" aria-labelledby="quick-add-title" onClose={close}>
    <div className="quick-add-header">
      <h2 id="quick-add-title">Código {code}</h2>
      <button className="quick-add-close" type="button" aria-label="Cerrar" onClick={() => dialog.current?.close()}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20"
          fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="m5 5 10 10M15 5 5 15" />
        </svg>
      </button>
    </div>
    {error ? <p role="alert">No pudimos cargar las opciones de esta prenda.</p>
      : !data ? <p role="status">Cargando opciones…</p>
      : !variants.length ? <p role="status">No hay opciones disponibles para esta prenda con los filtros actuales.</p>
      : <form className="variant-form" onSubmit={event => {
        event.preventDefault()
        if (!variant || !Number.isInteger(amount) || amount < 1 || amount > variant.maxQuantity) return
        setFeedback(add({
          variantId: variant.id, productId: data.id, name: data.name, code: data.code,
          size: variant.size, presentation: variant.presentation, quantity: amount,
          imageUrl: data.images.find(image => image.presentationId === variant.presentationId)?.url ??
            data.images.find(image => image.presentationId === null)?.url ?? null,
          unitPrice: variant.finalPrice, maxQuantity: variant.maxQuantity,
        }))
      }}>
        <div className="quick-add-options">
          {showColor && <div className="quick-add-field">
            <label htmlFor="quick-add-color">Color</label>
            <select id="quick-add-color" value={currentColor ?? ''} onChange={event => {
              const id = Number(event.target.value)
              setSelectedColor(id)
              const hasSize = variants.some(item => item.presentationId === id && item.sizeId === currentSize)
              setSelectedSize(hasSize ? currentSize : undefined)
              setQuantity('1')
              setFeedback('')
            }} required>
              <option value="" disabled>Elige un color</option>
              {[...colors].map(([id, color]) => <option key={id} value={id}>
                {color || 'Sin color especificado'}
              </option>)}
            </select>
          </div>}
          <div className="quick-add-field">
            <label htmlFor="quick-add-size">Talla</label>
            <select id="quick-add-size" value={currentSize ?? ''} onChange={event => {
              setSelectedSize(Number(event.target.value))
              setQuantity('1')
              setFeedback('')
            }} required>
              <option value="" disabled>Elige una talla</option>
              {[...sizes].map(([id, size]) => <option key={id} value={id}>{size}</option>)}
            </select>
          </div>
        </div>
        {variant && <Price original={variant.originalPrice} final={variant.finalPrice} />}
        <div className="variant-actions">
          <label>Cantidad <input type="number" min="1" max={variant?.maxQuantity} required
            disabled={!variant} value={quantity} onChange={event => {
              setQuantity(event.target.value)
              setFeedback('')
            }} /></label>
          <button className="primary" disabled={!variant}>Agregar al carrito</button>
        </div>
        {feedback && <p role="status">{feedback}</p>}
      </form>}
  </dialog>
}
