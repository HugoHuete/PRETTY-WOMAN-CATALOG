import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes, useLocation, useMatch, useParams } from 'react-router-dom'
import type { Filters } from './catalog/api'
import { CatalogPage } from './catalog/CatalogPage'
import { ProductPage } from './catalog/ProductPage'
import { useRequest } from './catalog/useRequest'
import { CartPage } from './cart/CartPage'
import { SharedSelectionPage } from './cart/SharedSelectionPage'
import { readCart, saveCart, type CartLine } from './cart/cartStorage'
import './styles.css'

function ProductRoute({ add, catalogHref }: { add: (line: CartLine) => string; catalogHref: string }) {
  const { productId } = useParams()
  return <ProductPage key={productId} add={add} catalogHref={catalogHref} />
}

function App() {
  const { pathname, state } = useLocation()
  const productRoute = useMatch('/prendas/:productId')
  const cartRoute = useMatch('/carrito')
  const catalogHref = '/' + (typeof state?.catalog === 'string' && state.catalog.startsWith('?') ? state.catalog : '')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const filtersButton = useRef<HTMLButtonElement>(null)
  useEffect(() => setMobileFiltersOpen(false), [pathname])

  const closeMobileFilters = useCallback(() => {
    setMobileFiltersOpen(false)
    filtersButton.current?.focus()
  }, [])

  const [cart, setCart] = useState(readCart)
  const cartQuantity = cart.reduce((sum, line) => sum + line.quantity, 0)
  const { data: filters } = useRequest<Filters>('/filters')
  useEffect(() => saveCart(cart), [cart])

  function add(line: CartLine) {
    const existing = cart.find(item => item.variantId === line.variantId)
    const quantity = (existing?.quantity ?? 0) + line.quantity
    if (quantity > line.maxQuantity) return 'La cantidad supera las existencias disponibles.'
    if (!existing && cart.length >= 30) return 'El carrito admite hasta 30 variantes.'
    setCart(existing ? cart.map(item => item.variantId === line.variantId ? { ...line, quantity } : item) : [...cart, line])
    return 'Prenda agregada al carrito.'
  }

  return <>
    <header className="masthead">
      {pathname === '/' && <button ref={filtersButton} className="mobile-filters-button" type="button"
        aria-label={mobileFiltersOpen ? 'Cerrar filtros' : 'Abrir filtros'} aria-expanded={mobileFiltersOpen}
        aria-controls="catalog-filters" aria-haspopup="dialog" onClick={() => setMobileFiltersOpen(open => !open)}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d={mobileFiltersOpen ? 'm6 6 12 12M18 6 6 18' : 'M4 6h16M4 12h16M4 18h16'} />
        </svg>
      </button>}
      {(cartRoute || productRoute) && <Link className="mobile-catalog-back button"
        to={productRoute ? catalogHref : '/'} aria-label="Volver al catálogo">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5m7 7-7-7 7-7" />
        </svg>
      </Link>}
      <Link className="brand-name" to="/">Pretty Woman Boutique</Link>
      <Link className="button primary cart-link" to="/carrito"
        aria-label={`Carrito, ${cartQuantity} ${cartQuantity === 1 ? 'prenda' : 'prendas'}`}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h3l3 12h11l3-8H6" />
          <circle cx="9" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
        </svg>
        <span aria-hidden="true">{cartQuantity}</span>
      </Link>
    </header>
    <main>
      <Routes>
        <Route path="/" element={<CatalogPage filters={filters} add={add} mobileFiltersOpen={mobileFiltersOpen}
          closeMobileFilters={closeMobileFilters} />} />
        <Route path="/prendas/:productId" element={<ProductRoute add={add} catalogHref={catalogHref} />} />
        <Route path="/carrito" element={<CartPage lines={cart} clear={() => setCart([])}
          change={(id, quantity, maxQuantity) => setCart(current => current.map(line => line.variantId === id ? { ...line, quantity, maxQuantity } : line))}
          remove={id => setCart(current => current.filter(line => line.variantId !== id))} />} />
        <Route path="/selecciones/:id" element={<SharedSelectionPage />} />
        <Route path="*" element={<><h1>Página no encontrada</h1><Link to="/">Ir al catálogo</Link></>} />
      </Routes>
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<BrowserRouter useTransitions={false}><App /></BrowserRouter>)
