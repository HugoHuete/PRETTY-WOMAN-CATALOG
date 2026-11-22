import { useEffect, useRef } from 'react'

const dateFormat = new Intl.DateTimeFormat('es-NI', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Managua',
})
const storageKey = 'catalog-discounts-announced'
let announcedEndDate: string | undefined

export function DiscountAnnouncement({ endDate, suppressed, onView }: {
  endDate?: string | null
  suppressed: boolean
  onView: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const endTime = endDate ? Date.parse(endDate) : NaN

  useEffect(() => {
    const panel = dialog.current
    if (!panel || suppressed || !endDate || !(endTime > Date.now()) || announcedEndDate === endDate) return

    try {
      if (sessionStorage.getItem(storageKey) === endDate) return
    } catch {
      // The in-memory value still prevents repeat openings when storage is unavailable.
    }

    panel.showModal()
    announcedEndDate = endDate
    try {
      sessionStorage.setItem(storageKey, endDate)
    } catch {
      // Browsing can continue even when storage is unavailable.
    }
  }, [endDate, endTime, suppressed])

  if (!Number.isFinite(endTime)) return null

  return <dialog ref={dialog} className="discount-announcement" aria-labelledby="discount-announcement-title"
    aria-describedby="discount-announcement-date" onClick={event => {
      if (event.target === event.currentTarget) event.currentTarget.close()
    }}>
    <h2 id="discount-announcement-title">¡Black Week!</h2>
    <p id="discount-announcement-date">Disfruta los descuentos de Black Week hasta el <time dateTime={endDate ?? undefined}>
      {dateFormat.format(endTime)}
    </time> (hora de Nicaragua).</p>
    <form method="dialog">
      <button type="submit" autoFocus>Seguir explorando</button>
      <button type="submit" className="primary" onClick={onView}>Ver descuentos</button>
    </form>
  </dialog>
}
