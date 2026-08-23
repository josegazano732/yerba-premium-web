"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ArrowUp, Minus, Plus, ShoppingBag, X } from "lucide-react";
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
  content: "Hola 👋 Soy el Agente Matero. Te voy a ayudar a encontrar el producto ideal y armar tu pedido. Contame, ¿qué estás buscando hoy?",
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
    document.body.dataset.aiOpen = isOpen ? "true" : "";
  }, [isOpen]);

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
      "Hola! Quiero hacer este pedido (armado con el Agente Matero):",
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
    void sendMessage(`Agregá uno de ${product.name} al pedido`);
  }

  // Convierte URLs en <a> clickeables y \n en saltos de línea reales
  function renderContent(content: string) {
    const parts = content.split(/(https?:\/\/[^\s]+)/);
    return parts.map((part, i) =>
      /^https?:\/\//.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
           className="break-all font-medium underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
          {part}
        </a>
      ) : (
        <span key={i}>
          {part.split("\n").flatMap((line, j, arr) => {
            const segments = line.split(/(\*\*[^*]+\*\*)/).map((seg, k) =>
              /^\*\*[^*]+\*\*$/.test(seg)
                ? <strong key={`${i}-${j}-${k}`}>{seg.slice(2, -2)}</strong>
                : seg.replace(/\*/g, "")
            );
            return j < arr.length - 1 ? [...segments, <br key={`br${j}`} />] : segments;
          })}
        </span>
      )
    );
  }

  return (
    <>
      {/* FAB Agente Matero */}
      <motion.div
        className="fixed bottom-[96px] right-3 z-[130] sm:bottom-28 sm:right-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute inset-0 rounded-full border border-[#4a7c45]/60"
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: i * 1 }}
            aria-hidden
          />
        ))}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir Agente Matero"
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#20341d] p-0 text-white shadow-[0_8px_32px_rgba(32,52,29,0.45)] ring-1 ring-white/10 transition-all hover:scale-105 hover:shadow-[0_12px_40px_rgba(32,52,29,0.55)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-95 sm:h-auto sm:w-auto sm:gap-2 sm:py-3 sm:pl-3.5 sm:pr-4"
        >
          <span className="text-xl leading-none" aria-hidden>🧉</span>
          <span className="hidden text-[13px] font-bold tracking-wide sm:inline">Agente Matero</span>
          <span className="hidden h-2.5 w-2.5 sm:relative sm:flex" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-75" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
          </span>
        </button>
      </motion.div>

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
              aria-label="Agente Matero"
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
              <div className="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-r from-[#182b16] to-[#20341d] px-4 py-3.5 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl leading-none ring-2 ring-white/20">
                    🧉
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-60" />
                      <span className="relative h-3.5 w-3.5 rounded-full border-2 border-[#20341d] bg-[#4ade80]" />
                    </span>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold leading-tight tracking-tight text-white">Agente Matero</p>
                    <p className="text-[11px] leading-tight text-[#4ade80]/80">● en línea ahora</p>
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
                    aria-label="Cerrar Agente Matero"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Mobile tabs */}
              <div className="flex shrink-0 gap-1.5 border-b border-[#e8e2d8] bg-[#faf7f2] px-2 py-2 lg:hidden">
                {(["chat", "order"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                      activeTab === tab
                        ? "bg-[#20341d] text-white shadow-sm"
                        : "text-muted hover:bg-[#ede9e0]"
                    }`}
                  >
                    {tab === "chat" ? (
                      "💬 Chat"
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag size={13} />
                        Pedido
                        {cartCount > 0 ? (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                            activeTab === "order" ? "bg-[#d7e68c] text-[#20341d]" : "bg-primary/20 text-primary"
                          }`}>{cartCount}</span>
                        ) : null}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="flex min-h-0 flex-1 overflow-hidden">

                {/* ── Chat column ── */}
                <div className={`flex min-h-0 min-w-0 flex-1 flex-col bg-[#f5f0e8] ${activeTab !== "chat" ? "hidden lg:flex" : ""}`}>
                  {/* Messages */}
                  <div className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
                    <div className="flex w-full flex-col gap-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                          {/* Assistant */}
                          {msg.role === "assistant" && !msg.isLoading ? (
                            <div className="flex w-full items-start gap-2 sm:max-w-[82%]">
                              <span className="mt-1 hidden shrink-0 text-lg leading-none sm:block" aria-hidden>🧉</span>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="break-words max-w-[52ch] rounded-2xl rounded-bl-sm bg-white px-3 py-2.5 text-sm leading-relaxed text-text shadow-sm ring-1 ring-black/[0.04] sm:max-w-[56ch] sm:px-4 sm:py-3">
                                  {renderContent(msg.content)}
                                </div>
                                {(() => {
                                  const lower = msg.content.toLowerCase();
                                  const visible = (msg.products ?? []).filter((p) =>
                                    lower.includes(p.name.toLowerCase())
                                  );
                                  return visible.length > 0 ? (
                                    <div className="mt-3 w-full flex gap-3 overflow-x-auto pb-3 [scrollbar-color:#b8b2a8_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#b8b2a8]">
                                      {visible.map((product) => (
                                        <AiProductCard
                                          key={product.id}
                                          product={product}
                                          onAdd={handleAddFromAI}
                                          isAdded={cart.some((item) => item.product.id === product.id)}
                                        />
                                      ))}
                                    </div>
                                  ) : null;
                                })()}
                                {msg.quickReplies && msg.quickReplies.length > 0 ? (
                                  <div className="mt-2.5 flex flex-wrap gap-2">
                                    {msg.quickReplies.map((reply) => (
                                      <button
                                        key={reply}
                                        type="button"
                                        onClick={() => void sendMessage(reply)}
                                        disabled={isLoading}
                                        className="rounded-full border border-primary/30 bg-white px-4 py-2 text-xs font-semibold text-primary shadow-sm transition hover:border-primary/70 hover:bg-primary/10 active:scale-95 disabled:opacity-50"
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
                            <div className="min-w-0 max-w-[80%] overflow-hidden sm:max-w-[70%]">
                              <div className="break-words rounded-2xl rounded-br-sm bg-[#20341d] px-4 py-3 text-sm leading-relaxed text-white">
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
                  <div className="shrink-0 border-t border-[#e0dbd0] bg-white px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4 sm:py-4 sm:pb-4">
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onInput={(e) => {
                          const t = e.currentTarget;
                          t.style.height = "auto";
                          t.style.height = `${Math.min(t.scrollHeight, 112)}px`;
                        }}
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
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#20341d] text-white shadow-sm transition hover:bg-primary active:scale-95 disabled:opacity-35"
                        aria-label="Enviar mensaje"
                      >
                        <ArrowUp size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                    <p className="mt-1.5 px-1 text-[10px] text-muted/60">Enter para enviar · Shift+Enter para nueva línea</p>
                  </div>
                </div>

                {/* ── Order panel ── */}
                <div className={`flex w-full shrink-0 flex-col overflow-hidden bg-white lg:w-72 lg:border-l lg:border-[#e8e2d8] xl:w-80 ${activeTab !== "order" ? "hidden lg:flex" : ""}`}>
                  <div className="flex shrink-0 items-center justify-between border-b border-[#e8e2d8] px-3 py-2.5">
                    <p className="font-serif text-base font-semibold text-[#20341d]">Tu pedido</p>
                    {cartCount > 0 ? (
                      <span className="rounded-full bg-[#20341d] px-2.5 py-0.5 text-xs font-bold text-white">
                        {cartCount} {cartCount === 1 ? "item" : "items"}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex-1 overflow-x-hidden overflow-y-auto p-3">
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
                      <div className="space-y-2.5">
                        {cart.map((item) => (
                          <div key={item.product.id} className="flex gap-2 rounded-xl border border-[#ece7de] bg-[#faf7f2] p-2.5">
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-secondary/30">
                              <Image src={item.product.image} alt={item.product.name} fill sizes="44px" className="object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-[#20341d]">{item.product.name}</p>
                              <div className="mt-1.5 flex items-center justify-between gap-1">
                                <div className="inline-flex h-6 items-center rounded-full border border-[#d7d2c7] bg-white text-xs">
                                  <button
                                    type="button"
                                    onClick={() => changeQuantity(item.product.id, -1)}
                                    className="grid h-full w-6 place-items-center transition hover:text-primary"
                                    aria-label="Quitar uno"
                                  >
                                    <Minus size={10} />
                                  </button>
                                  <span className="w-5 text-center text-[11px] font-bold">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => changeQuantity(item.product.id, 1)}
                                    className="grid h-full w-6 place-items-center transition hover:text-primary"
                                    aria-label="Agregar uno"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>
                                <p className="text-xs font-bold text-[#20341d]">{currency.format(item.product.price * item.quantity)}</p>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="text-[10px] font-medium text-muted transition hover:text-red-500"
                                  aria-label={`Quitar ${item.product.name}`}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {cart.length > 0 ? (
                    <div className="shrink-0 border-t border-[#e8e2d8] bg-[#faf7f2] p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted">Total</span>
                        <strong className="font-serif text-2xl text-[#20341d]">{currency.format(cartTotal)}</strong>
                      </div>
                      <a
                        href={buildWhatsappLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#25d366] text-sm font-bold text-white shadow-md transition hover:bg-[#20c55e] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#25d366] focus:ring-offset-2"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px] shrink-0" aria-hidden>
                          <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35z" /><path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2 22l5.35-1.4a9.83 9.83 0 0 0 4.69 1.2h.01c5.43 0 9.85-4.42 9.85-9.86A9.79 9.79 0 0 0 12.04 2zm0 17.96h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.17.83.85-3.09-.2-.32a8.14 8.14 0 0 1-1.25-4.35c0-4.52 3.68-8.19 8.2-8.19a8.14 8.14 0 0 1 5.79 2.4 8.1 8.1 0 0 1 2.4 5.8c0 4.52-3.68 8.24-8.14 8.24z" />
                        </svg>
                        Confirmar pedido por WhatsApp
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
