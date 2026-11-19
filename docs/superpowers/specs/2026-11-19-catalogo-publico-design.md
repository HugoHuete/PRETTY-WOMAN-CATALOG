# Catálogo público de Pretty Woman

## Objetivo

Permitir que las clientas exploren prendas disponibles y consulten por una prenda o una selección completa en los canales de la tienda. El catálogo no cobra ni reserva inventario.

## Enfoque elegido

Publicar un sitio estático en este repositorio y reutilizar el backend de Pretty Woman. El navegador consulta endpoints públicos del backend. Los enlaces pensados para compartir pasan por rutas públicas del backend que entregan HTML con metadatos Open Graph y un enlace a la página correspondiente del catálogo. El navegador puede continuar automáticamente, con un enlace visible como respaldo. La ficha usa el nombre y una imagen pública de la prenda. Una selección usa el logo y un título genérico. La aparición de la vista previa depende de la aplicación receptora.

Se consideró renderizar las fichas completas en un servidor del catálogo. Esa opción facilita la indexación de fichas y permite usar la misma página para navegación y vistas previas, pero requiere desplegar y mantener un servidor adicional. Se eligió el sitio estático con vistas previas en el backend para simplificar su publicación.

## Catálogo

- El sitio abre directamente en la cuadrícula del catálogo. El encabezado muestra el logo y el acceso al carrito. La navegación superior permite elegir categoría y luego subcategoría, y ofrece un acceso al filtro de prendas en descuento.
- La cuadrícula se inspira en la navegación y los filtros de Clothing Center y usa la identidad visual de Pretty Woman. En pantallas pequeñas, los filtros se pueden desplegar.
- Los filtros por categoría, subcategoría, talla y solo en descuento son combinables. El filtro de talla requiere stock en esa talla. Mostrar únicamente prendas con al menos una variante disponible. Ordenar por código descendente de forma predeterminada y ofrecer orden por precio final ascendente y descendente.
- Mostrar un precio en córdobas por prenda, común a sus tallas y colores durante esta versión. Si hay un descuento vigente, mostrar el precio original junto al final.
- Si el sistema devuelve precios distintos para las variantes disponibles, se propone mostrar «Desde C$…» con el menor precio final y ordenar por ese valor. La ficha y el carrito muestran el precio exacto de la variante seleccionada.
- La ficha muestra fotos, precio, tallas y colores disponibles. Un enlace a una prenda que se agota conserva su ficha con un aviso de agotado. Los banners de temporada quedan fuera de esta versión.

## Consultas y carrito

- Desde una ficha se puede compartir su enlace o consultar a Pretty Woman. El orden de contacto es WhatsApp, Instagram y Messenger. WhatsApp permite preparar un mensaje con la prenda, el enlace y la variante elegida, si aplica. Para Instagram y Messenger se ofrece abrir el chat y copiar el enlace.
- La clienta puede agregar varias prendas y elegir la cantidad por variante de talla y color. El carrito limita la cantidad al stock disponible y se conserva en `localStorage` en el mismo navegador. Abrir el sitio y editar el carrito no crean registros en el backend.
- Antes de generar un enlace nuevo, el backend valida los identificadores y las cantidades contra el inventario vigente y calcula los precios. Si alguna variante ya no alcanza para la cantidad solicitada, el sitio muestra qué debe ajustar. Al reutilizar un enlace vigente, su página muestra los avisos de cambios sin alterar la selección guardada.
- El backend crea una selección con un identificador público aleatorio y difícil de adivinar. Guarda las prendas, variantes, cantidades y precios compartidos. El navegador guarda el identificador junto con la selección a la que pertenece. Si la selección sigue igual y el enlace sigue vigente, se reutiliza. Un cambio en la selección genera otro enlace y conserva el anterior. La creación debe tolerar reintentos sin duplicar registros.
- El enlace dura 30 días desde su creación. Al abrirlo, se muestra la selección original y se señalan cambios de precio, unidades insuficientes o variantes agotadas según los datos vigentes. Un enlace vencido muestra un aviso y un acceso al catálogo. La clienta puede volver a compartir su carrito local y generar otro enlace.
- La consulta por WhatsApp prepara un mensaje con el enlace de la selección. Instagram y Messenger permiten abrir el chat y copiar el enlace.

## Contratos públicos y verificación

Usar contratos públicos específicos para productos, filtros, disponibilidad y selecciones. Exponer las variantes y el límite por variante necesario para seleccionar cantidades, sin exponer costos, inventario administrativo ni datos personales. El backend aplica los filtros, el orden y los límites de paginación. Limitar el tamaño de las selecciones y la frecuencia de creación. La vista previa de un carrito muestra información genérica de Pretty Woman.

Verificar que el catálogo carga desde su dominio, que los filtros combinados y el orden por precio descontado funcionan, que las fichas agotadas siguen accesibles y que un enlace de consulta abre desde otro navegador. Verificar además persistencia local, rechazo de cantidades fuera de stock, reutilización de enlaces vigentes, avisos de cambios y expiración.

## Reglas del backend existente

- La unidad de disponibilidad es la variante de talla dentro de una presentación del producto. Usar `AvailableQuantity` como límite, ya que el servicio de inventario lo mantiene separado de las unidades comprometidas.
- El precio base proviene de `SalePrice` en la variante. Si hay campañas vigentes que reducen el precio de su presentación, se usa la que produce el menor precio final. Si no las hay, se aplican las campañas vigentes del producto con el mismo criterio. El backend admite descuento fijo, porcentual y precio promocional fijo.
- Reutilizar esas reglas en los endpoints públicos mediante contratos propios. Los endpoints de productos para empleados conservan su autorización.

## Datos de publicación

- Catálogo: `catalog.prettywomanboutiquenic.com`.
- WhatsApp: `+505 8615 3754`.
- Instagram: `@prettywoman.ni`.
- Facebook: [Pretty Woman Boutique](https://www.facebook.com/prettywomanbni).
