import { CreditCard, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { Container } from "@/components/ui/Container";

const features = [
  {
    icon: Truck,
    title: "Envio a todo el pais",
    description: "Despachamos en 24 hs habiles y seguis tu pedido hasta la puerta de tu casa."
  },
  {
    icon: CreditCard,
    title: "Pagas como quieras",
    description: "Tarjeta en cuotas, transferencia o efectivo. Precios claros, sin sorpresas al final."
  },
  {
    icon: PackageCheck,
    title: "Stock real online",
    description: "Lo que ves publicado esta disponible: el catalogo se actualiza con nuestro deposito."
  },
  {
    icon: ShieldCheck,
    title: "Compra protegida",
    description: "Cambios sin vueltas dentro de los 7 dias y asesoramiento antes y despues de comprar."
  }
];

export function Features() {
  return (
    <section className="border-y border-primary/10 bg-white py-12">
      <Container>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="flex gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary/50 text-primary">
                <feature.icon size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#20341d]">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}