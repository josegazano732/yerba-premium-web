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
        <KitBuilderScene />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">

          <KitBuilderCatalog />
          <KitBuilderSummary />
        </div>
      </div>
    </KitBuilderStateProvider>
  );
}
