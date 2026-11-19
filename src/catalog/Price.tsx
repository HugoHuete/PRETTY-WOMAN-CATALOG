import { money } from './contactLinks'

export function Price({ original, final, range = false }: { original: number; final: number; range?: boolean }) {
  return <span className="price">
    {range && 'Desde '}{money(final)} {original > final && <del>{money(original)}</del>}
  </span>
}
