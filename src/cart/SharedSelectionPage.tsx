import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, request, type Detail, type SharedSelection } from '../catalog/api'
import { money } from '../catalog/contactLinks'
import { useRequest } from '../catalog/useRequest'

export function SharedSelectionPage() {
  const { id } = useParams()
  const { data, error } = useRequest<SharedSelection>('/selections/' + encodeURIComponent(id ?? ''))
  const [details, setDetails] = useState<Record<number, Detail>>({})
  const productIds = [...new Set(data?.items.map(({ original }) => original.productId))].join(',')

  useEffect(() => {
    if (!productIds) return
    const controller = new AbortController()
    for (const id of productIds.split(',')) {
      request<Detail>('/products/' + id, { signal: controller.signal }).then(detail => {
        if (!controller.signal.aborted) setDetails(current => ({ ...current, [id]: detail }))
      }).catch(() => { /* Keep the selection usable if a product cannot load. */ })
    }
    return () => controller.abort()
  }, [productIds])

  const total = data?.items.reduce((sum, item) => sum + item.original.quantity * item.original.unitPrice, 0)
  return <>
    <Link className="back" to="/">← Ir al catálogo</Link>
    <h1>Selección de prendas</h1>
    {error ? <p role="alert">{error instanceof ApiError && error.status === 410 ? 'Este enlace venció.'
      : error instanceof ApiError && error.status === 404 ? 'No encontramos esta selección.' : 'No pudimos abrir la selección.'}</p>
      : !data ? <p role="status">Cargando selección…</p> : <>
        <ul className="cart-items cart-shared">{data.items.map(({ original, availableQuantity, currentPrice }) => {
          const detail = details[original.productId]
          const presentationId = detail?.variants.find(variant => variant.id === original.variantId)?.presentationId
          const imageUrl = detail?.images.find(image => image.presentationId === presentationId)?.url ??
            detail?.images.find(image => image.presentationId === null)?.url
          return <li key={original.variantId}>
            <div className="cart-product">
              <Link to={'/prendas/' + original.productId} className="cart-product-link">
                {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <span className="cart-no-photo">Sin foto</span>}
                <strong>{detail ? `Código ${detail.code}` : original.name}</strong>
              </Link>
              {availableQuantity < original.quantity && <small className="notice">
                {availableQuantity ? 'Quedan ' + availableQuantity + ' unidades.' : 'Variante agotada.'}
              </small>}
              {currentPrice !== null && currentPrice !== original.unitPrice && <small className="notice">Precio actual {money(currentPrice)} por unidad.</small>}
            </div>
            <div className="cart-attribute"><span>Talla</span>{original.size}</div>
            <div className="cart-attribute"><span>Color</span>{original.presentation || '—'}</div>
            <div className="cart-attribute"><span>Cantidad</span>{original.quantity}</div>
            <div className="cart-attribute"><span>Precio unitario</span>{money(original.unitPrice)}</div>
            <div className="cart-attribute"><span>Subtotal</span><strong>{money(original.quantity * original.unitPrice)}</strong></div>
          </li>
        })}</ul>
        <p className="total">Total al compartir <strong>{money(total ?? 0)}</strong></p>
      </>}
  </>
}
