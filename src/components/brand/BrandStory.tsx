"use client";

import Image from "next/image";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { useCatalog } from "@/lib/useCatalog";

const fallbackImages = [
  "",

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

    // Priorizar categorias visuales del rubro: mates, termos, canastas, hierbas, bombillas.
    const GALLERY_KEYWORDS = ["mate", "termo", "canasta", "hierba", "bombill"];
    const preferred = ranked.filter((cat) =>
      GALLERY_KEYWORDS.some((kw) => cat.name.toLowerCase().includes(kw))
    );
    const rest = ranked.filter(
      (cat) => !GALLERY_KEYWORDS.some((kw) => cat.name.toLowerCase().includes(kw))
    );
    const prioritized = [...preferred, ...rest];

    const picks: string[] = [];
    for (const { name } of prioritized) {
      const match = products.find((product) => product.category === name && product.image);
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
            Seleccionamos lo que vendemos. Si está en el catálogo, es porque lo aprobamos.
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted">
            No revendemos cajas cerradas: cada mate, termo, hierba, bombilla y canasta que tenemos en stock
            lo elegimos, lo probamos y lo conocemos. Ese criterio de selección es el valor que agregamos.
          </p>
          <p className="mt-4 text-lg leading-8 text-muted">
            {isLoading
              ? "Cargando el surtido disponible en el depósito..."
              : `Hoy tenemos ${products.length} productos publicados${
                  totalStock > 0 ? ` y ${totalStock.toLocaleString("es-AR")} unidades en depósito listas para despachar` : ""
                }, con reposición permanente de lo que más rota.`}
          </p>

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