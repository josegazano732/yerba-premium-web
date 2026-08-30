"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Leaf, ShieldCheck, Truck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const bannerSlots = [1, 2, 3];
export const bannerPath = (slot: number) => `branding/hero-${slot}`;
export const bannerUrl = (slot: number) =>
  `${supabaseUrl}/storage/v1/object/public/products/${bannerPath(slot)}`;

async function exists(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok ? url : null;
  } catch {
    return null;
  }
}

const ROTATION_MS = 6000;

const trustItems = [
  { icon: Truck, label: "Envios a todo el pais" },
  { icon: ShieldCheck, label: "Compra protegida" },
  { icon: Leaf, label: "Seleccion artesanal" }
];

export function HeroBanner() {
  const [desktopSlides, setDesktopSlides] = useState<string[]>([]);
  const [mobileSlide, setMobileSlide] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!supabaseUrl) return;
    let active = true;

    // Banner 1 y 3 → desktop (carrusel); Banner 2 → mobile (imagen estática).
    const stamp = Date.now();
    Promise.all([1, 2, 3].map((slot) => exists(`${bannerUrl(slot)}?t=${stamp}`))).then(([url1, url2, url3]) => {
      if (!active) return;
      setDesktopSlides([url1, url3].filter((u): u is string => u !== null));
      setMobileSlide(url2);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [desktopSlides.length]);

  useEffect(() => {
    if (desktopSlides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % desktopSlides.length);
    }, ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [desktopSlides.length]);

  const move = (direction: 1 | -1) => {
    setActiveIndex((current) => (current + direction + desktopSlides.length) % desktopSlides.length);
  };

  return (
    <section className="bg-background">
      <div className="relative h-[68vh] min-h-[440px] w-full overflow-hidden bg-secondary/40 sm:h-[74vh] sm:max-h-[760px]">
        {/* Desktop: Banner 1 (+ Banner 3 como segundo slide) */}
        <AnimatePresence mode="sync">
          {desktopSlides[activeIndex] ? (
            <motion.div
              key={desktopSlides[activeIndex]}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: "easeInOut" }}
              className="absolute inset-0 hidden sm:block"
            >
              <Image
                src={desktopSlides[activeIndex]}
                alt="Banner de la tienda"
                fill
                priority
                sizes="100vw"
                className="object-cover object-[50%_30%]"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Mobile: Banner 2 */}
        {mobileSlide ? (
          <div className="absolute inset-0 sm:hidden">
            <Image
              src={mobileSlide}
              alt="Banner de la tienda"
              fill
              priority
              sizes="100vw"
              className="object-cover object-[50%_30%]"
            />
          </div>
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />

        <Container className="relative flex h-full flex-col justify-end pb-14 sm:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <h1 className="sr-only">Tienda de mates, termos, bombillas, yerbas y accesorios materos</h1>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button href="/productos" className="px-8 py-3.5 text-base">
                Ver la tienda
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </motion.div>
        </Container>

        {/* Controles del carrusel: solo en desktop */}
        <div className="hidden sm:block">
          {desktopSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Imagen anterior"
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white backdrop-blur transition hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-white sm:left-6"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Imagen siguiente"
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white backdrop-blur transition hover:bg-white/40 focus:outline-none focus:ring-2 focus:ring-white sm:right-6"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
                {desktopSlides.map((slide, index) => (
                  <button
                    key={slide}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Ver imagen ${index + 1}`}
                    aria-current={index === activeIndex}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      index === activeIndex ? "w-8 bg-white" : "w-3 bg-white/50 hover:bg-white/80"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <Container className="hidden sm:flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-5">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {trustItems.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm font-medium text-forest">
              <item.icon className="h-4 w-4 text-primary" />
              {item.label}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
