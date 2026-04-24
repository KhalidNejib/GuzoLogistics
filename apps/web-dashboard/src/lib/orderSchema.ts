import { z } from 'zod';

export const createOrderFormSchema = z.object({
  pickupAddress: z.object({
    addressText: z.string().min(4, 'Pickup address must be at least 4 characters'),
    coordinates: z.tuple([
      z.number().min(-180).max(180), // Longitude
      z.number().min(-90).max(90), // Latitude
    ]),
  }),
  deliveryAddress: z.object({
    addressText: z.string().min(4, 'Delivery address must be at least 4 characters'),
    coordinates: z.tuple([
      z.number().min(-180).max(180), // Longitude
      z.number().min(-90).max(90), // Latitude
    ]),
  }),
  itemDetails: z.object({
    description: z.string().min(2, 'Item description is required'),
    weightKg: z.number().positive('Weight must be a positive number'),
    dimensions: z.string().optional(),
  }),
  priceInfo: z.object({
    amount: z.number().nonnegative('Price cannot be negative'),
    currency: z.string().default('ETB'),
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderFormSchema>;
