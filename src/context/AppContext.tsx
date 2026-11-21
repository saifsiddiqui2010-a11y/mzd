import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SEED_PRODUCTS } from '../data/seedCatalog';
import { auth, googleProvider } from '../lib/firebase';
import {
  checkIsAdminDocument,
  ensureUserProfile,
  seedInitialCatalogIfNeeded,
  subscribeActiveProducts,
  subscribeUserOrders,
  subscribeUserProfile,
  subscribeWishlist,
  toggleWishlistItem,
} from '../lib/storeService';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  type AppRoute,
  type CartItem,
  type Order,
  type Product,
  type UserProfile,
} from '../types';

const CART_STORAGE_KEY = 'mzd_perfumes_bag_v1';

interface ToastMessage {
  id: number;
  text: string;
  tone: 'default' | 'error';
}

interface AppContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  profile: UserProfile | null;
  products: Product[];
  productsLoading: boolean;
  isCatalogSeeded: boolean;
  userOrders: Order[];
  wishlistIds: string[];
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, sizeMl: 50 | 100, quantity?: number) => void;
  updateCartQuantity: (productId: string, sizeMl: 50 | 100, delta: number) => void;
  removeFromCart: (productId: string, sizeMl: 50 | 100) => void;
  clearCart: () => void;
  route: AppRoute;
  selectedProductSlug: string | null;
  trackingLookupNumber: string;
  setTrackingLookupNumber: (code: string) => void;
  navigate: (nextRoute: AppRoute, options?: { productSlug?: string; orderNumber?: string; scrollToId?: string }) => void;
  signInWithGoogle: () => Promise<User | null>;
  signOutUser: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  toast: ToastMessage | null;
  showToast: (text: string, tone?: 'default' | 'error') => void;
  dismissToast: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadStoredCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>(loadStoredCart);
  const [cartOpen, setCartOpen] = useState(false);

  const [route, setRoute] = useState<AppRoute>(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash.startsWith('admin')) return 'admin';
    if (hash.startsWith('track')) return 'track';
    if (hash.startsWith('account')) return 'account';
    if (hash.startsWith('product/')) return 'product';
    return 'home';
  });

  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash.startsWith('product/')) return hash.slice('product/'.length) || null;
    return null;
  });

  const [trackingLookupNumber, setTrackingLookupNumber] = useState<string>(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash.startsWith('track/')) return decodeURIComponent(hash.slice('track/'.length));
    return '';
  });

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const seededOnceRef = useRef(false);

  const showToast = useCallback((text: string, tone: 'default' | 'error' = 'default') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now(), text, tone });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3600);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  // Persist cart to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  // Listen to browser hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash.startsWith('admin')) {
        setRoute('admin');
      } else if (hash.startsWith('track/')) {
        setTrackingLookupNumber(decodeURIComponent(hash.slice('track/'.length)));
        setRoute('track');
      } else if (hash === 'track') {
        setRoute('track');
      } else if (hash === 'account') {
        setRoute('account');
      } else if (hash.startsWith('product/')) {
        setSelectedProductSlug(hash.slice('product/'.length) || null);
        setRoute('product');
      } else {
        setRoute('home');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Subscribe to public active products catalog
  useEffect(() => {
    const unsub = subscribeActiveProducts(
      (list) => {
        setFirestoreProducts(list);
        setProductsLoading(false);
      },
      () => {
        setProductsLoading(false);
      }
    );
    return unsub;
  }, []);

  // Firebase Authentication state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setIsAdmin(false);
        setProfile(null);
        setUserOrders([]);
        setWishlistIds([]);
        setAuthReady(true);
        return;
      }

      const bootstrapped =
        Boolean(nextUser.emailVerified) &&
        nextUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

      let adminFlag = bootstrapped;
      if (!adminFlag && nextUser.emailVerified) {
        adminFlag = await checkIsAdminDocument(nextUser.uid);
      }
      setIsAdmin(adminFlag);

      try {
        await ensureUserProfile(nextUser);
      } catch (err) {
        console.error('Failed to ensure user profile:', err);
      }

      if (adminFlag && !seededOnceRef.current) {
        seededOnceRef.current = true;
        try {
          await seedInitialCatalogIfNeeded();
        } catch (err) {
          console.error('Initial catalog seed skipped:', err);
        }
      }

      setAuthReady(true);
    });

    return unsub;
  }, []);

  // Authenticated user subscriptions (Profile, Orders, Wishlist)
  useEffect(() => {
    if (!authReady || !user) return;
    const unsubProfile = subscribeUserProfile(user.uid, setProfile);
    const unsubOrders = subscribeUserOrders(user.uid, setUserOrders);
    const unsubWishlist = subscribeWishlist(user.uid, setWishlistIds);
    return () => {
      unsubProfile();
      unsubOrders();
      unsubWishlist();
    };
  }, [authReady, user]);

  const products = useMemo(() => {
    return firestoreProducts.length > 0 ? firestoreProducts : SEED_PRODUCTS;
  }, [firestoreProducts]);

  const isCatalogSeeded = firestoreProducts.length > 0;

  const navigate = useCallback(
    (
      nextRoute: AppRoute,
      options?: { productSlug?: string; orderNumber?: string; scrollToId?: string }
    ) => {
      if (nextRoute === 'product' && options?.productSlug) {
        setSelectedProductSlug(options.productSlug);
        window.location.hash = `#/product/${options.productSlug}`;
      } else if (nextRoute === 'track' && options?.orderNumber) {
        setTrackingLookupNumber(options.orderNumber);
        window.location.hash = `#/track/${encodeURIComponent(options.orderNumber)}`;
      } else if (nextRoute === 'home') {
        window.location.hash = '#/';
      } else {
        window.location.hash = `#/${nextRoute}`;
      }

      setRoute(nextRoute);

      if (options?.scrollToId) {
        window.setTimeout(() => {
          const el = document.getElementById(options.scrollToId!);
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    []
  );

  const addToCart = useCallback(
    (product: Product, sizeMl: 50 | 100, quantity = 1) => {
      if (product.stock <= 0) {
        showToast(`${product.name} is currently out of stock.`, 'error');
        return;
      }
      const unitPrice = sizeMl === 100 ? product.price100ml : product.price50ml;
      setCart((prev) => {
        const idx = prev.findIndex(
          (item) => item.productId === product.id && item.sizeMl === sizeMl
        );
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            quantity: Math.min(product.stock, updated[idx].quantity + quantity),
          };
          return updated;
        }
        return [
          ...prev,
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            concentration: product.concentration,
            sizeMl,
            unitPrice,
            quantity: Math.min(product.stock, quantity),
            imageUrl: product.imageUrl,
          },
        ];
      });
      showToast(`Added ${product.name} (${sizeMl} ml) to your bag.`);
    },
    [showToast]
  );

  const updateCartQuantity = useCallback(
    (productId: string, sizeMl: 50 | 100, delta: number) => {
      setCart((prev) =>
        prev
          .map((item) => {
            if (item.productId === productId && item.sizeMl === sizeMl) {
              return { ...item, quantity: item.quantity + delta };
            }
            return item;
          })
          .filter((item) => item.quantity > 0)
      );
    },
    []
  );

  const removeFromCart = useCallback((productId: string, sizeMl: 50 | 100) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.sizeMl === sizeMl))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      showToast(`Welcome, ${result.user.displayName || 'Collector'}.`);
      return result.user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in cancelled.';
      if (!msg.includes('popup-closed-by-user')) {
        showToast('Could not complete Google Sign-In. Please try again.', 'error');
      }
      return null;
    }
  }, [showToast]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    showToast('Signed out of your MZD Perfumes account.');
  }, [showToast]);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!user) {
        showToast('Sign in with Google to save fragrances to your wishlist.');
        await signInWithGoogle();
        return;
      }
      if (!isCatalogSeeded) {
        showToast('Wishlist sync activates once the catalog is initialized by an admin.');
        return;
      }
      const currentlySaved = wishlistIds.includes(productId);
      try {
        await toggleWishlistItem(user.uid, productId, currentlySaved);
        showToast(
          currentlySaved ? 'Removed from saved fragrances.' : 'Saved to your fragrance wishlist.'
        );
      } catch {
        showToast('Unable to update wishlist right now.', 'error');
      }
    },
    [isCatalogSeeded, showToast, signInWithGoogle, user, wishlistIds]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );

  const value: AppContextValue = {
    user,
    authReady,
    isAdmin,
    profile,
    products,
    productsLoading,
    isCatalogSeeded,
    userOrders,
    wishlistIds,
    cart,
    cartCount,
    cartSubtotal,
    cartOpen,
    setCartOpen,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    route,
    selectedProductSlug,
    trackingLookupNumber,
    setTrackingLookupNumber,
    navigate,
    signInWithGoogle,
    signOutUser,
    toggleWishlist,
    toast,
    showToast,
    dismissToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
