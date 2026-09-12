import type { Metadata } from "next";
import { CombosAdmin } from "@/components/admin/CombosAdmin";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function AdminCombosPage() {
  return <CombosAdmin />;
}
