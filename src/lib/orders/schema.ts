import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.string().trim().min(1).max(128),
  quantity: z.number().int().min(1).max(999),
});

export const orderComboSchema = z.object({
  comboId: z.string().trim().min(1).max(128),
  quantity: z.number().int().min(1).max(999),
});

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(200).pipe(z.email()),
  phone: z.string().trim().min(6).max(40),
  address: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(120),
  province: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().regex(/^\d{4}$/, "Código postal de 4 dígitos"),
});

export const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).max(100).default([]),
    combos: z.array(orderComboSchema).max(50).default([]),
    customer: customerSchema,
    shippingMethodId: z.string().trim().min(1).max(64),
  })
  .refine((data) => data.items.length + data.combos.length > 0, {
    message: "El pedido no puede estar vacío.",
    path: ["items"],
  });

export const checkoutFormSchema = customerSchema.extend({
  shippingMethodId: z.string().trim().min(1).max(64),
});

export const createPreferenceSchema = z.object({
  orderId: z.string().uuid(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
