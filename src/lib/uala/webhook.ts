export type MappedUalaEvent = {
  paymentStatus: string;
  orderStatus: string;
};

/**
 * Mapea estados de Ualá → estados internos (espejo de `process_payment_event`).
 * Solo `APPROVED` descuenta stock (se convierte en `confirmed`).
 */
export function mapUalaStatus(status: string | null): MappedUalaEvent {
  switch ((status ?? "").toUpperCase()) {
    case "APPROVED":
      return { paymentStatus: "approved", orderStatus: "confirmed" };
    case "PROCESSED":
    case "PENDING":
      return { paymentStatus: "in_process", orderStatus: "pending" };
    case "REJECTED":
      return { paymentStatus: "rejected", orderStatus: "pending" };
    case "REFUNDED":
      return { paymentStatus: "refunded", orderStatus: "cancelled" };
    default:
      return { paymentStatus: "in_process", orderStatus: "pending" };
  }
}
