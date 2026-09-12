"use client";

import { motion } from "framer-motion";
import { Check, PackageCheck, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Combo } from "@/lib/combos";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/format";

type ComboCardProps = {
  combo: Combo;
};

export function ComboCard({ combo }: Readonly<ComboCardProps>) {
  const { addCombo } = useCart();
  const [added, setAdded] = useState(false);

  const visibleItems = combo.items.slice(0, 4);
  const remainingItems = combo.items.length - visibleItems.length;

  function handleAdd() {
    if (!combo.available) return;
    addCombo(combo, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[10px] border border-[#d3d9c9] bg-[#fffdf8] p-2 shadow-[0_12px_35px_rgba(32,52,29,0.08)] transition hover:border-primary/45 hover:shadow-[0_22px_50px_rgba(32,52,29,0.14)]"
    >
      <div className="relative aspect-[4/3.15] overflow-hidden rounded-[7px] bg-[#dfe5d3]">
        {combo.image ? (
          <Image
            src={combo.image}
            alt={combo.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_20%,#f8f5eb_0%,#d8e1c8_58%,#b9cda2_100%)]">
            <PackageCheck className="h-14 w-14 text-primary/80" strokeWidth={1.25} />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#20341d]/45 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-[#20341d] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-white shadow-sm">
          Combo especial
        </span>

        {combo.savingsPercent > 0 ? (
          <span className="absolute bottom-3 left-3 rounded bg-[#d7e68c] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#20341d] shadow-sm">
            Ahorrá {combo.savingsPercent}%
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-4 sm:px-4 sm:pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary">Selección Mate Tierra</p>
            <h3 className="mt-1.5 font-serif text-2xl font-semibold leading-[1.05] text-text">{combo.name}</h3>
          </div>
          <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary/50" strokeWidth={1.5} />
        </div>
        {combo.description ? (
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted">{combo.description}</p>
        ) : null}

        <div className="mt-4 rounded-[6px] border border-[#e6e2d7] bg-[#f8f6ef] px-3 py-2.5">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#5f6657]">Incluye</p>
          <ul className="space-y-1.5">
          {visibleItems.map((item) => (
            <li key={item.productId} className="flex items-center gap-2 text-[13px] text-[#3b2a1d]">
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} />
              <span className="min-w-0 line-clamp-1">
                <strong className="font-extrabold">{item.quantity} ×</strong> {item.name}
              </span>
            </li>
          ))}
          {remainingItems > 0 ? (
            <li className="pl-5 text-xs font-semibold text-primary">+ {remainingItems} productos más</li>
          ) : null}
          </ul>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#e7e2d8] pt-4">
          <div>
            <p className="text-xs text-muted">
              Antes <span className="line-through">{formatCurrency.format(combo.regularPrice)}</span>
            </p>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-[#20341d]">
              {formatCurrency.format(combo.price)}
            </p>
          </div>
          {combo.savings > 0 ? (
            <div>
              <p className="text-right text-[10px] font-extrabold uppercase tracking-[0.11em] text-primary">Tu ahorro</p>
              <p className="mt-0.5 text-right text-sm font-extrabold text-primary">{formatCurrency.format(combo.savings)}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-1 items-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!combo.available}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta px-5 text-sm font-extrabold text-white shadow-sm shadow-cta/25 transition-all duration-300 hover:bg-cta-hover hover:shadow-md hover:shadow-cta/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag size={18} />
            {!combo.available ? "Sin stock" : added ? "¡Agregado!" : "Agregar combo al carrito"}
          </button>
        </div>

        {!combo.available ? (
          <p className="mt-2 text-center text-xs font-medium text-red-700">
            No disponible por falta de stock.
          </p>
        ) : null}
      </div>
    </motion.article>
  );
}
