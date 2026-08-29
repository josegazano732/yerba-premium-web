/**
 * Skeleton que replica la métrica de ProductCard para evitar saltos visuales (CLS)
 * mientras carga el catálogo o se aplican filtros.
 */
export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-full flex-col rounded-[8px] border border-[#d9d4c8] bg-[#fffdf8] p-2"
    >
      <div className="aspect-[4/4.3] animate-pulse rounded-[6px] bg-secondary/35 ring-1 ring-[#e3ddcf]" />
      <div className="px-3 pt-3">
        <div className="h-3 w-16 animate-pulse rounded bg-secondary/70" />
        <div className="mt-3 h-6 w-3/4 animate-pulse rounded bg-secondary/70" />
      </div>
      <div className="mt-auto px-3 pb-2">
        <div className="mt-6 h-4 w-24 animate-pulse rounded bg-secondary/70" />
      </div>
    </div>
  );
}
