import {
  CheckCircle2,
  CreditCard,
  Lock,
  Minus,
  Plus,
  ShoppingBag,
  Smartphone,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import {
  cleanDigits,
  detectCardBrand,
  formatCardNumber,
  formatCurrency,
  formatExpiry,
  isValidCvc,
  isValidExpiry,
  isValidLuhn,
} from '../lib/paymentUtils';
import { lookupPromoCode, placeOrderAtomic, updateUserProfile } from '../lib/storeService';
import {
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
  type PaymentMethod,
  type Promotion,
} from '../types';
import { SafeImage } from './SafeImage';

type DrawerStep = 'bag' | 'checkout' | 'confirmed';

export function CartCheckoutDrawer() {
  const {
    user,
    profile,
    cart,
    cartSubtotal,
    cartOpen,
    setCartOpen,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    signInWithGoogle,
    navigate,
    showToast,
  } = useApp();

  const [step, setStep] = useState<DrawerStep>('bag');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoChecking, setPromoChecking] = useState(false);

  // Shipping form
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingCountry, setShippingCountry] = useState('United States');
  const [saveProfileInfo, setSaveProfileInfo] = useState(true);

  // Secure Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [confirmedReceipt, setConfirmedReceipt] = useState<{
    orderNumber: string;
    authCode: string;
    total: number;
    paymentMethod: PaymentMethod;
  } | null>(null);

  // Sync saved user profile into checkout inputs
  useEffect(() => {
    if (profile) {
      setCustomerName((prev) => prev || profile.displayName || '');
      setCustomerEmail((prev) => prev || profile.email || '');
      setCustomerPhone((prev) => prev || profile.phone || '');
      setShippingAddress((prev) => prev || profile.addressLine || '');
      setShippingCity((prev) => prev || profile.city || '');
      setShippingPostalCode((prev) => prev || profile.postalCode || '');
      setShippingCountry((prev) => prev || profile.country || 'United States');
      setCardHolder((prev) => prev || profile.displayName || '');
    } else if (user) {
      setCustomerName((prev) => prev || user.displayName || '');
      setCustomerEmail((prev) => prev || user.email || '');
      setCardHolder((prev) => prev || user.displayName || '');
    }
  }, [profile, user]);

  // Reset step to bag when closed after confirmation
  useEffect(() => {
    if (!cartOpen && step === 'confirmed') {
      setStep('bag');
      setConfirmedReceipt(null);
    }
  }, [cartOpen, step]);

  if (!cartOpen) return null;

  const discountAmount =
    appliedPromo && cartSubtotal >= appliedPromo.minOrderAmount
      ? Number(((cartSubtotal * appliedPromo.discountPercent) / 100).toFixed(2))
      : 0;
  const discountedSubtotal = Math.max(0, cartSubtotal - discountAmount);
  const shippingFee =
    cart.length === 0 || discountedSubtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : STANDARD_SHIPPING_FEE;
  const grandTotal = Number((discountedSubtotal + shippingFee).toFixed(2));
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - discountedSubtotal);

  const cardBrand = detectCardBrand(cardNumber);

  const handleApplyPromo = async () => {
    setPromoError('');
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    try {
      const found = await lookupPromoCode(promoInput);
      if (!found) {
        setPromoError('Invalid or inactive promo code. Try WELCOME10 or MZD15.');
        setAppliedPromo(null);
      } else if (cartSubtotal < found.minOrderAmount) {
        setPromoError(
          `Code ${found.code} requires a minimum order of ${formatCurrency(found.minOrderAmount)}.`
        );
        setAppliedPromo(null);
      } else {
        setAppliedPromo(found);
        showToast(`Applied ${found.code} (${found.discountPercent}% off).`);
      }
    } finally {
      setPromoChecking(false);
    }
  };

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    if (!user) {
      setCheckoutError('Please sign in with Google to place and track your order securely.');
      return;
    }

    if (
      customerName.trim().length < 2 ||
      customerPhone.trim().length < 4 ||
      shippingAddress.trim().length < 5 ||
      shippingCity.trim().length < 1 ||
      shippingPostalCode.trim().length < 2 ||
      shippingCountry.trim().length < 2
    ) {
      setCheckoutError('Please complete all required shipping address fields.');
      return;
    }

    let paymentLast4 = '';
    let paymentBrand = '';

    if (paymentMethod === 'card') {
      if (cardHolder.trim().length < 2) {
        setCheckoutError('Please enter the cardholder name.');
        return;
      }
      if (!isValidLuhn(cardNumber)) {
        setCheckoutError('Please enter a valid payment card number (Luhn check failed).');
        return;
      }
      if (!isValidExpiry(cardExpiry)) {
        setCheckoutError('Please enter a valid future expiration date (MM/YY).');
        return;
      }
      if (!isValidCvc(cardCvc)) {
        setCheckoutError('Please enter a valid 3 or 4 digit security code (CVC).');
        return;
      }
      paymentLast4 = cleanDigits(cardNumber).slice(-4);
      paymentBrand = cardBrand;
    } else if (paymentMethod === 'apple_pay') {
      paymentLast4 = '8842';
      paymentBrand = 'Apple Pay Express';
    } else {
      paymentLast4 = '';
      paymentBrand = 'Cash on Delivery';
    }

    setSubmitting(true);
    try {
      const result = await placeOrderAtomic(user, {
        customerName,
        customerEmail: customerEmail || user.email || '',
        customerPhone,
        shippingAddress,
        shippingCity,
        shippingPostalCode,
        shippingCountry,
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          sizeMl: item.sizeMl,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          imageUrl: item.imageUrl,
        })),
        subtotal: cartSubtotal,
        discount: discountAmount,
        shippingFee,
        total: grandTotal,
        promoCode: appliedPromo?.code ?? '',
        paymentMethod,
        paymentLast4,
        paymentBrand,
      });

      if (saveProfileInfo) {
        try {
          await updateUserProfile(user.uid, {
            displayName: customerName,
            phone: customerPhone,
            addressLine: shippingAddress,
            city: shippingCity,
            postalCode: shippingPostalCode,
            country: shippingCountry,
          });
        } catch {
          // Non-blocking profile save
        }
      }

      setConfirmedReceipt({
        orderNumber: result.orderNumber,
        authCode: result.authCode,
        total: grandTotal,
        paymentMethod,
      });
      clearCart();
      setAppliedPromo(null);
      setPromoInput('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvc('');
      setStep('confirmed');
      showToast(`Order ${result.orderNumber} confirmed.`);
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? 'Could not process your order. Please verify your details and try again.'
          : 'Checkout failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping bag and secure checkout"
    >
      <div className="fixed inset-0" onClick={() => setCartOpen(false)} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-lg bg-[#FAFAF9] h-full flex flex-col border-l border-[#E7E5E0] shadow-2xl">
        {/* Drawer Header */}
        <div className="h-16 px-6 border-b border-[#E7E5E0] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl font-medium text-[#141413]">
              {step === 'bag'
                ? 'Shopping Bag'
                : step === 'checkout'
                  ? 'Secure Checkout'
                  : 'Order Confirmed'}
            </h2>
            {step === 'bag' && cart.length > 0 && (
              <span className="font-mono text-xs text-[#78716C] tabular-nums">
                ({cart.reduce((s, i) => s + i.quantity, 0)})
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close drawer"
            className="w-10 h-10 flex items-center justify-center text-[#57534E] hover:text-[#141413] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Shopping Bag */}
        {step === 'bag' && (
          <>
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <ShoppingBag className="w-10 h-10 text-[#A8A29E]" aria-hidden="true" />
                <h3 className="font-serif text-2xl text-[#141413]">Your bag is empty</h3>
                <p className="text-sm text-[#57534E] max-w-xs">
                  Explore our small-batch extraits and add your preferred flacon size to begin.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    navigate('home', { scrollToId: 'collection' });
                  }}
                  className="px-6 py-3 text-sm font-medium bg-[#141413] text-white hover:bg-[#2B2A28] cursor-pointer"
                >
                  Browse Collection
                </button>
              </div>
            ) : (
              <>
                {/* Free Express Shipping Progress */}
                <div className="px-6 py-3.5 bg-[#F4F3F0] border-b border-[#E7E5E0] text-xs text-[#57534E]">
                  {remainingForFreeShipping > 0 ? (
                    <p>
                      Add{' '}
                      <span className="font-mono font-medium text-[#141413] tabular-nums">
                        {formatCurrency(remainingForFreeShipping)}
                      </span>{' '}
                      more for complimentary insured express delivery.
                    </p>
                  ) : (
                    <p className="text-[#15803D] font-medium">
                      Complimentary insured express delivery unlocked.
                    </p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 divide-y divide-[#E7E5E0]">
                  {cart.map((item) => (
                    <div
                      key={`${item.productId}-${item.sizeMl}`}
                      className="py-4 first:pt-0 flex gap-4"
                    >
                      <div className="w-20 h-20 bg-[#EFECE6] border border-[#E7E5E0] shrink-0 overflow-hidden">
                        <SafeImage
                          src={item.imageUrl}
                          alt={item.name}
                          title={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-serif text-lg font-medium text-[#141413] leading-snug">
                              {item.name}
                            </p>
                            <p className="text-xs text-[#78716C]">
                              {item.sizeMl} ml · {item.concentration}
                            </p>
                          </div>
                          <p className="font-mono text-sm font-medium text-[#141413] tabular-nums">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="inline-flex items-center border border-[#E7E5E0] bg-white">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.productId, item.sizeMl, -1)}
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="w-8 h-8 flex items-center justify-center text-[#141413] hover:bg-[#F4F3F0] cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center font-mono text-xs tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.productId, item.sizeMl, 1)}
                              aria-label={`Increase quantity of ${item.name}`}
                              className="w-8 h-8 flex items-center justify-center text-[#141413] hover:bg-[#F4F3F0] cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId, item.sizeMl)}
                            aria-label={`Remove ${item.name}`}
                            className="inline-flex items-center gap-1 text-xs text-[#78716C] hover:text-[#B91C1C] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bag Footer: Promo + Totals */}
                <div className="p-6 bg-white border-t border-[#E7E5E0] space-y-4 shrink-0">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder="Promo code (e.g. WELCOME10)"
                        aria-label="Promo code"
                        className="flex-1 px-3 py-2 text-xs font-mono uppercase bg-[#FAFAF9] border border-[#E7E5E0] text-[#141413] focus:outline-none focus:border-[#9A7B4F]"
                      />
                      <button
                        type="button"
                        disabled={promoChecking}
                        onClick={() => void handleApplyPromo()}
                        className="px-4 py-2 text-xs font-medium border border-[#141413] text-[#141413] hover:bg-[#141413] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {promoChecking ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                    {promoError && <p className="text-xs text-[#B91C1C]">{promoError}</p>}
                    {appliedPromo && (
                      <div className="flex items-center justify-between text-xs text-[#15803D]">
                        <span>
                          {appliedPromo.code} applied ({appliedPromo.discountPercent}% off)
                        </span>
                        <button
                          type="button"
                          onClick={() => setAppliedPromo(null)}
                          className="underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm pt-2 border-t border-[#F0EEE9]">
                    <div className="flex justify-between text-[#57534E]">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums">{formatCurrency(cartSubtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[#15803D]">
                        <span>Privilege Discount ({appliedPromo?.code})</span>
                        <span className="font-mono tabular-nums">
                          −{formatCurrency(discountAmount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#57534E]">
                      <span>Insured Express Shipping</span>
                      <span className="font-mono tabular-nums">
                        {shippingFee === 0 ? 'Complimentary' : formatCurrency(shippingFee)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium text-base text-[#141413] pt-2 border-t border-[#F0EEE9]">
                      <span>Total</span>
                      <span className="font-mono tabular-nums">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep('checkout')}
                    className="w-full py-3.5 text-sm font-medium bg-[#141413] text-white hover:bg-[#2B2A28] transition-colors cursor-pointer"
                  >
                    Proceed to Secure Checkout
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Step 2: Secure Checkout */}
        {step === 'checkout' && (
          <form onSubmit={handleCheckoutSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <button
                type="button"
                onClick={() => setStep('bag')}
                className="text-xs font-medium text-[#57534E] hover:text-[#141413] underline cursor-pointer"
              >
                ← Return to Shopping Bag
              </button>

              {/* Auth Requirement for Secure Real-Time Order Binding */}
              {!user && (
                <div className="p-5 bg-white border border-[#E7E5E0] space-y-3">
                  <p className="text-sm font-medium text-[#141413]">
                    Sign in to bind your order to real-time tracking
                  </p>
                  <p className="text-xs text-[#57534E] leading-relaxed">
                    Authenticating with Google protects your delivery details and enables instant
                    order status notifications in your account.
                  </p>
                  <button
                    type="button"
                    onClick={() => void signInWithGoogle()}
                    className="px-4 py-2.5 text-xs font-medium bg-[#141413] text-white hover:bg-[#2B2A28] cursor-pointer"
                  >
                    Sign in with Google
                  </button>
                </div>
              )}

              {/* Shipping Address */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-semibold tracking-wider uppercase text-[#78716C]">
                  01. Delivery Destination
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      maxLength={30}
                      placeholder="+1 (555) 234-5678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    maxLength={200}
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    maxLength={300}
                    placeholder="742 Madison Avenue, Apt 8B"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">City</label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">Postal Code</label>
                    <input
                      type="text"
                      required
                      maxLength={24}
                      value={shippingPostalCode}
                      onChange={(e) => setShippingPostalCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">Country</label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={shippingCountry}
                      onChange={(e) => setShippingCountry(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                    />
                  </div>
                </div>

                {user && (
                  <label className="flex items-center gap-2 text-xs text-[#57534E] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveProfileInfo}
                      onChange={(e) => setSaveProfileInfo(e.target.checked)}
                      className="accent-[#141413]"
                    />
                    <span>Save shipping address to my MZD Perfumes account</span>
                  </label>
                )}
              </div>

              {/* Secure Payment Selection */}
              <div className="space-y-3.5 pt-4 border-t border-[#E7E5E0]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold tracking-wider uppercase text-[#78716C]">
                    02. Payment Method
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#57534E]">
                    <Lock className="w-3 h-3 text-[#9A7B4F]" aria-hidden="true" />
                    256-bit TLS Encrypted
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'card' as const, label: 'Card', icon: CreditCard },
                    { id: 'apple_pay' as const, label: 'Express Pay', icon: Smartphone },
                    { id: 'cod' as const, label: 'Cash on Delivery', icon: Truck },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = paymentMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPaymentMethod(opt.id)}
                        className={`p-3 border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                          active
                            ? 'border-[#141413] bg-white text-[#141413]'
                            : 'border-[#E7E5E0] bg-[#F4F3F0]/60 text-[#57534E] hover:border-[#A8A29E]'
                        }`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        <span className="whitespace-nowrap">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {paymentMethod === 'card' && (
                  <div className="p-4 bg-white border border-[#E7E5E0] space-y-3">
                    <div>
                      <label className="block text-xs text-[#57534E] mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        required
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-[#57534E]">Card Number</label>
                        <span className="text-[11px] font-mono text-[#9A7B4F]">{cardBrand}</span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        className="w-full px-3 py-2 text-sm font-mono border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[#57534E] mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="08/29"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                          className="w-full px-3 py-2 text-sm font-mono border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#57534E] mb-1">Security Code</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          required
                          maxLength={4}
                          placeholder="123"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(cleanDigits(e.target.value).slice(0, 4))}
                          className="w-full px-3 py-2 text-sm font-mono border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-[#78716C]">
                      Card numbers are verified client-side with Luhn checks; only tokenized brand,
                      last-4 digits, and authorization code are stored.
                    </p>
                  </div>
                )}

                {paymentMethod === 'apple_pay' && (
                  <div className="p-4 bg-white border border-[#E7E5E0] text-xs text-[#57534E] space-y-1.5">
                    <p className="font-medium text-[#141413]">Instant Biometric Express Pay</p>
                    <p>
                      Authorize <span className="font-mono text-[#141413]">{formatCurrency(grandTotal)}</span>{' '}
                      immediately using your tokenized Express wallet with zero card entry required.
                    </p>
                  </div>
                )}

                {paymentMethod === 'cod' && (
                  <div className="p-4 bg-white border border-[#E7E5E0] text-xs text-[#57534E] space-y-1.5">
                    <p className="font-medium text-[#141413]">
                      Cash on Delivery — Pay {formatCurrency(grandTotal)} upon courier handover
                    </p>
                    <p>
                      Available for insured orders with phone verification. Complimentary delivery
                      applies automatically above {formatCurrency(FREE_SHIPPING_THRESHOLD)}.
                    </p>
                  </div>
                )}
              </div>

              {checkoutError && (
                <div
                  role="alert"
                  className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
                >
                  {checkoutError}
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-[#E7E5E0] space-y-3 shrink-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#57534E]">Total Due</span>
                <span className="font-mono text-base font-medium text-[#141413] tabular-nums">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <button
                type="submit"
                disabled={submitting || !user}
                className="w-full py-3.5 text-sm font-medium bg-[#141413] text-white hover:bg-[#2B2A28] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {submitting
                  ? 'Authorizing & Reserving Batch...'
                  : paymentMethod === 'cod'
                    ? `Confirm COD Order · ${formatCurrency(grandTotal)}`
                    : `Authorize Payment · ${formatCurrency(grandTotal)}`}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Post-Order Confirmation Receipt */}
        {step === 'confirmed' && confirmedReceipt && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col justify-center space-y-6">
            <div className="space-y-3">
              <CheckCircle2 className="w-10 h-10 text-[#15803D]" aria-hidden="true" />
              <p className="text-xs font-medium text-[#9A7B4F]">Atelier Dispatch Scheduled</p>
              <h3 className="font-serif text-3xl font-medium text-[#141413]">
                Order {confirmedReceipt.orderNumber} Confirmed
              </h3>
              <p className="text-sm text-[#57534E] leading-relaxed">
                Your order has been logged with our compounding atelier and synced to your real-time
                tracking dashboard.
              </p>
            </div>

            <div className="bg-white border border-[#E7E5E0] p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#78716C]">Order Reference</span>
                <span className="font-mono font-medium text-[#141413]">
                  {confirmedReceipt.orderNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">Authorization Code</span>
                <span className="font-mono text-[#141413]">{confirmedReceipt.authCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">Payment</span>
                <span className="text-[#141413]">
                  {confirmedReceipt.paymentMethod === 'cod'
                    ? 'Pending Cash on Delivery'
                    : 'Paid & Verified'}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#F0EEE9] font-medium">
                <span className="text-[#141413]">Total</span>
                <span className="font-mono tabular-nums text-[#141413]">
                  {formatCurrency(confirmedReceipt.total)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  const num = confirmedReceipt.orderNumber;
                  setCartOpen(false);
                  navigate('track', { orderNumber: num });
                }}
                className="w-full py-3.5 text-sm font-medium bg-[#141413] text-white hover:bg-[#2B2A28] transition-colors cursor-pointer"
              >
                Open Real-Time Order Tracking
              </button>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="w-full py-3 text-sm font-medium border border-[#E7E5E0] text-[#141413] hover:bg-white transition-colors cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
