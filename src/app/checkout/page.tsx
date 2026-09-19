import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Container } from "@/components/ui/Container";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Finalizar compra",
  description:
    "Completá tus datos y elegí el envío para pagar con Mercado Pago de forma segura. Envíos a todo el país.",
  robots: { index: false, follow: false },
  alternates: { canonical: `${site.baseUrl}/checkout` }
};

export default function CheckoutPage() {
  return (
    <main className="checkout-page min-h-screen bg-[linear-gradient(180deg,rgba(216,196,166,0.16),transparent_22rem)] pb-16 sm:pb-24">
      <Container className="px-0 pt-4 sm:px-6 sm:pt-10 lg:px-8">
        <CheckoutForm />
      </Container>
    </main>
  );
}
