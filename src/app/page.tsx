import { BrandStory } from "@/components/brand/BrandStory";
import { ProcessSection } from "@/components/brand/ProcessSection";
import { Sustainability } from "@/components/brand/Sustainability";
import { HeroSection } from "@/components/hero/HeroSection";
import { StoreLocator } from "@/components/locations/StoreLocator";
import { FeaturedProducts } from "@/components/products/FeaturedProducts";
import { Features } from "@/components/Features";
import { Testimonials } from "@/components/Testimonials";

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Yerba Mate Premium",
  description: "Yerba suave de Misiones.",
  brand: { "@type": "Brand", name: "Yerba Libre" },
  offers: { "@type": "Offer", priceCurrency: "ARS", price: "4900", availability: "https://schema.org/InStock" }
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Yerba Libre",
  sameAs: ["https://instagram.com", "https://tiktok.com", "https://youtube.com"]
};

export default function Home() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <HeroSection />
      <Features />
      <FeaturedProducts />
      <BrandStory />
      <Sustainability />
      <ProcessSection />
      <StoreLocator />
      <Testimonials />
    </main>
  );
}