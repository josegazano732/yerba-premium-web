import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/orders/orders";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Pedido inexistente." }, { status: 404 });
    }

    return NextResponse.json({
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
  } catch (error) {
    console.error("[orders] Error al leer el pedido:", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
