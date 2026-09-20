"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { useCatalog } from "@/lib/useCatalog";
import { ProductGrid } from "./ProductGrid";

export type CategoryPageCategory = {
  name: string;
  slug: string | null;
  image_url: string | null;
  heading: string;
  description: string;
};

const ALL_CATEGORIES: CategoryPageCategory = {
  name: "Todos",
  slug: null,
  image_url: null,
  heading: "Todos los productos",
  description:
    "Explorá el catálogo completo de Mate Tierra: mates, termos, bombillas, yerberas, materas y accesorios con envíos a todo el país."
};

export function CategoryPageView({
  categories,
  initialCategoryName
}: {
  categories: CategoryPageCategory[];
  initialCategoryName: string;
}) {
  const [activeName, setActiveName] = useState(initialCategoryName);
  const { categories: liveCategories } = useCatalog();

  const configuredCategory =
    activeName === "Todos"
      ? ALL_CATEGORIES
      : categories.find((category) => category.name === activeName) ?? {
          name: activeName,
          slug: null,
          image_url: null,
          heading: activeName,
          description: `Explorá nuestra selección de ${activeName.toLowerCase()} en Mate Tierra.`
        };
  const liveCategory = liveCategories.find((category) => category.name === activeName);
  const active = liveCategory
    ? { ...configuredCategory, image_url: liveCategory.image_url }
    : configuredCategory;

  return (
    <main>
      {/* Hero de categoría */}
      {active.image_url ? (
        <div className="relative h-48 w-full overflow-hidden bg-secondary/30 sm:h-64">
          <Image
            src={active.image_url}
            alt={`${active.name} — Mate Tierra`}
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
            <Container>
              <h1 className="font-serif text-4xl font-semibold text-white sm:text-5xl">
                {active.heading}
              </h1>
            </Container>
          </div>
        </div>
      ) : null}

      <Container className="pb-24 pt-8">
        {/* Breadcrumb */}
        <nav aria-label="Ruta de navegación" className="mb-6 text-sm text-muted">
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
            <li className="font-medium text-text">{active.name}</li>
          </ol>
        </nav>

        {/* H1 cuando no hay imagen hero */}
        {!active.image_url ? (
          <h1 className="mb-4 font-serif text-4xl font-semibold text-[#20341d] sm:text-5xl">
            {active.heading}
          </h1>
        ) : null}

        <p className="mb-2 max-w-2xl text-base leading-relaxed text-muted">{active.description}</p>

        <div className="mt-6">
          <ProductGrid initialCategory={initialCategoryName} onCategoryChange={setActiveName} />
        </div>

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
  );
}
