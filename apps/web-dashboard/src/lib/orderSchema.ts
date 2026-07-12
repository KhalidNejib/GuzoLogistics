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
  customerName: z.string().min(2, 'Customer name is required'),
  customerPhone: z.string().min(8, 'Valid phone number is required'),
  itemDetails: z.object({
    description: z.string().min(2, 'Item description is required'),
    weightKg: z.number().positive('Weight must be a positive number'),
    dimensions: z.string().optional(),
  }),
  priceInfo: z.object({
    amount: z.number().min(1, 'Delivery fee must be greater than 0'),
    currency: z.string().default('ETB'),
    itemPrice: z.number().min(0).default(0),
  }),
  paymentMethod: z.enum(['CASH', 'DIGITAL']).default('CASH'),
});

export type CreateOrderInput = z.infer<typeof createOrderFormSchema>;
