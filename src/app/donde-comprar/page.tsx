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
    streetAddress: "Barrio 56 Viv Casa 31",
    addressLocality: "Apóstoles",
    addressRegion: "Misiones",
    addressCountry: "AR"
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -27.9192546,
    longitude: -55.74738
  },
  hasMap: "https://www.google.com/maps/search/?api=1&query=-27.9192546,-55.74738&query_place_id=ChIJZZqJv3o9VpQRIKR3ZPTjwsg"
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