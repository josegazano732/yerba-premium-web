import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { mapProductDetails, type ProductDetailsRow } from "@/data/products";
import { site } from "@/data/site";
import {
  slugify,
  categoryUrl,
  buildBreadcrumbSchema,
  buildItemListSchema,
  productUrl
} from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { CategoryProducts } from "@/components/products/CategoryProducts";

/** Descripciones editoriales por categoría conocida. */
const CATEGORY_META: Record<string, { heading: string; description: string }> = {
  Mates: {
    heading: "Mates Artesanales",
    description:
      "Encontrá el mate ideal para tu momento de pausa: imperiales, camioneros, de calabaza, de madera y más. Cada mate es seleccionado por calidad y durabilidad."
  },
  Termos: {
    heading: "Termos para Mate",
    description:
      "Termos de acero inoxidable para mantener el agua a la temperatura perfecta durante horas. Elegí el tuyo y llevá el mate a donde vayas."
  },
  Bombillas: {
    heading: "Bombillas para Mate",
    description:
      "Bombillas de acero inoxidable, alpaca y diferentes filtros para cada tipo de yerba. Encontrá la que mejor se adapte a tu forma de tomar mate."
  },
  Yerberas: {
    heading: "Yerberas",
    description:
      "Almacená tu yerba con estilo y practicidad. Yerberas de diferentes materiales y diseños para mantener la yerba siempre lista."
  },
  Materas: {
    heading: "Materas y Bolsos Materos",
    description:
      "Llevá tu equipo matero completo a cualquier lado. Materas con espacio para mate, termo, yerba y accesorios."
  }
};

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key) : null;
}

async function fetchCategoryBySlug(slug: string) {
  const client = getClient();
  if (!client) return null;

  const [catsResult, productsResult] = await Promise.all([
    client.from("product_categories").select("name,slug,image_url").eq("is_active", true),
    client
      .from("product_details")
      .select("id,name,description,price,image,image_urls,category_name,unit_of_measure,stock,seasonal")
      .not("image", "is", null)
      .order("name")
  ]);

  const category = (catsResult.data ?? []).find(
    (cat): cat is { name: string; slug: string | null; image_url: string | null } =>
      typeof cat.name === "string" && slugify(cat.name) === slug
  );
  if (!category) return null;

  const products = (productsResult.data as ProductDetailsRow[] | null)
    ?.map(mapProductDetails)
    .filter(
      (p): p is NonNullable<ReturnType<typeof mapProductDetails>> =>
        p !== null && p.category === category.name
    ) ?? [];

  return { category, products };
}

export async function generateStaticParams() {
  const client = getClient();
  if (!client) return [];
  const { data } = await client
    .from("product_categories")
    .select("name")
    .eq("is_active", true);
  return (data ?? [])
    .filter((row): row is { name: string } => typeof row.name === "string")
    .map((row) => ({ slug: slugify(row.name) }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchCategoryBySlug(slug);
  if (!data) return { title: "Categoría no encontrada" };

  const meta = CATEGORY_META[data.category.name];
  const title = meta?.heading ?? data.category.name;
  const description =
    meta?.description ??
    `Explorá nuestra selección de ${data.category.name.toLowerCase()} en Mate Tierra. ${data.products.length} productos disponibles con envíos a todo el país.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: data.category.image_url
        ? [{ url: data.category.image_url, alt: `${data.category.name} — Mate Tierra` }]
        : []
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: data.category.image_url ? [data.category.image_url] : []
    },
    alternates: { canonical: `${site.baseUrl}${categoryUrl(data.category.name)}` }
  };
}

export default async function CategoryPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchCategoryBySlug(slug);
  if (!data) notFound();

  const { category, products } = data;
  const meta = CATEGORY_META[category.name];
  const heading = meta?.heading ?? category.name;
  const description =
    meta?.description ??
    `Explorá nuestra selección de ${category.name.toLowerCase()} en Mate Tierra.`;

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Inicio", url: site.baseUrl },
    { name: "Productos", url: `${site.baseUrl}/productos` },
    { name: category.name, url: `${site.baseUrl}${categoryUrl(category.name)}` }
  ]);
  const itemListSchema = buildItemListSchema(
    products.map((p) => ({ name: p.name, url: `${site.baseUrl}${productUrl(p.name)}` }))
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <main>
        {/* Hero de categoría */}
        {category.image_url ? (
          <div className="relative h-48 w-full overflow-hidden bg-secondary/30 sm:h-64">
            <Image
              src={category.image_url}
              alt={`${category.name} — Mate Tierra`}
              fill
              sizes="100vw"
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
              <Container>
                <h1 className="font-serif text-4xl font-semibold text-white sm:text-5xl">{heading}</h1>
              </Container>
            </div>
          </div>
        ) : null}

        <Container className="pb-24 pt-8">
          {/* Breadcrumb */}
          <nav aria-label="Ruta de navegación" className="mb-6 text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link href="/" className="transition-colors hover:text-primary">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/productos" className="transition-colors hover:text-primary">Productos</Link></li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-text">{category.name}</li>
            </ol>
          </nav>

          {/* H1 cuando no hay imagen hero */}
          {!category.image_url ? (
            <h1 className="mb-4 font-serif text-4xl font-semibold text-[#20341d] sm:text-5xl">{heading}</h1>
          ) : null}

          <p className="mb-2 max-w-2xl text-base leading-relaxed text-muted">{description}</p>
          <p className="mb-10 text-xs font-bold uppercase tracking-widest text-primary">
            {products.length} {products.length === 1 ? "producto" : "productos"}
          </p>

          {products.length > 0 ? (
            <CategoryProducts products={products} />
          ) : (
            <p className="text-muted">No hay productos disponibles en esta categoría por el momento.</p>
          )}

          <div className="mt-12 border-t border-[#e7e2d8] pt-8">
            <Link
              href="/productos"
              className="text-sm font-medium text-primary transition-colors hover:underline"
            >
              ← Ver todos los productos
            </Link>
          </div>
        </Container>
      </main>
    </>
  );
}
