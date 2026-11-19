import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import type { Filters } from './catalog/api'
import { CatalogPage } from './catalog/CatalogPage'
import { ProductPage } from './catalog/ProductPage'
import { useRequest } from './catalog/useRequest'
import { CartPage } from './cart/CartPage'
import { SharedSelectionPage } from './cart/SharedSelectionPage'
import { readCart, saveCart, type CartLine } from './cart/cartStorage'
import './styles.css'

function ProductRoute({ add }: { add: (line: CartLine) => string }) {
  const { productId } = useParams()
  return <ProductPage key={productId} add={add} />
}

function App() {
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
      <Link className="brand" to="/"><img src="/logo.png" alt="Pretty Woman Boutique" /></Link>
      <span className="brand-name" aria-hidden="true">Pretty Woman Boutique</span>
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
        <Route path="/" element={<CatalogPage filters={filters} />} />
        <Route path="/prendas/:productId" element={<ProductRoute add={add} />} />
        <Route path="/carrito" element={<CartPage lines={cart}
          change={(id, quantity, maxQuantity) => setCart(current => current.map(line => line.variantId === id ? { ...line, quantity, maxQuantity } : line))}
          remove={id => setCart(current => current.filter(line => line.variantId !== id))} />} />
        <Route path="/selecciones/:id" element={<SharedSelectionPage />} />
        <Route path="*" element={<><h1>Página no encontrada</h1><Link to="/">Ir al catálogo</Link></>} />
      </Routes>
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<BrowserRouter useTransitions={false}><App /></BrowserRouter>)
