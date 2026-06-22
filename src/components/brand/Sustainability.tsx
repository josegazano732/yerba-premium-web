import { Leaf, PackageCheck, Sparkles, Timer } from "lucide-react";
import { Container } from "@/components/ui/Container";

const items = [
  { icon: Leaf, title: "Cultivada en Misiones", text: "Hojas de origen seleccionado y trazabilidad clara." },
  { icon: Timer, title: "12 meses natural", text: "Estacionamiento paciente para un sabor redondo." },
  { icon: Sparkles, title: "Menos polvo", text: "Molienda equilibrada para cebadas mas limpias." },
  { icon: PackageCheck, title: "Sabor duradero", text: "Perfil suave que sostiene varias rondas." }
];

export function Sustainability() {
  return (
    <section className="section-pad bg-secondary/35">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold uppercase text-accent">Diferenciales</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold text-text sm:text-5xl">Natural desde el origen</h2>
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