'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useBucket } from '@/lib/hooks/use-bucket';

export type NavTab = 'home' | 'menu' | 'status' | 'basket';

interface BottomNavProps {
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
}

export default function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { total, totalItemCount } = useBucket();
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const orderId = localStorage.getItem('latest_order_id');
      if (orderId) {
        setLatestOrderId(orderId);
        setHasActiveOrder(true);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const currentTab: NavTab = activeTab || (
    pathname?.startsWith('/order') ? 'status' :
    pathname?.startsWith('/checkout') ? 'basket' :
    'home'
  );

  const handleTabClick = (tab: NavTab, e: React.MouseEvent) => {
    if (onSelectTab) {
      e.preventDefault();
      onSelectTab(tab);
    }
  };

  return (
    <div className="fixed bottom-3 left-0 right-0 z-40 px-3 pb-safe pointer-events-none">
      <div className="max-w-[460px] mx-auto pointer-events-auto space-y-2">
        {/* Floating Quick Basket Bar (Shown when items exist and not on checkout) */}
        {totalItemCount > 0 && currentTab !== 'basket' && (
          <button
            onClick={() => router.push('/checkout')}
            className="slide-up w-full bg-[#00B14F] hover:bg-[#009b45] active:bg-[#00863c] text-white rounded-2xl flex items-center justify-between px-4 py-3 transition-all press-scale shadow-lg shadow-[#00B14F]/25 border border-emerald-400/30 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="bg-white/20 w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs">
                {totalItemCount}
              </span>
              <div className="text-left">
                <p className="font-bold text-xs leading-tight">
                  {totalItemCount === 1 ? '1 Dish Selected' : `${totalItemCount} Dishes Selected`}
                </p>
                <p className="text-[10px] text-emerald-100 font-medium">Click to review & order</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm">₹{total.toFixed(0)}</span>
              <span className="text-xs bg-white text-[#00B14F] font-black px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                View Basket ›
              </span>
            </div>
          </button>
        )}

        {/* 4-Tab Bottom Navigation Dock */}
        <nav
          aria-label="Bottom Navigation"
          className="bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl shadow-xl shadow-black/8 p-1.5 flex items-center justify-around gap-1"
        >
          {/* Tab 1: Home (Front Page) */}
          <Link
            href="/menu"
            onClick={(e) => handleTabClick('home', e)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all press-scale flex-1 text-center ${
              currentTab === 'home'
                ? 'bg-[#00B14F] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
            }`}
          >
            <span className="text-base leading-none mb-0.5">🏠</span>
            <span className="text-[10.5px] leading-tight">Home</span>
          </Link>

          {/* Tab 2: All Menu (All items at once) */}
          <Link
            href="/menu?view=all"
            onClick={(e) => handleTabClick('menu', e)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all press-scale flex-1 text-center ${
              currentTab === 'menu'
                ? 'bg-[#00B14F] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
            }`}
          >
            <span className="text-base leading-none mb-0.5">📋</span>
            <span className="text-[10.5px] leading-tight">All Menu</span>
          </Link>

          {/* Tab 3: Order Status */}
          <Link
            href={latestOrderId ? `/order/${latestOrderId}` : '/order'}
            onClick={(e) => {
              if (onSelectTab && latestOrderId) {
                // If on menu page and clicking status, let standard navigation happen
              }
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all press-scale flex-1 text-center relative ${
              currentTab === 'status'
                ? 'bg-[#00B14F] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
            }`}
          >
            <div className="relative">
              <span className="text-base leading-none mb-0.5 inline-block">⚡</span>
              {hasActiveOrder && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </div>
            <span className="text-[10.5px] leading-tight">Status</span>
          </Link>

          {/* Tab 4: Basket */}
          <Link
            href="/checkout"
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all press-scale flex-1 text-center relative ${
              currentTab === 'basket'
                ? 'bg-[#00B14F] text-white shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
            }`}
          >
            <div className="relative">
              <span className="text-base leading-none mb-0.5 inline-block">🛒</span>
              {totalItemCount > 0 && (
                <span
                  className={`absolute -top-1 -right-2.5 text-[8.5px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-xs ${
                    currentTab === 'basket'
                      ? 'bg-white text-[#00B14F]'
                      : 'bg-[#00B14F] text-white'
                  }`}
                >
                  {totalItemCount}
                </span>
              )}
            </div>
            <span className="text-[10.5px] leading-tight">
              {totalItemCount > 0 ? `₹${total.toFixed(0)}` : 'Basket'}
            </span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
