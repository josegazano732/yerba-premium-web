"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const fallbackLogo = `${basePath}/logo.webp`;
const remoteLogo = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/branding/site-logo`;

export const brandLogoUpdatedEvent = "brand-logo-updated";

export function BrandLogo() {
  const [source, setSource] = useState(remoteLogo);

  useEffect(() => {
    const storedVersion = localStorage.getItem("brand-logo-version");
    if (storedVersion) setSource(`${remoteLogo}?v=${storedVersion}`);

    function updateLogo(event: Event) {
      const customEvent = event as CustomEvent<string>;
      setSource(customEvent.detail);
    }

    window.addEventListener(brandLogoUpdatedEvent, updateLogo);
    return () => window.removeEventListener(brandLogoUpdatedEvent, updateLogo);
  }, []);

  return (
    <Image
      src={source}
      alt="Amate toda la vida"
      width={640}
      height={196}
      priority
      onError={() => setSource(fallbackLogo)}
      className="h-9 w-auto max-w-[150px] object-contain sm:h-12 sm:max-w-[230px] lg:h-14 lg:max-w-[260px]"
    />
  );
}