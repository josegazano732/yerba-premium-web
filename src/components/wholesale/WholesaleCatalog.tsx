"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, Leaf, Minus, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/ui/Container";
import { mapProductDetails, Product, ProductDetailsRow } from "@/data/products";
import { site } from "@/data/site";
import { supabase } from "@/lib/supabase";

type Presentation = { grams: number; label: string };
type OrderLine = { key: string; product: Product; grams: number; quantity: number };

const PRESENTATIONS: Presentation[] = [
  { grams: 1000, label: "1000 g" },
  { grams: 500, label: "500 g" },
  { grams: 250, label: "250 g" }
];

const CATALOGS = [
  {
    id: "hierbas",
    title: "Catalogo de Hierbas",
    category: "Hierbas",
    description: "Hierbas serranas, aromaticas y secos fraccionados para revendedores y dieteticas."
  }
];

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

/** Unidades de `unit_of_measure` que habilitan el fraccionado mayorista. */
const WEIGHT_UNITS = ["gramos", "gramo", "gs", "g", "kg", "kilo", "kilos"];

function isSoldByWeight(product: Product) {
  return WEIGHT_UNITS.includes((product.weight ?? "").trim().toLowerCase());
}

/** Los precios del catalogo estan cargados por kilo. */
function priceFor(product: Product, grams: number) {
  return (product.price * grams) / 1000;
}

