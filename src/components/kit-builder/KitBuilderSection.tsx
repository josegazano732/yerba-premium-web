"use client";

import dynamic from "next/dynamic";
import { Container } from "@/components/ui/Container";

type KitBuilderSectionProps = {
  enabled: boolean;
};

const KitBuilderModule = dynamic(
  () => import("./KitBuilderModule").then((mod) => mod.KitBuilderModule),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[8px] border border-primary/10 bg-white p-5 text-sm text-muted">
        Preparando Kit Builder...
      </div>
    ),
  }
);

export function KitBuilderSection({ enabled }: Readonly<KitBuilderSectionProps>) {
  if (!enabled) return null;

  return (
    <section className="bg-background pb-24 pt-8 sm:pt-12" aria-labelledby="kit-builder-heading">
      <Container className="grid gap-6">
        <div className="max-w-3xl">
          <h1 id="kit-builder-heading" className="font-serif text-4xl text-forest sm:text-5xl">
            Arma tu Kit
          </h1>
          <p className="mt-3 text-sm text-muted sm:text-base">
            Selecciona productos del catalogo y crea una combinacion personalizada para tu ronda.
          </p>
        </div>
        <KitBuilderModule />
      </Container>
    </section>
  );
}
