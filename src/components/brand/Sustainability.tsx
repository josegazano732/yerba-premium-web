import { Check, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";

const items = [
  { icon: Check, title: "Probado antes de vender", text: "Cada mate, termo y bombilla pasa por nuestras manos antes de entrar al catalogo." },
  { icon: Sparkles, title: "Materiales que duran", text: "Calabaza curada, cuero genuino y acero inoxidable, sin plasticos que se rompen a la semana." },
  { icon: PackageCheck, title: "Combos listos para regalar", text: "Mate, bombilla, termo y yerbera armados juntos, con presentacion cuidada." },
  { icon: ShieldCheck, title: "Te acompanamos despues", text: "Te contamos como curar el mate y cambiamos lo que no te convenza dentro de los 7 dias." }
];

export function Sustainability() {
  return (
    <section className="section-pad bg-secondary/35">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold uppercase text-accent">Por que comprarnos</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold text-text sm:text-5xl">Equipo matero elegido a mano</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <article key={item.title} className="rounded-[8px] bg-white p-6">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <item.icon size={22} />
              </div>
              <h3 className="mt-6 font-serif text-2xl font-semibold text-text">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{item.text}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}