import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderResult } from "@/components/checkout/OrderResult";
import { Container } from "@/components/ui/Container";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Pago en proceso",
  robots: { index: false, follow: false },
  alternates: { canonical: `${site.baseUrl}/checkout/pending` }
};

export default function CheckoutPendingPage() {
  return (
    <main className="pb-24">
      <Container className="pt-8 sm:pt-12">
        <Suspense fallback={<div className="py-24 text-center text-sm text-muted">Cargando…</div>}>
          <OrderResult variant="pending" />
        </Suspense>
      </Container>
    </main>
  );
}
