# Plan de implementación del catálogo público

> Ejecutar las tareas en orden con superpowers:executing-plans o superpowers:subagent-driven-development. Mantener los cambios sin commits intermedios y aplicar la política Git del proyecto al terminar el trabajo verificado.

**Objetivo.** Publicar un catálogo de prendas disponibles y permitir consultas por una ficha o una selección compartida.

**Arquitectura.** React, TypeScript y Vite para el sitio estático. ASP.NET Core y la persistencia existente de Pretty Woman para las consultas de catálogo, las selecciones y los metadatos para compartir.

**Diseño.** [Catálogo público de Pretty Woman](../specs/2026-11-19-catalogo-publico-design.md).

## Restricciones

- Publicar el sitio en `catalog.prettywomanboutiquenic.com`. Configurar la URL del backend por entorno.
- Abrir directamente en el catálogo, con categorías y subcategorías en el encabezado. Mostrar precios en córdobas y ordenar inicialmente por código descendente.
- Guardar el carrito en el navegador. Crear selecciones únicamente al compartir y mantenerlas accesibles durante 30 días. La consulta no cobra ni reserva stock.
- Usar el número `+505 8615 3754`, Instagram `@prettywoman.ni` y Facebook `prettywomanbni`. Priorizar WhatsApp, seguido de Instagram y Messenger.

## Casos prioritarios para verificar

- Una talla agotada en un color no coincide con un filtro que exige disponibilidad en esa talla.
- Una promoción por presentación tiene prioridad sobre una promoción general vigente según las reglas del backend.
- Dos variantes con distinto precio final muestran «Desde C$…» en el listado y el importe exacto en la ficha y el carrito.
- Dos reintentos de la misma creación devuelven el mismo enlace. Un enlace vencido se puede regenerar desde el carrito local.
- Una selección previa se puede consultar si cambió el precio o el stock, y sigue mostrando los importes originales junto a los avisos vigentes.

## 1. Catálogo público en el backend

**Archivos.** Crear `src/PrettyWoman.Api/Controllers/PublicCatalogController.cs`, `src/PrettyWoman.Application/Services/PublicCatalogService.cs` y los contratos en `src/PrettyWoman.Application/DTOs/PublicCatalog/`, en el repositorio del backend. Extraer la regla de precio de `ProductService.cs` para compartirla entre las consultas administrativas y públicas.

- [ ] Agregar casos de integración en `tests/PrettyWoman.Api.IntegrationTests/PublicCatalogTests.cs` para filtros combinados, orden por precio final, promociones por presentación, una ficha agotada accesible sin autenticación y protección de los endpoints administrativos. Comprobar que las respuestas públicas omiten costos y existencias comprometidas.
- [ ] Implementar `GET /api/v1/catalog/products` con `categoryId`, `subcategoryId`, `sizeId`, `onSale`, `sort` (`newest`, `priceAsc`, `priceDesc`), `page` y `pageSize`. Filtrar por variantes disponibles que cumplan conjuntamente talla y descuento. Calcular el precio de orden a partir de las variantes que coinciden y desempatar por código descendente.
- [ ] Implementar `GET /api/v1/catalog/products/{productId}` y `GET /api/v1/catalog/filters`. El listado devuelve identificador, código, nombre público, foto, tallas y precio original/final. El detalle incluye presentaciones, variantes, precios y máximo por variante para el carrito. El endpoint de filtros entrega categorías con sus subcategorías y el catálogo de tallas.
- [ ] Ejecutar `dotnet test PrettyWoman.slnx` desde el backend y comprobar que pasan los casos públicos y las pruebas de productos existentes.

## 2. Cuadrícula y fichas del sitio estático

**Archivos.** Crear la configuración Vite en el repositorio del catálogo, `src/catalog/api.ts`, `src/catalog/CatalogPage.tsx`, `src/catalog/ProductPage.tsx` y una hoja de estilos compartida.

- [ ] Conectar `/` y `/prendas/:productId` a la API. Mantener filtros, orden y página en la URL. Cambiar de categoría limpia una subcategoría incompatible. Mostrar estados de carga, error, resultados vacíos y ficha agotada. Usar la paleta, el logo y la estructura del boceto aprobado.
- [ ] Mostrar el precio final y el original cuando hay descuento. Si hay varios precios, mostrar «Desde C$…» con el menor precio final aplicable y cambiar al precio exacto al seleccionar la variante.
- [ ] Verificar que las rutas profundas abren por URL directa, que el listado conserva filtros al volver desde una ficha y que la navegación funciona en móvil y escritorio. Ejecutar `pnpm build`.

## 3. Carrito compartido en el backend

**Archivos.** Crear `src/PrettyWoman.Domain/Entities/SharedCatalogSelection.cs`, `src/PrettyWoman.Application/Services/SharedCatalogSelectionService.cs` y `src/PrettyWoman.Api/Controllers/SharedCatalogSelectionsController.cs`. Registrar la entidad en el contexto de infraestructura y generar la migración.

- [ ] Agregar casos en `tests/PrettyWoman.Api.IntegrationTests/SharedCatalogSelectionTests.cs` para cantidades inválidas o insuficientes, concurrencia con la misma clave, expiración a los 30 días y cambios posteriores de stock y precio.
- [ ] Implementar `POST /api/v1/catalog/selections` con `Idempotency-Key` y `items: [{ variantId, quantity }]`. Validar variantes y cantidades, cotizar en el backend y guardar una copia de nombres, variantes, cantidades e importes. Responder con `id` y `expiresAt`. Garantizar unicidad de la clave y rechazar su reutilización con una selección distinta.
- [ ] Implementar `GET /api/v1/catalog/selections/{id}`. Devolver selección original y avisos de stock y precio actuales. Responder con HTTP 410 para enlaces vencidos y 404 para identificadores inexistentes. Aplicar límites al tamaño de la solicitud y a la frecuencia de creación.
- [ ] Ejecutar `dotnet test PrettyWoman.slnx` y verificar la migración sobre una base local.

## 4. Carrito local, contacto y vistas previas

**Archivos.** Crear `src/cart/cartStorage.ts`, `src/cart/CartPage.tsx`, `src/cart/SharedSelectionPage.tsx` y `src/catalog/contactLinks.ts` en el catálogo. Crear `src/PrettyWoman.Api/Controllers/CatalogShareController.cs` en el backend.

- [ ] Agregar selección de talla y presentación en la ficha. Guardar variantes y cantidades en `localStorage`, con recuperación ante datos ausentes o corruptos. Permitir ajustar o quitar líneas. Crear o reutilizar la selección cuando la clienta comparte y permitir corregir las líneas que excedan el stock.
- [ ] Implementar `/selecciones/:id` para mostrar la selección, avisos y estado vencido. Agregar las rutas HTML del backend `/compartir/prendas/{productId}` y `/compartir/selecciones/{id}`. Servir metadatos Open Graph antes de continuar al sitio estático y ofrecer un enlace visible a la ficha o selección. Usar metadatos genéricos para el carrito.
- [ ] Conectar WhatsApp con el enlace listo para enviar y ofrecer copiarlo para Instagram y Messenger. Validar que una selección abre en otro navegador, que al recargar se conserva el carrito y que cambiar o vencer la selección permite generar otro enlace.
- [ ] Ejecutar `pnpm build` y `dotnet test PrettyWoman.slnx`. En el entorno de publicación, comprobar fallback de rutas estáticas, CORS para el dominio del catálogo, enlaces de contacto y metadatos HTML accesibles sin sesión antes de activar el subdominio.
