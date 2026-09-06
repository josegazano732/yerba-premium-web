"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_MARGIN_PROFILES, normalizeMarginPercentage, slugifyCatalog, type WholesaleMarginProfile } from "@/lib/wholesale";

type ProductCategory = {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean | null;
  display_order: number | null;
};

type ProductSubcategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  is_active: boolean | null;
  display_order: number | null;
};

type AdminParametersProps = {
  onCategoriesChanged?: () => Promise<void> | void;
};

export function AdminParameters({ onCategoriesChanged }: Readonly<AdminParametersProps>) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ProductSubcategory[]>([]);
  const [marginProfiles, setMarginProfiles] = useState<WholesaleMarginProfile[]>(DEFAULT_MARGIN_PROFILES);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDisplayOrder, setCategoryDisplayOrder] = useState("1");
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryDisplayOrder, setSubcategoryDisplayOrder] = useState("1");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingSubcategory, setIsSavingSubcategory] = useState(false);
  const [isSavingMargins, setIsSavingMargins] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    void loadParameters();
  }, []);

  async function loadParameters(preferredSubcategoryCategoryId = "") {
    if (!supabase) return;
    setIsLoading(true);
    setMessage("");

    const [categoriesResult, subcategoriesResult, marginsResult] = await Promise.all([
      supabase
        .from("product_categories")
        .select("id,name,slug,is_active,display_order")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("product_subcategories")
        .select("id,category_id,name,slug,is_active,display_order")
        .order("category_id", { ascending: true })
        .order("display_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("wholesale_margin_profiles")
        .select("id,use_key,use_label,suggested_margin_percentage,is_active,display_order")
        .order("display_order", { ascending: true })
    ]);

    setIsLoading(false);

    if (categoriesResult.error || subcategoriesResult.error || marginsResult.error) {
      setIsError(true);
      setMessage("No pudimos cargar los parametros. Verifica las migraciones de base de datos.");
      return;
    }

    const nextCategories = (categoriesResult.data as ProductCategory[] | null) ?? [];
    const nextSubcategories = (subcategoriesResult.data as ProductSubcategory[] | null) ?? [];
    setCategories(nextCategories);
    setSubcategories(nextSubcategories);
    setCategoryDisplayOrder(String(nextCategories.length + 1));
    const selectedCategoryId = preferredSubcategoryCategoryId || nextCategories[0]?.id || "";
    setSubcategoryCategoryId(selectedCategoryId);
    setSubcategoryDisplayOrder(String(nextSubcategories.filter((subcategory) => subcategory.category_id === selectedCategoryId).length + 1));

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

    setMarginProfiles(mappedMargins.length > 0 ? mappedMargins : DEFAULT_MARGIN_PROFILES);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setIsSavingCategory(true);
    setMessage("");
    setIsError(false);

    const name = categoryName.trim();
    if (!name) {
      setIsSavingCategory(false);
      setIsError(true);
      setMessage("Ingresa un nombre de categoria valido.");
      return;
    }
    const slug = slugifyCatalog(name);
    const displayOrder = Number(categoryDisplayOrder);

    const { error } = await supabase.from("product_categories").insert({
      name,
      slug,
      is_active: true,
      display_order: displayOrder
    });

    setIsSavingCategory(false);

    if (error) {
      setIsError(true);
      setMessage(`No se pudo crear la categoria: ${error.message}`);
      return;
    }

    setCategoryName("");
    setCategoryDisplayOrder(String(categories.length + 2));
    setMessage("Categoria creada correctamente.");
    await loadParameters(subcategoryCategoryId);
    if (onCategoriesChanged) await onCategoriesChanged();
  }

  async function saveMarginProfiles() {
    if (!supabase) return;
    setIsSavingMargins(true);
    setMessage("");
    setIsError(false);

    const payload = marginProfiles.map((profile) => ({
      use_key: profile.useKey,
      use_label: profile.useLabel,
      suggested_margin_percentage: normalizeMarginPercentage(profile.suggestedMarginPercentage),
      is_active: profile.isActive,
      display_order: profile.displayOrder
    }));

    const { error } = await supabase.from("wholesale_margin_profiles").upsert(payload, { onConflict: "use_key" });

    setIsSavingMargins(false);

    if (error) {
      setIsError(true);
      setMessage(`No se pudieron guardar los porcentajes: ${error.message}`);
      return;
    }

    setMessage("Porcentajes por uso actualizados.");
    await loadParameters(subcategoryCategoryId);
  }

  async function saveSubcategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setIsSavingSubcategory(true);
    setMessage("");
    setIsError(false);

    const name = subcategoryName.trim();
    if (!subcategoryCategoryId || !name) {
      setIsSavingSubcategory(false);
      setIsError(true);
      setMessage("Selecciona una categoria e ingresa un nombre de subcategoria valido.");
      return;
    }

    const { error } = await supabase.from("product_subcategories").insert({
      category_id: subcategoryCategoryId,
      name,
      slug: slugifyCatalog(name),
      is_active: true,
      display_order: Number(subcategoryDisplayOrder)
    });

    setIsSavingSubcategory(false);

    if (error) {
      setIsError(true);
      setMessage(`No se pudo crear la subcategoria: ${error.message}`);
      return;
    }

    setSubcategoryName("");
    setMessage("Subcategoria creada correctamente.");
    await loadParameters(subcategoryCategoryId);
    if (onCategoriesChanged) await onCategoriesChanged();
  }

  return (
    <section className="mt-6 border border-[#d9dcd3] bg-white">
      <div className="border-b border-[#e0e2dc] px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Parametros</p>
        <h2 className="mt-1 font-serif text-3xl font-semibold text-[#1d2d1a]">Configuracion comercial</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Alta de categorias, subcategorias y parametrizacion de porcentajes sugeridos por tipo de cliente.
        </p>
      </div>

      {message ? (
        <p role="status" className={`border-b border-[#e0e2dc] px-5 py-3 text-sm font-semibold ${isError ? "text-red-700" : "text-[#385133]"}`}>
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 p-5 lg:grid-cols-2 xl:grid-cols-3">
        <div className="border border-[#e0e2dc] p-4">
          <h3 className="font-serif text-2xl text-[#1d2d1a]">Categorias de producto</h3>
          <form onSubmit={saveCategory} className="mt-4 grid gap-3">
            <label className="text-sm font-bold text-[#263324]">
              Nombre
              <input
                required
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                className="admin-input mt-2"
              />
            </label>
            <label className="text-sm font-bold text-[#263324]">
              Orden
              <input
                required
                min="1"
                type="number"
                value={categoryDisplayOrder}
                onChange={(event) => setCategoryDisplayOrder(event.target.value)}
                className="admin-input mt-2"
              />
            </label>
            <button
              type="submit"
              disabled={isSavingCategory}
              className="inline-flex h-10 items-center justify-center gap-2 bg-[#20341d] px-4 text-xs font-bold text-white disabled:opacity-60"
            >
              <Plus size={16} /> {isSavingCategory ? "Guardando..." : "Alta categoria"}
            </button>
          </form>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead className="bg-[#f5f4ef] text-muted">
                <tr>
                  <th className="px-2 py-2">Categoria</th>
                  <th className="px-2 py-2">Slug</th>
                  <th className="px-2 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ecefe7]">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-2 py-2 font-semibold text-[#1d2d1a]">{category.name}</td>
                    <td className="px-2 py-2 text-muted">{category.slug ?? "-"}</td>
                    <td className="px-2 py-2 text-muted">{category.is_active ? "Activa" : "Inactiva"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-[#e0e2dc] p-4">
          <h3 className="font-serif text-2xl text-[#1d2d1a]">Subcategorias</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Cada subcategoria pertenece a una categoria principal.</p>
          <form onSubmit={saveSubcategory} className="mt-4 grid gap-3">
            <label className="text-sm font-bold text-[#263324]">
              Categoria
              <select
                required
                value={subcategoryCategoryId}
                onChange={(event) => {
                  const categoryId = event.target.value;
                  setSubcategoryCategoryId(categoryId);
                  setSubcategoryDisplayOrder(String(subcategories.filter((subcategory) => subcategory.category_id === categoryId).length + 1));
                }}
                className="admin-input mt-2"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-[#263324]">
              Nombre
              <input
                required
                maxLength={80}
                value={subcategoryName}
                onChange={(event) => setSubcategoryName(event.target.value)}
                placeholder="Ej. Imperial"
                className="admin-input mt-2"
              />
            </label>
            <label className="text-sm font-bold text-[#263324]">
              Orden
              <input
                required
                min="1"
                type="number"
                value={subcategoryDisplayOrder}
                onChange={(event) => setSubcategoryDisplayOrder(event.target.value)}
                className="admin-input mt-2"
              />
            </label>
            <button
              type="submit"
              disabled={isSavingSubcategory || categories.length === 0}
              className="inline-flex h-10 items-center justify-center gap-2 bg-[#20341d] px-4 text-xs font-bold text-white disabled:opacity-60"
            >
              <Plus size={16} /> {isSavingSubcategory ? "Guardando..." : "Alta subcategoria"}
            </button>
          </form>

          <div className="mt-5 max-h-72 overflow-auto">
            <table className="w-full min-w-[340px] text-left text-xs">
              <thead className="sticky top-0 bg-[#f5f4ef] text-muted">
                <tr>
                  <th className="px-2 py-2">Subcategoria</th>
                  <th className="px-2 py-2">Categoria</th>
                  <th className="px-2 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ecefe7]">
                {subcategories.map((subcategory) => (
                  <tr key={subcategory.id}>
                    <td className="px-2 py-2 font-semibold text-[#1d2d1a]">{subcategory.name}</td>
                    <td className="px-2 py-2 text-muted">{categories.find((category) => category.id === subcategory.category_id)?.name ?? "-"}</td>
                    <td className="px-2 py-2 text-muted">{subcategory.is_active ? "Activa" : "Inactiva"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border border-[#e0e2dc] p-4">
          <h3 className="font-serif text-2xl text-[#1d2d1a]">Margenes por uso</h3>
          <p className="mt-2 text-sm text-muted">Define el porcentaje sugerido para cada segmento comercial.</p>

          <div className="mt-4 space-y-3">
            {marginProfiles.map((profile, index) => (
              <div key={profile.useKey} className="grid gap-2 rounded-[8px] border border-[#ecefe7] bg-[#fafaf7] p-3 sm:grid-cols-[1fr_140px] sm:items-center">
                <div>
                  <p className="text-sm font-bold text-[#1d2d1a]">{profile.useLabel}</p>
                </div>
                <label className="text-xs font-bold text-muted">
                  %
                  <input
                    type="number"
                    min="1"
                    max="90"
                    step="0.01"
                    value={String(profile.suggestedMarginPercentage)}
                    onChange={(event) =>
                      setMarginProfiles((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, suggestedMarginPercentage: normalizeMarginPercentage(Number(event.target.value)) }
                            : item
                        )
                      )
                    }
                    className="admin-input mt-1"
                  />
                </label>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void saveMarginProfiles()}
            disabled={isSavingMargins}
            className="mt-4 inline-flex h-10 items-center gap-2 bg-[#20341d] px-4 text-xs font-bold text-white disabled:opacity-60"
          >
            <Check size={16} /> {isSavingMargins ? "Guardando..." : "Guardar parametros"}
          </button>
        </div>
      </div>

      {isLoading ? <p className="px-5 pb-5 text-sm font-bold text-muted">Cargando parametros...</p> : null}
    </section>
  );
}
