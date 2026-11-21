import {
  ArrowLeft,
  BarChart3,
  Database,
  Edit3,
  ExternalLink,
  Menu,
  Package,
  Plus,
  Search,
  ShieldAlert,
  Tag,
  Trash2,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { BRAND_IMAGES, PRESET_BOTTLE_OPTIONS } from '../data/seedCatalog';
import {
  formatCurrency,
  formatOrderDate,
  generateCarrierTrackingCode,
} from '../lib/paymentUtils';
import {
  deleteProductAdmin,
  deletePromotionAdmin,
  saveProductAdmin,
  savePromotionAdmin,
  seedInitialCatalogIfNeeded,
  subscribeAllOrdersAdmin,
  subscribeAllProductsAdmin,
  subscribePromotionsAdmin,
  subscribeUsersAdmin,
  updateOrderFulfillmentAdmin,
} from '../lib/storeService';
import type {
  FragranceCategory,
  FragranceConcentration,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  Promotion,
  SillageLevel,
  UserProfile,
} from '../types';
import { SafeImage } from './SafeImage';

type AdminTab = 'overview' | 'orders' | 'catalog' | 'customers' | 'promotions';

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string; defaultTitle: string; defaultLocation: string }[] = [
  {
    value: 'confirmed',
    label: 'Confirmed',
    defaultTitle: 'Order Verified',
    defaultLocation: 'MZD Operations Desk',
  },
  {
    value: 'compounding',
    label: 'Compounding',
    defaultTitle: 'Atelier Compounding Started',
    defaultLocation: 'MZD Perfumes Lab',
  },
  {
    value: 'packed',
    label: 'Quality Sealed',
    defaultTitle: 'Quality Inspection & Wax Seal Complete',
    defaultLocation: 'MZD Fulfillment Vault',
  },
  {
    value: 'shipped',
    label: 'In Transit',
    defaultTitle: 'Handed to Insured Express Courier',
    defaultLocation: 'International Dispatch Hub',
  },
  {
    value: 'delivered',
    label: 'Delivered',
    defaultTitle: 'Delivered & Signed by Recipient',
    defaultLocation: 'Destination Address',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    defaultTitle: 'Order Cancelled by Operations',
    defaultLocation: 'MZD Operations Desk',
  },
];

function getStatusTextClass(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return 'text-[#15803D] font-medium';
    case 'shipped':
      return 'text-[#1D4ED8] font-medium';
    case 'compounding':
    case 'packed':
      return 'text-[#B45309] font-medium';
    case 'cancelled':
      return 'text-[#B91C1C] font-medium';
    default:
      return 'text-[#141413] font-medium';
  }
}

interface ProductFormState {
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
  topNotesText: string;
  heartNotesText: string;
  baseNotesText: string;
  longevityHours: number;
  sillage: SillageLevel;
}

const EMPTY_PRODUCT_FORM: ProductFormState = {
  id: '',
  name: '',
  slug: '',
  subtitle: '',
  category: 'Oud & Wood',
  concentration: 'Extrait de Parfum',
  price50ml: 220,
  price100ml: 340,
  stock: 20,
  featured: false,
  active: true,
  imageUrl: BRAND_IMAGES.aureumOud,
  description: '',
  topNotesText: 'Bergamot, Saffron',
  heartNotesText: 'Assam Oud, Rose',
  baseNotesText: 'Sandalwood, Amber',
  longevityHours: 12,
  sillage: 'Strong',
};

