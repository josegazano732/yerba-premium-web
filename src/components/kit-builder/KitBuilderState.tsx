"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Product } from "@/data/products";

export type KitItem = {
  product: Product;
  quantity: number;
};

type KitBuilderStateValue = {
  items: KitItem[];
  uniqueCount: number;
  itemCount: number;
  total: number;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  incrementItem: (productId: string) => void;
  decrementItem: (productId: string) => void;
  getQuantity: (productId: string) => number;
  clear: () => void;
};

const KitBuilderStateContext = createContext<KitBuilderStateValue | null>(null);

const FALLBACK_MAX_QUANTITY = 99;

function clampQuantity(product: Product, quantity: number) {
  const max = product.stock > 0 ? product.stock : FALLBACK_MAX_QUANTITY;
  return Math.min(Math.max(quantity, 0), max);
}

export function KitBuilderStateProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [items, setItems] = useState<KitItem[]>([]);

  const value = useMemo<KitBuilderStateValue>(() => {
    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      uniqueCount: items.length,
      itemCount,
      total,
      addItem: (product) => {
        setItems((current) => {
          const existing = current.find((item) => item.product.id === product.id);
          if (!existing) return [...current, { product, quantity: 1 }];
          return current.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: clampQuantity(product, item.quantity + 1) }
              : item
          );
        });
      },
      removeItem: (productId) => {
        setItems((current) => current.filter((item) => item.product.id !== productId));
      },
      incrementItem: (productId) => {
        setItems((current) =>
          current.map((item) =>
            item.product.id === productId
              ? { ...item, quantity: clampQuantity(item.product, item.quantity + 1) }
              : item
          )
        );
      },
      decrementItem: (productId) => {
        setItems((current) =>
          current
            .map((item) =>
              item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
            )
            .filter((item) => item.quantity > 0)
        );
      },
      getQuantity: (productId) =>
        items.find((item) => item.product.id === productId)?.quantity ?? 0,
      clear: () => setItems([]),
    };
  }, [items]);

  return <KitBuilderStateContext.Provider value={value}>{children}</KitBuilderStateContext.Provider>;
}

export function useKitBuilderState() {
  const context = useContext(KitBuilderStateContext);
  if (!context) {
    throw new Error("useKitBuilderState debe usarse dentro de KitBuilderStateProvider.");
  }
  return context;
}
