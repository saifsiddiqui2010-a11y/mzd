import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { SEED_PRODUCTS, SEED_PROMOTIONS } from '../data/seedCatalog';
import {
  BLUEPRINT_LIMITS,
  type Order,
  type OrderItem,
  type OrderStatus,
  type OrderTracking,
  type PaymentMethod,
  type PaymentStatus,
  type Product,
  type Promotion,
  type TrackingEvent,
  type UserProfile,
} from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { generateAuthCode, generateOrderNumber, getEstimatedDeliveryDate } from './paymentUtils';

function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function sanitizeSlug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, BLUEPRINT_LIMITS.productSlugMax);
  return cleaned || 'fragrance';
}

function sanitizeNotes(notes: string[]): string[] {
  const cleaned = notes
    .map((n) => clampString(n, BLUEPRINT_LIMITS.noteItemMax))
    .filter(Boolean)
    .slice(0, BLUEPRINT_LIMITS.notesMaxCount);
  return cleaned.length > 0 ? cleaned : ['Signature Accord'];
}

export function subscribeActiveProducts(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'products'), where('active', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Product[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Product, 'id'>),
      }));
      list.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
      onData(list);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'products');
      } catch (wrapped) {
        onError?.(wrapped as Error);
      }
    }
  );
}

export function subscribeAllProductsAdmin(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'products'),
    (snapshot) => {
      const list: Product[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Product, 'id'>),
      }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      onData(list);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'products');
      } catch (wrapped) {
        onError?.(wrapped as Error);
      }
    }
  );
}

