# Integración con Mercado Pago (Checkout Pro)

Guía técnica de la integración de pagos de **Mate Tierra — Yerba Mate Premium** con
[Mercado Pago Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/landing).

## Resumen

El sitio usa el flujo de **Checkout Pro** (redirección a la pasarela de Mercado Pago):

1. El cliente completa el formulario de compra en `/checkout`.
2. El servidor crea un pedido con **precio y stock calculados del lado del servidor** (nunca confía en el navegador).
3. El servidor crea (o reutiliza) una `Preference` de Checkout Pro y devuelve el `init_point`.
4. El navegador redirige al `init_point` de Mercado Pago.
5. Mercado Pago notifica el resultado vía **webhook** y redirige al cliente a las páginas de resultado.
6. El webhook valida la firma, consulta el pago real a Mercado Pago y actualiza la orden de forma **idempotente**.
7. El stock se descuenta **únicamente** cuando el pago queda `approved`.

## Variables de entorno

| Variable | Tipo | Dónde | Descripción |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | pública | Vercel + local | URL del proyecto Supabase (ya existente). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | Vercel + local | Clave anon de Supabase (ya existente). |
| `SUPABASE_SERVICE_ROLE_KEY` | **secreta** | solo servidor | Service role key para leer productos y escribir pedidos. |
| `MERCADOPAGO_ACCESS_TOKEN` | **secreta** | solo servidor | Access token de la app de Mercado Pago. |
| `MERCADOPAGO_WEBHOOK_SECRET` | **secreta** | solo servidor | Secreto para validar la firma `x-signature` del webhook. |
| `NEXT_PUBLIC_SITE_URL` | pública | Vercel + local | Origen absoluto del sitio (ej. `https://matetierra-web.vercel.app`). Si no se define, se usa `baseUrl` de `src/data/site.ts`. |

> Nunca uses el prefijo `NEXT_PUBLIC_` para las claves secretas. `SUPABASE_SERVICE_ROLE_KEY`,
> `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` solo se leen en el servidor.

### `.env.local` (desarrollo)

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
MERCADOPAGO_ACCESS_TOKEN=...
MERCADOPAGO_WEBHOOK_SECRET=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Estructura

```
src/lib/mercadopago/
  client.ts        # MercadoPagoConfig (SDK v3), solo servidor
  preferences.ts   # crear/reutilizar Preference de Checkout Pro
  payments.ts      # consultar estado real de un pago
  webhook.ts       # validación de firma + mapeo de estados
src/lib/orders/
  schema.ts        # validación Zod (cliente y servidor)
  orders.ts        # cálculo de precios/stock server-side, crear/leer pedido
src/lib/supabase/
  server.ts        # cliente con service role (solo servidor)
src/lib/site-url.ts# origen absoluto para back_urls / notification_url
src/app/api/
  orders/route.ts                  # POST /api/orders
  orders/[id]/route.ts             # GET /api/orders/:id
  mercadopago/create-preference/route.ts  # POST /api/mercadopago/create-preference
  webhooks/mercadopago/route.ts    # POST /api/webhooks/mercadopago
src/app/checkout/
  page.tsx                         # página de checkout
  success/page.tsx                 # resultado: pago aprobado
  pending/page.tsx                 # resultado: pago en proceso
  failure/page.tsx                 # resultado: pago rechazado/cancelado
src/components/checkout/
  CheckoutForm.tsx                 # formulario + resumen + envío
  OrderResult.tsx                  # estado del pedido (polling), común a las 3 páginas
supabase/migrations/
  20260829000000_mercadopago_orders.sql  # schema, RPC y RLS
```

## Endpoints

### `POST /api/orders`

Crea un pedido en estado `pending`.

- **Body:** `{ items: [{ productId, quantity }], customer: {…}, shippingMethodId }`.
- **Seguridad:** re-carga productos desde Supabase, valida existencia, `price > 0` y `stock >= quantity`.
- **Respuesta 201:** `{ orderId, subtotal, shippingCost, total }`.

### `POST /api/mercadopago/create-preference`

- **Body:** `{ orderId }` (UUID).
- **Flujo:** si el pedido ya tiene `mercadopago_preference_id`, intenta reutilizarla (spec §13);
  si no, crea una `Preference` nueva y la persiste en la orden.
- **Respuesta 200:** `{ preferenceId, initPoint, orderId }`.

### `POST /api/webhooks/mercadopago`

- Valida `x-signature` (solo si `MERCADOPAGO_WEBHOOK_SECRET` está configurado).
- Procesa únicamente `type === "payment"` con acciones relevantes.
- **Origen de verdad:** consulta el pago real con `Payment.get({ id })`; el body de la
  notificación nunca se usa para decidir el estado.
