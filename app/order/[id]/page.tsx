'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface OrderItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  order_type: string;
  subtotal: number;
  tax: number;
  delivery_fee?: number;
  total: number;
  customer_name: string;
  customer_phone?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  table_id?: string;
  room_id?: string;
  tables?: { table_number: string };
  rooms?: { room_number: string };
  order_items: OrderItem[];
}

const STEPS = [
  { id: 'new', label: 'Received', icon: '📋', desc: 'Order sent to kitchen' },
  { id: 'preparing', label: 'Cooking', icon: '👨‍🍳', desc: 'Chefs are preparing your meal' },
  { id: 'ready', label: 'Ready', icon: '🔔', desc: 'Dishes are ready for service' },
  { id: 'served', label: 'Served', icon: '🍽️', desc: 'Served at your table' },
];

function getStepIndex(status: string): number {
  if (status === 'new') return 0;
  if (status === 'accepted' || status === 'preparing') return 1;
  if (status === 'ready' || status === 'out_for_delivery') return 2;
  if (status === 'served' || status === 'delivered' || status === 'completed') return 3;
  return 0;
}

const STATUS_DETAILS: Record<string, { title: string; subtitle: string; icon: string; badgeBg: string }> = {
  new: {
    title: 'Order Received!',
    subtitle: 'Your order has been sent to the Krishna Anandam kitchen.',
    icon: '📋',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  accepted: {
    title: 'Order Accepted & Confirmed',
    subtitle: 'The chef has confirmed your dishes and added them to the queue.',
    icon: '👍',
    badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  preparing: {
    title: 'Freshly Preparing Your Food',
    subtitle: 'Our chefs are cooking your meal with fresh 100% vegetarian ingredients.',
    icon: '🍳',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  ready: {
    title: 'Dishes Ready to Serve!',
    subtitle: 'Your food is ready and will be at your table in just a moment.',
    icon: '🔔',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  served: {
    title: 'Dishes Served — Enjoy!',
    subtitle: 'Hope you have a delightful pure vegetarian dining experience.',
    icon: '🍽️',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  delivered: {
    title: 'Order Delivered!',
    subtitle: 'Your takeaway / pickup order has been completed.',
    icon: '📦',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  completed: {
    title: 'Order Completed',
    subtitle: 'Thank you for visiting Krishna Anandam, Vrindavan!',
    icon: '✨',
    badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  cancelled: {
    title: 'Order Cancelled',
    subtitle: 'This order was cancelled. Please speak with the restaurant staff.',
    icon: '❌',
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
  },
};

import BottomNav from '@/components/bottom-nav';

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();

        if (!res.ok || !data.order) {
          setError('Order not found');
          return;
        }

        setOrder(data.order);
        setLastRefreshed(new Date());

        try {
          localStorage.setItem('latest_order_id', data.order.id);
          const recents = localStorage.getItem('recent_orders');
          const parsedRecents = recents ? JSON.parse(recents) : [];
          if (!parsedRecents.includes(data.order.id)) {
            parsedRecents.unshift(data.order.id);
            localStorage.setItem('recent_orders', JSON.stringify(parsedRecents.slice(0, 10)));
          }
        } catch {
          // ignore localStorage error
        }
      } catch {
        setError('Failed to load order');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();

    // Auto-poll live order status every 3 seconds
    const interval = setInterval(fetchOrder, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F4F9F4] px-4 font-sans">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto"></div>
          <p className="font-extrabold text-slate-800 text-sm">Connecting to live order tracker...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 bg-[#F4F9F4] font-sans">
        <div className="text-center max-w-sm space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-lg font-bold text-slate-900">{error || 'Order not found'}</h1>
          <Link
            href="/menu"
            className="inline-block bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const currentStep = getStepIndex(order.status);
  const info = STATUS_DETAILS[order.status] || STATUS_DETAILS.new;

  const locationLabel =
    order.tables?.table_number
      ? `Table ${order.tables.table_number}`
      : order.rooms?.room_number
      ? `Room ${order.rooms.room_number}`
      : order.order_type === 'home'
      ? '🚗 Takeaway Order'
      : 'Dine-In';

  return (
    <div className="min-h-dvh bg-[#F4F9F4] pb-24 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-emerald-100 shadow-2xs">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
              KA
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900">Order #{order.order_number}</span>
                <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full border border-emerald-200">
                  📍 {locationLabel}
                </span>
              </div>
              <p className="text-[10px] text-emerald-700 font-bold">KRISHNA ANANDAM • PURE VEG</p>
            </div>
          </div>

          <Link
            href="/menu"
            className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            + Menu
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Live Status Hero Card */}
        <div className="rounded-3xl border border-emerald-100 bg-white p-5 text-center shadow-sm space-y-3">
          <div className="text-5xl animate-bounce">{info.icon}</div>
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">
              {info.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {info.subtitle}
            </p>
          </div>

          {/* Live pulsing sync badge */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-bold text-emerald-700">
              Live updates active • Synced {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* 4-Step Animated Progress Stepper */}
        {!isCancelled && (
          <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 border-b border-slate-100 pb-2">
              Order Progress
            </h3>

            <div className="grid grid-cols-4 gap-1 text-center relative pt-2">
              {STEPS.map((step, idx) => {
                const isPassed = idx <= currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={step.id} className="flex flex-col items-center space-y-1 relative z-10">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${
                        isCurrent
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md scale-110'
                          : isPassed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {step.icon}
                    </div>
                    <p
                      className={`text-[10px] font-extrabold capitalize ${
                        isCurrent
                          ? 'text-emerald-900'
                          : isPassed
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Booked Items List */}
        <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
              Booked Dishes ({order.order_items?.length || 0})
            </h3>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
              Pure Veg
            </span>
          </div>

          <div className="divide-y divide-slate-100 space-y-1">
            {order.order_items?.map((item, idx) => (
              <div key={idx} className="pt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-black text-emerald-800 bg-emerald-50 border border-emerald-200 w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px]">
                    {item.quantity}
                  </span>
                  <span className="font-bold text-slate-800">{item.item_name}</span>
                </div>
                <span className="font-extrabold text-slate-900">
                  ₹{Number(item.total_price || item.unit_price * item.quantity).toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          {/* Bill summary */}
          <div className="border-t border-slate-200 pt-2.5 mt-2 space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-slate-800">₹{order.subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (5%)</span>
              <span className="font-bold text-slate-800">₹{order.tax.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-100">
              <span>Total Payable</span>
              <span className="text-emerald-700 text-base">₹{order.total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Special Instructions if provided */}
        {order.notes && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-base shrink-0">📝</span>
            <div>
              <p className="font-extrabold uppercase text-[10px] text-amber-950">Cooking Instructions:</p>
              <p className="font-medium text-amber-900 mt-0.5">{order.notes}</p>
            </div>
          </div>
        )}

        {/* Customer & Timestamp Info */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-3.5 shadow-2xs text-xs text-slate-500 space-y-1.5">
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className="font-bold text-slate-800">{order.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Order Placed:</span>
            <span className="font-medium text-slate-700">
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Payment:</span>
            <span className="font-bold text-emerald-800 capitalize">Pay on Service ({order.payment_method || 'Cash / UPI'})</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 pb-6">
          <Link
            href="/menu"
            className="block text-center w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-md active:scale-95 transition-all"
          >
            + Add More Dishes from Menu
          </Link>
        </div>
      </main>

      <BottomNav activeTab="status" />
    </div>
  );
}
