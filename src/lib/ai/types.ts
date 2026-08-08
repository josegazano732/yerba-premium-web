import { Product } from "@/data/products";
import { CartItem } from "@/lib/cart";

export type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  quickReplies?: string[];
  isLoading?: boolean;
};

export type CartAction =
  | { type: "add"; product: Product; quantity: number }
  | { type: "update"; productId: string; quantity: number }
  | { type: "remove"; productId: string };

export type AiChatRequest = {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  cart: CartItem[];
  currentProductId?: string;
};

export type AiChatResponse = {
  message: string;
  products?: Product[];
  quickReplies?: string[];
  cartActions?: CartAction[];
  error?: string;
};
