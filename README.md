# Catálogo público de Pretty Woman

El sitio estático consume el backend de Pretty Woman. Guarda el carrito en el navegador y comparte selecciones mediante enlaces del catálogo con vigencia de 30 días.

## Desarrollo local

1. Inicia el backend con su perfil HTTP en el puerto 5064.
2. Ejecuta `pnpm install` y `pnpm dev` en este repositorio. Vite abre el catálogo en el puerto 5173.
3. Si la API usa otro origen, copia `.env.example` a `.env.local` y ajusta `VITE_API_ORIGIN`.

## Publicación

Configura `VITE_API_ORIGIN` con el origen HTTPS del backend al ejecutar `pnpm build`. Cloudflare Workers publica `dist/` y sirve `index.html` en rutas como `/prendas/123` y `/selecciones/…` mediante `assets.not_found_handling` en `wrangler.jsonc`.

El Worker usa `CATALOG_API_ORIGIN` en `wrangler.jsonc` como origen de la API. Si cambia, ajusta esa variable y `VITE_API_ORIGIN` al mismo origen HTTPS. Las rutas `/compartir/prendas/{id}` y `/compartir/selecciones/{id}` usan ese origen para obtener el HTML de vista previa y se comparten bajo el dominio del catálogo. En desarrollo, Vite reenvía esas rutas a `VITE_API_ORIGIN` o al backend local en el puerto 5064.

Para mantener el límite de peticiones por visitante en las vistas previas, configura el mismo secreto aleatorio como `CATALOG_PREVIEW_PROXY_SECRET` en el Worker y `Catalog__PreviewProxySecret` en el backend. Con ese secreto, el backend puede usar la IP proporcionada por Cloudflare en las solicitudes de vista previa.

Aplica la migración `AddSharedCatalogSelections` y configura `Catalog__Origin` en el backend con `https://catalog.prettywomanboutiquenic.com`. Verifica CORS, los enlaces de contacto y las vistas previas antes de activar el subdominio.
