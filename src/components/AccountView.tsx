import { Heart, LogOut, Package, Shield, User as UserIcon } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/paymentUtils';
import { updateUserProfile } from '../lib/storeService';
import { SafeImage } from './SafeImage';

type AccountTab = 'orders' | 'wishlist' | 'profile';

export function AccountView() {
  const {
    user,
    authReady,
    isAdmin,
    profile,
    products,
    userOrders,
    wishlistIds,
    signInWithGoogle,
    signOutUser,
    toggleWishlist,
    addToCart,
    navigate,
    showToast,
  } = useApp();

  const [tab, setTab] = useState<AccountTab>('orders');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhone(profile.phone || '');
      setAddressLine(profile.addressLine || '');
      setCity(profile.city || '');
      setPostalCode(profile.postalCode || '');
      setCountry(profile.country || '');
    }
  }, [profile]);

  const savedFragrances = products.filter((p) => wishlistIds.includes(p.id));

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateUserProfile(user.uid, {
        displayName,
        phone,
        addressLine,
        city,
        postalCode,
        country,
      });
      showToast('Shipping profile updated.');
    } catch {
      showToast('Unable to save profile changes.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  if (!authReady) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-sm text-[#78716C]">
        Loading account...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[#FAFAF9] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white border border-[#E7E5E0] p-8 sm:p-10 space-y-6">
          <p className="text-xs font-medium tracking-wider text-[#9A7B4F]">Collector Portal</p>
          <h1 className="font-serif text-4xl font-medium text-[#141413]">
            Sign in to MZD Perfumes
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Access real-time order tracking, saved delivery addresses, your private fragrance
            wishlist, and instant checkout.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="w-full py-3.5 text-sm font-medium bg-[#141413] text-white hover:bg-[#2B2A28] transition-colors cursor-pointer"
          >
            Continue with Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#FAFAF9] py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Account Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#E7E5E0]">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wider text-[#9A7B4F]">Collector Account</p>
            <h1 className="font-serif text-4xl font-medium text-[#141413]">
              {profile?.displayName || user.displayName || 'MZD Collector'}
            </h1>
            <p className="text-xs text-[#57534E]">{user.email}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('admin')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#141413] text-white hover:bg-[#2B2A28] cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Open Admin Console</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border border-[#E7E5E0] bg-white text-[#141413] hover:border-[#141413] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Account Tabs */}
        <div
          role="tablist"
          aria-label="Account sections"
          className="inline-flex items-center gap-1 p-1 bg-[#F0EEE9]"
        >
          {[
            { id: 'orders' as const, label: `Orders (${userOrders.length})`, icon: Package },
            { id: 'wishlist' as const, label: `Saved (${savedFragrances.length})`, icon: Heart },
            { id: 'profile' as const, label: 'Shipping Profile', icon: UserIcon },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active ? 'bg-white text-[#141413] shadow-xs' : 'text-[#57534E] hover:text-[#141413]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Orders */}
        {tab === 'orders' && (
          <section className="space-y-4">
            {userOrders.length === 0 ? (
              <div className="bg-white border border-[#E7E5E0] p-12 text-center space-y-4">
                <h2 className="font-serif text-2xl text-[#141413]">No orders placed yet</h2>
                <p className="text-sm text-[#57534E]">
                  Once you place an order, you can track its live compounding and courier status
                  here.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('home', { scrollToId: 'collection' })}
                  className="px-6 py-3 text-sm font-medium bg-[#141413] text-white cursor-pointer"
                >
                  Browse Fragrances
                </button>
              </div>
            ) : (
              <div className="bg-white border border-[#E7E5E0] divide-y divide-[#F0EEE9]">
                {userOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono text-sm font-medium text-[#141413]">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs text-[#9A7B4F] capitalize font-medium">
                          {order.status === 'packed' ? 'Quality Sealed' : order.status}
                        </span>
                        <span className="text-xs text-[#78716C]">
                          · {order.paymentBrand}
                          {order.paymentLast4 ? ` •••• ${order.paymentLast4}` : ''}
                        </span>
                      </div>
                      <p className="text-sm text-[#57534E]">
                        {order.items.map((i) => `${i.name} (${i.sizeMl}ml ×${i.quantity})`).join(', ')}
                      </p>
                      <p className="text-xs text-[#78716C]">
                        Delivering to {order.shippingCity}, {order.shippingCountry} · Est.{' '}
                        {order.estimatedDelivery}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono text-base font-medium text-[#141413] tabular-nums">
                        {formatCurrency(order.total)}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('track', { orderNumber: order.orderNumber })}
                        className="px-4 py-2 text-xs font-medium bg-[#141413] text-white hover:bg-[#2B2A28] whitespace-nowrap cursor-pointer"
                      >
                        Track Live
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Wishlist */}
        {tab === 'wishlist' && (
          <section>
            {savedFragrances.length === 0 ? (
              <div className="bg-white border border-[#E7E5E0] p-12 text-center space-y-4">
                <h2 className="font-serif text-2xl text-[#141413]">No saved fragrances</h2>
                <p className="text-sm text-[#57534E]">
                  Tap the heart icon on any fragrance in the collection to curate your personal
                  wardrobe.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('home', { scrollToId: 'collection' })}
                  className="px-6 py-3 text-sm font-medium bg-[#141413] text-white cursor-pointer"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedFragrances.map((product) => (
                  <div key={product.id} className="bg-white border border-[#E7E5E0] flex flex-col">
                    <button
                      type="button"
                      onClick={() => navigate('product', { productSlug: product.slug })}
                      className="aspect-[4/3] bg-[#EFECE6] overflow-hidden cursor-pointer"
                    >
                      <SafeImage
                        src={product.imageUrl}
                        alt={product.name}
                        title={product.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <p className="text-xs text-[#78716C]">{product.category}</p>
                        <h3 className="font-serif text-2xl text-[#141413] mt-0.5">{product.name}</h3>
                        <p className="font-mono text-sm text-[#141413] mt-1 tabular-nums">
                          {formatCurrency(product.price50ml)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addToCart(product, 50, 1)}
                          className="flex-1 py-2.5 text-xs font-medium bg-[#141413] text-white hover:bg-[#2B2A28] cursor-pointer"
                        >
                          Add 50ml to Bag
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleWishlist(product.id)}
                          className="px-3 py-2.5 text-xs border border-[#E7E5E0] text-[#57534E] hover:text-[#B91C1C] cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 3: Shipping Profile */}
        {tab === 'profile' && (
          <section className="max-w-2xl bg-white border border-[#E7E5E0] p-6 sm:p-8">
            <h2 className="font-serif text-2xl font-medium text-[#141413] mb-1">
              Default Delivery Address
            </h2>
            <p className="text-xs text-[#78716C] mb-6">
              Pre-fills your checkout details automatically. Stored privately to your account.
            </p>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Phone</label>
                  <input
                    type="tel"
                    maxLength={30}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#57534E] mb-1">Street Address</label>
                <input
                  type="text"
                  maxLength={200}
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">City</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Postal Code</label>
                  <input
                    type="text"
                    maxLength={24}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">Country</label>
                  <input
                    type="text"
                    maxLength={80}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-[#E7E5E0] focus:outline-none focus:border-[#9A7B4F]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-3 text-sm font-medium bg-[#141413] text-white hover:bg-[#2B2A28] disabled:opacity-40 cursor-pointer"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
