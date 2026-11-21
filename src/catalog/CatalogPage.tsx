import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CartLine } from '../cart/cartStorage'
import type { Filters, Option, Page } from './api'
import { ProductCard } from './ProductCard'
import { useRequest } from './useRequest'

const filterKeys = { categoryId: 'categoryIds', subcategoryId: 'subcategoryIds', sizeId: 'sizeIds' } as const
type FilterKey = keyof typeof filterKeys

function CheckOptions({ options, selected, toggle }: {
  options: Option[]; selected: string[]; toggle: (id: string) => void
}) {
  return options.map(option => <label key={option.id}>
    <input type="checkbox" checked={selected.includes(String(option.id))}
      onChange={() => toggle(String(option.id))} />
    {option.name}
  </label>)
}

export function CatalogPage({ filters, add }: { filters?: Filters; add: (line: CartLine) => string }) {
  const [params, setParams] = useSearchParams()
  const [menuId, setMenuId] = useState<number>()
  const menu = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const navigation = useRef<HTMLElement>(null)
  function selections(key: FilterKey) {
    const multiple = params.getAll(filterKeys[key])
    const single = params.get(key)
    return multiple.length ? multiple : single ? [single] : []
  }

  const categories = selections('categoryId')
  const subcategories = selections('subcategoryId')
  const sizes = selections('sizeId')
  const sort = params.get('sort') ?? ''
  const sale = params.get('onSale') === 'true'
  const activeCategory = filters?.categories.find(option => categories.length === 1 && categories.includes(String(option.id)))
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
      if (Object.hasOwn(filterKeys, key)) next.delete(filterKeys[key as FilterKey])
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }

  function toggle(key: FilterKey, id: string) {
    const selected = selections(key)
    const values = selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id]
    const next = new URLSearchParams(params)
    next.delete('page')
    next.delete(key)
    next.delete(filterKeys[key])
    for (const value of values) next.append(filterKeys[key], value)
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
        <button aria-pressed={!categories.length && !subcategories.length && !sale} onClick={() => {
          setMenuId(undefined)
          update({ categoryId: '', subcategoryId: '', onSale: '' })
        }}>Todo</button>
        {filters?.categories.map(option => <button key={option.id}
          aria-current={categories.includes(String(option.id)) ? 'true' : undefined}
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
          <button aria-pressed={activeCategory?.id === openCategory.id && !subcategories.length}
            onClick={() => chooseCategory(openCategory.id)}>Ver todo</button>
          {openCategory.subcategories.map(option => <button key={option.id}
            aria-pressed={subcategories.includes(String(option.id))}
            onClick={() => chooseCategory(openCategory.id, String(option.id))}>{option.name}</button>)}
        </>}
      </div>
    </nav>
    <h1 className="visually-hidden">{activeCategory?.name ?? 'Catálogo'}</h1>
    <div className="catalog-layout">
      <details className="filters" open={!window.matchMedia('(max-width: 700px)').matches}>
        <summary>Filtros</summary>
        {filters && <>
          <details className="filter-group" open>
            <summary>Talla{sizes.length > 0 && ` (${sizes.length})`}</summary>
            <div className="filter-options">
              {filters.sizeGroups?.length ? filters.sizeGroups.map(group => <fieldset key={group.id}>
                <legend>{group.name}</legend>
                <CheckOptions options={group.sizes} selected={sizes} toggle={id => toggle('sizeId', id)} />
              </fieldset>) : <CheckOptions options={filters.sizes} selected={sizes} toggle={id => toggle('sizeId', id)} />}
            </div>
          </details>
          <details className="filter-group">
            <summary>Categoría{categories.length > 0 && ` (${categories.length})`}</summary>
            <div className="filter-options">
              <CheckOptions options={filters.categories} selected={categories} toggle={id => toggle('categoryId', id)} />
            </div>
          </details>
          <details className="filter-group">
            <summary>Subcategoría{subcategories.length > 0 && ` (${subcategories.length})`}</summary>
            <div className="filter-options">
              {filters.categories.map(option => <fieldset key={option.id}>
                <legend>{option.name}</legend>
                <CheckOptions options={option.subcategories} selected={subcategories} toggle={id => toggle('subcategoryId', id)} />
              </fieldset>)}
            </div>
          </details>
        </>}
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
            <ProductCard key={product.id} product={product} catalog={'?' + params} add={add} sizeIds={sizes} onSale={sale} />
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
