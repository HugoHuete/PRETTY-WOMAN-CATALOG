import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, createSelection, request, type Detail, type SelectionConflict } from '../catalog/api'
import { Price } from '../catalog/Price'
import { money, shareUrl, whatsAppUrl } from '../catalog/contactLinks'
import { saveSelection, selectionAttempt, type CartLine } from './cartStorage'

const DETAIL_REFRESH_DEADLINE_MS = 5_000

export function CartPage({ lines, change, remove, clear }: {
  lines: CartLine[]
  change: (id: number, quantity: number, maximum: number) => void
  remove: (id: number) => void
  clear: () => void
}) {
  const pending = useRef<AbortController | null>(null)
  useLayoutEffect(() => () => pending.current?.abort(), [])
  const [busy, setBusy] = useState(false)
  const [unavailable, setUnavailable] = useState<Record<number, number>>({})
  const [error, setError] = useState('')
  const [details, setDetails] = useState<Record<number, Detail>>({})
  const [priceCheckFailed, setPriceCheckFailed] = useState(false)
  const priceRequest = useRef<AbortController | null>(null)
  const productIds = [...new Set(lines.map(line => line.productId))].sort((a, b) => a - b).join(',')

  const refreshDetails = useCallback(async () => {
    priceRequest.current?.abort()
    const controller = new AbortController()
    priceRequest.current = controller
    const ids = productIds ? productIds.split(',') : []
    let deadlineReached = false
    const deadline = window.setTimeout(() => {
      deadlineReached = true
      controller.abort()
    }, DETAIL_REFRESH_DEADLINE_MS)
    const results = await Promise.allSettled(ids.map(async id =>
      [id, await request<Detail>('/products/' + id, { signal: controller.signal, cache: 'no-store' })] as const))
    window.clearTimeout(deadline)
    if (priceRequest.current !== controller || (controller.signal.aborted && !deadlineReached)) return null

    const fresh: Record<number, Detail> = {}
    for (const result of results) {
      if (result.status === 'fulfilled') fresh[Number(result.value[0])] = result.value[1]
    }
    const refreshedVariants = new Set(Object.values(fresh).flatMap(detail => detail.variants.map(variant => variant.id)))
    setUnavailable(current => {
      const entries = Object.entries(current)
      const remaining = entries.filter(([id]) => !refreshedVariants.has(Number(id)))
      return remaining.length === entries.length ? current : Object.fromEntries(remaining)
    })
    setDetails(current => ({ ...current, ...fresh }))
    setPriceCheckFailed(Object.keys(fresh).length !== ids.length)
    return fresh
  }, [productIds])

  useEffect(() => {
    if (!productIds) return

    function refreshWhenVisible() {
      if (!document.hidden && !pending.current) void refreshDetails()
    }

    refreshWhenVisible()
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    const timer = window.setInterval(refreshWhenVisible, 60_000)
    return () => {
      priceRequest.current?.abort()
      priceRequest.current = null
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [productIds, refreshDetails])

  const pricedLines = lines.map(line => ({
    line,
    variant: details[line.productId]?.variants.find(item => item.id === line.variantId),
  }))
  const total = pricedLines.reduce((sum, { line, variant }) =>
    sum + line.quantity * (variant?.finalPrice ?? line.unitPrice), 0)

  const stockConflict = lines.some(line => (unavailable[line.variantId] ?? line.quantity) < line.quantity)

  async function consultOnWhatsApp() {
    if (pending.current) return
    const checkout = new AbortController()
    pending.current = checkout
    setBusy(true)
    setError('')
    try {
      const fresh = await refreshDetails()
      if (!fresh || checkout.signal.aborted) return
      const items = lines.map(({ variantId, quantity }) => ({ variantId, quantity }))
      const live = lines.map(line => ({
        line,
        variant: fresh[line.productId]?.variants.find(item => item.id === line.variantId),
      }))
      const prices = Object.fromEntries(live.flatMap(({ line, variant }) =>
        variant ? [[line.variantId, variant.finalPrice] as const] : []))
      const hasInsufficientStock = live.some(({ line, variant }) =>
        fresh[line.productId] && (variant?.maxQuantity ?? 0) < line.quantity)
      const canReuseLink = live.every(({ line, variant }) => variant && variant.maxQuantity >= line.quantity)
      const reuse = { allowCachedLink: canReuseLink, stockConflict: hasInsufficientStock }
      let attempt = selectionAttempt(items, prices, reuse)
      let result = attempt.link
      if (!result) {
        try {
          result = await createSelection(attempt.key, items, checkout.signal)
        } catch (failure) {
          const conflict = failure instanceof ApiError && failure.status === 409
            ? failure.data as SelectionConflict | null : null
          if (!conflict?.keyConflict) throw failure
          attempt = selectionAttempt(items, prices, { ...reuse, renew: true })
          result = await createSelection(attempt.key, items, checkout.signal)
        }
        saveSelection(attempt, result)
      }
      if (checkout.signal.aborted) return
      const url = shareUrl('selecciones', result.id)
      window.location.assign(whatsAppUrl('Hola, quisiera consultar por esta selección de prendas. ' + url))
    } catch (failure) {
      if (checkout.signal.aborted) return
      const conflict = failure instanceof ApiError && failure.status === 409 ? failure.data as SelectionConflict | null : null
      if (conflict?.unavailable?.length) {
        setUnavailable(Object.fromEntries(conflict.unavailable.map(item => [item.variantId, item.availableQuantity])))
      } else setError('No pudimos preparar el enlace. Intenta de nuevo.')
    } finally {
      pending.current = null
      if (!checkout.signal.aborted) setBusy(false)
    }
  }

  return <>
    <Link className="back cart-back" to="/">← Seguir explorando</Link>
    <div className="cart-heading">
      <h1>Carrito</h1>
      {lines.length > 0 && <button className="cart-clear" type="button" disabled={busy} onClick={() => {
        if (window.confirm('¿Quieres quitar todas las prendas del carrito?')) clear()
      }}>Vaciar carrito</button>}
    </div>
    {!lines.length ? <p>Tu carrito está vacío.</p> : <div className="cart-layout">
      <div>
        <ul className="cart-items cart-editable">{pricedLines.map(({ line, variant }) => {
          const detail = details[line.productId]
          const max = detail && !variant ? 0 : unavailable[line.variantId] ?? variant?.maxQuantity ?? line.maxQuantity
          const code = line.code ?? detail?.code
          const label = code === undefined ? 'Ver prenda' : `Código ${code}`
          const presentationId = variant?.presentationId
          const hasOnlySavedColor = presentationId !== undefined &&
            detail?.variants.every(variant => variant.presentationId === presentationId)
          const imageUrl = line.imageUrl === undefined
            ? detail?.images.find(image => image.presentationId === presentationId)?.url ??
              (hasOnlySavedColor ? detail?.images.find(image => image.presentationId === null)?.url : undefined)
            : line.imageUrl
          return <li key={line.variantId}>
            <div className="cart-product">
              <Link to={'/prendas/' + line.productId} className="cart-product-link">
                {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <span className="cart-no-photo" aria-hidden="true">Sin foto</span>}
                <span className="cart-product-info">
                  <strong>{label}</strong>
                  <span className="cart-mobile-variant">Talla {line.size}{line.presentation && ` · ${line.presentation}`}</span>
                  <span className="cart-unit-price">
                    <span>Por unidad</span>
                    <Price original={variant?.originalPrice ?? line.unitPrice} final={variant?.finalPrice ?? line.unitPrice} />
                  </span>
                </span>
              </Link>
              {max < line.quantity && <small className="notice">{max ? 'Quedan ' + max + ' unidades.' : 'Variante agotada.'}</small>}
            </div>
            <div className="cart-attribute cart-variant"><span>Talla</span>{line.size}</div>
            <div className="cart-attribute cart-variant"><span>Color</span>{line.presentation || '—'}</div>
            <label>Cantidad<input aria-label={`Cantidad de ${label}, talla ${line.size}`} type="number" min="1" max={Math.max(1, max)} value={line.quantity}
              disabled={busy || max === 0} onChange={event => {
                const quantity = Number(event.target.value)
                if (Number.isInteger(quantity) && quantity >= 1 && quantity <= max) change(line.variantId, quantity, max)
              }} /></label>
            <div className="cart-attribute cart-subtotal"><span>Subtotal</span>
              <strong>{money(line.quantity * (variant?.finalPrice ?? line.unitPrice))}</strong>
            </div>
            <button className="cart-remove" disabled={busy}
              aria-label={`Quitar ${label}, talla ${line.size}${line.presentation ? ', color ' + line.presentation : ''}`}
              onClick={() => remove(line.variantId)}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5" />
              </svg>
            </button>
          </li>
        })}</ul>
        {priceCheckFailed && <p className="notice" role="status">Algunos precios no se pudieron verificar y pueden haber cambiado.</p>}
        <p className="cart-estimated-total">
          <span>Total estimado</span>
          <strong>{money(total)}</strong>
        </p>
      </div>
      <aside className="consult cart-consult" aria-label="Consulta por WhatsApp">
        <p>Consultar por WhatsApp no reserva las prendas.</p>
        {stockConflict && <p role="alert">Ajusta las cantidades marcadas para continuar.</p>}
        {error && <p role="alert">{error}</p>}
        <button className="primary" type="button" disabled={busy} onClick={consultOnWhatsApp}>
          {busy ? 'Preparando consulta…' : 'Consultar por WhatsApp'}
        </button>
      </aside>
    </div>}
  </>
}