export async function seedInitialCatalogIfNeeded(): Promise<boolean> {
  try {
    const existingProducts = await getDocs(collection(db, 'products'));
    const existingPromos = await getDocs(collection(db, 'promotions'));
    const batch = writeBatch(db);
    let wroteAny = false;

    if (existingProducts.empty) {
      for (const product of SEED_PRODUCTS) {
        const ref = doc(db, 'products', product.id);
        const { id: _id, ...payload } = product;
        batch.set(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      wroteAny = true;
    }

    if (existingPromos.empty) {
      for (const promo of SEED_PROMOTIONS) {
        const ref = doc(db, 'promotions', promo.code);
        batch.set(ref, {
          ...promo,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      wroteAny = true;
    }

    if (wroteAny) {
      await batch.commit();
    }
    return wroteAny;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'products');
  }
}

export async function saveProductAdmin(
  product: Omit<Product, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const safeId = isNew
    ? `mzd-${sanitizeSlug(product.slug || product.name)}-${Date.now().toString(36).slice(-4)}`
    : product.id;

  const basePayload = {
    name: clampString(product.name, BLUEPRINT_LIMITS.productNameMax),
    slug: sanitizeSlug(product.slug || product.name),
    subtitle: clampString(product.subtitle, BLUEPRINT_LIMITS.productSubtitleMax),
    category: product.category,
    concentration: product.concentration,
    price50ml: Math.max(1, Math.min(50000, Number(product.price50ml) || 1)),
    price100ml: Math.max(1, Math.min(50000, Number(product.price100ml) || 1)),
    stock: Math.max(0, Math.min(100000, Math.round(Number(product.stock) || 0))),
    featured: Boolean(product.featured),
    active: Boolean(product.active),
    imageUrl: clampString(product.imageUrl, BLUEPRINT_LIMITS.productImageMax),
    description: clampString(product.description, BLUEPRINT_LIMITS.productDescMax),
    topNotes: sanitizeNotes(product.topNotes),
    heartNotes: sanitizeNotes(product.heartNotes),
    baseNotes: sanitizeNotes(product.baseNotes),
    longevityHours: Math.max(1, Math.min(48, Math.round(Number(product.longevityHours) || 10))),
    sillage: product.sillage,
  };

  const path = `products/${safeId}`;
  try {
    const ref = doc(db, 'products', safeId);
    if (isNew) {
      await setDoc(ref, {
        ...basePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...basePayload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteProductAdmin(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function checkIsAdminDocument(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName: clampString(user.displayName || 'MZD Collector', BLUEPRINT_LIMITS.displayNameMax),
        email: clampString(user.email || 'collector@mzdperfumes.com', BLUEPRINT_LIMITS.emailMax),
        phone: '',
        addressLine: '',
        city: '',
        postalCode: '',
        country: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export async function updateUserProfile(
  uid: string,
  updates: Pick<
    UserProfile,
    'displayName' | 'phone' | 'addressLine' | 'city' | 'postalCode' | 'country'
  >
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: clampString(updates.displayName || 'MZD Collector', BLUEPRINT_LIMITS.displayNameMax),
      phone: clampString(updates.phone, BLUEPRINT_LIMITS.phoneMax),
      addressLine: clampString(updates.addressLine, BLUEPRINT_LIMITS.addressMax),
      city: clampString(updates.city, BLUEPRINT_LIMITS.cityMax),
      postalCode: clampString(updates.postalCode, BLUEPRINT_LIMITS.postalMax),
      country: clampString(updates.country, BLUEPRINT_LIMITS.countryMax),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeWishlist(
  uid: string,
  onData: (productIds: string[]) => void
): Unsubscribe {
  const path = `users/${uid}/wishlist`;
  const q = query(collection(db, 'users', uid, 'wishlist'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.id));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export async function toggleWishlistItem(
  uid: string,
  productId: string,
  currentlySaved: boolean
): Promise<void> {
  const path = `users/${uid}/wishlist/${productId}`;
  try {
    const ref = doc(db, 'users', uid, 'wishlist', productId);
    if (currentlySaved) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, {
        productId,
        userId: uid,
        addedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, currentlySaved ? OperationType.DELETE : OperationType.CREATE, path);
  }
}

export interface PlaceOrderInput {
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
  paymentLast4: string;
  paymentBrand: string;
}

export async function placeOrderAtomic(
  user: User,
  input: PlaceOrderInput
): Promise<{ orderId: string; orderNumber: string; authCode: string }> {
  const orderNumber = generateOrderNumber();
  const orderId = `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const authCode = input.paymentMethod === 'cod' ? 'COD-VERIFY' : generateAuthCode();
  const paymentStatus: PaymentStatus =
    input.paymentMethod === 'cod' ? 'pending_cod' : 'paid';
  const estimatedDelivery = getEstimatedDeliveryDate(4);
  const nowIso = new Date().toISOString();

  const initialEvents: TrackingEvent[] = [
    {
      stage: 'confirmed',
      title: 'Order Confirmed',
      location: 'MZD Perfumes Atelier',
      note:
        input.paymentMethod === 'cod'
          ? 'Cash on Delivery reservation verified. Queued for atelier compounding.'
          : `Payment authorized (${input.paymentBrand}${input.paymentLast4 ? ` •••• ${input.paymentLast4}` : ''}). Queued for atelier compounding.`,
      timestampIso: nowIso,
    },
  ];

  const orderDoc = {
    orderNumber,
    userId: user.uid,
    customerName: clampString(input.customerName, 120),
    customerEmail: clampString(input.customerEmail, BLUEPRINT_LIMITS.emailMax),
    customerPhone: clampString(input.customerPhone, BLUEPRINT_LIMITS.phoneMax),
    shippingAddress: clampString(input.shippingAddress, BLUEPRINT_LIMITS.shippingAddressMax),
    shippingCity: clampString(input.shippingCity, BLUEPRINT_LIMITS.cityMax),
    shippingPostalCode: clampString(input.shippingPostalCode, BLUEPRINT_LIMITS.postalMax),
    shippingCountry: clampString(input.shippingCountry, BLUEPRINT_LIMITS.countryMax),
    items: input.items.slice(0, 20),
    subtotal: Number(input.subtotal.toFixed(2)),
    discount: Number(input.discount.toFixed(2)),
    shippingFee: Number(input.shippingFee.toFixed(2)),
    total: Number(Math.max(0.01, input.total).toFixed(2)),
    promoCode: clampString(input.promoCode.toUpperCase(), BLUEPRINT_LIMITS.promoCodeMax),
    paymentMethod: input.paymentMethod,
    paymentStatus,
    paymentLast4: clampString(input.paymentLast4, 4),
    paymentBrand: clampString(input.paymentBrand, 30),
    paymentAuthCode: authCode,
    status: 'confirmed' as OrderStatus,
    carrier: 'MZD Insured Express',
    trackingCode: '',
    estimatedDelivery,
    trackingEvents: initialEvents,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const itemCount = input.items.reduce((sum, item) => sum + item.quantity, 0);

  const trackingDoc = {
    orderNumber,
    orderId,
    userId: user.uid,
    status: 'confirmed' as OrderStatus,
    carrier: 'MZD Insured Express',
    trackingCode: '',
    estimatedDelivery,
    destinationCity: clampString(input.shippingCity, BLUEPRINT_LIMITS.cityMax),
    itemCount: Math.max(1, Math.min(100, itemCount)),
    trackingEvents: initialEvents,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'orders', orderId), orderDoc);
    batch.set(doc(db, 'orderTracking', orderNumber), trackingDoc);
    await batch.commit();
    return { orderId, orderNumber, authCode };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
  }
}

export function subscribeUserOrders(
  uid: string,
  onData: (orders: Order[]) => void
): Unsubscribe {
  const q = query(collection(db, 'orders'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: Order[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Order, 'id'>),
      }));
      list.sort((a, b) => {
        const tA = a.createdAt?.toMillis?.() ?? 0;
        const tB = b.createdAt?.toMillis?.() ?? 0;
        return tB - tA;
      });
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'orders');
    }
  );
}

export function subscribeAllOrdersAdmin(
  onData: (orders: Order[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'orders'),
    (snap) => {
      const list: Order[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Order, 'id'>),
      }));
      list.sort((a, b) => {
        const tA = a.createdAt?.toMillis?.() ?? 0;
        const tB = b.createdAt?.toMillis?.() ?? 0;
        return tB - tA;
      });
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'orders');
    }
  );
}

export function subscribeOrderTrackingByNumber(
  orderNumber: string,
  onData: (tracking: OrderTracking | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const cleanCode = orderNumber.trim().toUpperCase();
  const path = `orderTracking/${cleanCode}`;
  return onSnapshot(
    doc(db, 'orderTracking', cleanCode),
    (snap) => {
      onData(snap.exists() ? (snap.data() as OrderTracking) : null);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, path);
      } catch (wrapped) {
        onError?.(wrapped as Error);
      }
    }
  );
}

export async function updateOrderFulfillmentAdmin(
  order: Order,
  updates: {
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    carrier: string;
    trackingCode: string;
    estimatedDelivery: string;
    eventTitle: string;
    eventLocation: string;
    eventNote: string;
  }
): Promise<void> {
  const newEvent: TrackingEvent = {
    stage: updates.status,
    title: clampString(updates.eventTitle, 80) || 'Status Updated',
    location: clampString(updates.eventLocation, 80) || 'MZD Perfumes Atelier',
    note: clampString(updates.eventNote, 240) || 'Shipment checkpoint updated by operations.',
    timestampIso: new Date().toISOString(),
  };

  const nextEvents = [...order.trackingEvents, newEvent].slice(-25);
  const carrier = clampString(updates.carrier, BLUEPRINT_LIMITS.carrierMax);
  const trackingCode = clampString(updates.trackingCode, BLUEPRINT_LIMITS.trackingCodeMax);
  const estimatedDelivery = clampString(
    updates.estimatedDelivery,
    BLUEPRINT_LIMITS.estimatedDeliveryMax
  );

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'orders', order.id), {
      status: updates.status,
      paymentStatus: updates.paymentStatus,
      carrier,
      trackingCode,
      estimatedDelivery,
      trackingEvents: nextEvents,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'orderTracking', order.orderNumber), {
      status: updates.status,
      carrier,
      trackingCode,
      estimatedDelivery,
      trackingEvents: nextEvents,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
  }
}

export async function cancelOrderByCustomerAtomic(order: Order): Promise<void> {
  const cancelEvent: TrackingEvent = {
    stage: 'cancelled',
    title: 'Order Cancelled by Customer',
    location: 'Customer Account',
    note: 'Cancelled prior to atelier compounding. Any authorized card charge will be released automatically.',
    timestampIso: new Date().toISOString(),
  };
  const nextEvents = [...order.trackingEvents, cancelEvent].slice(-25);

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'orders', order.id), {
      status: 'cancelled',
      trackingEvents: nextEvents,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'orderTracking', order.orderNumber), {
      status: 'cancelled',
      trackingEvents: nextEvents,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
  }
}

export async function lookupPromoCode(rawCode: string): Promise<Promotion | null> {
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (code.length < 2 || code.length > BLUEPRINT_LIMITS.promoCodeMax) return null;
  try {
    const snap = await getDoc(doc(db, 'promotions', code));
    if (snap.exists()) {
      const promo = snap.data() as Promotion;
      return promo.active ? promo : null;
    }
  } catch {
    // Fall back to default seeded promo codes if database has not been seeded yet
  }
  const fallback = SEED_PROMOTIONS.find((p) => p.code === code && p.active);
  return fallback ?? null;
}

export function subscribePromotionsAdmin(onData: (promos: Promotion[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'promotions'),
    (snap) => {
      const list: Promotion[] = snap.docs.map((d) => d.data() as Promotion);
      list.sort((a, b) => a.code.localeCompare(b.code));
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'promotions');
    }
  );
}

export async function savePromotionAdmin(
  promo: Omit<Promotion, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const code = promo.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
  const path = `promotions/${code}`;
  const payload = {
    code,
    discountPercent: Math.max(1, Math.min(70, Math.round(Number(promo.discountPercent) || 10))),
    minOrderAmount: Math.max(0, Math.min(50000, Number(promo.minOrderAmount) || 0)),
    active: Boolean(promo.active),
    description: clampString(promo.description, BLUEPRINT_LIMITS.promoDescMax) || `${promo.discountPercent}% off`,
  };
  try {
    const ref = doc(db, 'promotions', code);
    if (isNew) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        discountPercent: payload.discountPercent,
        minOrderAmount: payload.minOrderAmount,
        active: payload.active,
        description: payload.description,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deletePromotionAdmin(code: string): Promise<void> {
  const path = `promotions/${code}`;
  try {
    await deleteDoc(doc(db, 'promotions', code));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeUsersAdmin(onData: (users: UserProfile[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const list: UserProfile[] = snap.docs.map((d) => d.data() as UserProfile);
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }
  );
}
