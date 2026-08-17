import type { Metadata } from "next";
import { BrandStory } from "@/components/brand/BrandStory";
import { ProcessSection } from "@/components/brand/ProcessSection";
import { Sustainability } from "@/components/brand/Sustainability";
import { site } from "@/data/site";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Sobre Nosotros",
  description:
    "Conocé la historia de Mate Tierra: una marca artesanal de Misiones que selecciona mates, termos y accesorios con identidad y cuidado.",
  alternates: { canonical: `${site.baseUrl}/sobre-nosotros` }
};

const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `Sobre ${SITE_NAME}`,
  url: `${site.baseUrl}/sobre-nosotros`,
  description:
    "Mate Tierra es una marca artesanal de Misiones, Argentina, dedicada a seleccionar y ofrecer mates, termos, bombillas y accesorios materos de calidad.",
  mainEntity: {
    "@type": "Organization",
    name: SITE_NAME,
    url: site.baseUrl,
    foundingLocation: {
      "@type": "Place",
      name: "Apóstoles, Misiones, Argentina"
    },
    sameAs: [site.instagramUrl]
  }
};

export default function AboutPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
      />
      <BrandStory />
      <Sustainability />
      <ProcessSection />
    </main>
  );
}