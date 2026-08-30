/** Estados de pedido y de pago (espejo de la tabla `orders` en Supabase). */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "in_process",
  "cancelled",
  "refunded",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  in_process: "En proceso",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};
