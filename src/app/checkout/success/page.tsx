import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderResult } from "@/components/checkout/OrderResult";
import { Container } from "@/components/ui/Container";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Pago exitoso",
  robots: { index: false, follow: false },
  alternates: { canonical: `${site.baseUrl}/checkout/success` }
};

export default function CheckoutSuccessPage() {
  return (
    <main className="pb-24">
      <Container className="pt-8 sm:pt-12">
        <Suspense fallback={<div className="py-24 text-center text-sm text-muted">Cargando…</div>}>
          <OrderResult variant="success" />
        </Suspense>
      </Container>
    </main>
  );
}
