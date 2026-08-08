import { Product } from "@/data/products";

export type CartItem = { product: Product; quantity: number };
export const CART_STORAGE_KEY = "mate-tierra-cart";
