import type { Timestamp } from 'firebase/firestore';

export type FragranceCategory =
  | 'Oud & Wood'
  | 'Floral'
  | 'Amber & Spice'
  | 'Fresh Citrus';

export type FragranceConcentration =
  | 'Extrait de Parfum'
  | 'Eau de Parfum'
  | 'Parfum Intense';

export type SillageLevel = 'Intimate' | 'Moderate' | 'Strong' | 'Enormous';

export type PaymentMethod = 'card' | 'apple_pay' | 'cod';
export type PaymentStatus = 'paid' | 'pending_cod' | 'refunded';

export type OrderStatus =
  | 'confirmed'
  | 'compounding'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type AppRoute = 'home' | 'product' | 'track' | 'account' | 'admin';

export interface Product {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  category: FragranceCategory;
  concentration: FragranceConcentration;
  price50ml: number;
  price100ml: number;
  stock: number;
  featured: boolean;
  active: boolean;
  imageUrl: string;
  description: string;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  longevityHours: number;
  sillage: SillageLevel;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  country: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  concentration: string;
  sizeMl: 50 | 100;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  sizeMl: 50 | 100;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}

export interface TrackingEvent {
  stage: OrderStatus;
  title: string;
  location: string;
  note: string;
  timestampIso: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  promoCode: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentLast4: string;
  paymentBrand: string;
  paymentAuthCode: string;
  status: OrderStatus;
  carrier: string;
  trackingCode: string;
  estimatedDelivery: string;
  trackingEvents: TrackingEvent[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface OrderTracking {
  orderNumber: string;
  orderId: string;
  userId: string;
  status: OrderStatus;
  carrier: string;
  trackingCode: string;
  estimatedDelivery: string;
  destinationCity: string;
  itemCount: number;
  trackingEvents: TrackingEvent[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Promotion {
  code: string;
  discountPercent: number;
  minOrderAmount: number;
  active: boolean;
  description: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Verbatim validation constants synchronized with firebase-blueprint.json & firestore.rules
 */
export const BLUEPRINT_LIMITS = {
  productNameMax: 100,
  productSlugMax: 100,
  productSubtitleMax: 140,
  productDescMax: 1500,
  productImageMax: 500,
  notesMaxCount: 6,
  noteItemMax: 80,
  displayNameMax: 100,
  emailMax: 200,
  phoneMax: 30,
  addressMax: 200,
  shippingAddressMax: 300,
  cityMax: 100,
  postalMax: 24,
  countryMax: 80,
  promoCodeMax: 32,
  promoDescMax: 140,
  carrierMax: 60,
  trackingCodeMax: 60,
  estimatedDeliveryMax: 40,
  slugPattern: /^[a-z0-9-]+$/,
  orderNumberPattern: /^MZD-[0-9]{4}-[A-Z0-9]{4,8}$/,
  promoCodePattern: /^[A-Z0-9_-]+$/,
} as const;

export const BOOTSTRAPPED_ADMIN_EMAIL = 'saif.siddiqui2010@gmail.com';
export const FREE_SHIPPING_THRESHOLD = 180;
export const STANDARD_SHIPPING_FEE = 18;
