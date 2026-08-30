"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Lock, MapPin, ShoppingBag, Truck } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { getShippingQuotes, ShippingQuote } from "@/lib/shipping";
import { checkoutFormSchema, CheckoutFormValues } from "@/lib/orders/schema";
import { formatCurrency } from "@/lib/format";

const PROVINCES = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Ciudad Autónoma de Buenos Aires",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

const inputClass =
  "h-11 w-full rounded-[6px] border border-[#d7d2c7] bg-white px-3 text-sm text-[#20341d] outline-none transition placeholder:text-muted focus:border-primary";

const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#20341d]";

export function CheckoutForm() {
  const { cart } = useCart();
  const [mounted, setMounted] = useState(false);
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const subtotal = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      shippingMethodId: "",
    },
  });

  const postalCode = watch("postalCode");
  const shippingMethodId = watch("shippingMethodId");
  const selectedQuote = quotes.find((quote) => quote.id === shippingMethodId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!/^\d{4}$/.test(postalCode)) {
      setQuotes([]);
      setValue("shippingMethodId", "");
      return;
    }
    let cancelled = false;
    getShippingQuotes({ postalCode, subtotal })
      .then((next) => {
        if (cancelled) return;
        setQuotes(next);
        if (!next.some((quote) => quote.id === shippingMethodId)) {
          setValue("shippingMethodId", "");
        }
      })
      .catch(() => {
        if (!cancelled) setQuotes([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postalCode, subtotal]);

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitting(true);
    setServerError("");

    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          customer: {
            name: values.name,
            email: values.email,
            phone: values.phone,
            address: values.address,
            city: values.city,
            province: values.province,
            postalCode: values.postalCode,
          },
          shippingMethodId: values.shippingMethodId,
        }),
      });

      const orderData = (await orderResponse.json().catch(() => ({}))) as {
        orderId?: string;
        error?: string;
      };

      if (!orderResponse.ok || !orderData.orderId) {
        throw new Error(orderData.error ?? "No se pudo crear el pedido.");
      }

      const preferenceResponse = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderData.orderId }),
      });

      const preferenceData = (await preferenceResponse.json().catch(() => ({}))) as {
        initPoint?: string;
        error?: string;
      };

      if (!preferenceResponse.ok || !preferenceData.initPoint) {
        throw new Error(preferenceData.error ?? "No se pudo iniciar el pago.");
      }

      window.location.href = preferenceData.initPoint;
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
      setSubmitting(false);
    }
  }

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-muted">Cargando tu carrito…</div>;
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <ShoppingBag className="mx-auto text-primary" size={40} />
        <h2 className="mt-6 font-serif text-3xl font-semibold text-[#20341d]">Tu carrito está vacío</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Agregá productos a tu carrito para iniciar la compra.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cta px-6 text-sm font-bold text-white transition hover:bg-cta-hover"
        >
          Explorar productos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <h1 className="font-serif text-3xl font-semibold uppercase tracking-[0.06em] text-[#20341d] sm:text-4xl">
        Finalizar compra
      </h1>
      <p className="mt-2 text-sm text-muted">Completá tus datos y elegí el envío para pagar con Mercado Pago.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-8">
          {/* Datos del cliente */}
          <section>
            <h2 className="font-serif text-xl font-semibold text-[#20341d]">Datos del cliente</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className={labelClass}>Nombre y apellido</label>
                <input id="name" autoComplete="name" placeholder="Ej.: Juan Pérez" className={inputClass} {...register("name")} />
                {errors.name ? <p className="mt-1 text-xs text-red-700">{errors.name.message}</p> : null}
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>Email</label>
                <input id="email" type="email" autoComplete="email" inputMode="email" placeholder="tu@email.com" className={inputClass} {...register("email")} />
                {errors.email ? <p className="mt-1 text-xs text-red-700">{errors.email.message}</p> : null}
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>Teléfono</label>
                <input id="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="Cód. de área + número" className={inputClass} {...register("phone")} />
                {errors.phone ? <p className="mt-1 text-xs text-red-700">{errors.phone.message}</p> : null}
              </div>
            </div>
          </section>

          {/* Envío */}
          <section>
            <h2 className="font-serif text-xl font-semibold text-[#20341d]">Datos de envío</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="address" className={labelClass}>Dirección</label>
                <input id="address" autoComplete="street-address" placeholder="Calle y número, piso/depto" className={inputClass} {...register("address")} />
                {errors.address ? <p className="mt-1 text-xs text-red-700">{errors.address.message}</p> : null}
              </div>
              <div>
                <label htmlFor="city" className={labelClass}>Ciudad</label>
                <input id="city" autoComplete="address-level2" placeholder="Tu ciudad" className={inputClass} {...register("city")} />
                {errors.city ? <p className="mt-1 text-xs text-red-700">{errors.city.message}</p> : null}
              </div>
              <div>
                <label htmlFor="province" className={labelClass}>Provincia</label>
                <select id="province" autoComplete="address-level1" className={inputClass} {...register("province")}>
                  <option value="">Seleccionar…</option>
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
                {errors.province ? <p className="mt-1 text-xs text-red-700">{errors.province.message}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="postalCode" className={labelClass}>Código postal</label>
                <input
                  id="postalCode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="Ej.: 3300"
                  maxLength={4}
                  className={`${inputClass} max-w-40`}
                  {...register("postalCode", {
                    onChange: (event) => {
                      const value = String(event.target.value).replace(/\D/g, "").slice(0, 4);
                      setValue("postalCode", value, { shouldValidate: true });
                    },
                  })}
                />
                {errors.postalCode ? <p className="mt-1 text-xs text-red-700">{errors.postalCode.message}</p> : null}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#20341d]">
                <Truck size={16} className="text-primary" /> Método de envío
              </p>
              {quotes.length === 0 ? (
                <p className="text-sm text-muted">Ingresá un código postal de 4 dígitos para ver las opciones de envío.</p>
              ) : (
                <ul className="space-y-2">
                  {quotes.map((quote) => (
                    <li key={quote.id}>
                      <label className={`flex cursor-pointer items-start gap-3 rounded-[6px] border p-3 transition ${shippingMethodId === quote.id ? "border-primary bg-primary/5" : "border-[#e2ddd3] hover:border-primary/40"}`}>
                        <input
                          type="radio"
                          value={quote.id}
                          checked={shippingMethodId === quote.id}
                          onChange={() => setValue("shippingMethodId", quote.id, { shouldValidate: true })}
                          className="mt-1 accent-[#20341d]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-[#20341d]">{quote.label}</span>
                            <span className="text-sm font-bold text-[#20341d]">{quote.price === 0 ? "A confirmar" : formatCurrency.format(quote.price)}</span>
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted">{quote.description} · {quote.eta}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {errors.shippingMethodId ? <p className="mt-2 text-xs text-red-700">{errors.shippingMethodId.message}</p> : null}
            </div>
          </section>
        </div>

        {/* Resumen del pedido */}
        <aside className="h-fit rounded-[10px] border border-[#e2ddd3] bg-white p-6 lg:sticky lg:top-32">
          <h2 className="font-serif text-xl font-semibold text-[#20341d]">Resumen del pedido</h2>
          <ul className="mt-5 space-y-4">
            {cart.map((item) => (
              <li key={item.product.id} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[6px] bg-secondary/30">
                  <Image src={item.product.image} alt={item.product.name} fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#20341d]">{item.product.name}</p>
                  <p className="text-xs text-muted">{item.quantity} x {formatCurrency.format(item.product.price)}</p>
                </div>
                <strong className="text-sm text-[#20341d]">{formatCurrency.format(item.product.price * item.quantity)}</strong>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2 border-t border-[#e2ddd3] pt-4 text-sm">
            <div className="flex items-center justify-between text-muted">
              <span>Subtotal ({itemCount} {itemCount === 1 ? "producto" : "productos"})</span>
              <span>{formatCurrency.format(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-muted">
              <span>Envío</span>
              <span>{selectedQuote ? (selectedQuote.price === 0 ? "A confirmar" : formatCurrency.format(selectedQuote.price)) : "—"}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#e2ddd3] pt-3">
              <span className="text-sm font-bold uppercase tracking-wide text-[#20341d]">Total</span>
              <strong className="font-serif text-2xl text-[#20341d]">{formatCurrency.format(subtotal + (selectedQuote?.price ?? 0))}</strong>
            </div>
          </div>

          {serverError ? (
            <p className="mt-4 rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{serverError}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta text-sm font-bold text-white transition hover:bg-cta-hover focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <LoaderCircle size={18} className="animate-spin" /> : <Lock size={18} />}
            {submitting ? "Creando tu pedido…" : "Pagar con Mercado Pago"}
          </button>

          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted">
            <MapPin size={14} className="shrink-0 text-primary" />
            El total final se calcula de forma segura en el servidor antes de pagar.
          </p>
        </aside>
      </form>
    </div>
  );
}
