import { site } from "@/data/site";

/**
 * Origen absoluto del sitio, usado para `back_urls` y `notification_url`.
 * Prioriza NEXT_PUBLIC_SITE_URL (configurable en Vercel) y cae al valor de site.ts.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  return (fromEnv || site.baseUrl).replace(/\/+$/, "");
}
