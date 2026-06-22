import { Container } from "@/components/ui/Container";

const steps = ["Cultivo", "Seleccion", "Estacionamiento", "Envasado"];

export function ProcessSection() {
  return (
    <section className="section-pad bg-background">
      <Container>
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-bold uppercase text-accent">Proceso productivo</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold text-text sm:text-5xl">Del monte a tu mate</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-4 lg:gap-0">
          {steps.map((step, index) => (
            <article key={step} className="relative rounded-[8px] bg-white p-6 lg:rounded-none lg:first:rounded-l-[8px] lg:last:rounded-r-[8px]">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-sm font-bold text-white">{index + 1}</span>
                <h3 className="font-serif text-2xl font-semibold text-text">{step}</h3>
              </div>
              <p className="mt-5 text-sm leading-6 text-muted">Paso {index + 1} de un flujo pensado para preservar aroma, suavidad y rendimiento.</p>
              {index < steps.length - 1 ? <div className="absolute right-0 top-1/2 hidden h-px w-8 translate-x-4 bg-primary/30 lg:block" /> : null}
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}