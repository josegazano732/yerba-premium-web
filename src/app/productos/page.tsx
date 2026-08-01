import { ProductGrid } from "@/components/products/ProductGrid";
import { Container } from "@/components/ui/Container";

export default function ProductsPage() {
  return (
    <main className="pb-24">
      <section className="grain border-b border-primary/10 py-14 sm:py-20">
        <Container>
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_0.7fr]">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">Tienda oficial</p>
              <h1 className="mt-4 max-w-2xl font-serif text-5xl font-semibold leading-[0.98] text-[#182216] sm:text-6xl lg:text-7xl">Todo para disfrutar el ritual.</h1>
            </div>
            <p className="max-w-lg text-base leading-7 text-muted lg:justify-self-end">Yerba de origen, accesorios nobles y packs pensados para acompañarte todos los días. Compra directa, simple y segura.</p>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-primary/15 pt-5 text-xs font-bold uppercase tracking-[0.1em] text-[#34452e]">
            <span>Envíos a todo el país</span><span>Compra protegida</span><span>Calidad de origen</span>
          </div>
        </Container>
      </section>
      <Container className="pt-8 sm:pt-12">
        <ProductGrid />
      </Container>
    </main>
  );
}