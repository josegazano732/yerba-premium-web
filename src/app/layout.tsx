import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { WhatsappFab } from "@/components/layout/WhatsappFab";
import { AiMatera } from "@/components/ai-matera/AiMatera";
import { CartProvider } from "@/lib/cart-context";
import { Analytics } from "@vercel/analytics/next";
import { site } from "@/data/site";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-cormorant", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.baseUrl),
  title: {
    default: `${site.name} | Mates, Termos, Bombillas y Accesorios`,
    template: `%s | ${site.name}`
  },
  description:
    "Tienda online de mates, termos, bombillas, yerberas y accesorios materos. Envíos a todo el país desde Misiones, Argentina.",
  keywords: [
    "mates", "termos", "bombillas", "yerberas", "accesorios materos",
    "mate artesanal", "kit matero", "regalo matero", "mate argentino",
    "mate imperial", "comprar mate"
  ],
  authors: [{ name: site.name, url: site.baseUrl }],
  creator: site.name,
  openGraph: {
    siteName: site.name,
    title: `${site.name} | Mates, Termos, Bombillas y Accesorios`,
    description:
      "Tienda online de mates, termos, bombillas, yerberas y accesorios materos. Envíos a todo el país desde Misiones, Argentina.",
    type: "website",
    locale: "es_AR",
    url: site.baseUrl,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: `${site.name} — Mates, Termos y Accesorios` }]
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} | Mates, Termos, Bombillas y Accesorios`,
    description: "Tienda online de mates, termos, bombillas, yerberas y accesorios materos. Envíos a todo el país.",
    images: ["/og-image.jpg"]
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  alternates: { canonical: site.baseUrl }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${manrope.variable} ${cormorant.variable}`}>
      <body>
        <CartProvider>
          <Header />
          {children}
          <Footer />
          <WhatsappFab />
          <AiMatera />
          <Analytics />
        </CartProvider>
      </body>
    </html>
  );
}