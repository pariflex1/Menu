'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBucket, setPriceCache } from '@/lib/hooks/use-bucket';
import Image from 'next/image';
import Link from 'next/link';
import BottomNav from '@/components/bottom-nav';
import ThemeToggle from '@/components/theme-toggle';
import {
  ShoppingCart,
  Gift,
  LayoutGrid,
  Coffee,
  Soup,
  Salad,
  Sandwich,
  CupSoda,
  Flame,
  Wheat,
  CookingPot,
  UtensilsCrossed,
  Cookie,
  Leaf,
  IceCreamBowl,
  ChefHat,
  type LucideIcon,
} from 'lucide-react';

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

function getCategoryIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes('breakfast')) return Sandwich;
  if (n.includes('south indian') || n.includes('dosa') || n.includes('idli') || n.includes('uttapam')) return UtensilsCrossed;
  if (n.includes('thali')) return CookingPot;
  if (n.includes('chinese') || n.includes('noodle') || n.includes('manchurian')) return Soup;
  if (n.includes('tandoor') || n.includes('kabab') || n.includes('tikka') || n.includes('nazrane')) return Flame;
  if (n.includes('mocktail')) return CupSoda;
  if (n.includes('beverage') || n.includes('drink') || n.includes('shake') || n.includes('tea') || n.includes('coffee')) return Coffee;
  if (n.includes('snack') || n.includes('pakora')) return Cookie;
  if (n.includes('soup')) return Soup;
  if (n.includes('salad') || n.includes('raita')) return Salad;
  if (n.includes('bread') || n.includes('roti') || n.includes('naan') || n.includes('paratha')) return Wheat;
  if (n.includes('rice') || n.includes('biryani') || n.includes('pulao') || n.includes('basmati')) return CookingPot;
  if (n.includes('dessert') || n.includes('sweet') || n.includes('ice cream') || n.includes('kulfi')) return IceCreamBowl;
  if (n.includes('paneer') || n.includes('veg') || n.includes('curry') || n.includes('dal')) return Leaf;
  return ChefHat;
}

