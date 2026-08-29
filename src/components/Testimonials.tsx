import Image from "next/image";
import { CreditCard, ShieldCheck, Star, Truck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";

const testimonials = [
  { name: "Sofia Alvarez", role: "Fundadora de Casa Raiz", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80", text: "Tiene ese punto suave que hace que la gente vuelva. Es una yerba cotidiana, pero con presencia." },
  { name: "Martin Pereyra", role: "Sommelier de mate", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80", text: "Muy buen balance entre aroma, cuerpo y duracion. Se nota el estacionamiento natural." },
  { name: "Lucia Morel", role: "Compradora retail", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80", text: "La estetica premium ayuda en gondola y el producto sostiene la promesa." }
];

const trustSeals = [
  { icon: ShieldCheck, label: "Compra protegida" },
  { icon: Truck, label: "Envíos a todo el país" },
  { icon: CreditCard, label: "Cuotas con tarjeta" }
];

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="Calificación: 5 de 5 estrellas">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className="h-4 w-4 fill-[#c98a2b] text-[#c98a2b]" aria-hidden="true" />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="section-pad bg-background" aria-labelledby="testimonios-heading">
      <Container>
        <div className="mb-10 max-w-2xl">
          <Badge>Testimonios</Badge>
          <h2 id="testimonios-heading" className="mt-4 font-serif text-3xl font-semibold text-forest sm:text-4xl">
            Quienes ya la probaron
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <Stars />
            <p className="text-sm text-muted">4.9 / 5 según reseñas de clientes</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="rounded-[8px] bg-white p-6 shadow-sm ring-1 ring-[#e3ddcf]">
              <Stars />
              <p className="mt-4 text-lg leading-8 text-text">“{item.text}”</p>
              <div className="mt-8 flex items-center gap-4">
                <Image src={item.avatar} alt={item.name} width={52} height={52} className="rounded-full object-cover" />
                <div>
                  <p className="font-bold text-text">{item.name}</p>
                  <p className="text-sm text-muted">{item.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {trustSeals.map((seal) => (
            <div key={seal.label} className="flex items-center gap-3 rounded-[8px] bg-secondary/20 px-5 py-4">
              <seal.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-forest">{seal.label}</span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}