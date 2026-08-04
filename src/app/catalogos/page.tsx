import { WholesaleCatalog } from "@/components/wholesale/WholesaleCatalog";

export const metadata = {
  title: "Catalogos mayoristas | Mate Tierra",
  description: "Catalogo mayorista de hierbas en presentaciones de 1000 g, 500 g y 250 g."
};

export default function CatalogosPage() {
  return (
    <main className="pb-24">
      <WholesaleCatalog />
    </main>
  );
}
