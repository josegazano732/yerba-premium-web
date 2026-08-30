import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/orders/status";

export const dynamic = "force-dynamic";

const updateOrderSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
});

/**
 * Verifica que el request venga con una sesión válida de Supabase.
 * El admin ya inicia sesión en el navegador; acá solo validamos el JWT.
 */
async function resolveSession(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!supabaseServer || !token) return null;

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

type OrderRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_province: string;
  shipping_postal_code: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: string;
  payment_provider: string;
  payment_status: string;
  payment_id: string | null;
  mercadopago_preference_id: string | null;
  shipping_label: string | null;
  shipping_eta: string | null;
  created_at: string;
};

type ItemRow = {
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export async function GET(request: Request) {
  const user = await resolveSession(request);
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!supabaseServer) return NextResponse.json({ error: "Servidor no configurado." }, { status: 500 });

  const { data: orders, error: ordersError } = await supabaseServer
    .from("orders")
    .select(
      "id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_province, shipping_postal_code, subtotal, shipping_cost, total, status, payment_provider, payment_status, payment_id, mercadopago_preference_id, shipping_label, shipping_eta, created_at"
    )
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("[admin/orders] Error al listar pedidos:", ordersError.message);
    return NextResponse.json({ error: "No se pudieron cargar los pedidos." }, { status: 500 });
  }

  const rows = (orders ?? []) as OrderRow[];
  const orderIds = rows.map((order) => order.id);

  const { data: items, error: itemsError } = orderIds.length
    ? await supabaseServer
        .from("order_items")
        .select("order_id, product_id, product_name, quantity, unit_price, subtotal")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (itemsError) {
    console.error("[admin/orders] Error al listar items:", itemsError.message);
    return NextResponse.json({ error: "No se pudieron cargar los pedidos." }, { status: 500 });
  }

  const itemsByOrder = new Map<string, ItemRow[]>();
  for (const item of (items ?? []) as ItemRow[]) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const mapped = rows.map((order) => ({
    id: order.id,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    shippingAddress: order.shipping_address,
    shippingCity: order.shipping_city,
    shippingProvince: order.shipping_province,
    shippingPostalCode: order.shipping_postal_code,
    subtotal: Number(order.subtotal ?? 0),
    shippingCost: Number(order.shipping_cost ?? 0),
    total: Number(order.total ?? 0),
    status: order.status,
    paymentProvider: order.payment_provider,
    paymentStatus: order.payment_status,
    paymentId: order.payment_id,
    mercadopagoPreferenceId: order.mercadopago_preference_id,
    shippingLabel: order.shipping_label,
    shippingEta: order.shipping_eta,
    createdAt: order.created_at,
    items: (itemsByOrder.get(order.id) ?? []).map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unit_price ?? 0),
      subtotal: Number(item.subtotal ?? 0),
    })),
  }));

  return NextResponse.json({ orders: mapped });
}

export async function PATCH(request: Request) {
  const user = await resolveSession(request);
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!supabaseServer) return NextResponse.json({ error: "Servidor no configurado." }, { status: 500 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = updateOrderSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { id, status, paymentStatus } = parsed.data;
  if (!status && !paymentStatus) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }

  const patch: Record<string, string> = {};
  if (status) patch.status = status;
  if (paymentStatus) patch.payment_status = paymentStatus;

  const { error } = await supabaseServer.from("orders").update(patch).eq("id", id);

  if (error) {
    console.error("[admin/orders] Error al actualizar el pedido:", error.message);
    return NextResponse.json({ error: "No se pudo actualizar el pedido." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
