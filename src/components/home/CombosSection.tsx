import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Leaf, PackageCheck, Sparkles } from "lucide-react";
import { fetchActiveCombos, fetchCombosEnabled } from "@/lib/combos";
import { ComboCard } from "./ComboCard";

export async function CombosSection() {
  const enabled = await fetchCombosEnabled();
  if (!enabled) return null;

  const combos = await fetchActiveCombos();
  if (combos.length === 0) return null;

  return (
    <section
      className="relative isolate overflow-hidden bg-[#20341d] py-14 sm:py-18 lg:py-22"
      aria-labelledby="combos-heading"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,253,248,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,253,248,0.22)_1px,transparent_1px)] [background-size:36px_36px]"
      />
      <div aria-hidden className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#a9c86f]/25 blur-3xl" />
      <div aria-hidden className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#d8c4a6]/20 blur-3xl" />
      <Container>
        <div className="relative grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e68c]/35 bg-[#d7e68c]/10 px-3 py-1.5 text-[#edf4cd]">
              <Sparkles size={14} aria-hidden />
              <Badge className="bg-transparent p-0 text-[#edf4cd]">Combos con ahorro</Badge>
            </div>
            <h2 id="combos-heading" className="mt-5 font-serif text-4xl font-semibold leading-[0.92] text-[#fffdf8] sm:text-5xl lg:text-6xl">
              Elegidos para
              <span className="block italic text-[#d7e68c]"> disfrutar más.</span>
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#e5ebdc]/80 sm:text-base">
              Combinaciones pensadas producto por producto para acompañar cada ronda, con un precio especial por llevarlos juntos.
            </p>
          </div>

          <div className="grid grid-cols-2 overflow-hidden rounded-[12px] border border-white/15 bg-white/[0.07] text-[#fffdf8] backdrop-blur-sm">
            <div className="border-r border-white/15 px-4 py-4 sm:px-5">
              <PackageCheck className="h-5 w-5 text-[#d7e68c]" strokeWidth={1.5} aria-hidden />
              <p className="mt-3 text-sm font-bold">Selección especial</p>
              <p className="mt-1 text-xs leading-relaxed text-[#e5ebdc]/70">Todo listo para regalar o regalarte.</p>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <Leaf className="h-5 w-5 text-[#d7e68c]" strokeWidth={1.5} aria-hidden />
              <p className="mt-3 text-sm font-bold">Ahorro incluido</p>
              <p className="mt-1 text-xs leading-relaxed text-[#e5ebdc]/70">Mejor precio al llevar el combo completo.</p>
            </div>
          </div>
        </div>

        <div className="relative mt-9 grid gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {combos.map((combo) => (
            <ComboCard key={combo.id} combo={combo} />
          ))}
        </div>
      </Container>
    </section>
  );
}
