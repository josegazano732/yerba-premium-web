"use client";

import { ExternalLink, MapPin, Search } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { mainStoreMapEmbed, mainStoreMapLink, stores } from "@/data/stores";

const remoteLogo = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/branding/site-logo`;

export function StoreLocator() {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("Todas");
  const provinces = ["Todas", ...Array.from(new Set(stores.map((store) => store.province)))];

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesQuery = `${store.name} ${store.city} ${store.address}`.toLowerCase().includes(query.toLowerCase());
      const matchesProvince = province === "Todas" || store.province === province;
      return matchesQuery && matchesProvince;
    });
  }, [province, query]);

  return (
    <section className="section-pad bg-white">
      <Container>
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold uppercase text-accent">Donde comprar</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold text-text sm:text-5xl">Encontranos cerca</h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[8px] bg-background p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ciudad o tienda" className="pl-11" />
              </div>
              <select value={province} onChange={(event) => setProvince(event.target.value)} className="min-h-12 rounded-full border border-primary/15 bg-white px-5 text-sm outline-none focus:border-primary">
                {provinces.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="mt-5 space-y-3">
              {filteredStores.map((store) => (
                <article key={store.id} className="relative overflow-hidden rounded-[8px] bg-white p-4">
                  <Image
                    src={remoteLogo}
                    alt=""
                    aria-hidden
                    width={200}
                    height={61}
                    unoptimized
                    className="pointer-events-none absolute bottom-2 right-3 h-10 w-auto object-contain opacity-20"
                  />
                  <p className="font-bold text-text">{store.name}</p>
                  <p className="mt-1 text-sm text-muted">{store.address}, {store.city}, {store.province}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-[8px] border border-primary/15 shadow-sm">
            <iframe
              src={mainStoreMapEmbed}
              title="Ubicaci\u00f3n de Mate Tierra"
              className="h-full w-full border-0"
              style={{ minHeight: "420px" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              href={mainStoreMapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-[#20341d] shadow-md backdrop-blur-sm transition hover:bg-white"
            >
              <MapPin size={13} /> Ver en Google Maps <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}