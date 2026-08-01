"use client";

import { Instagram, Mail, Music2, Youtube } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { site } from "@/data/site";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";

type NewsletterForm = { email: string };

const socials = [
  { Icon: Instagram, href: site.instagramUrl, label: "Instagram", external: true },
  { Icon: Music2, href: "#", label: "TikTok", external: false },
  { Icon: Youtube, href: "#", label: "YouTube", external: false },
  { Icon: Mail, href: "/contacto", label: "Contacto", external: false }
];

const columns = [
  { title: "Comprar", links: ["Productos", "Donde Comprar", "Mayoristas"] },
  { title: "Conocenos", links: ["Sobre Nosotros", "Sustentabilidad", "Proceso"] },
  { title: "Ayuda", links: ["Contacto", "Envios", "Cambios"] }
];

export function Footer() {
  const { register, handleSubmit, reset } = useForm<NewsletterForm>();

  function onSubmit() {
    reset();
  }

  return (
    <footer className="bg-primary text-white">
      <Container className="section-pad grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="font-serif text-4xl font-bold">Recibi descuentos secretos</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row">
            <Input type="email" placeholder="tu@email.com" aria-label="Email" required {...register("email")} />
            <Button type="submit" variant="secondary" className="shrink-0">
              Suscribirme
            </Button>
          </form>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-bold uppercase text-secondary">{column.title}</p>
              <ul className="mt-4 space-y-3 text-sm text-white/75">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="hover:text-white">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>

      <Container className="flex flex-col gap-5 border-t border-white/15 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/70">© 2026 JLGazano. Todos los derechos reservados.</p>
        <div className="flex gap-3">
          {socials.map(({ Icon, href, label, external }) => (
            <Link
              key={label}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label={label}
            >
              <Icon size={18} />
            </Link>
          ))}
        </div>
      </Container>
    </footer>
  );
}