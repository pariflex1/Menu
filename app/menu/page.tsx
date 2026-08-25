'use client';

import { useState, useEffect, useRef } from 'react';
import { useBucket, setPriceCache } from '@/lib/hooks/use-bucket';
import Image from 'next/image';
import Link from 'next/link';

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

// Category icon mapper for quick tiles
function getCategoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('breakfast')) return '🥪';
  if (n.includes('thali')) return '🍱';
  if (n.includes('chinese')) return '🍜';
  if (n.includes('tandoor') || n.includes('kabab') || n.includes('tikka')) return '🍢';
  if (n.includes('beverage') || n.includes('drink') || n.includes('shake') || n.includes('tea') || n.includes('coffee')) return '🧃';
  if (n.includes('snack') || n.includes('soup') || n.includes('pakora')) return '🍟';
  if (n.includes('bread') || n.includes('roti') || n.includes('naan') || n.includes('paratha')) return '🫓';
  if (n.includes('rice') || n.includes('biryani') || n.includes('pulao') || n.includes('basmati')) return '🍚';
  if (n.includes('dessert') || n.includes('sweet') || n.includes('ice cream') || n.includes('kulfi')) return '🍨';
  if (n.includes('paneer') || n.includes('veg') || n.includes('curry') || n.includes('dal')) return '🍲';
  return '🍽️';
}

// Fallback high-res imagery for dishes without image
function getDishImage(item: MenuItem): string {
  if (item.image_url && item.image_url.startsWith('http')) return item.image_url;
  const n = item.name.toLowerCase();
  if (n.includes('paneer') || n.includes('shahi')) return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80';
  if (n.includes('dosa') || n.includes('uttapam') || n.includes('idli')) return 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=400&q=80';
  if (n.includes('thali')) return 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=400&q=80';
  if (n.includes('noodles') || n.includes('chinese') || n.includes('manchurian')) return 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80';
  if (n.includes('naan') || n.includes('roti') || n.includes('paratha')) return 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=400&q=80';
  if (n.includes('biryani') || n.includes('pulao') || n.includes('rice')) return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80';
  if (n.includes('shake') || n.includes('lassi') || n.includes('mojito') || n.includes('coffee') || n.includes('tea')) return 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=80';
  if (n.includes('dessert') || n.includes('jamun') || n.includes('halwa') || n.includes('ice cream')) return 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=400&q=80';
  if (n.includes('tikka') || n.includes('chaap') || n.includes('kabab')) return 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80';
  return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80';
}

