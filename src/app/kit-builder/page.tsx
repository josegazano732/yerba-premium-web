import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { KitBuilderSection } from "@/components/kit-builder/KitBuilderSection";
import { site } from "@/data/site";
import { resolveKitBuilder3DEnabledServer } from "@/lib/store-features-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arma tu Kit 3D",
  description: "Configura tu kit matero y explora una experiencia de armado personalizada.",
  alternates: { canonical: `${site.baseUrl}/kit-builder` },
};

export default async function KitBuilderPage() {
  const enabled = await resolveKitBuilder3DEnabledServer();
  if (!enabled) notFound();

  return (
    <main>
      <KitBuilderSection enabled={enabled} />
    </main>
  );
}
