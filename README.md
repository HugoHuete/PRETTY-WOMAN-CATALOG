# Catálogo público de Pretty Woman

El sitio estático consume el backend de Pretty Woman. Guarda el carrito en el navegador y comparte selecciones mediante enlaces del backend con vigencia de 30 días.

## Desarrollo local

1. Inicia el backend con su perfil HTTP en el puerto 5064.
2. Ejecuta `pnpm install` y `pnpm dev` en este repositorio. Vite abre el catálogo en el puerto 5173.
3. Si la API usa otro origen, copia `.env.example` a `.env.local` y ajusta `VITE_API_ORIGIN`.

## Publicación

Configura `VITE_API_ORIGIN` con el origen HTTPS del backend al ejecutar `pnpm build`. Publica `dist/` y configura el alojamiento para servir `index.html` en rutas de la aplicación como `/prendas/123` y `/selecciones/…`. Se incluye un archivo `_redirects` para los alojamientos compatibles.

Aplica la migración `AddSharedCatalogSelections` y configura `Catalog__Origin` en el backend con `https://catalog.prettywomanboutiquenic.com`. Verifica CORS, los enlaces de contacto y las vistas previas antes de activar el subdominio.
