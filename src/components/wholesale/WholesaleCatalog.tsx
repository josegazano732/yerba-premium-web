"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, FileDown, Leaf, Minus, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
import Image from "next/image";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { mapProductDetails, Product, ProductDetailsRow } from "@/data/products";
import { site } from "@/data/site";
import { supabase } from "@/lib/supabase";

/** `grams: null` = producto que se vende por unidad, no fraccionado. */
type Presentation = { grams: number | null; label: string; customUnit?: boolean };
type OrderLine = { key: string; product: Product; grams: number | null; quantity: number; customUnit: boolean };

const PRESENTATIONS: Presentation[] = [
  { grams: 1000, label: "1000 g" },
  { grams: 500, label: "500 g" },
  { grams: 250, label: "250 g" }
];

const UNIT_PRESENTATION: Presentation[] = [{ grams: null, label: "Por unidad" }];
const CUSTOM_GRAMS_MIN = 20;
const CUSTOM_GRAMS_MAX = 100;
const CUSTOM_UNIT_PRICE_MULTIPLIER = 1.5;

/** Descripcion generica que agrega `mapProductDetails` cuando el producto no tiene texto propio. */
const GENERIC_DESCRIPTION = "Producto seleccionado de nuestra tienda.";

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

function presentationsFor(product: Product) {
  return isSoldByWeight(product) ? PRESENTATIONS : UNIT_PRESENTATION;
}

function lineKey(productId: string, grams: number | null, customUnit = false) {
  return `${productId}-${grams ?? "unidad"}-${customUnit ? "custom" : "std"}`;
}

/** Los precios de los productos por peso estan cargados por kilo. */
function priceFor(product: Product, grams: number | null, customUnit = false) {
  if (grams === null) return product.price;
  const basePrice = (product.price * grams) / 1000;
  return customUnit ? basePrice * CUSTOM_UNIT_PRICE_MULTIPLIER : basePrice;
}

function normalizeCustomGrams(raw: string) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return CUSTOM_GRAMS_MIN;
  return Math.min(CUSTOM_GRAMS_MAX, Math.max(CUSTOM_GRAMS_MIN, parsed));
}

