import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, type Detail } from './api'
import { useRequest } from './useRequest'
import { Price } from './Price'
import { ContactActions } from './ContactActions'
import { productInquiryMessage, shareUrl } from './contactLinks'
import type { CartLine } from '../cart/cartStorage'

export function ProductPage({ add, catalogHref }: { add: (line: CartLine) => string; catalogHref: string }) {
  const { productId } = useParams()
  const { data, error } = useRequest<Detail>('/products/' + encodeURIComponent(productId ?? ''))
  const [colorId, setColorId] = useState<number>()
  const [sizeId, setSizeId] = useState<number>()
  const [quantity, setQuantity] = useState('1')
  const [feedback, setFeedback] = useState('')
  const [photo, setPhoto] = useState(0)
  const variants = data?.variants ?? []
  const available = variants.filter(item => item.maxQuantity > 0)
  const colors = new Map(variants.map(item => [item.presentationId, item.presentation]))
  const sizes = new Map(variants.map(item => [item.sizeId, item.size]))
  const availableColors = new Set(available.map(item => item.presentationId))
  const selectedColorId = colorId ?? (availableColors.size === 1 ? available[0].presentationId : undefined)
  const prices = available.filter(item => selectedColorId === undefined || item.presentationId === selectedColorId)
  const availableSizes = new Set(prices.map(item => item.sizeId))
  const variant = prices.find(item => item.presentationId === selectedColorId && item.sizeId === sizeId)
  const pictures = (data?.images ?? []).filter(image => selectedColorId === undefined ||
    image.presentationId === selectedColorId || (colors.size === 1 && image.presentationId === null))
  const selectedPhoto = pictures[photo]
  const cheapest = [...prices].sort((a, b) => a.finalPrice - b.finalPrice)[0]
  const amount = Number(quantity)

  function selectColor(id: number) {
    setColorId(id)
    if (!available.some(item => item.presentationId === id && item.sizeId === sizeId)) setSizeId(undefined)
    setQuantity('1')
    setFeedback('')
    setPhoto(0)
  }

  return <>
    <Link className="back product-back" to={catalogHref}>← Volver al catálogo</Link>
    {error ? <p role="alert">{error instanceof ApiError && error.status === 404 ? 'No encontramos esta prenda.' : 'No pudimos cargar esta prenda.'}</p>
      : !data ? <p role="status">Cargando prenda…</p> : <div className="product-detail">
        <section aria-label="Fotos de la prenda">
          {selectedPhoto ? <img className="detail-photo" src={selectedPhoto.url} alt={data.name} />
            : <div className="no-photo">{selectedColorId !== undefined && colors.size > 1 ? 'Sin foto de este color' : 'Sin foto'}</div>}
          {pictures.length > 1 && <div className="thumbnails">{pictures.map((image, index) =>
            <button key={index} aria-label={'Ver foto ' + (index + 1)} aria-pressed={photo === index} onClick={() => setPhoto(index)}>
              <img src={image.url} alt="" />
            </button>)}</div>}
        </section>
        <section>
          <h1>{data.name}</h1>
          <p className="muted">Código {data.code}</p>
          {data.soldOut ? <p className="notice">Agotada</p> : <>
            {(variant || cheapest) && <Price original={(variant ?? cheapest).originalPrice}
              final={(variant ?? cheapest).finalPrice}
              range={!variant && prices.some(item => item.finalPrice !== cheapest.finalPrice)} />}
            <form className="variant-form" onSubmit={event => {
              event.preventDefault()
              if (!variant || !Number.isInteger(amount) || amount < 1 || amount > variant.maxQuantity) return
              setFeedback(add({ variantId: variant.id, productId: data.id, name: data.name, size: variant.size,
                code: data.code, imageUrl: pictures.find(image => image.presentationId === variant.presentationId)?.url ?? pictures[0]?.url ?? null,
                presentation: variant.presentation, quantity: amount, unitPrice: variant.finalPrice, maxQuantity: variant.maxQuantity }))
            }}>
              {(colors.size > 1 || [...colors.values()].some(Boolean)) && <fieldset className="variant-options">
                <legend>Color</legend>
                {[...colors].map(([id, color]) => <button key={id} type="button"
                  aria-pressed={id === selectedColorId} disabled={!availableColors.has(id)}
                  onClick={() => selectColor(id)}>{color || 'Sin color especificado'}</button>)}
              </fieldset>}
              <fieldset className="variant-options">
                <legend>Talla</legend>
                {[...sizes].map(([id, size]) => <button key={id} type="button"
                  aria-pressed={id === sizeId} disabled={!availableSizes.has(id)} onClick={() => {
                    setSizeId(id)
                    setQuantity('1')
                    setFeedback('')
                  }}>{size}</button>)}
              </fieldset>
              <div className="variant-actions">
                {variant && <label>Cantidad <input type="number" min="1" max={variant.maxQuantity} required
                  value={quantity} onChange={event => setQuantity(event.target.value)} /></label>}
                <button className="primary" disabled={!variant}>Agregar al carrito</button>
              </div>
            </form>
            <p role="status">{feedback}</p>
          </>}
          <h2>Consultar por esta prenda</h2>
          <ContactActions url={shareUrl('prendas', data.id)} message={productInquiryMessage(data.code, variant)} />
        </section>
      </div>}
  </>
}
