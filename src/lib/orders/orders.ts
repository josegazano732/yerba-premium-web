import { supabaseServer } from "@/lib/supabase/server";
import { getShippingQuotes } from "@/lib/shipping";
import type { CreateOrderInput } from "./schema";

export type OrderLineItem = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type CalculatedOrder = {
  items: OrderLineItem[];
  subtotal: number;
  shippingCost: number;
  shippingLabel: string;
  shippingEta: string;
  total: number;
};

export type StoredOrder = CalculatedOrder & {
  id: string;
  status: string;
  paymentStatus: string;
  paymentId: string | null;
  mercadopagoPreferenceId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  shippingPostalCode: string;
  createdAt: string;
};

export class OrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type ProductRow = {
  id: string;
  name: string;
  price: number | string | null;
  stock: number | string | null;
};

const PRODUCT_COLUMNS = "id, name, price, stock";

function assertServerClient() {
  if (!supabaseServer) {
    throw new OrderError("Servidor no configurado: faltan variables de Supabase.", 500);
  }
  return supabaseServer;
}

/**
 * Busca los productos en Supabase usando solo ids + cantidades enviadas por el
 * cliente. El precio y el stock siempre se leen desde la base de datos.
 */
async function fetchProductsByIds(productIds: string[]): Promise<Map<string, ProductRow>> {
  const db = assertServerClient();
  const { data, error } = await db
    .from("products")
    .select(PRODUCT_COLUMNS)
    .in("id", productIds);

  if (error) {
    throw new OrderError("No se pudieron validar los productos.", 500);
  }

  const map = new Map<string, ProductRow>();
  for (const row of (data ?? []) as ProductRow[]) {
    map.set(row.id, row);
  }
  return map;
}

function normalizeItems(items: CreateOrderInput["items"]) {
  const byId = new Map<string, number>();
  for (const item of items) {
    byId.set(item.productId, (byId.get(item.productId) ?? 0) + item.quantity);
  }
  return Array.from(byId.entries()).map(([productId, quantity]) => ({ productId, quantity }));
}

/**
 * Calcula subtotal, envío y total reutilizando la lógica de `shipping.ts`.
 * No confía en ningún precio recibido desde el navegador.
 */
export async function calculateOrder(input: CreateOrderInput): Promise<CalculatedOrder> {
  const items = normalizeItems(input.items);
  const productIds = items.map((item) => item.productId);
  const products = await fetchProductsByIds(productIds);

  const lineItems: OrderLineItem[] = [];
  let subtotal = 0;

  for (const item of items) {
    const product = products.get(item.productId);
    if (!product) {
      throw new OrderError(`El producto ${item.productId} no existe o no está disponible.`, 400);
    }

    const price = Number(product.price ?? 0);
    const stock = Number(product.stock ?? 0);

    if (!Number.isFinite(price) || price <= 0) {
      throw new OrderError(`El producto ${item.productId} no tiene un precio válido.`, 409);
    }
    if (stock < item.quantity) {
      throw new OrderError(
        `Stock insuficiente para "${product.name}". Disponible: ${stock}.`,
        409
      );
    }

    const lineSubtotal = price * item.quantity;
    subtotal += lineSubtotal;
    lineItems.push({
      productId: product.id,
      name: product.name,
      unitPrice: price,
      quantity: item.quantity,
      subtotal: lineSubtotal,
    });
  }

  const quotes = await getShippingQuotes({
    postalCode: input.customer.postalCode,
    subtotal,
  });
  const quote = quotes.find((q) => q.id === input.shippingMethodId);
  if (!quote) {
    throw new OrderError("Método de envío inválido para el código postal ingresado.", 400);
  }

  return {
    items: lineItems,
    subtotal,
    shippingCost: quote.price,
    shippingLabel: quote.label,
    shippingEta: quote.eta,
    total: subtotal + quote.price,
  };
}

/**
 * Crea el pedido + sus items en una única transacción conceptual (inserts
 * secuenciales). Devuelve el id y el resumen calculado server-side.
 */
export async function createOrder(input: CreateOrderInput): Promise<StoredOrder> {
  const db = assertServerClient();
  const calculated = await calculateOrder(input);
  const { customer } = input;

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      shipping_address: customer.address,
      shipping_city: customer.city,
      shipping_province: customer.province,
      shipping_postal_code: customer.postalCode,
      subtotal: calculated.subtotal,
      shipping_cost: calculated.shippingCost,
      total: calculated.total,
      status: "pending",
      payment_provider: "mercadopago",
      payment_status: "pending",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new OrderError("No se pudo crear el pedido.", 500);
  }

  const { error: itemsError } = await db.from("order_items").insert(
    calculated.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.name,
      product_slug: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
    }))
  );

  if (itemsError) {
    // Mejor intento: si fallan los items, marcamos la orden como cancelada en
    // lugar de dejar un pedido sin detalle.
    await db.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    throw new OrderError("No se pudieron guardar los productos del pedido.", 500);
  }

  return {
    ...calculated,
    id: order.id as string,
    status: "pending",
    paymentStatus: "pending",
    paymentId: null,
    mercadopagoPreferenceId: null,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    shippingAddress: customer.address,
    shippingCity: customer.city,
    shippingProvince: customer.province,
    shippingPostalCode: customer.postalCode,
    createdAt: new Date().toISOString(),
  };
}

export async function getOrderById(orderId: string): Promise<StoredOrder | null> {
  const db = assertServerClient();

  const { data: order, error } = await db
    .from("orders")
    .select(
      "id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_province, shipping_postal_code, subtotal, shipping_cost, total, status, payment_status, payment_id, mercadopago_preference_id, created_at"
    )
    .eq("id", orderId)
    .single();

  if (error) return null;
  if (!order) return null;

  const { data: items } = await db
    .from("order_items")
    .select("product_id, product_name, unit_price, quantity, subtotal")
    .eq("order_id", orderId);

  const lineItems: OrderLineItem[] = (items ?? []).map((row: Record<string, unknown>) => ({
    productId: String(row.product_id),
    name: String(row.product_name ?? ""),
    unitPrice: Number(row.unit_price ?? 0),
    quantity: Number(row.quantity ?? 0),
    subtotal: Number(row.subtotal ?? 0),
  }));

  return {
    id: String(order.id),
    items: lineItems,
    subtotal: Number(order.subtotal ?? 0),
    shippingCost: Number(order.shipping_cost ?? 0),
    shippingLabel: "",
    shippingEta: "",
    total: Number(order.total ?? 0),
    status: String(order.status ?? "pending"),
    paymentStatus: String(order.payment_status ?? "pending"),
    paymentId: order.payment_id ? String(order.payment_id) : null,
    mercadopagoPreferenceId: order.mercadopago_preference_id
      ? String(order.mercadopago_preference_id)
      : null,
    customerName: String(order.customer_name ?? ""),
    customerEmail: String(order.customer_email ?? ""),
    customerPhone: String(order.customer_phone ?? ""),
    shippingAddress: String(order.shipping_address ?? ""),
    shippingCity: String(order.shipping_city ?? ""),
    shippingProvince: String(order.shipping_province ?? ""),
    shippingPostalCode: String(order.shipping_postal_code ?? ""),
    createdAt: String(order.created_at ?? ""),
  };
}
