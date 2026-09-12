"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PackageCheck, Plus, Search, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useDeferredValue, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { COMBO_ENABLED_KEY, comboMetrics } from "@/lib/combos";

type ComboRow = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number | string | null;
  active: boolean;
  sort_order: number | null;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string | null;
};

type ComboItemRow = {
  id: string;
  combo_id: string;
  product_id: string;
  quantity: number;
};

type ProductOption = {
  id: string;
  name: string;
  price: number | string | null;
  stock: number | string | null;
  image: string | null;
};

type FormItem = {
  productId: string;
  quantity: string;
  query: string;
};

type ComboForm = {
  name: string;
  description: string;
  price: string;
  active: boolean;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
  items: FormItem[];
};

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const emptyForm: ComboForm = {
  name: "",
  description: "",
  price: "",
  active: true,
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
  items: [{ productId: "", quantity: "1", query: "" }]
};

const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

export function CombosAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [combos, setCombos] = useState<ComboRow[]>([]);
  const [comboItems, setComboItems] = useState<ComboItemRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [combosEnabled, setCombosEnabled] = useState(true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);
  const [message, setMessage] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboRow | null>(null);
  const [deletingCombo, setDeletingCombo] = useState<ComboRow | null>(null);
  const [form, setForm] = useState<ComboForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [query, setQuery] = useState("");
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
    if (session) void loadCombos();
  }, [session]);

  async function loadCombos() {
    if (!supabase) return;
    setLoading(true);
    setMessage("");

    const [combosResult, itemsResult, productsResult, settingResult] = await Promise.all([
      supabase.from("combos").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
      supabase.from("combo_items").select("id,combo_id,product_id,quantity"),
      supabase.from("products").select("id,name,price,stock,image").order("name", { ascending: true }),
      supabase.from("site_settings").select("value").eq("key", COMBO_ENABLED_KEY).maybeSingle()
    ]);

    setLoading(false);

    if (combosResult.error || itemsResult.error || productsResult.error) {
      setMessage(combosResult.error?.message ?? itemsResult.error?.message ?? productsResult.error?.message ?? "No se pudo cargar la información.");
      return;
    }

    setCombos((combosResult.data as ComboRow[] | null) ?? []);
    setComboItems((itemsResult.data as ComboItemRow[] | null) ?? []);
    setProducts((productsResult.data as ProductOption[] | null) ?? []);

    if (!settingResult.error && settingResult.data) {
      setCombosEnabled(String(settingResult.data.value).trim().toLowerCase() === "true");
    } else if (settingResult.error) {
      setCombosEnabled(true);
    }
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

  async function toggleCombosEnabled() {
    if (!supabase) return;
    setSavingSetting(true);
    setMessage("");
    const nextValue = combosEnabled ? "false" : "true";
    const { error } = await supabase.from("site_settings").upsert(
      { key: COMBO_ENABLED_KEY, value: nextValue },
      { onConflict: "key" }
    );
    setSavingSetting(false);
    if (error) {
      setMessage(`No se pudo actualizar la configuración: ${error.message}`);
      return;
    }
    setCombosEnabled(!combosEnabled);
    setMessage(!combosEnabled ? "Sección Combos habilitada." : "Sección Combos ocultada.");
  }

  function openCreate() {
    setEditingCombo(null);
    setForm({ ...emptyForm, items: [{ productId: "", quantity: "1", query: "" }] });
    setImageFile(null);
    setImagePreview("");
    setMessage("");
    setIsFormOpen(true);
  }

  function openEdit(combo: ComboRow) {
    setEditingCombo(combo);
    const items = comboItems
      .filter((item) => item.combo_id === combo.id)
      .map((item) => {
        const product = products.find((candidate) => candidate.id === item.product_id);
        return { productId: item.product_id, quantity: String(item.quantity), query: product?.name ?? "" };
      });
    setForm({
      name: combo.name,
      description: combo.description ?? "",
      price: String(combo.price ?? ""),
      active: combo.active,
      sortOrder: String(combo.sort_order ?? 0),
      startsAt: combo.starts_at ? combo.starts_at.slice(0, 10) : "",
      endsAt: combo.ends_at ? combo.ends_at.slice(0, 10) : "",
      items: items.length > 0 ? items : [{ productId: "", quantity: "1", query: "" }]
    });
    setImageFile(null);
    setImagePreview(combo.image ?? "");
    setMessage("");
    setIsFormOpen(true);
  }

  function updateItem(index: number, patch: Partial<FormItem>) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  }

  function addItemRow() {
    setForm((current) => ({ ...current, items: [...current.items, { productId: "", quantity: "1", query: "" }] }));
  }

  function removeItemRow(index: number) {
    setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function uploadImage(): Promise<string | null> {
    if (!supabase || !imageFile) return editingCombo?.image ?? null;

    const converted = await convertImageToWebp(imageFile);
    const slug = form.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "combo";
    const path = `combos/${slug}-${Date.now()}.webp`;
    const { error } = await supabase.storage.from("products").upload(path, converted, {
      cacheControl: "0",
      contentType: "image/webp",
      upsert: false
    });
    if (error) throw error;
    return supabase.storage.from("products").getPublicUrl(path).data.publicUrl;
  }

  async function saveCombo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setMessage("");

    if (!form.name.trim()) {
      setSaving(false);
      setMessage("Ingresá un nombre para el combo.");
      return;
    }

    const validItems = form.items.filter((item) => item.productId && Number(item.quantity) > 0);
    if (validItems.length === 0) {
      setSaving(false);
      setMessage("Agregá al menos un producto al combo.");
      return;
    }

    let image = editingCombo?.image ?? null;
    if (imageFile) {
      try {
        image = await uploadImage();
      } catch (error) {
        setSaving(false);
        setMessage(`No se pudo cargar la imagen: ${error instanceof Error ? error.message : "error desconocido"}`);
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price) || 0,
      image,
      active: form.active,
      sort_order: Number(form.sortOrder) || 0,
      starts_at: form.startsAt ? `${form.startsAt}T00:00:00` : null,
      ends_at: form.endsAt ? `${form.endsAt}T23:59:59` : null
    };

    let comboId = editingCombo?.id;
    if (editingCombo) {
      const { error } = await supabase.from("combos").update(payload).eq("id", editingCombo.id);
      if (error) {
        setSaving(false);
        setMessage(`No se pudo guardar: ${error.message}`);
        return;
      }
    } else {
      const { data, error } = await supabase.from("combos").insert(payload).select("id").single();
      if (error || !data) {
        setSaving(false);
        setMessage(`No se pudo guardar: ${error?.message ?? "sin respuesta"}`);
        return;
      }
      comboId = String(data.id);
    }

    if (!comboId) {
      setSaving(false);
      setMessage("No se pudo determinar el combo a guardar.");
      return;
    }

    const { error: deleteError } = await supabase.from("combo_items").delete().eq("combo_id", comboId);
    if (deleteError) {
      setSaving(false);
      setMessage(`No se pudieron actualizar los productos: ${deleteError.message}`);
      return;
    }

    const { error: insertError } = await supabase.from("combo_items").insert(
      validItems.map((item) => ({
        combo_id: comboId,
        product_id: item.productId,
        quantity: Number(item.quantity)
      }))
    );
    if (insertError) {
      setSaving(false);
      setMessage(`No se pudieron guardar los productos del combo: ${insertError.message}`);
      return;
    }

    setSaving(false);
    setIsFormOpen(false);
    setMessage(editingCombo ? "Combo actualizado." : "Combo creado.");
    await loadCombos();
  }

  async function toggleComboActive(combo: ComboRow) {
    if (!supabase) return;
    setMessage("");
    const { error } = await supabase.from("combos").update({ active: !combo.active }).eq("id", combo.id);
    if (error) {
      setMessage(`No se pudo actualizar: ${error.message}`);
      return;
    }
    setMessage(combo.active ? "Combo desactivado." : "Combo activado.");
    await loadCombos();
  }

  async function deleteCombo() {
    if (!supabase || !deletingCombo) return;
    setSaving(true);
    const { error } = await supabase.from("combos").delete().eq("id", deletingCombo.id);
    setSaving(false);
    if (error) {
      setMessage(`No se pudo eliminar: ${error.message}`);
      setDeletingCombo(null);
      return;
    }
    setDeletingCombo(null);
    setMessage("Combo eliminado.");
    await loadCombos();
  }

  function selectImage(file: File | null) {
    if (!file) {
      setImageFile(null);
      setImagePreview(editingCombo?.image ?? "");
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      setMessage("Formato de imagen no soportado. Usá PNG, JPG o WebP.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  const filteredCombos = combos.filter((combo) =>
    `${combo.name} ${combo.description ?? ""}`.toLowerCase().includes(deferredQuery)
  );

  const productById = new Map(products.map((product) => [product.id, product]));
  const itemsByCombo = new Map<string, ComboItemRow[]>();
  for (const item of comboItems) {
    const list = itemsByCombo.get(item.combo_id) ?? [];
    list.push(item);
    itemsByCombo.set(item.combo_id, list);
  }

  if (checkingSession) {
    return <main className="grid min-h-[70vh] place-items-center bg-[#f3f1ea]"><p className="text-sm font-bold text-muted">Verificando acceso...</p></main>;
  }

  if (!session) {
    return (
      <main className="grid min-h-[calc(100vh-5rem)] place-items-center bg-[#eef0e8] px-4 py-16">
        <section className="w-full max-w-md border border-[#d8dbd0] bg-white p-7 shadow-[0_24px_70px_rgba(23,41,21,0.1)] sm:p-9">
          <div className="grid h-12 w-12 place-items-center rounded bg-[#20341d] text-white"><PackageCheck size={24} /></div>
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Administración</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-[#172116]">Acceso a combos</h1>
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
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b9d282]">Panel de administración</p><h1 className="mt-1 font-serif text-4xl font-semibold">Combos</h1><p className="mt-1 text-xs text-white/60">{session.user.email}</p></div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={openCreate} className="inline-flex h-11 items-center gap-2 bg-[#d7e68c] px-5 text-sm font-extrabold text-[#172116]"><Plus size={18} /> Nuevo combo</button>
            <Link href="/admin/productos" className="inline-flex h-11 items-center border border-white/25 px-5 text-sm font-bold transition hover:bg-white/10">Productos</Link>
            <Link href="/admin/ordenes" className="inline-flex h-11 items-center border border-white/25 px-5 text-sm font-bold transition hover:bg-white/10">Órdenes</Link>
            <button type="button" onClick={() => supabase?.auth.signOut()} className="h-11 border border-white/25 px-5 text-sm font-bold hover:bg-white/10">Cerrar sesión</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 pt-7 sm:px-7">
        <section className="border border-[#d9dcd3] bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#20341d]">Mostrar sección Combos</h2>
              <p className="mt-1 text-sm text-muted">Controla si la sección pública de combos aparece en la tienda.</p>
            </div>
            <button
              type="button"
              onClick={toggleCombosEnabled}
              disabled={savingSetting}
              className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full transition disabled:opacity-60 ${combosEnabled ? "bg-[#4c6f23]" : "bg-[#b8b2a8]"}`}
              aria-pressed={combosEnabled}
            >
              <span className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition ${combosEnabled ? "translate-x-8" : "translate-x-1"}`} />
              <span className="sr-only">{combosEnabled ? "Desactivar sección" : "Activar sección"}</span>
            </button>
          </div>
          <p className="mt-3 text-xs font-semibold text-muted">Estado actual: {combosEnabled ? "ON (visible)" : "OFF (oculta)"}</p>
        </section>

        {message ? <p role="status" className="mt-4 text-sm font-semibold text-[#20341d]">{message}</p> : null}

        <section className="mt-6 border border-[#d9dcd3] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#e0e2dc] p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative w-full sm:max-w-sm"><span className="sr-only">Buscar combos</span><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar combo" className="h-11 w-full border border-[#cfd4c9] pl-10 pr-4 text-sm outline-none focus:border-primary" /></label>
            <button type="button" onClick={() => void loadCombos()} className="h-11 border border-[#cfd4c9] px-4 text-sm font-bold hover:bg-[#f3f1ea]">Actualizar listado</button>
          </div>

          {loading ? (
            <div className="grid place-items-center p-16"><p className="text-sm font-bold text-muted">Cargando combos...</p></div>
          ) : filteredCombos.length === 0 ? (
            <div className="grid place-items-center p-16 text-center">
              <div>
                <p className="font-serif text-2xl font-semibold text-[#20341d]">No hay combos cargados</p>
                <p className="mt-2 text-sm text-muted">Creá tu primer combo para empezar a vender packs con ahorro.</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-[#e0e2dc]">
              {filteredCombos.map((combo) => {
                const items = itemsByCombo.get(combo.id) ?? [];
                const regularPrice = items.reduce((sum, item) => {
                  const product = productById.get(item.product_id);
                  return sum + Number(product?.price ?? 0) * item.quantity;
                }, 0);
                const price = Number(combo.price ?? 0);
                const { savings, savingsPercent } = comboMetrics(price, regularPrice);
                return (
                  <li key={combo.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-secondary/30">
                      {combo.image ? <Image src={combo.image} alt={combo.name} fill sizes="80px" className="object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-lg font-semibold text-[#20341d]">{combo.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${combo.active ? "bg-[#e5f0d5] text-[#4c6f23]" : "bg-[#ece7de] text-muted"}`}>{combo.active ? "Activo" : "Inactivo"}</span>
                        {savings > 0 ? <span className="rounded-full bg-[#d7e68c] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#20341d]">Ahorro {savingsPercent}%</span> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted">{items.length} productos · orden {combo.sort_order ?? 0}</p>
                      <p className="mt-1 text-sm">
                        <span className="font-bold text-[#4c6f23]">{currency.format(price)}</span>
                        {regularPrice > price ? <span className="ml-2 text-xs text-muted line-through">{currency.format(regularPrice)}</span> : null}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => toggleComboActive(combo)} className="h-10 border border-[#cfd4c9] px-4 text-sm font-bold hover:bg-[#f3f1ea]">{combo.active ? "Desactivar" : "Activar"}</button>
                      <button type="button" onClick={() => openEdit(combo)} className="h-10 border border-[#cfd4c9] px-4 text-sm font-bold hover:bg-[#f3f1ea]">Editar</button>
                      <button type="button" onClick={() => setDeletingCombo(combo)} className="h-10 border border-[#cfd4c9] px-4 text-sm font-bold text-red-700 hover:bg-red-50"><Trash2 size={16} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <AnimatePresence>
        {isFormOpen ? (
          <>
            <motion.button type="button" aria-label="Cerrar formulario" onClick={() => setIsFormOpen(false)} className="fixed inset-0 z-[120] cursor-default bg-[#11180f]/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="fixed inset-0 z-[130] overflow-y-auto p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mx-auto my-8 w-full max-w-3xl border border-[#d8dbd0] bg-white shadow-[0_24px_70px_rgba(23,41,21,0.16)]">
                <div className="flex items-center justify-between border-b border-[#e0e2dc] p-5">
                  <h2 className="font-serif text-2xl font-semibold text-[#20341d]">{editingCombo ? "Editar combo" : "Nuevo combo"}</h2>
                  <button type="button" onClick={() => setIsFormOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-[#d7d2c7] transition hover:border-primary" aria-label="Cerrar"><X size={18} /></button>
                </div>

                <form onSubmit={saveCombo} className="space-y-6 p-5 sm:p-7">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block text-sm font-bold sm:col-span-2">Nombre del combo
                      <input type="text" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 h-12 w-full border border-[#cfd4c9] px-4 text-sm font-normal outline-none focus:border-primary" />
                    </label>
                    <label className="block text-sm font-bold sm:col-span-2">Descripción
                      <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} className="mt-2 w-full border border-[#cfd4c9] px-4 py-3 text-sm font-normal outline-none focus:border-primary" />
                    </label>
                    <label className="block text-sm font-bold">Precio especial del combo
                      <input type="number" min="0" step="0.01" required value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-2 h-12 w-full border border-[#cfd4c9] px-4 text-sm font-normal outline-none focus:border-primary" />
                    </label>
                    <label className="block text-sm font-bold">Orden de visualización
                      <input type="number" step="1" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} className="mt-2 h-12 w-full border border-[#cfd4c9] px-4 text-sm font-normal outline-none focus:border-primary" />
                    </label>
                    <label className="block text-sm font-bold">Inicio de promoción (opcional)
                      <input type="date" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="mt-2 h-12 w-full border border-[#cfd4c9] px-4 text-sm font-normal outline-none focus:border-primary" />
                    </label>
                    <label className="block text-sm font-bold">Fin de promoción (opcional)
                      <input type="date" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="mt-2 h-12 w-full border border-[#cfd4c9] px-4 text-sm font-normal outline-none focus:border-primary" />
                    </label>
                  </div>

                  <div>
                    <p className="text-sm font-bold">Imagen</p>
                    <div className="mt-2 flex items-start gap-4">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded bg-secondary/30">
                        {imagePreview ? <Image src={imagePreview} alt="Vista previa" fill sizes="96px" className="object-cover" /> : null}
                      </div>
                      <label className="block flex-1">
                        <span className="text-xs text-muted">PNG, JPG o WebP. Se convierte automáticamente a WebP.</span>
                        <input type="file" accept={allowedTypes.join(",")} onChange={(event) => selectImage(event.target.files?.[0] ?? null)} className="mt-2 block text-sm" />
                      </label>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">Productos del combo</p>
                      <button type="button" onClick={addItemRow} className="inline-flex h-9 items-center gap-1.5 border border-[#cfd4c9] px-3 text-xs font-bold hover:bg-[#f3f1ea]"><Plus size={14} /> Agregar producto</button>
                    </div>
                    <div className="mt-3 space-y-3">
                      {form.items.map((item, index) => {
                        const selected = productById.get(item.productId);
                        const lineTotal = selected ? Number(selected.price ?? 0) * Number(item.quantity || 0) : 0;
                        return (
                          <div key={index} className="rounded border border-[#e0e2dc] bg-[#faf9f5] p-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <div className="min-w-0 flex-1">
                                <label className="block text-xs font-bold text-muted">Producto</label>
                                <div className="relative mt-1">
                                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                  <input
                                    type="text"
                                    value={item.query}
                                    onFocus={(event) => event.target.select()}
                                    onChange={(event) => {
                                      updateItem(index, { query: event.target.value, productId: "" });
                                    }}
                                    placeholder="Buscar producto"
                                    className="h-11 w-full border border-[#cfd4c9] pl-9 pr-4 text-sm outline-none focus:border-primary"
                                  />
                                </div>
                                {!item.productId && item.query.trim() ? (
                                  <ul className="mt-1 max-h-44 overflow-y-auto border border-[#e0e2dc] bg-white">
                                    {products
                                      .filter((product) => product.name.toLowerCase().includes(item.query.trim().toLowerCase()))
                                      .slice(0, 8)
                                      .map((product) => (
                                        <li key={product.id}>
                                          <button type="button" onClick={() => updateItem(index, { productId: product.id, query: product.name })} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#f3f1ea]">
                                            <span className="min-w-0 flex-1 truncate">{product.name}</span>
                                            <span className="text-xs text-muted">{currency.format(Number(product.price ?? 0))}</span>
                                          </button>
                                        </li>
                                      ))}
                                  </ul>
                                ) : null}
                              </div>
                              <div className="w-28">
                                <label className="block text-xs font-bold text-muted">Cantidad</label>
                                <input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} className="mt-1 h-11 w-full border border-[#cfd4c9] px-3 text-sm outline-none focus:border-primary" />
                              </div>
                              <div className="flex items-end gap-2">
                                <span className="mb-0.5 text-xs font-semibold text-[#20341d]">{currency.format(lineTotal)}</span>
                                <button type="button" onClick={() => removeItemRow(index)} className="grid h-11 w-11 place-items-center border border-[#cfd4c9] text-red-700 hover:bg-red-50" aria-label="Quitar producto"><X size={16} /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {form.items.length > 0 ? (
                      <p className="mt-3 text-xs text-muted">
                        Precio de referencia: {currency.format(form.items.reduce((sum, item) => sum + Number(productById.get(item.productId)?.price ?? 0) * Number(item.quantity || 0), 0))}
                      </p>
                    ) : null}
                  </div>

                  <label className="flex items-center gap-3 text-sm font-bold">
                    <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-5 w-5 accent-[#4c6f23]" />
                    Combo activo
                  </label>

                  <div className="flex justify-end gap-3 border-t border-[#e0e2dc] pt-5">
                    <button type="button" onClick={() => setIsFormOpen(false)} className="h-11 border border-[#cfd4c9] px-5 text-sm font-bold hover:bg-[#f3f1ea]">Cancelar</button>
                    <button type="submit" disabled={saving} className="h-11 bg-[#20341d] px-6 text-sm font-bold text-white transition hover:bg-primary disabled:opacity-60">{saving ? "Guardando..." : "Guardar combo"}</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deletingCombo ? (
          <>
            <motion.button type="button" aria-label="Cerrar confirmación" onClick={() => setDeletingCombo(null)} className="fixed inset-0 z-[140] cursor-default bg-[#11180f]/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="fixed inset-0 z-[150] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="w-full max-w-md border border-[#d8dbd0] bg-white p-7 shadow-[0_24px_70px_rgba(23,41,21,0.16)]">
                <h2 className="font-serif text-2xl font-semibold text-[#20341d]">Eliminar combo</h2>
                <p className="mt-2 text-sm text-muted">¿Seguro que querés eliminar <strong className="text-[#20341d]">{deletingCombo.name}</strong>? Las ventas históricas no se verán afectadas.</p>
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setDeletingCombo(null)} className="h-11 border border-[#cfd4c9] px-5 text-sm font-bold hover:bg-[#f3f1ea]">Cancelar</button>
                  <button type="button" onClick={deleteCombo} disabled={saving} className="h-11 bg-red-700 px-6 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-60">{saving ? "Eliminando..." : "Eliminar"}</button>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </main>
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
    if (!context) throw new Error("No se pudo inicializar el procesador de imagenes.");
    context.drawImage(image, 0, 0);
    const blob = await canvasToWebpBlob(canvas, 0.9);
    const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "combo";
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
