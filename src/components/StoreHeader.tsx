import { Menu, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';

export function StoreHeader() {
  const { route, navigate, cartCount, setCartOpen, user } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { label: string; active: boolean; onClick: () => void }[] = [
    {
      label: 'Collection',
      active: route === 'home' || route === 'product',
      onClick: () => {
        setMobileMenuOpen(false);
        navigate('home', { scrollToId: 'collection' });
      },
    },
    {
      label: 'Craft',
      active: false,
      onClick: () => {
        setMobileMenuOpen(false);
        navigate('home', { scrollToId: 'craftsmanship' });
      },
    },
    {
      label: 'Track Order',
      active: route === 'track',
      onClick: () => {
        setMobileMenuOpen(false);
        navigate('track');
      },
    },
    {
      label: user ? 'Account' : 'Sign In',
      active: route === 'account',
      onClick: () => {
        setMobileMenuOpen(false);
        navigate('account');
      },
    },
    {
      label: 'Admin',
      active: route === 'admin',
      onClick: () => {
        setMobileMenuOpen(false);
        navigate('admin');
      },
    },
  ];

  return (
    <header className="sticky top-0 z-40 h-16 bg-[#FAFAF9]/95 backdrop-blur-sm border-b border-[#E7E5E0]">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => navigate('home')}
          className="font-serif text-2xl font-medium tracking-tight text-[#141413] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9A7B4F]"
        >
          MZD Perfumes
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57534E]"
        >
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                item.active
                  ? 'text-[#141413] border-[#9A7B4F]'
                  : 'border-transparent hover:text-[#141413] hover:border-[#D6D3CD]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Single Primary Action (Shopping Bag) + Mobile Drawer Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Open shopping bag with ${cartCount} items`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#141413] text-white hover:bg-[#2B2A28] transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>Bag</span>
            <span className="font-mono text-xs tabular-nums">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 text-[#141413] border border-[#E7E5E0] bg-white hover:bg-[#F4F3F0] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAFAF9] border-b border-[#E7E5E0] px-4 py-4 shadow-sm">
          <nav aria-label="Mobile navigation" className="flex flex-col divide-y divide-[#ECEAE4]">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`py-3.5 text-left text-base font-medium flex items-center justify-between cursor-pointer ${
                  item.active ? 'text-[#9A7B4F]' : 'text-[#141413]'
                }`}
              >
                <span>{item.label}</span>
                {item.active && <span className="text-xs text-[#9A7B4F]">Current</span>}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
