import assert from "node:assert/strict";
import test from "node:test";
import {
  createCommerceContext,
  detectTaxonomy,
  isYerbaMateProduct,
  resolveContextualProductId,
  updateCommerceContext,
} from "./commerce-context.ts";

test("detecta taxonomia comercial conocida", () => {
  assert.deepEqual(detectTaxonomy("Quiero un mate camionero"), {
    category: "Mates",
    subcategory: "Camionero",
  });
  assert.deepEqual(detectTaxonomy("Quiero un imperial de algarrobo"), {
    category: "Mates",
    subcategory: "Imperial",
  });
  assert.deepEqual(detectTaxonomy("Quiero una bombilla de acero"), {
    category: "Bombillas",
    subcategory: "Acero",
  });
});

test("detecta categorías y subcategorías activas desde la taxonomía recibida", () => {
  const categories = [
    { id: "cat-food", name: "Alimentos Secos" },
    { id: "cat-tools", name: "Accesorios" },
  ];
  const subcategories = [
    { id: "sub-tea", name: "Té Verde", categoryId: "cat-food", categoryName: "Alimentos Secos" },
    { id: "sub-stickers", name: "Stickers", categoryId: "cat-tools", categoryName: "Accesorios" },
  ];

  assert.deepEqual(detectTaxonomy("¿Tienen te verde?", categories, subcategories), {
    category: "Alimentos Secos",
    categoryId: "cat-food",
    subcategory: "Té Verde",
    subcategoryId: "sub-tea",
  });
  assert.deepEqual(detectTaxonomy("Busco accesorio.", categories, subcategories), {
    category: "Accesorios",
    categoryId: "cat-tools",
  });

  const context = updateCommerceContext({
    message: "Busco stickers",
    categories,
    subcategories,
    cart: [],
  });
  assert.equal(context.state, "SEARCH");
  assert.equal(context.categoryId, "cat-tools");
  assert.equal(context.subcategoryId, "sub-stickers");
});

test("no confunde yerba mate con la categoría de mates", () => {
  const categories = [{ id: "cat-mates", name: "Mates" }];
  const subcategories = [
    { id: "sub-mate", name: "Mate", categoryId: "cat-mates", categoryName: "Mates" },
  ];
  const context = updateCommerceContext({
    previous: {
      ...createCommerceContext(),
      categoryId: "cat-mates",
      categoryName: "Mates",
      subcategoryId: "sub-imperial",
      subcategoryName: "Imperial",
    },
    message: "yerba mate tenes",
    categories,
    subcategories,
    cart: [],
  });

  assert.equal(detectTaxonomy("yerba mate", categories, subcategories), undefined);
  assert.equal(context.categoryName, undefined);
  assert.equal(context.state, "SEARCH");
});

test("usa la categoría específica si existe para yerba mate", () => {
  const categories = [
    { id: "cat-mates", name: "Mates" },
    { id: "cat-yerba", name: "Yerba Mate" },
  ];

  assert.deepEqual(detectTaxonomy("yerba mate tenes", categories), {
    category: "Yerba Mate",
    categoryId: "cat-yerba",
  });
});

test("distingue la yerba para tomar de los recipientes yerberas", () => {
  assert.equal(isYerbaMateProduct("Yerba Mate 500 g"), true);
  assert.equal(isYerbaMateProduct("Don Julián Tradicional"), true);
  assert.equal(isYerbaMateProduct("Mateite Compuesta"), true);
  assert.equal(isYerbaMateProduct("Yerbera GAMUZA 250gr"), false);
});

test("una consulta de precio mayorista se clasifica para búsqueda", () => {
  const context = updateCommerceContext({
    message: "¿Cuál es el precio mayorista de las hierbas?",
    cart: [],
  });

  assert.equal(context.state, "SEARCH");
  assert.equal(context.purchaseIntent, "high");
});

test("resuelve referencias ordinales de forma deterministica", () => {
  assert.equal(
    resolveContextualProductId("Quiero el segundo", {
      recommendedProductIds: ["product-1", "product-2", "product-3"],
      currentProductId: undefined,
      lastSelectedProductId: undefined,
    }),
    "product-2"
  );
});

test("usa el producto actual y conserva cantidad y presupuesto", () => {
  const context = updateCommerceContext({
    previous: createCommerceContext(),
    message: "Agregalo, quiero dos y tengo hasta 40 mil",
    currentProductId: "product-7",
    cart: [],
  });

  assert.equal(context.productId, "product-7");
  assert.equal(context.quantity, 2);
  assert.equal(context.budget, 40000);
  assert.equal(context.state, "PURCHASE_INTENT");
  assert.equal(context.purchaseIntent, "very_high");
});

test("el click de una tarjeta conserva el id exacto", () => {
  const context = updateCommerceContext({
    message: "Agregá uno de Imperial Criollo al pedido",
    currentProductId: "product-clicked",
    cart: [],
  });

  assert.equal(context.productId, "product-clicked");
  assert.equal(context.quantity, 1);
  assert.equal(context.purchaseIntent, "very_high");
});

test("human handoff y cierre tienen prioridad comercial", () => {
  const handoff = updateCommerceContext({
    message: "Quiero hablar con una persona",
    cart: [],
  });
  const end = updateCommerceContext({
    message: "No, gracias",
    cart: [],
  });

  assert.equal(handoff.state, "HUMAN_HANDOFF");
  assert.equal(end.state, "END");
});

test("una consulta de stock conserva el producto contextual", () => {
  const context = updateCommerceContext({
    previous: {
      ...createCommerceContext(),
      lastSelectedProductId: "product-stock",
    },
    message: "¿Hay stock?",
    cart: [],
  });

  assert.equal(context.productId, "product-stock");
  assert.equal(context.purchaseIntent, "high");
});

test("detecta checkout sin sugerir productos", () => {
  const context = updateCommerceContext({
    message: "¿Cómo hago el pedido?",
    cart: [],
  });

  assert.equal(context.state, "CHECKOUT");
});

test("un carrito completo corta complementos", () => {
  const cart = ["Mates", "Bombillas", "Termos", "Hierbas"].map((categoryName, index) => ({
    productId: `product-${index}`,
    quantity: 1,
    unitPrice: 1000,
    categoryName,
  }));
  const context = updateCommerceContext({ message: "Que mas me falta", cart });

  assert.equal(context.cart.isReadyForCheckout, true);
  assert.deepEqual(context.cart.complementaryCategories, []);
});

test("un mate en carrito propone solo complementos logicos", () => {
  const context = updateCommerceContext({
    message: "¿Qué me recomendás?",
    cart: [{
      productId: "mate-1",
      quantity: 1,
      unitPrice: 20000,
      categoryName: "Mates",
    }],
  });

  assert.deepEqual(context.cart.complementaryCategories, ["Bombillas", "Hierbas"]);
});

test("una busqueda explicita tiene prioridad sobre el carrito", () => {
  const context = updateCommerceContext({
    message: "Quiero ver bombillas",
    cart: [{
      productId: "mate-1",
      quantity: 1,
      unitPrice: 20000,
      categoryName: "Mates",
    }],
  });

  assert.equal(context.state, "SEARCH");
  assert.equal(context.categoryName, "Bombillas");
});
