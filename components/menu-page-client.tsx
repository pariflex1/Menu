'use client';

import { useState, useEffect, useRef, useMemo, useCallback, memo, Suspense } from 'react';
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
      <div className="relative h-28 w-full rounded-2xl overflow-hidden shadow-sm bg-gray-900">
        <Image
          src={category.image_url}
          alt={category.name}
          fill
          sizes="480px"
          className="object-cover"
          unoptimized={category.image_url.startsWith('http')}
        />
        <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-center px-5">
          <h2 className="text-2xl font-bold tracking-wide text-white drop-shadow-md">
            {category.name}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#05C12F] text-white rounded-2xl py-4 px-5 shadow-sm flex items-center justify-center text-center">
      <h2 className="text-2xl font-bold tracking-wide">
        {category.name}
      </h2>
    </div>
  );
}

// Menu Card: memoized so unrelated cards never re-render on bucket changes
const CustomMenuCard = memo(function CustomMenuCard({
  item,
  quantity,
  onOpenDetail,
  onAdd,
  onUpdateQuantity,
}: {
  item: MenuItem;
  quantity: number;
  onOpenDetail: (item: MenuItem) => void;
  onAdd: (item: MenuItem) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
}) {
  const currentTotalAmount = item.price * (quantity > 0 ? quantity : 1);

  return (
    <div
      onClick={() => onOpenDetail(item)}
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs flex items-stretch cursor-pointer dark:bg-neutral-900 dark:border-neutral-800"
    >
      {/* Left Details */}
      <div className="flex-1 min-w-0 p-3.5 flex flex-col justify-center gap-1">
        <h3 className="font-semibold text-black text-[18px] leading-snug tracking-tight dark:text-gray-100">
          {item.name}
        </h3>
        <p className="text-[12.5px] text-gray-500 font-normal leading-snug line-clamp-2 dark:text-gray-400">
          {item.description || 'Prepared fresh with premium ingredients'}
        </p>
      </div>

      {/* Right Column */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[88px] shrink-0 flex flex-col border-l border-gray-100 select-none dark:border-neutral-800"
      >
        <div className="flex-1 bg-[#F0F0F0] flex flex-col items-center justify-center px-2 py-3 text-center dark:bg-neutral-800">
          <span className="font-semibold text-black text-[17px] tracking-tight leading-none dark:text-gray-100">
            ₹{currentTotalAmount.toFixed(0)}
          </span>
        </div>

        {quantity === 0 ? (
          <button
            onClick={() => onAdd(item)}
            className="flex-1 bg-[#05C12F] active:bg-[#038723] text-white font-semibold text-[15px] flex items-center justify-center py-3 px-2 transition-colors cursor-pointer"
          >
            + Add
          </button>
        ) : (
          <div className="flex-1 bg-[#05C12F] text-white flex items-center justify-between px-1.5 py-2">
            <button
              onClick={() => onUpdateQuantity(item.id, quantity - 1)}
              aria-label="Decrease quantity"
              className="w-7 h-full flex items-center justify-center font-semibold text-lg active:bg-[#04A328] rounded transition-colors cursor-pointer"
            >
              −
            </button>
            <span className="font-semibold text-base px-1">{quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.id, quantity + 1)}
              aria-label="Increase quantity"
              className="w-7 h-full flex items-center justify-center font-semibold text-lg active:bg-[#04A328] rounded transition-colors cursor-pointer"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl max-w-[480px] w-full overflow-hidden shadow-2xl max-h-[90dvh] flex flex-col border border-gray-100 dark:bg-neutral-900 dark:border-neutral-800">
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
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const scrollTickRef = useRef(false);
  const { items: bucketItems, addItem, updateQuantity } = useBucket();

  // Hide / show top header and bottom menu on scroll
  useEffect(() => {
    let ticking = false;

    const handleScrollVisibility = () => {
      const currentScrollY = window.scrollY;
      const prevScrollY = lastScrollYRef.current;
      const delta = currentScrollY - prevScrollY;

      // Always keep visible when near the top or when user is actively searching
      if (currentScrollY <= 25 || searchFocused || !!searchQuery) {
        setIsNavVisible(true);
      } else if (Math.abs(delta) > 6) {
        if (delta > 0 && currentScrollY > 70) {
          // Scrolling down -> hide top search bar, category tabs, and bottom menu
          setIsNavVisible(false);
        } else if (delta < 0) {
          // Scrolling up -> show top search bar, category tabs, and bottom menu
          setIsNavVisible(true);
        }
      }

      lastScrollYRef.current = currentScrollY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(handleScrollVisibility);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [searchFocused, searchQuery]);

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

    const controller = new AbortController();

    async function fetchMenu() {
      try {
        // No refresh bypass: the route's short cache keeps navigation instant.
        const res = await fetch('/api/menu', { signal: controller.signal });
        const data = await res.json();
        if (!res.ok || !data.categories) {
          if (!hasCached) setError('Failed to load menu. Please try again.');
          return;
        }
        setCategories(data.categories);
        if (data.restaurant) setRestaurant(data.restaurant);
        try { localStorage.setItem(LOCAL_STORAGE_MENU_KEY, JSON.stringify(data)); } catch { /* ignore */ }
      } catch {
        if (!controller.signal.aborted && !hasCached) setError('Failed to connect to server.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchMenu();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!catQueryParam || !categories.length) return;
    const target = categories.find(
      (c) => c.id === catQueryParam || c.name.toLowerCase().includes(catQueryParam.toLowerCase())
    );
    if (target) {
      setActiveCategoryTab(target.id);
      const timer = setTimeout(() => {
        document.getElementById(`cat-section-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [catQueryParam, categories]);

  useEffect(() => {
    if (searchQuery || categories.length === 0) return;

    const updateActiveTab = () => {
      scrollTickRef.current = false;

      // Tabs sit directly below the sticky search header.
      const offset = (headerRef.current?.getBoundingClientRect().bottom ?? 64) + 12;

      if (window.scrollY <= 4) {
        setActiveCategoryTab('all');
        return;
      }

      let current = 'all';
      for (const cat of categories) {
        const section = document.getElementById(`cat-section-${cat.id}`);
        if (section && section.getBoundingClientRect().top <= offset) {
          current = cat.id;
        }
      }

      setActiveCategoryTab((prev) => (prev === current ? prev : current));
    };

    const handleScroll = () => {
      if (scrollTickRef.current) return;
      scrollTickRef.current = true;
      requestAnimationFrame(updateActiveTab);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveTab();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories, searchQuery]);

  const handleJumpToCategory = useCallback((catId: string) => {
    setActiveCategoryTab(catId);
    setIsNavVisible(true);
    if (catId === 'all') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    document.getElementById(`cat-section-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Keep the active category pill centered inside the horizontal scroll strip.
  useEffect(() => {
    const nav = categoryNavRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>(`[data-cat="${activeCategoryTab}"]`);
    if (!active) return;
    const navRect = nav.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const targetLeft =
      nav.scrollLeft + (activeRect.left - navRect.left) - nav.clientWidth / 2 + activeRect.width / 2;
    nav.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [activeCategoryTab]);

  const handleOpenDetail = useCallback((item: MenuItem) => {
    setSelectedDishDetail(item);
  }, []);

  const handleAddItem = useCallback((item: MenuItem) => {
    setPriceCache(item.id, item.price);
    addItem({ menu_item_id: item.id, quantity: 1, unit_price: item.price });
  }, [addItem]);

  const quantityById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of bucketItems) map[entry.menu_item_id] = entry.quantity;
    return map;
  }, [bucketItems]);

  const totalDishesCount = useMemo(
    () => categories.reduce((sum, category) => sum + (category.items?.length || 0), 0),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return categories
      .map((cat) => {
        if (!query) return cat;
        return {
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              item.description?.toLowerCase().includes(query)
          ),
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categories, searchQuery]);

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
      {/* Top Search Bar & Category Tabs: sticky container that slides up/down on scroll */}
      <div
        ref={headerRef}
        style={{ top: 'var(--pwa-banner-offset, 0px)' }}
        className={`sticky z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/90 shadow-2xs transition-transform duration-300 ease-in-out dark:bg-neutral-950/95 dark:border-neutral-800 ${
          isNavVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <header className="pt-3 pb-2">
          <div className="mx-auto w-full max-w-[480px] px-4">
            <div className="flex items-center gap-2.5">
              {/* Brand Logo Avatar */}
              <Link href="/" prefetch={false} aria-label="Krishna Anandam" className="w-9 h-9 rounded-full overflow-hidden bg-white border border-gray-200 shrink-0 shadow-2xs dark:border-neutral-700">
                <Image
                  src="/icons/logo.webp"
                  alt="Krishna Anandam"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
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

              <Link href="/checkout" prefetch={false} aria-label="Cart" className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors dark:bg-neutral-800 dark:hover:bg-neutral-700">
                <ShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-300" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </header>

        {/* Category Tabs: horizontally scrollable strip */}
        {!searchQuery && categories.length > 0 && (
          <div className="mx-auto w-full max-w-[480px] px-4 pb-2.5 pt-0.5">
            <div
              ref={categoryNavRef}
              className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto overscroll-x-contain scroll-smooth px-1 py-0.5"
            >
              <button
                data-cat="all"
                onClick={() => handleJumpToCategory('all')}
                className={`flex min-h-[34px] shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all press-scale cursor-pointer ${
                  activeCategoryTab === 'all'
                    ? 'bg-[#05C12F] text-white shadow-xs dark:bg-emerald-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700'
                }`}
              >
                <LayoutGrid className="w-3 h-3 shrink-0" strokeWidth={2.5} />
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
                    className={`flex min-h-[34px] shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all press-scale cursor-pointer ${
                      isSel
                        ? 'bg-[#05C12F] text-white shadow-xs dark:bg-emerald-700'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-neutral-900 dark:text-gray-300 dark:border-neutral-700 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <CategoryIcon className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                    <span className="whitespace-nowrap">{cat.name}</span>
                  </button>
                );
              })}

              <Link
                href="/offer"
                prefetch={false}
                className="flex min-h-[34px] shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap text-gray-700 border border-gray-200 bg-[#FCFCFC] hover:bg-gray-50 press-scale cursor-pointer dark:bg-neutral-900 dark:text-gray-300 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <Gift className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                <span>Offers</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      <main className="mx-auto w-full max-w-[480px] px-4 pt-4 space-y-7">
        {loading && !categories.length && (
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="space-y-2.5">
                <div className="h-14 bg-[#05C12F]/20 rounded-2xl animate-pulse" />
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
          <section key={category.id} id={`cat-section-${category.id}`} className="space-y-3 scroll-mt-[6.5rem]">
            <CategoryBanner category={category} />
            <div className="grid grid-cols-1 gap-2.5">
              {category.items.map((item) => (
                <CustomMenuCard
                  key={item.id}
                  item={item}
                  quantity={quantityById[item.id] || 0}
                  onOpenDetail={handleOpenDetail}
                  onAdd={handleAddItem}
                  onUpdateQuantity={updateQuantity}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Offer reel banner link placed after all menu sections */}
        <section className="pt-4">
          <Link
            href="/offer"
            prefetch={false}
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

      <BottomNav activeTab="menu" isVisible={isNavVisible} />
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
