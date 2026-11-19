import { useState } from 'react'
import { instagramUrl, messengerUrl, whatsAppUrl } from './contactLinks'

export function ContactActions({ url, message }: { url: string; message: string }) {
  const [feedback, setFeedback] = useState('')
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setFeedback('Enlace copiado.')
    } catch {
      setFeedback('Selecciona el enlace para copiarlo.')
    }
  }

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ url }) } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) await copy()
      }
    } else await copy()
  }

  return <div className="contact">
    <div className="actions">
      <a className="button primary" href={whatsAppUrl(message + ' ' + url)} target="_blank" rel="noreferrer">WhatsApp</a>
      <a className="button" href={instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
      <a className="button" href={messengerUrl} target="_blank" rel="noreferrer">Messenger</a>
    </div>
    <div className="actions">
      <button onClick={share}>Compartir</button><button onClick={copy}>Copiar enlace</button>
    </div>
    <p role="status">{feedback}</p>
    <input className="share-url" aria-label="Enlace para compartir" value={url} readOnly onFocus={event => event.target.select()} />
  </div>
}
