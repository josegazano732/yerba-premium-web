"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, PackageCheck, Plus, Search, Trash2, X } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, FormEvent, useDeferredValue, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AdminBranding } from "@/components/admin/AdminBranding";
import { AdminHeroBanner } from "@/components/admin/AdminHeroBanner";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
};

type AdminProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number | string | null;
  image: string | null;
  image_urls: string[] | null;
  category_id: string | null;
  category_name: string | null;
  stock: number | string | null;
  seasonal: boolean | null;
  cost: number | string | null;
  markup_percentage: number | string | null;
  updated_at: string | null;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  stock: string;
  seasonal: boolean;
  cost: string;
  markupPercentage: string;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  stock: "0",
  seasonal: false,
  cost: "",
  markupPercentage: ""
};

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function ProductAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<AdminProduct | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) void loadCatalog();
  }, [session]);

  async function loadCatalog() {
    if (!supabase) return;
    setLoading(true);
    setMessage("");
    const [productsResult, categoriesResult] = await Promise.all([
      supabase.from("product_details").select("id,name,description,price,image,image_urls,category_id,category_name,stock,seasonal,cost,markup_percentage,updated_at").order("updated_at", { ascending: false }),
      supabase.from("product_categories").select("id,name").eq("is_active", true).order("display_order")
    ]);
    setLoading(false);
    if (productsResult.error || categoriesResult.error) {
      setMessage(productsResult.error?.message ?? categoriesResult.error?.message ?? "No se pudo cargar el catálogo.");
      return;
    }
    setProducts((productsResult.data as AdminProduct[] | null) ?? []);
    setCategories((categoriesResult.data as Category[] | null) ?? []);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setAuthError("No pudimos iniciar sesión. Revisá tus credenciales.");
  }

  function openCreate() {
    setEditingProduct(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setProductImages([]);
    setExistingImages([]);
    setIsFormOpen(true);
  }

  function openEdit(product: AdminProduct) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price ?? ""),
      categoryId: product.category_id ?? categories[0]?.id ?? "",
      stock: String(product.stock ?? 0),
      seasonal: Boolean(product.seasonal),
      cost: String(product.cost ?? ""),
      markupPercentage: String(product.markup_percentage ?? "")
    });
    setProductImages([]);
    setExistingImages(product.image_urls?.length ? product.image_urls : product.image ? [product.image] : []);
    setIsFormOpen(true);
  }

  async function uploadProductImages() {
    if (!supabase || productImages.length === 0) return { urls: existingImages, paths: [] as string[] };

    const group = `${Date.now()}_${form.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
    const paths: string[] = [];
    const urls: string[] = [];

    for (const [index, image] of productImages.entries()) {
      const extension = image.name.split(".").pop()?.toLowerCase() || "webp";
      const path = `${group}_${index + 1}.${extension}`;
      const { error } = await supabase.storage.from("products").upload(path, image, { contentType: image.type, upsert: false });
      if (error) {
        if (paths.length > 0) await supabase.storage.from("products").remove(paths);
        throw error;
      }
      paths.push(path);
      urls.push(supabase.storage.from("products").getPublicUrl(path).data.publicUrl);
    }

    return { urls, paths };
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setMessage("");
    if (!editingProduct && productImages.length === 0) {
      setSaving(false);
      setMessage("Seleccioná al menos una foto del producto.");
      return;
    }

    let uploadedPaths: string[] = [];
    let imageUrls = existingImages;
    try {
      const uploaded = await uploadProductImages();
      uploadedPaths = uploaded.paths;
      imageUrls = uploaded.urls;
    } catch (error) {
      setSaving(false);
      setMessage(`No se pudieron cargar las imágenes: ${error instanceof Error ? error.message : "error desconocido"}`);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      image: imageUrls[0],
      category_id: form.categoryId,
      stock: Number(form.stock),
      seasonal: form.seasonal,
      cost: form.cost ? Number(form.cost) : null,
      markup_percentage: form.markupPercentage ? Number(form.markupPercentage) : null
    };
    const result = editingProduct
      ? await supabase.from("products").update(payload).eq("id", editingProduct.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (result.error) {
      if (uploadedPaths.length > 0) await supabase.storage.from("products").remove(uploadedPaths);
      setMessage(`No se pudo guardar: ${result.error.message}`);
      return;
    }
    setIsFormOpen(false);
    setMessage(editingProduct ? "Producto actualizado." : "Producto creado.");
    await loadCatalog();
  }

  async function deleteProduct() {
    if (!supabase || !deletingProduct) return;
    setSaving(true);
    const { error } = await supabase.from("products").delete().eq("id", deletingProduct.id);
    setSaving(false);
    if (error) {
      setMessage(`No se pudo eliminar: ${error.message}`);
      setDeletingProduct(null);
      return;
    }
    setDeletingProduct(null);
    setMessage("Producto eliminado.");
    await loadCatalog();
  }

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.category_name ?? ""}`.toLowerCase().includes(deferredQuery)
  );

  if (checkingSession) {
    return <main className="grid min-h-[70vh] place-items-center bg-[#f3f1ea]"><p className="text-sm font-bold text-muted">Verificando acceso...</p></main>;
  }

  if (!session) {
    return (
      <main className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#eef0e8] px-4 py-16">
        <section className="w-full max-w-md border border-[#d8dbd0] bg-white p-7 shadow-[0_24px_70px_rgba(23,41,21,0.1)] sm:p-9">
          <div className="grid h-12 w-12 place-items-center rounded bg-[#20341d] text-white"><PackageCheck size={24} /></div>
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Administración</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-[#172116]">Acceso al catálogo</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Ingresá con un usuario autorizado en Supabase.</p>
          <form onSubmit={signIn} className="mt-7 space-y-4">
            <label className="block text-sm font-bold">Correo<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full border border-[#cfd4c9] px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
            <label className="block text-sm font-bold">Contraseña<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full border border-[#cfd4c9] px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
            {authError ? <p role="alert" className="text-sm font-semibold text-red-700">{authError}</p> : null}
            <button type="submit" disabled={loading} className="h-12 w-full bg-[#20341d] text-sm font-bold text-white transition hover:bg-primary disabled:opacity-60">{loading ? "Ingresando..." : "Ingresar"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f1ea] pb-20">
      <header className="border-b border-[#d7dbd1] bg-[#1d2d1a] text-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-7 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b9d282]">Panel de administración</p><h1 className="mt-1 font-serif text-4xl font-semibold">Productos</h1><p className="mt-1 text-xs text-white/60">{session.user.email}</p></div>
          <div className="flex flex-wrap gap-3"><button type="button" onClick={openCreate} className="inline-flex h-11 items-center gap-2 bg-[#d7e68c] px-5 text-sm font-extrabold text-[#172116]"><Plus size={18} /> Nuevo producto</button><button type="button" onClick={() => supabase?.auth.signOut()} className="h-11 border border-white/25 px-5 text-sm font-bold hover:bg-white/10">Cerrar sesión</button></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 pt-7 sm:px-7">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border border-[#d9dcd3] bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Productos</p><p className="mt-2 font-serif text-4xl font-semibold">{products.length}</p></div>
          <div className="border border-[#d9dcd3] bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Con stock</p><p className="mt-2 font-serif text-4xl font-semibold">{products.filter((product) => Number(product.stock) > 0).length}</p></div>
          <div className="border border-[#d9dcd3] bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted">Categorías</p><p className="mt-2 font-serif text-4xl font-semibold">{categories.length}</p></div>
        </div>

        <AdminBranding />

        <AdminHeroBanner />

        <section className="mt-6 border border-[#d9dcd3] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#e0e2dc] p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative w-full sm:max-w-sm"><span className="sr-only">Buscar productos</span><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto o categoría" className="h-11 w-full border border-[#cfd4c9] pl-10 pr-4 text-sm outline-none focus:border-primary" /></label>
            <button type="button" onClick={() => void loadCatalog()} className="h-11 border border-[#cfd4c9] px-4 text-sm font-bold hover:bg-[#f3f1ea]">Actualizar listado</button>
          </div>
          {message ? <p role="status" className="border-b border-[#e0e2dc] bg-[#f5f7f1] px-4 py-3 text-sm font-semibold text-[#385133]">{message}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <thead className="bg-[#f5f4ef] text-xs uppercase tracking-wider text-muted"><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Precio</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
              <tbody className="divide-y divide-[#e5e6e1]">
                {filteredProducts.map((product) => <tr key={product.id} className="hover:bg-[#fafaf7]"><td className="max-w-sm px-4 py-4 font-bold text-[#1d2d1a]">{product.name}</td><td className="px-4 py-4 text-muted">{product.category_name ?? "Sin categoría"}</td><td className="px-4 py-4 font-bold">{currency.format(Number(product.price ?? 0))}</td><td className="px-4 py-4"><span className={Number(product.stock) > 0 ? "text-[#385133]" : "font-bold text-red-700"}>{Number(product.stock ?? 0)}</span></td><td className="px-4 py-4"><span className="inline-flex rounded-full bg-[#e8eee3] px-2.5 py-1 text-xs font-bold text-[#385133]">{product.seasonal ? "Temporada" : "Activo"}</span></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEdit(product)} className="h-9 border border-[#cfd4c9] px-3 text-xs font-bold hover:border-primary">Editar</button><button type="button" onClick={() => setDeletingProduct(product)} className="grid h-9 w-9 place-items-center border border-[#e2caca] text-red-700 hover:bg-red-50" aria-label={`Eliminar ${product.name}`}><Trash2 size={16} /></button></div></td></tr>)}
              </tbody>
            </table>
          </div>
          {loading ? <p className="p-8 text-center text-sm font-bold text-muted">Cargando productos...</p> : null}
          {!loading && filteredProducts.length === 0 ? <p className="p-10 text-center text-sm text-muted">No hay productos que coincidan con la búsqueda.</p> : null}
        </section>
      </div>

      <AnimatePresence>
        {isFormOpen ? <><motion.button type="button" aria-label="Cerrar formulario" onClick={() => setIsFormOpen(false)} className="fixed inset-0 z-[60] cursor-default bg-[#11180f]/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside role="dialog" aria-modal="true" aria-label={editingProduct ? "Editar producto" : "Crear producto"} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 250 }} className="fixed inset-y-0 right-0 z-[70] w-full max-w-xl overflow-y-auto bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#dedfd9] px-5 py-5 sm:px-7"><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Catálogo</p><h2 className="font-serif text-3xl font-semibold">{editingProduct ? "Editar producto" : "Nuevo producto"}</h2></div><button type="button" onClick={() => setIsFormOpen(false)} className="grid h-10 w-10 place-items-center border border-[#d7d9d2]" aria-label="Cerrar"><X size={18} /></button></div><form onSubmit={saveProduct} className="space-y-5 p-5 sm:p-7"><AdminField label="Nombre"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="admin-input" /></AdminField><AdminField label="Descripción"><textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="admin-input min-h-28 py-3" /></AdminField><div className="grid gap-4 sm:grid-cols-2"><AdminField label="Precio"><input required min="0" step="0.01" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="admin-input" /></AdminField><AdminField label="Stock"><input required min="0" step="0.01" type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} className="admin-input" /></AdminField></div><AdminField label="Categoría"><select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="admin-input">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></AdminField><ProductImagePicker files={productImages} existingImages={existingImages} onChange={setProductImages} /><div className="grid gap-4 sm:grid-cols-2"><AdminField label="Costo (opcional)"><input min="0" step="0.01" type="number" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} className="admin-input" /></AdminField><AdminField label="Margen % (opcional)"><input step="0.01" type="number" value={form.markupPercentage} onChange={(event) => setForm({ ...form, markupPercentage: event.target.value })} className="admin-input" /></AdminField></div><label className="flex items-center gap-3 border border-[#d7d9d2] p-4 text-sm font-bold"><input type="checkbox" checked={form.seasonal} onChange={(event) => setForm({ ...form, seasonal: event.target.checked })} className="h-4 w-4 accent-primary" /> Producto de temporada</label>{message ? <p className="text-sm font-semibold text-red-700">{message}</p> : null}<button type="submit" disabled={saving} className="flex h-12 w-full items-center justify-center gap-2 bg-[#20341d] text-sm font-bold text-white disabled:opacity-60"><Check size={18} /> {saving ? "Guardando..." : "Guardar producto"}</button></form></motion.aside></> : null}
      </AnimatePresence>

      <AnimatePresence>
        {deletingProduct ? <><motion.button type="button" aria-label="Cancelar eliminación" onClick={() => setDeletingProduct(null)} className="fixed inset-0 z-[80] cursor-default bg-[#11180f]/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.div role="alertdialog" aria-modal="true" aria-label="Confirmar eliminación" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed left-1/2 top-1/2 z-[90] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 bg-white p-7 shadow-2xl"><h2 className="font-serif text-3xl font-semibold">Eliminar producto</h2><p className="mt-3 text-sm leading-6 text-muted">Esta acción eliminará <strong className="text-text">{deletingProduct.name}</strong> de forma permanente.</p><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setDeletingProduct(null)} className="h-11 border border-[#cfd4c9] px-4 text-sm font-bold">Cancelar</button><button type="button" disabled={saving} onClick={() => void deleteProduct()} className="h-11 bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-60">{saving ? "Eliminando..." : "Eliminar"}</button></div></motion.div></> : null}
      </AnimatePresence>
    </main>
  );
}

function AdminField({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <label className="block text-sm font-bold text-[#263324]">{label}<span className="mt-2 block">{children}</span></label>;
}

function ProductImagePicker({ files, existingImages, onChange }: Readonly<{ files: File[]; existingImages: string[]; onChange: (files: File[]) => void }>) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const nextPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews(nextPreviews);
    return () => nextPreviews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [files]);

  function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setError("");
    if (selected.length === 0) return;
    if (files.length + selected.length > 3) {
      setError("Podés cargar hasta 3 fotos por producto.");
      event.target.value = "";
      return;
    }
    if (selected.some((file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type))) {
      setError("Usá fotos PNG, JPG o WebP.");
      event.target.value = "";
      return;
    }
    if (selected.some((file) => file.size > 5 * 1024 * 1024)) {
      setError("Cada foto debe pesar menos de 5 MB.");
      event.target.value = "";
      return;
    }
    onChange([...files, ...selected]);
    event.target.value = "";
  }

  const images = previews.length > 0 ? previews : existingImages;

  return (
    <fieldset>
      <legend className="text-sm font-bold text-[#263324]">Fotos del producto</legend>
      <div className="mt-2 grid grid-cols-3 gap-3">
        {images.map((image, index) => (
          <div key={image} className="relative aspect-square overflow-hidden border border-[#d7d9d2] bg-[#f5f4ef]">
            <Image src={image} alt={`Foto ${index + 1} del producto`} fill unoptimized={image.startsWith("blob:")} className="object-cover" />
            {previews.length > 0 ? <button type="button" onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))} className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center bg-white text-red-700 shadow" aria-label={`Quitar foto ${index + 1}`}><X size={15} /></button> : null}
            {index === 0 ? <span className="absolute bottom-1.5 left-1.5 bg-[#20341d] px-2 py-1 text-[10px] font-bold uppercase text-white">Principal</span> : null}
          </div>
        ))}
        {files.length < 3 ? <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-[#aeb5aa] bg-[#fafaf7] text-center text-xs font-bold text-[#385133] hover:border-primary"><Plus size={22} /> Adjuntar fotos<input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={selectImages} className="sr-only" /></label> : null}
      </div>
      <p className="mt-2 text-xs text-muted">De 1 a 3 fotos. PNG, JPG o WebP, hasta 5 MB cada una. La primera será la portada.</p>
      {error ? <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </fieldset>
  );
}