export function WholesaleCatalog() {
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [order, setOrder] = useState<OrderLine[]>([]);
  const [isOrderOpen, setIsOrderOpen] = useState(false);

  useEffect(() => {
    const requested = decodeURIComponent(window.location.hash.replace("#", "")).trim().toLowerCase();
    if (CATALOGS.some((catalog) => catalog.id === requested)) setCatalogId(requested);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      setLoadError("No pudimos conectarnos al catalogo mayorista.");
      return;
    }

    let active = true;
    supabase
      .from("product_details")
      .select("id,name,description,price,image,image_urls,category_name,unit_of_measure,stock,seasonal")
      .in("category_name", CATALOGS.map((catalog) => catalog.category))
      .order("name")
      .then(({ data, error }) => {
        if (!active) return;
        setIsLoading(false);
        if (error) {
          setLoadError("No pudimos cargar el catalogo mayorista.");
          return;
        }
        setProducts(
          (data as ProductDetailsRow[] | null)
            ?.map(mapProductDetails)
            .filter((product): product is Product => product !== null)
            .filter(isSoldByWeight) ?? []
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const activeCatalog = CATALOGS.find((catalog) => catalog.id === catalogId) ?? null;

  const visibleProducts = useMemo(() => {
    if (!activeCatalog) return [];
    const search = query.trim().toLowerCase();
    return products
      .filter((product) => product.category === activeCatalog.category)
      .filter((product) => product.name.toLowerCase().includes(search));
  }, [activeCatalog, products, query]);

  const totalUnits = order.reduce((total, line) => total + line.quantity, 0);
  const totalGrams = order.reduce((total, line) => total + line.grams * line.quantity, 0);
  const orderTotal = order.reduce((total, line) => total + priceFor(line.product, line.grams) * line.quantity, 0);

  function addToOrder(product: Product) {
    const grams = selection[product.id] ?? PRESENTATIONS[0].grams;
    const key = `${product.id}-${grams}`;
    setOrder((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) => (line.key === key ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [...current, { key, product, grams, quantity: 1 }];
    });
    setIsOrderOpen(true);
  }

  function changeQuantity(key: string, amount: number) {
    setOrder((current) =>
      current
        .map((line) => (line.key === key ? { ...line, quantity: line.quantity + amount } : line))
        .filter((line) => line.quantity > 0)
    );
  }

  function buildWhatsappLink() {
    const lines = order.map(
      (line, index) =>
        `${index + 1}) ${line.product.name} - ${line.grams} g\n   ${line.quantity} x ${currency.format(priceFor(line.product, line.grams))} = ${currency.format(priceFor(line.product, line.grams) * line.quantity)}`
    );

    const message = [
      "Hola! Quiero hacer un pedido MAYORISTA:",
      activeCatalog ? `Catalogo: ${activeCatalog.title}` : "",
      "",
      ...lines,
      "",
      `Bultos: ${totalUnits}`,
      `Peso total: ${(totalGrams / 1000).toFixed(2)} kg`,
      `Total estimado: ${currency.format(orderTotal)}`,
      "",
      "Me confirman disponibilidad, condiciones mayoristas y envio?"
    ]
      .filter((entry) => entry !== "")
      .join("\n");

    return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  if (!activeCatalog) {
    return (
      <Container className="py-12 sm:py-16">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">Venta mayorista</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-[#20341d] sm:text-5xl">Catalogos</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Elegi un catalogo para armar tu pedido mayorista. Trabajamos con presentaciones de 1000 g, 500 g y 250 g.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {CATALOGS.map((catalog) => (
            <button
              key={catalog.id}
              type="button"
              onClick={() => setCatalogId(catalog.id)}
              className="group rounded-[8px] border border-primary/15 bg-white/70 p-7 text-left transition hover:border-primary/45 hover:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#20341d] text-white">
                <Leaf size={22} />
              </span>
              <span className="mt-5 block font-serif text-2xl text-[#20341d]">{catalog.title}</span>
              <span className="mt-2 block text-sm leading-6 text-muted">{catalog.description}</span>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                Ver catalogo <ArrowRight size={16} />
              </span>
            </button>
          ))}
        </div>
      </Container>
    );
  }

  return (
    <>
      <Container className="py-10 sm:py-14">
        <button
          type="button"
          onClick={() => setCatalogId(null)}
          className="inline-flex items-center gap-2 text-sm font-bold text-primary transition hover:text-[#20341d]"
        >
          <ChevronLeft size={16} /> Volver a catalogos
        </button>

        <div className="mt-6 flex flex-col gap-5 border-b border-[#d7d2c7] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">Venta mayorista</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold text-[#20341d]">{activeCatalog.title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Solo venta mayorista. Presentaciones disponibles: 1000 g, 500 g y 250 g.
            </p>
          </div>

          <label className="relative w-full lg:max-w-xs">
            <span className="sr-only">Buscar en el catalogo</span>
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar producto"
              className="h-11 w-full rounded-full border border-[#d7d2c7] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
        </div>

        {isLoading ? <p className="py-16 text-center text-sm font-bold text-muted">Cargando catalogo...</p> : null}
        {loadError ? (
          <p role="alert" className="py-16 text-center text-sm font-semibold text-red-700">
            {loadError}
          </p>
        ) : null}
        {!isLoading && !loadError && visibleProducts.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            No hay productos disponibles en este catalogo. Recorda marcar la unidad de medida en &quot;Gramos&quot; desde el panel de
            administracion para que se publiquen aca.
          </p>
        ) : null}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => {
            const grams = selection[product.id] ?? PRESENTATIONS[0].grams;
            return (
              <article
                key={product.id}
                className="flex flex-col overflow-hidden rounded-[8px] border border-primary/12 bg-white/70"
              >
                <div className="relative aspect-square bg-secondary/20">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-serif text-xl leading-tight text-[#20341d]">{product.name}</h2>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    {currency.format(product.price)} por kg
                  </p>

                  <fieldset className="mt-4">
                    <legend className="text-xs font-bold uppercase tracking-wide text-muted">Presentacion</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {PRESENTATIONS.map((presentation) => (
                        <button
                          key={presentation.grams}
                          type="button"
                          aria-pressed={grams === presentation.grams}
                          onClick={() => setSelection((current) => ({ ...current, [product.id]: presentation.grams }))}
                          className={`h-9 rounded-full border px-3.5 text-xs font-bold transition ${
                            grams === presentation.grams
                              ? "border-[#20341d] bg-[#20341d] text-white"
                              : "border-[#d7d2c7] bg-white text-[#20341d] hover:border-primary"
                          }`}
                        >
                          {presentation.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <p className="mt-4 font-serif text-2xl font-semibold text-[#20341d]">
                    {currency.format(priceFor(product, grams))}
                  </p>

                  <button
                    type="button"
                    onClick={() => addToOrder(product)}
                    className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#20341d] px-5 text-sm font-bold text-white transition hover:bg-primary"
                  >
                    <Plus size={16} /> Agregar al pedido
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </Container>

      {order.length > 0 ? (
        <button
          type="button"
          onClick={() => setIsOrderOpen(true)}
          className="fixed bottom-6 left-1/2 z-40 inline-flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-[#20341d] px-6 text-sm font-bold text-white shadow-xl transition hover:bg-primary"
        >
          <ShoppingBag size={18} /> Pedido mayorista ({totalUnits})
        </button>
      ) : null}

      <AnimatePresence>
        {isOrderOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Cerrar pedido"
              onClick={() => setIsOrderOpen(false)}
              className="fixed inset-0 z-[60] cursor-default bg-[#11180f]/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Pedido mayorista"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#e0e2dc] px-5 py-5">
                <h2 className="font-serif text-2xl font-semibold text-[#20341d]">Pedido mayorista</h2>
                <button
                  type="button"
                  onClick={() => setIsOrderOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-[#d7d9d2]"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {order.length === 0 ? (
                  <p className="text-sm text-muted">Todavia no agregaste productos.</p>
                ) : (
                  <ul className="space-y-4">
                    {order.map((line) => (
                      <li key={line.key} className="flex gap-3 border-b border-[#eceee8] pb-4">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-secondary/20">
                          <Image src={line.product.image} alt={line.product.name} fill sizes="64px" className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#20341d]">{line.product.name}</p>
                          <p className="text-xs font-semibold text-muted">
                            {line.grams} g · {currency.format(priceFor(line.product, line.grams))}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => changeQuantity(line.key, -1)}
                              className="grid h-8 w-8 place-items-center rounded-full border border-[#d7d2c7]"
                              aria-label={`Quitar una unidad de ${line.product.name}`}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="min-w-6 text-center text-sm font-bold">{line.quantity}</span>
                            <button
                              type="button"
                              onClick={() => changeQuantity(line.key, 1)}
                              className="grid h-8 w-8 place-items-center rounded-full border border-[#d7d2c7]"
                              aria-label={`Agregar una unidad de ${line.product.name}`}
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrder((current) => current.filter((item) => item.key !== line.key))}
                              className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-[#e2caca] text-red-700"
                              aria-label={`Eliminar ${line.product.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-[#e0e2dc] px-5 py-5">
                <div className="flex items-center justify-between text-sm font-semibold text-muted">
                  <span>Peso total</span>
                  <span>{(totalGrams / 1000).toFixed(2)} kg</span>
                </div>
                <div className="mt-1 flex items-center justify-between font-serif text-2xl font-semibold text-[#20341d]">
                  <span>Total</span>
                  <span>{currency.format(orderTotal)}</span>
                </div>
                <a
                  href={order.length > 0 ? buildWhatsappLink() : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={order.length === 0}
                  className={`mt-4 inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-bold text-white transition ${
                    order.length > 0 ? "bg-[#20341d] hover:bg-primary" : "pointer-events-none bg-[#20341d]/40"
                  }`}
                >
                  Enviar pedido por WhatsApp
                </a>
                <p className="mt-3 text-xs leading-5 text-muted">
                  Precios estimados sobre valor por kilo. Confirmamos disponibilidad y condiciones mayoristas por WhatsApp.
                </p>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
