"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mail, Menu, Search, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container } from "@/components/ui/Container";
import { MobileMenu } from "./MobileMenu";

const navItems = [
  { href: "/productos", label: "Productos" },
  { href: "/donde-comprar", label: "Donde Comprar" },
  { href: "/sobre-nosotros", label: "Sobre Nosotros" },
  { href: "/contacto", label: "Contacto" }
];

const announcements = [
  "Envios a todo el pais",
  "Stock real actualizado todos los dias",
  "Cambios sin cargo dentro de los 7 dias",
  "Asesoramiento antes y despues de tu compra"
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const announcementLoop = [...announcements, ...announcements, ...announcements];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl">
      <div className="relative overflow-hidden border-y border-primary/15">
        <div className="grain pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <motion.div
          className="relative flex w-max items-center gap-12 py-2.5"
          animate={{ x: ["0%", "-33.333%"] }}
          transition={{ duration: 32, ease: "linear", repeat: Infinity }}
        >
          {announcementLoop.map((message, index) => (
            <span
              key={`${message}-${index}`}
              aria-hidden={index >= announcements.length}
              className="whitespace-nowrap text-xs font-semibold tracking-wide text-forest/80 sm:text-sm"
            >
              {message}
            </span>
          ))}
        </motion.div>
      </div>

      <Container className="relative grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-forest transition hover:bg-primary/10 lg:hidden"
            aria-label={isOpen ? "Cerrar menu" : "Abrir menu"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((value) => !value)}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <nav className="hidden items-center gap-7 lg:flex">
            {navItems.slice(0, 3).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-serif text-lg font-semibold text-forest transition hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <Link href="/" className="flex items-center justify-center" aria-label="Inicio">
          <BrandLogo />
        </Link>

        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <Link
            href="/productos"
            className="grid h-11 w-11 place-items-center rounded-full text-forest transition hover:bg-primary/10 hover:text-primary"
            aria-label="Buscar productos"
          >
            <Search size={20} />
          </Link>
          <Link
            href="/contacto"
            className="hidden h-11 w-11 place-items-center rounded-full text-forest transition hover:bg-primary/10 hover:text-primary sm:grid"
            aria-label="Contacto"
          >
            <Mail size={20} />
          </Link>
          <Link
            href="/productos"
            className="grid h-11 w-11 place-items-center rounded-full text-forest transition hover:bg-primary/10 hover:text-primary"
            aria-label="Ir a la tienda"
          >
            <ShoppingBag size={20} />
          </Link>
        </div>

        <AnimatePresence>{isOpen ? <MobileMenu onNavigate={() => setIsOpen(false)} /> : null}</AnimatePresence>
      </Container>
    </header>
  );
}