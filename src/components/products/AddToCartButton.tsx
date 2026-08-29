"use client";

import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { type Product } from "@/data/products";
import { useCart } from "@/lib/cart-context";

export function AddToCartButton({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={product.stock === 0}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta px-8 text-sm font-bold text-white shadow-sm shadow-cta/20 transition-all duration-300 hover:bg-cta-hover hover:shadow-md hover:shadow-cta/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[200px]"
    >
      <ShoppingBag size={18} />
      {added ? "¡Agregado al carrito!" : product.stock === 0 ? "Sin stock" : "Agregar al carrito"}
    </button>
  );
}
