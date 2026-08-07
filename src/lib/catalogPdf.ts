import { site } from "@/data/site";

export type CatalogPdfRow = { label: string; price: number };

export type CatalogPdfItem = {
  name: string;
  image: string;
  description?: string;
  priceCaption: string;
  unitProduct?: boolean;
  rows: CatalogPdfRow[];
};

export type CatalogPdfOptions = {
  title: string;
  intro: string;
  items: CatalogPdfItem[];
  fileName: string;
};

const REMOTE_LOGO = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/branding/site-logo`;
const FALLBACK_LOGO = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo.webp`;

const FOREST: [number, number, number] = [32, 52, 29];
const PRIMARY: [number, number, number] = [108, 142, 55];
const TEXT: [number, number, number] = [45, 51, 40];
const MUTED: [number, number, number] = [99, 104, 92];
const BORDER: [number, number, number] = [226, 224, 216];
const CREAM: [number, number, number] = [247, 242, 234];

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const COLUMN_GAP = 6;
const CARD_WIDTH = (PAGE_WIDTH - MARGIN * 2 - COLUMN_GAP) / 2;
const CARD_HEIGHT = 48;
const CARD_GAP = 5;
const FOOTER_TOP = 280;

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const imageCache = new Map<string, string | null>();

/** Redibuja la imagen en un canvas para normalizar formato (webp incluido) y fondo. */
async function toJpegDataUrl(url: string, size = 360): Promise<string | null> {
  if (imageCache.has(url)) return imageCache.get(url) ?? null;

  const element = await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });

  let result: string | null = null;
  if (element && element.naturalWidth > 0) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
      const scale = Math.min(size / element.naturalWidth, size / element.naturalHeight);
      const width = element.naturalWidth * scale;
      const height = element.naturalHeight * scale;
      context.drawImage(element, (size - width) / 2, (size - height) / 2, width, height);
      try {
        result = canvas.toDataURL("image/jpeg", 0.85);
      } catch {
        result = null;
      }
    }
  }

  imageCache.set(url, result);
  return result;
}

async function loadLogo(): Promise<{ dataUrl: string; ratio: number } | null> {
  // Usar la misma versión que BrandLogo para evitar logo desactualizado
  const version = typeof window !== "undefined" ? localStorage.getItem("brand-logo-version") : null;
  const remoteUrl = version ? `${REMOTE_LOGO}?v=${version}` : REMOTE_LOGO;

  for (const source of [remoteUrl, FALLBACK_LOGO]) {
    try {
      const response = await fetch(source);
      if (!response.ok) continue;
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const element = await new Promise<HTMLImageElement | null>((resolve) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = blobUrl;
      });

      if (!element || element.naturalWidth === 0) {
        URL.revokeObjectURL(blobUrl);
        continue;
      }

      const canvas = document.createElement("canvas");
      canvas.width = element.naturalWidth;
      canvas.height = element.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(blobUrl);
        continue;
      }
      context.drawImage(element, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      URL.revokeObjectURL(blobUrl);
      return { dataUrl, ratio: element.naturalWidth / element.naturalHeight };
    } catch {
      continue;
    }
  }

  return null;
}

