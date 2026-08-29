import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { mapProductDetails, type Product, type ProductDetailsRow } from "@/data/products";
import { site } from "@/data/site";
import { slugify, productUrl, categoryUrl, buildProductSchema, buildBreadcrumbSchema } from "@/lib/seo";
import { AddToCartButton } from "@/components/products/AddToCartButton";
import { ProductCard } from "@/components/products/ProductCard";
import { formatPrice } from "@/lib/utils";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key) : null;
}

const fetchProductBySlug = cache(async (slug: string) => {
  const client = getClient();
  if (!client) return null;
  const { data } = await client
    .from("product_details")
    .select("id,name,description,price,image,image_urls,category_name,unit_of_measure,stock,seasonal")
    .not("name", "is", null);
  return (
    (data as ProductDetailsRow[] | null)
      ?.map(mapProductDetails)
      .filter((p): p is NonNullable<ReturnType<typeof mapProductDetails>> => p !== null)
      .find((p) => slugify(p.name) === slug) ?? null
  );
});

const fetchRelatedProducts = cache(async (category: string, excludeId: string): Promise<Product[]> => {
  const client = getClient();
  if (!client) return [];
  const { data } = await client
    .from("product_details")
    .select("id,name,description,price,image,image_urls,category_name,unit_of_measure,stock,seasonal")
    .eq("category_name", category)
    .not("image", "is", null)
    .limit(9);
  return (
    (data as ProductDetailsRow[] | null)
      ?.map(mapProductDetails)
      .filter((p): p is Product => p !== null && p.id !== excludeId)
      .slice(0, 4) ?? []
  );
});

export async function generateStaticParams() {
  const client = getClient();
  if (!client) return [];
  const { data } = await client
    .from("product_details")
    .select("name")
    .not("name", "is", null);
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
  const product = await fetchProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado" };
  const description =
    product.description.length > 155
      ? product.description.slice(0, 152) + "..."
      : product.description;
  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: product.image
        ? [{ url: product.image, alt: `${product.name} — ${product.category}` }]
        : []
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: product.image ? [product.image] : []
    },
    alternates: { canonical: `${site.baseUrl}${productUrl(product.name)}` }
  };
}

export default async function ProductPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) notFound();

  const gallery = product.images?.length ? product.images : [product.image];
  const related = await fetchRelatedProducts(product.category, product.id);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildProductSchema({
              name: product.name,
              description: product.description,
              price: product.price,
              image: product.image,
              category: product.category,
              stock: product.stock
            })
          )
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbSchema([
              { name: "Inicio", url: site.baseUrl },
              { name: "Productos", url: `${site.baseUrl}/productos` },
              {
                name: product.category,
                url: `${site.baseUrl}${categoryUrl(product.category)}`
              },
              { name: product.name, url: `${site.baseUrl}${productUrl(product.name)}` }
            ])
          )
        }}
      />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <nav aria-label="Ruta de navegación" className="mb-8 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/productos" className="transition-colors hover:text-primary">
                Productos
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={categoryUrl(product.category)}
                className="transition-colors hover:text-primary"
              >
                {product.category}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="max-w-[180px] truncate font-medium text-text">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex gap-4">
            {gallery.length > 1 && (
              <div className="no-scrollbar flex max-h-[520px] w-16 shrink-0 flex-col gap-2 overflow-y-auto">
                {gallery.map((src, i) => (
                  <div
                    key={src}
                    className="relative aspect-square w-full overflow-hidden rounded-[6px] border border-[#e2ddd3]"
                  >
                    <Image
                      src={src}
                      alt={`Vista ${i + 1} de ${product.name}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="relative aspect-square flex-1 overflow-hidden rounded-[8px] bg-secondary/20 shadow-[0_10px_30px_rgba(37,48,27,0.10)] ring-1 ring-[#e3ddcf]">
              <Image
                src={gallery[0]}
                alt={`${product.name} — ${product.category}`}
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {product.category}
              {product.weight ? ` · ${product.weight}` : ""}
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-[#20341d] sm:text-5xl">
              {product.name}
            </h1>
            {product.compareAtPrice ? (
              <p className="mt-4 text-sm text-muted line-through">
                {formatPrice(product.compareAtPrice)}
              </p>
            ) : null}
            <p className="mt-2 text-3xl font-extrabold text-[#20341d]">
              {formatPrice(product.price)}
            </p>
            <p className="mt-6 text-base leading-relaxed text-text/80">{product.description}</p>

            <div className="mt-8">
              <AddToCartButton product={product} />
            </div>

            <p className="mt-3 text-xs text-muted">
              {product.stock > 0 ? "En stock — listo para enviar" : "Sin stock disponible"}
            </p>

            <div className="mt-8 border-t border-[#e7e2d8] pt-6">
              <Link
                href="/productos"
                className="text-sm font-medium text-primary transition-colors hover:underline"
              >
                ← Ver todos los productos
              </Link>
            </div>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-16 border-t border-[#e7e2d8] pt-12">
            <h2 className="font-serif text-2xl font-semibold text-[#20341d] sm:text-3xl">
              Productos relacionados
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