// Category Banner: use the category image when one is configured, otherwise the brand green banner
function CategoryBanner({ category }: { category: Category }) {
  if (category.image_url) {
    return (
      <div className="relative h-32 sm:h-40 w-full rounded-2xl overflow-hidden shadow-sm bg-gray-900">
        <Image
          src={category.image_url}
          alt={category.name}
          fill
          sizes="(max-width: 1280px) 100vw, 1152px"
          className="object-cover"
          unoptimized={category.image_url.startsWith('http')}
        />
        <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-center px-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-wide text-white drop-shadow-md">
            {category.name}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#05C12F] text-white rounded-2xl py-4 sm:py-5 px-6 shadow-sm flex items-center justify-center text-center">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-wide">
        {category.name}
      </h2>
    </div>
  );
}

// Menu Card: Immediate rendering, NO reveal effect, NO delayed entrance
function CustomMenuCard({
  item,
  onOpenDetail,
}: {
  item: MenuItem;
  onOpenDetail: (item: MenuItem) => void;
}) {
  const { items: bucketItems, addItem, updateQuantity } = useBucket();
  const bucketItem = bucketItems.find((b) => b.menu_item_id === item.id);
  const quantity = bucketItem?.quantity || 0;
  const currentTotalAmount = item.price * (quantity > 0 ? quantity : 1);

  return (
    <div
      onClick={() => onOpenDetail(item)}
      className="bg-white border border-gray-200 hover:border-gray-300 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-shadow flex items-stretch cursor-pointer group dark:bg-neutral-900 dark:border-neutral-800 dark:hover:border-neutral-700"
    >
      {/* Left Details */}
      <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-center gap-1">
        <h3 className="font-semibold text-black text-[19px] sm:text-[21px] leading-snug tracking-tight dark:text-gray-100">
          {item.name}
        </h3>
        <p className="text-[13px] sm:text-[14px] text-gray-500 font-normal leading-snug line-clamp-2 dark:text-gray-400">
          {item.description || 'Prepared fresh with premium ingredients'}
        </p>
      </div>

      {/* Right Column */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[90px] sm:w-[100px] shrink-0 flex flex-col border-l border-gray-100 select-none dark:border-neutral-800"
      >
        <div className="flex-1 bg-[#F0F0F0] flex flex-col items-center justify-center px-2 py-3 text-center dark:bg-neutral-800">
          <span className="font-semibold text-black text-[18px] sm:text-[20px] tracking-tight leading-none dark:text-gray-100">
            ₹{currentTotalAmount.toFixed(0)}
          </span>
        </div>

        {quantity === 0 ? (
          <button
            onClick={() => {
              setPriceCache(item.id, item.price);
              addItem({ menu_item_id: item.id, quantity: 1, unit_price: item.price });
            }}
            className="flex-1 bg-[#05C12F] hover:bg-[#04A328] active:bg-[#038723] text-white font-semibold text-[15px] flex items-center justify-center py-3 px-2 transition-colors cursor-pointer"
          >
            + Add
          </button>
        ) : (
          <div className="flex-1 bg-[#05C12F] text-white flex items-center justify-between px-1.5 py-2">
            <button
              onClick={() => updateQuantity(item.id, quantity - 1)}
              aria-label="Decrease quantity"
              className="w-7 h-full flex items-center justify-center font-semibold text-lg hover:bg-[#04A328] rounded transition-colors cursor-pointer"
            >
              −
            </button>
            <span className="font-semibold text-base px-1">{quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, quantity + 1)}
              aria-label="Increase quantity"
              className="w-7 h-full flex items-center justify-center font-semibold text-lg hover:bg-[#04A328] rounded transition-colors cursor-pointer"
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
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col border border-gray-100 dark:bg-neutral-900 dark:border-neutral-800">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between dark:border-neutral-800">
          <span className="text-[11px] font-semibold tracking-wider text-[#05C12F] uppercase dark:text-emerald-400">
            Krishna Anandam
          </span>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 text-sm cursor-pointer dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-200">
            ✕
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <h2 className="text-2xl font-semibold text-black leading-snug tracking-tight dark:text-gray-100">{item.name}</h2>
            <p className="text-[15px] text-gray-500 mt-2 leading-relaxed font-normal dark:text-gray-400">
              {item.description || 'Traditional pure vegetarian recipe cooked fresh to order.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
              <p className="text-[10px] text-gray-400 font-semibold uppercase dark:text-gray-500">Price</p>
              <p className="text-lg font-semibold text-black mt-1 dark:text-gray-100">₹{item.price.toFixed(0)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
              <p className="text-[10px] text-gray-400 font-semibold uppercase dark:text-gray-500">Prep</p>
              <p className="text-lg font-semibold text-[#05C12F] mt-1 dark:text-emerald-400">15-20m</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
              <p className="text-[10px] text-gray-400 font-semibold uppercase dark:text-gray-500">Rating</p>
              <p className="text-lg font-semibold text-amber-600 mt-1 dark:text-amber-400">★ 4.9</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4 dark:border-neutral-800">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold dark:text-gray-500">Total</p>
            <p className="text-2xl font-semibold text-black dark:text-gray-100">₹{currentTotalAmount.toFixed(0)}</p>
          </div>
          {quantity === 0 ? (
            <button
              onClick={() => { setPriceCache(item.id, item.price); addItem({ menu_item_id: item.id, quantity: 1, unit_price: item.price }); }}
              className="flex-1 bg-[#05C12F] hover:bg-[#04A328] text-white font-semibold py-3 px-5 rounded-full text-[15px] transition-all cursor-pointer shadow-md"
            >
              Add to Basket · ₹{item.price.toFixed(0)}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-11 flex items-center bg-[#05C12F] text-white rounded-full px-2 shadow-xs">
                <button onClick={() => updateQuantity(item.id, quantity - 1)} className="w-8 h-full flex items-center justify-center font-semibold text-lg cursor-pointer hover:bg-[#04A328]">−</button>
                <span className="w-8 text-center font-semibold text-base">{quantity}</span>
                <button onClick={() => updateQuantity(item.id, quantity + 1)} className="w-8 h-full flex items-center justify-center font-semibold text-lg cursor-pointer hover:bg-[#04A328]">+</button>
              </div>
              <button onClick={onClose} className="bg-black text-white text-[13px] font-semibold px-5 py-3 rounded-full cursor-pointer hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const LOCAL_STORAGE_MENU_KEY = 'ka_menu_cache_v1';

function MenuInner() {
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
        const res = await fetch('/api/menu?refresh=true', { cache: 'no-store' });
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

  useEffect(() => {
    if (searchQuery || categories.length === 0) return;

    const handleScroll = () => {
      if (window.scrollY <= 4) {
        setActiveCategoryTab('all');
        return;
      }

      const nav = categoryNavRef.current;
      const header = nav?.parentElement;
      const offset = (header?.getBoundingClientRect().bottom ?? 120) + 48;

      let current = 'all';
      for (const cat of categories) {
        const section = document.getElementById(`cat-section-${cat.id}`);
        if (section && section.getBoundingClientRect().top <= offset) {
          current = cat.id;
        }
      }

      setActiveCategoryTab((prev) => (prev === current ? prev : current));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories, searchQuery]);

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
      <div className="customer-page flex min-h-dvh flex-col items-center justify-center px-6 bg-white dark:bg-neutral-950">
        <p className="font-semibold text-gray-800 text-lg mb-4 dark:text-gray-100">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-[#05C12F] text-white font-semibold px-6 py-2.5 rounded-full">Try Again</button>
      </div>
    );
  }

  return (
    <div className="customer-page min-h-dvh bg-[#FAFAFA] pb-24 font-sans dark:bg-neutral-950">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md pt-3.5 pb-2.5 border-b border-gray-200/90 shadow-2xs dark:bg-neutral-950/95 dark:border-neutral-800">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
          <div className="flex items-center gap-2.5">
          {/* Brand Logo Avatar */}
          <Link href="/" aria-label="Krishna Anandam" className="w-9 h-9 rounded-full overflow-hidden bg-white border border-gray-200 shrink-0 shadow-2xs dark:border-neutral-700">
            <Image
              src="https://krishnaanandam.in/wp-content/uploads/2026/08/Hotel-Krsihna-Anandam-Logo.webp"
              alt="Krishna Anandam"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              unoptimized
            />
          </Link>

          <div className={`flex-1 flex items-center gap-2 rounded-full px-3.5 py-2 transition-all border bg-gray-100 dark:bg-neutral-800 ${searchFocused ? '!bg-white dark:!bg-neutral-900 ring-2 ring-[#05C12F]/20 dark:ring-emerald-500/30 !border-[#05C12F] dark:!border-emerald-500' : 'border-transparent'}`}>
            <svg className="w-4 h-4 text-gray-400 shrink-0 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none font-normal dark:text-gray-100 dark:placeholder-gray-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs cursor-pointer dark:bg-neutral-700 dark:text-gray-300 dark:hover:text-gray-100">
                ✕
              </button>
            )}
          </div>

          <ThemeToggle className="bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-300" />

          <Link href="/checkout" aria-label="Cart" className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors dark:bg-neutral-800 dark:hover:bg-neutral-700">
            <ShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-300" strokeWidth={2} />
          </Link>
        </div>

        {/* Category Tabs: Theme dark green background for active tab (#05C12F) + Offer tab at the end */}
        {!searchQuery && categories.length > 0 && (
          <div ref={categoryNavRef} className="flex gap-2 overflow-x-auto no-scrollbar pt-3 items-center">
            <button
              data-cat="all"
              onClick={() => handleJumpToCategory('all')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all press-scale shrink-0 cursor-pointer ${
                activeCategoryTab === 'all'
                  ? 'bg-[#05C12F] text-white shadow-xs dark:bg-emerald-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
              <span>All ({totalDishesCount})</span>
            </button>
            {categories.map((cat) => {
              const isSel = activeCategoryTab === cat.id;
              const CategoryIcon = getCategoryIcon(cat.name);
              return (
                <button
                  key={cat.id}
                  data-cat={cat.id}
                  onClick={() => handleJumpToCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all press-scale shrink-0 cursor-pointer ${
                    isSel
                      ? 'bg-[#05C12F] text-white shadow-xs dark:bg-emerald-700'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-neutral-900 dark:text-gray-300 dark:border-neutral-700 dark:hover:bg-neutral-800'
                  }`}
                >
                  <CategoryIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                  <span>{cat.name}</span>
                </button>
              );
            })}

            <Link
              href="/offer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-700 border border-gray-200 bg-[#FCFCFC] hover:bg-gray-50 press-scale shrink-0 cursor-pointer dark:bg-neutral-900 dark:text-gray-300 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <Gift className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
              <span>Offers</span>
            </Link>
          </div>
        )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 md:px-6 pt-4 space-y-8">
        {loading && !categories.length && (
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                <div className="h-16 bg-[#05C12F]/20 rounded-2xl animate-pulse md:col-span-2 xl:col-span-3" />
                <div className="h-[88px] bg-white rounded-2xl border border-gray-200 animate-pulse dark:bg-neutral-900 dark:border-neutral-800" />
                <div className="h-[88px] bg-white rounded-2xl border border-gray-200 animate-pulse dark:bg-neutral-900 dark:border-neutral-800" />
              </div>
            ))}
          </div>
        )}

        {searchQuery && (
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              {filteredCategories.reduce((s, c) => s + c.items.length, 0)} results
            </span>
            <button onClick={() => setSearchQuery('')} className="text-xs font-semibold text-[#05C12F] hover:underline cursor-pointer dark:text-emerald-400">Clear</button>
          </div>
        )}

        {!filteredCategories.length && searchQuery && (
          <div className="text-center py-16 bg-white rounded-3xl p-6 border border-gray-200 space-y-3 dark:bg-neutral-900 dark:border-neutral-800">
            <p className="text-4xl text-gray-200 dark:text-neutral-600">🔍</p>
            <p className="font-semibold text-gray-800 text-lg dark:text-gray-100">No results for &quot;{searchQuery}&quot;</p>
            <button onClick={() => setSearchQuery('')} className="text-[#05C12F] font-semibold text-sm underline cursor-pointer dark:text-emerald-400">View Full Menu</button>
          </div>
        )}

        {filteredCategories.map((category) => (
          <section key={category.id} id={`cat-section-${category.id}`} className="space-y-3 scroll-mt-36">
            <CategoryBanner category={category} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {category.items.map((item) => (
                <CustomMenuCard
                  key={item.id}
                  item={item}
                  onOpenDetail={(it) => setSelectedDishDetail(it)}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Offer reel banner link placed after all menu sections */}
        <section className="pt-4">
          <Link
            href="/offer"
            className="w-full bg-gradient-to-r from-[#05C12F] to-[#039323] text-white p-5 rounded-2xl flex items-center justify-between shadow-md hover:shadow-lg transition-all group"
          >
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 bg-black/30 px-2 py-0.5 rounded-full inline-block">
                Exclusive Deals
              </span>
              <h3 className="text-xl font-bold">Explore Full-Page Offer Reels</h3>
              <p className="text-xs text-emerald-100 font-normal">Discounts on Thali, Dosas, Tandoor & Desserts</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
              <Gift className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
          </Link>
        </section>
      </main>

      {selectedDishDetail && (
        <DishDetailModal item={selectedDishDetail} onClose={() => setSelectedDishDetail(null)} />
      )}

      <BottomNav activeTab="menu" />
    </div>
  );
}

export default function MenuPageClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-gray-400 dark:bg-neutral-950 dark:text-gray-500">
          Loading menu...
        </div>
      }
    >
      <MenuInner />
    </Suspense>
  );
}
