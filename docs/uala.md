# Integración con Ualá (API Cobros Online v2)

Guía técnica de la integración de pagos de **Mate Tierra — Yerba Mate Premium** con
[Ualá Bis — API Cobros Online](https://developers.ualabis.com.ar/).

## Resumen

El sitio usa el flujo de **checkout hosteado** (link de pago) de Ualá:

1. El cliente completa el formulario de compra en `/checkout`.
2. El servidor crea un pedido con **precio y stock calculados del lado del servidor** (nunca confía en el navegador).
3. El servidor crea una orden de pago en Ualá y devuelve el `checkout_link`.
4. El navegador redirige al `checkout_link` de Ualá.
5. Ualá notifica el resultado vía **webhook** (`notification_url`) y redirige al cliente a
   `callback_success` / `callback_fail`.
6. El webhook consulta el estado real con `GET /orders/:uuid` y actualiza la orden de forma **idempotente**.
7. El stock se descuenta **únicamente** cuando el pago queda `APPROVED`.

## Variables de entorno

| Variable | Tipo | Dónde | Descripción |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | pública | Vercel + local | URL del proyecto Supabase (ya existente). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | Vercel + local | Clave anon de Supabase (ya existente). |
| `SUPABASE_SERVICE_ROLE_KEY` | **secreta** | solo servidor | Service role key para leer productos y escribir pedidos. |
| `UALA_API_ENV` | pública | Vercel + local | `test` (stage) o `production`. Por defecto `production`. |
| `UALA_USERNAME` | **secreta** | solo servidor | Usuario de la cuenta Ualá Bis. |
| `UALA_CLIENT_ID` | **secreta** | solo servidor | Client ID de Ualá Bis. |
| `UALA_CLIENT_SECRET_ID` | **secreta** | solo servidor | Client Secret ID de Ualá Bis. |
| `NEXT_PUBLIC_SITE_URL` | pública | Vercel + local | Origen absoluto del sitio (ej. `https://matetierra-web.vercel.app`). Si no se define, se usa `baseUrl` de `src/data/site.ts`. |

> Nunca uses el prefijo `NEXT_PUBLIC_` para las claves secretas. `SUPABASE_SERVICE_ROLE_KEY`,
> `UALA_USERNAME`, `UALA_CLIENT_ID` y `UALA_CLIENT_SECRET_ID` solo se leen en el servidor.

Opcionalmente podés sobrescribir las URLs base (por ejemplo si Ualá cambia de dominio):

- `UALA_AUTH_BASE_URL` (default test: `https://auth.stage.developers.ar.ua.la/v2/api`, prod: `https://auth.developers.ar.ua.la/v2/api`)
- `UALA_CHECKOUT_BASE_URL` (default test: `https://checkout.stage.developers.ar.ua.la/v2/api`, prod: `https://checkout.developers.ar.ua.la/v2/api`)

### `.env.local` (desarrollo)

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
UALA_API_ENV=test
UALA_USERNAME=...
UALA_CLIENT_ID=...
UALA_CLIENT_SECRET_ID=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `notification_url` de Ualá debe ser una URL pública. Para probar el webhook en local
> usá un túnel (p. ej. `ngrok http 3000`) y apuntá `NEXT_PUBLIC_SITE_URL` a esa URL.

## Estructura

```
src/lib/uala/
  config.ts      # URLs base + credenciales (solo servidor)
  client.ts      # OAuth2 client-credentials (token cacheado 24 h)
  checkout.ts    # crear orden de pago / consultar estado
  webhook.ts     # mapeo de estados Ualá → internos
src/lib/orders/
  schema.ts      # validación Zod (cliente y servidor)
  orders.ts      # cálculo de precios/stock server-side, crear/leer pedido
src/lib/supabase/
  server.ts      # cliente con service role (solo servidor)
src/lib/site-url.ts# origen absoluto para callback_urls / notification_url
src/app/api/
  orders/route.ts                # POST /api/orders
  orders/[id]/route.ts           # GET /api/orders/:id
  uala/create-checkout/route.ts  # POST /api/uala/create-checkout
  webhooks/uala/route.ts         # POST /api/webhooks/uala
src/app/checkout/
  page.tsx                       # página de checkout
  success/page.tsx               # resultado: pago aprobado
  pending/page.tsx               # resultado: pago en proceso
  failure/page.tsx               # resultado: pago rechazado/cancelado
src/components/checkout/
  CheckoutForm.tsx               # formulario + resumen + envío
  OrderResult.tsx                # estado del pedido (polling), común a las 3 páginas
supabase/migrations/
  20260829000000_mercadopago_orders.sql  # schema base (órdenes, RPC y RLS)
  20261121000000_uala_payments.sql       # columna uala_order_uuid + provider 'uala'
```

## Endpoints

### `POST /api/orders`

Crea un pedido en estado `pending`.

- **Body:** `{ items: [{ productId, quantity }], customer: {…}, shippingMethodId }`.
- **Seguridad:** re-carga productos desde Supabase, valida existencia, `price > 0` y `stock >= quantity`.
- **Respuesta 201:** `{ orderId, subtotal, shippingCost, total }`.

### `POST /api/uala/create-checkout`

- **Body:** `{ orderId }` (UUID).
- **Flujo:** crea una orden de pago en Ualá con el total del pedido y guarda `uala_order_uuid`.
- **Respuesta 200:** `{ checkoutLink, orderId }`.

### `POST /api/webhooks/uala`

- Ualá no documenta firma/secret para el webhook. Por eso el handler **consulta el estado
  real** con `GET /orders/:uuid` y nunca decide el estado con el body de la notificación.
- Procesa estados `APPROVED`, `PROCESSED`, `REJECTED` y `REFUNDED`.
- Llama a la RPC `process_payment_event` (idempotente, con `FOR UPDATE`).
- Debe responder **HTTP 200**; Ualá reintenta hasta 3 veces más ante otro código.

### `GET /api/orders/:id`

Devuelve `{ id, status, paymentStatus, total, items }` para las páginas de resultado.
No requiere autenticación: el `order_id` es un UUID opaco.

## Estados

| Ualá | `payment_status` | `order_status` |
| --- | --- | --- |
| `APPROVED` | `approved` | `confirmed` |
| `PROCESSED` | `in_process` | `pending` |
| `PENDING` | `in_process` | `pending` |
| `REJECTED` | `rejected` | `pending` |
| `REFUNDED` | `refunded` | `cancelled` |

El **stock se descuenta solo** cuando el resultado es `APPROVED` + `confirmed`,
dentro de la RPC `process_payment_event`.

## Base de datos

Ejecutar [20261121000000_uala_payments.sql](../supabase/migrations/20261121000000_uala_payments.sql)
en el SQL Editor de Supabase. Agrega la columna `orders.uala_order_uuid` y cambia el
`payment_provider` por defecto a `uala`. El resto del schema (RPC, RLS, auditoría) ya
viene de `20260829000000_mercadopago_orders.sql`.

## Configuración en Ualá

1. En la app/web de Ualá Bis, ir a **Ualá Bis → Cobros online → API** para obtener:
   - `username`
   - `client_id`
   - `client_secret_id`
2. Configurar en Vercel/local las variables `UALA_*`.
3. Definir `notification_url` como `https://TU_DOMINIO/api/webhooks/uala` (se setea
   automáticamente al crear la orden).
4. Los redirects de vuelta al sitio son `/checkout/success` y `/checkout/failure`
   (con `?order_id=`), configurados como `callback_success` / `callback_fail`.

## Pruebas locales

1. Configurar `.env.local` con credenciales de test (`UALA_API_ENV=test`).
2. Levantar el servidor: `npm run dev`.
3. Crear un pedido de prueba vía `/checkout` con una tarjeta de prueba de Ualá.
4. Verificar la transición de estados en la tabla `orders` y en `inventory_movements`.
5. Para probar el webhook sin pasarela, hacer un `POST` a `/api/webhooks/uala` con un
   `uuid` real; el handler consulta el estado a Ualá.

## Deploy en Vercel

1. Agregar las variables secretas (`SUPABASE_SERVICE_ROLE_KEY`, `UALA_USERNAME`,
   `UALA_CLIENT_ID`, `UALA_CLIENT_SECRET_ID`) en **Project Settings → Environment Variables**.
2. Definir `UALA_API_ENV=production` y `NEXT_PUBLIC_SITE_URL` con el dominio de producción.
3. Aplicar la migración SQL en Supabase antes del primer deploy.
4. Actualizar `baseUrl` en `src/data/site.ts` si el dominio cambia.

## Compatibilidad con GitHub Pages (export estático)

- `next.config.ts` activa `output: "export"` **solo** cuando `GITHUB_ACTIONS === "true"`.
- Las API routes y las páginas de checkout usan componentes cliente / `force-dynamic`, por lo
  que el export estático no intenta prerenderizarlas como páginas con datos de servidor.
- **Nota:** con export estático no hay API routes en runtime; la compra completa requiere
  Vercel/local (Next.js completo). GitHub Pages sirve el catálogo, no el checkout.

## Diferencias clave vs. Mercado Pago

- **No hay SDK oficial público**: se llama a la API REST v2 con `fetch`.
- **No hay firma de webhook documentada**: se valida consultando el pago real vía API.
- **El token de acceso dura 24 h** y se cachea en memoria.
- **No hay detalle de ítems**: Ualá recibe solo `amount` + `description`.
- **No existe estado `CANCELLED`**: los pagos no realizados quedan `PENDING` y los rechazados `REJECTED`.

## Fuentes

- Docs de Ualá Bis (API Cobros Online v2): `https://developers.ualabis.com.ar/`
- Autenticación: `https://developers.ualabis.com.ar/v2/authentication/create`
- Crear orden: `https://developers.ualabis.com.ar/v2/orders/create`
- Consultar orden: `https://developers.ualabis.com.ar/v2/orders/get`
- Webhook: `https://developers.ualabis.com.ar/v2/orders/create/webhook`
- Ambientes y credenciales: `https://developers.ualabis.com.ar/v2/ambientes`
