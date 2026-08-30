import type { Metadata } from "next";
import { OrderAdmin } from "@/components/admin/OrderAdmin";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function AdminOrdersPage() {
  return <OrderAdmin />;
}
