import { useEffect, useState } from 'react'
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
  const [previewIndex, setPreviewIndex] = useState<number>()
  const colors = product.colors ?? []
  const pictures = colors.filter(option => option.imageUrl)
  const cover = product.imageUrl ? pictures.find(option => option.imageUrl === product.imageUrl) : undefined
  const selected = colors.find(option => option.id === colorId) ?? cover
  const preview = previewIndex === undefined ? undefined : pictures[previewIndex]
  const color = preview ?? selected
  const photo = color ? color.imageUrl : product.imageUrl
  const previewing = previewIndex !== undefined

  useEffect(() => {
    if (!previewing || pictures.length < 2) return
    const timer = window.setInterval(() => {
      setPreviewIndex(index => index === undefined ? undefined : (index + 1) % pictures.length)
    }, 1100)
    return () => window.clearInterval(timer)
  }, [previewing, pictures.length])

  return <article className="product-card">
    <Link to={'/prendas/' + product.id} state={{ catalog }}>
      <div onPointerEnter={event => {
        if (event.pointerType !== 'mouse' || pictures.length < 2 ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const current = pictures.findIndex(option => option.id === selected?.id)
        setPreviewIndex((current + 1) % pictures.length)
      }} onPointerLeave={() => setPreviewIndex(undefined)} onPointerCancel={() => setPreviewIndex(undefined)}>
        {photo ? <img src={photo} alt={[product.name, color?.name].filter(Boolean).join(' · ')} loading="lazy" />
          : <div className="no-photo">{color ? 'Sin foto de este color' : 'Sin foto'}</div>}
      </div>
      <h2>Código {product.code}</h2>
    </Link>
    <Price original={product.originalPrice} final={product.finalPrice} range={product.hasPriceRange} />
    <small>{product.sizes.join(' · ')}</small>
    {colors.length > 1 && <div className="card-colors" role="group" aria-label={`Colores del código ${product.code}`}>
      {colors.map(option => <button key={option.id} type="button" aria-pressed={option.id === color?.id}
        onClick={() => setColorId(option.id)}>
        {option.name || 'Sin color especificado'}
      </button>)}
    </div>}
    <div className="card-actions">
      <button className="card-add" type="button" aria-haspopup="dialog"
        aria-label={`Agregar al carrito: código ${product.code}`} onClick={() => setQuickAddOpen(true)}>
        Agregar al carrito
      </button>
    </div>
    {quickAddOpen && <QuickAdd productId={product.id} code={product.code} colorId={selected?.id}
      sizeIds={sizeIds} onSale={onSale} add={add} close={() => setQuickAddOpen(false)} />}
  </article>
}
