import { BrandStory } from "@/components/brand/BrandStory";
import { ProcessSection } from "@/components/brand/ProcessSection";
import { Sustainability } from "@/components/brand/Sustainability";

export default function AboutPage() {
  return (
    <main>
      <BrandStory />
      <Sustainability />
      <ProcessSection />
    </main>
  );
}