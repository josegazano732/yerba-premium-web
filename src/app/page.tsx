import { BrandStory } from "@/components/brand/BrandStory";
import { ProcessSection } from "@/components/brand/ProcessSection";
import { Sustainability } from "@/components/brand/Sustainability";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ProductMarquee } from "@/components/home/ProductMarquee";
import { StoreLocator } from "@/components/locations/StoreLocator";
import { FeaturedProducts } from "@/components/products/FeaturedProducts";
import { Features } from "@/components/Features";
import { site } from "@/data/site";

const storeSchema = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "Yerba Libre",
  description: "Tienda online de mates, termos, bombillas, yerbas y accesorios materos con envio a todo el pais.",
  currenciesAccepted: "ARS",
  paymentAccepted: "Efectivo, Transferencia, Tarjeta de credito",
  areaServed: "AR"
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Yerba Libre",
  sameAs: [site.instagramUrl]
};

export default function Home() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <HeroBanner />
      <Features />
      <CategoryShowcase />
      <FeaturedProducts />
      <ProductMarquee />
      <BrandStory />
      <Sustainability />
      <ProcessSection />
      <StoreLocator />
    </main>
  );
}