import { ProductGrid } from "@/components/products/ProductGrid";
import { Container } from "@/components/ui/Container";

export default function ProductsPage() {
  return (
    <main className="pb-24">
      <Container className="pt-8 sm:pt-12">
        <ProductGrid />
      </Container>
    </main>
  );
}