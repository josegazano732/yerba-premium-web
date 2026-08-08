import { supabase } from "@/lib/supabase";
import { mapProductDetails, Product, ProductDetailsRow } from "@/data/products";
import { CartItem } from "@/lib/cart";
import { CartAction } from "@/lib/ai/types";

export type ToolResult = {
  result: unknown;
  cartAction?: CartAction;
  products?: Product[];
};

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  cart: CartItem[]
): Promise<ToolResult> {
  switch (toolName) {
    case "search_products":
      return searchProducts(args);
    case "get_product":
      return getProduct(String(args.product_id ?? ""));
    case "check_stock":
      return checkStock(String(args.product_id ?? ""));
    case "add_to_cart":
      return addToCart(String(args.product_id ?? ""), Number(args.quantity ?? 1), cart);
    case "update_cart_quantity":
      return updateCartQuantity(String(args.product_id ?? ""), Number(args.quantity ?? 0), cart);
    case "remove_from_cart":
      return removeFromCart(String(args.product_id ?? ""));
    case "get_cart":
      return getCartState(cart);
    default:
      return { result: { error: `Herramienta '${toolName}' no reconocida.` } };
  }
}

async function searchProducts(args: Record<string, unknown>): Promise<ToolResult> {
  if (!supabase) return { result: { error: "Base de datos no disponible." } };

  let query = supabase
    .from("product_details")
    .select("id,name,description,price,image,image_urls,category_name,unit_of_measure,stock,seasonal")
    .not("image", "is", null)
    .gt("stock", 0);

  if (args.category) {
    query = query.ilike("category_name", `%${String(args.category)}%`);
  }
  if (typeof args.maxPrice === "number") {
    query = query.lte("price", args.maxPrice);
  }
  if (typeof args.minPrice === "number") {
    query = query.gte("price", args.minPrice);
  }
  if (args.query) {
    const q = String(args.query);
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const limit = Math.min(Number(args.limit ?? 5), 8);
  const { data, error } = await query.order("seasonal", { ascending: false }).limit(limit);

  if (error) return { result: { error: "Error al buscar productos." } };

  const products = ((data as ProductDetailsRow[]) ?? [])
    .map(mapProductDetails)
    .filter((p): p is Product => p !== null);

  return {
    result: {
      count: products.length,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        description: p.description,
        stock: p.stock,
        weight: p.weight ?? null
      }))
    },
    products
  };
}

async function getProduct(productId: string): Promise<ToolResult> {
  if (!productId) return { result: { error: "product_id requerido." } };
  if (!supabase) return { result: { error: "Base de datos no disponible." } };

  const { data, error } = await supabase
    .from("product_details")
    .select("id,name,description,price,image,image_urls,category_name,unit_of_measure,stock,seasonal")
    .eq("id", productId)
    .single();

  if (error || !data) return { result: { error: "Producto no encontrado." } };

  const product = mapProductDetails(data as ProductDetailsRow);
  if (!product) return { result: { error: "Producto no válido." } };

  return {
    result: { id: product.id, name: product.name, price: product.price, category: product.category, description: product.description, stock: product.stock, weight: product.weight ?? null },
    products: [product]
  };
}

async function checkStock(productId: string): Promise<ToolResult> {
  if (!productId) return { result: { error: "product_id requerido." } };
  if (!supabase) return { result: { error: "Base de datos no disponible." } };

  const { data, error } = await supabase
    .from("product_details")
    .select("id,name,stock")
    .eq("id", productId)
    .single();

  if (error || !data) return { result: { error: "Producto no encontrado." } };

  const row = data as { id: string; name: string; stock: number | string | null };
  const stock = Number(row.stock ?? 0);
  return { result: { product_id: productId, name: row.name, stock, available: stock > 0 } };
}

async function addToCart(productId: string, quantity: number, cart: CartItem[]): Promise<ToolResult> {
  if (!productId) return { result: { error: "product_id requerido." } };
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { result: { error: "La cantidad debe ser un entero mayor a 0." } };
  }
  if (!supabase) return { result: { error: "Base de datos no disponible." } };

  const { data, error } = await supabase
    .from("product_details")
    .select("id,name,description,price,image,image_urls,category_name,unit_of_measure,stock,seasonal")
    .eq("id", productId)
    .single();

  if (error || !data) return { result: { error: "Producto no encontrado." } };

  const product = mapProductDetails(data as ProductDetailsRow);
  if (!product) return { result: { error: "Producto no válido." } };
  if (product.stock < 1) return { result: { error: `${product.name} no tiene stock disponible.` } };

  const existingQty = cart.find((item) => item.product.id === productId)?.quantity ?? 0;
  if (existingQty + quantity > product.stock) {
    return { result: { error: `Solo hay ${product.stock} unidades de ${product.name}. Ya tenés ${existingQty} en el carrito.` } };
  }

  return {
    result: { success: true, product_id: productId, name: product.name, quantity, price: product.price },
    cartAction: { type: "add", product, quantity },
    products: [product]
  };
}

async function updateCartQuantity(productId: string, quantity: number, cart: CartItem[]): Promise<ToolResult> {
  if (!productId) return { result: { error: "product_id requerido." } };
  if (quantity < 0) return { result: { error: "La cantidad no puede ser negativa." } };

  const item = cart.find((i) => i.product.id === productId);
  if (!item) return { result: { error: "El producto no está en el carrito." } };

  if (quantity === 0) {
    return {
      result: { success: true, message: `${item.product.name} eliminado del carrito.` },
      cartAction: { type: "remove", productId }
    };
  }

  return {
    result: { success: true, product_id: productId, name: item.product.name, quantity },
    cartAction: { type: "update", productId, quantity }
  };
}

function removeFromCart(productId: string): ToolResult {
  return {
    result: { success: true, message: "Producto eliminado del carrito." },
    cartAction: { type: "remove", productId }
  };
}

function getCartState(cart: CartItem[]): ToolResult {
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  return {
    result: {
      items: cart.map((item) => ({
        product_id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        subtotal: item.product.price * item.quantity
      })),
      total,
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
    }
  };
}