export function AdminDashboard() {
  const { user, authReady, isAdmin, signInWithGoogle, signOutUser, navigate, showToast } = useApp();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminPromos, setAdminPromos] = useState<Promotion[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Order management state
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<OrderStatus>('confirmed');
  const [editPaymentStatus, setEditPaymentStatus] = useState<PaymentStatus>('paid');
  const [editCarrier, setEditCarrier] = useState('DHL Express');
  const [editTrackingCode, setEditTrackingCode] = useState('');
  const [editEstDelivery, setEditEstDelivery] = useState('');
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventLocation, setEditEventLocation] = useState('');
  const [editEventNote, setEditEventNote] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  // Product modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(true);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [savingProduct, setSavingProduct] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Promotion form state
  const [promoCode, setPromoCode] = useState('');
  const [promoPercent, setPromoPercent] = useState(15);
  const [promoMinOrder, setPromoMinOrder] = useState(150);
  const [promoDesc, setPromoDesc] = useState('');
  const [savingPromo, setSavingPromo] = useState(false);

  // Subscribe to all live admin collections once verified as Admin
  useEffect(() => {
    if (!authReady || !user || !isAdmin) return;
    setLoadingData(true);
    const unsubProducts = subscribeAllProductsAdmin((list) => {
      setAdminProducts(list);
      setLoadingData(false);
    });
    const unsubOrders = subscribeAllOrdersAdmin(setAdminOrders);
    const unsubUsers = subscribeUsersAdmin(setAdminUsers);
    const unsubPromos = subscribePromotionsAdmin(setAdminPromos);
    return () => {
      unsubProducts();
      unsubOrders();
      unsubUsers();
      unsubPromos();
    };
  }, [authReady, isAdmin, user]);

  const selectedOrder = useMemo(
    () => adminOrders.find((o) => o.id === selectedOrderId) ?? null,
    [adminOrders, selectedOrderId]
  );

  // Sync Order Inspector fields when an order is selected
  useEffect(() => {
    if (!selectedOrder) return;
    setEditStatus(selectedOrder.status);
    setEditPaymentStatus(selectedOrder.paymentStatus);
    setEditCarrier(selectedOrder.carrier || 'DHL Express');
    setEditTrackingCode(selectedOrder.trackingCode || '');
    setEditEstDelivery(selectedOrder.estimatedDelivery || '');
    const meta = ORDER_STATUS_OPTIONS.find((o) => o.value === selectedOrder.status);
    setEditEventTitle(meta?.defaultTitle || 'Status Updated');
    setEditEventLocation(meta?.defaultLocation || 'MZD Perfumes Atelier');
    setEditEventNote('');
  }, [selectedOrder]);

  // Live KPIs
  const metrics = useMemo(() => {
    const validOrders = adminOrders.filter((o) => o.status !== 'cancelled');
    const grossRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
    const activeOrdersCount = adminOrders.filter(
      (o) => !['delivered', 'cancelled'].includes(o.status)
    ).length;
    const lowStockCount = adminProducts.filter((p) => p.stock <= 10).length;
    const avgOrderValue = validOrders.length > 0 ? grossRevenue / validOrders.length : 0;

    const statusCounts: Record<OrderStatus, number> = {
      confirmed: 0,
      compounding: 0,
      packed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of adminOrders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }

    return {
      grossRevenue,
      activeOrdersCount,
      lowStockCount,
      avgOrderValue,
      statusCounts,
      totalOrders: adminOrders.length,
    };
  }, [adminOrders, adminProducts]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return adminOrders.filter((o) => {
      if (orderFilter !== 'all' && o.status !== orderFilter) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.shippingCity.toLowerCase().includes(q)
      );
    });
  }, [adminOrders, orderFilter, orderSearch]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return adminProducts;
    return adminProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.concentration.toLowerCase().includes(q)
    );
  }, [adminProducts, catalogSearch]);

  const handleSeedCatalog = async () => {
    setSeeding(true);
    try {
      const wrote = await seedInitialCatalogIfNeeded();
      showToast(
        wrote
          ? 'Seeded MZD Perfumes signature collection & promotions.'
          : 'Catalog is already populated.'
      );
    } catch {
      showToast('Failed to seed catalog.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleStatusSelectChange = (nextStatus: OrderStatus) => {
    setEditStatus(nextStatus);
    const meta = ORDER_STATUS_OPTIONS.find((o) => o.value === nextStatus);
    if (meta) {
      setEditEventTitle(meta.defaultTitle);
      setEditEventLocation(meta.defaultLocation);
    }
    if (nextStatus === 'shipped' && !editTrackingCode) {
      setEditTrackingCode(generateCarrierTrackingCode(editCarrier));
    }
    if (nextStatus === 'delivered' && editPaymentStatus === 'pending_cod') {
      setEditPaymentStatus('paid');
    }
  };

  const handleSaveOrderUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingOrder(true);
    try {
      await updateOrderFulfillmentAdmin(selectedOrder, {
        status: editStatus,
        paymentStatus: editPaymentStatus,
        carrier: editCarrier,
        trackingCode: editTrackingCode,
        estimatedDelivery: editEstDelivery,
        eventTitle: editEventTitle || 'Fulfillment Updated',
        eventLocation: editEventLocation || 'MZD Perfumes Atelier',
        eventNote:
          editEventNote.trim() ||
          `Order transitioned to ${editStatus}${editTrackingCode ? ` · Tracking ${editTrackingCode}` : ''}.`,
      });
      setEditEventNote('');
      showToast(`Order ${selectedOrder.orderNumber} updated live.`);
    } catch {
      showToast('Failed to update order status.', 'error');
    } finally {
      setSavingOrder(false);
    }
  };

  const openNewProductModal = () => {
    setIsNewProduct(true);
    setProductForm(EMPTY_PRODUCT_FORM);
    setProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setIsNewProduct(false);
    setProductForm({
      id: product.id,
      name: product.name,
      slug: product.slug,
      subtitle: product.subtitle,
      category: product.category,
      concentration: product.concentration,
      price50ml: product.price50ml,
      price100ml: product.price100ml,
      stock: product.stock,
      featured: product.featured,
      active: product.active,
      imageUrl: product.imageUrl,
      description: product.description,
      topNotesText: product.topNotes.join(', '),
      heartNotesText: product.heartNotes.join(', '),
      baseNotesText: product.baseNotes.join(', '),
      longevityHours: product.longevityHours,
      sillage: product.sillage,
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const splitNotes = (raw: string) =>
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

      await saveProductAdmin(
        {
          id: productForm.id,
          name: productForm.name,
          slug: productForm.slug || productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          subtitle: productForm.subtitle,
          category: productForm.category,
          concentration: productForm.concentration,
          price50ml: Number(productForm.price50ml),
          price100ml: Number(productForm.price100ml),
          stock: Number(productForm.stock),
          featured: productForm.featured,
          active: productForm.active,
          imageUrl: productForm.imageUrl,
          description: productForm.description,
          topNotes: splitNotes(productForm.topNotesText),
          heartNotes: splitNotes(productForm.heartNotesText),
          baseNotes: splitNotes(productForm.baseNotesText),
          longevityHours: Number(productForm.longevityHours),
          sillage: productForm.sillage,
        },
        isNewProduct
      );
      setProductModalOpen(false);
      showToast(isNewProduct ? 'Fragrance added to catalog.' : 'Fragrance updated.');
    } catch {
      showToast('Could not save fragrance. Verify all required fields.', 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleQuickStockChange = async (product: Product, delta: number) => {
    const nextStock = Math.max(0, product.stock + delta);
    try {
      await saveProductAdmin({ ...product, stock: nextStock }, false);
    } catch {
      showToast('Failed to update stock count.', 'error');
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteProductAdmin(product.id);
      showToast(`Removed ${product.name} from catalog.`);
    } catch {
      showToast('Failed to delete fragrance.', 'error');
    }
  };

  const handleCreatePromo = async (e: FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setSavingPromo(true);
    try {
      await savePromotionAdmin(
        {
          code: promoCode.trim().toUpperCase(),
          discountPercent: promoPercent,
          minOrderAmount: promoMinOrder,
          active: true,
          description: promoDesc.trim() || `${promoPercent}% privilege discount`,
        },
        true
      );
      setPromoCode('');
      setPromoDesc('');
      showToast('Promotion created.');
    } catch {
      showToast('Failed to create promo code.', 'error');
    } finally {
      setSavingPromo(false);
    }
  };

  const handleTogglePromo = async (promo: Promotion) => {
    try {
      await savePromotionAdmin({ ...promo, active: !promo.active }, false);
      showToast(`${promo.code} ${promo.active ? 'paused' : 'activated'}.`);
    } catch {
      showToast('Failed to update promo status.', 'error');
    }
  };

  // Auth / Admin Gate View
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center text-sm text-[#57534E]">
        Verifying administrator session...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#121214] text-[#F5F5F4] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#18181B] border border-white/10 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-serif text-2xl text-white">MZD Perfumes</span>
            <span className="text-xs text-[#C5A472]">Admin Console</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#C5A472]">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
              <h1 className="font-sans text-lg font-semibold text-white">
                {user ? 'Administrator Access Required' : 'Sign in to Operations Console'}
              </h1>
            </div>
            <p className="text-sm text-[#A8A29E] leading-relaxed">
              {user
                ? `Signed in as ${user.email}. This account is not listed in the MZD Perfumes administrator registry.`
                : 'Authenticate with an authorized MZD Perfumes administrator Google account to manage orders, live fulfillment tracking, inventory, and promotions.'}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {!user ? (
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="w-full py-3 text-sm font-medium bg-white text-[#141413] hover:bg-[#E7E5E0] transition-colors cursor-pointer"
              >
                Sign in with Google
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="w-full py-3 text-sm font-medium bg-white text-[#141413] hover:bg-[#E7E5E0] transition-colors cursor-pointer"
              >
                Switch Account
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('home')}
              className="w-full py-2.5 text-xs font-medium border border-white/15 text-[#D6D3D1] hover:text-white transition-colors cursor-pointer"
            >
              ← Return to Customer Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navLinks: { id: AdminTab; label: string; icon: typeof BarChart3; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'orders', label: 'Orders', icon: Truck, count: metrics.activeOrdersCount },
    { id: 'catalog', label: 'Fragrances', icon: Package, count: adminProducts.length },
    { id: 'customers', label: 'Customers', icon: Users, count: adminUsers.length },
    { id: 'promotions', label: 'Promotions', icon: Tag, count: adminPromos.length },
  ];

  const tabTitle = navLinks.find((n) => n.id === tab)?.label ?? 'Overview';

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#141413] flex">
      {/* Separate Obsidian Admin Sidebar (Desktop + Mobile Overlay) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#121214] text-[#E7E5E4] flex flex-col border-r border-white/10 transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 shrink-0">
          <div>
            <p className="font-serif text-xl font-medium text-white leading-none">MZD Perfumes</p>
            <p className="text-[11px] text-[#A8A29E] mt-1">Operations Console</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="lg:hidden text-[#A8A29E] hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav aria-label="Admin navigation" className="flex-1 p-4 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-[#A8A29E] hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && (
                  <span className="font-mono text-xs text-[#A8A29E] tabular-nums">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="px-2">
            <p className="text-xs font-medium text-white truncate">{user.displayName}</p>
            <p className="text-[11px] text-[#A8A29E] truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('home')}
            className="w-full px-3.5 py-2 text-xs font-medium border border-white/15 text-[#E7E5E4] hover:bg-white/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>View Storefront</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Contextual Admin Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E7E5E0] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin sidebar"
              className="lg:hidden w-10 h-10 flex items-center justify-center border border-[#E7E5E0] text-[#141413] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-[#78716C] hidden sm:inline">Admin</span>
              <span className="text-[#D6D3CD] hidden sm:inline">/</span>
              <h1 className="font-sans text-base font-semibold text-[#141413] truncate">
                {tabTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {adminProducts.length === 0 && !loadingData && (
              <button
                type="button"
                disabled={seeding}
                onClick={() => void handleSeedCatalog()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-[#9A7B4F] text-[#7E633D] hover:bg-[#9A7B4F]/10 whitespace-nowrap cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{seeding ? 'Seeding...' : 'Seed Catalog'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={openNewProductModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#141413] text-white hover:bg-[#2B2A28] whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Fragrance</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* TAB 1: OVERVIEW */}
          {tab === 'overview' && (
            <>
              {/* 4-Column KPI Strip */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E7E5E0] p-5">
                  <p className="text-xs text-[#78716C]">Gross Revenue</p>
                  <p className="font-mono text-2xl font-medium text-[#141413] mt-2 tabular-nums">
                    {formatCurrency(metrics.grossRevenue)}
                  </p>
                  <p className="text-xs text-[#57534E] mt-1 tabular-nums">
                    Across {metrics.totalOrders} total orders
                  </p>
                </div>

                <div className="bg-white border border-[#E7E5E0] p-5">
                  <p className="text-xs text-[#78716C]">Active Fulfillment Queue</p>
                  <p className="font-mono text-2xl font-medium text-[#141413] mt-2 tabular-nums">
                    {metrics.activeOrdersCount}
                  </p>
                  <p className="text-xs text-[#57534E] mt-1 tabular-nums">
                    {metrics.statusCounts.confirmed} awaiting compounding
                  </p>
                </div>

                <div className="bg-white border border-[#E7E5E0] p-5">
                  <p className="text-xs text-[#78716C]">Average Order Value</p>
                  <p className="font-mono text-2xl font-medium text-[#141413] mt-2 tabular-nums">
                    {formatCurrency(metrics.avgOrderValue)}
                  </p>
                  <p className="text-xs text-[#57534E] mt-1">Excludes cancelled orders</p>
                </div>

                <div className="bg-white border border-[#E7E5E0] p-5">
                  <p className="text-xs text-[#78716C]">Low Stock Alerts</p>
                  <p
                    className={`font-mono text-2xl font-medium mt-2 tabular-nums ${
                      metrics.lowStockCount > 0 ? 'text-[#B45309]' : 'text-[#15803D]'
                    }`}
                  >
                    {metrics.lowStockCount}
                  </p>
                  <p className="text-xs text-[#57534E] mt-1">
                    SKUs with 10 or fewer flacons left
                  </p>
                </div>
              </section>

              {/* Pipeline Breakdown & Recent Orders */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <section className="lg:col-span-5 bg-white border border-[#E7E5E0] p-6 space-y-5">
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-sans text-sm font-semibold text-[#141413]">
                      Fulfillment Pipeline
                    </h2>
                    <span className="text-xs text-[#78716C] tabular-nums">
                      {metrics.totalOrders} orders
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {ORDER_STATUS_OPTIONS.map((stage) => {
                      const count = metrics.statusCounts[stage.value];
                      const pct =
                        metrics.totalOrders > 0 ? Math.round((count / metrics.totalOrders) * 100) : 0;
                      return (
                        <div key={stage.value} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#57534E]">{stage.label}</span>
                            <span className="font-mono text-[#141413] tabular-nums">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 bg-[#F0EEE9] overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                stage.value === 'cancelled'
                                  ? 'bg-[#DC2626]'
                                  : stage.value === 'delivered'
                                    ? 'bg-[#15803D]'
                                    : 'bg-[#9A7B4F]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="lg:col-span-7 bg-white border border-[#E7E5E0]">
                  <div className="px-6 py-4 border-b border-[#F0EEE9] flex items-center justify-between">
                    <h2 className="font-sans text-sm font-semibold text-[#141413]">
                      Latest Orders
                    </h2>
                    <button
                      type="button"
                      onClick={() => setTab('orders')}
                      className="text-xs font-medium text-[#9A7B4F] hover:text-[#141413] cursor-pointer"
                    >
                      Manage all orders →
                    </button>
                  </div>

                  {adminOrders.length === 0 ? (
                    <div className="p-10 text-center text-sm text-[#78716C]">
                      No customer orders yet. Place a test order from the storefront to see live
                      fulfillment data appear instantaneously.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#E7E5E0] text-[#78716C]">
                            <th className="py-3 px-4 font-medium">Order #</th>
                            <th className="py-3 px-4 font-medium">Customer</th>
                            <th className="py-3 px-4 font-medium">Status</th>
                            <th className="py-3 px-4 font-medium text-right">Total</th>
                            <th className="py-3 px-4 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F4F3F0]">
                          {adminOrders.slice(0, 6).map((ord) => (
                            <tr key={ord.id} className="hover:bg-[#FAFAF9]">
                              <td className="py-3 px-4 font-mono text-[#141413]">
                                {ord.orderNumber}
                              </td>
                              <td className="py-3 px-4 text-[#57534E]">{ord.customerName}</td>
                              <td className={`py-3 px-4 capitalize ${getStatusTextClass(ord.status)}`}>
                                {ord.status === 'packed' ? 'Quality Sealed' : ord.status}
                              </td>
                              <td className="py-3 px-4 font-mono text-right tabular-nums text-[#141413]">
                                {formatCurrency(ord.total)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderId(ord.id);
                                    setTab('orders');
                                  }}
                                  className="text-[#141413] underline hover:text-[#9A7B4F] cursor-pointer"
                                >
                                  Fulfill
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {/* TAB 2: ORDERS & REAL-TIME FULFILLMENT */}
          {tab === 'orders' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className={selectedOrder ? 'xl:col-span-7 space-y-4' : 'xl:col-span-12 space-y-4'}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1 p-1 bg-[#E7E5E0]/70 overflow-x-auto">
                    {(['all', 'confirmed', 'compounding', 'packed', 'shipped', 'delivered', 'cancelled'] as const).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setOrderFilter(st)}
                          className={`px-3 py-1.5 text-xs font-medium capitalize whitespace-nowrap shrink-0 cursor-pointer ${
                            orderFilter === st
                              ? 'bg-white text-[#141413] shadow-xs'
                              : 'text-[#57534E] hover:text-[#141413]'
                          }`}
                        >
                          {st === 'packed' ? 'Sealed' : st}
                        </button>
                      )
                    )}
                  </div>

                  <div className="relative sm:w-60">
                    <Search
                      className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Search order or customer..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                    />
                  </div>
                </div>

                <div className="bg-white border border-[#E7E5E0] overflow-x-auto">
                  {filteredOrders.length === 0 ? (
                    <div className="p-10 text-center text-sm text-[#78716C]">
                      No orders match the current filter.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E7E5E0] text-[#78716C]">
                          <th className="py-3 px-4 font-medium">Order</th>
                          <th className="py-3 px-4 font-medium">Customer & City</th>
                          <th className="py-3 px-4 font-medium">Payment</th>
                          <th className="py-3 px-4 font-medium">Stage</th>
                          <th className="py-3 px-4 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F4F3F0]">
                        {filteredOrders.map((ord) => {
                          const isSelected = ord.id === selectedOrderId;
                          return (
                            <tr
                              key={ord.id}
                              onClick={() => setSelectedOrderId(ord.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#F4F3F0]' : 'hover:bg-[#FAFAF9]'
                              }`}
                            >
                              <td className="py-3.5 px-4 font-mono text-[#141413] font-medium whitespace-nowrap">
                                {ord.orderNumber}
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="text-[#141413] font-medium">{ord.customerName}</p>
                                <p className="text-[11px] text-[#78716C]">
                                  {ord.shippingCity}, {ord.shippingCountry}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 text-[#57534E]">
                                {ord.paymentStatus === 'paid'
                                  ? 'Paid'
                                  : ord.paymentStatus === 'pending_cod'
                                    ? 'COD Pending'
                                    : 'Refunded'}
                              </td>
                              <td className={`py-3.5 px-4 capitalize ${getStatusTextClass(ord.status)}`}>
                                {ord.status === 'packed' ? 'Quality Sealed' : ord.status}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-right tabular-nums text-[#141413]">
                                {formatCurrency(ord.total)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Order Fulfillment Control Panel */}
              {selectedOrder && (
                <section className="xl:col-span-5 bg-white border border-[#E7E5E0] p-6 space-y-5">
                  <div className="flex items-start justify-between gap-2 pb-4 border-b border-[#F0EEE9]">
                    <div>
                      <p className="text-xs text-[#78716C]">Live Fulfillment Control</p>
                      <h2 className="font-mono text-lg font-medium text-[#141413]">
                        {selectedOrder.orderNumber}
                      </h2>
                      <p className="text-xs text-[#57534E] mt-0.5">
                        {selectedOrder.customerName} · {selectedOrder.customerPhone}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          navigate('track', { orderNumber: selectedOrder.orderNumber })
                        }
                        title="Open customer live tracking view"
                        className="p-2 text-[#57534E] hover:text-[#141413] cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(null)}
                        aria-label="Close order panel"
                        className="p-2 text-[#57534E] hover:text-[#141413] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Items & Shipping Snapshot */}
                  <div className="text-xs space-y-2 pb-4 border-b border-[#F0EEE9]">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={`${item.productId}-${item.sizeMl}`}
                        className="flex justify-between text-[#141413]"
                      >
                        <span>
                          {item.name} ({item.sizeMl}ml × {item.quantity})
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                    <p className="text-[#78716C] pt-1">
                      Ship to: {selectedOrder.shippingAddress}, {selectedOrder.shippingCity}{' '}
                      {selectedOrder.shippingPostalCode}, {selectedOrder.shippingCountry}
                    </p>
                  </div>

                  {/* Live Update Form */}
                  <form onSubmit={handleSaveOrderUpdate} className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#57534E] mb-1">Fulfillment Stage</label>
                        <select
                          value={editStatus}
                          onChange={(e) => handleStatusSelectChange(e.target.value as OrderStatus)}
                          className="w-full px-3 py-2 bg-white border border-[#E7E5E0] text-[#141413] focus:outline-none focus:border-[#9A7B4F]"
                        >
                          {ORDER_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#57534E] mb-1">Payment Status</label>
                        <select
                          value={editPaymentStatus}
                          onChange={(e) => setEditPaymentStatus(e.target.value as PaymentStatus)}
                          className="w-full px-3 py-2 bg-white border border-[#E7E5E0] text-[#141413] focus:outline-none focus:border-[#9A7B4F]"
                        >
                          <option value="paid">Paid</option>
                          <option value="pending_cod">Pending COD</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#57534E] mb-1">Carrier</label>
                        <select
                          value={editCarrier}
                          onChange={(e) => setEditCarrier(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E7E5E0] text-[#141413] focus:outline-none focus:border-[#9A7B4F]"
                        >
                          <option value="MZD Insured Express">MZD Insured Express</option>
                          <option value="DHL Express">DHL Express</option>
                          <option value="FedEx Priority">FedEx Priority</option>
                          <option value="White-Glove Courier">White-Glove Courier</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[#57534E]">Tracking Code</label>
                          <button
                            type="button"
                            onClick={() =>
                              setEditTrackingCode(generateCarrierTrackingCode(editCarrier))
                            }
                            className="text-[11px] text-[#9A7B4F] hover:underline cursor-pointer"
                          >
                            Generate
                          </button>
                        </div>
                        <input
                          type="text"
                          maxLength={60}
                          value={editTrackingCode}
                          onChange={(e) => setEditTrackingCode(e.target.value)}
                          placeholder="DHL123456789"
                          className="w-full px-3 py-2 font-mono border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#57534E] mb-1">Estimated Delivery</label>
                      <input
                        type="text"
                        maxLength={40}
                        value={editEstDelivery}
                        onChange={(e) => setEditEstDelivery(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#F0EEE9]">
                      <div>
                        <label className="block text-[#57534E] mb-1">Checkpoint Title</label>
                        <input
                          type="text"
                          required
                          maxLength={80}
                          value={editEventTitle}
                          onChange={(e) => setEditEventTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#57534E] mb-1">Checkpoint Location</label>
                        <input
                          type="text"
                          required
                          maxLength={80}
                          value={editEventLocation}
                          onChange={(e) => setEditEventLocation(e.target.value)}
                          className="w-full px-3 py-2 border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#57534E] mb-1">
                        Live Customer Checkpoint Note
                      </label>
                      <textarea
                        rows={2}
                        maxLength={240}
                        value={editEventNote}
                        onChange={(e) => setEditEventNote(e.target.value)}
                        placeholder="e.g. Bottle #041 wax-sealed and dispatched via temperature-controlled courier."
                        className="w-full px-3 py-2 border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingOrder}
                      className="w-full py-2.5 text-xs font-medium bg-[#141413] text-white hover:bg-[#2B2A28] disabled:opacity-40 cursor-pointer"
                    >
                      {savingOrder
                        ? 'Publishing Live Update...'
                        : 'Publish Status & Tracking Checkpoint'}
                    </button>
                  </form>

                  {/* Recent Log Preview */}
                  <div className="pt-3 border-t border-[#F0EEE9] space-y-2">
                    <p className="text-[11px] font-medium text-[#78716C]">
                      Recorded Checkpoints ({selectedOrder.trackingEvents.length})
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-2 text-[11px]">
                      {[...selectedOrder.trackingEvents].reverse().map((ev, idx) => (
                        <div key={`${ev.timestampIso}-${idx}`} className="text-[#57534E]">
                          <span className="font-medium text-[#141413]">{ev.title}</span> ·{' '}
                          {ev.location} ·{' '}
                          <span className="font-mono">{formatOrderDate(ev.timestampIso)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* TAB 3: FRAGRANCE CATALOG & INVENTORY */}
          {tab === 'catalog' && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative sm:w-72">
                  <Search
                    className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Filter catalog by name or family..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                  />
                </div>
                <p className="text-xs text-[#78716C] tabular-nums">
                  Showing {filteredCatalog.length} of {adminProducts.length} fragrances
                </p>
              </div>

              <div className="bg-white border border-[#E7E5E0] overflow-x-auto">
                {filteredCatalog.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <p className="text-sm text-[#57534E]">No fragrances in Firestore catalog yet.</p>
                    <button
                      type="button"
                      onClick={() => void handleSeedCatalog()}
                      className="px-4 py-2 text-xs font-medium bg-[#141413] text-white cursor-pointer"
                    >
                      Seed MZD Signature Collection
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E7E5E0] text-[#78716C]">
                        <th className="py-3 px-4 font-medium">Fragrance</th>
                        <th className="py-3 px-4 font-medium">Family</th>
                        <th className="py-3 px-4 font-medium text-right">50ml / 100ml</th>
                        <th className="py-3 px-4 font-medium text-center">Stock</th>
                        <th className="py-3 px-4 font-medium">Visibility</th>
                        <th className="py-3 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F3F0]">
                      {filteredCatalog.map((prod) => (
                        <tr key={prod.id} className="hover:bg-[#FAFAF9]">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#EFECE6] shrink-0 overflow-hidden">
                                <SafeImage
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-medium text-[#141413]">{prod.name}</p>
                                <p className="text-[11px] text-[#78716C]">{prod.concentration}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#57534E]">{prod.category}</td>
                          <td className="py-3 px-4 font-mono text-right tabular-nums text-[#141413]">
                            {formatCurrency(prod.price50ml)} / {formatCurrency(prod.price100ml)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleQuickStockChange(prod, -1)}
                                aria-label={`Decrease stock for ${prod.name}`}
                                className="w-6 h-6 border border-[#E7E5E0] hover:bg-[#F4F3F0] cursor-pointer"
                              >
                                −
                              </button>
                              <span
                                className={`font-mono w-8 text-center tabular-nums ${
                                  prod.stock <= 10 ? 'text-[#B45309] font-semibold' : 'text-[#141413]'
                                }`}
                              >
                                {prod.stock}
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleQuickStockChange(prod, 5)}
                                aria-label={`Add 5 stock for ${prod.name}`}
                                className="w-6 h-6 border border-[#E7E5E0] hover:bg-[#F4F3F0] cursor-pointer"
                              >
                                +5
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={prod.active ? 'text-[#15803D]' : 'text-[#78716C]'}>
                              {prod.active ? 'Published' : 'Draft'}
                              {prod.featured ? ' · Featured' : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEditProductModal(prod)}
                              className="inline-flex items-center gap-1 text-[#141413] hover:text-[#9A7B4F] mr-3 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteProduct(prod)}
                              className="inline-flex items-center gap-1 text-[#78716C] hover:text-[#B91C1C] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {/* TAB 4: CUSTOMERS DIRECTORY */}
          {tab === 'customers' && (
            <section className="bg-white border border-[#E7E5E0] overflow-x-auto">
              {adminUsers.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#78716C]">
                  No registered customer accounts yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E7E5E0] text-[#78716C]">
                      <th className="py-3 px-4 font-medium">Collector</th>
                      <th className="py-3 px-4 font-medium">Email</th>
                      <th className="py-3 px-4 font-medium">Location</th>
                      <th className="py-3 px-4 font-medium text-right">Orders</th>
                      <th className="py-3 px-4 font-medium text-right">Lifetime Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F3F0]">
                    {adminUsers.map((u) => {
                      const ordersForUser = adminOrders.filter(
                        (o) => o.userId === u.uid && o.status !== 'cancelled'
                      );
                      const spend = ordersForUser.reduce((s, o) => s + o.total, 0);
                      return (
                        <tr key={u.uid} className="hover:bg-[#FAFAF9]">
                          <td className="py-3.5 px-4 font-medium text-[#141413]">
                            {u.displayName}
                          </td>
                          <td className="py-3.5 px-4 text-[#57534E]">{u.email}</td>
                          <td className="py-3.5 px-4 text-[#57534E]">
                            {u.city ? `${u.city}, ${u.country}` : 'Not saved yet'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-right tabular-nums text-[#141413]">
                            {ordersForUser.length}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-right tabular-nums text-[#141413]">
                            {formatCurrency(spend)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {/* TAB 5: PROMOTIONS */}
          {tab === 'promotions' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleCreatePromo}
                className="lg:col-span-4 bg-white border border-[#E7E5E0] p-6 space-y-4 text-xs"
              >
                <h2 className="font-sans text-sm font-semibold text-[#141413]">
                  Create Privilege Code
                </h2>
                <div>
                  <label className="block text-[#57534E] mb-1">Code</label>
                  <input
                    type="text"
                    required
                    maxLength={32}
                    placeholder="PRIVATE20"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 font-mono uppercase border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#57534E] mb-1">Discount (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={70}
                      required
                      value={promoPercent}
                      onChange={(e) => setPromoPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 font-mono border border-[#E7E5E0]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#57534E] mb-1">Min Order ($)</label>
                    <input
                      type="number"
                      min={0}
                      max={50000}
                      required
                      value={promoMinOrder}
                      onChange={(e) => setPromoMinOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 font-mono border border-[#E7E5E0]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[#57534E] mb-1">Description</label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    placeholder="20% off autumn collector orders"
                    value={promoDesc}
                    onChange={(e) => setPromoDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E7E5E0]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingPromo}
                  className="w-full py-2.5 font-medium bg-[#141413] text-white hover:bg-[#2B2A28] cursor-pointer"
                >
                  {savingPromo ? 'Creating...' : 'Create Code'}
                </button>
              </form>

              <div className="lg:col-span-8 bg-white border border-[#E7E5E0] overflow-x-auto">
                {adminPromos.length === 0 ? (
                  <div className="p-10 text-center text-sm text-[#78716C]">
                    No active promotion codes configured.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E7E5E0] text-[#78716C]">
                        <th className="py-3 px-4 font-medium">Code</th>
                        <th className="py-3 px-4 font-medium">Discount</th>
                        <th className="py-3 px-4 font-medium">Min Spend</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F3F0]">
                      {adminPromos.map((p) => (
                        <tr key={p.code} className="hover:bg-[#FAFAF9]">
                          <td className="py-3.5 px-4">
                            <p className="font-mono font-medium text-[#141413]">{p.code}</p>
                            <p className="text-[11px] text-[#78716C]">{p.description}</p>
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums">
                            {p.discountPercent}%
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums">
                            {formatCurrency(p.minOrderAmount)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={p.active ? 'text-[#15803D]' : 'text-[#78716C]'}>
                              {p.active ? 'Active' : 'Paused'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => void handleTogglePromo(p)}
                              className="underline text-[#141413] mr-3 cursor-pointer"
                            >
                              {p.active ? 'Pause' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void deletePromotionAdmin(p.code)}
                              className="text-[#B91C1C] hover:underline cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Fragrance Modal */}
      {productModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={isNewProduct ? 'Add fragrance' : 'Edit fragrance'}
        >
          <div className="bg-white border border-[#E7E5E0] max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#E7E5E0] flex items-center justify-between">
              <h2 className="font-sans text-base font-semibold text-[#141413]">
                {isNewProduct ? 'Add New Fragrance' : `Edit ${productForm.name}`}
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                aria-label="Close modal"
                className="p-1 text-[#57534E] hover:text-[#141413] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveProduct}
              className="flex-1 overflow-y-auto p-6 space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#57534E] mb-1">Fragrance Name</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E5E0]"
                  />
                </div>
                <div>
                  <label className="block text-[#57534E] mb-1">URL Slug</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="velvet-oud"
                    value={productForm.slug}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                      })
                    }
                    className="w-full px-3 py-2 font-mono border border-[#E7E5E0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#57534E] mb-1">Short Olfactory Subtitle</label>
                <input
                  type="text"
                  required
                  maxLength={140}
                  value={productForm.subtitle}
                  onChange={(e) => setProductForm({ ...productForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E7E5E0]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[#57534E] mb-1">Scent Family</label>
                  <select
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        category: e.target.value as FragranceCategory,
                      })
                    }
                    className="w-full px-2.5 py-2 border border-[#E7E5E0] bg-white"
                  >
                    <option value="Oud & Wood">Oud & Wood</option>
                    <option value="Floral">Floral</option>
                    <option value="Amber & Spice">Amber & Spice</option>
                    <option value="Fresh Citrus">Fresh Citrus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#57534E] mb-1">Concentration</label>
                  <select
                    value={productForm.concentration}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        concentration: e.target.value as FragranceConcentration,
                      })
                    }
                    className="w-full px-2.5 py-2 border border-[#E7E5E0] bg-white"
                  >
                    <option value="Extrait de Parfum">Extrait de Parfum</option>
                    <option value="Eau de Parfum">Eau de Parfum</option>
                    <option value="Parfum Intense">Parfum Intense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#57534E] mb-1">50ml Price ($)</label>
                  <input
                    type="number"
                    min={1}
                    max={50000}
                    required
                    value={productForm.price50ml}
                    onChange={(e) =>
                      setProductForm({ ...productForm, price50ml: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-2 font-mono border border-[#E7E5E0]"
                  />
                </div>
                <div>
                  <label className="block text-[#57534E] mb-1">100ml Price ($)</label>
                  <input
                    type="number"
                    min={1}
                    max={50000}
                    required
                    value={productForm.price100ml}
                    onChange={(e) =>
                      setProductForm({ ...productForm, price100ml: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-2 font-mono border border-[#E7E5E0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#57534E] mb-1">Stock Count</label>
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    required
                    value={productForm.stock}
                    onChange={(e) =>
                      setProductForm({ ...productForm, stock: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 font-mono border border-[#E7E5E0]"
                  />
                </div>
                <div>
                  <label className="block text-[#57534E] mb-1">Longevity (hrs)</label>
                  <input
                    type="number"
                    min={1}
                    max={48}
                    required
                    value={productForm.longevityHours}
                    onChange={(e) =>
                      setProductForm({ ...productForm, longevityHours: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 font-mono border border-[#E7E5E0]"
                  />
                </div>
                <div>
                  <label className="block text-[#57534E] mb-1">Sillage</label>
                  <select
                    value={productForm.sillage}
                    onChange={(e) =>
                      setProductForm({ ...productForm, sillage: e.target.value as SillageLevel })
                    }
                    className="w-full px-3 py-2 border border-[#E7E5E0] bg-white"
                  >
                    <option value="Intimate">Intimate</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Strong">Strong</option>
                    <option value="Enormous">Enormous</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#57534E] mb-1">Bottle Studio Photograph</label>
                <select
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E7E5E0] bg-white"
                >
                  {PRESET_BOTTLE_OPTIONS.map((opt) => (
                    <option key={opt.url} value={opt.url}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#57534E] mb-1">Top Notes (comma separated)</label>
                  <input
                    type="text"
                    required
                    value={productForm.topNotesText}
                    onChange={(e) =>
                      setProductForm({ ...productForm, topNotesText: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#E7E5E0]"
                  />
                </div>
                <div>
                  <label className="block text-[#57534E] mb-1">Heart Notes</label>
                  <input
                    type="text"
                    required
                    value={productForm.heartNotesText}
                    onChange={(e) =>
                      setProductForm({ ...productForm, heartNotesText: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#E7E5E0]"
                  />
                </div>
                <div>
                  <label className="block text-[#57534E] mb-1">Base Notes</label>
                  <input
                    type="text"
                    required
                    value={productForm.baseNotesText}
                    onChange={(e) =>
                      setProductForm({ ...productForm, baseNotesText: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#E7E5E0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#57534E] mb-1">Editorial Description</label>
                <textarea
                  rows={3}
                  required
                  maxLength={1500}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E7E5E0]"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.active}
                    onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                    className="accent-[#141413]"
                  />
                  <span>Published on Storefront</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.featured}
                    onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                    className="accent-[#141413]"
                  />
                  <span>Featured in Collection</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#E7E5E0] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 border border-[#E7E5E0] text-[#57534E] hover:text-[#141413] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2 font-medium bg-[#141413] text-white hover:bg-[#2B2A28] disabled:opacity-40 cursor-pointer"
                >
                  {savingProduct ? 'Saving...' : isNewProduct ? 'Create Fragrance' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
