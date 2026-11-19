import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Filters, Page } from './api'
import { ProductCard } from './ProductCard'
import { useRequest } from './useRequest'

export function CatalogPage({ filters }: { filters?: Filters }) {
  const [params, setParams] = useSearchParams()
  const [menuId, setMenuId] = useState<number>()
  const menu = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const navigation = useRef<HTMLElement>(null)
  const category = params.get('categoryId') ?? ''
  const subcategory = params.get('subcategoryId') ?? ''
  const size = params.get('sizeId') ?? ''
  const sort = params.get('sort') ?? ''
  const sale = params.get('onSale') === 'true'
  const activeCategory = filters?.categories.find(option => String(option.id) === category)
  const openCategory = filters?.categories.find(option => option.id === menuId)
  const { data, error } = useRequest<Page>('/products?' + params)

  function positionMenu() {
    if (!trigger.current || !navigation.current) return
    const left = trigger.current.getBoundingClientRect().left - navigation.current.getBoundingClientRect().left
    menu.current?.style.setProperty('--subcategory-anchor', `${left}px`)
  }

  useEffect(() => {
    if (menuId === undefined) return
    window.addEventListener('resize', positionMenu)
    return () => window.removeEventListener('resize', positionMenu)
  }, [menuId])

  function openMenu(button: HTMLButtonElement, id: number) {
    trigger.current = button
    positionMenu()
    setMenuId(id)
  }

  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params)
    next.delete('page')
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }

  function chooseCategory(id: number, subcategoryId = '') {
    trigger.current?.focus()
    setMenuId(undefined)
    update({ categoryId: String(id), subcategoryId })
  }

  return <>
    <nav ref={navigation} className="category-navigation" aria-label="Categorías"
      onPointerLeave={event => {
        if (event.pointerType === 'mouse' && !menu.current?.contains(document.activeElement)) setMenuId(undefined)
      }} onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setMenuId(undefined)
      }} onKeyDown={event => {
        if (event.key !== 'Escape' || !openCategory) return
        trigger.current?.focus()
        setMenuId(undefined)
      }}>
      <div className="categories" onScroll={positionMenu}>
        <button aria-pressed={!category && !sale} onClick={() => {
          setMenuId(undefined)
          update({ categoryId: '', subcategoryId: '', onSale: '' })
        }}>Todo</button>
        {filters?.categories.map(option => <button key={option.id}
          aria-current={String(option.id) === category ? 'true' : undefined}
          aria-expanded={menuId === option.id} aria-controls="catalog-subcategories"
          onPointerEnter={event => {
            if (event.pointerType !== 'mouse' || menu.current?.contains(document.activeElement)) return
            openMenu(event.currentTarget, option.id)
          }} onClick={event => {
            openMenu(event.currentTarget, option.id)
            if (event.detail === 0) requestAnimationFrame(() => menu.current?.querySelector('button')?.focus())
          }}>{option.name}</button>)}
        <button className="sale-link" aria-pressed={sale} onClick={() => {
          setMenuId(undefined)
          update({ categoryId: '', subcategoryId: '', onSale: sale ? '' : 'true' })
        }}>En descuento</button>
      </div>
      <div id="catalog-subcategories" className="subcategories" ref={menu} hidden={!openCategory}
        role="group" aria-label={openCategory?.name}>
        {openCategory && <>
          <button aria-pressed={activeCategory?.id === openCategory.id && !subcategory}
            onClick={() => chooseCategory(openCategory.id)}>Ver todo</button>
          {openCategory.subcategories.map(option => <button key={option.id}
            aria-pressed={String(option.id) === subcategory}
            onClick={() => chooseCategory(openCategory.id, String(option.id))}>{option.name}</button>)}
        </>}
      </div>
    </nav>
    <h1 className="visually-hidden">{activeCategory?.name ?? 'Catálogo'}</h1>
    <div className="catalog-layout">
      <details className="filters" open={!window.matchMedia('(max-width: 700px)').matches}>
        <summary>Filtros</summary>
        <label htmlFor="size">Talla</label>
        <select id="size" value={size} onChange={event => update({ sizeId: event.target.value })}>
          <option value="">Todas</option>
          {filters?.sizeGroups
            ? filters.sizeGroups.map(group => <optgroup key={group.id} label={group.name}>
              {group.sizes.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </optgroup>)
            : filters?.sizes.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={sale}
          onChange={event => update({ onSale: event.target.checked ? 'true' : '' })} /> Solo en descuento</label>
        <button className="text-button" onClick={() => setParams(sort ? { sort } : {})}>Limpiar filtros</button>
      </details>
      <div className="sort">
        <span role="status">{data ? data.totalCount + (data.totalCount === 1 ? ' prenda' : ' prendas') : ''}</span>
        <label>Ordenar por <select value={sort} onChange={event => update({ sort: event.target.value })}>
          <option value="">Más recientes</option><option value="priceAsc">Menor precio</option><option value="priceDesc">Mayor precio</option>
        </select></label>
      </div>
      <section className="catalog-results" aria-label="Prendas">
        {error ? <p role="alert">No pudimos cargar las prendas. <button onClick={() => window.location.reload()}>Reintentar</button></p>
          : !data ? <p role="status">Cargando prendas…</p>
          : data.items.length ? <div className="products">{data.items.map(product =>
            <ProductCard key={product.id} product={product} catalog={'?' + params} />
          )}</div> : <p>No hay prendas con estos filtros.</p>}
        {data && (data.page > 1 || data.totalCount > data.pageSize) && <nav className="pagination" aria-label="Páginas">
          <button disabled={data.page <= 1} onClick={() => update({ page: String(data.page - 1) })}>Anterior</button>
          <span>Página {data.page}</span>
          <button disabled={data.page * data.pageSize >= data.totalCount}
            onClick={() => update({ page: String(data.page + 1) })}>Siguiente</button>
        </nav>}
      </section>
    </div>
  </>
}
