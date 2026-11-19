import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from './api'
import { Price } from './Price'

export function ProductCard({ product, catalog }: { product: Product; catalog: string }) {
  const [colorId, setColorId] = useState<number>()
  const colors = product.colors ?? []
  const color = colors.find(option => option.id === colorId)
  const photo = color ? color.imageUrl : product.imageUrl

  return <article>
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
  </article>
}
