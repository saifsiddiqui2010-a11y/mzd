import { ArrowRight, Heart, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BRAND_IMAGES, CLIENT_TESTIMONIALS } from '../data/seedCatalog';
import { formatCurrency } from '../lib/paymentUtils';
import type { FragranceCategory } from '../types';
import { SafeImage } from './SafeImage';

const CATEGORY_TABS: ('All' | FragranceCategory)[] = [
  'All',
  'Oud & Wood',
  'Floral',
  'Amber & Spice',
  'Fresh Citrus',
];

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'longevity';

export function HomeView() {
  const {
    products,
    productsLoading,
    navigate,
    addToCart,
    wishlistIds,
    toggleWishlist,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<'All' | FragranceCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (!query) return true;
      const haystack = [
        p.name,
        p.subtitle,
        p.category,
        ...p.topNotes,
        ...p.heartNotes,
        ...p.baseNotes,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    const sorted = [...list];
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => a.price50ml - b.price50ml);
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => b.price50ml - a.price50ml);
    } else if (sortBy === 'longevity') {
      sorted.sort((a, b) => b.longevityHours - a.longevityHours);
    } else {
      sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
    }
    return sorted;
  }, [products, searchQuery, selectedCategory, sortBy]);

  return (
    <main>
      {/* Section 1: Asymmetric Editorial Split Hero */}
      <section className="border-b border-[#E7E5E0] bg-[#FAFAF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
              <p className="text-xs font-medium tracking-wider text-[#9A7B4F]">
                Private Collection · Small-Batch Extraits
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.08] font-medium text-[#141413] text-balance">
                Rare oud and botanical extraits, macerated for stillness
              </h1>
              <p className="text-base text-[#57534E] leading-relaxed max-w-prose">
                MZD Perfumes composes architectural fragrances in numbered runs using aged Assamese
                agarwood, Grasse harvests, and twelve-week cold cellar maceration.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-medium bg-[#141413] text-white hover:bg-[#2B2A28] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Explore Collection</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('track')}
                  className="px-5 py-3.5 text-sm font-medium text-[#141413] border border-[#D6D3CD] hover:border-[#141413] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Track an Order
                </button>
              </div>

              <div className="pt-6 border-t border-[#E7E5E0] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#57534E]">
                <span>30% Extrait Oil Concentration</span>
                <span aria-hidden="true">·</span>
                <span>Complimentary Insured Express over $180</span>
                <span aria-hidden="true">·</span>
                <span>Live Atelier Tracking</span>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative h-full min-h-[300px] sm:min-h-[420px] lg:min-h-[500px] overflow-hidden bg-[#ECEAE4]">
                <SafeImage
                  src={BRAND_IMAGES.heroFlagship}
                  alt="MZD Perfumes smoked-amber crystal flacon resting on sunlit travertine stone"
                  title="MZD Perfumes Signature Flacon"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-6 sm:p-8 flex items-end justify-between gap-4">
                  <div className="text-white">
                    <p className="text-xs text-white/80">Signature Release</p>
                    <p className="font-serif text-2xl sm:text-3xl font-medium">
                      Aureum Oud · Extrait de Parfum
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('product', { productSlug: 'aureum-oud' })}
                    className="px-4 py-2 text-xs font-medium bg-white text-[#141413] hover:bg-[#F4F3F0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    View Bottle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Curated Collection Grid */}
      <section id="collection" className="py-16 lg:py-24 bg-[#FAFAF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E7E5E0]">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wider text-[#9A7B4F]">
                The Olfactory Wardrobe
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#141413]">
                Curated Fragrances
              </h2>
            </div>

            {/* Interactive Controls: Search & Sort */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search
                  className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes, oud, rose..."
                  aria-label="Search fragrances by name or note"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#E7E5E0] text-[#141413] placeholder:text-[#78716C] focus:outline-none focus:border-[#9A7B4F]"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort fragrances"
                className="px-3.5 py-2.5 text-sm bg-white border border-[#E7E5E0] text-[#141413] focus:outline-none focus:border-[#9A7B4F] cursor-pointer"
              >
                <option value="featured">Sort: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="longevity">Longest Lasting</option>
              </select>
            </div>
          </div>

          {/* Interactive Scent Family Filter Bar */}
          <div className="py-6 flex items-center justify-between gap-4 overflow-x-auto">
            <div
              role="tablist"
              aria-label="Filter fragrances by scent family"
              className="inline-flex items-center gap-1 p-1 bg-[#F0EEE9]"
            >
              {CATEGORY_TABS.map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-white text-[#141413] shadow-xs'
                        : 'text-[#57534E] hover:text-[#141413]'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-[#57534E] tabular-nums whitespace-nowrap shrink-0">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'fragrance' : 'fragrances'}
            </p>
          </div>

          {/* Uniform 3-Column Product Grid */}
          {productsLoading && products.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white border border-[#E7E5E0] animate-pulse">
                  <div className="aspect-[4/3] bg-[#ECEAE4]" />
                  <div className="p-6 space-y-3">
                    <div className="h-3 w-24 bg-[#ECEAE4]" />
                    <div className="h-6 w-40 bg-[#ECEAE4]" />
                    <div className="h-4 w-full bg-[#ECEAE4]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center bg-white border border-[#E7E5E0] p-8 space-y-4">
              <h3 className="font-serif text-2xl text-[#141413]">No fragrances match your filter</h3>
              <p className="text-sm text-[#57534E]">
                Try clearing your search term or browsing all scent families.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="px-5 py-2.5 text-sm font-medium bg-[#141413] text-white hover:bg-[#2B2A28] transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product) => {
                const isSaved = wishlistIds.includes(product.id);
                const outOfStock = product.stock <= 0;
                return (
                  <article
                    key={product.id}
                    className="group bg-white border border-[#E7E5E0] flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] bg-[#EFECE6] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => navigate('product', { productSlug: product.slug })}
                        aria-label={`View details for ${product.name}`}
                        className="block w-full h-full cursor-pointer text-left"
                      >
                        <SafeImage
                          src={product.imageUrl}
                          alt={`${product.name} ${product.concentration} bottle`}
                          title={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggleWishlist(product.id)}
                        aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                        className="absolute top-3 right-3 w-10 h-10 bg-white/90 hover:bg-white text-[#141413] flex items-center justify-center border border-[#E7E5E0] transition-colors cursor-pointer"
                      >
                        <Heart
                          className={`w-4 h-4 ${isSaved ? 'fill-[#9A7B4F] text-[#9A7B4F]' : 'text-[#57534E]'}`}
                        />
                      </button>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs text-[#78716C]">
                          <span>
                            {product.category} · {product.concentration}
                          </span>
                          {outOfStock ? (
                            <span className="text-[#B91C1C] font-medium">Sold Out</span>
                          ) : product.stock <= 10 ? (
                            <span className="text-[#9A7B4F] font-medium">Limited Run</span>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate('product', { productSlug: product.slug })}
                          className="block text-left cursor-pointer"
                        >
                          <h3 className="font-serif text-2xl font-medium text-[#141413] group-hover:text-[#9A7B4F] transition-colors">
                            {product.name}
                          </h3>
                        </button>

                        <p className="text-sm text-[#57534E] line-clamp-2 leading-relaxed">
                          {product.subtitle}
                        </p>

                        <p className="text-xs text-[#78716C] pt-1">
                          Notes: {[...product.topNotes.slice(0, 1), ...product.heartNotes.slice(0, 1), ...product.baseNotes.slice(0, 1)].join(' · ')}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-[#F0EEE9] flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-[#78716C]">50 ml / 100 ml</p>
                          <p className="font-mono text-sm font-medium text-[#141413] tabular-nums">
                            {formatCurrency(product.price50ml)} / {formatCurrency(product.price100ml)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={outOfStock}
                            onClick={() => addToCart(product, 50, 1)}
                            className="px-4 py-2 text-xs font-medium bg-[#141413] text-white hover:bg-[#2B2A28] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {outOfStock ? 'Unavailable' : 'Add 50ml'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Maison Craftsmanship & Provenance + Adjacent Social Proof */}
      <section id="craftsmanship" className="bg-[#121214] text-[#F5F5F4] py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] overflow-hidden bg-[#1E1E22]">
                <SafeImage
                  src={BRAND_IMAGES.atelierCraft}
                  alt="MZD Perfumes artisanal atelier workbench with oud resin, rose petals, and amber essence bottles"
                  title="MZD Perfumes Atelier"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-xs font-medium tracking-wider text-[#C5A472]">
                Atelier Standards · Grasse & Dubai
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-white leading-[1.12] text-balance">
                Patience in the cellar, transparency to your door
              </h2>
              <p className="text-sm sm:text-base text-[#D6D3D1] leading-relaxed">
                Every MZD Perfumes flacon is compounded to order in small batches, cold-filtered
                without synthetic colorants, and sealed with a unique batch number tracked live from
                compounding bench to final courier signature.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-white/10">
                <div>
                  <p className="font-mono text-2xl font-medium text-[#C5A472] tabular-nums">30%</p>
                  <p className="text-xs text-[#A8A29E] mt-1">
                    Average pure aromatic oil ratio across our Extrait releases
                  </p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-medium text-[#C5A472] tabular-nums">12 wks</p>
                  <p className="text-xs text-[#A8A29E] mt-1">
                    Dark limestone maceration period before bottling
                  </p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-medium text-[#C5A472] tabular-nums">72 hrs</p>
                  <p className="text-xs text-[#A8A29E] mt-1">
                    Average insured express dispatch across 38 countries
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Adjacent Attributable Collector Reviews */}
          <div className="pt-12 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-8">
            {CLIENT_TESTIMONIALS.map((item) => (
              <blockquote key={item.name} className="space-y-4">
                <p className="font-serif text-xl sm:text-2xl text-[#F5F5F4] leading-relaxed">
                  “{item.quote}”
                </p>
                <footer className="text-xs text-[#A8A29E]">
                  <span className="text-white font-medium">{item.name}</span> · {item.role},{' '}
                  {item.organization}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Quiet Storefront Footer */}
      <footer className="bg-[#FAFAF9] border-t border-[#E7E5E0] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="font-serif text-xl font-medium text-[#141413]">MZD Perfumes</p>
            <p className="text-xs text-[#78716C]">
              Haute Parfumerie · Direct Atelier Fulfillment · Use code <span className="font-mono text-[#141413]">WELCOME10</span> at checkout
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#57534E]">
            <button
              type="button"
              onClick={() => navigate('home', { scrollToId: 'collection' })}
              className="hover:text-[#141413] cursor-pointer"
            >
              Collection
            </button>
            <button
              type="button"
              onClick={() => navigate('track')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Real-Time Tracking
            </button>
            <button
              type="button"
              onClick={() => navigate('account')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Customer Account
            </button>
            <button
              type="button"
              onClick={() => navigate('admin')}
              className="hover:text-[#141413] cursor-pointer"
            >
              Admin Console
            </button>
          </div>

          <p className="text-xs text-[#78716C]">
            © {new Date().getFullYear()} MZD Perfumes. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
