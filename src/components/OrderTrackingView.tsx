import {
  Check,
  Clock,
  Copy,
  FlaskConical,
  MapPin,
  PackageCheck,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatOrderDate } from '../lib/paymentUtils';
import {
  cancelOrderByCustomerAtomic,
  subscribeOrderTrackingByNumber,
} from '../lib/storeService';
import type { Order, OrderStatus, OrderTracking } from '../types';

const STAGES: { key: OrderStatus; label: string; description: string; icon: typeof Check }[] = [
  {
    key: 'confirmed',
    label: 'Confirmed',
    description: 'Order & payment verified',
    icon: Check,
  },
  {
    key: 'compounding',
    label: 'Compounding',
    description: 'Small-batch bottling at atelier',
    icon: FlaskConical,
  },
  {
    key: 'packed',
    label: 'Quality Sealed',
    description: 'Batch numbered & insured pack',
    icon: PackageCheck,
  },
  {
    key: 'shipped',
    label: 'In Transit',
    description: 'Dispatched via insured courier',
    icon: Truck,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    description: 'Signed & received',
    icon: MapPin,
  },
];

function getStageIndex(status: OrderStatus): number {
  const idx = STAGES.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

export function OrderTrackingView() {
  const {
    user,
    userOrders,
    trackingLookupNumber,
    setTrackingLookupNumber,
    navigate,
    showToast,
  } = useApp();

  const [inputCode, setInputCode] = useState(trackingLookupNumber);
  const [activeCode, setActiveCode] = useState(trackingLookupNumber);
  const [liveTracking, setLiveTracking] = useState<OrderTracking | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupNotFound, setLookupNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Default to the user's most recent order if no lookup code was specified
  useEffect(() => {
    if (!activeCode && userOrders.length > 0) {
      const latest = userOrders[0].orderNumber;
      setInputCode(latest);
      setActiveCode(latest);
      setTrackingLookupNumber(latest);
    }
  }, [activeCode, setTrackingLookupNumber, userOrders]);

  useEffect(() => {
    if (trackingLookupNumber && trackingLookupNumber !== activeCode) {
      setInputCode(trackingLookupNumber);
      setActiveCode(trackingLookupNumber);
    }
  }, [activeCode, trackingLookupNumber]);

  // Real-time Firestore onSnapshot listener on PII-free orderTracking/{orderNumber}
  useEffect(() => {
    const code = activeCode.trim().toUpperCase();
    if (!code) {
      setLiveTracking(null);
      setLookupNotFound(false);
      return;
    }

    setLookupLoading(true);
    setLookupNotFound(false);

    const unsub = subscribeOrderTrackingByNumber(
      code,
      (docData) => {
        setLiveTracking(docData);
        setLookupNotFound(!docData);
        setLookupLoading(false);
      },
      () => {
        setLiveTracking(null);
        setLookupNotFound(true);
        setLookupLoading(false);
      }
    );

    return unsub;
  }, [activeCode]);

  const matchingOwnedOrder: Order | undefined = userOrders.find(
    (o) => o.orderNumber.toUpperCase() === activeCode.trim().toUpperCase()
  );

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = inputCode.trim().toUpperCase();
    if (!cleaned) return;
    setActiveCode(cleaned);
    setTrackingLookupNumber(cleaned);
  };

  const handleCopy = (value: string, label: string) => {
    void navigator.clipboard?.writeText(value);
    showToast(`${label} copied to clipboard.`);
  };

  const handleCancelOrder = async (order: Order) => {
    setCancelling(true);
    try {
      await cancelOrderByCustomerAtomic(order);
      showToast(`Order ${order.orderNumber} has been cancelled.`);
    } catch {
      showToast('Unable to cancel this order once atelier compounding begins.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const status: OrderStatus | null = liveTracking?.status ?? matchingOwnedOrder?.status ?? null;
  const stageIdx = status ? getStageIndex(status) : -1;
  const events = liveTracking?.trackingEvents ?? matchingOwnedOrder?.trackingEvents ?? [];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#FAFAF9] py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header & Lookup Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E7E5E0]">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wider text-[#9A7B4F]">
              Real-Time Fulfillment Telemetry
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#141413]">
              Order Tracking Dashboard
            </h1>
            <p className="text-sm text-[#57534E] max-w-xl">
              Follow your flacon live from compounding bench to courier delivery. Status updates
              made by our atelier appear here instantaneously.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex w-full lg:w-auto gap-2">
            <div className="relative flex-1 lg:w-72">
              <Search
                className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Order # (e.g. MZD-2026-AB12CD)"
                aria-label="Enter order number"
                className="w-full pl-10 pr-4 py-3 text-sm font-mono uppercase bg-white border border-[#E7E5E0] text-[#141413] placeholder:text-[#78716C] focus:outline-none focus:border-[#9A7B4F]"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 text-sm font-medium bg-[#141413] text-white hover:bg-[#2B2A28] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Track
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Signed-in User Recent Orders Switcher */}
          {user && userOrders.length > 0 && (
            <aside className="lg:col-span-4 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                Your Active & Past Orders ({userOrders.length})
              </h2>
              <div className="bg-white border border-[#E7E5E0] divide-y divide-[#F0EEE9]">
                {userOrders.map((ord) => {
                  const selected = ord.orderNumber === activeCode;
                  return (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => {
                        setInputCode(ord.orderNumber);
                        setActiveCode(ord.orderNumber);
                        setTrackingLookupNumber(ord.orderNumber);
                      }}
                      className={`w-full p-4 text-left transition-colors cursor-pointer ${
                        selected ? 'bg-[#F4F3F0]' : 'hover:bg-[#FAFAF9]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-medium text-[#141413]">
                          {ord.orderNumber}
                        </span>
                        <span className="font-mono text-xs text-[#57534E] tabular-nums">
                          {formatCurrency(ord.total)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1.5 text-xs text-[#78716C]">
                        <span className="capitalize font-medium text-[#141413]">
                          {ord.status === 'packed' ? 'Quality Sealed' : ord.status}
                        </span>
                        <span>
                          {ord.items.reduce((sum, i) => sum + i.quantity, 0)} items ·{' '}
                          {ord.shippingCity}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Live Tracking Stage & Timeline Canvas */}
          <div className={user && userOrders.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'}>
            {lookupLoading ? (
              <div className="bg-white border border-[#E7E5E0] p-10 space-y-4 animate-pulse">
                <div className="h-6 w-48 bg-[#ECEAE4]" />
                <div className="h-4 w-72 bg-[#ECEAE4]" />
                <div className="h-24 w-full bg-[#ECEAE4]" />
              </div>
            ) : !activeCode ? (
              <div className="bg-white border border-[#E7E5E0] p-12 text-center space-y-4">
                <Clock className="w-9 h-9 text-[#9A7B4F] mx-auto" aria-hidden="true" />
                <h2 className="font-serif text-3xl text-[#141413]">
                  Enter your MZD order reference
                </h2>
                <p className="text-sm text-[#57534E] max-w-md mx-auto">
                  Place an order from our collection or enter an existing reference number above to
                  stream live atelier and courier checkpoints.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('home', { scrollToId: 'collection' })}
                  className="px-6 py-3 text-sm font-medium bg-[#141413] text-white hover:bg-[#2B2A28] cursor-pointer"
                >
                  Explore Fragrances
                </button>
              </div>
            ) : lookupNotFound && !matchingOwnedOrder ? (
              <div className="bg-white border border-[#E7E5E0] p-10 text-center space-y-3">
                <h2 className="font-serif text-2xl text-[#141413]">
                  No shipment found for <span className="font-mono">{activeCode}</span>
                </h2>
                <p className="text-sm text-[#57534E]">
                  Double-check your confirmation code (format: MZD-2026-XXXXXX) or sign in to view
                  orders linked to your account.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Header Card */}
                <div className="bg-white border border-[#E7E5E0] p-6 sm:p-8 space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#F0EEE9]">
                    <div className="space-y-1">
                      <p className="text-xs text-[#78716C]">Live Shipment Reference</p>
                      <div className="flex items-center gap-2">
                        <h2 className="font-mono text-2xl font-medium text-[#141413]">
                          {liveTracking?.orderNumber ?? matchingOwnedOrder?.orderNumber}
                        </h2>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              liveTracking?.orderNumber ?? matchingOwnedOrder?.orderNumber ?? '',
                              'Order number'
                            )
                          }
                          aria-label="Copy order number"
                          className="p-1.5 text-[#78716C] hover:text-[#141413] cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-[#57534E]">
                        Destination: {liveTracking?.destinationCity ?? matchingOwnedOrder?.shippingCity}{' '}
                        · {liveTracking?.itemCount ?? matchingOwnedOrder?.items.reduce((s, i) => s + i.quantity, 0)}{' '}
                        flacon(s)
                      </p>
                    </div>

                    <div className="text-left sm:text-right space-y-1">
                      <p className="text-xs text-[#78716C]">Estimated Arrival</p>
                      <p className="font-medium text-base text-[#141413]">
                        {status === 'cancelled'
                          ? 'Shipment Cancelled'
                          : status === 'delivered'
                            ? 'Delivered'
                            : liveTracking?.estimatedDelivery ||
                              matchingOwnedOrder?.estimatedDelivery ||
                              'Scheduling'}
                      </p>
                      <p className="text-xs text-[#57534E]">
                        Carrier:{' '}
                        <span className="font-medium text-[#141413]">
                          {liveTracking?.carrier || matchingOwnedOrder?.carrier || 'MZD Insured Express'}
                        </span>
                        {(liveTracking?.trackingCode || matchingOwnedOrder?.trackingCode) && (
                          <>
                            {' · '}
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  liveTracking?.trackingCode ||
                                    matchingOwnedOrder?.trackingCode ||
                                    '',
                                  'Carrier tracking code'
                                )
                              }
                              className="font-mono underline hover:text-[#9A7B4F] cursor-pointer"
                            >
                              {liveTracking?.trackingCode || matchingOwnedOrder?.trackingCode}
                            </button>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* 5-Stage Visual Fulfillment Stepper */}
                  {status === 'cancelled' ? (
                    <div className="p-5 bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-3 text-sm text-[#991B1B]">
                      <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>
                        This order has been cancelled. If a card payment was authorized, the hold is
                        released automatically within 2–3 business days.
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                      {STAGES.map((stage, index) => {
                        const Icon = stage.icon;
                        const completed = stageIdx >= index;
                        const isCurrent = stageIdx === index;
                        return (
                          <div
                            key={stage.key}
                            className={`p-4 border transition-colors ${
                              isCurrent
                                ? 'border-[#141413] bg-[#FAFAF9]'
                                : completed
                                  ? 'border-[#E7E5E0] bg-white'
                                  : 'border-[#F0EEE9] bg-[#FAFAF9]/60 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Icon
                                className={`w-4 h-4 ${
                                  completed ? 'text-[#9A7B4F]' : 'text-[#A8A29E]'
                                }`}
                                aria-hidden="true"
                              />
                              <span className="font-mono text-[11px] text-[#78716C] tabular-nums">
                                0{index + 1}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-[#141413]">{stage.label}</p>
                            <p className="text-xs text-[#78716C] mt-0.5 leading-snug">
                              {stage.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Live Checkpoint Feed */}
                  <div className="space-y-4 pt-4 border-t border-[#F0EEE9]">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                      Live Atelier & Courier Log
                    </h3>

                    <ol className="space-y-5">
                      {[...events].reverse().map((ev, i) => (
                        <li
                          key={`${ev.timestampIso}-${i}`}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 pb-5 border-b border-[#F4F3F0] last:border-b-0 last:pb-0"
                        >
                          <div className="sm:col-span-4 text-xs font-mono text-[#78716C] tabular-nums">
                            {formatOrderDate(ev.timestampIso)}
                          </div>
                          <div className="sm:col-span-8 space-y-1">
                            <p className="text-sm font-semibold text-[#141413]">
                              {ev.title}{' '}
                              <span className="font-normal text-[#78716C]">· {ev.location}</span>
                            </p>
                            <p className="text-xs text-[#57534E] leading-relaxed">{ev.note}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Customer Cancellation Action while in Confirmed status */}
                  {matchingOwnedOrder && matchingOwnedOrder.status === 'confirmed' && (
                    <div className="pt-4 border-t border-[#F0EEE9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-[#78716C]">
                        Need to make a change? You may cancel prior to atelier compounding.
                      </p>
                      <button
                        type="button"
                        disabled={cancelling}
                        onClick={() => void handleCancelOrder(matchingOwnedOrder)}
                        className="px-4 py-2 text-xs font-medium border border-[#DC2626] text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {cancelling ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Full Receipt Summary (Only visible when signed in as Order Owner) */}
                {matchingOwnedOrder && (
                  <div className="bg-white border border-[#E7E5E0] p-6 sm:p-8 space-y-5">
                    <div className="flex items-baseline justify-between border-b border-[#F0EEE9] pb-4">
                      <h3 className="font-serif text-2xl font-medium text-[#141413]">
                        Order Receipt
                      </h3>
                      <span className="text-xs text-[#57534E]">
                        {matchingOwnedOrder.paymentBrand}
                        {matchingOwnedOrder.paymentLast4
                          ? ` •••• ${matchingOwnedOrder.paymentLast4}`
                          : ''}{' '}
                        · Auth {matchingOwnedOrder.paymentAuthCode}
                      </span>
                    </div>

                    <div className="divide-y divide-[#F0EEE9]">
                      {matchingOwnedOrder.items.map((item) => (
                        <div
                          key={`${item.productId}-${item.sizeMl}`}
                          className="py-3 flex items-center justify-between text-sm"
                        >
                          <div>
                            <p className="font-medium text-[#141413]">{item.name}</p>
                            <p className="text-xs text-[#78716C]">
                              {item.sizeMl} ml × {item.quantity}
                            </p>
                          </div>
                          <p className="font-mono text-[#141413] tabular-nums">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-[#F0EEE9] grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-[#57534E]">
                      <div>
                        <p className="font-semibold text-[#141413] mb-1">Shipping Address</p>
                        <p>{matchingOwnedOrder.customerName}</p>
                        <p>{matchingOwnedOrder.shippingAddress}</p>
                        <p>
                          {matchingOwnedOrder.shippingCity}, {matchingOwnedOrder.shippingPostalCode}{' '}
                          · {matchingOwnedOrder.shippingCountry}
                        </p>
                      </div>
                      <div className="space-y-1 sm:text-right">
                        <p>
                          Subtotal:{' '}
                          <span className="font-mono text-[#141413] tabular-nums">
                            {formatCurrency(matchingOwnedOrder.subtotal)}
                          </span>
                        </p>
                        {matchingOwnedOrder.discount > 0 && (
                          <p className="text-[#15803D]">
                            Discount ({matchingOwnedOrder.promoCode}): −
                            <span className="font-mono tabular-nums">
                              {formatCurrency(matchingOwnedOrder.discount)}
                            </span>
                          </p>
                        )}
                        <p>
                          Shipping:{' '}
                          <span className="font-mono text-[#141413] tabular-nums">
                            {matchingOwnedOrder.shippingFee === 0
                              ? 'Complimentary'
                              : formatCurrency(matchingOwnedOrder.shippingFee)}
                          </span>
                        </p>
                        <p className="text-sm font-semibold text-[#141413] pt-1">
                          Total:{' '}
                          <span className="font-mono tabular-nums">
                            {formatCurrency(matchingOwnedOrder.total)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
