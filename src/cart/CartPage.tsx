import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, createSelection, request, type Detail, type SelectionConflict, type SelectionLink } from '../catalog/api'
import { ContactActions } from '../catalog/ContactActions'
import { money, shareUrl } from '../catalog/contactLinks'
import { saveSelection, selectionAttempt, type CartLine } from './cartStorage'

export function CartPage({ lines, change, remove }: {
  lines: CartLine[]
  change: (id: number, quantity: number, maximum: number) => void
  remove: (id: number) => void
}) {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [shared, setShared] = useState<{ fingerprint: string; link: SelectionLink }>()
  const [unavailable, setUnavailable] = useState<Record<number, number>>({})
  const [error, setError] = useState('')
  const [details, setDetails] = useState<Record<number, Detail>>({})
  const missingProducts = [...new Set(lines.filter(line => line.code === undefined || line.imageUrl === undefined)
    .map(line => line.productId))].sort((a, b) => a - b).join(',')

  useEffect(() => {
    if (!missingProducts) return
    const controller = new AbortController()
    for (const id of missingProducts.split(',')) {
      request<Detail>('/products/' + id, { signal: controller.signal }).then(detail => {
        if (!controller.signal.aborted) setDetails(current => ({ ...current, [id]: detail }))
      }).catch(() => { /* The saved cart remains usable if a detail cannot load. */ })
    }
    return () => controller.abort()
  }, [missingProducts])
  const items = lines.map(({ variantId, quantity }) => ({ variantId, quantity }))
  const fingerprint = JSON.stringify(items)
  const link = shared?.fingerprint === fingerprint ? shared.link : undefined
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)

  async function prepare() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    setUnavailable({})
    try {
      let attempt = selectionAttempt(items)
      let result = attempt.link
      if (!result) {
        try {
          result = await createSelection(attempt.key, items)
        } catch (failure) {
          const conflict = failure instanceof ApiError && failure.status === 409
            ? failure.data as SelectionConflict | null : null
          if (!conflict?.keyConflict) throw failure
          attempt = selectionAttempt(items, true)
          result = await createSelection(attempt.key, items)
        }
        saveSelection(attempt, result)
      }
      setShared({ fingerprint, link: result })
    } catch (failure) {
      const conflict = failure instanceof ApiError && failure.status === 409 ? failure.data as SelectionConflict | null : null
      if (conflict?.unavailable?.length) {
        setUnavailable(Object.fromEntries(conflict.unavailable.map(item => [item.variantId, item.availableQuantity])))
        setError('Ajusta las cantidades marcadas para continuar.')
      } else setError('No pudimos preparar el enlace. Intenta de nuevo.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return <>
    <Link className="back" to="/">← Seguir explorando</Link>
    <h1>Carrito de consulta</h1>
    {!lines.length ? <p>Tu carrito está vacío.</p> : <div className="cart-layout">
      <div>
        <ul className="cart-items cart-editable">{lines.map(line => {
          const max = unavailable[line.variantId] ?? line.maxQuantity
          const detail = details[line.productId]
          const code = line.code ?? detail?.code
          const label = code === undefined ? 'Ver prenda' : `Código ${code}`
          const presentationId = detail?.variants.find(variant => variant.id === line.variantId)?.presentationId
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
                <strong>{label}</strong>
              </Link>
              {max < line.quantity && <small className="notice">{max ? 'Quedan ' + max + ' unidades.' : 'Variante agotada.'}</small>}
            </div>
            <div className="cart-attribute"><span>Talla</span>{line.size}</div>
            <div className="cart-attribute"><span>Color</span>{line.presentation || '—'}</div>
            <label>Cantidad<input aria-label={`Cantidad de ${label}, talla ${line.size}`} type="number" min="1" max={Math.max(1, max)} value={line.quantity}
              disabled={busy || max === 0} onChange={event => {
                const quantity = Number(event.target.value)
                if (Number.isInteger(quantity) && quantity >= 1 && quantity <= max) change(line.variantId, quantity, max)
              }} /></label>
            <div className="cart-attribute cart-subtotal"><span>Subtotal</span>
              <strong>{money(line.quantity * line.unitPrice)}</strong>
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
        <p className="total">Total estimado <strong>{money(total)}</strong></p>
      </div>
      <aside className="consult">
        <h2>Consultar por estas prendas</h2>
        <p>El enlace dura 30 días. Compartir tu selección no reserva las prendas.</p>
        {error && <p role="alert">{error}</p>}
        {link && Date.parse(link.expiresAt) > Date.now()
          ? <ContactActions url={shareUrl('selecciones', link.id)} message="Hola, quisiera consultar por esta selección de prendas." />
          : <button className="primary" disabled={busy} onClick={prepare}>{busy ? 'Preparando…' : 'Preparar enlace'}</button>}
      </aside>
    </div>}
  </>
}
