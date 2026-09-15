"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";
import { Check, PackageCheck, Trash2 } from "lucide-react";
import { bannerPath, bannerSlots, bannerUrl, heroVideoPath, heroVideoUrl } from "@/components/home/HeroBanner";
import { supabase } from "@/lib/supabase";

const maxFileSize = 6 * 1024 * 1024;
const maxVideoFileSize = 30 * 1024 * 1024;
const maxVideoDurationSeconds = 10;

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
  showVideoUpload?: boolean;
};

export function AdminHeroBanner({
  eyebrow = "Identidad visual",
  title = "Banner del inicio",
  description = "Subí hasta 3 fotos apaisadas: se muestran a pantalla completa arriba del inicio y rotan solas. Si no cargás ninguna, se usan fotos de productos del catálogo.",
  slots = bannerSlots,
  pathFor = bannerPath,
  urlFor = bannerUrl,
  slotLabel = "Banner",
  hint = "Recomendado: 2000 x 1100 px, PNG/JPG/WebP o HEIC (iPhone), máximo 6 MB. Se convierte automáticamente a WebP y se optimiza.",
  showVideoUpload = false
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

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState(`${heroVideoUrl}?t=${Date.now()}`);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoMissing, setVideoMissing] = useState(false);

  function updateSlot(slot: number, changes: Partial<SlotState>) {
    setSlots((current) => ({ ...current, [slot]: { ...current[slot], ...changes } }));
  }

  async function selectVideo(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setMessage("");
    setIsError(false);
    if (!selectedFile) return;
    if (!isSupportedVideoFile(selectedFile)) {
      setIsError(true);
      setMessage("Usá un video MP4, WebM o MOV.");
      event.target.value = "";
      return;
    }
    if (selectedFile.size > maxVideoFileSize) {
      setIsError(true);
      setMessage("El video debe pesar menos de 30 MB.");
      event.target.value = "";
      return;
    }
    let duration: number;
    try {
      duration = await readVideoDuration(selectedFile);
    } catch {
      setIsError(true);
      setMessage("No pudimos leer el video seleccionado.");
      event.target.value = "";
      return;
    }
    if (duration > maxVideoDurationSeconds) {
      setIsError(true);
      setMessage("El video no puede durar más de 10 segundos.");
      event.target.value = "";
      return;
    }
    setVideoMissing(false);
    setVideoFile(selectedFile);
    setVideoPreview(URL.createObjectURL(selectedFile));
    event.target.value = "";
  }

  async function uploadVideo() {
    if (!supabase || !videoFile) return;
    setVideoUploading(true);
    setMessage("");
    setIsError(false);
    const { error } = await supabase.storage.from("products").upload(heroVideoPath, videoFile, {
      cacheControl: "0",
      contentType: videoFile.type,
      upsert: true
    });
    setVideoUploading(false);
    if (error) {
      setIsError(true);
      setMessage(`No se pudo cargar el video: ${error.message}`);
      return;
    }
    setVideoFile(null);
    setVideoMissing(false);
    setVideoPreview(`${heroVideoUrl}?t=${Date.now()}`);
    setMessage("Video actualizado. Recargá el inicio para verlo.");
  }

  async function removeVideo() {
    if (!supabase) return;
    setVideoUploading(true);
    const { error } = await supabase.storage.from("products").remove([heroVideoPath]);
    setVideoUploading(false);
    if (error) {
      setIsError(true);
      setMessage(`No se pudo quitar el video: ${error.message}`);
      return;
    }
    setVideoFile(null);
    setVideoMissing(true);
    setIsError(false);
    setMessage("Video eliminado.");
  }

  async function selectFile(slot: number, event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setMessage("");
    setIsError(false);
    if (!selectedFile) return;
    if (!isSupportedImageFile(selectedFile)) {
      setIsError(true);
      setMessage("Usá una imagen PNG, JPG, WebP o HEIC.");
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
                    accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
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

      {showVideoUpload ? (
        <div className="border-t border-[#e0e2dc] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Video de fondo (solo escritorio)</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Video opcional de hasta 10 segundos que se reproduce a pantalla completa arriba del inicio, solo en escritorio. En el celular se sigue mostrando la foto del banner.
          </p>

          <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.5fr)] md:items-center">
            <div className="flex aspect-video items-center justify-center overflow-hidden border border-dashed border-[#c9cec4] bg-[#f7f6f1]">
              {videoMissing ? (
                <span className="px-4 text-center text-xs text-muted">Sin video cargado</span>
              ) : (
                <video src={videoPreview} muted playsInline controls className="h-full w-full object-cover" />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 border border-[#bfc5ba] bg-white px-3 text-xs font-bold text-[#263324] transition hover:border-primary hover:bg-[#f5f7f1]">
                <PackageCheck size={16} /> Elegir video
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(event) => void selectVideo(event)}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={() => void uploadVideo()}
                disabled={!videoFile || videoUploading}
                className="inline-flex h-10 items-center gap-2 bg-[#20341d] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check size={16} /> {videoUploading ? "Cargando..." : "Guardar"}
              </button>
              {!videoMissing && (
                <button
                  type="button"
                  onClick={() => void removeVideo()}
                  disabled={videoUploading}
                  className="inline-flex h-10 items-center gap-2 border border-[#e3c9c9] px-3 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 size={16} /> Quitar
                </button>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">MP4, WebM o MOV. Máximo 10 segundos y 30 MB.</p>
        </div>
      ) : null}

      {message ? (
        <p role="status" className={`px-5 pb-5 text-sm font-semibold ${isError ? "text-red-700" : "text-[#385133]"}`}>
          {message}
        </p>
      ) : null}

      <p className="px-5 pb-5 text-xs text-muted">{hint}</p>
    </section>
  );
}

const MAX_IMAGE_DIMENSION = 2000;
const WEBP_QUALITY = 0.85;

function isHeicFile(file: File): boolean {
  return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

function isSupportedImageFile(file: File): boolean {
  return /^image\/(png|jpeg|webp|heic|heif)$/i.test(file.type) || /\.(png|jpe?g|webp|heic|heif)$/i.test(file.name);
}

function isSupportedVideoFile(file: File): boolean {
  return /^video\/(mp4|webm|quicktime)$/i.test(file.type) || /\.(mp4|webm|mov)$/i.test(file.name);
}

async function readVideoDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => reject(new Error("No se pudo leer el video."));
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fitWithinMaxDimension(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function convertImageToWebp(file: File): Promise<File> {
  let sourceBlob: Blob = file;
  let sourceUrl: string | null = null;
  try {
    if (isHeicFile(file)) {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
      sourceBlob = Array.isArray(converted) ? converted[0] : converted;
    }
    sourceUrl = URL.createObjectURL(sourceBlob);
    const image = await loadImage(sourceUrl);
    const { width, height } = fitWithinMaxDimension(image.naturalWidth, image.naturalHeight, MAX_IMAGE_DIMENSION);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo inicializar el procesador de imágenes.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToWebpBlob(canvas, WEBP_QUALITY);
    const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "banner";
    return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
  } finally {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
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
