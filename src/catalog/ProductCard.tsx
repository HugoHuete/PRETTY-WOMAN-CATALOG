import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CartLine } from '../cart/cartStorage'
import type { Product } from './api'
import { Price } from './Price'
import { QuickAdd } from './QuickAdd'
import { productInquiryMessage, shareUrl, whatsAppUrl } from './contactLinks'

export function ProductCard({ product, catalog, add, sizeIds, onSale }: {
  product: Product; catalog: string; add: (line: CartLine) => string; sizeIds: string[]; onSale: boolean
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [colorId, setColorId] = useState<number>()
  const [previewIndex, setPreviewIndex] = useState<number>()
  const colors = product.colors ?? []
  const namedColors = colors.filter((option): option is typeof option & { name: string } => option.name !== null)
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
    {namedColors.length > 0 && <>
      <div className="card-colors" role="group" aria-label={`Colores del código ${product.code}`}>
        {namedColors.map(option => {
          const name = option.name
          const hex = option.hexCode && /^#[0-9a-f]{6}$/i.test(option.hexCode) ? option.hexCode : undefined
          return <button key={option.id} type="button" aria-pressed={option.id === color?.id}
            className={hex ? 'color-swatch' : undefined} aria-label={name} title={name}
            onClick={() => setColorId(option.id)}>
            {hex ? <span aria-hidden="true" style={{ backgroundColor: hex }} /> : name}
          </button>
        })}
      </div>
    </>}
    <div className="card-actions">
      <button className="card-add" type="button" aria-haspopup="dialog"
        aria-label={`Agregar al carrito: código ${product.code}`} title="Agregar al carrito" onClick={() => setQuickAddOpen(true)}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h3l3 12h11l3-8h-5M6 7h5m3-3v6m-3-3h6" />
          <circle cx="9" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
        </svg>
      </button>
      <a className="button card-share"
        href={whatsAppUrl(productInquiryMessage(product.code) + ' ' + shareUrl('prendas', product.id))}
        target="_blank" rel="noreferrer" title="Consultar por WhatsApp"
        aria-label={`Consultar por WhatsApp: código ${product.code}`}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 0 1-13.4 7.9L3 21l1.1-4.6A9 9 0 1 1 21 12Z" />
          <path d="M8.3 7.5c-.8.5-1 1.4-.6 2.5a11 11 0 0 0 6.3 6.3c1.1.4 2 .2 2.5-.6l.5-.8-2.8-1.5-.9 1a7 7 0 0 1-3.7-3.7l1-.9-1.5-2.8Z" />
        </svg>
      </a>
    </div>
    {quickAddOpen && <QuickAdd productId={product.id} code={product.code} colorId={selected?.id}
      sizeIds={sizeIds} onSale={onSale} add={add} close={() => setQuickAddOpen(false)} />}
  </article>
}
