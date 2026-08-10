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
    <article className="flex min-w-[130px] max-w-[148px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#d9d4c8] bg-[#fffdf8] shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <div className="relative h-24 w-full overflow-hidden bg-secondary/30">
        <Image src={product.image} alt={product.name} fill sizes="148px" className="object-cover" />
        {product.discount ? (
          <span className="absolute left-2 top-2 rounded bg-[#20341d] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            {product.discount}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <p className="text-[9px] font-bold uppercase tracking-wide text-primary">{product.category}</p>
        <h4 className="text-[12px] font-semibold leading-snug text-[#20341d]">{product.name}</h4>
        {product.weight ? <p className="text-[10px] text-muted">{product.weight}</p> : null}
        <p className="mt-auto pt-0.5 text-sm font-extrabold text-[#20341d]">{currency.format(product.price)}</p>
        <button
          type="button"
          onClick={() => onAdd(product)}
          className={`mt-1 flex h-7 items-center justify-center gap-1 rounded-full text-[11px] font-bold transition ${
            isAdded
              ? "bg-primary/15 text-primary"
              : "bg-cta text-white hover:bg-cta-hover"
          }`}
        >
          <ShoppingBag size={11} />
          {isAdded ? "Agregado ✓" : "Agregar al pedido"}
        </button>
      </div>
    </article>
  );
}
