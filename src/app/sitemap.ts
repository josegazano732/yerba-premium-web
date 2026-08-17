import { createClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { slugify, categoryUrl } from "@/lib/seo";

const staticRoutes: MetadataRoute.Sitemap = [
  { url: site.baseUrl, changeFrequency: "weekly", priority: 1.0, lastModified: new Date() },
  { url: `${site.baseUrl}/productos`, changeFrequency: "daily", priority: 0.9, lastModified: new Date() },
  { url: `${site.baseUrl}/sobre-nosotros`, changeFrequency: "monthly", priority: 0.6, lastModified: new Date() },
  { url: `${site.baseUrl}/donde-comprar`, changeFrequency: "monthly", priority: 0.7, lastModified: new Date() },
  { url: `${site.baseUrl}/catalogos`, changeFrequency: "weekly", priority: 0.7, lastModified: new Date() }
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return staticRoutes;

  const client = createClient(url, key);
  const [productsResult, categoriesResult] = await Promise.all([
    client.from("product_details").select("name").not("name", "is", null),
    client.from("product_categories").select("name").eq("is_active", true)
  ]);

  const productRoutes: MetadataRoute.Sitemap = (productsResult.data ?? [])
    .filter((row): row is { name: string } => typeof row.name === "string")
    .map((row) => ({
      url: `${site.baseUrl}/productos/${slugify(row.name)}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      lastModified: new Date()
    }));

  const categoryRoutes: MetadataRoute.Sitemap = (categoriesResult.data ?? [])
    .filter((row): row is { name: string } => typeof row.name === "string")
    .map((row) => ({
      url: `${site.baseUrl}${categoryUrl(row.name)}`,
      changeFrequency: "weekly" as const,
      priority: 0.85,
      lastModified: new Date()
    }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
