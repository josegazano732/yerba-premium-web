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
    <main className="pb-24">
      <Container className="pt-8 sm:pt-12">
        <CheckoutForm />
      </Container>
    </main>
  );
}
