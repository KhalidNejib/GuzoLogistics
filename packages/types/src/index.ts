export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  ARRIVED_PICKUP = 'ARRIVED_PICKUP',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED_DELIVERY = 'ARRIVED_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  /** @deprecated use ARRIVED_PICKUP or ARRIVED_DELIVERY */
  ARRIVED = 'ARRIVED'
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  addressText?: string;
  shortName?: string;
  coordinates?: number[]; // [lng, lat]
  location?: {
    type: string;
    coordinates: number[]; // [lng, lat]
  };
}

export interface Order {
  _id: string;
  status: OrderStatus;
  pickupAddress: Address;
  deliveryAddress: Address;
  priceInfo?: {
    amount: number;
  };
  itemDetails?: {
    isPickedUp?: boolean;
    weightKg?: number;
  };
  distanceKm?: number;
  customerName?: string;
  customerPhone?: string;
  cargoInfo?: {
    type?: string;
    weight?: number;
  };
  paymentMethod?: string;
}
