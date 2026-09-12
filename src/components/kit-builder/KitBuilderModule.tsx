"use client";

import dynamic from "next/dynamic";
import { KitBuilderCatalog } from "./KitBuilderCatalog";
import { KitBuilderSummary } from "./KitBuilderSummary";
import { KitBuilderToolbar } from "./KitBuilderToolbar";
import { KitBuilderStateProvider } from "./KitBuilderState";

const KitBuilderScene = dynamic(
  () => import("./KitBuilderScene").then((mod) => mod.KitBuilderScene),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[8px] border border-primary/10 bg-white p-5 text-sm text-muted">
        Cargando escena del kit...
      </div>
    ),
  }
);

export function KitBuilderModule() {
  return (
    <KitBuilderStateProvider>
      <div className="grid gap-6">
        <KitBuilderToolbar />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <KitBuilderCatalog />
          <div className="grid gap-6">
            <KitBuilderScene />
            <KitBuilderSummary />
          </div>
        </div>
      </div>
    </KitBuilderStateProvider>
  );
}
