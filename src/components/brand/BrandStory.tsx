"use client";

import Image from "next/image";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useCatalog } from "@/lib/useCatalog";

const fallbackImages = [
  "https://images.unsplash.com/photo-1516824711718-9c1e683412ac?auto=format&fit=crop&w=1100&q=85",
  "https://images.unsplash.com/photo-1615485737457-f07082c77813?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1523920290228-4f321a939b4c?auto=format&fit=crop&w=600&q=80"
];

function listCategories(names: string[]) {
  if (names.length === 0) return "mates, termos, bombillas y accesorios";
  if (names.length === 1) return names[0].toLowerCase();
  return `${names.slice(0, -1).join(", ").toLowerCase()} y ${names[names.length - 1].toLowerCase()}`;
}

export function BrandStory() {
  const { products, isLoading } = useCatalog();

  const { topCategories, gallery, totalStock } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    }

    const ranked = Array.from(counts.entries())
      .sort((first, second) => second[1] - first[1])
      .map(([name, count]) => ({ name, count }));

    // Una imagen por categoria principal para que el collage refleje el surtido real.
    const picks: string[] = [];
    for (const { name } of ranked) {
      const match = products.find((product) => product.category === name);
      if (match) picks.push(match.image);
      if (picks.length === 3) break;
    }

    return {
      topCategories: ranked.slice(0, 4),
      gallery: picks.length === 3 ? picks : fallbackImages,
      totalStock: products.reduce((accumulator, product) => accumulator + Math.max(product.stock, 0), 0)
    };
  }, [products]);

  const categoryNames = topCategories.map((category) => category.name);

  return (
    <section className="section-pad bg-white">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Badge>Nuestra tienda</Badge>
          <h2 className="mt-4 font-serif text-4xl font-semibold text-text sm:text-5xl">
            Especialistas en {categoryNames[0] ? categoryNames[0].toLowerCase() : "mate"} y todo el equipo matero
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted">
            Trabajamos con {listCategories(categoryNames)}: cada pieza se elige a mano, se prueba y recien despues entra
            al catalogo. Nada de fotos lindas con productos que no existen.
          </p>
          <p className="mt-4 text-lg leading-8 text-muted">
            {isLoading
              ? "Estamos cargando el surtido disponible en el deposito."
              : `Hoy tenemos ${products.length} productos publicados${
                  totalStock > 0 ? ` y ${totalStock} unidades listas para despachar` : ""
                }, con reposicion permanente de lo que mas sale.`}
          </p>

          {topCategories.length > 0 && (
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {topCategories.map((category) => (
                <li key={category.name} className="rounded-2xl bg-background p-4 ring-1 ring-primary/10">
                  <p className="font-serif text-2xl text-primary">{category.count}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{category.name}</p>
                </li>
              ))}
            </ul>
          )}

          <Button href="/productos" className="mt-8 px-7 py-3 text-base">
            Ver el surtido completo
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-[8px] bg-secondary/30 sm:col-span-1 sm:aspect-[5/6] sm:row-span-2">
            <Image
              src={gallery[0]}
              alt={`Productos de ${categoryNames[0] ?? "la tienda"}`}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 25vw, 50vw"
            />
          </div>
          <div className="relative aspect-square overflow-hidden rounded-[8px] bg-secondary/30">
            <Image
              src={gallery[1]}
              alt={`Productos de ${categoryNames[1] ?? "la tienda"}`}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 25vw, 50vw"
            />
          </div>
          <div className="relative aspect-square overflow-hidden rounded-[8px] bg-secondary/30">
            <Image
              src={gallery[2]}
              alt={`Productos de ${categoryNames[2] ?? "la tienda"}`}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 25vw, 50vw"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}