export async function downloadCatalogPdf({ title, intro, items, fileName }: CatalogPdfOptions) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  const [logo, images] = await Promise.all([
    loadLogo(),
    Promise.all(items.map((item) => toJpegDataUrl(item.image)))
  ]);

  const today = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  function drawHeader(isFirstPage: boolean) {
    const logoHeight = isFirstPage ? 15 : 9;
    const baseLine = isFirstPage ? 38 : 24;

    doc.setFillColor(...CREAM);
    doc.rect(0, 0, PAGE_WIDTH, baseLine, "F");

    if (logo) {
      doc.addImage(logo.dataUrl, "PNG", MARGIN, isFirstPage ? 11 : 7.5, logoHeight * logo.ratio, logoHeight);
    } else {
      doc.setFont("times", "bold");
      doc.setFontSize(isFirstPage ? 20 : 13);
      doc.setTextColor(...PRIMARY);
      doc.text("Mate Tierra", MARGIN, isFirstPage ? 22 : 15);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(isFirstPage ? 7.5 : 6.5);
    doc.setTextColor(...PRIMARY);
    doc.text("LISTA DE PRECIOS MAYORISTA", PAGE_WIDTH - MARGIN, isFirstPage ? 15 : 12, { align: "right" });

    doc.setFont("times", "bold");
    doc.setFontSize(isFirstPage ? 17 : 12);
    doc.setTextColor(...FOREST);
    doc.text(title, PAGE_WIDTH - MARGIN, isFirstPage ? 23.5 : 18, { align: "right" });

    if (isFirstPage) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`Vigente desde el ${today}`, PAGE_WIDTH - MARGIN, 30, { align: "right" });
    }

    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.7);
    doc.line(0, baseLine, PAGE_WIDTH, baseLine);
  }

  function drawFooter() {
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, FOOTER_TOP, PAGE_WIDTH - MARGIN, FOOTER_TOP);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...FOREST);
    doc.text(`WhatsApp ${site.whatsappDisplay}`, MARGIN, FOOTER_TOP + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(
      "Precios sujetos a modificacion sin previo aviso. No incluyen envio. Sujeto a disponibilidad de stock.",
      MARGIN,
      FOOTER_TOP + 9.5
    );
  }

  function drawCard(item: CatalogPdfItem, imageData: string | null, x: number, y: number) {
    doc.setDrawColor(...BORDER);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, CARD_WIDTH, CARD_HEIGHT, 2, 2, "FD");

    const imageBox = 34;
    doc.setFillColor(...CREAM);
    doc.roundedRect(x + 4, y + 7, imageBox, imageBox, 1.5, 1.5, "F");
    if (imageData) {
      doc.addImage(imageData, "JPEG", x + 4, y + 7, imageBox, imageBox);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text("Sin imagen", x + 4 + imageBox / 2, y + 7 + imageBox / 2, { align: "center" });
    }

    const textX = x + 42;
    const textWidth = CARD_WIDTH - 46;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...FOREST);
    const nameLines = doc.splitTextToSize(item.name, textWidth).slice(0, 2) as string[];
    nameLines.forEach((line, index) => doc.text(line, textX, y + 10 + index * 4.4));

    let cursor = y + 10 + nameLines.length * 4.4;

    if (item.description) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      const [descriptionLine] = doc.splitTextToSize(item.description, textWidth) as string[];
      doc.text(descriptionLine, textX, cursor + 1);
      cursor += 4;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PRIMARY);
    doc.text(item.priceCaption.toUpperCase(), textX, cursor + 1.5);

    const rowHeight = 5.4;
    let rowY = y + CARD_HEIGHT - 4.5 - item.rows.length * rowHeight;

    item.rows.forEach((row) => {
      doc.setFillColor(244, 246, 240);
      doc.roundedRect(textX, rowY, textWidth, rowHeight - 1, 1, 1, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT);
      doc.text(row.label, textX + 2.5, rowY + 3);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...FOREST);
      doc.text(currency.format(row.price), textX + textWidth - 2.5, rowY + 3, { align: "right" });

      rowY += rowHeight;
    });

    if (item.unitProduct) {
      const badgeLabel = "POR UNIDAD";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      const badgeW = doc.getTextWidth(badgeLabel) + 4;
      const badgeH = 5;
      const badgeX = x + CARD_WIDTH - 4 - badgeW;
      const badgeY = y + 1;
      doc.setFillColor(200, 164, 74);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(badgeLabel, badgeX + badgeW / 2, badgeY + 3.5, { align: "center" });
    }
  }

  let pageIndex = 0;
  let itemIndex = 0;

  while (itemIndex < items.length) {
    if (pageIndex > 0) doc.addPage();
    const isFirstPage = pageIndex === 0;
    drawHeader(isFirstPage);
    drawFooter();

    let gridTop = isFirstPage ? 60 : 32;

    if (isFirstPage) {
      doc.setFillColor(...CREAM);
      doc.roundedRect(MARGIN, 43, PAGE_WIDTH - MARGIN * 2, 12, 2, 2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...TEXT);
      const introLines = doc.splitTextToSize(intro, PAGE_WIDTH - MARGIN * 2 - 10).slice(0, 2) as string[];
      introLines.forEach((line, index) => doc.text(line, MARGIN + 5, 48 + index * 4));
      gridTop = 60;
    }

    const rowsPerPage = Math.floor((FOOTER_TOP - 3 - gridTop + CARD_GAP) / (CARD_HEIGHT + CARD_GAP));

    for (let row = 0; row < rowsPerPage && itemIndex < items.length; row += 1) {
      for (let column = 0; column < 2 && itemIndex < items.length; column += 1) {
        const x = MARGIN + column * (CARD_WIDTH + COLUMN_GAP);
        const y = gridTop + row * (CARD_HEIGHT + CARD_GAP);
        drawCard(items[itemIndex], images[itemIndex], x, y);
        itemIndex += 1;
      }
    }

    pageIndex += 1;
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Pagina ${page} de ${totalPages}`, PAGE_WIDTH - MARGIN, FOOTER_TOP + 5, { align: "right" });
  }

  doc.save(fileName);
}
