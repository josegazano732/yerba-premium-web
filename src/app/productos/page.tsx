import { ProductGrid } from "@/components/products/ProductGrid";
import { Container } from "@/components/ui/Container";

export default function ProductsPage() {
  return (
    <main className="section-pad">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold uppercase text-accent">Tienda</p>
          <h1 className="mt-3 font-serif text-5xl font-bold text-text">Productos</h1>
        </div>
        <ProductGrid />
      </Container>
    </main>
  );
}