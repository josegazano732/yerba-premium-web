import type { Metadata } from "next";
import { ProductGrid } from "@/components/products/ProductGrid";
import { Container } from "@/components/ui/Container";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Todos los productos",
  description:
    "Explorá el catálogo completo de mates, termos, bombillas, yerberas, kits materos y accesorios. Filtros por categoría y envíos a todo el país.",
  alternates: { canonical: `${site.baseUrl}/productos` }
};

export default function ProductsPage() {
  return (
    <main className="pb-24">
      <Container className="pt-8 sm:pt-12">
        <h1 className="sr-only">Mates, Termos, Bombillas y Accesorios &mdash; Catálogo completo</h1>
        <ProductGrid />
      </Container>
    </main>
  );
}