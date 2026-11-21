import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CartLine } from '../cart/cartStorage'
import type { Filters, Option, Page } from './api'
import { ProductCard } from './ProductCard'
import { useRequest } from './useRequest'

const filterKeys = { categoryId: 'categoryIds', subcategoryId: 'subcategoryIds', sizeId: 'sizeIds' } as const
type FilterKey = keyof typeof filterKeys

function searchKey(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

function CheckOptions({ options, selected, toggle }: {
  options: Option[]; selected: string[]; toggle: (id: string) => void
}) {
  return options.map(option => <label key={option.id}>
    <input type="checkbox" checked={selected.includes(String(option.id))}
      onChange={() => toggle(String(option.id))} />
    {option.name}
  </label>)
}

export function CatalogPage({ filters, add, mobileFiltersOpen, closeMobileFilters }: {
  filters?: Filters; add: (line: CartLine) => string; mobileFiltersOpen: boolean; closeMobileFilters: () => void
}) {
  const [params, setParams] = useSearchParams()
  const [categorySearch, setCategorySearch] = useState('')
  const [menuId, setMenuId] = useState<number>()
  const menu = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const navigation = useRef<HTMLElement>(null)
  const drawer = useRef<HTMLDialogElement>(null)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches)

  useEffect(() => {
    const viewport = window.matchMedia('(max-width: 700px)')
    const update = () => setIsMobile(viewport.matches)
    viewport.addEventListener('change', update)
    update()
    return () => viewport.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const panel = drawer.current
    if (!panel) {
      if (mobileFiltersOpen) closeMobileFilters()
      return
    }
    if (mobileFiltersOpen && !panel.open) panel.showModal()
    if (!mobileFiltersOpen && panel.open) panel.close()
  }, [isMobile, mobileFiltersOpen, closeMobileFilters])

  function selections(key: FilterKey) {
    const multiple = params.getAll(filterKeys[key])
    const single = params.get(key)
    return multiple.length ? multiple : single ? [single] : []
  }

  const categories = selections('categoryId')
  const requestedSubcategories = selections('subcategoryId')
  const matchAnyCategory = params.get('matchAnyCategory') === 'true'
  const wholeCategories = matchAnyCategory || !requestedSubcategories.length ? categories : []
  // Legacy URLs intersect category and subcategory filters.
  const subcategories = !matchAnyCategory && categories.length && requestedSubcategories.length
    ? (filters?.categories ?? []).filter(category => categories.includes(String(category.id)))
      .flatMap(category => category.subcategories.map(option => String(option.id)))
      .filter(id => requestedSubcategories.includes(id))
    : requestedSubcategories
  const sizes = selections('sizeId')
  const search = searchKey(categorySearch)
  const visibleCategories = filters?.categories.flatMap(category => {
    if (searchKey(category.name).includes(search)) return [{ category, visibleChildren: category.subcategories }]
    const visibleChildren = category.subcategories.filter(option => searchKey(option.name).includes(search))
    return visibleChildren.length ? [{ category, visibleChildren }] : []
  }) ?? []
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

  function toggleCategory(id: string, children: string[], child?: string) {
    const existingChildren = children.filter(value => subcategories.includes(value))
    const whole = wholeCategories.includes(id)
    const otherCategories = wholeCategories.filter(value => value !== id)
    const otherChildren = subcategories.filter(value => !children.includes(value))
    const selected = whole ? children : existingChildren
    const chosen = child === undefined ? [] : selected.includes(child)
      ? selected.filter(value => value !== child) : [...selected, child]
    const chooseWhole = child === undefined && !whole
    const next = new URLSearchParams(params)
    for (const key of ['page', 'categoryId', 'categoryIds', 'subcategoryId', 'subcategoryIds', 'matchAnyCategory']) next.delete(key)
    for (const value of otherCategories) next.append('categoryIds', value)
    if (chooseWhole) next.append('categoryIds', id)
    for (const value of [...otherChildren, ...(chooseWhole ? [] : chosen)]) next.append('subcategoryIds', value)
    if (next.has('categoryIds') && next.has('subcategoryIds')) next.set('matchAnyCategory', 'true')
    setParams(next)
  }

  function chooseCategory(id: number, subcategoryId = '') {
    trigger.current?.focus()
    setMenuId(undefined)
    update({ categoryId: String(id), subcategoryId, matchAnyCategory: '' })
  }

  const filterOptions = <>
    {filters && <>
      <details className="filter-group">
        <summary>Categorías</summary>
        <input className="category-search" type="search" aria-label="Buscar categorías o subcategorías"
          placeholder="Buscar…" value={categorySearch} onChange={event => setCategorySearch(event.target.value)} />
        <div className="filter-options category-options">
          {!visibleCategories.length && <p role="status">No hay coincidencias.</p>}
          {visibleCategories.map(({ category: option, visibleChildren }) => {
            const id = String(option.id)
            const children = option.subcategories.map(item => String(item.id))
            const whole = wholeCategories.includes(id)
            const selected = whole ? children : subcategories
            const some = !whole && children.some(child => selected.includes(child))
            return <fieldset key={id}>
              <legend className="visually-hidden">{option.name}</legend>
              <label className="category-check">
                <input type="checkbox" checked={whole} ref={input => { if (input) input.indeterminate = some }}
                  onChange={() => toggleCategory(id, children)} />
                {option.name}
              </label>
              <div className="category-children">
                <CheckOptions options={visibleChildren} selected={selected}
                  toggle={child => toggleCategory(id, children, child)} />
              </div>
            </fieldset>
          })}
        </div>
      </details>
      <details className="filter-group" open={!isMobile}>
        <summary>Talla{sizes.length > 0 && ` (${sizes.length})`}</summary>
        <div className="filter-options">
          {filters.sizeGroups?.length ? filters.sizeGroups.map(group => <fieldset key={group.id}>
            <legend>{group.name}</legend>
            <CheckOptions options={group.sizes} selected={sizes} toggle={id => toggle('sizeId', id)} />
          </fieldset>) : <CheckOptions options={filters.sizes} selected={sizes} toggle={id => toggle('sizeId', id)} />}
        </div>
      </details>
    </>}
    <button className="sale-filter" type="button" aria-pressed={sale}
      onClick={() => update({ onSale: sale ? '' : 'true' })}>Descuentos</button>
  </>
  const clearFilters = <button className="clear-filters" type="button" onClick={() => {
    setCategorySearch('')
    setParams(sort ? { sort } : {})
  }}>Limpiar filtros</button>

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
      <div className="category-strip">
        <div className="categories" onScroll={positionMenu}>
          <button aria-pressed={!categories.length && !subcategories.length && !sale} onClick={() => {
            setMenuId(undefined)
            update({ categoryId: '', subcategoryId: '', matchAnyCategory: '', onSale: '' })
          }}>Todo</button>
          {filters?.categories.map(option => <button key={option.id}
            aria-current={categories.includes(String(option.id)) ? 'true' : undefined}
            aria-expanded={menuId === option.id} aria-controls="catalog-subcategories"
            onPointerEnter={event => {
              if (event.pointerType !== 'mouse' || menu.current?.contains(document.activeElement)) return
              openMenu(event.currentTarget, option.id)
            }} onClick={event => {
              openMenu(event.currentTarget, option.id)
              if (event.detail === 0) requestAnimationFrame(() => menu.current?.querySelector<HTMLButtonElement>('.subcategory-all')?.focus())
            }}>{option.name}</button>)}
          <button className="sale-link" aria-pressed={sale} onClick={() => {
            setMenuId(undefined)
            update({ categoryId: '', subcategoryId: '', matchAnyCategory: '', onSale: sale ? '' : 'true' })
          }}>En descuento</button>
        </div>
      </div>
      <div id="catalog-subcategories" className="subcategories" ref={menu} hidden={!openCategory}
        role="group" aria-labelledby="subcategory-title">
        {openCategory && <>
          <div className="subcategory-header">
            <span id="subcategory-title">{openCategory.name}</span>
            <button className="subcategory-close" type="button" aria-label="Cerrar subcategorías"
              onClick={() => {
                trigger.current?.focus()
                setMenuId(undefined)
              }}><span aria-hidden="true">×</span></button>
          </div>
          <button className="subcategory-all" aria-pressed={activeCategory?.id === openCategory.id && !subcategories.length}
            onClick={() => chooseCategory(openCategory.id)}>Ver todo <span aria-hidden="true">›</span></button>
          <div className="subcategory-options" key={openCategory.id}>
            {openCategory.subcategories.map(option => <button key={option.id}
              aria-pressed={subcategories.includes(String(option.id))}
              onClick={() => chooseCategory(openCategory.id, String(option.id))}>{option.name}</button>)}
          </div>
        </>}
      </div>
    </nav>
    <h1 className="visually-hidden">{activeCategory?.name ?? 'Catálogo'}</h1>
    {isMobile && <dialog id="catalog-filters" ref={drawer} className="mobile-filter-drawer"
      aria-labelledby="mobile-filter-title" onCancel={event => {
        event.preventDefault()
        closeMobileFilters()
      }} onClick={event => {
        if (event.target === event.currentTarget) closeMobileFilters()
      }}>
      <div className="drawer-content">
        <div className="drawer-header">
          <h2 id="mobile-filter-title">Filtros</h2>
          <button className="drawer-close" type="button" aria-label="Cerrar filtros" onClick={closeMobileFilters}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="drawer-body">{filterOptions}</div>
        <div className="drawer-actions">
          {clearFilters}
          <button className="primary" type="button" onClick={closeMobileFilters}>Ver prendas</button>
        </div>
      </div>
    </dialog>}
    <div className="catalog-layout">
      {!isMobile && <details className="filters" open>
        <summary>Filtros</summary>
        {filterOptions}
        {clearFilters}
      </details>}
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
