"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ArrowUp, Minus, Plus, ShoppingBag, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Product } from "@/data/products";
import { useCart } from "@/lib/cart-context";
import { site } from "@/data/site";
import type { AiMessage, AiChatResponse, CartAction } from "@/lib/ai/types";
import { AiProductCard } from "./AiProductCard";

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const WELCOME: AiMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hola 👋 Soy IA Matera. Te voy a ayudar a encontrar el producto ideal y armar tu pedido. Contame, ¿qué estás buscando hoy?",
  quickReplies: ["Yerba mate", "Mates y accesorios", "Termos y bombillas", "Armar un combo"]
};

export function AiMatera() {
  const { cart, addToCart, changeQuantity, removeFromCart } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "order">("chat");
  const [messages, setMessages] = useState<AiMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  function applyCartActions(actions: CartAction[]) {
    for (const action of actions) {
      if (action.type === "add") {
        addToCart(action.product, action.quantity);
      } else if (action.type === "update") {
        const item = cart.find((i) => i.product.id === action.productId);
        if (item) {
          const delta = action.quantity - item.quantity;
          if (delta !== 0) changeQuantity(action.productId, delta);
        }
      } else if (action.type === "remove") {
        removeFromCart(action.productId);
      }
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: AiMessage = { id: uid(), role: "user", content: trimmed };
    const loadingMsg: AiMessage = { id: "loading", role: "assistant", content: "", isLoading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    // History: exclude loading messages and welcome
    const history = messages
      .filter((m) => !m.isLoading && m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history, cart })
      });

      const data = (await res.json()) as AiChatResponse;

      if (data.cartActions?.length) applyCartActions(data.cartActions);

      const assistantMsg: AiMessage = {
        id: uid(),
        role: "assistant",
        content: data.message,
        products: data.products,
        quickReplies: data.quickReplies
      };

      setMessages((prev) => [...prev.filter((m) => m.id !== "loading"), assistantMsg]);

      // Si se agregó al carrito, mostrar tab de pedido en mobile brevemente
      if (data.cartActions?.some((a) => a.type === "add")) {
        setActiveTab("order");
        setTimeout(() => setActiveTab("chat"), 1800);
      }
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        {
          id: uid(),
          role: "assistant",
          content: "Ocurrió un error de conexión. Por favor, intentá de nuevo."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function buildWhatsappLink() {
    const lines = cart.map((item, i) =>
      `${i + 1}) ${item.product.name}\n   ${item.quantity} x ${currency.format(item.product.price)} = ${currency.format(item.product.price * item.quantity)}`
    );
    const msg = [
      "Hola! Quiero hacer este pedido (armado con IA Matera):",
      "",
      ...lines,
      "",
      `Total: ${currency.format(cartTotal)}`,
      "",
      "¿Me confirman disponibilidad y envío?"
    ].join("\n");
    return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(msg)}`;
  }

  function handleAddFromAI(product: Product) {
    addToCart(product, 1);
    void sendMessage(`Agregá uno de ${product.name} al pedido`);
  }

  return (
    <>
      {/* FAB — subido en mobile para no chocar con WhatsApp */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir IA Matera"
        className="fixed bottom-[88px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#20341d] text-white shadow-xl ring-1 ring-white/10 transition-all hover:scale-105 hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:bottom-28 sm:right-6 sm:h-[60px] sm:w-[60px]"
      >
        <span className="text-2xl leading-none" aria-hidden>🧉</span>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen ? (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 z-50 bg-[#11180f]/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              aria-hidden
            />

            {/* Dialog — bottom sheet en mobile, dialog centrado en desktop */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="IA Matera"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-[#faf7f2] shadow-2xl sm:inset-6 sm:mx-auto sm:max-w-5xl sm:rounded-2xl"
            >
              {/* Handle bar — solo visible en mobile */}
              <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-[#c8c2b6]" />
              </div>

              {/* Header */}
              <div className="flex shrink-0 items-center justify-between gap-3 bg-[#20341d] px-4 py-3.5 sm:rounded-none sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl leading-none ring-2 ring-white/20">
                    🧉
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#20341d] bg-[#4ade80]" />
                  </div>
                  <div>
                    <p className="font-serif text-[15px] font-semibold leading-tight text-[#d7e68c]">IA Matera</p>
                    <p className="text-[11px] leading-tight text-white/50">Asistente · en línea</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cartCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("order")}
                      className="flex items-center gap-1.5 rounded-full bg-[#d7e68c]/90 px-3 py-1 text-xs font-bold text-[#20341d] transition hover:bg-[#d7e68c]"
                    >
                      <ShoppingBag size={11} />
                      {cartCount}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                    aria-label="Cerrar IA Matera"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Mobile tabs */}
              <div className="flex shrink-0 border-b border-[#e8e2d8] bg-white lg:hidden">
                {(["chat", "order"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted hover:text-text"
                    }`}
                  >
                    {tab === "chat" ? "Conversación" : `Pedido${cartCount > 0 ? ` · ${cartCount}` : ""}`}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="flex min-h-0 flex-1 overflow-hidden">

                {/* ── Chat column ── */}
                <div className={`flex min-h-0 flex-1 flex-col bg-[#f5f0e8] ${activeTab !== "chat" ? "hidden lg:flex" : ""}`}>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
                    <div className="flex flex-col gap-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                          {/* Assistant */}
                          {msg.role === "assistant" && !msg.isLoading ? (
                            <div className="flex max-w-[88%] items-end gap-2 sm:max-w-[78%]">
                              <span className="mb-1 shrink-0 text-lg leading-none" aria-hidden>🧉</span>
                              <div className="min-w-0">
                                <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm leading-relaxed text-text shadow-sm">
                                  {msg.content}
                                </div>
                                {msg.products && msg.products.length > 0 ? (
                                  <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    {msg.products.map((product) => (
                                      <AiProductCard
                                        key={product.id}
                                        product={product}
                                        onAdd={handleAddFromAI}
                                        isAdded={cart.some((item) => item.product.id === product.id)}
                                      />
                                    ))}
                                  </div>
                                ) : null}
                                {msg.quickReplies && msg.quickReplies.length > 0 ? (
                                  <div className="mt-2.5 flex flex-wrap gap-2">
                                    {msg.quickReplies.map((reply) => (
                                      <button
                                        key={reply}
                                        type="button"
                                        onClick={() => void sendMessage(reply)}
                                        disabled={isLoading}
                                        className="rounded-full border border-primary/30 bg-white px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary/10 disabled:opacity-50"
                                      >
                                        {reply}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : msg.isLoading ? (
                            <div className="flex items-end gap-2">
                              <span className="mb-1 shrink-0 text-lg leading-none" aria-hidden>🧉</span>
                              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-white px-4 py-3.5 shadow-sm">
                                {[0, 1, 2].map((i) => (
                                  <span
                                    key={i}
                                    className="block h-2 w-2 animate-bounce rounded-full bg-primary/60"
                                    style={{ animationDelay: `${i * 0.18}s` }}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            /* User */
                            <div className="max-w-[80%] sm:max-w-[70%]">
                              <div className="rounded-2xl rounded-br-sm bg-[#20341d] px-4 py-3 text-sm leading-relaxed text-white">
                                {msg.content}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="shrink-0 border-t border-[#e0dbd0] bg-white px-3 py-3 sm:px-4 sm:py-4">
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        rows={1}
                        placeholder="Escribí tu mensaje…"
                        className="flex-1 resize-none rounded-2xl border border-[#ddd8ce] bg-[#faf7f2] px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-primary/60 focus:bg-white focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
                        style={{ maxHeight: "112px" }}
                      />
                      <button
                        type="button"
                        onClick={() => void sendMessage(input)}
                        disabled={isLoading || !input.trim()}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#20341d] text-white shadow-sm transition hover:bg-primary disabled:opacity-35"
                        aria-label="Enviar mensaje"
                      >
                        <ArrowUp size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                    <p className="mt-1.5 px-1 text-[10px] text-muted/70">Enter para enviar · Shift+Enter para nueva línea</p>
                  </div>
                </div>

                {/* ── Order panel ── */}
                <div className={`flex w-full shrink-0 flex-col bg-white lg:w-72 lg:border-l lg:border-[#e8e2d8] xl:w-80 ${activeTab !== "order" ? "hidden lg:flex" : ""}`}>
                  <div className="shrink-0 border-b border-[#e8e2d8] px-4 py-3">
                    <p className="font-serif text-lg font-semibold text-[#20341d]">Tu pedido</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {cart.length === 0 ? (
                      <div className="grid h-full place-items-center py-12 text-center">
                        <div>
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f0e8]">
                            <ShoppingBag className="text-secondary" size={24} />
                          </div>
                          <p className="text-sm font-semibold text-[#20341d]">Tu pedido está vacío</p>
                          <p className="mt-1 text-xs text-muted">Contame qué buscás y te ayudo a armarlo.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cart.map((item) => (
                          <div key={item.product.id} className="flex gap-3 rounded-xl border border-[#ece7de] bg-[#faf7f2] p-3">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary/30">
                              <Image src={item.product.image} alt={item.product.name} fill sizes="56px" className="object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-xs font-semibold leading-snug text-[#20341d]">{item.product.name}</p>
                              <p className="mt-0.5 text-[11px] text-muted">{currency.format(item.product.price)} c/u</p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <div className="inline-flex h-7 items-center rounded-full border border-[#d7d2c7] bg-white text-xs">
                                  <button
                                    type="button"
                                    onClick={() => changeQuantity(item.product.id, -1)}
                                    className="grid h-full w-7 place-items-center transition hover:text-primary"
                                    aria-label="Quitar uno"
                                  >
                                    <Minus size={11} />
                                  </button>
                                  <span className="w-6 text-center font-bold">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => changeQuantity(item.product.id, 1)}
                                    className="grid h-full w-7 place-items-center transition hover:text-primary"
                                    aria-label="Agregar uno"
                                  >
                                    <Plus size={11} />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="text-[10px] font-medium text-muted transition hover:text-red-500"
                                  aria-label={`Quitar ${item.product.name}`}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>
                            <p className="shrink-0 text-sm font-bold text-[#20341d]">
                              {currency.format(item.product.price * item.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {cart.length > 0 ? (
                    <div className="shrink-0 border-t border-[#e8e2d8] bg-[#faf7f2] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted">Total</span>
                        <strong className="font-serif text-2xl text-[#20341d]">{currency.format(cartTotal)}</strong>
                      </div>
                      <a
                        href={buildWhatsappLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#20341d] text-sm font-bold text-white transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        <Sparkles size={15} />
                        Finalizar por WhatsApp
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
