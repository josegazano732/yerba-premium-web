import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { site } from "@/data/site";
import { sortedInstagramPosts } from "@/data/instagram";

export function InstagramHighlights() {
  return (
    <section className="section-pad bg-background" aria-labelledby="instagram-heading">
      <Container>
        <div className="relative mb-6 sm:mb-8">
          <div className="text-center">
            <Badge>Instagram</Badge>
            <h2 id="instagram-heading" className="mt-3 font-serif text-2xl text-forest sm:text-3xl">
              La comunidad en acción
            </h2>
          </div>
          <Link
            href={site.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-0 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-cta-hover sm:flex"
          >
            Seguinos en Instagram
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {sortedInstagramPosts.map((post) => (
            <Link
              key={post.id}
              href={post.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl bg-secondary/30 shadow-sm ring-1 ring-[#e3ddcf] transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-forest/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={post.thumbnail_url}
                  alt={post.title}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>

              {/* Icono de Instagram superpuesto */}
              <span
                aria-hidden="true"
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-forest shadow-sm backdrop-blur-sm"
              >
                <Instagram className="h-4 w-4" />
              </span>

              {/* Gradiente inferior: sutil por defecto, más intenso en hover */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100"
              />
              <span className="absolute inset-x-0 bottom-0 p-3 text-left text-xs font-semibold leading-snug text-white sm:p-4">
                {post.title}
              </span>
            </Link>
          ))}
        </div>

        <Link
          href={site.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-cta-hover sm:hidden"
        >
          Seguinos en Instagram
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Container>
    </section>
  );
}
