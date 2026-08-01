"use client";

import { Instagram, Mail, Music2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { site } from "@/data/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container } from "@/components/ui/Container";

type NewsletterForm = { email: string };

/** Marco con esquinas achaflanadas: se aplica al borde y al relleno interior. */
const notchedFrame = {
  clipPath:
    "polygon(28px 0, calc(100% - 28px) 0, 100% 28px, 100% calc(100% - 28px), calc(100% - 28px) 100%, 28px 100%, 0 calc(100% - 28px), 0 28px)"
};

const socials = [
  { Icon: Instagram, href: site.instagramUrl, label: "Instagram", external: true },
  { Icon: Music2, href: "#", label: "TikTok", external: false },
  { Icon: Mail, href: "/contacto", label: "Contacto", external: false }
];

const columns = [
  {
    title: "Comprar",
    links: [
      { label: "Todos los productos", href: "/productos" },
      { label: "Mates", href: "/productos#Mates" },
      { label: "Termos", href: "/productos#Termos" },
      { label: "Bombillas", href: "/productos#Bombillas" }
    ]
  },
  {
    title: "Conocenos",
    links: [
      { label: "Sobre Nosotros", href: "/sobre-nosotros" },
      { label: "Donde Comprar", href: "/donde-comprar" },
      { label: "Mayoristas", href: "/contacto" }
    ]
  },
  {
    title: "Ayuda",
    links: [
      { label: "Contacto", href: "/contacto" },
      { label: "Envios y cambios", href: "/contacto" }
    ]
  }
];

export function Footer() {
  const { register, handleSubmit, reset } = useForm<NewsletterForm>();

  function onSubmit() {
    reset();
  }

  return (
    <footer className="bg-background text-forest">
      <Container className="pt-16">
        <div className="relative">
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 bg-background px-6">
            <Link href="/" aria-label="Inicio" className="block">
              <BrandLogo />
            </Link>
          </div>

          <div className="bg-primary/25 p-px" style={notchedFrame}>
            <div
              className="grid gap-12 bg-background px-6 pb-14 pt-24 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-14"
              style={notchedFrame}
            >
              <div className="grid gap-10 sm:grid-cols-3">
                {columns.map((column) => (
                  <div key={column.title}>
                    <p className="font-serif text-2xl font-semibold text-forest">{column.title}</p>
                    <ul className="mt-5 space-y-3 text-sm text-muted">
                      {column.links.map((link) => (
                        <li key={`${column.title}-${link.label}`}>
                          <Link href={link.href} className="transition hover:text-primary">
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="lg:pl-6">
                <p className="text-base leading-7 text-muted">
                  Suscribite para recibir novedades y descuentos secretos!
                </p>
                <form onSubmit={handleSubmit(onSubmit)} className="mt-5 flex max-w-md flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    required
                    aria-label="Email"
                    placeholder="Ingresá tu email"
                    className="min-h-12 w-full border border-primary/30 bg-transparent px-4 text-sm text-text outline-none transition placeholder:text-muted focus:border-primary"
                    {...register("email")}
                  />
                  <button
                    type="submit"
                    className="min-h-12 shrink-0 border border-primary/40 px-7 text-sm font-semibold text-forest transition hover:bg-primary hover:text-white"
                  >
                    Enviar
                  </button>
                </form>

                <div className="mt-8 flex gap-4">
                  {socials.map(({ Icon, href, label, external }) => (
                    <Link
                      key={label}
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      aria-label={label}
                      className="grid h-14 w-14 place-items-center rounded-[42%] bg-primary/70 text-white transition hover:bg-primary"
                    >
                      <Icon size={24} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <div className="mt-12 border-t border-primary/10 bg-[#efe9dd]">
        <Container className="flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright Mate Tierra - 2026. Todos los derechos reservados.</p>
          <p>
            Desarrollado por <span className="font-semibold text-forest">JLGazano</span>
          </p>
        </Container>
      </div>
    </footer>
  );
}