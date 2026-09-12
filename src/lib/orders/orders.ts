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

export type OrderComboComponent = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type OrderComboLine = {
  comboId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  components: OrderComboComponent[];
};

export type CalculatedOrder = {
  items: OrderLineItem[];
  combos?: OrderComboLine[];
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

type ComboRow = {
  id: string;
  name: string;
  price: number | string | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

type ComboItemRow = {
  combo_id: string;
  product_id: string;
  quantity: number;
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

/** Lee los combos pedidos y descarta los inactivos o fuera de vigencia. */
async function fetchCombosByIds(comboIds: string[]): Promise<Map<string, ComboRow>> {
  const db = assertServerClient();
  const { data, error } = await db
    .from("combos")
    .select("id, name, price, active, starts_at, ends_at")
    .in("id", comboIds);

  if (error) {
    throw new OrderError("No se pudieron validar los combos.", 500);
  }

  const now = Date.now();
  const map = new Map<string, ComboRow>();
  for (const row of (data ?? []) as ComboRow[]) {
    if (!row.active) continue;
    const startsAt = row.starts_at ? new Date(row.starts_at).getTime() : null;
    const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;
    if (startsAt && now < startsAt) continue;
    if (endsAt && now > endsAt) continue;
    map.set(row.id, row);
  }
  return map;
}

async function fetchComboItemsByIds(comboIds: string[]): Promise<ComboItemRow[]> {
  const db = assertServerClient();
  const { data, error } = await db
    .from("combo_items")
    .select("combo_id, product_id, quantity")
    .in("combo_id", comboIds);

  if (error) {
    throw new OrderError("No se pudo validar la composición de los combos.", 500);
  }
  return (data ?? []) as ComboItemRow[];
}

function normalizeItems(items: CreateOrderInput["items"]) {
  const byId = new Map<string, number>();
  for (const item of items) {
    byId.set(item.productId, (byId.get(item.productId) ?? 0) + item.quantity);
  }
  return Array.from(byId.entries()).map(([productId, quantity]) => ({ productId, quantity }));
}

function normalizeCombos(combos: CreateOrderInput["combos"]) {
  const byId = new Map<string, number>();
  for (const combo of combos) {
    byId.set(combo.comboId, (byId.get(combo.comboId) ?? 0) + combo.quantity);
  }
  return Array.from(byId.entries()).map(([comboId, quantity]) => ({ comboId, quantity }));
}

/**
 * Calcula subtotal, envío y total reutilizando la lógica de `shipping.ts`.
 * No confía en ningún precio recibido desde el navegador.
 *
 * Los combos se validan contra la base, se expanden en sus componentes y su
 * precio especial se suma al subtotal. El stock de cada componente se valida
 * de forma agregada junto con los productos individuales.
 */
export async function calculateOrder(input: CreateOrderInput): Promise<CalculatedOrder> {
  const items = normalizeItems(input.items);
  const combos = normalizeCombos(input.combos);

  const comboMap = combos.length
    ? await fetchCombosByIds(combos.map((combo) => combo.comboId))
    : new Map<string, ComboRow>();
  const comboItemRows = combos.length
    ? await fetchComboItemsByIds(combos.map((combo) => combo.comboId))
    : [];

  // Agrega las cantidades requeridas por cada componente del combo.
  const requiredByProduct = new Map<string, number>();
  for (const item of items) {
    requiredByProduct.set(item.productId, (requiredByProduct.get(item.productId) ?? 0) + item.quantity);
  }
  for (const combo of combos) {
    const components = comboItemRows.filter((row) => row.combo_id === combo.comboId);
    for (const component of components) {
      requiredByProduct.set(
        component.product_id,
        (requiredByProduct.get(component.product_id) ?? 0) + component.quantity * combo.quantity
      );
    }
  }

  const productIds = Array.from(requiredByProduct.keys());
  const products = await fetchProductsByIds(productIds);

  const lineItems: OrderLineItem[] = [];
  const comboLines: OrderComboLine[] = [];
  let subtotal = 0;

  // Valida el stock agregado de cada producto (individual + combos).
  for (const [productId, requiredQty] of requiredByProduct.entries()) {
    const product = products.get(productId);
    if (!product) {
      throw new OrderError(`El producto ${productId} no existe o no está disponible.`, 400);
    }
    const stock = Number(product.stock ?? 0);
    if (stock < requiredQty) {
      throw new OrderError(
        `Stock insuficiente para "${product.name}". Disponible: ${stock}.`,
        409
      );
    }
  }

  for (const item of items) {
    const product = products.get(item.productId);
    if (!product) {
      throw new OrderError(`El producto ${item.productId} no existe o no está disponible.`, 400);
    }

    const price = Number(product.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) {
      throw new OrderError(`El producto ${item.productId} no tiene un precio válido.`, 409);
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

  for (const combo of combos) {
    const comboRow = comboMap.get(combo.comboId);
    if (!comboRow) {
      throw new OrderError("Uno de los combos no existe o no está disponible.", 400);
    }

    const price = Number(comboRow.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) {
      throw new OrderError(`El combo "${comboRow.name}" no tiene un precio válido.`, 409);
    }

    const components: OrderComboComponent[] = comboItemRows
      .filter((row) => row.combo_id === combo.comboId)
      .map((row) => {
        const product = products.get(row.product_id);
        if (!product) {
          throw new OrderError(`El producto del combo no está disponible.`, 400);
        }
        return {
          productId: product.id,
          name: product.name,
          quantity: row.quantity * combo.quantity,
          unitPrice: Number(product.price ?? 0),
        };
      });

    if (components.length === 0) {
      throw new OrderError(`El combo "${comboRow.name}" no tiene productos asociados.`, 409);
    }

    const comboSubtotal = price * combo.quantity;
    subtotal += comboSubtotal;
    comboLines.push({
      comboId: comboRow.id,
      name: comboRow.name,
      unitPrice: price,
      quantity: combo.quantity,
      subtotal: comboSubtotal,
      components,
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
    combos: comboLines,
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
    console.error("[orders] Error al insertar pedido:", orderError);
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
    console.error("[orders] Error al insertar items:", itemsError);
    // Mejor intento: si fallan los items, marcamos la orden como cancelada en
    // lugar de dejar un pedido sin detalle.
    await db.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    throw new OrderError("No se pudieron guardar los productos del pedido.", 500);
  }

  // Fotografía histórica de los combos vendidos (cabecera + componentes).
  for (const combo of calculated.combos ?? []) {
    const { data: insertedCombo, error: comboError } = await db
      .from("order_combos")
      .insert({
        order_id: order.id,
        combo_id: combo.comboId,
        combo_name: combo.name,
        quantity: combo.quantity,
        unit_price: combo.unitPrice,
        subtotal: combo.subtotal,
      })
      .select("id")
      .single();

    if (comboError || !insertedCombo) {
      console.error("[orders] Error al insertar combo:", comboError);
      await db.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      throw new OrderError("No se pudieron guardar los combos del pedido.", 500);
    }

    const { error: comboItemsError } = await db.from("order_combo_items").insert(
      combo.components.map((component) => ({
        order_combo_id: insertedCombo.id,
        product_id: component.productId,
        product_name: component.name,
        quantity: component.quantity,
        unit_price: component.unitPrice,
      }))
    );

    if (comboItemsError) {
      console.error("[orders] Error al insertar items del combo:", comboItemsError);
      await db.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      throw new OrderError("No se pudieron guardar los productos del combo.", 500);
    }
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

  const { data: combos } = await db
    .from("order_combos")
    .select("id, combo_id, combo_name, quantity, unit_price, subtotal")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const orderComboLines: OrderComboLine[] = [];
  for (const comboRow of (combos ?? []) as Array<Record<string, unknown>>) {
    const comboId = String(comboRow.id);
    const { data: components } = await db
      .from("order_combo_items")
      .select("product_id, product_name, quantity, unit_price")
      .eq("order_combo_id", comboId)
      .order("created_at", { ascending: true });

    orderComboLines.push({
      comboId: comboRow.combo_id ? String(comboRow.combo_id) : "",
      name: String(comboRow.combo_name ?? ""),
      unitPrice: Number(comboRow.unit_price ?? 0),
      quantity: Number(comboRow.quantity ?? 0),
      subtotal: Number(comboRow.subtotal ?? 0),
      components: ((components ?? []) as Array<Record<string, unknown>>).map((component) => ({
        productId: String(component.product_id ?? ""),
        name: String(component.product_name ?? ""),
        quantity: Number(component.quantity ?? 0),
        unitPrice: Number(component.unit_price ?? 0),
      })),
    });
  }

  return {
    id: String(order.id),
    items: lineItems,
    combos: orderComboLines,
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