export function WholesaleCatalog() {
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<OrderLine[]>([]);
  const [customGramsByProduct, setCustomGramsByProduct] = useState<Record<string, string>>({});
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const orderSaveMounted = useRef(false);

  // Restaura el pedido guardado tras la hidratacion.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mate-tierra-wholesale-order");
      if (saved) {
        const parsed = JSON.parse(saved) as Array<Omit<OrderLine, "key" | "customUnit"> & { key?: string; customUnit?: boolean }>;
        const restored = Array.isArray(parsed)
          ? parsed
              .filter((line) => line?.product?.id && typeof line.quantity === "number" && line.quantity > 0)
              .map((line) => {
                const customUnit = Boolean(line.customUnit);
                return {
                  ...line,
                  key: lineKey(line.product.id, line.grams, customUnit),
                  customUnit
                };
              })
          : [];
        setOrder(restored);
      }
    } catch {
      // localStorage corrupto o no disponible
    }
  }, []);

  // Salta la primera ejecucion (order = []) para no pisar el storage con un array vacio.
  useEffect(() => {
    if (!orderSaveMounted.current) {
      orderSaveMounted.current = true;
      return;
    }
    try {
      localStorage.setItem("mate-tierra-wholesale-order", JSON.stringify(order));
    } catch {
      // localStorage no disponible
    }
  }, [order]);

  // Oculta el Agente Matero (FAB) mientras el pedido mayorista esta abierto.
  useEffect(() => {
    document.body.dataset.cartOpen = isOrderOpen ? "true" : "";
    return () => {
      document.body.dataset.cartOpen = "";
    };
  }, [isOrderOpen]);

  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [isOrderPdfLoading, setIsOrderPdfLoading] = useState(false);
  const [orderPdfError, setOrderPdfError] = useState("");
  const [addedLine, setAddedLine] = useState<{ product: Product; grams: number | null; customUnit: boolean; label: string } | null>(null);

  useEffect(() => {
    if (!addedLine) return;
    const timer = setTimeout(() => setAddedLine(null), 2800);
    return () => clearTimeout(timer);
  }, [addedLine]);

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
    const categoryNames = CATALOGS.map((catalog) => catalog.category);

    Promise.all([
      supabase
        .from("product_details")
        .select("id,name,description,price,image,image_urls,category_name,unit_of_measure,stock,seasonal")
        .in("category_name", categoryNames)
        .order("name"),
      supabase
        .from("product_categories")
        .select("name,image_url")
        .in("name", categoryNames)
    ]).then(([productsResult, categoriesResult]) => {
      if (!active) return;
      setIsLoading(false);
      if (productsResult.error) {
        setLoadError("No pudimos cargar el catalogo mayorista.");
        return;
      }
      setProducts(
        (productsResult.data as ProductDetailsRow[] | null)
          ?.map(mapProductDetails)
          .filter((product): product is Product => product !== null) ?? []
      );
      const images: Record<string, string> = {};
      ((categoriesResult.data ?? []) as { name: string; image_url: string | null }[]).forEach((cat) => {
        if (cat.image_url) images[cat.name] = cat.image_url;
      });
      setCategoryImages(images);
    });

    return () => {
      active = false;
    };
  }, []);

  const activeCatalog = CATALOGS.find((catalog) => catalog.id === catalogId) ?? null;

  const visibleProducts = useMemo(() => {
    if (!activeCatalog) return [];
    const search = query.trim().toLowerCase();
    const filtered = products
      .filter((product) => product.category === activeCatalog.category)
      .filter((product) => product.name.toLowerCase().includes(search));
    return [...filtered.filter(isSoldByWeight), ...filtered.filter((p) => !isSoldByWeight(p))];
  }, [activeCatalog, products, query]);

  const totalUnits = order.reduce((total, line) => total + line.quantity, 0);
  const totalGrams = order.reduce((total, line) => total + (line.grams ?? 0) * line.quantity, 0);
  const orderTotal = order.reduce((total, line) => total + priceFor(line.product, line.grams, line.customUnit) * line.quantity, 0);

  const quantities = useMemo(
    () => new Map(order.map((line) => [line.key, line.quantity] as const)),
    [order]
  );

  function setQuantity(product: Product, grams: number | null, nextQuantity: number, customUnit = false) {
    const key = lineKey(product.id, grams, customUnit);
    setOrder((current) => {
      if (nextQuantity <= 0) return current.filter((line) => line.key !== key);
      if (current.some((line) => line.key === key)) {
        return current.map((line) => (line.key === key ? { ...line, quantity: nextQuantity } : line));
      }
      return [...current, { key, product, grams, quantity: nextQuantity, customUnit }];
    });
  }

  function changeQuantity(key: string, amount: number) {
    setOrder((current) =>
      current
        .map((line) => (line.key === key ? { ...line, quantity: line.quantity + amount } : line))
        .filter((line) => line.quantity > 0)
    );
  }

  async function handleDownloadPdf() {
    if (!activeCatalog || visibleProducts.length === 0) return;
    setIsPdfLoading(true);
    setPdfError("");
    try {
      const { downloadCatalogPdf } = await import("@/lib/catalogPdf");
      await downloadCatalogPdf({
        title: activeCatalog.title,
        intro:
          "Venta exclusiva mayorista. Las hierbas a granel se fraccionan en 1000 g, 500 g y 250 g. Tambien podes definir una unidad personalizada entre 20 g y 100 g; el resto se vende por unidad. Coordinamos disponibilidad, condiciones y envio por WhatsApp.",
        fileName: `lista-precios-${activeCatalog.id}.pdf`,
        items: visibleProducts.map((product) => ({
          name: product.name,
          image: product.image,
          description: product.description === GENERIC_DESCRIPTION ? undefined : product.description,
          priceCaption: isSoldByWeight(product)
            ? `${currency.format(product.price)} por kilo`
            : `${currency.format(product.price)} por unidad`,
          unitProduct: !isSoldByWeight(product),
          rows: presentationsFor(product).map((presentation) => ({
            label: presentation.label,
            price: priceFor(product, presentation.grams)
          }))
        }))
      });
    } catch {
      setPdfError("No pudimos generar el PDF. Volve a intentarlo.");
    } finally {
      setIsPdfLoading(false);
    }
  }

  async function handleDownloadOrderPdf() {
    if (order.length === 0) return;
    setIsOrderPdfLoading(true);
    setOrderPdfError("");
    try {
      const { downloadOrderPdf } = await import("@/lib/catalogPdf");
      await downloadOrderPdf({
        title: activeCatalog?.title ?? "Pedido mayorista",
        fileName: "detalle-pedido-mayorista.pdf",
        totalUnits,
        totalKilograms: totalGrams / 1000,
        total: orderTotal,
        lines: order.map((line) => ({
          name: line.product.name,
          image: line.product.image,
          presentation: line.grams === null ? "Por unidad" : line.customUnit ? `${line.grams} g personalizado` : `${line.grams} g`,
          quantity: line.quantity,
          unitPrice: priceFor(line.product, line.grams, line.customUnit),
          subtotal: priceFor(line.product, line.grams, line.customUnit) * line.quantity
        }))
      });
    } catch {
      setOrderPdfError("No pudimos generar el PDF. Volve a intentarlo.");
    } finally {
      setIsOrderPdfLoading(false);
    }
  }

  function buildWhatsappLink() {
    const lines = order.map(
      (line, index) =>
        `${index + 1}) ${line.product.name} - ${line.grams === null ? "por unidad" : line.customUnit ? `${line.grams} g personalizado` : `${line.grams} g`}\n   ${line.quantity} x ${currency.format(priceFor(line.product, line.grams, line.customUnit))} = ${currency.format(priceFor(line.product, line.grams, line.customUnit) * line.quantity)}`
    );

    const message = [
      "Hola! Quiero hacer un pedido MAYORISTA:",
      activeCatalog ? `Catalogo: ${activeCatalog.title}` : "",
      "",
      ...lines,
      "",
      `Bultos: ${totalUnits}`,
      totalGrams > 0 ? `Peso total: ${(totalGrams / 1000).toFixed(2)} kg` : "",
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
          Elegi un catalogo para armar tu pedido mayorista. Las hierbas a granel se fraccionan en 1000 g, 500 g, 250 g o en
          unidad personalizada de 20 g a 100 g.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {CATALOGS.map((catalog) => (
            <button
              key={catalog.id}
              type="button"
              onClick={() => setCatalogId(catalog.id)}
              className="group overflow-hidden rounded-[8px] border border-primary/15 bg-white text-left shadow-sm transition hover:border-primary/40 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {/* Cabecera con imagen de la categoría */}
              <div className="relative h-44 overflow-hidden bg-[#20341d]">
                {categoryImages[catalog.category] ? (
                  <Image
                    src={categoryImages[catalog.category]}
                    alt={catalog.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[#20341d]/85 via-[#20341d]/25 to-transparent" />
                <span className="absolute bottom-4 left-5 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm">
                  <Leaf size={20} />
                </span>
              </div>

              {/* Contenido de la tarjeta */}
              <div className="p-7">
                <span className="block font-serif text-2xl text-[#20341d]">{catalog.title}</span>
                <span className="mt-2 block text-sm leading-6 text-muted">{catalog.description}</span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary transition-[gap] duration-200 group-hover:gap-3">
                  Ver catalogo <ArrowRight size={16} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </Container>
    );
  }

  const firstUnitIndex = visibleProducts.findIndex((p) => !isSoldByWeight(p));

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
              Las hierbas a granel se piden en 1000 g, 500 g o 250 g. Tambien podes definir una unidad personalizada entre 20 g
              y 100 g; el resto por unidad. Armas el pedido y nos lo envias por WhatsApp.
            </p>
          </div>

          <div className="w-full lg:max-w-xs">
            <label className="relative block">
              <span className="sr-only">Buscar en el catalogo</span>
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar producto"
                className="h-11 w-full rounded-full border border-[#d7d2c7] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isPdfLoading || visibleProducts.length === 0}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#20341d] bg-white px-5 text-sm font-bold text-[#20341d] transition hover:bg-[#20341d] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-[#20341d]"
            >
              <FileDown size={16} />
              {isPdfLoading ? "Generando PDF..." : "Descargar lista de precios (PDF)"}
            </button>

            {pdfError ? (
              <p role="alert" className="mt-2 text-xs font-semibold text-red-700">
                {pdfError}
              </p>
            ) : null}
          </div>
        </div>

        {isLoading ? <p className="py-16 text-center text-sm font-bold text-muted">Cargando catalogo...</p> : null}
        {loadError ? (
          <p role="alert" className="py-16 text-center text-sm font-semibold text-red-700">
            {loadError}
          </p>
        ) : null}
        {!isLoading && !loadError && visibleProducts.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">No encontramos productos para esa busqueda.</p>
        ) : null}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product, index) => {
            const byWeight = isSoldByWeight(product);
            const basePresentations = presentationsFor(product);
            const customGramsInput = customGramsByProduct[product.id] ?? String(CUSTOM_GRAMS_MIN);
            const customGrams = normalizeCustomGrams(customGramsInput);
            const presentations = byWeight
              ? [...basePresentations, { grams: customGrams, label: `${customGrams} g personalizado`, customUnit: true }]
              : basePresentations;
            const isUnit = !byWeight;
            const productSubtotal = presentations.reduce(
              (total, presentation) =>
                total +
                priceFor(product, presentation.grams, presentation.customUnit === true) *
                  (quantities.get(lineKey(product.id, presentation.grams, presentation.customUnit === true)) ?? 0),
              0
            );
            return (
              <Fragment key={product.id}>
                {index === 0 && firstUnitIndex > 0 ? (
                  <div className="col-span-full mb-1">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Hierbas fraccionadas</p>
                  </div>
                ) : null}
                {firstUnitIndex !== -1 && index === firstUnitIndex ? (
                  <div className="col-span-full mt-2 border-t border-[#d7d2c7] pt-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a1a]">Por unidad</p>
                    <p className="mt-0.5 text-xs text-muted">Estos productos se venden por unidad, sin fraccionado.</p>
                  </div>
                ) : null}
                <article
                  className={`flex flex-col overflow-hidden rounded-[8px] border bg-white/70 ${
                    isUnit ? "border-[#c8a44a]/50" : "border-primary/12"
                  }`}
                >
                  <div className="relative aspect-square bg-secondary/20">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                      className="object-cover"
                    />
                    {isUnit ? (
                      <span className="absolute right-2 top-2 rounded-full bg-[#c8a44a] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                        Por unidad
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-serif text-xl leading-tight text-[#20341d]">{product.name}</h2>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                      {currency.format(product.price)} {byWeight ? "por kg" : "por unidad"}
                    </p>

                    <fieldset className="mt-4">
                      <legend className="text-xs font-bold uppercase tracking-wide text-muted">
                        {byWeight ? "Elegi cuantos paquetes de cada tamano o defini tu propia unidad" : "Elegi cuantas unidades"}
                      </legend>
                      <div className="mt-2 space-y-2">
                        {byWeight ? (
                          <div className="rounded-[8px] border border-[#e2e0d8] bg-white px-3 py-2">
                            <label htmlFor={`custom-grams-${product.id}`} className="text-xs font-semibold text-muted">
                              Unidad personalizada ({CUSTOM_GRAMS_MIN} g a {CUSTOM_GRAMS_MAX} g)
                            </label>
                            <div className="mt-1.5 flex items-center gap-2">
                              <input
                                id={`custom-grams-${product.id}`}
                                type="number"
                                min={CUSTOM_GRAMS_MIN}
                                max={CUSTOM_GRAMS_MAX}
                                value={customGramsInput}
                                onChange={(event) =>
                                  setCustomGramsByProduct((current) => ({ ...current, [product.id]: event.target.value }))
                                }
                                onBlur={() =>
                                  setCustomGramsByProduct((current) => ({
                                    ...current,
                                    [product.id]: String(normalizeCustomGrams(current[product.id] ?? String(CUSTOM_GRAMS_MIN)))
                                  }))
                                }
                                className="h-9 w-24 rounded-full border border-[#d7d2c7] bg-white px-3 text-sm font-bold text-[#20341d] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                              />
                              <span className="text-xs font-semibold text-[#8a6a1a]">Precio especial por unidad personalizada</span>
                            </div>
                          </div>
                        ) : null}
                        {presentations.map((presentation) => {
                          const quantity = quantities.get(lineKey(product.id, presentation.grams, presentation.customUnit === true)) ?? 0;
                          return (
                            <div
                              key={`${presentation.grams ?? "unidad"}-${presentation.customUnit ? "custom" : "std"}`}
                              className={`flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 transition ${
                                quantity > 0 ? "border-[#20341d] bg-[#20341d]/5" : "border-[#e2e0d8] bg-white"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#20341d]">{presentation.label}</p>
                                <p className="text-xs font-semibold text-muted">
                                  {currency.format(priceFor(product, presentation.grams, presentation.customUnit === true))} c/u
                                </p>
                              </div>

                              {quantity > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setQuantity(product, presentation.grams, quantity - 1, presentation.customUnit === true)}
                                    className="grid h-9 w-9 place-items-center rounded-full border border-[#d7d2c7] bg-white transition hover:border-primary"
                                    aria-label={`Quitar ${presentation.label} de ${product.name}`}
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span
                                    aria-live="polite"
                                    className="min-w-7 text-center text-sm font-bold text-[#20341d]"
                                  >
                                    {quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setQuantity(product, presentation.grams, quantity + 1, presentation.customUnit === true)}
                                    className="grid h-9 w-9 place-items-center rounded-full bg-[#20341d] text-white transition hover:bg-primary"
                                    aria-label={`Agregar ${presentation.label} de ${product.name}`}
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuantity(product, presentation.grams, 1, presentation.customUnit === true);
                                    setAddedLine({
                                      product,
                                      grams: presentation.grams,
                                      customUnit: presentation.customUnit === true,
                                      label: presentation.label
                                    });
                                  }}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#20341d] px-3.5 text-xs font-bold text-[#20341d] transition hover:bg-[#20341d] hover:text-white"
                                  aria-label={`Agregar ${presentation.label} de ${product.name}`}
                                >
                                  <Plus size={14} /> Agregar
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>

                    {productSubtotal > 0 ? (
                      <p className="mt-4 text-sm font-bold text-[#20341d]">
                        Subtotal: {currency.format(productSubtotal)}
                      </p>
                    ) : null}
                  </div>
                </article>
              </Fragment>
            );
          })}
        </div>
      </Container>

      <AnimatePresence>
        {order.length > 0 ? (
          <motion.button
            type="button"
            onClick={() => setIsOrderOpen(true)}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 inline-flex h-12 max-w-[calc(100vw-2rem)] items-center gap-2 whitespace-nowrap rounded-full bg-[#20341d] px-4 text-sm font-bold text-white shadow-xl transition hover:bg-primary sm:gap-3 sm:px-6"
          >
            <ShoppingBag size={16} className="shrink-0" />
            <span>Ver pedido</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{totalUnits}</span>
            <span className="border-l border-white/30 pl-2 sm:pl-3">{currency.format(orderTotal)}</span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isOrderOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Cerrar pedido"
              onClick={() => setIsOrderOpen(false)}
              className="fixed inset-0 z-[100] cursor-default bg-[#11180f]/50"
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
              className="fixed inset-y-0 right-0 z-[110] flex w-full max-w-md flex-col bg-white shadow-2xl"
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
                            {line.grams === null ? "Por unidad" : line.customUnit ? `${line.grams} g personalizado` : `${line.grams} g`} ·{" "}
                            {currency.format(priceFor(line.product, line.grams, line.customUnit))}
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
                {totalGrams > 0 ? (
                  <div className="flex items-center justify-between text-sm font-semibold text-muted">
                    <span>Peso total</span>
                    <span>{(totalGrams / 1000).toFixed(2)} kg</span>
                  </div>
                ) : null}
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
                <button
                  type="button"
                  onClick={handleDownloadOrderPdf}
                  disabled={order.length === 0 || isOrderPdfLoading}
                  className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#20341d] bg-white px-5 text-sm font-bold text-[#20341d] transition hover:bg-[#20341d] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-[#20341d]"
                >
                  <FileDown size={16} />
                  {isOrderPdfLoading ? "Generando PDF..." : "Descargar detalle (PDF)"}
                </button>
                {orderPdfError ? (
                  <p role="alert" className="mt-2 text-xs font-semibold text-red-700">
                    {orderPdfError}
                  </p>
                ) : null}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {addedLine ? (
          <>
            <motion.button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => setAddedLine(null)}
              className="fixed inset-0 z-[120] cursor-default bg-[#11180f]/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <div className="pointer-events-none fixed inset-0 z-[130] grid place-items-center p-4">
              <motion.div
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="pointer-events-auto w-full max-w-md rounded-[10px] bg-[#fffdf8] p-6 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-serif text-xl font-semibold text-[#20341d]">¡Agregado al pedido!</p>
                  <button
                    type="button"
                    onClick={() => setAddedLine(null)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#d7d2c7] transition hover:border-primary"
                    aria-label="Cerrar"
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="mt-5 flex items-center gap-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[6px] bg-secondary/35">
                    <Image src={addedLine.product.image} alt={addedLine.product.name} fill sizes="56px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#20341d]">{addedLine.product.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {addedLine.label} &middot; {currency.format(priceFor(addedLine.product, addedLine.grams, addedLine.customUnit))}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setAddedLine(null); setIsOrderOpen(true); }}
                  className="mt-5 h-10 w-full rounded-[6px] bg-[#20341d] text-sm font-bold text-white transition hover:bg-primary"
                >
                  Ver pedido ({totalUnits})
                </button>
              </motion.div>
            </div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
