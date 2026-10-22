'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBucket, setPriceCache } from '@/lib/hooks/use-bucket';
import Image from 'next/image';
import Link from 'next/link';
import BottomNav from '@/components/bottom-nav';
import PwaInstallBanner from '@/components/pwa-install-banner';

interface Addon {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  veg_type: string;
  is_available: boolean;
  is_featured: boolean;
  image_url: string | null;
  addons: Addon[];
}

interface Category {
  id: string;
  name: string;
  description: string;
  image_url?: string | null;
  sort_order: number;
  items: MenuItem[];
}

interface RestaurantInfo {
  name: string;
  address: string;
  phone: string;
}

function getCategoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('breakfast')) return '🥪';
  if (n.includes('south indian') || n.includes('dosa')) return '🥞';
  if (n.includes('thali')) return '🍱';
  if (n.includes('chinese') || n.includes('noodle')) return '🍜';
  if (n.includes('tandoor') || n.includes('kabab') || n.includes('tikka') || n.includes('nazrane')) return '🍢';
  if (n.includes('mocktail')) return '🍹';
  if (n.includes('beverage') || n.includes('drink') || n.includes('shake') || n.includes('tea') || n.includes('coffee')) return '🧃';
  if (n.includes('snack') || n.includes('pakora')) return '🍟';
  if (n.includes('soup')) return '🥣';
  if (n.includes('salad') || n.includes('raita')) return '🥗';
  if (n.includes('bread') || n.includes('roti') || n.includes('naan') || n.includes('paratha')) return '🫔';
  if (n.includes('rice') || n.includes('biryani') || n.includes('pulao') || n.includes('basmati')) return '🍚';
  if (n.includes('dessert') || n.includes('sweet') || n.includes('ice cream') || n.includes('kulfi')) return '🍨';
  if (n.includes('paneer') || n.includes('veg') || n.includes('curry') || n.includes('dal')) return '🍲';
  return '🍽️';
}

function getCategoryBannerImage(categoryName: string, customImageUrl?: string | null): string {
  if (customImageUrl && customImageUrl.startsWith('http')) return customImageUrl;
  const n = categoryName.toLowerCase();
  if (n.includes('thali')) return 'https://images.unsplash.com/photo-1589778655375-3e622a9fc91c?auto=format&fit=crop&w=1200&q=80';
  if (n.includes('south indian') || n.includes('dosa')) return 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1200&q=80';
  if (n.includes('tandoor') || n.includes('kabab') || n.includes('tikka')) return 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=1200&q=80';
  if (n.includes('chinese') || n.includes('noodle')) return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=1200&q=80';
  if (n.includes('bread') || n.includes('roti') || n.includes('naan') || n.includes('paratha')) return 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=1200&q=80';
  if (n.includes('dessert') || n.includes('sweet') || n.includes('ice cream') || n.includes('kulfi')) return 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1200&q=80';
  if (n.includes('mocktail') || n.includes('beverage') || n.includes('drink') || n.includes('shake') || n.includes('coffee') || n.includes('tea')) return 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80';
  if (n.includes('rice') || n.includes('biryani') || n.includes('pulao')) return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80';
  if (n.includes('soup')) return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80';
  if (n.includes('salad') || n.includes('raita')) return 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1200&q=80';
  if (n.includes('snack') || n.includes('pakora') || n.includes('breakfast')) return 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80';
  return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1200&q=80';
}

// Category Banner with scroll reveal
function CategoryBanner({ category }: { category: Category }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const bannerImg = getCategoryBannerImage(category.name, category.image_url);
  const icon = getCategoryIcon(category.name);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="reveal-banner relative h-36 sm:h-44 w-full rounded-2xl overflow-hidden shadow-xs group bg-gray-900 border border-gray-100"
    >
      <Image
        src={bannerImg}
        alt={category.name}
        fill
        loading="lazy"
        className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 480px) 100vw, 480px"
        unoptimized={bannerImg.startsWith('http')}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent flex flex-col justify-end p-4 sm:p-5 text-white">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">{icon}</span>
              <span className="text-[9px] font-black tracking-wider uppercase text-emerald-400 bg-black/40 px-2 py-0.5 rounded-full border border-emerald-400/20 inline-block">
                100% PURE VEG
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold leading-tight tracking-tight">
              {category.name}
            </h2>
            {category.description && (
              <p className="text-[12px] text-gray-300 font-normal line-clamp-1 mt-0.5 opacity-90">
                {category.description}
              </p>
            )}
          </div>
          <span className="text-[11px] font-semibold bg-white text-gray-900 px-3 py-1.5 rounded-full shrink-0 shadow-sm">
            {category.items.length} Dishes
          </span>
        </div>
      </div>
    </div>
  );
}

