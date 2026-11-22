const sharePath = /^\/compartir\/(prendas\/\d+|selecciones\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i

function previewOrigin(value) {
  try {
    const url = new URL(value)
    const local = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if ((url.protocol === 'https:' || local) && !url.username && !url.password &&
      url.pathname === '/' && !url.search && !url.hash) return url
  } catch {
    // Missing or invalid configuration is handled by the caller.
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (!pathname.startsWith('/compartir/')) return env.ASSETS.fetch(request)
    if (!sharePath.test(pathname)) return new Response('Enlace no encontrado.', { status: 404 })
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
    }

    const origin = previewOrigin(env.CATALOG_API_ORIGIN)
    if (!origin) {
      console.error('Catalog preview origin is missing or invalid')
      return new Response('Vista previa no disponible.', { status: 503 })
    }

    const headers = new Headers()
    const clientIp = request.headers.get('CF-Connecting-IP')
    if (clientIp && env.CATALOG_PREVIEW_PROXY_SECRET) {
      headers.set('X-Catalog-Client-IP', clientIp)
      headers.set('X-Catalog-Preview-Key', env.CATALOG_PREVIEW_PROXY_SECRET)
    }

    try {
      const response = await fetch(new URL(pathname, origin), { headers, redirect: 'manual' })
      if (response.status === 429 || response.status >= 500) {
        console.warn('Catalog preview upstream rejected request', { status: response.status })
      }
      if (request.method === 'HEAD') {
        await response.body?.cancel()
        return new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers })
      }
      return response
    } catch (error) {
      console.error('Catalog preview upstream request failed', { errorType: error instanceof Error ? error.name : 'unknown' })
      return new Response('Vista previa no disponible.', { status: 502 })
    }
  },
}
