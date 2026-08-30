import { NextResponse } from "next/server";
import { createOrderSchema } from "@/lib/orders/schema";
import { createOrder, OrderError } from "@/lib/orders/orders";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const order = await createOrder(parsed.data);
    return NextResponse.json(
      {
        orderId: order.id,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        total: order.total,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[orders] Error al crear el pedido:", error);
    return NextResponse.json({ error: "Error interno al crear el pedido." }, { status: 500 });
  }
}