// Custom Menu Card with scroll reveal + staggered entrance
function CustomMenuCard({
  item,
  index,
  onOpenDetail,
}: {
  item: MenuItem;
  index: number;
  onOpenDetail: (item: MenuItem) => void;
}) {
  const { items: bucketItems, addItem, updateQuantity } = useBucket();
  const bucketItem = bucketItems.find((b) => b.menu_item_id === item.id);
  const quantity = bucketItem?.quantity || 0;
  const currentTotalAmount = item.price * (quantity > 0 ? quantity : 1);

  const cardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const delay = Math.min(index % 6, 5) * 60;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => { el.classList.add('is-visible'); }, delay);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -50px 0px', threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={cardRef}
      onClick={() => onOpenDetail(item)}
      className="reveal-card bg-white border border-gray-200 hover:border-gray-300 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-shadow flex items-stretch cursor-pointer group"
    >
      {/* Left Details */}
      <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-center gap-1">
        <h3 className="font-semibold text-black text-[19px] sm:text-[21px] leading-snug tracking-tight">
          {item.name}
        </h3>
        <p className="text-[13px] sm:text-[14px] text-gray-400 font-normal leading-snug line-clamp-2">
          {item.description || 'Prepared fresh with premium ingredients'}
        </p>
      </div>

      {/* Right Column */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[90px] sm:w-[100px] shrink-0 flex flex-col border-l border-gray-100 select-none"
      >
        <div className="flex-1 bg-[#F0F0F0] flex flex-col items-center justify-center px-2 py-3 text-center">
          {quantity > 1 && (
            <span className="text-[11px] text-[#2E5026] font-semibold leading-none mb-1">
              ×{quantity}
            </span>
          )}
          <span className="font-semibold text-black text-[18px] sm:text-[20px] tracking-tight leading-none">
            ₹{currentTotalAmount.toFixed(0)}
          </span>
        </div>

        {quantity === 0 ? (
          <button
            onClick={() => {
              setPriceCache(item.id, item.price);
              addItem({ menu_item_id: item.id, quantity: 1, unit_price: item.price });
            }}
            className="flex-1 bg-[#2E5026] hover:bg-[#233d1c] active:bg-[#1a2d15] text-white font-semibold text-[15px] flex items-center justify-center py-3 px-2 transition-colors cursor-pointer"
          >
            + Add
          </button>
        ) : (
          <div className="flex-1 bg-[#2E5026] text-white flex items-center justify-between px-1.5 py-2">
            <button
              onClick={() => updateQuantity(item.id, quantity - 1)}
              aria-label="Decrease quantity"
              className="w-7 h-full flex items-center justify-center font-semibold text-lg hover:bg-[#233d1c] rounded transition-colors cursor-pointer"
            >
              −
            </button>
            <span className="font-semibold text-base px-1">{quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, quantity + 1)}
              aria-label="Increase quantity"
              className="w-7 h-full flex items-center justify-center font-semibold text-lg hover:bg-[#233d1c] rounded transition-colors cursor-pointer"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DishDetailModal({
  item,
  onClose,
}: {
  item: MenuItem | null;
  onClose: () => void;
}) {
  const { items: bucketItems, addItem, updateQuantity } = useBucket();
  if (!item) return null;
  const bucketItem = bucketItems.find((b) => b.menu_item_id === item.id);
  const quantity = bucketItem?.quantity || 0;
  const currentTotalAmount = item.price * (quantity > 0 ? quantity : 1);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-[#2E5026] uppercase">
            Krishna Anandam
          </span>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 text-sm cursor-pointer">
            ✕
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <h2 className="text-2xl font-semibold text-black leading-snug tracking-tight">{item.name}</h2>
            <p className="text-[15px] text-gray-500 mt-2 leading-relaxed font-normal">
              {item.description || 'Traditional pure vegetarian recipe cooked fresh to order.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Price</p>
              <p className="text-lg font-semibold text-black mt-1">₹{item.price.toFixed(0)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Prep</p>
              <p className="text-lg font-semibold text-[#2E5026] mt-1">15-20m</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Rating</p>
              <p className="text-lg font-semibold text-amber-600 mt-1">★ 4.9</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total</p>
            <p className="text-2xl font-semibold text-black">₹{currentTotalAmount.toFixed(0)}</p>
          </div>
          {quantity === 0 ? (
            <button
              onClick={() => { setPriceCache(item.id, item.price); addItem({ menu_item_id: item.id, quantity: 1, unit_price: item.price }); }}
              className="flex-1 bg-[#2E5026] hover:bg-[#233d1c] text-white font-semibold py-3 px-5 rounded-full text-[15px] transition-all cursor-pointer shadow-md"
            >
              Add to Basket · ₹{item.price.toFixed(0)}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-11 flex items-center bg-[#2E5026] text-white rounded-full px-2 shadow-xs">
                <button onClick={() => updateQuantity(item.id, quantity - 1)} className="w-8 h-full flex items-center justify-center font-semibold text-lg cursor-pointer hover:bg-[#233d1c]">−</button>
                <span className="w-8 text-center font-semibold text-base">{quantity}</span>
                <button onClick={() => updateQuantity(item.id, quantity + 1)} className="w-8 h-full flex items-center justify-center font-semibold text-lg cursor-pointer hover:bg-[#233d1c]">+</button>
              </div>
              <button onClick={onClose} className="bg-black text-white text-[13px] font-semibold px-5 py-3 rounded-full cursor-pointer hover:bg-gray-900">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const LOCAL_STORAGE_MENU_KEY = 'ka_menu_cache_v1';

function MenuPageContent() {
  const searchParams = useSearchParams();
  const catQueryParam = searchParams.get('cat') || searchParams.get('category') || '';
  const initialSearchParam = searchParams.get('q') || '';

  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearchParam);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>(catQueryParam || 'all');
  const [selectedDishDetail, setSelectedDishDetail] = useState<MenuItem | null>(null);
  const categoryNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let hasCached = false;
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_MENU_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.categories?.length > 0) {
          setCategories(parsed.categories);
          if (parsed.restaurant) setRestaurant(parsed.restaurant);
          setLoading(false);
          hasCached = true;
        }
      }
    } catch { /* ignore */ }

    async function fetchMenu() {
      try {
        const res = await fetch('/api/menu');
        const data = await res.json();
        if (!res.ok || !data.categories) {
          if (!hasCached) setError('Failed to load menu. Please try again.');
          return;
        }
        setCategories(data.categories);
        if (data.restaurant) setRestaurant(data.restaurant);
        try { localStorage.setItem(LOCAL_STORAGE_MENU_KEY, JSON.stringify(data)); } catch { /* ignore */ }
      } catch {
        if (!hasCached) setError('Failed to connect to server.');
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  useEffect(() => {
    if (!catQueryParam || !categories.length) return;
    const target = categories.find(
      (c) => c.id === catQueryParam || c.name.toLowerCase().includes(catQueryParam.toLowerCase())
    );
    if (target) {
      setActiveCategoryTab(target.id);
      setTimeout(() => {
        document.getElementById(`cat-section-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }, [catQueryParam, categories]);

  const handleJumpToCategory = (catId: string) => {
    setActiveCategoryTab(catId);
    if (catId === 'all') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    document.getElementById(`cat-section-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const btn = categoryNavRef.current?.querySelector(`[data-cat="${catId}"]`) as HTMLElement;
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  const totalDishesCount = categories.reduce((s, c) => s + (c.items?.length || 0), 0);

  const filteredCategories = categories
    .map((cat) => {
      if (!searchQuery.trim()) return cat;
      const q = searchQuery.toLowerCase();
      return { ...cat, items: cat.items.filter((item) => item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)) };
    })
    .filter((cat) => cat.items.length > 0);

  if (error && !categories.length) {
    return (
      <div className="customer-page flex min-h-dvh flex-col items-center justify-center px-6 bg-white">
        <p className="font-semibold text-gray-800 text-lg mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-[#2E5026] text-white font-semibold px-6 py-2.5 rounded-full">Try Again</button>
      </div>
    );
  }

  return (
    <div className="customer-page min-h-dvh bg-[#FAFAFA] pb-24 font-sans">
      <PwaInstallBanner />

      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 pt-3.5 pb-2.5 border-b border-gray-200/90 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Link href="/" aria-label="Back" className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-800 font-semibold text-xl shrink-0 transition-colors">
            ‹
          </Link>

          <div className={`flex-1 flex items-center gap-2 rounded-full px-3.5 py-2 transition-all border bg-gray-100 ${searchFocused ? '!bg-white ring-2 ring-[#2E5026]/20 !border-[#2E5026]' : 'border-transparent'}`}>
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none font-normal"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs cursor-pointer">
                ✕
              </button>
            )}
          </div>

          <Link href="/checkout" aria-label="Cart" className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm shrink-0 transition-colors">
            🛒
          </Link>
        </div>

        {!searchQuery && categories.length > 0 && (
          <div ref={categoryNavRef} className="flex gap-2 overflow-x-auto no-scrollbar pt-3 items-center">
            <button
              data-cat="all"
              onClick={() => handleJumpToCategory('all')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all press-scale shrink-0 cursor-pointer ${activeCategoryTab === 'all' ? 'bg-[#2E5026] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <span>🍽️</span>
              <span>All ({totalDishesCount})</span>
            </button>
            {categories.map((cat) => {
              const isSel = activeCategoryTab === cat.id;
              return (
                <button
                  key={cat.id}
                  data-cat={cat.id}
                  onClick={() => handleJumpToCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all press-scale shrink-0 cursor-pointer ${isSel ? 'bg-[#2E5026] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
                >
                  <span>{getCategoryIcon(cat.name)}</span>
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSel ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{cat.items.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main className="px-4 pt-4 space-y-8">
        {loading && !categories.length && (
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="space-y-2.5">
                <div className="h-36 bg-gray-200 rounded-2xl animate-pulse" />
                <div className="h-[88px] bg-white rounded-2xl border border-gray-200 animate-pulse" />
                <div className="h-[88px] bg-white rounded-2xl border border-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {searchQuery && (
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-normal text-gray-500">
              {filteredCategories.reduce((s, c) => s + c.items.length, 0)} results
            </span>
            <button onClick={() => setSearchQuery('')} className="text-xs font-semibold text-[#2E5026] hover:underline cursor-pointer">Clear</button>
          </div>
        )}

        {!filteredCategories.length && searchQuery && (
          <div className="text-center py-16 bg-white rounded-3xl p-6 border border-gray-200 space-y-3">
            <p className="text-4xl text-gray-200">🔍</p>
            <p className="font-semibold text-gray-800 text-lg">No results for &quot;{searchQuery}&quot;</p>
            <button onClick={() => setSearchQuery('')} className="text-[#2E5026] font-semibold text-sm underline cursor-pointer">View Full Menu</button>
          </div>
        )}

        {filteredCategories.map((category) => {
          let idx = 0;
          return (
            <section key={category.id} id={`cat-section-${category.id}`} className="space-y-3 scroll-mt-36">
              <CategoryBanner category={category} />
              <div className="space-y-3">
                {category.items.map((item) => (
                  <CustomMenuCard
                    key={item.id}
                    item={item}
                    index={idx++}
                    onOpenDetail={(it) => setSelectedDishDetail(it)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {selectedDishDetail && (
        <DishDetailModal item={selectedDishDetail} onClose={() => setSelectedDishDetail(null)} />
      )}

      <BottomNav activeTab="menu" />
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-gray-400">
          Loading menu...
        </div>
      }
    >
      <MenuPageContent />
    </Suspense>
  );
}
