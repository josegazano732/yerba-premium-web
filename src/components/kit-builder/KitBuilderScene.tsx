"use client";

import { useKitBuilderState } from "./KitBuilderState";

export function KitBuilderScene() {
  const { items } = useKitBuilderState();

  return (
    <section aria-labelledby="kit-builder-scene-heading" className="rounded-[8px] border border-primary/10 bg-white p-5">
      <h2 id="kit-builder-scene-heading" className="font-serif text-2xl text-forest">
        Vista previa del kit
      </h2>
      <p className="mt-2 text-sm text-muted">
        Este contenedor esta preparado para montar la escena 3D de forma diferida.
      </p>
      <div className="mt-4 rounded-[8px] border border-dashed border-primary/20 bg-secondary/15 p-6 text-sm text-forest">
        {items.length > 0
          ? `Productos seleccionados: ${items.length}`
          : "Agrega productos para ver como quedaria tu kit."}
      </div>
    </section>
  );
}
