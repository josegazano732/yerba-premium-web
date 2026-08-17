import type { Metadata } from "next";
import { StoreLocator } from "@/components/locations/StoreLocator";
import { site } from "@/data/site";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Dónde Comprar",
  description:
    "Encontrá los puntos de venta de Mate Tierra en Apóstoles, Misiones y en todo el país. También podés comprar online con envío a domicilio.",
  alternates: { canonical: `${site.baseUrl}/donde-comprar` }
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE_NAME,
  url: site.baseUrl,
  telephone: `+${site.whatsappNumber}`,
  sameAs: [site.instagramUrl],
  address: {
    "@type": "PostalAddress",
    streetAddress: "Calle Funes",
    addressLocality: "Apóstoles",
    addressRegion: "Misiones",
    addressCountry: "AR"
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -27.9191968,
    longitude: -55.7473199
  },
  hasMap: "https://www.google.com/maps?q=-27.9191968,-55.7473199&z=17"
};

export default function StoresPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <StoreLocator />
    </main>
  );
}