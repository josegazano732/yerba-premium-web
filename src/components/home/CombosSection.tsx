import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Sparkles } from "lucide-react";
import { fetchActiveCombos, fetchCombosEnabled } from "@/lib/combos";
import { ComboCard } from "./ComboCard";

export async function CombosSection() {
  const enabled = await fetchCombosEnabled();
  if (!enabled) return null;

  const combos = await fetchActiveCombos();
  if (combos.length === 0) return null;

  return (
    <section
      className="relative isolate overflow-hidden bg-[#eef1e7] py-14 sm:py-18 lg:py-22"
      aria-labelledby="combos-heading"
    >
      <div aria-hidden className="absolute -left-28 top-12 h-64 w-64 rounded-full bg-[#d7e68c]/35 blur-3xl" />
      <div aria-hidden className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-secondary/35 blur-3xl" />
      <Container>
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-[#fffdf8]/90 px-3 py-1.5 shadow-sm">
            <Sparkles size={14} className="text-primary" />
            <Badge className="bg-transparent p-0">Packs con ahorro</Badge>
          </div>
          <h2 id="combos-heading" className="mt-5 font-serif text-4xl font-semibold leading-[0.95] text-[#20341d] sm:text-5xl">
            Todo lo que necesitás,
            <span className="block italic text-primary"> en un solo combo.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Selecciones pensadas para disfrutar más, combinar mejor y aprovechar un precio especial.
          </p>
        </div>

        <div className="relative mt-9 grid gap-5 sm:grid-cols-2 lg:mt-11 lg:grid-cols-3 lg:gap-6">
          {combos.map((combo) => (
            <ComboCard key={combo.id} combo={combo} />
          ))}
        </div>
      </Container>
    </section>
  );
}
