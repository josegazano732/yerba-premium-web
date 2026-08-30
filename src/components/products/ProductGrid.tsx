"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Filter, Minus, Phone, Plus, Search, ShoppingBag, SlidersHorizontal, Truck, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { mapProductDetails, Product, ProductDetailsRow, products as fallbackProducts } from "@/data/products";
import { site } from "@/data/site";
import { FREE_SHIPPING_THRESHOLD, getShippingQuotes, isValidPostalCode, ShippingQuote } from "@/lib/shipping";
import { supabase } from "@/lib/supabase";
import { fetchPriceBounds } from "@/lib/catalog";
import { buildPriceBrackets, deriveMaterial, matchesPriceBracket } from "@/lib/facets";
import { useCart } from "@/lib/cart-context";
import { ProductCard } from "./ProductCard";
import { ProductCardSkeleton } from "./ProductCardSkeleton";
import { ProductDetail } from "./ProductDetail";

type Sort = "featured" | "price-asc" | "price-desc" | "name";

const sortOptions: Array<{ value: Sort; label: string }> = [
  { value: "featured", label: "Destacados" },
  { value: "price-asc", label: "Menor precio" },
  { value: "price-desc", label: "Mayor precio" },
  { value: "name", label: "Nombre A-Z" }
];

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
  const { cart, addToCart: cartAdd, changeQuantity, removeFromCart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [addedProduct, setAddedProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [postalCode, setPostalCode] = useState("");
  const [quotedPostalCode, setQuotedPostalCode] = useState("");
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState("");
  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [openSections, setOpenSections] = useState({ categorias: true, material: true, precio: true, orden: true });
  const [catalogError, setCatalogError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(24);
  const [material, setMaterial] = useState("Todos");
  const [priceBracketId, setPriceBracketId] = useState<string | null>(null);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 0 });
  const resultsRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  function handleCategorySelect(nextCategory: string) {
    setCategory(nextCategory);
    setIsFilterOpen(false);
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    if (!supabase) {
      setCatalogProducts(fallbackProducts);
      setCatalogError(true);
      setIsLoading(false);
      setPriceBounds({
        min: Math.min(...fallbackProducts.map((product) => product.price)),
        max: Math.max(...fallbackProducts.map((product) => product.price))
      });
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
          setPriceBounds({
            min: Math.min(...fallbackProducts.map((product) => product.price)),
            max: Math.max(...fallbackProducts.map((product) => product.price))
          });
          return;
        }
        startTransition(() => {
          setCatalogProducts(remoteProducts);
          setIsLoading(false);
        });
      });

    fetchPriceBounds()
      .then((bounds) => {
        if (active) setPriceBounds(bounds);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const categories = ["Todos", ...Array.from(new Set(catalogProducts.map((product) => product.category)))];

  const materials = useMemo(
    () => ["Todos", ...Array.from(new Set(catalogProducts.map((product) => deriveMaterial(product))))],
    [catalogProducts]
  );

  const priceBrackets = useMemo(
    () => buildPriceBrackets(priceBounds.min, priceBounds.max),
    [priceBounds]
  );

  const activePriceBracket = priceBrackets.find((bracket) => bracket.id === priceBracketId) ?? null;

  useEffect(() => {
    if (catalogProducts.length === 0) return;

    function applyHash() {
      const hash = decodeURIComponent(window.location.hash.replace("#", "")).trim().toLowerCase();
      if (!hash) return;
      if (hash === "carrito") {
        setIsCartOpen(true);
        return;
      }
      const match = catalogProducts.find((product) => product.category.toLowerCase() === hash);
      if (match) setCategory(match.category);
    }

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [catalogProducts]);

  const visibleProducts = catalogProducts
    .filter((product) => category === "Todos" || product.category === category)
    .filter((product) => material === "Todos" || deriveMaterial(product) === material)
    .filter((product) => !activePriceBracket || matchesPriceBracket(product.price, activePriceBracket))
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
  }, [category, deferredQuery, sort, material, priceBracketId]);

  useEffect(() => {
    if (!isFilterOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsFilterOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFilterOpen]);

  useEffect(() => {
    document.body.dataset.cartOpen = isCartOpen ? "true" : "";
    return () => {
      document.body.dataset.cartOpen = "";
    };
  }, [isCartOpen]);

  useEffect(() => {
    if (!addedProduct) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAddedProduct(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [addedProduct]);

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const selectedQuote = shippingQuotes.find((quote) => quote.id === selectedQuoteId) ?? shippingQuotes[0] ?? null;
  const shippingCost = selectedQuote?.price ?? 0;
  const orderTotal = subtotal + shippingCost;
  const missingForFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
  const freeShippingProgress = Math.min(subtotal / FREE_SHIPPING_THRESHOLD, 1);
  const crossSellProducts = catalogProducts
    .filter((product) => !cart.some((item) => item.product.id === product.id))
    .slice(0, 4);

  useEffect(() => {
    if (!quotedPostalCode) return;

    let active = true;
    getShippingQuotes({ postalCode: quotedPostalCode, subtotal })
      .then((quotes) => {
        if (active) setShippingQuotes(quotes);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [quotedPostalCode, subtotal]);

  function calculateShipping() {
    if (!isValidPostalCode(postalCode)) {
      setShippingError("Ingresá un código postal de 4 dígitos.");
      setShippingQuotes([]);
      setQuotedPostalCode("");
      return;
    }

    setShippingError("");
    setQuotedPostalCode(postalCode.trim());
  }

  const addedQuantity = cart.find((item) => item.product.id === addedProduct?.id)?.quantity ?? 1;
  const suggestedProducts = addedProduct
    ? [
        ...catalogProducts.filter((product) => product.id !== addedProduct.id && product.category === addedProduct.category),
        ...catalogProducts.filter((product) => product.id !== addedProduct.id && product.category !== addedProduct.category)
      ].slice(0, 3)
    : [];

  function addToCart(product: Product, quantity = 1) {
    cartAdd(product, quantity);
    setAddedProduct(product);
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
      `Subtotal: ${currency.format(subtotal)}`,
      ...(selectedQuote
        ? [
            `Envio (${selectedQuote.label}${quotedPostalCode ? ` - CP ${quotedPostalCode}` : ""}): ${shippingCost === 0 ? "a confirmar / bonificado" : currency.format(shippingCost)}`
          ]
        : []),
      `Total: ${currency.format(orderTotal)}`,
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
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              aria-expanded={isFilterOpen}
              aria-controls="panel-filtros"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[#d7d2c7] bg-white px-5 text-sm font-bold text-[#20341d] transition hover:border-primary hover:text-primary"
            >
              <Filter size={17} />
              Filtrar
            </button>
            {category !== "Todos" ? (
              <button
                type="button"
                onClick={() => setCategory("Todos")}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#20341d] px-4 text-sm font-bold text-white transition hover:bg-primary"
                aria-label={`Quitar filtro ${category}`}
              >
                {category}
                <X size={15} />
              </button>
            ) : null}
            {material !== "Todos" ? (
              <button
                type="button"
                onClick={() => setMaterial("Todos")}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#20341d] px-4 text-sm font-bold text-white transition hover:bg-primary"
                aria-label={`Quitar filtro ${material}`}
              >
                {material}
                <X size={15} />
              </button>
            ) : null}
            {activePriceBracket ? (
              <button
                type="button"
                onClick={() => setPriceBracketId(null)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#20341d] px-4 text-sm font-bold text-white transition hover:bg-primary"
                aria-label={`Quitar filtro ${activePriceBracket.label}`}
              >
                {activePriceBracket.label}
                <X size={15} />
              </button>
            ) : null}
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
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            </label>
          </div>
        </div>
      </div>

      <div ref={resultsRef} className="mb-5 flex items-center justify-between gap-4">
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
          {Array.from({ length: 8 }, (_, index) => <ProductCardSkeleton key={index} />)}
        </div>
      ) : visibleProducts.length > 0 ? (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {displayedProducts.map((product) => (
              <motion.div layout key={product.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                <ProductCard product={product} onAdd={addToCart} onSelect={setDetailProduct} />
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
        {detailProduct ? (
          <ProductDetail
            product={detailProduct}
            related={catalogProducts
              .filter((item) => item.id !== detailProduct.id && item.category === detailProduct.category)
              .slice(0, 4)}
            onAdd={addToCart}
            onSelect={setDetailProduct}
            onClose={() => setDetailProduct(null)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {addedProduct ? (
          <>
            <motion.button type="button" aria-label="Cerrar aviso" onClick={() => setAddedProduct(null)} className="fixed inset-0 z-[80] cursor-default bg-[#11180f]/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <div className="pointer-events-none fixed inset-0 z-[90] grid place-items-center p-4">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Producto agregado al carrito"
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.97 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="pointer-events-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[10px] bg-[#fffdf8] p-6 shadow-2xl sm:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-serif text-xl font-semibold text-[#20341d]">¡Agregado al carrito!</p>
                  <button type="button" onClick={() => setAddedProduct(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#d7d2c7] transition hover:border-primary" aria-label="Cerrar">
                    <X size={17} />
                  </button>
                </div>

                <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[6px] bg-secondary/35">
                      <Image src={addedProduct.image} alt={addedProduct.name} fill sizes="64px" className="object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#20341d]">{addedProduct.name}</p>
                      <p className="mt-1 text-sm text-muted">{addedQuantity} x {currency.format(addedProduct.price)}</p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-sm text-muted">
                      Total (<strong className="text-text">{itemCount} {itemCount === 1 ? "producto" : "productos"}</strong>): <strong className="text-text">{currency.format(subtotal)}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAddedProduct(null);
                        setIsCartOpen(true);
                      }}
                      className="mt-3 h-11 w-full rounded-[6px] bg-[#20341d] px-8 text-sm font-bold text-white transition hover:bg-primary sm:w-auto"
                    >
                      Ver carrito
                    </button>
                  </div>
                </div>

                {suggestedProducts.length > 0 ? (
                  <div className="mt-7 border-t border-[#e7e2d8] pt-6">
                    <p className="text-center text-sm font-bold text-[#20341d]">Sumá a tu compra</p>
                    <div className="mt-5 grid grid-cols-3 gap-4">
                      {suggestedProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addToCart(product)}
                          className="group rounded-[8px] p-2 text-center transition hover:bg-secondary/20"
                        >
                          <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-[6px] bg-secondary/25">
                            <Image src={product.image} alt={product.name} fill sizes="140px" className="object-cover transition duration-500 group-hover:scale-105" />
                          </div>
                          <p className="mt-3 line-clamp-2 font-serif text-base leading-tight text-text">{product.name}</p>
                          <p className="mt-1 text-sm font-bold text-[#20341d]">{currency.format(product.price)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </motion.div>
            </div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isFilterOpen ? (
          <>
            <motion.button type="button" aria-label="Cerrar filtros" onClick={() => setIsFilterOpen(false)} className="fixed inset-0 z-[60] cursor-default bg-[#11180f]/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside
              id="panel-filtros"
              role="dialog"
              aria-modal="true"
              aria-label="Filtros"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed inset-y-0 left-0 z-[70] w-[86vw] max-w-xs overflow-y-auto rounded-br-[120px] bg-[#2f4a2a] px-7 pb-16 pt-8 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-serif text-xl font-bold uppercase tracking-[0.12em] text-[#d7e68c]">Filtrar</p>
                <button type="button" onClick={() => setIsFilterOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-white/40 transition hover:bg-white/10" aria-label="Cerrar filtros">
                  <X size={17} />
                </button>
              </div>

              <div className="mt-10 border-t border-white/15 pt-5">
                <button type="button" onClick={() => setOpenSections((current) => ({ ...current, categorias: !current.categorias }))} className="flex w-full items-center justify-between text-sm font-bold uppercase tracking-[0.12em]" aria-expanded={openSections.categorias}>
                  Categorías
                  {openSections.categorias ? <Minus size={16} /> : <Plus size={16} />}
                </button>
                {openSections.categorias ? (
                  <ul className="mt-4 space-y-2.5">
                    {categories.map((item) => (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => handleCategorySelect(item)}
                          aria-pressed={category === item}
                          className={`text-left text-sm transition hover:text-[#d7e68c] ${category === item ? "font-bold text-[#d7e68c]" : "text-white/85"}`}
                        >
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-8 border-t border-white/15 pt-5">
                <button type="button" onClick={() => setOpenSections((current) => ({ ...current, material: !current.material }))} className="flex w-full items-center justify-between text-sm font-bold uppercase tracking-[0.12em]" aria-expanded={openSections.material}>
                  Material
                  {openSections.material ? <Minus size={16} /> : <Plus size={16} />}
                </button>
                {openSections.material ? (
                  <ul className="mt-4 space-y-2.5">
                    {materials.map((item) => (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => setMaterial(item)}
                          aria-pressed={material === item}
                          className={`text-left text-sm transition hover:text-[#d7e68c] ${material === item ? "font-bold text-[#d7e68c]" : "text-white/85"}`}
                        >
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-8 border-t border-white/15 pt-5">
                <button type="button" onClick={() => setOpenSections((current) => ({ ...current, precio: !current.precio }))} className="flex w-full items-center justify-between text-sm font-bold uppercase tracking-[0.12em]" aria-expanded={openSections.precio}>
                  Precio
                  {openSections.precio ? <Minus size={16} /> : <Plus size={16} />}
                </button>
                {openSections.precio ? (
                  <ul className="mt-4 space-y-2.5">
                    {priceBrackets.map((bracket) => (
                      <li key={bracket.id}>
                        <button
                          type="button"
                          onClick={() => setPriceBracketId(priceBracketId === bracket.id ? null : bracket.id)}
                          aria-pressed={priceBracketId === bracket.id}
                          className={`text-left text-sm transition hover:text-[#d7e68c] ${priceBracketId === bracket.id ? "font-bold text-[#d7e68c]" : "text-white/85"}`}
                        >
                          {bracket.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-8 border-t border-white/15 pt-5">
                <button type="button" onClick={() => setOpenSections((current) => ({ ...current, orden: !current.orden }))} className="flex w-full items-center justify-between text-sm font-bold uppercase tracking-[0.12em]" aria-expanded={openSections.orden}>
                  Ordenar por
                  {openSections.orden ? <Minus size={16} /> : <Plus size={16} />}
                </button>
                {openSections.orden ? (
                  <ul className="mt-4 space-y-2.5">
                    {sortOptions.map((option) => (
                      <li key={option.value}>
                        <button
                          type="button"
                          onClick={() => setSort(option.value)}
                          aria-pressed={sort === option.value}
                          className={`text-left text-sm transition hover:text-[#d7e68c] ${sort === option.value ? "font-bold text-[#d7e68c]" : "text-white/85"}`}
                        >
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-10 flex flex-col gap-3">
                <button type="button" onClick={() => setIsFilterOpen(false)} className="h-11 rounded-full bg-[#d7e68c] text-sm font-bold text-[#20341d] transition hover:bg-white">
                  Ver {visibleProducts.length} productos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory("Todos");
                    setMaterial("Todos");
                    setPriceBracketId(null);
                    setSort("featured");
                    setQuery("");
                  }}
                  className="text-sm font-semibold text-white/75 underline-offset-4 transition hover:text-white hover:underline"
                >
                  Limpiar filtros
                </button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isCartOpen ? (
          <>
            <motion.button type="button" aria-label="Cerrar carrito" onClick={() => setIsCartOpen(false)} className="fixed inset-0 z-[100] cursor-default bg-[#11180f]/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside role="dialog" aria-modal="true" aria-label="Carrito de compras" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 240 }} className="fixed inset-y-0 right-0 z-[110] flex w-full max-w-md flex-col bg-[#fffdf8] shadow-2xl">
              <div className="flex h-20 items-center justify-between border-b border-[#ddd8ce] px-5 sm:px-7">
                <h2 className="font-serif text-xl font-semibold uppercase tracking-[0.08em] text-[#20341d]">Carrito de compras</h2>
                <button type="button" onClick={() => setIsCartOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-[#d7d2c7] transition hover:border-primary" aria-label="Cerrar carrito"><X size={19} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
                {cart.length === 0 ? (
                  <div className="grid h-full place-items-center text-center"><div><ShoppingBag className="mx-auto text-primary" size={34} /><h3 className="mt-5 font-serif text-2xl font-semibold">Tu carrito está vacío</h3><p className="mt-2 text-sm text-muted">Buscá tu mate ideal, elegí tus hierbas y armá tu pedido en minutos.</p><button type="button" onClick={() => setIsCartOpen(false)} className="mt-6 rounded-full bg-[#20341d] px-5 py-3 text-sm font-bold text-white">Explorar productos</button></div></div>
                ) : (
                  <>
                    <div className="space-y-5">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex gap-4 border-b border-[#e2ddd3] pb-5">
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[6px] bg-secondary/30">
                            <Image src={item.product.image} alt={item.product.name} fill sizes="80px" className="object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-sm font-semibold leading-snug text-[#20341d]">{item.product.name}</h3>
                              <button type="button" onClick={() => removeFromCart(item.product.id)} className="shrink-0 text-xs font-semibold text-muted underline-offset-2 transition hover:text-red-700 hover:underline" aria-label={`Quitar ${item.product.name}`}>
                                Borrar
                              </button>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <div className="inline-flex h-9 items-center rounded-full border border-[#d7d2c7] bg-white">
                                <button type="button" onClick={() => changeQuantity(item.product.id, -1)} className="grid h-full w-9 place-items-center" aria-label="Quitar uno"><Minus size={14} /></button>
                                <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                <button type="button" onClick={() => changeQuantity(item.product.id, 1)} className="grid h-full w-9 place-items-center" aria-label="Agregar uno"><Plus size={14} /></button>
                              </div>
                              <strong className="text-base text-[#20341d]">{currency.format(item.product.price * item.quantity)}</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-[8px] bg-secondary/25 p-4 text-center">
                      <p className="text-sm font-semibold text-[#20341d]">
                        {missingForFreeShipping === 0 ? "¡Tenés envío gratis!" : <>Envío gratis <span className="text-primary">superando los {currency.format(FREE_SHIPPING_THRESHOLD)}</span></>}
                      </p>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-[#20341d] transition-all duration-500" style={{ width: `${freeShippingProgress * 100}%` }} />
                      </div>
                      {missingForFreeShipping > 0 ? (
                        <p className="mt-2 text-xs text-muted">Te faltan {currency.format(missingForFreeShipping)} para el envío bonificado.</p>
                      ) : null}
                    </div>

                    <div className="mt-6 flex items-center justify-between border-b border-[#e2ddd3] pb-4">
                      <span className="text-sm text-muted">Subtotal <span className="text-xs">(sin envío)</span></span>
                      <strong className="text-lg text-[#20341d]">{currency.format(subtotal)}</strong>
                    </div>

                    <div className="mt-4 border-b border-[#e2ddd3] pb-4">
                      <button type="button" onClick={() => setIsShippingOpen((value) => !value)} aria-expanded={isShippingOpen} className="flex w-full items-center justify-between gap-3 text-sm font-bold uppercase tracking-[0.08em] text-[#20341d]">
                        <span className="inline-flex items-center gap-2"><Truck size={18} className="text-primary" /> Calcular envío</span>
                        {isShippingOpen ? <Minus size={16} /> : <Plus size={16} />}
                      </button>

                      {isShippingOpen ? (
                        <div className="mt-4">
                          <div className="flex gap-2">
                            <label className="flex-1">
                              <span className="sr-only">Código postal</span>
                              <input
                                value={postalCode}
                                onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
                                inputMode="numeric"
                                placeholder="Código postal"
                                className="h-11 w-full rounded-[6px] border border-[#d7d2c7] bg-white px-3 text-sm outline-none transition focus:border-primary"
                              />
                            </label>
                            <button type="button" onClick={calculateShipping} className="h-11 shrink-0 rounded-[6px] bg-[#20341d] px-4 text-sm font-bold text-white transition hover:bg-primary">
                              Calcular
                            </button>
                          </div>
                          {shippingError ? <p className="mt-2 text-xs text-red-700">{shippingError}</p> : null}

                          {shippingQuotes.length > 0 ? (
                            <ul className="mt-4 space-y-2">
                              {shippingQuotes.map((quote) => (
                                <li key={quote.id}>
                                  <label className={`flex cursor-pointer items-start gap-3 rounded-[6px] border p-3 transition ${selectedQuote?.id === quote.id ? "border-primary bg-primary/5" : "border-[#e2ddd3] hover:border-primary/40"}`}>
                                    <input
                                      type="radio"
                                      name="shipping-quote"
                                      value={quote.id}
                                      checked={selectedQuote?.id === quote.id}
                                      onChange={() => setSelectedQuoteId(quote.id)}
                                      className="mt-1 accent-[#20341d]"
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-semibold text-[#20341d]">{quote.label}</span>
                                        <span className="text-sm font-bold text-[#20341d]">{quote.price === 0 ? "A confirmar" : currency.format(quote.price)}</span>
                                      </span>
                                      <span className="mt-1 block text-xs leading-5 text-muted">{quote.description} · {quote.eta}</span>
                                    </span>
                                  </label>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {crossSellProducts.length > 0 ? (
                      <div className="mt-6">
                        <p className="font-serif text-lg font-semibold uppercase tracking-[0.06em] text-[#20341d]">No te olvides de:</p>
                        <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-2">
                          {crossSellProducts.map((product) => (
                            <div key={product.id} className="flex w-56 shrink-0 items-center gap-3 rounded-[8px] border border-[#e2ddd3] bg-white p-3">
                              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[6px] bg-secondary/30">
                                <Image src={product.image} alt={product.name} fill sizes="64px" className="object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-semibold leading-snug text-[#20341d]">{product.name}</p>
                                <p className="mt-1 text-sm font-bold text-[#20341d]">{currency.format(product.price)}</p>
                                <button type="button" onClick={() => addToCart(product)} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-cta px-3 text-xs font-bold text-white transition hover:bg-cta-hover" aria-label={`Agregar ${product.name} al carrito`}>
                                  <ShoppingBag size={13} /> Agregar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {cart.length > 0 ? (
                <div className="border-t border-[#ddd8ce] bg-white px-5 py-5 sm:px-7">
                  {selectedQuote ? (
                    <div className="mb-2 flex items-center justify-between text-sm text-muted">
                      <span>Envío ({selectedQuote.label})</span>
                      <span>{shippingCost === 0 ? "A confirmar" : currency.format(shippingCost)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold uppercase tracking-[0.08em] text-[#20341d]">Total</span>
                    <strong className="font-serif text-2xl">{currency.format(orderTotal)}</strong>
                  </div>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">Formas de pago</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{site.paymentMethods.join(" · ")}</p>
                  <Link href="/checkout" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta text-sm font-bold text-white transition hover:bg-cta-hover focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2">
                    Finalizar compra
                  </Link>
                  <a href={buildWhatsappLink()} target="_blank" rel="noopener noreferrer" className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#d7d2c7] text-sm font-bold text-[#20341d] transition hover:border-primary"><Phone size={18} /> Comprar por WhatsApp</a>
                  <button type="button" onClick={() => setIsCartOpen(false)} className="mt-3 w-full text-xs font-semibold text-muted underline underline-offset-4 transition hover:text-[#20341d]">
                    Ver más productos
                  </button>
                </div>
              ) : null}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}