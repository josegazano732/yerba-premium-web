"use client";

import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { Product } from "@/data/products";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

type Props = {
  product: Product;
  onAdd: (product: Product) => void;
  isAdded?: boolean;
};

export function AiProductCard({ product, onAdd, isAdded }: Readonly<Props>) {
  return (
    <article className="flex min-w-[180px] max-w-[200px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#d9d4c8] bg-[#fffdf8] shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <div className="relative aspect-square w-full overflow-hidden bg-secondary/30">
        <Image src={product.image} alt={product.name} fill sizes="200px" className="object-cover" />
        {product.discount ? (
          <span className="absolute left-2 top-2 rounded bg-[#20341d] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            {product.discount}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{product.category}</p>
        <h4 className="font-serif text-sm font-semibold leading-snug text-[#20341d]">{product.name}</h4>
        {product.weight ? <p className="text-[11px] text-muted">{product.weight}</p> : null}
        <p className="mt-auto pt-1 text-base font-extrabold text-[#20341d]">{currency.format(product.price)}</p>
        <button
          type="button"
          onClick={() => onAdd(product)}
          className={`mt-1 flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-bold transition ${
            isAdded
              ? "bg-primary/15 text-primary"
              : "bg-cta text-white hover:bg-cta-hover"
          }`}
        >
          <ShoppingBag size={13} />
          {isAdded ? "Agregado ✓" : "Agregar al pedido"}
        </button>
      </div>
    </article>
  );
}
