import { ArrowLeft, Check, Heart, ShieldCheck, Truck } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/paymentUtils';
import { FREE_SHIPPING_THRESHOLD } from '../types';
import { SafeImage } from './SafeImage';

export function ProductDetailView() {
  const {
    products,
    selectedProductSlug,
    navigate,
    addToCart,
    setCartOpen,
    wishlistIds,
    toggleWishlist,
  } = useApp();

  const product =
    products.find((p) => p.slug === selectedProductSlug) ?? products[0] ?? null;

  const [sizeMl, setSizeMl] = useState<50 | 100>(50);
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl text-[#141413]">Fragrance not found</h1>
        <button
          type="button"
          onClick={() => navigate('home')}
          className="px-5 py-2.5 text-sm font-medium bg-[#141413] text-white cursor-pointer"
        >
          Return to Collection
        </button>
      </main>
    );
  }

  const activePrice = sizeMl === 100 ? product.price100ml : product.price50ml;
  const isSaved = wishlistIds.includes(product.id);
  const outOfStock = product.stock <= 0;
  const related = products.filter((p) => p.id !== product.id).slice(0, 3);

  const handleAddAndOpen = () => {
    addToCart(product, sizeMl, quantity);
    setCartOpen(true);
  };

  return (
    <main className="pb-24 md:pb-16 bg-[#FAFAF9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <button
          type="button"
          onClick={() => navigate('home', { scrollToId: 'collection' })}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#57534E] hover:text-[#141413] transition-colors mb-8 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Collection</span>
        </button>

        {/* Contiguous Two-Column PDP: Sticky Gallery Left, Contiguous Purchase Module Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <div className="lg:col-span-7 lg:sticky lg:top-24">
            <div className="aspect-[4/3] bg-[#EFECE6] border border-[#E7E5E0] overflow-hidden">
              <SafeImage
                src={product.imageUrl}
                alt={`${product.name} ${product.concentration} bottle`}
                title={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Olfactory Pyramid */}
            <div className="mt-8 bg-white border border-[#E7E5E0] p-6 sm:p-8 space-y-6">
              <div className="flex items-baseline justify-between gap-4 border-b border-[#F0EEE9] pb-4">
                <h2 className="font-serif text-2xl font-medium text-[#141413]">
                  Olfactory Architecture
                </h2>
                <span className="text-xs text-[#78716C] tabular-nums">
                  Longevity {product.longevityHours} hrs · Sillage {product.sillage}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#9A7B4F]">01. Top Notes</p>
                  <ul className="space-y-1.5 text-sm text-[#141413]">
                    {product.topNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#9A7B4F]">02. Heart Notes</p>
                  <ul className="space-y-1.5 text-sm text-[#141413]">
                    {product.heartNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#9A7B4F]">03. Base Notes</p>
                  <ul className="space-y-1.5 text-sm text-[#141413]">
                    {product.baseNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Contiguous Purchase Module */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 bg-white border border-[#E7E5E0] p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <p className="text-xs text-[#78716C]">
                {product.category} · {product.concentration}
              </p>
              <h1 className="font-serif text-4xl font-medium text-[#141413] text-balance">
                {product.name}
              </h1>
              <p className="text-sm text-[#57534E] leading-relaxed">{product.subtitle}</p>
            </div>

            <div className="flex items-baseline justify-between gap-4 py-4 border-y border-[#F0EEE9]">
              <p className="font-mono text-2xl font-medium text-[#141413] tabular-nums">
                {formatCurrency(activePrice)}
              </p>
              <p
                className={`text-xs font-medium tabular-nums ${
                  outOfStock
                    ? 'text-[#B91C1C]'
                    : product.stock <= 10
                      ? 'text-[#9A7B4F]'
                      : 'text-[#15803D]'
                }`}
              >
                {outOfStock
                  ? 'Out of stock'
                  : product.stock <= 10
                    ? `Low stock · ${product.stock} flacons remaining`
                    : `In stock · ${product.stock} flacons ready`}
              </p>
            </div>

            {/* Volume Selector */}
            <div className="space-y-2.5">
              <label className="block text-xs font-medium text-[#57534E]">
                Flacon Volume
              </label>
              <div className="grid grid-cols-2 gap-3">
                {([50, 100] as const).map((ml) => {
                  const selected = sizeMl === ml;
                  const price = ml === 100 ? product.price100ml : product.price50ml;
                  return (
                    <button
                      key={ml}
                      type="button"
                      onClick={() => setSizeMl(ml)}
                      className={`p-3.5 text-left border transition-colors cursor-pointer ${
                        selected
                          ? 'border-[#141413] bg-[#FAFAF9]'
                          : 'border-[#E7E5E0] hover:border-[#A8A29E]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#141413]">{ml} ml</span>
                        {selected && <Check className="w-4 h-4 text-[#9A7B4F]" aria-hidden="true" />}
                      </div>
                      <p className="font-mono text-xs text-[#57534E] mt-1 tabular-nums">
                        {formatCurrency(price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity & Primary Purchase CTA */}
            <div className="flex items-center gap-3 pt-1">
              <div className="inline-flex items-center border border-[#E7E5E0] h-12">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="w-11 h-full text-base text-[#141413] hover:bg-[#F4F3F0] cursor-pointer"
                >
                  −
                </button>
                <span className="w-10 text-center font-mono text-sm tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))}
                  aria-label="Increase quantity"
                  className="w-11 h-full text-base text-[#141413] hover:bg-[#F4F3F0] cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                disabled={outOfStock}
                onClick={handleAddAndOpen}
                className="flex-1 h-12 px-6 text-sm font-medium bg-[#141413] text-white hover:bg-[#2B2A28] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {outOfStock
                  ? 'Currently Unavailable'
                  : `Add to Bag · ${formatCurrency(activePrice * quantity)}`}
              </button>

              <button
                type="button"
                onClick={() => void toggleWishlist(product.id)}
                aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
                className="w-12 h-12 border border-[#E7E5E0] hover:border-[#141413] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Heart
                  className={`w-4 h-4 ${isSaved ? 'fill-[#9A7B4F] text-[#9A7B4F]' : 'text-[#57534E]'}`}
                />
              </button>
            </div>

            <p className="text-sm text-[#57534E] leading-relaxed pt-2">{product.description}</p>

            {/* Fulfillment & Payment Guarantees */}
            <div className="pt-4 border-t border-[#F0EEE9] space-y-3 text-xs text-[#57534E]">
              <div className="flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-[#9A7B4F] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Complimentary insured express shipping on orders over{' '}
                  <span className="font-mono text-[#141413]">
                    {formatCurrency(FREE_SHIPPING_THRESHOLD)}
                  </span>{' '}
                  with real-time atelier tracking.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#9A7B4F] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Encrypted card payments, Apple Pay Express, and verified Cash on Delivery supported.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Fragrances */}
        {related.length > 0 && (
          <section className="mt-20 pt-12 border-t border-[#E7E5E0]">
            <h2 className="font-serif text-3xl font-medium text-[#141413] mb-8">
              Also from the Private Collection
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {related.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSizeMl(50);
                    setQuantity(1);
                    navigate('product', { productSlug: item.slug });
                  }}
                  className="group bg-white border border-[#E7E5E0] text-left transition-transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="aspect-[4/3] bg-[#EFECE6] overflow-hidden">
                    <SafeImage
                      src={item.imageUrl}
                      alt={item.name}
                      title={item.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  </div>
                  <div className="p-5 flex items-baseline justify-between gap-2">
                    <div>
                      <p className="text-xs text-[#78716C]">{item.category}</p>
                      <p className="font-serif text-xl font-medium text-[#141413] mt-0.5">
                        {item.name}
                      </p>
                    </div>
                    <p className="font-mono text-sm text-[#141413] tabular-nums">
                      {formatCurrency(item.price50ml)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile Sticky Bottom Buy Bar (<= 64px height) */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-t border-[#E7E5E0] px-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#141413] truncate">{product.name}</p>
          <p className="font-mono text-xs text-[#57534E] tabular-nums">
            {sizeMl} ml · {formatCurrency(activePrice * quantity)}
          </p>
        </div>
        <button
          type="button"
          disabled={outOfStock}
          onClick={handleAddAndOpen}
          className="px-5 py-2.5 text-xs font-medium bg-[#141413] text-white disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {outOfStock ? 'Sold Out' : 'Add to Bag'}
        </button>
      </div>
    </main>
  );
}
