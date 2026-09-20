"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { mainStoreMapEmbed, mainStoreMapLink, stores } from "@/data/stores";

type LocatorElement = HTMLElement & {
  configureFromQuickBuilder: (configuration: typeof LOCATOR_CONFIGURATION) => void;
};

const primaryStore = stores[0];
const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

const LOCATOR_CONFIGURATION = {
  locations: [
    {
      title: primaryStore.name,
      address1: primaryStore.address,
      address2: `${primaryStore.city}, ${primaryStore.province}, Argentina`,
      coords: primaryStore.coords,
      placeId: primaryStore.placeId,
    },
  ],
  mapOptions: {
    center: primaryStore.coords,
    fullscreenControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    zoom: 15,
    zoomControl: true,
    maxZoom: 17,
    mapId,
  },
  capabilities: {
    input: false,
    autocomplete: false,
    directions: false,
    distanceMatrix: false,
    details: false,
    actions: false,
  },
};

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function FallbackMap() {
  return (
    <iframe
      src={mainStoreMapEmbed}
      title="Ubicación de Mate Tierra"
      className="h-full min-h-[420px] w-full border-0"
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

export function GoogleStoreLocator() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [libraryStatus, setLibraryStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!apiKey || libraryStatus !== "ready" || !hostRef.current) return;

    let cancelled = false;
    const host = hostRef.current;

    customElements.whenDefined("gmpx-store-locator").then(() => {
      if (cancelled) return;

      const loader = document.createElement("gmpx-api-loader");
      loader.setAttribute("key", apiKey);
      loader.setAttribute("solution-channel", "GMP_QB_locatorplus_v11_c");

      const locator = document.createElement("gmpx-store-locator") as LocatorElement;
      locator.setAttribute("map-id", mapId);

      locator.style.width = "100%";
      locator.style.height = "100%";
      locator.style.setProperty("--gmpx-color-surface", "#ffffff");
      locator.style.setProperty("--gmpx-color-on-surface", "#20341d");
      locator.style.setProperty("--gmpx-color-on-surface-variant", "#54594d");
      locator.style.setProperty("--gmpx-color-primary", "#4c6f23");
      locator.style.setProperty("--gmpx-color-outline", "#d7d2c7");
      locator.style.setProperty("--gmpx-font-family-base", "var(--font-manrope), sans-serif");
      locator.style.setProperty("--gmpx-font-family-headings", "var(--font-cormorant), serif");
      locator.style.setProperty("--gmpx-font-size-base", "0.875rem");

      host.replaceChildren(loader, locator);
      locator.configureFromQuickBuilder(LOCATOR_CONFIGURATION);
    });

    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, [libraryStatus]);

  if (!apiKey || libraryStatus === "error") return <FallbackMap />;

  return (
    <>
      <Script
        id="google-maps-extended-component-library"
        src="https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.15/index.min.js"
        type="module"
        strategy="afterInteractive"
        onReady={() => setLibraryStatus("ready")}
        onError={() => setLibraryStatus("error")}
      />
      <div ref={hostRef} role="region" className="h-full min-h-[420px] w-full" aria-label="Mapa de puntos de venta" />
      {libraryStatus === "loading" ? (
        <div className="absolute inset-0 grid place-items-center bg-background text-sm text-muted">
          Cargando mapa…
        </div>
      ) : null}
      <a
        href={mainStoreMapLink}
        target="_blank"
        rel="noopener noreferrer"
        className="sr-only"
      >
        Ver Mate Tierra en Google Maps
      </a>
    </>
  );
}
