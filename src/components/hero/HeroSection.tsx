"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function HeroSection() {
  return (
    <section className="grain overflow-hidden">
      <Container className="grid min-h-[calc(100vh-80px)] items-center gap-12 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
          <Badge>Yerba Mate Premium</Badge>
          <h1 className="mt-7 max-w-3xl font-serif text-5xl font-bold leading-[1.02] text-text sm:text-6xl lg:text-7xl">
            Una yerba suave para todos los dias
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted sm:text-xl">
            Cultivada en Misiones y estacionada naturalmente para una cebada amable, aromaticamente limpia y lista para acompanar cada manana.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/productos">Comprar ahora</Button>
            <Button href="/sobre-nosotros" variant="secondary">
              Conocer mas
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="relative mx-auto aspect-[4/5] w-full max-w-[620px]"
        >
          <div className="absolute inset-x-8 bottom-0 h-4/5 rounded-t-full bg-secondary" />
          <div className="absolute left-0 top-12 h-28 w-28 rounded-full bg-accent/20" />
          <Image
            src="https://images.unsplash.com/photo-1615485737457-f07082c77813?auto=format&fit=crop&w=1200&q=90"
            alt="Packshot de yerba mate premium"
            fill
            priority
            className="image-shadow relative rounded-[8px] object-cover"
            sizes="(min-width: 1024px) 50vw, 92vw"
          />
        </motion.div>
      </Container>
    </section>
  );
}