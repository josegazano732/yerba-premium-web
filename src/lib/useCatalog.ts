"use client";

import { useEffect, useState } from "react";
import { CatalogSnapshot, getCatalog } from "@/lib/catalog";

export function useCatalog() {
  const [snapshot, setSnapshot] = useState<CatalogSnapshot>({ products: [], categories: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getCatalog()
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { ...snapshot, isLoading };
}
