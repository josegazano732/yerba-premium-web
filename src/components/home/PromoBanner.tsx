"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const promoBannerSlots = [1];
export const promoBannerPath = (slot: number) => `branding/promo-${slot}`;
export const promoBannerUrl = (slot: number) =>
  `${supabaseUrl}/storage/v1/object/public/products/${promoBannerPath(slot)}`;

export function PromoBanner() {
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

  if (!image) return null;

  return (
    <section className="bg-background pb-16 sm:pb-20">
      <Container>
        <Link
          href="/productos"
          className="group block overflow-hidden rounded-[8px] ring-1 ring-primary/15 transition hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <div className="relative aspect-[4/3] w-full sm:aspect-[1400/770]">
            <Image
              src={image}
              alt="Novedades de la tienda"
              fill
              sizes="(max-width: 1024px) 100vw, 1200px"
              className="object-cover transition duration-700 group-hover:scale-[1.02]"
            />
          </div>
        </Link>
      </Container>
    </section>
  );
}
