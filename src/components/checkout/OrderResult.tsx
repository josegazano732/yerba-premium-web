"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, LoaderCircle, XCircle } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/format";

type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type OrderDetail = {
  id: string;
  status: string;
  paymentStatus: string;
  total: number;
  items: OrderItem[];
};

type OrderResultVariant = "success" | "pending" | "failure";

const POLL_INTERVAL_MS = 3000;

function isTerminal(order: OrderDetail | null): boolean {
  if (!order) return false;
  return isApproved(order) || isRejected(order);
}

function isApproved(order: OrderDetail): boolean {
  return order.paymentStatus === "approved" || order.status === "confirmed";
}

function isRejected(order: OrderDetail): boolean {
  return order.paymentStatus === "rejected" || order.paymentStatus === "cancelled" || order.status === "cancelled";
}

function ResultShell({
  icon,
  iconClass,
  title,
  children,
}: Readonly<{
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${iconClass}`}>{icon}</div>
      <h1 className="mt-6 font-serif text-3xl font-semibold text-[#20341d]">{title}</h1>
      {children}
    </div>
  );
}

export function OrderResult({ variant }: Readonly<{ variant: OrderResultVariant }>) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const { clearCart } = useCart();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const clearedRef = useRef(false);
  const latestRef = useRef<OrderDetail | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setNotFound(true);
      return false;
    }
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
      if (response.status === 404) {
        setNotFound(true);
        return false;
      }
      const data = (await response.json().catch(() => ({}))) as OrderDetail & { error?: string };
      if (!response.ok || !data.id) {
        setError(data.error ?? "No se pudo consultar el estado del pedido.");
        return false;
      }
      latestRef.current = data;
      setOrder(data);
      return true;
    } catch {
      setError("No se pudo consultar el estado del pedido.");
      return false;
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      const ok = await fetchOrder();
      if (cancelled) return;

      if (ok && !isTerminal(latestRef.current)) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fetchOrder]);

  // El carrito se vacía únicamente cuando el pago está aprobado (spec §33).
  useEffect(() => {
    if (order && isApproved(order) && !clearedRef.current) {
      clearedRef.current = true;
      clearCart();
    }
  }, [order, clearCart]);

  if (notFound) {
    return (
      <ResultShell icon={<XCircle size={32} />} iconClass="bg-red-100 text-red-700" title="Pedido no encontrado">
        <p className="mt-3 text-sm leading-6 text-muted">
          No pudimos encontrar el pedido solicitado. Si creés que es un error, escribinos por WhatsApp.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cta px-6 text-sm font-bold text-white transition hover:bg-cta-hover"
        >
          Volver al inicio
        </Link>
      </ResultShell>
    );
  }

  if (error && !order) {
    return (
      <ResultShell icon={<XCircle size={32} />} iconClass="bg-red-100 text-red-700" title="Ocurrió un error">
        <p className="mt-3 text-sm leading-6 text-muted">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError("");
            fetchOrder();
          }}
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cta px-6 text-sm font-bold text-white transition hover:bg-cta-hover"
        >
          Reintentar
        </button>
      </ResultShell>
    );
  }

  if (order && isApproved(order)) {
    return (
      <ResultShell icon={<CheckCircle2 size={32} />} iconClass="bg-green-100 text-green-700" title="¡Pago confirmado!">
        <p className="mt-3 text-sm leading-6 text-muted">
          Gracias por tu compra. Recibimos tu pago y ya estamos preparando tu pedido.
        </p>
        <div className="mt-6 rounded-[10px] border border-[#e2ddd3] bg-white p-5 text-left">
          <div className="flex items-center justify-between border-b border-[#e2ddd3] pb-3">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">Pedido</span>
            <span className="font-mono text-sm text-[#20341d]">#{order.id.slice(0, 8)}</span>
          </div>
          <ul className="mt-4 space-y-2">
            {order.items.map((item) => (
              <li key={item.productId} className="flex items-center justify-between text-sm">
                <span className="text-[#20341d]">
                  {item.name} <span className="text-muted">× {item.quantity}</span>
                </span>
                <span className="text-[#20341d]">{formatCurrency.format(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-[#e2ddd3] pt-3">
            <span className="text-sm font-bold uppercase tracking-wide text-[#20341d]">Total</span>
            <strong className="font-serif text-xl text-[#20341d]">{formatCurrency.format(order.total)}</strong>
          </div>
        </div>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cta px-6 text-sm font-bold text-white transition hover:bg-cta-hover"
        >
          Seguir comprando
        </Link>
      </ResultShell>
    );
  }

  if (order && isRejected(order)) {
    return (
      <ResultShell icon={<XCircle size={32} />} iconClass="bg-red-100 text-red-700" title="El pago no se completó">
        <p className="mt-3 text-sm leading-6 text-muted">
          Tu pago fue rechazado o cancelado. No te preocupes: tus productos siguen en el carrito y podés intentarlo de nuevo.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/checkout"
            className="inline-flex h-12 items-center justify-center rounded-full bg-cta px-6 text-sm font-bold text-white transition hover:bg-cta-hover"
          >
            Volver a intentar
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#20341d] px-6 text-sm font-bold text-[#20341d] transition hover:bg-[#20341d] hover:text-white"
          >
            Volver al inicio
          </Link>
        </div>
      </ResultShell>
    );
  }

  if (order) {
    const heading =
      variant === "pending" ? "Pago en proceso" : variant === "success" ? "Confirmando tu pago…" : "Revisando tu pago…";
    return (
      <ResultShell icon={<Clock size={32} />} iconClass="bg-amber-100 text-amber-700" title={heading}>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
          <LoaderCircle size={16} className="animate-spin text-primary" />
          Esto puede tardar unos segundos. No cierres esta ventana.
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">
          Cuando Mercado Pago confirme la operación, actualizaremos esta página automáticamente.
        </p>
      </ResultShell>
    );
  }

  return (
    <div className="py-24 text-center text-sm text-muted">
      <LoaderCircle size={20} className="mx-auto animate-spin text-primary" />
    </div>
  );
}
