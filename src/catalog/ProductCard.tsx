import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CartLine } from '../cart/cartStorage'
import type { Product } from './api'
import { Price } from './Price'
import { QuickAdd } from './QuickAdd'

export function ProductCard({ product, catalog, add, sizeIds, onSale }: {
  product: Product; catalog: string; add: (line: CartLine) => string; sizeIds: string[]; onSale: boolean
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [colorId, setColorId] = useState<number>()
  const colors = product.colors ?? []
  const color = colors.find(option => option.id === colorId)
  const photo = color ? color.imageUrl : product.imageUrl

  return <article className="product-card">
    <Link to={'/prendas/' + product.id} state={{ catalog }}>
      {photo ? <img src={photo} alt={[product.name, color?.name].filter(Boolean).join(' · ')} loading="lazy" />
        : <div className="no-photo">{color ? 'Sin foto de este color' : 'Sin foto'}</div>}
      <h2>Código {product.code}</h2>
    </Link>
    <Price original={product.originalPrice} final={product.finalPrice} range={product.hasPriceRange} />
    <small>{product.sizes.join(' · ')}</small>
    {colors.length > 1 && <div className="card-colors" role="group" aria-label={`Colores del código ${product.code}`}>
      {colors.map(option => <button key={option.id} type="button" aria-pressed={option.id === colorId}
        onClick={() => setColorId(option.id === colorId ? undefined : option.id)}>
        {option.name || 'Sin color especificado'}
      </button>)}
    </div>}
    <div className="card-actions">
      <button className="card-add" type="button" aria-haspopup="dialog"
        aria-label={`Agregar al carrito: código ${product.code}`} onClick={() => setQuickAddOpen(true)}>
        Agregar al carrito
      </button>
    </div>
    {quickAddOpen && <QuickAdd productId={product.id} code={product.code} colorId={colorId}
      sizeIds={sizeIds} onSale={onSale} add={add} close={() => setQuickAddOpen(false)} />}
  </article>
}
