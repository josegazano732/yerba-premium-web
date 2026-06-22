import { Leaf, ShieldCheck, Sprout } from "lucide-react";
import { Container } from "@/components/ui/Container";

const features = [
  {
    icon: Sprout,
    title: "Origen cuidado",
    description: "Yerba cultivada en Misiones con seleccion de hoja madura y perfil aromatico limpio."
  },
  {
    icon: ShieldCheck,
    title: "Suavidad diaria",
    description: "Estacionamiento natural para una cebada amable, estable y con baja presencia de polvo."
  },
  {
    icon: Leaf,
    title: "Ritual premium",
    description: "Producto artesanal, packaging sobrio y una experiencia lista para vender online."
  }
];

export function Features() {
  return (
    <section className="section-pad bg-white">
      <Container>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-[8px] border border-primary/10 bg-background p-6">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-white">
                <feature.icon size={22} />
              </div>
              <h2 className="mt-6 font-serif text-2xl font-semibold text-text">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{feature.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}