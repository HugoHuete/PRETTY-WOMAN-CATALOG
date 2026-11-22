export interface Option { id: number; name: string }
export interface Filters {
  categories: (Option & { subcategories: Option[] })[]
  sizes: Option[]
  sizeGroups?: (Option & { sizes: Option[] })[]
}
export interface Product {
  id: number; code: number; name: string; imageUrl: string | null; sizes: string[]
  originalPrice: number; finalPrice: number; hasPriceRange: boolean
  colors?: { id: number; name: string | null; imageUrl: string | null; hexCode?: string | null }[]
}
export interface Variant {
  id: number; sizeId: number; size: string; presentationId: number; presentation: string | null
  maxQuantity: number; originalPrice: number; finalPrice: number
}
export interface Detail {
  id: number; code: number; name: string; soldOut: boolean
  images: { url: string; presentationId: number | null }[]; variants: Variant[]
}
export interface Page { items: Product[]; totalCount: number; page: number; pageSize: number }
export interface SelectionLink { id: string; expiresAt: string }
export interface SelectionItem { variantId: number; quantity: number }
export interface SelectionLine extends SelectionItem {
  productId: number; name: string; size: string; presentation: string | null; unitPrice: number
}
export interface SharedSelection extends SelectionLink {
  items: { original: SelectionLine; availableQuantity: number; currentPrice: number | null }[]
}
export interface SelectionConflict { keyConflict?: boolean; unavailable?: { variantId: number; availableQuantity: number }[] }

export const apiOrigin = (import.meta.env.VITE_API_ORIGIN ?? (import.meta.env.DEV ? 'http://localhost:5064' : '')).replace(/\/$/, '')

export class ApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super('La solicitud al catálogo no se pudo completar.')
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiOrigin + '/api/v1/catalog' + path, init)
  if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null))
  return response.json() as Promise<T>
}

export function createSelection(key: string, items: SelectionItem[], signal?: AbortSignal) {
  return request<SelectionLink>('/selections?revalidateExisting=true', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ items }),
  })
}
