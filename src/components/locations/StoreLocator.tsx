"use client";

import { MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { stores } from "@/data/stores";

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
                <article key={store.id} className="rounded-[8px] bg-white p-4">
                  <p className="font-bold text-text">{store.name}</p>
                  <p className="mt-1 text-sm text-muted">{store.address}, {store.city}, {store.province}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-[8px] bg-secondary/45">
            <div className="absolute inset-0 grain opacity-80" />
            <div className="absolute left-[16%] top-[30%] grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-xl"><MapPin /></div>
            <div className="absolute left-[58%] top-[44%] grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-xl"><MapPin /></div>
            <div className="absolute left-[38%] top-[62%] grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-xl"><MapPin /></div>
            <div className="absolute inset-x-8 bottom-8 rounded-[8px] bg-white/85 p-5 backdrop-blur">
              <p className="font-serif text-2xl font-semibold text-text">+1.800 puntos de venta</p>
              <p className="mt-1 text-sm text-muted">Mapa ilustrativo listo para conectar con geolocalizacion o proveedor externo.</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}