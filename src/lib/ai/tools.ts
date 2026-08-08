import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const AI_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Busca productos reales de la tienda. Usá esto cuando el cliente mencione preferencias o quiera ver opciones.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto libre para buscar en nombre y descripción del producto" },
          category: { type: "string", description: "Categoría exacta (ej: Yerba mate, Mates, Termos, Bombillas, Materas)" },
          maxPrice: { type: "number", description: "Precio máximo en ARS" },
          minPrice: { type: "number", description: "Precio mínimo en ARS" },
          limit: { type: "number", description: "Cantidad de resultados. Default 5, máximo 8." }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_product",
      description: "Obtiene información completa de un producto por su ID.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "ID del producto" }
        },
        required: ["product_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_stock",
      description: "Consulta el stock disponible de un producto antes de agregarlo al carrito.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "ID del producto" }
        },
        required: ["product_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Agrega un producto al carrito. Solo usá IDs reales obtenidos de search_products o get_product.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "ID real del producto a agregar" },
          quantity: { type: "number", description: "Cantidad a agregar. Debe ser un entero mayor a 0." }
        },
        required: ["product_id", "quantity"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_cart_quantity",
      description: "Cambia la cantidad de un producto en el carrito. Pasá 0 para eliminarlo.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "ID del producto en el carrito" },
          quantity: { type: "number", description: "Nueva cantidad total (0 elimina el producto)" }
        },
        required: ["product_id", "quantity"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remove_from_cart",
      description: "Elimina completamente un producto del carrito.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "ID del producto a eliminar" }
        },
        required: ["product_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_cart",
      description: "Obtiene el estado actual del carrito del cliente.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  }
];
