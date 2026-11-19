import { Link, useParams } from 'react-router-dom'
import { ApiError, type SharedSelection } from '../catalog/api'
import { money } from '../catalog/contactLinks'
import { useRequest } from '../catalog/useRequest'

export function SharedSelectionPage() {
  const { id } = useParams()
  const { data, error } = useRequest<SharedSelection>('/selections/' + encodeURIComponent(id ?? ''))
  const total = data?.items.reduce((sum, item) => sum + item.original.quantity * item.original.unitPrice, 0)
  return <>
    <Link className="back" to="/">← Ir al catálogo</Link>
    <h1>Selección de prendas</h1>
    {error ? <p role="alert">{error instanceof ApiError && error.status === 410 ? 'Este enlace venció.'
      : error instanceof ApiError && error.status === 404 ? 'No encontramos esta selección.' : 'No pudimos abrir la selección.'}</p>
      : !data ? <p role="status">Cargando selección…</p> : <>
        <ul className="cart-items">{data.items.map(({ original, availableQuantity, currentPrice }) => <li key={original.variantId}>
          <div><Link to={'/prendas/' + original.productId}>{original.name}</Link>
            <small>{[original.size, original.presentation, original.quantity + ' ud.'].filter(Boolean).join(' · ')}</small>
            {availableQuantity < original.quantity && <small className="notice">
              {availableQuantity ? 'Quedan ' + availableQuantity + ' unidades.' : 'Variante agotada.'}
            </small>}
            {currentPrice !== null && currentPrice !== original.unitPrice && <small className="notice">Precio actual {money(currentPrice)} por unidad.</small>}
          </div>
          <strong>{money(original.quantity * original.unitPrice)}</strong>
        </li>)}</ul>
        <p className="total">Total al compartir <strong>{money(total ?? 0)}</strong></p>
      </>}
  </>
}
