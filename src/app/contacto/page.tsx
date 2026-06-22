import { Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";

export default function ContactPage() {
  return (
    <main className="section-pad bg-background">
      <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-bold uppercase text-accent">Contacto</p>
          <h1 className="mt-3 font-serif text-5xl font-bold text-text">Hablemos de mate</h1>
          <div className="mt-8 space-y-4 text-muted">
            <p className="flex items-center gap-3"><Mail size={18} /> hola@yerbalibre.com</p>
            <p className="flex items-center gap-3"><Phone size={18} /> +54 11 5555 0188</p>
            <p className="flex items-center gap-3"><MapPin size={18} /> Misiones, Argentina</p>
          </div>
        </div>
        <form className="rounded-[8px] bg-white p-5 shadow-sm sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Nombre" required />
            <Input type="email" placeholder="Email" required />
          </div>
          <textarea className="mt-4 min-h-40 w-full rounded-[8px] border border-primary/15 bg-white p-5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Mensaje" required />
          <Button type="submit" className="mt-4">Enviar consulta</Button>
        </form>
      </Container>
    </main>
  );
}