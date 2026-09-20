export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_FILE_ACCEPT = "image/png,image/jpeg,image/webp,image/heic,image/heif";

const MAX_IMAGE_DIMENSION = 1600;
const WEBP_QUALITY = 0.85;

function isHeicFile(file: File): boolean {
  return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export function isSupportedImageFile(file: File): boolean {
  return /^image\/(png|jpeg|webp|heic|heif)$/i.test(file.type) || /\.(png|jpe?g|webp|heic|heif)$/i.test(file.name);
}

function fitWithinMaxDimension(width: number, height: number): { width: number; height: number } {
  if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
    return { width, height };
  }

  const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

export async function convertImageToWebp(file: File): Promise<File> {
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
    const { width, height } = fitWithinMaxDimension(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) throw new Error("No se pudo inicializar el procesador de imágenes.");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToWebpBlob(canvas);
    const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "imagen";
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

async function canvasToWebpBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo convertir la imagen a WebP."));
        return;
      }
      resolve(blob);
    }, "image/webp", WEBP_QUALITY);
  });
}
