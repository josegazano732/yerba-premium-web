"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, Clock, CreditCard, LoaderCircle, Mail, MapPin, Phone, Search, ShoppingBag, Truck, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders/status";

type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type AdminOrder = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingPostalCode: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  status: string;
  paymentProvider: string;
  paymentStatus: string;
  paymentId: string | null;
  mercadopagoPreferenceId: string | null;
  shippingLabel: string | null;
  shippingEta: string | null;
  createdAt: string;
  items: OrderItem[];
};

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type FilterValue = "all" | OrderStatus;

const orderStatusTone: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-[#e8eee3] text-[#385133]",
  preparing: "bg-sky-100 text-sky-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

const paymentStatusTone: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  in_process: "bg-sky-100 text-sky-800",
  cancelled: "bg-stone-200 text-stone-600",
  refunded: "bg-stone-200 text-stone-600",
};

function StatusBadge({ label, tone }: { label: string; tone: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{label}</span>;
}

export function OrderAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [draftStatus, setDraftStatus] = useState<OrderStatus>("pending");
  const [draftPayment, setDraftPayment] = useState<PaymentStatus>("pending");

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";
    return { Authorization: `Bearer ${token}` };
  }, []);

  const loadOrders = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setMessage("");
    const headers = await authHeaders();
    const response = await fetch("/api/admin/orders", { headers, cache: "no-store" });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setMessage(body?.error ?? "No se pudieron cargar los pedidos.");
      return;
    }
    const body = (await response.json()) as { orders: AdminOrder[] };
    setOrders(body.orders ?? []);
  }, [authHeaders]);

  useEffect(() => {
    if (session) void loadOrders();
  }, [session, loadOrders]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setAuthError("No pudimos iniciar sesión. Revisá tus credenciales.");
  }

  function openDetail(order: AdminOrder) {
    setSelected(order);
    setDraftStatus(order.status as OrderStatus);
    setDraftPayment(order.paymentStatus as PaymentStatus);
  }

  async function saveStatus() {
    if (!selected || !supabase) return;
    setSaving(true);
    setMessage("");
    const headers = { ...(await authHeaders()), "Content-Type": "application/json" };
    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ id: selected.id, status: draftStatus, paymentStatus: draftPayment }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setMessage(body?.error ?? "No se pudo actualizar el pedido.");
      return;
    }
    setSelected(null);
    setMessage("Pedido actualizado.");
    await loadOrders();
  }

  const deferredQuery = query.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchesFilter = filter === "all" || order.status === filter;
    const matchesQuery = `${order.customerName} ${order.customerEmail} ${order.id}`
      .toLowerCase()
      .includes(deferredQuery);
    return matchesFilter && matchesQuery;
  });

  if (checkingSession) {
    return <main className="grid min-h-[70vh] place-items-center bg-[#f3f1ea]"><p className="text-sm font-bold text-muted">Verificando acceso...</p></main>;
  }

  if (!session) {
    return (
      <main className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#eef0e8] px-4 py-16">
        <section className="w-full max-w-md border border-[#d8dbd0] bg-white p-7 shadow-[0_24px_70px_rgba(23,41,21,0.1)] sm:p-9">
          <div className="grid h-12 w-12 place-items-center rounded bg-[#20341d] text-white"><ShoppingBag size={24} /></div>
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Administración</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-[#172116]">Acceso a pedidos</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Ingresá con un usuario autorizado en Supabase.</p>
          <form onSubmit={signIn} className="mt-7 space-y-4">
            <label className="block text-sm font-bold">Correo<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full border border-[#cfd4c9] px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
            <label className="block text-sm font-bold">Contraseña<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full border border-[#cfd4c9] px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
            {authError ? <p role="alert" className="text-sm font-semibold text-red-700">{authError}</p> : null}
            <button type="submit" disabled={loading} className="h-12 w-full bg-[#20341d] text-sm font-bold text-white transition hover:bg-primary disabled:opacity-60">{loading ? "Ingresando..." : "Ingresar"}</button>
          </form>
        </section>
      </main>
    );
  }

  const pendingCount = orders.filter((order) => order.status === "pending" || order.status === "confirmed").length;
  const inTransitCount = orders.filter((order) => ["preparing", "shipped"].includes(order.status)).length;
  const deliveredCount = orders.filter((order) => order.status === "delivered").length;

  return (
    <main className="min-h-screen bg-[#f3f1ea] pb-20">
      <header className="border-b border-[#d7dbd1] bg-[#1d2d1a] text-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-7 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b9d282]">Panel de administración</p>
            <h1 className="mt-1 font-serif text-4xl font-semibold">Órdenes</h1>
            <p className="mt-1 text-xs text-white/60">{session.user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin/productos" className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-bold transition hover:bg-white/10">Productos</Link>
            <button type="button" onClick={() => void loadOrders()} className="inline-flex h-11 items-center gap-2 bg-[#d7e68c] px-5 text-sm font-extrabold text-[#172116]"><Clock size={18} /> Actualizar</button>
            <button type="button" onClick={() => supabase?.auth.signOut()} className="h-11 border border-white/25 px-5 text-sm font-bold hover:bg-white/10">Cerrar sesión</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 pt-7 sm:px-7">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="border border-[#d9dcd3] bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Total</p><p className="mt-2 font-serif text-4xl font-semibold">{orders.length}</p></div>
          <div className="border border-[#d9dcd3] bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Por confirmar</p><p className="mt-2 font-serif text-4xl font-semibold">{pendingCount}</p></div>
          <div className="border border-[#d9dcd3] bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">En preparación / enviados</p><p className="mt-2 font-serif text-4xl font-semibold">{inTransitCount}</p></div>
          <div className="border border-[#d9dcd3] bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Entregados</p><p className="mt-2 font-serif text-4xl font-semibold">{deliveredCount}</p></div>
        </div>

        <section className="mt-6 border border-[#d9dcd3] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#e0e2dc] p-4 md:flex-row md:items-center md:justify-between">
            <label className="relative w-full md:max-w-sm">
              <span className="sr-only">Buscar pedidos</span>
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por cliente, correo o #pedido" className="h-11 w-full border border-[#cfd4c9] pl-10 pr-4 text-sm outline-none focus:border-primary" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFilter("all")} className={`h-9 px-3 text-xs font-bold ${filter === "all" ? "bg-[#20341d] text-white" : "border border-[#cfd4c9] hover:border-primary"}`}>Todas</button>
              {ORDER_STATUSES.map((status) => (
                <button key={status} type="button" onClick={() => setFilter(status)} className={`h-9 px-3 text-xs font-bold ${filter === status ? "bg-[#20341d] text-white" : "border border-[#cfd4c9] hover:border-primary"}`}>{ORDER_STATUS_LABELS[status]}</button>
              ))}
            </div>
          </div>

          {message ? <p role="status" className="border-b border-[#e0e2dc] bg-[#f5f7f1] px-4 py-3 text-sm font-semibold text-[#385133]">{message}</p> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-[#f5f4ef] text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Productos</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Pago</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e6e1]">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#fafaf7]">
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs font-bold text-[#1d2d1a]">{order.id.slice(0, 8)}</p>
                      <p className="mt-0.5 text-xs text-muted">{dateTime.format(new Date(order.createdAt))}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#1d2d1a]">{order.customerName}</p>
                      <p className="text-xs text-muted">{order.customerEmail}</p>
                    </td>
                    <td className="px-4 py-4 text-muted">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td className="px-4 py-4 font-bold">{currency.format(order.total)}</td>
                    <td className="px-4 py-4"><StatusBadge label={PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus] ?? order.paymentStatus} tone={paymentStatusTone[order.paymentStatus] ?? "bg-stone-200 text-stone-600"} /></td>
                    <td className="px-4 py-4"><StatusBadge label={ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status} tone={orderStatusTone[order.status] ?? "bg-stone-200 text-stone-600"} /></td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <button type="button" onClick={() => openDetail(order)} className="h-9 border border-[#cfd4c9] px-3 text-xs font-bold hover:border-primary">Ver detalle</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading ? <p className="p-8 text-center text-sm font-bold text-muted">Cargando pedidos...</p> : null}
          {!loading && filteredOrders.length === 0 ? <p className="p-10 text-center text-sm text-muted">No hay pedidos que coincidan con los filtros.</p> : null}
        </section>
      </div>

      <AnimatePresence>
        {selected ? (
          <>
            <motion.button
              type="button"
              aria-label="Cerrar detalle"
              onClick={() => setSelected(null)}
              className="fixed inset-0 z-[60] cursor-default bg-[#11180f]/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Detalle del pedido"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="fixed inset-y-0 right-0 z-[70] w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#e0e2dc] px-6 py-5">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Pedido</p>
                  <p className="mt-1 font-mono text-sm font-bold text-[#1d2d1a]">{selected.id}</p>
                </div>
                <button type="button" aria-label="Cerrar" onClick={() => setSelected(null)} className="grid h-10 w-10 place-items-center border border-[#cfd4c9] hover:bg-[#f3f1ea]"><X size={18} /></button>
              </div>

              <div className="space-y-6 p-6">
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Cliente</h2>
                  <p className="mt-2 font-serif text-2xl font-semibold text-[#1d2d1a]">{selected.customerName}</p>
                  <div className="mt-3 space-y-2 text-sm text-muted">
                    <p className="flex items-center gap-2"><Mail size={16} /> {selected.customerEmail}</p>
                    {selected.customerPhone ? <p className="flex items-center gap-2"><Phone size={16} /> {selected.customerPhone}</p> : null}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Envío</h2>
                  <div className="mt-3 space-y-2 text-sm text-muted">
                    <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0" /> {selected.shippingAddress}, {selected.shippingCity}, {selected.shippingProvince} (CP {selected.shippingPostalCode})</p>
                    {selected.shippingLabel ? <p className="flex items-center gap-2"><Truck size={16} /> {selected.shippingLabel}{selected.shippingEta ? ` · ${selected.shippingEta}` : ""}</p> : null}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Productos</h2>
                  <ul className="mt-3 divide-y divide-[#e5e6e1]">
                    {selected.items.map((item) => (
                      <li key={item.productId} className="flex items-center justify-between gap-4 py-3 text-sm">
                        <div>
                          <p className="font-bold text-[#1d2d1a]">{item.productName}</p>
                          <p className="text-xs text-muted">{item.quantity} × {currency.format(item.unitPrice)}</p>
                        </div>
                        <p className="font-bold">{currency.format(item.subtotal)}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 space-y-1 border-t border-[#e0e2dc] pt-4 text-sm">
                    <div className="flex justify-between text-muted"><span>Subtotal</span><span>{currency.format(selected.subtotal)}</span></div>
                    <div className="flex justify-between text-muted"><span>Envío</span><span>{currency.format(selected.shippingCost)}</span></div>
                    <div className="flex justify-between font-serif text-lg font-semibold text-[#1d2d1a]"><span>Total</span><span>{currency.format(selected.total)}</span></div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Pago</h2>
                  <div className="mt-3 space-y-2 text-sm text-muted">
                    <p className="flex items-center gap-2"><CreditCard size={16} /> {selected.paymentProvider === "mercadopago" ? "Mercado Pago" : selected.paymentProvider}</p>
                    {selected.paymentId ? <p className="break-all">ID de pago: {selected.paymentId}</p> : null}
                  </div>
                </section>

                <section className="border border-[#d9dcd3] bg-[#f7f6f1] p-5">
                  <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Actualizar estado</h2>
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-bold">
                      Estado del pedido
                      <span className="relative mt-2 block">
                        <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as OrderStatus)} className="h-11 w-full appearance-none border border-[#cfd4c9] bg-white px-4 pr-10 text-sm outline-none focus:border-primary">
                          {ORDER_STATUSES.map((status) => <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>)}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
                      </span>
                    </label>
                    <label className="block text-sm font-bold">
                      Estado del pago
                      <span className="relative mt-2 block">
                        <select value={draftPayment} onChange={(event) => setDraftPayment(event.target.value as PaymentStatus)} className="h-11 w-full appearance-none border border-[#cfd4c9] bg-white px-4 pr-10 text-sm outline-none focus:border-primary">
                          {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{PAYMENT_STATUS_LABELS[status]}</option>)}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
                      </span>
                    </label>
                    <p className="text-xs leading-5 text-muted">El stock se descuenta automáticamente cuando Mercado Pago confirma el pago (webhook).</p>
                    <button type="button" onClick={() => void saveStatus()} disabled={saving} className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#20341d] px-5 text-sm font-bold text-white transition hover:bg-primary disabled:opacity-60">
                      {saving ? <LoaderCircle size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </section>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
