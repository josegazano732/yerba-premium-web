"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";
import { Check, PackageCheck } from "lucide-react";
import { brandLogoUpdatedEvent } from "@/components/brand/BrandLogo";
import { supabase } from "@/lib/supabase";

const maxFileSize = 2 * 1024 * 1024;
const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const fallbackLogo = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo.webp`;
const remoteLogo = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/branding/site-logo`;

export function AdminBranding() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(remoteLogo);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setMessage("");
    setIsError(false);
    if (!selectedFile) return;
    if (!allowedTypes.includes(selectedFile.type)) {
      setIsError(true);
      setMessage("Usá una imagen SVG, PNG, JPG o WebP.");
      event.target.value = "";
      return;
    }
    if (selectedFile.size > maxFileSize) {
      setIsError(true);
      setMessage("La imagen debe pesar menos de 2 MB.");
      event.target.value = "";
      return;
    }
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  }

  async function uploadLogo() {
    if (!supabase || !file) return;
    setUploading(true);
    setMessage("");
    setIsError(false);
    const { error } = await supabase.storage.from("products").upload("branding/site-logo", file, {
      cacheControl: "0",
      contentType: file.type,
      upsert: true
    });
    setUploading(false);
    if (error) {
      setIsError(true);
      setMessage(`No se pudo cargar el logo: ${error.message}`);
      return;
    }

    const version = Date.now().toString();
    const updatedLogo = `${remoteLogo}?v=${version}`;
    localStorage.setItem("brand-logo-version", version);
    window.dispatchEvent(new CustomEvent(brandLogoUpdatedEvent, { detail: updatedLogo }));
    setPreview(updatedLogo);
    setFile(null);
    setMessage("Logo actualizado correctamente.");
  }

  return (
    <section className="mt-6 border border-[#d9dcd3] bg-white">
      <div className="border-b border-[#e0e2dc] px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Identidad visual</p>
        <h2 className="mt-1 font-serif text-3xl font-semibold text-[#1d2d1a]">Logo de la web</h2>
      </div>
      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)] md:items-center">
        <div>
          <p className="max-w-xl text-sm leading-6 text-muted">Subí un logo horizontal con fondo transparente. Se mostrará automáticamente en el encabezado de toda la web.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 border border-[#bfc5ba] bg-white px-4 text-sm font-bold text-[#263324] transition hover:border-primary hover:bg-[#f5f7f1]">
              <PackageCheck size={18} /> Elegir imagen
              <input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" onChange={selectFile} className="sr-only" />
            </label>
            <button type="button" onClick={() => void uploadLogo()} disabled={!file || uploading} className="inline-flex h-11 items-center gap-2 bg-[#20341d] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
              <Check size={18} /> {uploading ? "Cargando..." : "Guardar logo"}
            </button>
          </div>
          <p className="mt-3 text-xs text-muted">SVG, PNG, JPG o WebP. Tamaño máximo: 2 MB.</p>
          {message ? <p role="status" className={`mt-3 text-sm font-semibold ${isError ? "text-red-700" : "text-[#385133]"}`}>{message}</p> : null}
        </div>
        <div className="flex min-h-32 items-center justify-center border border-dashed border-[#c9cec4] bg-[#f7f6f1] p-6">
          <Image src={preview} alt="Vista previa del logo" width={640} height={196} onError={() => setPreview(fallbackLogo)} className="max-h-20 w-auto max-w-full object-contain" unoptimized={preview.startsWith("blob:")} />
        </div>
      </div>
    </section>
  );
}