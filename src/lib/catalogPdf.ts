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

export type OrderPdfLine = {
  name: string;
  image: string;
  presentation: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type OrderPdfOptions = {
  title: string;
  lines: OrderPdfLine[];
  totalUnits: number;
  totalKilograms?: number;
  total: number;
  fileName: string;
};

/** Genera el detalle del pedido mayorista con el mismo formato visual de la lista de precios. */
export async function downloadOrderPdf({
  title,
  lines,
  totalUnits,
  totalKilograms = 0,
  total,
  fileName
}: OrderPdfOptions) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  const [logo, images] = await Promise.all([
    loadLogo(),
    Promise.all(lines.map((line) => toJpegDataUrl(line.image)))
  ]);

  const today = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const colProduct = MARGIN;
  const colPresentation = 92;
  const colQuantity = 126;
  const colUnit = 144;
  const colSubtotal = 170;
  const colEnd = PAGE_WIDTH - MARGIN;

  const ROW_H = 14;
  const HEADER_ROW_H = 6;
  const TABLE_TOP_FIRST = 61;
  const TABLE_TOP_OTHER = 34;

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
    doc.text("DETALLE DE PEDIDO MAYORISTA", PAGE_WIDTH - MARGIN, isFirstPage ? 15 : 12, { align: "right" });

    doc.setFont("times", "bold");
    doc.setFontSize(isFirstPage ? 17 : 12);
    doc.setTextColor(...FOREST);
    doc.text(title, PAGE_WIDTH - MARGIN, isFirstPage ? 23.5 : 18, { align: "right" });

    if (isFirstPage) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`Emitido el ${today}`, PAGE_WIDTH - MARGIN, 30, { align: "right" });
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
      "Presupuesto estimado. Los valores finales se confirman por WhatsApp.",
      MARGIN,
      FOOTER_TOP + 9.5
    );
  }

  function drawTableHeader(y: number) {
    doc.setFillColor(244, 246, 240);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, HEADER_ROW_H, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text("PRODUCTO", colProduct + 2, y + 4);
    doc.text("PRESENTACION", colPresentation, y + 4);
    doc.text("CANT.", colUnit - 1, y + 4, { align: "right" });
    doc.text("UNITARIO", colSubtotal - 1, y + 4, { align: "right" });
    doc.text("SUBTOTAL", colEnd - 1, y + 4, { align: "right" });
  }

  function drawOrderRow(line: OrderPdfLine, imageData: string | null, y: number) {
    doc.setDrawColor(...BORDER);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, ROW_H - 1, 1.5, 1.5, "FD");

    const imageBox = 10;
    doc.setFillColor(...CREAM);
    doc.roundedRect(colProduct + 2, y + 2, imageBox, imageBox, 1, 1, "F");
    if (imageData) {
      doc.addImage(imageData, "JPEG", colProduct + 2, y + 2, imageBox, imageBox);
    }

    const textX = colProduct + 2 + imageBox + 3;
    const textWidth = colPresentation - textX - 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...FOREST);
    const nameLines = doc.splitTextToSize(line.name, textWidth).slice(0, 2) as string[];
    nameLines.forEach((nameLine, index) => doc.text(nameLine, textX, y + 5 + index * 3.6));

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT);
    const presentation = doc.splitTextToSize(line.presentation, colQuantity - colPresentation - 2).slice(0, 1) as string[];
    doc.text(presentation[0] ?? "", colPresentation, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...FOREST);
    doc.text(String(line.quantity), colUnit - 1, y + 6, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT);
    doc.text(currency.format(line.unitPrice), colSubtotal - 1, y + 6, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...FOREST);
    doc.text(currency.format(line.subtotal), colEnd - 1, y + 6, { align: "right" });
  }

  function drawTotals(y: number) {
    doc.setFillColor(...CREAM);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 18, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...FOREST);
    doc.text(`Bultos: ${totalUnits}`, MARGIN + 5, y + 7);

    if (totalKilograms > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(`Peso total: ${totalKilograms.toFixed(2)} kg`, MARGIN + 5, y + 11);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("Total estimado", colEnd - 5, y + 6.5, { align: "right" });

    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...FOREST);
    doc.text(currency.format(total), colEnd - 5, y + 13.5, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(
      "Precios estimados: los productos a granel se calculan sobre el valor por kilo.",
      MARGIN,
      y + 24
    );
  }

  let pageIndex = 0;
  let lineIndex = 0;
  let lastRowY = TABLE_TOP_FIRST;

  while (lineIndex < lines.length) {
    if (pageIndex > 0) doc.addPage();
    const isFirstPage = pageIndex === 0;
    drawHeader(isFirstPage);
    drawFooter();

    const tableTop = isFirstPage ? TABLE_TOP_FIRST : TABLE_TOP_OTHER;

    if (isFirstPage) {
      doc.setFillColor(...CREAM);
      doc.roundedRect(MARGIN, 43, CONTENT_WIDTH, 12, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...FOREST);
      doc.text("Detalle de pedido mayorista", MARGIN + 5, 48.5);

      const meta = [`Bultos: ${totalUnits}`];
      if (totalKilograms > 0) meta.push(`Peso total: ${totalKilograms.toFixed(2)} kg`);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(meta.join("   ·   "), MARGIN + 5, 52.5);
    }

    drawTableHeader(tableTop);

    const firstRowY = tableTop + HEADER_ROW_H + 1;
    const rowsPerPage = Math.floor((FOOTER_TOP - 3 - firstRowY) / ROW_H);

    for (let row = 0; row < rowsPerPage && lineIndex < lines.length; row += 1) {
      const y = firstRowY + row * ROW_H;
      drawOrderRow(lines[lineIndex], images[lineIndex], y);
      lastRowY = y;
      lineIndex += 1;
    }

    pageIndex += 1;
  }

  let totalsY = lastRowY + ROW_H + 3;
  if (totalsY + 26 > FOOTER_TOP - 1) {
    doc.addPage();
    drawHeader(false);
    drawFooter();
    totalsY = 40;
  }
  drawTotals(totalsY);

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
