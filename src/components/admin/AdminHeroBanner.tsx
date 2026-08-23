"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";
import { Check, PackageCheck, Trash2 } from "lucide-react";
import { bannerPath, bannerSlots, bannerUrl } from "@/components/home/HeroBanner";
import { supabase } from "@/lib/supabase";

const maxFileSize = 6 * 1024 * 1024;
const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

type SlotState = {
  file: File | null;
  preview: string;
  uploading: boolean;
};

type AdminHeroBannerProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  slots?: number[];
  pathFor?: (slot: number) => string;
  urlFor?: (slot: number) => string;
  slotLabel?: string;
  hint?: string;
};

export function AdminHeroBanner({
  eyebrow = "Identidad visual",
  title = "Banner del inicio",
  description = "Subí hasta 3 fotos apaisadas: se muestran a pantalla completa arriba del inicio y rotan solas. Si no cargás ninguna, se usan fotos de productos del catálogo.",
  slots = bannerSlots,
  pathFor = bannerPath,
  urlFor = bannerUrl,
  slotLabel = "Banner",
  hint = "Recomendado: 2000 x 1100 px, PNG/JPG/WebP, máximo 6 MB. Se convierte automáticamente a WebP."
}: AdminHeroBannerProps) {
  const [slotStates, setSlots] = useState<Record<number, SlotState>>(() =>
    slots.reduce((accumulator, slot) => {
      accumulator[slot] = { file: null, preview: `${urlFor(slot)}?t=${Date.now()}`, uploading: false };
      return accumulator;
    }, {} as Record<number, SlotState>)
  );
  const [missing, setMissing] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function updateSlot(slot: number, changes: Partial<SlotState>) {
    setSlots((current) => ({ ...current, [slot]: { ...current[slot], ...changes } }));
  }

  async function selectFile(slot: number, event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setMessage("");
    setIsError(false);
    if (!selectedFile) return;
    if (!allowedTypes.includes(selectedFile.type)) {
      setIsError(true);
      setMessage("Usá una imagen PNG, JPG o WebP.");
      event.target.value = "";
      return;
    }
    if (selectedFile.size > maxFileSize) {
      setIsError(true);
      setMessage("La imagen debe pesar menos de 6 MB.");
      event.target.value = "";
      return;
    }
    let convertedFile: File;
    try {
      convertedFile = await convertImageToWebp(selectedFile);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "No se pudo convertir la imagen a WebP.");
      event.target.value = "";
      return;
    }
    if (convertedFile.size > maxFileSize) {
      setIsError(true);
      setMessage("Luego de convertir a WebP, la imagen debe pesar menos de 6 MB.");
      event.target.value = "";
      return;
    }
    setMissing((current) => current.filter((item) => item !== slot));
    updateSlot(slot, { file: convertedFile, preview: URL.createObjectURL(convertedFile) });
    event.target.value = "";
  }

  async function uploadBanner(slot: number) {
    const state = slotStates[slot];
    if (!supabase || !state.file) return;
    updateSlot(slot, { uploading: true });
    setMessage("");
    setIsError(false);

    const { error } = await supabase.storage.from("products").upload(pathFor(slot), state.file, {
      cacheControl: "0",
      contentType: "image/webp",
      upsert: true
    });

    updateSlot(slot, { uploading: false });
    if (error) {
      setIsError(true);
      setMessage(`No se pudo cargar la imagen: ${error.message}`);
      return;
    }

    updateSlot(slot, { file: null, preview: `${urlFor(slot)}?t=${Date.now()}` });
    setMessage("Imagen actualizada. Recargá el inicio para verla.");
  }

  async function removeBanner(slot: number) {
    if (!supabase) return;
    updateSlot(slot, { uploading: true });
    const { error } = await supabase.storage.from("products").remove([pathFor(slot)]);
    updateSlot(slot, { uploading: false, file: null });
    if (error) {
      setIsError(true);
      setMessage(`No se pudo quitar la imagen: ${error.message}`);
      return;
    }
    setMissing((current) => (current.includes(slot) ? current : [...current, slot]));
    setIsError(false);
    setMessage("Imagen eliminada.");
  }

  return (
    <section className="mt-6 border border-[#d9dcd3] bg-white">
      <div className="border-b border-[#e0e2dc] px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 font-serif text-3xl font-semibold text-[#1d2d1a]">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-3">
        {slots.map((slot) => {
          const state = slotStates[slot];
          const isMissing = missing.includes(slot);

          return (
            <div key={slot} className="border border-[#e0e2dc] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                {slots.length > 1 ? `${slotLabel} ${slot}` : slotLabel}
              </p>

              <div className="mt-3 flex aspect-[16/9] items-center justify-center overflow-hidden border border-dashed border-[#c9cec4] bg-[#f7f6f1]">
                {isMissing ? (
                  <span className="px-4 text-center text-xs text-muted">Sin imagen cargada</span>
                ) : (
                  <Image
                    src={state.preview}
                    alt={`Vista previa de ${slotLabel.toLowerCase()} ${slot}`}
                    width={640}
                    height={360}
                    onError={() => setMissing((current) => (current.includes(slot) ? current : [...current, slot]))}
                    className="h-full w-full object-cover"
                    unoptimized={state.preview.startsWith("blob:")}
                  />
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 border border-[#bfc5ba] bg-white px-3 text-xs font-bold text-[#263324] transition hover:border-primary hover:bg-[#f5f7f1]">
                  <PackageCheck size={16} /> Elegir
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => selectFile(slot, event)}
                    className="sr-only"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void uploadBanner(slot)}
                  disabled={!state.file || state.uploading}
                  className="inline-flex h-10 items-center gap-2 bg-[#20341d] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check size={16} /> {state.uploading ? "Cargando..." : "Guardar"}
                </button>
                {!isMissing && (
                  <button
                    type="button"
                    onClick={() => void removeBanner(slot)}
                    disabled={state.uploading}
                    className="inline-flex h-10 items-center gap-2 border border-[#e3c9c9] px-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-40"
                  >
                    <Trash2 size={16} /> Quitar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {message ? (
        <p role="status" className={`px-5 pb-5 text-sm font-semibold ${isError ? "text-red-700" : "text-[#385133]"}`}>
          {message}
        </p>
      ) : null}

      <p className="px-5 pb-5 text-xs text-muted">{hint}</p>
    </section>
  );
}

async function convertImageToWebp(file: File): Promise<File> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo inicializar el procesador de imágenes.");
    context.drawImage(image, 0, 0);

    const blob = await canvasToWebpBlob(canvas, 0.9);
    const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "banner";
    return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No pudimos leer la imagen seleccionada."));
    image.src = sourceUrl;
  });
}

async function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo convertir la imagen a WebP."));
        return;
      }
      resolve(blob);
    }, "image/webp", quality);
  });
}
