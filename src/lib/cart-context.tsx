"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@/data/products";
import { CartItem, CART_STORAGE_KEY } from "@/lib/cart";

type CartContextValue = {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  changeQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function isCartItemArray(value: unknown): value is CartItem[] {
  if (!Array.isArray(value)) return false;

  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as { quantity?: unknown; product?: unknown };
    if (typeof candidate.quantity !== "number" || !Number.isFinite(candidate.quantity) || candidate.quantity <= 0) return false;
    if (!candidate.product || typeof candidate.product !== "object") return false;
    const product = candidate.product as { id?: unknown; name?: unknown; price?: unknown; image?: unknown; category?: unknown };
    return typeof product.id === "string"
      && typeof product.name === "string"
      && typeof product.price === "number"
      && Number.isFinite(product.price)
      && typeof product.image === "string"
      && typeof product.category === "string";
  });
}

export function CartProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as unknown;
        if (isCartItemArray(parsed)) {
          setCart(parsed);
        } else {
          localStorage.removeItem(CART_STORAGE_KEY);
        }
      }
    } catch {
      // localStorage no disponible o dato corrupto
      localStorage.removeItem(CART_STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // localStorage no disponible
    }
  }, [cart, hydrated]);

  function addToCart(product: Product, quantity = 1) {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...current, { product, quantity }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  }

  return (
    <CartContext.Provider value={{ cart, addToCart, changeQuantity, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