- Llama a la RPC `process_payment_event` (idempotente, con `FOR UPDATE`).

### `GET /api/orders/:id`

Devuelve `{ id, status, paymentStatus, total, items }` para las páginas de resultado.
No requiere autenticación: el `order_id` es un UUID opaco.

## Estados

| Mercado Pago | `payment_status` | `order_status` |
| --- | --- | --- |
| `approved` | `approved` | `confirmed` |
| `in_process`, `pending`, `authorized`, `in_mediation` | `in_process` | `pending` |
| `rejected` | `rejected` | `pending` |
| `cancelled` | `cancelled` | `cancelled` |
| `refunded`, `charged_back` | `refunded` | `cancelled` |

El **stock se descuenta solo** cuando el resultado es `approved` + `confirmed` (spec §24),
dentro de la RPC `process_payment_event`.

## Base de datos

Ejecutar [20260829000000_mercadopago_orders.sql](../supabase/migrations/20260829000000_mercadopago_orders.sql)
en el SQL Editor de Supabase. Requiere la extensión `pgcrypto`.

- `orders`: pedidos con `status`, `payment_status`, `payment_id` (único), `mercadopago_preference_id`,
  datos de envío e importes.
- `order_items`: detalle con snapshot de nombre/precio.
- `inventory_movements`: auditoría de movimientos de stock (`SALE`, `RESTOCK`, `ADJUSTMENT`, `CANCELLATION`).
- `payment_webhook_events`: auditoría de notificaciones (índice único parcial sobre `event_id`).
- RPC `process_payment_event`: actualiza la orden y descuenta stock de forma atómica e idempotente.
- RLS habilitada sin policies públicas: solo el service role (servidor) accede.

## Configuración en Mercado Pago

1. Crear una aplicación en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel).
2. Configurar **Redirect URL** con las tres páginas de resultado:
   - `https://TU_DOMINIO/checkout/success`
   - `https://TU_DOMINIO/checkout/pending`
   - `https://TU_DOMINIO/checkout/failure`
3. En **Webhooks**, crear una notificación de tipo `payment` apuntando a
   `https://TU_DOMINIO/api/webhooks/mercadopago`.
4. Copiar el **Access Token** de producción (o el de prueba para sandbox) a `MERCADOPAGO_ACCESS_TOKEN`.
5. Configurar el **Webhook Secret** (si la app lo expone) en `MERCADOPAGO_WEBHOOK_SECRET`.

## Pruebas locales

1. Configurar `.env.local` con credenciales de prueba (sandbox).
2. Levantar el servidor: `npm run dev`.
3. Crear un pedido de prueba vía `/checkout` con una tarjeta de prueba de Mercado Pago.
4. Verificar la transición de estados en la tabla `orders` y en `inventory_movements`.
5. Para probar el webhook sin pasarela, hacer un `POST` a `/api/webhooks/mercadopago` con un
   `payment_id` real; el handler consulta el estado a Mercado Pago.

## Deploy en Vercel

1. Agregar las variables secretas (`SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN`,
   `MERCADOPAGO_WEBHOOK_SECRET`) en **Project Settings → Environment Variables**.
2. Definir `NEXT_PUBLIC_SITE_URL` con el dominio de producción.
3. Aplicar la migración SQL en Supabase antes del primer deploy.
4. Actualizar `baseUrl` en `src/data/site.ts` si el dominio cambia.

## Compatibilidad con GitHub Pages (export estático)

- `next.config.ts` activa `output: "export"` **solo** cuando `GITHUB_ACTIONS === "true"`.
- Las API routes y las páginas de checkout usan componentes cliente / `force-dynamic`, por lo
  que el export estático no intenta prerenderizarlas como páginas con datos de servidor.
- **Nota:** con export estático no hay API routes en runtime; la compra completa requiere
  Vercel/local (Next.js completo). GitHub Pages sirve el catálogo, no el checkout.

## Problemas conocidos

- **Tipo de `id` de `products`:** la RPC asume `p.id::text = oi.product_id` (TEXT). Verificar que
  `public.products.id` sea texto/UUID según el esquema real; ajustar el cast si difiere.
- **Formato de firma del webhook:** se implementan dos formatos candidatos (manifiesto `id:…;ts:…;`
  y `ts.<body>`). Si Mercado Pago cambia el formato, revisar `verifyMercadoPagoSignature`.
- **RLS de `products`:** el catálogo usa el cliente anon (lectura pública). Si se endurece RLS,
  asegurarse de que el service role siga leyendo `products` para el cálculo de precios.
