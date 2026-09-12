"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Product } from "@/data/products";

type KitItem = {
  product: Product;
  quantity: number;
};

type KitBuilderStateValue = {
  items: KitItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  total: number;
};

const KitBuilderStateContext = createContext<KitBuilderStateValue | null>(null);

export function KitBuilderStateProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [items, setItems] = useState<KitItem[]>([]);

  const value = useMemo<KitBuilderStateValue>(() => {
    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    return {
      items,
      addItem: (product) => {
        setItems((current) => {
          const existing = current.find((item) => item.product.id === product.id);
          if (!existing) return [...current, { product, quantity: 1 }];
          return current.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        });
      },
      removeItem: (productId) => {
        setItems((current) => current.filter((item) => item.product.id !== productId));
      },
      clear: () => setItems([]),
      total,
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
