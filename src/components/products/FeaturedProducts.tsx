import { Container } from "@/components/ui/Container";
import { featuredProducts } from "@/data/products";
import { ProductCard } from "./ProductCard";

export function FeaturedProducts() {
  return (
    <section className="section-pad bg-background">
      <Container>
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-accent">Productos destacados</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-text sm:text-5xl">Tu ritual, bien provisto</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted">Blend suave, accesorios honestos y packs pensados para el consumo diario.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
}