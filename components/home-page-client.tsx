'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/bottom-nav';
import OfferCarousel from '@/components/offer-carousel';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  veg_type: string;
  is_available: boolean;
  is_featured: boolean;
  image_url: string | null;
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

// Category icon helper
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
  if (n.includes('bread') || n.includes('roti') || n.includes('naan') || n.includes('paratha')) return '🫓';
  if (n.includes('rice') || n.includes('biryani') || n.includes('pulao') || n.includes('basmati')) return '🍚';
  if (n.includes('dessert') || n.includes('sweet') || n.includes('ice cream') || n.includes('kulfi')) return '🍨';
  if (n.includes('paneer') || n.includes('veg') || n.includes('curry') || n.includes('dal')) return '🍲';
  return '🍽️';
}

const LOCAL_STORAGE_MENU_KEY = 'ka_menu_cache_v1';

export default function HomePageClient() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // SWR Instant loading from localStorage + API
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_MENU_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.categories && parsed.categories.length > 0) {
          setCategories(parsed.categories);
          if (parsed.restaurant) setRestaurant(parsed.restaurant);
          setLoading(false);
        }
      }
    } catch {
      // Ignore cache error
    }

    async function fetchMenu() {
      try {
        const res = await fetch('/api/menu?refresh=true', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data.categories) {
          setCategories(data.categories);
          if (data.restaurant) setRestaurant(data.restaurant);
          try {
            localStorage.setItem(LOCAL_STORAGE_MENU_KEY, JSON.stringify(data));
          } catch {
            // Ignore quota
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  const totalDishes = categories.reduce((sum, c) => sum + (c.items?.length || 0), 0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/menu?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/menu');
    }
  };

  return (
    <div className="customer-page min-h-dvh bg-[#FAFAFA] pb-24 text-gray-900 font-sans">
      {/* ─── Sticky Header ─── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md pt-3.5 pb-2.5 border-b border-gray-200/90 shadow-2xs">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="flex items-center gap-2.5">
          {/* Brand Logo */}
          <div className="w-9 h-9 rounded-full overflow-hidden bg-white border border-gray-200 shrink-0 shadow-2xs">
            <Image
              src="https://krishnaanandam.in/wp-content/uploads/2026/08/Hotel-Krsihna-Anandam-Logo.webp"
              alt="Krishna Anandam"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>

          {/* Capsule Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div className="flex items-center gap-2 bg-gray-100 hover:bg-gray-100/80 rounded-full px-3.5 py-2 border border-transparent focus-within:border-[#05C12F] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#05C12F]/20 transition-all">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                placeholder="Search pure veg dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs text-gray-900 placeholder-gray-400 outline-none font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 text-xs w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          {/* Cart Icon in Header */}
          <Link
            href="/checkout"
            aria-label="View Basket"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-800 text-sm shrink-0 transition-colors cursor-pointer"
          >
            🛒
          </Link>
        </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl px-4 md:px-6 pt-3.5 space-y-4">
        {/* 1. TOP RUNNING CAROUSEL OF OFFERS (Managed by Admin Portal - 6 Images) */}
        <section aria-label="Special Offers">
          <OfferCarousel
            onSelectCategory={(query) => {
              router.push(`/menu?cat=${query}`);
            }}
          />
        </section>

        {/* 2. Restaurant Pure Veg Info Bar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#05C12F]/10 text-[#05C12F] flex items-center justify-center text-lg border border-[#05C12F]/20 shrink-0 font-bold">
              🌿
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 leading-tight">100% Pure Vegetarian</p>
              <p className="text-[10.5px] text-gray-500">Krishna Anandam &bull; Vrindavan</p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-[#05C12F]/10 text-[#05C12F] px-2.5 py-1 rounded-full border border-[#05C12F]/20">
            GST Extra
          </span>
        </div>

        {/* 3. ONLY CATEGORIES SECTION */}
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">
                Menu Categories
              </h2>
              <p className="text-[11px] text-gray-500">
                Choose a cuisine to view dishes ({totalDishes} items total)
              </p>
            </div>

            <Link
              href="/menu"
              className="text-xs font-bold text-[#05C12F] hover:underline flex items-center gap-1"
            >
              <span>See Full Menu</span>
              <span>›</span>
            </Link>
          </div>

          {/* Loading Skeletons */}
          {loading && categories.length === 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          )}

          {/* Categories Grid (Clean, attractive, interactive, NO food dish images) */}
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => {
              const icon = getCategoryIcon(category.name);
              const itemCount = category.items?.length || 0;

              return (
                <Link
                  key={category.id}
                  href={`/menu?cat=${category.id}`}
                  className="press-scale bg-white border border-gray-200/80 hover:border-[#05C12F]/40 hover:shadow-xs rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs transition-all group cursor-pointer text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-11 h-11 rounded-2xl bg-[#05C12F]/10 text-[#05C12F] flex items-center justify-center text-2xl shadow-2xs group-hover:scale-105 transition-transform border border-[#05C12F]/15">
                      {icon}
                    </div>
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200 shrink-0">
                      {itemCount}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-bold text-gray-900 text-xs sm:text-sm leading-tight group-hover:text-[#05C12F] transition-colors truncate">
                      {category.name}
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                      {category.description || 'Pure Veg Delicacies'}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-[#05C12F]">
                    <span>Explore</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">›</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      {/* ─── 4-Tab Bottom Navigation Dock ─── */}
      <BottomNav activeTab="home" />
    </div>
  );
}
