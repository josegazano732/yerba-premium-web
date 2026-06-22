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

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-white/90 backdrop-blur-xl">
      <Container className="relative flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Inicio">
          <Image src={`${basePath}/logo.webp`} alt="Amate toda la vida" width={640} height={196} priority className="h-11 w-auto max-w-[185px] sm:h-12 sm:max-w-[230px] lg:h-14 lg:max-w-[260px]" />
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