import Image from "next/image";
import { Container } from "@/components/ui/Container";

const testimonials = [
  { name: "Sofia Alvarez", role: "Fundadora de Casa Raiz", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80", text: "Tiene ese punto suave que hace que la gente vuelva. Es una yerba cotidiana, pero con presencia." },
  { name: "Martin Pereyra", role: "Sommelier de mate", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80", text: "Muy buen balance entre aroma, cuerpo y duracion. Se nota el estacionamiento natural." },
  { name: "Lucia Morel", role: "Compradora retail", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80", text: "La estetica premium ayuda en gondola y el producto sostiene la promesa." }
];

export function Testimonials() {
  return (
    <section className="section-pad bg-background">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold uppercase text-accent">Testimonios</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold text-text sm:text-5xl">Quienes ya la probaron</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="rounded-[8px] bg-white p-6 shadow-sm">
              <p className="text-lg leading-8 text-text">“{item.text}”</p>
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
      </Container>
    </section>
  );
}