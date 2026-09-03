"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Check, PackageCheck, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_MARGIN_PROFILES,
  DEFAULT_WHOLESALE_CATALOGS,
  type WholesaleMarginProfile,
  type WholesaleCatalogConfig,
  normalizeMarginPercentage,
  slugifyCatalog
} from "@/lib/wholesale";

type CategoryOption = {
  id: string;
  name: string;
};

type CatalogForm = {
  title: string;
  slug: string;
  categoryName: string;
  description: string;
  suggestedMarginUseKey: string;
  suggestedMarginPercentage: string;
  displayOrder: string;
  isActive: boolean;
};

type WholesaleCatalogAdminProps = {
  categories: CategoryOption[];
};

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

const emptyForm: CatalogForm = {
  title: "",
  slug: "",
  categoryName: "",
  description: "",
  suggestedMarginUseKey: "",
  suggestedMarginPercentage: "30",
  displayOrder: "1",
  isActive: true
};

export function WholesaleCatalogAdmin({ categories }: Readonly<WholesaleCatalogAdminProps>) {
  const [catalogs, setCatalogs] = useState<WholesaleCatalogConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [form, setForm] = useState<CatalogForm>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<WholesaleCatalogConfig | null>(null);
  const [deletingCatalog, setDeletingCatalog] = useState<WholesaleCatalogConfig | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [marginProfiles, setMarginProfiles] = useState<WholesaleMarginProfile[]>(DEFAULT_MARGIN_PROFILES);

  const categoryNames = useMemo(() => categories.map((category) => category.name), [categories]);
  const activeMarginProfiles = useMemo(
    () => marginProfiles.filter((profile) => profile.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    [marginProfiles]
  );

  useEffect(() => {
    void loadCatalogs();
  }, []);

  async function loadCatalogs() {
    if (!supabase) return;
    setIsLoading(true);
    setMessage("");
    const [catalogsResult, marginsResult] = await Promise.all([
      supabase
        .from("wholesale_catalogs")
        .select("id,slug,title,category_name,description,hero_image_url,suggested_margin_percentage,is_active,display_order")
        .order("display_order", { ascending: true })
        .order("title", { ascending: true }),
      supabase
        .from("wholesale_margin_profiles")
        .select("id,use_key,use_label,suggested_margin_percentage,is_active,display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
    ]);

    setIsLoading(false);
    if (catalogsResult.error || marginsResult.error) {
      setIsError(true);
      setMessage("No pudimos cargar los catalogos mayoristas. Verifica la migracion de base de datos.");
      return;
    }

    const mapped =
      ((catalogsResult.data ?? []) as Array<{
        id: string;
        slug: string;
        title: string;
        category_name: string;
        description: string | null;
        hero_image_url: string | null;
        suggested_margin_percentage: number | string | null;
        is_active: boolean | null;
        display_order: number | null;
      }>).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        categoryName: row.category_name,
        description: row.description ?? "",
        heroImageUrl: row.hero_image_url ?? null,
        suggestedMarginPercentage: normalizeMarginPercentage(Number(row.suggested_margin_percentage ?? 30)),
        isActive: row.is_active ?? true,
        displayOrder: Number(row.display_order ?? 1)
      })) ?? [];

    const mappedMargins =
      ((marginsResult.data ?? []) as Array<{
        id: string;
        use_key: string;
        use_label: string;
        suggested_margin_percentage: number | string | null;
        is_active: boolean | null;
        display_order: number | null;
      }>).map((row) => ({
        id: row.id,
        useKey: row.use_key,
        useLabel: row.use_label,
        suggestedMarginPercentage: normalizeMarginPercentage(Number(row.suggested_margin_percentage ?? 30)),
        isActive: row.is_active ?? true,
        displayOrder: Number(row.display_order ?? 1)
      })) ?? [];

    setCatalogs(mapped.length > 0 ? mapped : DEFAULT_WHOLESALE_CATALOGS);
    setMarginProfiles(mappedMargins.length > 0 ? mappedMargins : DEFAULT_MARGIN_PROFILES);
  }

  function openCreate() {
    const firstMargin = activeMarginProfiles[0] ?? DEFAULT_MARGIN_PROFILES[0];
    setEditingCatalog(null);
    setSelectedImage(null);
    setSelectedImagePreview("");
    setForm({
      ...emptyForm,
      categoryName: categoryNames[0] ?? "",
      suggestedMarginUseKey: firstMargin?.useKey ?? "",
      suggestedMarginPercentage: String(firstMargin?.suggestedMarginPercentage ?? 30),
      displayOrder: String(catalogs.length + 1),
      slug: ""
    });
    setIsError(false);
    setMessage("");
    setIsFormOpen(true);
  }

  function openEdit(catalog: WholesaleCatalogConfig) {
    const matchedProfile = activeMarginProfiles.find(
      (profile) => profile.suggestedMarginPercentage === normalizeMarginPercentage(catalog.suggestedMarginPercentage)
    );
    const fallbackProfile = activeMarginProfiles[0] ?? DEFAULT_MARGIN_PROFILES[0];
    setEditingCatalog(catalog);
    setSelectedImage(null);
    setSelectedImagePreview(catalog.heroImageUrl ?? "");
    setForm({
      title: catalog.title,
      slug: catalog.slug,
      categoryName: catalog.categoryName,
      description: catalog.description,
      suggestedMarginUseKey: matchedProfile?.useKey ?? fallbackProfile?.useKey ?? "",
      suggestedMarginPercentage: String(matchedProfile?.suggestedMarginPercentage ?? catalog.suggestedMarginPercentage),
      displayOrder: String(catalog.displayOrder),
      isActive: catalog.isActive
    });
    setIsError(false);
    setMessage("");
    setIsFormOpen(true);
  }

  function selectMarginProfile(useKey: string) {
    const profile = activeMarginProfiles.find((item) => item.useKey === useKey);
    if (!profile) return;
    setForm((current) => ({
      ...current,
      suggestedMarginUseKey: profile.useKey,
      suggestedMarginPercentage: String(profile.suggestedMarginPercentage)
    }));
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setMessage("");
    setIsError(false);
    if (!allowedTypes.includes(file.type)) {
      setIsError(true);
      setMessage("Usa una imagen PNG, JPG o WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setIsError(true);
      setMessage("La imagen debe pesar menos de 6 MB.");
      event.target.value = "";
      return;
    }
    let converted: File;
    try {
      converted = await convertImageToWebp(file);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "No se pudo convertir la imagen a WebP.");
      event.target.value = "";
      return;
    }
    if (converted.size > MAX_IMAGE_BYTES) {
      setIsError(true);
      setMessage("Luego de convertir a WebP, la imagen debe pesar menos de 6 MB.");
      event.target.value = "";
      return;
    }
    setSelectedImage(converted);
    setSelectedImagePreview(URL.createObjectURL(converted));
    event.target.value = "";
  }

  async function uploadImage(slug: string) {
    if (!supabase || !selectedImage) return { imageUrl: selectedImagePreview || null, path: null as string | null };

    const path = `wholesale/catalogs/${slug}-${Date.now()}.webp`;
    const { error } = await supabase.storage.from("products").upload(path, selectedImage, {
      cacheControl: "0",
      contentType: "image/webp",
      upsert: false
    });
    if (error) throw error;

    const imageUrl = supabase.storage.from("products").getPublicUrl(path).data.publicUrl;
    return { imageUrl, path };
  }

  async function saveCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setIsSaving(true);
    setMessage("");
    setIsError(false);

    if (!editingCatalog && !selectedImage) {
      setIsSaving(false);
      setIsError(true);
      setMessage("Selecciona una imagen principal para el catalogo.");
      return;
    }

    const slug = slugifyCatalog(form.slug || form.title);
    let uploadedPath: string | null = null;
    let imageUrl = editingCatalog?.heroImageUrl ?? null;

    try {
      const uploaded = await uploadImage(slug);
      uploadedPath = uploaded.path;
      imageUrl = uploaded.imageUrl ?? imageUrl;
    } catch (error) {
      setIsSaving(false);
      setIsError(true);
      setMessage(`No se pudo subir la imagen: ${error instanceof Error ? error.message : "error desconocido"}`);
      return;
    }

    const payload = {
      slug,
      title: form.title.trim(),
      category_name: form.categoryName.trim(),
      description: form.description.trim(),
      hero_image_url: imageUrl,
      suggested_margin_percentage: normalizeMarginPercentage(Number(form.suggestedMarginPercentage)),
      is_active: form.isActive,
      display_order: Number(form.displayOrder)
    };

    const { error } = editingCatalog
      ? await supabase.from("wholesale_catalogs").update(payload).eq("id", editingCatalog.id)
      : await supabase.from("wholesale_catalogs").insert(payload);

    setIsSaving(false);
    if (error) {
      if (uploadedPath) await supabase.storage.from("products").remove([uploadedPath]);
      setIsError(true);
      setMessage(`No se pudo guardar el catalogo: ${error.message}`);
      return;
    }

    if (editingCatalog?.heroImageUrl && selectedImage) {
      const oldPath = parseProductsBucketPath(editingCatalog.heroImageUrl);
      if (oldPath) await supabase.storage.from("products").remove([oldPath]);
    }

    setIsFormOpen(false);
    setEditingCatalog(null);
    setSelectedImage(null);
    setSelectedImagePreview("");
    setMessage(editingCatalog ? "Catalogo actualizado." : "Catalogo creado.");
    await loadCatalogs();
  }

  async function deleteCatalog() {
    if (!supabase || !deletingCatalog) return;
    setIsDeleting(true);
    const { error } = await supabase.from("wholesale_catalogs").delete().eq("id", deletingCatalog.id);
    setIsDeleting(false);
    if (error) {
      setIsError(true);
      setMessage(`No se pudo eliminar el catalogo: ${error.message}`);
      return;
    }
    const imagePath = deletingCatalog.heroImageUrl ? parseProductsBucketPath(deletingCatalog.heroImageUrl) : null;
    if (imagePath) await supabase.storage.from("products").remove([imagePath]);
    setDeletingCatalog(null);
    setIsError(false);
    setMessage("Catalogo eliminado.");
    await loadCatalogs();
  }

  return (
    <section className="mt-6 border border-[#d9dcd3] bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e0e2dc] px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Venta mayorista</p>
          <h2 className="mt-1 font-serif text-3xl font-semibold text-[#1d2d1a]">Catalogos mayoristas</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Crea y administra los catalogos visibles en la seccion mayorista. Define imagen principal y margen sugerido.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex h-10 items-center gap-2 bg-[#20341d] px-4 text-xs font-bold text-white">
          <Plus size={16} /> Nuevo catalogo
        </button>
      </div>

      {message ? (
        <p role="status" className={`border-b border-[#e0e2dc] px-5 py-3 text-sm font-semibold ${isError ? "text-red-700" : "text-[#385133]"}`}>
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-[#f5f4ef] text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Catalogo</th>
              <th className="px-4 py-3">Categoria base</th>
              <th className="px-4 py-3">Margen sugerido</th>
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e6e1]">
            {catalogs.map((catalog) => (
              <tr key={catalog.id} className="hover:bg-[#fafaf7]">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded border border-[#e0e2dc] bg-[#f6f5f0]">
                      {catalog.heroImageUrl ? (
                        <Image src={catalog.heroImageUrl} alt={catalog.title} fill sizes="44px" className="object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <p className="font-bold text-[#1d2d1a]">{catalog.title}</p>
                      <p className="text-xs text-muted">/{catalog.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-muted">{catalog.categoryName}</td>
                <td className="px-4 py-4 font-bold text-[#1d2d1a]">{catalog.suggestedMarginPercentage}%</td>
                <td className="px-4 py-4">{catalog.displayOrder}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${catalog.isActive ? "bg-[#e8eee3] text-[#385133]" : "bg-[#efe9dd] text-[#7c5f2c]"}`}>
                    {catalog.isActive ? "Activo" : "Oculto"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => openEdit(catalog)} className="inline-flex h-9 items-center gap-1.5 border border-[#cfd4c9] px-3 text-xs font-bold hover:border-primary">
                      Editar
                    </button>
                    <button type="button" onClick={() => setDeletingCatalog(catalog)} className="inline-flex h-9 items-center gap-1.5 border border-[#e2caca] px-3 text-xs font-bold text-red-700 hover:bg-red-50">
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isLoading ? <p className="p-6 text-center text-sm font-bold text-muted">Cargando catalogos...</p> : null}

      {isFormOpen ? (
        <div className="border-t border-[#e0e2dc] bg-[#faf9f5] p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-serif text-3xl font-semibold text-[#1d2d1a]">{editingCatalog ? "Editar catalogo" : "Nuevo catalogo"}</h3>
            <button type="button" onClick={() => setIsFormOpen(false)} className="grid h-9 w-9 place-items-center border border-[#d7d9d2]" aria-label="Cerrar formulario">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={saveCatalog} className="grid gap-4 lg:grid-cols-2">
            <AdminField label="Nombre del catalogo">
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="admin-input" />
            </AdminField>
            <AdminField label="Slug">
              <input required value={form.slug} onChange={(event) => setForm({ ...form, slug: slugifyCatalog(event.target.value) })} className="admin-input" />
            </AdminField>
            <AdminField label="Categoria base">
              <select required value={form.categoryName} onChange={(event) => setForm({ ...form, categoryName: event.target.value })} className="admin-input">
                {categoryNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Margen sugerido">
              <select
                value={form.suggestedMarginUseKey}
                onChange={(event) => selectMarginProfile(event.target.value)}
                className="admin-input"
              >
                {activeMarginProfiles.map((profile) => (
                  <option key={profile.id} value={profile.useKey}>
                    {profile.useLabel} ({profile.suggestedMarginPercentage}%)
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-muted">Porcentaje aplicado: {normalizeMarginPercentage(Number(form.suggestedMarginPercentage))}%</p>
            </AdminField>
            <AdminField label="Orden">
              <input required min="1" type="number" value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: event.target.value })} className="admin-input" />
            </AdminField>
            <div className="flex items-center">
              <label className="flex items-center gap-3 border border-[#d7d9d2] bg-white px-4 py-3 text-sm font-bold">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="h-4 w-4 accent-primary" />
                Visible en catalogos
              </label>
            </div>
            <div className="lg:col-span-2">
              <AdminField label="Descripcion">
                <textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="admin-input min-h-24 py-3" />
              </AdminField>
            </div>
            <div className="lg:col-span-2">
              <p className="text-sm font-bold text-[#263324]">Imagen principal</p>
              <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative h-32 w-full max-w-[240px] overflow-hidden border border-dashed border-[#c9cec4] bg-[#f7f6f1]">
                  {selectedImagePreview ? (
                    <Image src={selectedImagePreview} alt="Vista previa del catalogo" fill className="object-cover" unoptimized={selectedImagePreview.startsWith("blob:")} />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-muted">Sin imagen</div>
                  )}
                </div>
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 border border-[#bfc5ba] bg-white px-3 text-xs font-bold text-[#263324] transition hover:border-primary hover:bg-[#f5f7f1]">
                  <PackageCheck size={16} /> Elegir imagen
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectImage} className="sr-only" />
                </label>
              </div>
              <p className="mt-2 text-xs text-muted">PNG, JPG o WebP, hasta 6 MB. Se convierte automaticamente a WebP.</p>
            </div>
            <div className="lg:col-span-2">
              <button type="submit" disabled={isSaving} className="inline-flex h-11 items-center gap-2 bg-[#20341d] px-5 text-sm font-bold text-white disabled:opacity-60">
                <Check size={16} /> {isSaving ? "Guardando..." : "Guardar catalogo"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {deletingCatalog ? (
        <div className="border-t border-[#e0e2dc] bg-[#fff8f8] p-5">
          <p className="text-sm font-semibold text-[#1d2d1a]">
            Confirmar eliminacion de <strong>{deletingCatalog.title}</strong>.
          </p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setDeletingCatalog(null)} className="h-10 border border-[#cfd4c9] px-4 text-sm font-bold">
              Cancelar
            </button>
            <button type="button" disabled={isDeleting} onClick={() => void deleteCatalog()} className="h-10 bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-60">
              {isDeleting ? "Eliminando..." : "Eliminar catalogo"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AdminField({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="block text-sm font-bold text-[#263324]">
      {label}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function parseProductsBucketPath(url: string) {
  const marker = "/storage/v1/object/public/products/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
}

async function convertImageToWebp(file: File): Promise<File> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo inicializar el procesador de imagenes.");
    context.drawImage(image, 0, 0);
    const blob = await canvasToWebpBlob(canvas, 0.9);
    const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "catalogo";
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
