"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Minus, Plus, Search, SearchX } from "lucide-react";
import { useCatalog } from "@/lib/useCatalog";
import { cn, formatPrice } from "@/lib/utils";
import { useKitBuilderState } from "./KitBuilderState";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function KitBuilderCatalog() {
  const { products, isLoading } = useCatalog();
  const { addItem, incrementItem, decrementItem, getQuantity } = useKitBuilderState();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const term = normalize(query.trim());
    return products.filter((product) => {
      if (activeCategory && product.category !== activeCategory) return false;
      if (!term) return true;
      return normalize(`${product.name} ${product.category} ${product.description}`).includes(term);
    });
  }, [products, query, activeCategory]);

  if (isLoading) {
    return (
      <div className="rounded-[8px] border border-primary/10 bg-white p-5 text-sm text-muted">
        Cargando catalogo del kit...
      </div>
    );
  }

  return (
    <section
      aria-labelledby="kit-builder-catalog-heading"
      className="flex min-w-0 flex-col gap-3 rounded-[8px] border border-primary/10 bg-white p-4 sm:p-5"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="kit-builder-catalog-heading" className="font-serif text-2xl text-forest">
            Elegi tus productos
          </h2>
          <p className="mt-1 text-sm text-muted">{products.length} productos disponibles</p>
        </div>
        <span className="hidden rounded-full bg-secondary/40 px-2.5 py-1 text-xs font-bold text-primary sm:inline-flex">
          {visibleProducts.length} {visibleProducts.length === 1 ? "resultado" : "resultados"}
        </span>
      </div>

      <label className="relative block">
        <span className="sr-only">Buscar productos</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o categoria..."
          className="w-full rounded-full border border-primary/15 bg-white py-2.5 pl-9 pr-4 text-sm text-text outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:-mx-5 sm:px-5">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
            activeCategory === null
              ? "border-forest bg-forest text-white"
              : "border-primary/20 bg-white text-forest hover:border-primary/40 hover:bg-secondary/30"
          )}
        >
          Todos ({products.length})
        </button>
        {categories.map(([category, count]) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory((current) => (current === category ? null : category))}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              activeCategory === category
                ? "border-forest bg-forest text-white"
                : "border-primary/20 bg-white text-forest hover:border-primary/40 hover:bg-secondary/30"
            )}
          >
            {category} ({count})
          </button>
        ))}
      </div>

      {visibleProducts.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-lg border border-dashed border-primary/20 bg-secondary/10 px-4 py-10 text-center">
          <SearchX className="h-8 w-8 text-primary" />
          <p className="text-sm font-semibold text-forest">Sin resultados</p>
          <p className="max-w-xs text-xs text-muted">
            No encontramos productos para tu busqueda. Probá con otro termino o categoria.
          </p>
        </div>
      ) : (
        <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1 sm:max-h-[520px]">
          {visibleProducts.map((product) => {
            const quantity = getQuantity(product.id);
            const outOfStock = product.stock === 0;

            return (
              <li
                key={product.id}
                className="flex items-center gap-3 rounded-lg border border-primary/10 bg-white p-2.5 transition hover:border-primary/25 hover:bg-secondary/10"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary/30">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-forest">{product.name}</p>
                  <p className="truncate text-xs text-muted">
                    {product.category} · {formatPrice(product.price)}
                  </p>
                </div>

                {quantity > 0 ? (
                  <div className="flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-secondary/20 px-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => decrementItem(product.id)}
                      aria-label={`Quitar uno de ${product.name}`}
                      className="grid h-7 w-7 place-items-center rounded-full text-forest transition hover:bg-white hover:text-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-5 text-center text-sm font-bold text-forest">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => incrementItem(product.id)}
                      aria-label={`Agregar uno de ${product.name}`}
                      className="grid h-7 w-7 place-items-center rounded-full bg-forest text-white transition hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => addItem(product)}
                    disabled={outOfStock}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cta px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-cta/20 transition hover:bg-cta-hover hover:shadow-md hover:shadow-cta/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {outOfStock ? "Sin stock" : "Agregar"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
