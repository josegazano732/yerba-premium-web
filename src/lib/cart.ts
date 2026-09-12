import { Product } from "@/data/products";
import { Combo } from "@/lib/combos";

export type CartProductItem = {
  kind: "product";
  product: Product;
  quantity: number;
};

export type CartComboItem = {
  kind: "combo";
  combo: Combo;
  quantity: number;
};

export type CartItem = CartProductItem | CartComboItem;

export const CART_STORAGE_KEY = "mate-tierra-cart";

export function isProductItem(item: CartItem): item is CartProductItem {
  return item.kind === "product";
}

export function isComboItem(item: CartItem): item is CartComboItem {
  return item.kind === "combo";
}

export function cartProductItems(cart: CartItem[]): CartProductItem[] {
  return cart.filter(isProductItem);
}

export function cartComboItems(cart: CartItem[]): CartComboItem[] {
  return cart.filter(isComboItem);
}

/** Clave única y estable dentro del carrito (distinta entre productos y combos). */
export function cartItemKey(item: CartItem): string {
  return item.kind === "product" ? `product:${item.product.id}` : `combo:${item.combo.id}`;
}

export function cartItemName(item: CartItem): string {
  return item.kind === "product" ? item.product.name : item.combo.name;
}

export function cartItemImage(item: CartItem): string {
  return item.kind === "product" ? item.product.image : item.combo.image;
}

export function cartItemUnitPrice(item: CartItem): number {
  return item.kind === "product" ? item.product.price : item.combo.price;
}

/** Subtotal de la línea (precio unitario × cantidad). */
export function cartItemLineTotal(item: CartItem): number {
  return cartItemUnitPrice(item) * item.quantity;
}

export function cartSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + cartItemLineTotal(item), 0);
}

export function cartItemCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}
