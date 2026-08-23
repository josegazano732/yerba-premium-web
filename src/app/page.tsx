import type { Metadata } from "next";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ProductMarquee } from "@/components/home/ProductMarquee";
import { PromoBanner } from "@/components/home/PromoBanner";
import { FeaturedProducts } from "@/components/products/FeaturedProducts";
import { site } from "@/data/site";
import { buildOrganizationSchema, buildStoreSchema, buildWebSiteSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: `${site.name} | Mates, Termos, Bombillas y Accesorios`,
  description:
    "Descubrí la tienda online de Mate Tierra: mates artesanales, termos, bombillas, yerberas y kits materos con envíos a todo el país desde Misiones.",
  alternates: { canonical: site.baseUrl }
};

export default function Home() {
  return (
    <main className="home-page min-w-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildStoreSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebSiteSchema()) }} />
      <HeroBanner />
      <FeaturedProducts />
      <PromoBanner />
      <ProductMarquee />
    </main>
  );
}