"use client";

import { AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MobileMenu } from "./MobileMenu";

const navItems = [
  { href: "/productos", label: "Productos" },
  { href: "/donde-comprar", label: "Donde Comprar" },
  { href: "/sobre-nosotros", label: "Sobre Nosotros" },
  { href: "/contacto", label: "Contacto" }
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-white/90 backdrop-blur-xl">
      <Container className="relative flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Inicio">
          <Image src="/logo.svg" alt="Yerba Libre" width={180} height={52} priority className="h-12 w-auto" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-text/80 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-primary">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button href="/productos">Comprar ahora</Button>
        </div>

        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary lg:hidden"
          aria-label="Abrir menu"
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <AnimatePresence>{isOpen ? <MobileMenu onNavigate={() => setIsOpen(false)} /> : null}</AnimatePresence>
      </Container>
    </header>
  );
}