'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/bottom-nav';

export default function OrderStatusSearchPage() {
  const router = useRouter();
  const [orderQuery, setOrderQuery] = useState('');
  const [recentOrders, setRecentOrders] = useState<string[]>([]);
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const latest = localStorage.getItem('latest_order_id');
      if (latest) {
        setLatestOrderId(latest);
      }
      const recents = localStorage.getItem('recent_orders');
      if (recents) {
        setRecentOrders(JSON.parse(recents));
      } else if (latest) {
        setRecentOrders([latest]);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = orderQuery.trim();
    if (!cleanId) return;
    router.push(`/order/${cleanId}`);
  };

  return (
    <div className="customer-page min-h-dvh bg-[#F7F9F8] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3.5 border-b border-gray-100 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/menu"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-sm transition-colors"
          >
            ‹
          </Link>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Live Order Tracking</h1>
            <p className="text-[10px] text-gray-400">Krishna Anandam &bull; Vrindavan</p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-[#00B14F]/10 text-[#00B14F] px-2.5 py-1 rounded-full border border-emerald-200">
          Pure Veg
        </span>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Latest Active Order Banner */}
        {latestOrderId && (
          <div className="bg-gradient-to-br from-emerald-600 to-[#00B14F] text-white rounded-3xl p-5 shadow-lg shadow-emerald-500/20 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs">
                  Active Session
                </span>
                <h2 className="text-lg font-black mt-1">Track Current Order</h2>
                <p className="text-xs text-emerald-100">
                  View kitchen preparation and delivery progress in real-time.
                </p>
              </div>
              <span className="text-3xl">⚡</span>
            </div>

            <Link
              href={`/order/${latestOrderId}`}
              className="w-full bg-white text-[#00B14F] hover:bg-emerald-50 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all press-scale"
            >
              <span>Open Live Order Tracker</span>
              <span>›</span>
            </Link>
          </div>
        )}

        {/* Search by Order ID Form */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs space-y-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-sm">
              🔍
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">Search Any Order</h3>
              <p className="text-[10px] text-gray-400">Enter Order ID from your receipt or confirmation</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-2.5">
            <input
              type="text"
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#00B14F] focus:border-transparent font-medium"
            />
            <button
              type="submit"
              disabled={!orderQuery.trim()}
              className="w-full bg-gray-900 disabled:bg-gray-300 text-white font-bold text-xs py-2.5 rounded-xl transition-all press-scale"
            >
              Track Order Status
            </button>
          </form>
        </div>

        {/* Recent Orders List */}
        {recentOrders.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
              Recent Orders on this Device
            </h3>
            <div className="space-y-2">
              {recentOrders.map((id, index) => (
                <Link
                  key={id}
                  href={`/order/${id}`}
                  className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center justify-between hover:border-gray-200 shadow-2xs transition-all press-scale"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-100">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">
                        Order: {id.slice(0, 8)}...
                      </p>
                      <p className="text-[10px] text-gray-400">Click to view status & items</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#00B14F]">View ›</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no orders placed yet */}
        {!latestOrderId && recentOrders.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-2xl border border-gray-100">
              📋
            </div>
            <h3 className="font-bold text-gray-900 text-sm">No Active Orders Found</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Place an order from our pure vegetarian menu to track its preparation live here.
            </p>
            <Link
              href="/menu"
              className="inline-block bg-[#00B14F] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-sm hover:bg-[#009b45] transition-all"
            >
              Browse All Dishes
            </Link>
          </div>
        )}
      </main>

      <BottomNav activeTab="status" />
    </div>
  );
}
