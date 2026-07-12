import { z } from 'zod';

export const createOrderSchema = z.object({
  pickupAddress: z.object({
    addressText: z.string().min(4, 'Pickup Address must be at least 4 characters'),
    coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  }),
  deliveryAddress: z.object({
    addressText: z.string().min(4, 'Delivery Address must be at least 4 characters'),
    coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  }),
  customerName: z.string().min(2, 'Customer name is required'),
  customerPhone: z.string().min(8, 'Valid phone number is required'),
  itemDetails: z.object({
    description: z.string().min(2, 'Item description is required'),
    weightKg: z.number().positive('Weight must be a positive number'),
    dimensions: z.string().optional(),
  }),
  priceInfo: z.object({
    amount: z.number().min(1, 'Price must be greater than 0'),
    currency: z.string().default('ETB'),
    itemPrice: z.number().nonnegative().optional().default(0),
  }),
  paymentMethod: z.enum(['CASH', 'DIGITAL']).default('CASH'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
