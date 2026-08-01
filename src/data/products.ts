export type Product = {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  discount?: string;
  image: string;
  images?: string[];
  description: string;
  category: string;
  weight?: string;
  stock: number;
  featured?: boolean;
};

export type ProductDetailsRow = {
  id: string | null;
  name: string | null;
  description: string | null;
  price: number | string | null;
  image: string | null;
  image_urls: string[] | null;
  category_name: string | null;
  unit_of_measure: string | null;
  stock: number | string | null;
  seasonal: boolean | null;
};

const fallbackImage = "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=900&q=80";

export function mapProductDetails(row: ProductDetailsRow): Product | null {
  if (!row.id || !row.name || row.price === null) return null;

  const image = row.image || row.image_urls?.[0] || fallbackImage;
  const gallery = [image, ...(row.image_urls ?? [])].filter((source, index, all) => Boolean(source) && all.indexOf(source) === index);

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "Producto seleccionado de nuestra tienda.",
    price: Number(row.price),
    image,
    images: gallery,
    category: row.category_name ?? "Otros",
    weight: row.unit_of_measure ?? undefined,
    stock: Number(row.stock ?? 0),
    featured: Boolean(row.seasonal)
  };
}

export const products: Product[] = [
  {
    id: "yerba-500",
    name: "Yerba Mate 500g",
    price: 4900,
    compareAtPrice: 5450,
    discount: "10% OFF",
    image: "https://images.unsplash.com/photo-1615485737457-f07082c77813?auto=format&fit=crop&w=900&q=80",
    description: "Blend suave, bajo polvo y estacionamiento natural.",
    category: "Yerba mate",
    weight: "500 g",
    stock: 24,
    featured: true
  },
  {
    id: "yerba-x10",
    name: "Yerba Mate x10",
    price: 42900,
    discount: "Pack ahorro",
    image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=900&q=80",
    description: "Caja familiar para tener tu ritual siempre listo.",
    category: "Packs",
    weight: "5 kg",
    stock: 12,
    featured: true
  },
  {
    id: "mate-cocido",
    name: "Mate Cocido",
    price: 3200,
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80",
    description: "Saquitos livianos con aroma tostado y final amable.",
    category: "Yerba mate",
    weight: "25 saquitos",
    stock: 31
  },
  {
    id: "lata-yerbera",
    name: "Lata Yerbera",
    price: 12500,
    discount: "Nuevo",
    image: "https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?auto=format&fit=crop&w=900&q=80",
    description: "Lata hermetica para conservar frescura y estilo.",
    category: "Accesorios",
    stock: 9,
    featured: true
  },
  {
    id: "mate-bombilla",
    name: "Mate + Bombilla",
    price: 18900,
    image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=900&q=80",
    description: "Kit esencial para empezar con una cebada pareja.",
    category: "Accesorios",
    stock: 16,
    featured: true
  },
  {
    id: "taza",
    name: "Taza",
    price: 7400,
    image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=900&q=80",
    description: "Ceramica robusta para mate cocido y sobremesa.",
    category: "Accesorios",
    stock: 18
  },
  {
    id: "remera",
    name: "Remera",
    price: 16000,
    discount: "Edicion limitada",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80",
    description: "Algodon premium con grafica sobria de la marca.",
    category: "Indumentaria",
    stock: 7
  }
];

export const featuredProducts = products.filter((product) => product.featured);