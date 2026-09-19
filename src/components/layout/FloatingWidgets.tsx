"use client";

import { usePathname } from "next/navigation";
import { WhatsappFab } from "./WhatsappFab";
import { AiMatera } from "@/components/ai-matera/AiMatera";

export function FloatingWidgets() {
  const pathname = usePathname();

  // En el flujo de checkout no se muestran los accesos flotantes.
  if (pathname?.startsWith("/checkout")) {
    return null;
  }

  return (
    <>
      <WhatsappFab />
      <AiMatera />
    </>
  );
}
