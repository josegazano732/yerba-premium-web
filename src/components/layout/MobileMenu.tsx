"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { site } from "@/data/site";

const navItems = [
  { href: "/productos", label: "Productos", external: false },
  { href: "/catalogos", label: "Catalogos", external: false },
  { href: "/donde-comprar", label: "Donde Comprar", external: false },
  { href: "/sobre-nosotros", label: "Sobre Nosotros", external: false },
  { href: `https://wa.me/${site.whatsappNumber}`, label: "Contacto", external: true }
];

export function MobileMenu({ onNavigate }: Readonly<{ onNavigate: () => void }>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="absolute left-4 right-4 top-[72px] rounded-[8px] border border-primary/10 bg-white p-4 shadow-2xl lg:hidden"
    >
      <nav className="grid gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            onClick={onNavigate}
            className="rounded-md px-3 py-3 text-sm font-semibold text-text hover:bg-secondary/35"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Button href="/productos" className="mt-4 w-full">
        Comprar ahora
      </Button>
    </motion.div>
  );
}