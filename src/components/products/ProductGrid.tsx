"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Minus, Phone, Plus, Search, ShoppingBag, SlidersHorizontal, Trash2, X } from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { mapProductDetails, Product, ProductDetailsRow, products as fallbackProducts } from "@/data/products";
import { site } from "@/data/site";
import { supabase } from "@/lib/supabase";
import { ProductCard } from "./ProductCard";

type Sort = "featured" | "price-asc" | "price-desc" | "name";
type CartItem = { product: Product; quantity: number };

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function ProductGrid() {
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("featured");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(24);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    if (!supabase) {
      setCatalogProducts(fallbackProducts);
      setCatalogError(true);
      setIsLoading(false);
      return;
    }

    let active = true;
    supabase
      .from("product_details")
      .select("id,name,description,price,image,image_urls,category_name,unit_of_measure,stock,seasonal")
      .order("name")
      .then(({ data, error }) => {
        if (!active) return;
        const remoteProducts = (data as ProductDetailsRow[] | null)?.map(mapProductDetails).filter((product): product is Product => product !== null) ?? [];
        if (error || remoteProducts.length === 0) {
          setCatalogProducts(fallbackProducts);
          setCatalogError(true);
          setIsLoading(false);
          return;
        }
        startTransition(() => {
          setCatalogProducts(remoteProducts);
          setIsLoading(false);
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const categories = ["Todos", ...Array.from(new Set(catalogProducts.map((product) => product.category)))];

  useEffect(() => {
    if (catalogProducts.length === 0) return;
    const requested = decodeURIComponent(window.location.hash.replace("#", "")).trim().toLowerCase();
    if (!requested) return;
    const match = catalogProducts.find((product) => product.category.toLowerCase() === requested);
    if (match) setCategory(match.category);
  }, [catalogProducts]);

  const visibleProducts = catalogProducts
    .filter((product) => category === "Todos" || product.category === category)
    .filter((product) => `${product.name} ${product.description}`.toLowerCase().includes(deferredQuery))
    .sort((first, second) => {
      if (category === "Todos") {
        const categoryPriority = Number(second.category === "Mates") - Number(first.category === "Mates");
        if (categoryPriority !== 0) return categoryPriority;
      }
      if (sort === "price-asc") return first.price - second.price;
      if (sort === "price-desc") return second.price - first.price;
      if (sort === "name") return first.name.localeCompare(second.name);
      return Number(second.featured) - Number(first.featured);
    });
  const displayedProducts = visibleProducts.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(24);
  }, [category, deferredQuery, sort]);

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  }

  function changeQuantity(productId: string, amount: number) {
    setCart((current) => current
      .map((item) => item.product.id === productId ? { ...item, quantity: item.quantity + amount } : item)
      .filter((item) => item.quantity > 0));
  }

  function buildWhatsappLink() {
    const lines = cart.map((item, index) =>
      `${index + 1}) ${item.product.name}\n   ${item.quantity} x ${currency.format(item.product.price)} = ${currency.format(item.product.price * item.quantity)}`
    );

    const message = [
      "Hola! Quiero hacer este pedido:",
      "",
      ...lines,
      "",
      `Total: ${currency.format(subtotal)}`,
      "",
      "Formas de pago:",
      ...site.paymentMethods.map((method) => `- ${method}`),
      "",
      "Me confirman disponibilidad y el costo de envio?"
    ].join("\n");

    return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  return (
    <>
      <div className="mb-8 border-y border-[#d7d2c7] py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 lg:pb-0" aria-label="Filtrar por categoría">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${category === item ? "bg-[#20341d] text-white" : "bg-white text-text ring-1 ring-[#d7d2c7] hover:ring-primary"}`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 sm:w-64">
              <span className="sr-only">Buscar productos</span>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en la tienda" className="h-11 w-full rounded-full border border-[#d7d2c7] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
            </label>
            <label className="relative">
              <span className="sr-only">Ordenar productos</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
              <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-11 w-full appearance-none rounded-full border border-[#d7d2c7] bg-white pl-10 pr-10 text-sm font-semibold outline-none sm:w-48">
                <option value="featured">Destacados</option>
                <option value="price-asc">Menor precio</option>
                <option value="price-desc">Mayor precio</option>
                <option value="name">Nombre A-Z</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            </label>
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted"><strong className="text-text">{visibleProducts.length}</strong> productos</p>
          {catalogError ? <p className="mt-1 text-xs text-muted">Mostrando catálogo de respaldo.</p> : null}
        </div>
        <button type="button" onClick={() => setIsCartOpen(true)} className="relative inline-flex h-11 items-center gap-2 rounded-full bg-[#20341d] px-4 text-sm font-bold text-white transition hover:bg-primary" aria-label={`Abrir carrito con ${itemCount} productos`}>
          <ShoppingBag size={18} />
          Mi carrito
          {itemCount > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#d7e68c] px-1 text-[11px] text-[#20341d]">{itemCount}</span> : null}
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Cargando productos">
          {Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-[8px] bg-white/70 ring-1 ring-[#e2ddd3]" />)}
        </div>
      ) : visibleProducts.length > 0 ? (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {displayedProducts.map((product) => (
              <motion.div layout key={product.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                <ProductCard product={product} onAdd={addToCart} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="grid min-h-72 place-items-center border-y border-[#d7d2c7] text-center">
          <div><Search className="mx-auto mb-4 text-primary" size={28} /><h2 className="font-serif text-3xl font-semibold">No encontramos coincidencias</h2><p className="mt-2 text-sm text-muted">Probá con otra búsqueda o categoría.</p></div>
        </div>
      )}

      {displayedProducts.length < visibleProducts.length ? (
        <div className="mt-10 flex justify-center">
          <button type="button" onClick={() => setVisibleCount((count) => count + 24)} className="rounded-full border border-[#bdb8ad] bg-white px-6 py-3 text-sm font-bold text-[#20341d] transition hover:border-primary hover:bg-primary/5">
            Ver más productos
          </button>
        </div>
      ) : null}

      <AnimatePresence>
        {isCartOpen ? (
          <>
            <motion.button type="button" aria-label="Cerrar carrito" onClick={() => setIsCartOpen(false)} className="fixed inset-0 z-[60] cursor-default bg-[#11180f]/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside role="dialog" aria-modal="true" aria-label="Carrito de compras" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 240 }} className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-[#fffdf8] shadow-2xl">
              <div className="flex h-20 items-center justify-between border-b border-[#ddd8ce] px-5 sm:px-7">
                <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Tu selección</p><h2 className="font-serif text-2xl font-semibold">Carrito ({itemCount})</h2></div>
                <button type="button" onClick={() => setIsCartOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-[#d7d2c7]" aria-label="Cerrar carrito"><X size={19} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
                {cart.length === 0 ? (
                  <div className="grid h-full place-items-center text-center"><div><ShoppingBag className="mx-auto text-primary" size={34} /><h3 className="mt-5 font-serif text-2xl font-semibold">Tu carrito está vacío</h3><p className="mt-2 text-sm text-muted">Elegí algo rico para comenzar.</p><button type="button" onClick={() => setIsCartOpen(false)} className="mt-6 rounded-full bg-[#20341d] px-5 py-3 text-sm font-bold text-white">Explorar productos</button></div></div>
                ) : (
                  <div className="space-y-5">
                    {cart.map((item) => (
                      <div key={item.product.id} className="border-b border-[#e2ddd3] pb-5">
                        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-primary">{item.product.category}</p><h3 className="mt-1 font-serif text-xl font-semibold">{item.product.name}</h3><p className="mt-1 text-sm font-bold">{currency.format(item.product.price)}</p></div><button type="button" onClick={() => setCart((current) => current.filter((cartItem) => cartItem.product.id !== item.product.id))} className="text-muted transition hover:text-red-700" aria-label={`Quitar ${item.product.name}`}><Trash2 size={18} /></button></div>
                        <div className="mt-4 inline-flex h-9 items-center rounded-full border border-[#d7d2c7] bg-white"><button type="button" onClick={() => changeQuantity(item.product.id, -1)} className="grid h-full w-9 place-items-center" aria-label="Quitar uno"><Minus size={14} /></button><span className="w-8 text-center text-sm font-bold">{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.product.id, 1)} className="grid h-full w-9 place-items-center" aria-label="Agregar uno"><Plus size={14} /></button></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 ? <div className="border-t border-[#ddd8ce] bg-white px-5 py-5 sm:px-7"><div className="flex items-center justify-between"><span className="text-sm text-muted">Subtotal</span><strong className="font-serif text-2xl">{currency.format(subtotal)}</strong></div><p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">Formas de pago</p><p className="mt-1 text-xs leading-5 text-muted">{site.paymentMethods.join(" · ")}</p><a href={buildWhatsappLink()} target="_blank" rel="noopener noreferrer" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta text-sm font-bold text-white transition hover:bg-cta-hover focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2"><Phone size={18} /> Enviar pedido por WhatsApp</a><p className="mt-2 text-xs leading-5 text-muted">Te respondemos para confirmar stock, pago y costo de envío.</p></div> : null}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}