// Pure Veg Dot Indicator
function VegDot({ type }: { type: string }) {
  const isVeg = type === 'veg';
  const isNonVeg = type === 'non_veg';
  return (
    <span
      className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-xs border bg-white shrink-0 ${
        isVeg ? 'border-emerald-600' : isNonVeg ? 'border-red-500' : 'border-amber-500'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isVeg ? 'bg-emerald-600' : isNonVeg ? 'bg-red-500' : 'bg-amber-500'
        }`}
      />
    </span>
  );
}

// Grab-Style Pill Quantity Control
function PillQuantityControl({
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
  isAvailable,
}: {
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  isAvailable: boolean;
}) {
  if (!isAvailable) {
    return (
      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
        Sold Out
      </span>
    );
  }

  if (quantity === 0) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="press-scale h-7 bg-[#00B14F] hover:bg-[#009b45] active:scale-95 text-white font-bold text-xs px-3.5 rounded-full transition-all tracking-wide shrink-0 shadow-xs flex items-center justify-center gap-1"
      >
        <span>+</span>
        <span>Add</span>
      </button>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="bounce-in h-7 flex items-center bg-[#00B14F] text-white rounded-full overflow-hidden shrink-0 shadow-xs"
    >
      <button
        onClick={onDecrement}
        className="w-6 h-full flex items-center justify-center font-bold text-sm hover:bg-[#009b45] active:bg-[#00863c] transition-colors"
      >
        −
      </button>
      <span className="w-5 text-center font-bold text-xs">{quantity}</span>
      <button
        onClick={onIncrement}
        className="w-6 h-full flex items-center justify-center font-bold text-sm hover:bg-[#009b45] active:bg-[#00863c] transition-colors"
      >
        +
      </button>
    </div>
  );
}

// SCREEN 1 STYLE: Horizontal Item Card
function HorizontalItemCard({
  item,
  onOpenDetail,
}: {
  item: MenuItem;
  onOpenDetail: (item: MenuItem) => void;
}) {
  const { items: bucketItems, addItem, updateQuantity } = useBucket();
  const bucketItem = bucketItems.find((b) => b.menu_item_id === item.id);
  const quantity = bucketItem?.quantity || 0;
  const imageSrc = getDishImage(item);
  const origPrice = Math.round(item.price * 1.15);

  return (
    <div
      onClick={() => onOpenDetail(item)}
      className="press-scale bg-white border border-gray-100 hover:border-gray-200/90 rounded-2xl p-3 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3 cursor-pointer"
    >
      {/* Left Dish Photo */}
      <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
        <Image
          src={imageSrc}
          alt={item.name}
          fill
          className="object-cover"
          sizes="80px"
          unoptimized={imageSrc.startsWith('http')}
        />
        {item.is_featured && (
          <span className="absolute top-1 left-1 text-[8px] font-black bg-[#00B14F] text-white px-1.5 py-0.2 rounded-full">
            ★ Special
          </span>
        )}
      </div>

      {/* Middle Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <VegDot type={item.veg_type} />
            <h3 className="font-bold text-gray-900 text-[13.5px] leading-tight truncate">
              {item.name}
            </h3>
          </div>
          {item.is_featured && (
            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full shrink-0">
              10% OFF
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 font-normal">
          <span className="flex items-center gap-0.5">
            <span>⏱️</span> 15-20 mins
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
          <span className="text-amber-500 font-bold">★ 4.8</span>
          <span>&bull;</span>
          <span className="text-emerald-700 font-medium">Pure Veg</span>
        </div>

        {/* Bottom Row: Price & Pill Add Button */}
        <div className="flex items-center justify-between mt-1.5 pt-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-gray-900">₹{item.price.toFixed(0)}</span>
            <span className="text-[11px] text-gray-400 line-through">₹{origPrice}</span>
          </div>

          <PillQuantityControl
            quantity={quantity}
            isAvailable={item.is_available}
            onAdd={() => {
              setPriceCache(item.id, item.price);
              addItem({ menu_item_id: item.id, quantity: 1, unit_price: item.price });
            }}
            onIncrement={() => updateQuantity(item.id, quantity + 1)}
            onDecrement={() => updateQuantity(item.id, quantity - 1)}
          />
        </div>
      </div>
    </div>
  );
}

// SCREEN 2 STYLE: "Food For You" Vertical Food Card
function FoodForYouCard({
  item,
  onOpenDetail,
}: {
  item: MenuItem;
  onOpenDetail: (item: MenuItem) => void;
}) {
  const { items: bucketItems, addItem, updateQuantity } = useBucket();
  const bucketItem = bucketItems.find((b) => b.menu_item_id === item.id);
  const quantity = bucketItem?.quantity || 0;
  const imageSrc = getDishImage(item);
  const origPrice = Math.round(item.price * 1.15);

  return (
    <div
      onClick={() => onOpenDetail(item)}
      className="press-scale w-40 shrink-0 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
    >
      <div className="relative h-28 w-full bg-gray-50 overflow-hidden">
        <Image
          src={imageSrc}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="160px"
          unoptimized={imageSrc.startsWith('http')}
        />
        {item.is_featured && (
          <span className="absolute top-2 left-2 text-[8px] font-bold bg-[#00B14F] text-white px-2 py-0.5 rounded-full shadow-xs">
            POPULAR
          </span>
        )}
      </div>

      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <VegDot type={item.veg_type} />
            <h4 className="font-bold text-gray-900 text-xs truncate leading-tight">
              {item.name}
            </h4>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1.5">
            <span className="text-amber-500 font-bold">★ 4.8</span>
            <span>(80+)</span>
            <span>&bull;</span>
            <span>15m</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <div>
            <div className="text-xs font-bold text-gray-900">₹{item.price.toFixed(0)}</div>
            <div className="text-[10px] text-gray-400 line-through">₹{origPrice}</div>
          </div>
          <PillQuantityControl
            quantity={quantity}
            isAvailable={item.is_available}
            onAdd={() => {
              setPriceCache(item.id, item.price);
              addItem({ menu_item_id: item.id, quantity: 1, unit_price: item.price });
            }}
            onIncrement={() => updateQuantity(item.id, quantity + 1)}
            onDecrement={() => updateQuantity(item.id, quantity - 1)}
          />
        </div>
      </div>
    </div>
  );
}

// SCREEN 3 STYLE: Dish Detail Modal Sheet
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
  const imageSrc = getDishImage(item);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl space-y-0 max-h-[90vh] flex flex-col">
        {/* Hero Image */}
        <div className="relative h-56 w-full bg-gray-900 shrink-0">
          <Image
            src={imageSrc}
            alt={item.name}
            fill
            className="object-cover opacity-95"
            sizes="480px"
            priority
            unoptimized={imageSrc.startsWith('http')}
          />
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center font-bold text-gray-700 shadow-md text-sm"
            >
              ✕
            </button>
            <span className="text-[10px] font-bold bg-[#00B14F] text-white px-2.5 py-1 rounded-full shadow-md">
              100% PURE VEG
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <div className="flex items-center gap-2">
              <VegDot type={item.veg_type} />
              <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
            </div>
            {item.description && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          {/* 3 Quick Stat Badges (Screen 3 style) */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
              <p className="text-[10px] text-gray-400 font-medium">Price</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">₹{item.price.toFixed(0)}</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
              <p className="text-[10px] text-gray-400 font-medium">Prep Time</p>
              <p className="text-sm font-bold text-emerald-700 mt-0.5">15-20 m</p>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
              <p className="text-[10px] text-gray-400 font-medium">Rating</p>
              <p className="text-sm font-bold text-amber-600 mt-0.5">★ 4.9</p>
            </div>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total Price</p>
            <p className="text-lg font-bold text-gray-900">₹{(item.price * Math.max(1, quantity)).toFixed(0)}</p>
          </div>

          {quantity === 0 ? (
            <button
              onClick={() => {
                setPriceCache(item.id, item.price);
                addItem({ menu_item_id: item.id, quantity: 1, unit_price: item.price });
              }}
              className="flex-1 bg-[#00B14F] hover:bg-[#009b45] text-white font-bold py-3.5 px-5 rounded-full shadow-md text-sm transition-all"
            >
              Add to Basket &bull; ₹{item.price.toFixed(0)}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 flex items-center bg-[#00B14F] text-white rounded-full overflow-hidden shadow-xs px-2">
                <button
                  onClick={() => updateQuantity(item.id, quantity - 1)}
                  className="w-8 h-full flex items-center justify-center font-bold text-lg"
                >
                  −
                </button>
                <span className="w-8 text-center font-bold text-sm">{quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, quantity + 1)}
                  className="w-8 h-full flex items-center justify-center font-bold text-lg"
                >
                  +
                </button>
              </div>
              <button
                onClick={onClose}
                className="bg-gray-900 text-white text-xs font-bold px-4 py-3 rounded-full"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { total, totalItemCount } = useBucket();

  // null = Screen 2 Discovery Home, string = Screen 1 Category items
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTabFilter, setActiveTabFilter] = useState<string>('all'); // 'all', 'popular', 'thali', etc.
  const [selectedDishDetail, setSelectedDishDetail] = useState<MenuItem | null>(null);
  const [serviceMode, setServiceMode] = useState<'dine_in' | 'takeaway'>('dine_in');

  const categoryNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch('/api/menu');
        const data = await res.json();
        if (!res.ok || !data.categories) {
          setError('Failed to load menu. Please try again.');
          return;
        }
        setCategories(data.categories);
        if (data.restaurant) setRestaurant(data.restaurant);
      } catch {
        setError('No internet connection.');
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  const handleSelectCategory = (catId: string | null) => {
    setSelectedCategory(catId);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Auto-scroll active category pill into center view
  useEffect(() => {
    if (!categoryNavRef.current || !selectedCategory) return;
    const pill = categoryNavRef.current.querySelector(`[data-cat="${selectedCategory}"]`);
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedCategory]);

  // All menu items flattened for search & discovery
  const allDishes = categories.flatMap((c) => c.items);
  const popularDishes = allDishes.filter((i) => i.is_featured).slice(0, 10);
  const displayPopular = popularDishes.length > 0 ? popularDishes : allDishes.slice(0, 8);

  // Filtered categories for search or category view
  const filteredCategories = categories
    .map((cat) => {
      if (!searchQuery.trim()) return cat;
      return {
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
        ),
      };
    })
    .filter((cat) => cat.items.length > 0);

  const activeCategoryData = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)
    : null;

  if (error) {
    return (
      <div className="customer-page flex min-h-dvh flex-col items-center justify-center px-6 bg-white">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-xl text-gray-400 border border-gray-100">
            !
          </div>
          <p className="font-medium text-gray-800">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#00B14F] text-white font-medium px-6 py-2.5 rounded-full hover:bg-[#009b45] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page min-h-dvh bg-[#F7F9F8] pb-32">
      {/* ─── TOP APP BAR (Screen 1 & 2 Style) ─── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 pt-4 pb-3 border-b border-gray-100 shadow-2xs">
        <div className="flex items-center gap-2.5">
          {selectedCategory ? (
            /* Screen 1 Back Button in Circle */
            <button
              onClick={() => handleSelectCategory(null)}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-sm shrink-0 transition-colors"
            >
              ‹
            </button>
          ) : (
            /* Screen 2 Avatar / Logo */
            <div className="w-9 h-9 rounded-full bg-[#00B14F] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
              KA
            </div>
          )}

          {/* Capsule Search Input */}
          <div
            className={`flex-1 flex items-center gap-2 bg-gray-100/90 rounded-full px-3.5 py-2 transition-all border ${
              searchFocused ? 'bg-white ring-2 ring-[#00B14F] border-transparent' : 'border-transparent'
            }`}
          >
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="What would you like to eat?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent text-xs text-gray-900 placeholder-gray-400 outline-none font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600 text-xs w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          {/* QR / Dine-in badge */}
          <Link
            href="/checkout"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 text-sm shrink-0 transition-colors relative"
          >
            🛒
            {totalItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#00B14F] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {totalItemCount}
              </span>
            )}
          </Link>
        </div>

        {/* ─── SCREEN 1: CATEGORY FILTER PILLS WITH AVATARS ─── */}
        {selectedCategory && !searchQuery && (
          <div
            ref={categoryNavRef}
            className="flex gap-2 overflow-x-auto no-scrollbar pt-3 scroll-smooth-ios"
          >
            {categories.map((cat) => {
              const isSel = selectedCategory === cat.id;
              const icon = getCategoryIcon(cat.name);
              return (
                <button
                  key={cat.id}
                  data-cat={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all press-scale shrink-0 ${
                    isSel
                      ? 'bg-[#00B14F] text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                    {icon}
                  </span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="px-4 pt-3.5 space-y-5">
        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* No search results */}
        {!loading && filteredCategories.length === 0 && searchQuery && (
          <div className="text-center py-16 space-y-3">
            <p className="text-gray-300 text-4xl">🔍</p>
            <p className="font-bold text-gray-800">No dishes found</p>
            <p className="text-xs text-gray-400">
              Try searching for Paneer, Dosa, Thali, Paratha...
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#00B14F] font-bold text-xs underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SEARCH MODE: ALL MATCHING DISHES (SCREEN 1 STYLE)
           ══════════════════════════════════════════════════════════════ */}
        {!loading && searchQuery && filteredCategories.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
              Search Results ({filteredCategories.reduce((s, c) => s + c.items.length, 0)} dishes)
            </h2>
            <div className="space-y-2.5">
              {filteredCategories.flatMap((c) => c.items).map((item) => (
                <HorizontalItemCard
                  key={item.id}
                  item={item}
                  onOpenDetail={(it) => setSelectedDishDetail(it)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SCREEN 2: MAIN HOME & DISCOVERY HUB (When no category selected)
           ══════════════════════════════════════════════════════════════ */}
        {!loading && !searchQuery && !selectedCategory && (
          <>
            {/* 1. Quick Category Grid (6 to 8 Tiles - Screen 2 Style) */}
            <div>
              <div className="grid grid-cols-4 gap-2.5">
                {categories.slice(0, 8).map((cat) => {
                  const icon = getCategoryIcon(cat.name);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleSelectCategory(cat.id)}
                      className="press-scale bg-white border border-gray-100 hover:border-emerald-200 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs transition-all aspect-square"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#00B14F]/10 flex items-center justify-center text-xl shadow-2xs">
                        {icon}
                      </div>
                      <span className="text-[10.5px] font-bold text-gray-800 text-center leading-tight truncate w-full">
                        {cat.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Restaurant & Service Info Card (Screen 2 Quick Stats Banner) */}
            <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center text-xl border border-emerald-100">
                  🍽️
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">100% Pure Vegetarian</p>
                  <p className="text-[10px] text-gray-500">Krishna Anandam &bull; Vrindavan</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-[#00B14F]/10 text-[#00B14F] px-2.5 py-1 rounded-full">
                GST Extra
              </span>
            </div>

            {/* 3. "Food For You" Horizontal Carousel (Screen 2 Style) */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-gray-900">Food For You</h2>
                <button
                  onClick={() => handleSelectCategory(categories[0]?.id || null)}
                  className="text-xs font-bold text-[#00B14F] hover:underline"
                >
                  See All
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 scroll-smooth-ios">
                {displayPopular.map((item) => (
                  <FoodForYouCard
                    key={item.id}
                    item={item}
                    onOpenDetail={(it) => setSelectedDishDetail(it)}
                  />
                ))}
              </div>
            </section>

            {/* 4. "Explore Categories" Cards (Screen 2 Bottom Section) */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-gray-900">Explore All Cuisines</h2>
                <span className="text-xs text-gray-400 font-medium">{categories.length} menus</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => {
                  const img = cat.image_url || getDishImage(cat.items[0] || ({} as any));
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleSelectCategory(cat.id)}
                      className="press-scale bg-white border border-gray-100 hover:border-gray-200 rounded-2xl overflow-hidden shadow-2xs text-left group flex flex-col justify-between"
                    >
                      <div className="relative h-24 w-full bg-gray-100 overflow-hidden">
                        <Image
                          src={img}
                          alt={cat.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="200px"
                          unoptimized={img.startsWith('http')}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span className="absolute bottom-1.5 right-1.5 text-[9px] font-bold bg-white/90 text-gray-900 px-2 py-0.5 rounded-full shadow-2xs">
                          {cat.items.length} dishes
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="font-bold text-gray-900 text-xs truncate leading-tight">
                          {cat.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                          {cat.description || 'Pure Veg Delicacies'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SCREEN 1: CATEGORY ITEMS LIST VIEW (When a category is opened)
           ══════════════════════════════════════════════════════════════ */}
        {!loading && !searchQuery && selectedCategory && activeCategoryData && (
          <div className="space-y-3">
            {/* Category Hero Banner Card (Screen 3 Top Sheet Style) */}
            <div className="relative h-32 w-full rounded-2xl overflow-hidden bg-gray-900 shadow-xs group">
              {activeCategoryData.image_url ? (
                <Image
                  src={activeCategoryData.image_url}
                  alt={activeCategoryData.name}
                  fill
                  className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
                  sizes="480px"
                  priority
                  unoptimized={activeCategoryData.image_url.startsWith('http')}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-emerald-900 to-slate-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-3.5">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-black tracking-wider uppercase text-emerald-400 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs mb-1 inline-block border border-emerald-500/20">
                      100% PURE VEG
                    </span>
                    <h2 className="text-base font-black text-white leading-tight">
                      {activeCategoryData.name}
                    </h2>
                    {activeCategoryData.description && (
                      <p className="text-[11px] text-gray-200 font-normal mt-0.5 line-clamp-1">
                        {activeCategoryData.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-black bg-white/95 text-gray-900 px-2.5 py-1 rounded-full shrink-0 shadow-sm">
                    {activeCategoryData.items.length} Dishes
                  </span>
                </div>
              </div>
            </div>

            {/* List of Items */}
            <div className="space-y-2.5">
              {activeCategoryData.items.map((item) => (
                <HorizontalItemCard
                  key={item.id}
                  item={item}
                  onOpenDetail={(it) => setSelectedDishDetail(it)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ─── DISH DETAIL MODAL (Screen 3 Style) ─── */}
      {selectedDishDetail && (
        <DishDetailModal
          item={selectedDishDetail}
          onClose={() => setSelectedDishDetail(null)}
        />
      )}

      {/* ─── SCREEN 2 STYLE: FLOATING BOTTOM DOCK / BASKET BAR ─── */}
      <div className="slide-up fixed bottom-3 left-0 right-0 z-40 px-4 pb-safe pointer-events-none">
        <div className="max-w-[440px] mx-auto pointer-events-auto">
          {totalItemCount > 0 ? (
            /* Sticky Order Button when basket has items (Screen 3 bottom bar) */
            <button
              onClick={() => (window.location.href = '/checkout')}
              className="w-full bg-[#00B14F] hover:bg-[#009b45] active:bg-[#00863c] text-white rounded-full flex items-center justify-between px-5 py-3.5 transition-all press-scale shadow-xl shadow-[#00B14F]/30"
            >
              <div className="flex items-center gap-2.5">
                <span className="bg-white/20 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs">
                  {totalItemCount}
                </span>
                <span className="font-bold text-sm">
                  {totalItemCount === 1 ? '1 item' : `${totalItemCount} items`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base">₹{total.toFixed(0)}</span>
                <span className="text-xs bg-white text-[#00B14F] font-bold px-3 py-1 rounded-full">
                  Order Now ›
                </span>
              </div>
            </button>
          ) : (
            /* Floating Bottom Dock (Screen 2 style) */
            <div className="bg-white/95 backdrop-blur-md border border-gray-100 rounded-full shadow-lg p-1.5 flex items-center justify-around">
              <button
                onClick={() => handleSelectCategory(null)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  !selectedCategory ? 'bg-[#00B14F] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>🏠</span>
                <span>Home</span>
              </button>

              <button
                onClick={() => handleSelectCategory(categories[0]?.id || null)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  selectedCategory ? 'bg-[#00B14F] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>📋</span>
                <span>Menu</span>
              </button>

              <Link
                href="/checkout"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
              >
                <span>🛒</span>
                <span>Basket</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
