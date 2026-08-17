import type { Metadata } from "next";
import { ProductAdmin } from "@/components/admin/ProductAdmin";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function AdminProductsPage() {
  return <ProductAdmin />;
}