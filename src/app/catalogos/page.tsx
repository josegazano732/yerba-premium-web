import type { Metadata } from "next";
import { WholesaleCatalog } from "@/components/wholesale/WholesaleCatalog";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Catálogos Mayoristas",
  description:
    "Catálogo mayorista de hierbas y accesorios en presentaciones de 250 g, 500 g y 1 kg. Consultá por precios y condiciones mayoristas.",
  alternates: { canonical: `${site.baseUrl}/catalogos` }
};

export default function CatalogosPage() {
  return (
    <main className="pb-24">
      <WholesaleCatalog />
    </main>
  );
}
