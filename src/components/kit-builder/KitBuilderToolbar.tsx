"use client";

import Link from "next/link";
import { ChevronLeft, PackageCheck } from "lucide-react";

export function KitBuilderToolbar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href="/productos"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-cta-hover"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a productos
      </Link>
      <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-secondary/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-forest">
        <PackageCheck className="h-3.5 w-3.5" />
        Kit Builder (beta)
      </p>
    </div>
  );
}
