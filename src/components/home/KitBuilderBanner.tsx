"use client";

import Link from "next/link";
import { PackageCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { ENV_DEFAULT_STORE_CONFIG } from "@/config/store";
import { resolveKitBuilder3DEnabledClient } from "@/lib/store-features-client";

export function KitBuilderBanner() {
  const [enabled, setEnabled] = useState(ENV_DEFAULT_STORE_CONFIG.features.kitBuilder3D);

  useEffect(() => {
    resolveKitBuilder3DEnabledClient()
      .then((nextValue) => setEnabled(nextValue))
      .catch(() => undefined);
  }, []);

  if (!enabled) return null;

  return (
    <section className="bg-background py-6 sm:py-8">
      <Container>
        <div className="rounded-[8px] border border-primary/15 bg-gradient-to-r from-[#20341d] to-[#35552f] p-5 text-white sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#d7e68c]">
                <Sparkles className="h-3.5 w-3.5" />
                Nuevo modulo
              </p>
              <h2 className="mt-2 font-serif text-3xl leading-none sm:text-4xl">Arma tu Kit 3D</h2>
              <p className="mt-2 text-sm text-[#e5ebdc] sm:text-base">
                Diseña tu combinacion ideal y visualizala en una experiencia dedicada.
              </p>
            </div>
            <Link
              href="/kit-builder"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-forest transition hover:bg-secondary"
            >
              <PackageCheck className="h-4 w-4" />
              Ir al Kit Builder
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
