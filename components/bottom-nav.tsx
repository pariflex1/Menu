'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useBucket } from '@/lib/hooks/use-bucket';
import { UtensilsCrossed, Gift, Zap, ShoppingBag, House } from 'lucide-react';

export type NavTab = 'menu' | 'offer' | 'status' | 'basket' | 'home';

interface BottomNavProps {
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  className?: string;
}

export default function BottomNav({ activeTab, onSelectTab, className = '' }: BottomNavProps) {
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

  const currentTab: NavTab = activeTab
    ? (activeTab === 'home' && pathname?.startsWith('/offer') ? 'offer' : activeTab)
    : (
      pathname?.startsWith('/order') ? 'status' :
      pathname?.startsWith('/checkout') ? 'basket' :
      pathname?.startsWith('/offer') ? 'offer' :
      pathname?.startsWith('/home') ? 'home' :
      pathname === '/' || pathname?.startsWith('/menu') ? 'menu' :
      'menu'
    );

  const handleTabClick = (tab: NavTab, e: React.MouseEvent) => {
    if (onSelectTab) {
      e.preventDefault();
      onSelectTab(tab);
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 pointer-events-none ${className}`}>
      <div className="max-w-[480px] mx-auto pointer-events-auto space-y-0">
        {/* Floating Quick Basket Bar */}
        {totalItemCount > 0 && currentTab !== 'basket' && (
          <div className="px-3 pb-1 pt-1.5">
            <button
              onClick={() => router.push('/checkout')}
              className="slide-up w-full bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black rounded-xl flex items-center justify-between px-3 py-2 transition-all press-scale shadow-xl shadow-yellow-500/30 border border-yellow-500/40 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="bg-black text-yellow-300 w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shadow-xs">
                  {totalItemCount}
                </span>
                <div className="text-left">
                  <p className="font-semibold text-xs leading-tight text-black">
                    {totalItemCount === 1 ? '1 Dish Selected' : `${totalItemCount} Dishes Selected`}
                  </p>
                  <p className="text-[10px] text-black/70 font-normal">Click to review &amp; order</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-black">₹{total.toFixed(0)}</span>
                <span className="text-[10px] bg-black text-yellow-300 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  View Basket ›
                </span>
              </div>
            </button>
          </div>
        )}

        {/* 4-Tab Bottom Navigation — White background */}
        <nav
          aria-label="Bottom Navigation"
          className="bg-white border-t border-gray-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] grid grid-cols-5 items-stretch px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 dark:bg-neutral-900 dark:border-neutral-800 dark:shadow-[0_-4px_20px_rgba(0,0,0,0.35)]"
        >
          {/* Tab 0: Home */}
          <Link
            prefetch={false}
            href="/home"
            onClick={(e) => handleTabClick('home', e)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all press-scale text-center cursor-pointer ${
              currentTab === 'home'
                ? 'bg-emerald-50 text-[#05C12F] font-semibold dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'text-gray-500 hover:text-[#05C12F] hover:bg-gray-50 font-normal dark:text-gray-400 dark:hover:text-emerald-400 dark:hover:bg-neutral-800'
            }`}
          >
            <House className="w-4.5 h-4.5 mb-0.5 shrink-0" strokeWidth={2.2} />
            <span className="text-[10px] leading-none">Home</span>
          </Link>

          {/* Tab 1: Menu */}
          <Link
            prefetch={false}
            href="/menu"
            onClick={(e) => handleTabClick('menu', e)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all press-scale text-center cursor-pointer ${
              currentTab === 'menu'
                ? 'bg-emerald-50 text-[#05C12F] font-semibold dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'text-gray-500 hover:text-[#05C12F] hover:bg-gray-50 font-normal dark:text-gray-400 dark:hover:text-emerald-400 dark:hover:bg-neutral-800'
            }`}
          >
            <UtensilsCrossed className="w-4.5 h-4.5 mb-0.5 shrink-0" strokeWidth={2.2} />
            <span className="text-[10px] leading-none">Menu</span>
          </Link>

          {/* Tab 2: Offer (Background #FCFCFC) */}
          <Link
            prefetch={false}
            href="/offer"
            onClick={(e) => handleTabClick('offer', e)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all press-scale text-center cursor-pointer border border-gray-200/80 bg-[#FCFCFC] dark:bg-neutral-900 dark:border-neutral-700 ${
              currentTab === 'offer' || (currentTab === 'home' && pathname === '/offer')
                ? 'text-[#05C12F] font-bold shadow-2xs border-emerald-300 dark:text-emerald-400 dark:border-emerald-700'
                : 'text-gray-600 hover:text-[#05C12F] font-normal dark:text-gray-400 dark:hover:text-emerald-400'
            }`}
          >
            <Gift className="w-4.5 h-4.5 mb-0.5 shrink-0" strokeWidth={2.2} />
            <span className="text-[10px] leading-none">Offer</span>
          </Link>

          {/* Tab 3: Order Status */}
          <Link
            prefetch={false}
            href={latestOrderId ? `/order/${latestOrderId}` : '/order'}
            onClick={(e) => handleTabClick('status', e)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all press-scale text-center relative cursor-pointer ${
              currentTab === 'status'
                ? 'bg-emerald-50 text-[#05C12F] font-semibold dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'text-gray-500 hover:text-[#05C12F] hover:bg-gray-50 font-normal dark:text-gray-400 dark:hover:text-emerald-400 dark:hover:bg-neutral-800'
            }`}
          >
            <div className="relative">
              <Zap className="w-4.5 h-4.5 mb-0.5 shrink-0" strokeWidth={2.2} />
              {hasActiveOrder && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white animate-pulse dark:ring-neutral-900" />
              )}
            </div>
            <span className="text-[10px] leading-none">Status</span>
          </Link>

          {/* Tab 4: Basket */}
          <Link
            prefetch={false}
            href="/checkout"
            onClick={(e) => handleTabClick('basket', e)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all press-scale text-center relative cursor-pointer ${
              currentTab === 'basket'
                ? 'bg-emerald-50 text-[#05C12F] font-semibold dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'text-gray-500 hover:text-[#05C12F] hover:bg-gray-50 font-normal dark:text-gray-400 dark:hover:text-emerald-400 dark:hover:bg-neutral-800'
            }`}
          >
            <div className="relative">
              <ShoppingBag className="w-4.5 h-4.5 mb-0.5 shrink-0" strokeWidth={2.2} />
              {totalItemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center bg-[#05C12F] text-white">
                  {totalItemCount}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-none">
              {totalItemCount > 0 ? `₹${total.toFixed(0)}` : 'Basket'}
            </span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
