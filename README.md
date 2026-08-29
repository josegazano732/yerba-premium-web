# Mate Tierra — Yerba Mate Premium

Web ecommerce-ready para una marca DTC premium de yerba mate, construida con **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, **Lucide React** y **React Hook Form**.

## Stack

| Área | Tecnología |
| --- | --- |
| Framework | [Next.js](https://nextjs.org/) 15.5 (App Router) |
| UI | [React](https://react.dev/) 19 |
| Lenguaje | [TypeScript](https://www.typescriptlang.org/) 5.9 |
| Estilos | [Tailwind CSS](https://tailwindcss.com/) 4 (vía `@tailwindcss/postcss`) |
| Animaciones | [Framer Motion](https://motion.dev/) |
| Iconos | [Lucide React](https://lucide.dev/) |
| Formularios | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Base de datos / Storage | [Supabase](https://supabase.com/) (`@supabase/supabase-js`) |
| IA (asistente "Ai Matera") | [OpenAI SDK](https://www.npmjs.com/package/openai) + DeepSeek |
| PDF (catálogo) | [jsPDF](https://github.com/parallax/jsPDF) |
| Analytics | [Vercel Analytics](https://vercel.com/analytics) |
| Tipografías | Manrope + Cormorant Garamond (`next/font/google`) |
| Linting | ESLint 9 (`next/core-web-vitals`, `next/typescript`) |

## Scripts

```bash
npm run dev       # servidor de desarrollo (Next.js completo, incluye API routes)
npm run build     # build de producción
npm run start     # sirve la carpeta estática `out` (solo export estático)
npm run preview   # igual que start
npm run lint      # ESLint
```

> El export estático (`output: "export"`) solo se activa en **GitHub Actions** (GitHub Pages). En local y en Vercel corre Next.js completo, por lo que las API routes (ej. `/api/ai/chat`) están disponibles.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (productos, branding, stores) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase |
| `DEEPSEEK_API_KEY` | Clave para el asistente de IA (`src/lib/ai`) |
| `NEXT_PUBLIC_BASE_PATH` | Base path (autogenerado en GitHub Pages) |

## Estructura

```
src/
├── app/                      # Rutas del App Router
│   ├── layout.tsx            # Layout raíz (Header, Footer, CartProvider, AiMatera, Analytics)
│   ├── page.tsx              # Home
│   ├── globals.css           # Estilos globales y tokens Tailwind
│   ├── robots.ts             # robots.txt
│   ├── sitemap.ts            # sitemap.xml
│   ├── admin/productos/      # Panel de administración de productos
│   ├── api/ai/chat/          # API route del asistente de IA
│   ├── catalogos/            # Catálogo mayorista (PDF)
│   ├── categorias/[slug]/    # Detalle por categoría
│   ├── donde-comprar/        # Localizador de tiendas
│   ├── productos/            # Listado de productos
│   ├── productos/[slug]/     # Detalle de producto
│   └── sobre-nosotros/       # Historia de la marca
├── components/               # Componentes por dominio
│   ├── admin/                # Branding, hero banner y CRUD de productos
│   ├── ai-matera/            # Asistente conversacional (AiMatera, AiProductCard)
│   ├── brand/                # Logo, historia, proceso, sustentabilidad
│   ├── hero/                 # HeroSection
│   ├── home/                 # Banner, marquee, promo y categorías de la home
│   ├── layout/               # Header, Footer, MobileMenu, WhatsappFab
│   ├── locations/            # StoreLocator
│   ├── products/             # Cards, grid, detalle, featured y AddToCart
│   ├── ui/                   # Badge, Button, Container, Input
│   └── wholesale/            # Catálogo mayorista
├── data/                     # Datos estáticos
│   ├── products.ts           # Tipos y mapeo de productos (Supabase)
│   ├── site.ts               # Marca, WhatsApp, Instagram, medios de pago
│   └── stores.ts             # Puntos de venta
├── lib/                      # Lógica compartida
│   ├── ai/                   # Cliente OpenAI/DeepSeek, tools, prompt, execute-tool, types
│   ├── cart.ts               # Tipos del carrito
│   ├── cart-context.tsx      # Contexto global del carrito
│   ├── catalog.ts            # Lógica del catálogo
│   ├── catalogPdf.ts         # Generación del PDF de catálogo (jsPDF)
│   ├── seo.ts                # JSON-LD y metadatos SEO
│   ├── shipping.ts           # Costos/envíos
│   ├── supabase.ts           # Cliente Supabase
│   ├── useCatalog.ts         # Hook para el catálogo
│   └── utils.ts              # Utilidades (cn, etc.)
└── types/                    # Declaraciones de tipos (lucide-react.d.ts)
```

### Alias de importación

Configurado en `tsconfig.json`:

```ts
"@/*" -> "./src/*"
```

## Despliegue

- **Vercel (producción)**: Next.js completo con API routes (`https://matetierra-web.vercel.app`).
- **GitHub Pages**: export estático activado automáticamente cuando `GITHUB_ACTIONS=true`, con `basePath` y `assetPrefix` apuntando a `/yerba-premium-web`.

## Logo

El logo actual es un wordmark editable en `src/components/layout/Header.tsx`. Cuando tengas el archivo definitivo, reemplazalo (también se usa en `src/components/brand/BrandLogo.tsx` y en el branding del admin).