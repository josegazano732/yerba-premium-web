"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/ui/Container";
import { useCatalog } from "@/lib/useCatalog";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const promoBannerSlots = [1];
export const promoBannerPath = (slot: number) => `branding/promo-${slot}`;
export const promoBannerUrl = (slot: number) =>
  `${supabaseUrl}/storage/v1/object/public/products/${promoBannerPath(slot)}`;
const STICKERS_CATEGORY_ALIASES = ["calcomanias", "stickers"];

function normalizeCategory(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function PromoBanner() {
  const { products } = useCatalog();
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseUrl) return;
    let active = true;

    // Solo se muestra si hay una imagen cargada en "Banner promocional" del panel.
    const url = `${promoBannerUrl(1)}?t=${Date.now()}`;
    fetch(url, { method: "HEAD" })
      .then((response) => {
        if (active && response.ok) setImage(url);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const secondaryImages = useMemo(() => {
    return products
      .filter((product) => {
        const category = normalizeCategory(product.category);
        return STICKERS_CATEGORY_ALIASES.some((alias) => category.includes(alias));
      })
      .flatMap((product) => (product.images?.length ? product.images : [product.image]))
      .filter((source, index, all) => Boolean(source) && all.indexOf(source) === index && source !== image)
      .slice(0, 4);
  }, [image, products]);

  if (!image) return null;

  return (
    <section className="relative isolate overflow-hidden bg-background py-16 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 scale-105 bg-[url('/backgroun.jfif')] bg-cover bg-center opacity-40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/50 to-background/70"
      />
      <Container className="max-w-[92rem]">
        <div className="grid overflow-hidden rounded-[2rem] border border-[#7c925f]/25 bg-white/70 shadow-[0_28px_70px_-28px_rgba(32,52,29,0.35)] ring-1 ring-white/70 md:grid-cols-2">
          {/* Columna izquierda: imagen lifestyle a todo el alto */}
          <div className="relative min-h-[300px] w-full overflow-hidden sm:min-h-[420px] md:min-h-[540px]">
            <Image
              src={image}
              alt="Mate y termo de Mate Tierra personalizados con un sticker premium aplicado"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-black/10"
            />
          </div>

          {/* Columna derecha: contenido sobre fondo neutro, centrado verticalmente */}
          <div className="flex flex-col justify-center gap-6 bg-[#fffdf8] px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <h2 className="text-balance font-serif text-3xl font-bold leading-[1.1] text-forest sm:text-4xl lg:text-[2.75rem]">
              Stickers y calcomanías premium
            </h2>
            <p className="max-w-md text-pretty text-base font-medium leading-7 text-muted sm:text-lg">
              Dale tu identidad única y natural a tus mates, termos y accesorios con nuestros diseños exclusivos.
            </p>
            <div className="mt-2">
              <Link
                href="/productos"
                className="group inline-flex min-h-12 items-center justify-center rounded-full bg-bark px-8 py-3.5 text-base font-semibold text-white shadow-sm shadow-bark/25 transition duration-300 hover:scale-[1.02] hover:bg-bark-hover hover:shadow-md hover:shadow-bark/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bark focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf8]"
              >
                Ver diseños exclusivos
                <ArrowRight
                  className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>

            {secondaryImages.length > 0 ? (
              <div className="mt-6 border-t border-[#7c925f]/15 pt-6">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary/80">Más diseños</p>
                <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                  {secondaryImages.map((source, index) => (
                    <div
                      key={source}
                      className="relative aspect-square overflow-hidden rounded-xl border border-primary/15 bg-white/50 shadow-sm"
                    >
                      <Image
                        src={source}
                        alt={`Diseño de sticker ${index + 1}`}
                        fill
                        sizes="120px"
                        className="object-cover object-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
