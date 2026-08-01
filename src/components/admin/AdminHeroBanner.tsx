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

const initialSlots: Record<number, SlotState> = bannerSlots.reduce((accumulator, slot) => {
  accumulator[slot] = { file: null, preview: `${bannerUrl(slot)}?t=${Date.now()}`, uploading: false };
  return accumulator;
}, {} as Record<number, SlotState>);

export function AdminHeroBanner() {
  const [slots, setSlots] = useState(initialSlots);
  const [missing, setMissing] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function updateSlot(slot: number, changes: Partial<SlotState>) {
    setSlots((current) => ({ ...current, [slot]: { ...current[slot], ...changes } }));
  }

  function selectFile(slot: number, event: ChangeEvent<HTMLInputElement>) {
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
    setMissing((current) => current.filter((item) => item !== slot));
    updateSlot(slot, { file: selectedFile, preview: URL.createObjectURL(selectedFile) });
  }

  async function uploadBanner(slot: number) {
    const state = slots[slot];
    if (!supabase || !state.file) return;
    updateSlot(slot, { uploading: true });
    setMessage("");
    setIsError(false);

    const { error } = await supabase.storage.from("products").upload(bannerPath(slot), state.file, {
      cacheControl: "0",
      contentType: state.file.type,
      upsert: true
    });

    updateSlot(slot, { uploading: false });
    if (error) {
      setIsError(true);
      setMessage(`No se pudo cargar el banner ${slot}: ${error.message}`);
      return;
    }

    updateSlot(slot, { file: null, preview: `${bannerUrl(slot)}?t=${Date.now()}` });
    setMessage(`Banner ${slot} actualizado. Recargá el inicio para verlo.`);
  }

  async function removeBanner(slot: number) {
    if (!supabase) return;
    updateSlot(slot, { uploading: true });
    const { error } = await supabase.storage.from("products").remove([bannerPath(slot)]);
    updateSlot(slot, { uploading: false, file: null });
    if (error) {
      setIsError(true);
      setMessage(`No se pudo quitar el banner ${slot}: ${error.message}`);
      return;
    }
    setMissing((current) => (current.includes(slot) ? current : [...current, slot]));
    setIsError(false);
    setMessage(`Banner ${slot} eliminado.`);
  }

  return (
    <section className="mt-6 border border-[#d9dcd3] bg-white">
      <div className="border-b border-[#e0e2dc] px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Identidad visual</p>
        <h2 className="mt-1 font-serif text-3xl font-semibold text-[#1d2d1a]">Banner del inicio</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Subí hasta 3 fotos apaisadas: se muestran a pantalla completa arriba del inicio y rotan solas. Si no cargás
          ninguna, se usan fotos de productos del catálogo.
        </p>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-3">
        {bannerSlots.map((slot) => {
          const state = slots[slot];
          const isMissing = missing.includes(slot);

          return (
            <div key={slot} className="border border-[#e0e2dc] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Banner {slot}</p>

              <div className="mt-3 flex aspect-[16/9] items-center justify-center overflow-hidden border border-dashed border-[#c9cec4] bg-[#f7f6f1]">
                {isMissing ? (
                  <span className="px-4 text-center text-xs text-muted">Sin imagen cargada</span>
                ) : (
                  <Image
                    src={state.preview}
                    alt={`Vista previa del banner ${slot}`}
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

      <p className="px-5 pb-5 text-xs text-muted">Recomendado: 2000 x 1100 px, PNG/JPG/WebP, máximo 6 MB.</p>
    </section>
  );
}
