import Image from "next/image";
import { Container } from "@/components/ui/Container";

export function BrandStory() {
  return (
    <section className="section-pad bg-white">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase text-accent">Storytelling de marca</p>
          <h2 className="mt-4 font-serif text-4xl font-semibold text-text sm:text-5xl">Mas que una yerba</h2>
          <p className="mt-6 text-lg leading-8 text-muted">
            Nacimos para recuperar el mate cotidiano: ese que se comparte en la cocina, acompana la ruta y baja el ritmo cuando el dia pide pausa. Trabajamos con productores de Misiones, seleccionamos hoja madura y dejamos que el estacionamiento natural ordene el sabor sin apuro.
          </p>
          <p className="mt-4 text-lg leading-8 text-muted">
            El resultado es una yerba de perfil suave, con menos polvo y una duracion estable, creada para quienes buscan bienestar sin perder identidad argentina.
          </p>
        </div>
        <div className="relative aspect-[5/6] overflow-hidden rounded-[8px]">
          <Image src="https://images.unsplash.com/photo-1516824711718-9c1e683412ac?auto=format&fit=crop&w=1100&q=85" alt="Momento lifestyle con mate" fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
      </Container>
    </section>
  );
}