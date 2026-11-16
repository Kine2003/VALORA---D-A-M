# Válora Catering

Aplicación cliente-servidor con Node.js 24 y MySQL 8.0. El catálogo se lee de MySQL y los pedidos y cotizaciones se registran con un número de solicitud.

## Inicio local

En este equipo ya están configuradas la base `valora` y la cuenta `valora_app`. Si el servidor está detenido, ejecuta `npm.cmd start` desde la carpeta del proyecto y abre [Válora local](http://127.0.0.1:3000/). La [ruta de estado](http://127.0.0.1:3000/api/v1/salud) verifica la conexión.

## Tres capas y siete módulos del backend

- **Presentación.** `frontend/` contiene las vistas HTML, los estilos, las imágenes y el código del navegador. En el modo conectado, el navegador intercambia JSON con la API.
- **Aplicación.** `backend/` recibe las peticiones HTTP, valida los datos y ejecuta los casos de uso.
- **Datos.** MySQL almacena el catálogo y las solicitudes. Los repositorios ejecutan SQL mediante la conexión de `datos/` y `backend/sql/` contiene el esquema.

| Ruta | Función |
| --- | --- |
| `servidor.js` | Arranca el servidor HTTP, entrega los archivos del frontend y deriva las peticiones de la API. |
| `rutas/` | Selecciona el controlador según el recurso y el método HTTP. |
| `middleware/` | Resuelve la versión de la API, lee los cuerpos JSON y serializa las respuestas. |
| `controladores/` | Valida los datos de pedidos y cotizaciones y llama al servicio correspondiente. |
| `servicios/` | Aplica las reglas de pedidos y cotizaciones dentro de transacciones. |
| `modelos/` | Da forma al catálogo que consume la vista y define los errores de validación del dominio. |
| `repositorios/` y `datos/` | Constituyen el módulo de acceso a datos. Los repositorios ejecutan las consultas y `datos/` administra las conexiones y las transacciones de MySQL. |

La vista de MVC está en el frontend. Por ejemplo, al registrar un pedido, el controlador valida el JSON, el servicio calcula los precios con el catálogo de MySQL y el repositorio guarda el pedido y sus detalles. La API devuelve el número de solicitud y el navegador muestra el comprobante. Las credenciales locales están en `.env`, excluido de Git.

## API v1

| Método y ruta | Respuesta JSON |
| --- | --- |
| `GET /api/v1/salud` | Estado de la conexión a MySQL. |
| `GET /api/v1/productos` | Catálogo completo de paquetes, ofertas, menús y complementos. |
| `GET /api/v1/servicios` | Catálogo de servicios. |
| `POST /api/v1/pedidos` | Número de solicitud y resumen del pedido. El cuerpo contiene `contacto` y `lineas`. |
| `POST /api/v1/cotizaciones` | Número de solicitud. El cuerpo contiene los datos del formulario de cotización. |

El catálogo se devuelve completo y el navegador filtra los paquetes por tipo de comida. El campo `version` de cada catálogo identifica el formato de sus datos. El prefijo `/api/v1` identifica la versión de las rutas HTTP. Los archivos de `frontend/data/` sirven como carga inicial y como catálogo de la demostración estática.

## Modelo migrado de Oracle

El esquema conserva 29 tablas, 210 columnas y 47 claves foráneas. Incluye las restricciones de unicidad, nulabilidad, formato y rango. La FK R10 es compuesta. El índice de servicio contratado y fecha usa la semántica de valores nulos de MySQL.

| Área | Tablas |
| --- | --- |
| Identidad | `usuario`, `rol`, `usuario_rol`, `sesion_usuario`, `cliente`. |
| Catálogo | `servicio`, `servicio_incluye`, `paquete`, `paquete_incluye`, `tipo_comida`, `paquete_tipo_comida`, `opcion_paquete`. |
| Contratos y solicitudes | `contrato`, `servicio_contratado`, `servicio_dia`, `solicitud`, `detalle_solicitud`, `extra_solicitud`. |
| Compras e inventario | `proveedor`, `insumo`, `proveedor_insumo`, `compra`, `detalle_compra`, `recepcion_compra`, `lote_insumo`, `kardex`, `composicion_opcion`. |
| Facturación | `factura`, `detalle_factura`. |

Se usó `AUTO_INCREMENT` para identidades, `VARCHAR` con `utf8mb4` para textos de longitud limitada, `LONGTEXT` para CLOB y `TIMESTAMP(6)` para auditoría. MySQL guarda el instante de auditoría en UTC. `DECIMAL` mantiene los importes en centavos y las cantidades y costos fraccionarios.

Las siete vistas SQL calculan saldos de lotes, existencias, alertas, consumo, faltantes e importes de facturación. La página registra solicitudes nuevas. Los flujos administrativos de usuarios, contratos, recepción de compras, descuento de inventario y emisión o anulación de facturas quedan pendientes junto con sus validaciones transaccionales. La carga inicial usa el catálogo JSON del repositorio.

## Instalación en otro equipo

1. Ejecuta `npm ci` con Node.js 24 o posterior.
2. En MySQL 8.0, crea una base vacía llamada `valora` con `utf8mb4` y un usuario `'valora_app'@'localhost'` con la contraseña de la aplicación.
3. Con la cuenta administradora, ejecuta `backend/sql/esquema.sql`, `backend/sql/vistas.sql` y `backend/sql/permisos.sql` sobre `valora`.
4. Copia `.env.example` a `.env` y completa `DB_PASSWORD`. Configura `DB_ADMIN_PASSWORD` en el entorno para ejecutar `npm run db:seed`. Si la cuenta administradora es distinta de `root`, establece también `DB_ADMIN_USER`.
5. Ejecuta `npm start`. Para correr las pruebas usa `npm test`.

GitHub Pages publica `frontend/` como demostración estática. El modo conectado usa el servidor Node de este proyecto.
