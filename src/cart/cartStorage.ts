import type { SelectionItem, SelectionLine, SelectionLink } from '../catalog/api'

export interface CartLine extends SelectionLine {
  maxQuantity: number
  code?: number
  imageUrl?: string | null
}
interface PendingLink { fingerprint: string; key: string; link?: SelectionLink }
const cartKey = 'pretty-woman-cart-v1'
const shareKey = 'pretty-woman-selection-v1'

function read(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') as unknown } catch { return null }
}

function write(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* The current page still holds its state. */ }
}

export function readCart(): CartLine[] {
  const value = read(cartKey)
  if (!Array.isArray(value)) return []
  const seen = new Set<number>()
  return value.filter((line): line is CartLine => {
    if (!line || !Number.isSafeInteger(line.variantId) || line.variantId < 1 || seen.has(line.variantId) ||
      !Number.isSafeInteger(line.productId) || typeof line.name !== 'string' || typeof line.size !== 'string' ||
      (line.code !== undefined && !Number.isSafeInteger(line.code)) ||
      (line.imageUrl != null && typeof line.imageUrl !== 'string') ||
      (line.presentation !== null && typeof line.presentation !== 'string') || !Number.isFinite(line.unitPrice) ||
      !Number.isSafeInteger(line.quantity) || line.quantity < 1 || !Number.isSafeInteger(line.maxQuantity) ||
      line.maxQuantity < line.quantity) return false
    seen.add(line.variantId)
    return true
  }).slice(0, 30)
}

export const saveCart = (lines: CartLine[]) => write(cartKey, lines)

export function selectionAttempt(items: SelectionItem[], renew = false): PendingLink {
  const fingerprint = JSON.stringify([...items].sort((a, b) => a.variantId - b.variantId))
  const previous = read(shareKey) as PendingLink | null
  if (!renew && previous?.fingerprint === fingerprint && typeof previous.key === 'string' &&
    (!previous.link || Date.parse(previous.link.expiresAt) > Date.now())) return previous

  const attempt = { key: crypto.randomUUID(), fingerprint }
  write(shareKey, attempt)
  return attempt
}

export function saveSelection(attempt: PendingLink, link: SelectionLink) {
  const current = read(shareKey) as PendingLink | null
  if (current?.key === attempt.key) write(shareKey, { ...attempt, link })
}
