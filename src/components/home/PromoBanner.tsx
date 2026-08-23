"use client";

import Image from "next/image";
import Link from "next/link";
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
    <section
      className="bg-background bg-cover bg-center py-16 sm:py-20"
      style={{ backgroundImage: "url('/backgroun.jfif')" }}
    >
      <Container className="max-w-[92rem]">
        <header className="mb-8 text-center sm:mb-10">
          <div className="mx-auto max-w-4xl rounded-2xl border border-[#6c8e37]/30 bg-[#fffdf8]/95 px-5 py-6 shadow-[0_12px_35px_rgba(32,52,29,0.16)] backdrop-blur-md sm:px-10 sm:py-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6c8e37]/35 bg-[#edf3df] px-4 py-1.5">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#41621f]" />
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#28431e]">Categoria destacada</p>
            </div>
            <h2 className="mx-auto mt-4 max-w-3xl text-balance font-serif text-3xl font-semibold leading-tight text-[#172116] sm:text-5xl">
              Stickers y calcomanias premium
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-pretty text-sm font-medium leading-6 text-[#30472c] sm:text-base sm:leading-7">
              Disenos exclusivos para personalizar mates, termos y accesorios con una identidad natural, premium y profesional.
            </p>
          </div>
        </header>

        <Link
          href="/productos"
          className="group block transition focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <div className="grid items-stretch gap-4 sm:gap-5 lg:grid-cols-12">
            <div
              className="relative isolate aspect-[5/4] w-full overflow-hidden rounded-[20px] border border-[#7c925f]/30 bg-white/35 shadow-[0_22px_60px_rgba(32,52,29,0.22)] ring-1 ring-white/55 backdrop-blur-[1px] lg:col-span-9 sm:aspect-[1400/770]"
              style={{
                WebkitMaskImage: "radial-gradient(ellipse 142% 128% at center, black 64%, rgba(0,0,0,0.88) 74%, rgba(0,0,0,0.42) 88%, transparent 100%)",
                maskImage: "radial-gradient(ellipse 142% 128% at center, black 64%, rgba(0,0,0,0.88) 74%, rgba(0,0,0,0.42) 88%, transparent 100%)"
              }}
            >
              <Image
                src={image}
                alt="Coleccion destacada de stickers y calcomanias"
                fill
                sizes="(max-width: 1024px) 100vw, (max-width: 1440px) 70vw, 1100px"
                className="object-cover object-center transition duration-700 group-hover:scale-[1.02] sm:object-contain"
              />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/35" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-[8px] rounded-[14px] border border-[#90aa6a]/28" />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background: [
                    "radial-gradient(138% 86% at 50% -12%, rgba(35,16,6,0.66) 0%, rgba(64,34,15,0.32) 22%, rgba(64,34,15,0.07) 40%, rgba(64,34,15,0) 56%)",
                    "radial-gradient(138% 86% at 50% 112%, rgba(35,16,6,0.66) 0%, rgba(64,34,15,0.32) 22%, rgba(64,34,15,0.07) 40%, rgba(64,34,15,0) 56%)",
                    "radial-gradient(84% 136% at -12% 50%, rgba(35,16,6,0.56) 0%, rgba(64,34,15,0.28) 20%, rgba(64,34,15,0.05) 38%, rgba(64,34,15,0) 52%)",
                    "radial-gradient(84% 136% at 112% 50%, rgba(35,16,6,0.56) 0%, rgba(64,34,15,0.28) 20%, rgba(64,34,15,0.05) 38%, rgba(64,34,15,0) 52%)"
                  ].join(","),
                  boxShadow: "inset 0 0 78px rgba(33,15,5,0.34), inset 0 0 22px rgba(255,190,120,0.16)",
                  mixBlendMode: "multiply"
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(126% 84% at 50% -15%, rgba(255,208,140,0.24) 0%, rgba(255,208,140,0.09) 18%, rgba(255,208,140,0) 40%), radial-gradient(126% 84% at 50% 115%, rgba(255,208,140,0.24) 0%, rgba(255,208,140,0.09) 18%, rgba(255,208,140,0) 40%)",
                  mixBlendMode: "screen"
                }}
              />
            </div>

            {secondaryImages.length > 0 ? (
              <div className="rounded-[14px] border border-primary/15 bg-white/35 p-2.5 backdrop-blur-[1px] sm:p-3 lg:col-span-3">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary/80">Mas stickers</p>
                <div className="grid grid-cols-2 gap-3">
                  {secondaryImages.map((source, index) => (
                    <div
                      key={source}
                      className={`relative overflow-hidden rounded-[10px] border border-primary/15 bg-white/30 ${
                        index > 1 ? "hidden sm:block" : ""
                      } ${
                        index === 0 ? "col-span-2" : ""
                      }`}
                    >
                      <div className={`relative ${index === 0 ? "aspect-[16/10]" : "aspect-square"}`}>
                        <Image
                          src={source}
                          alt={`Sticker destacado ${index + 1}`}
                          fill
                          sizes="(max-width: 1024px) 45vw, 280px"
                          className="object-cover object-center transition duration-700 group-hover:scale-[1.04]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Link>
      </Container>
    </section>
  );
}
