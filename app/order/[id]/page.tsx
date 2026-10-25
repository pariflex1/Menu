'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/bottom-nav';
import ThemeToggle from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';
import PwaInstallBanner, { PwaHeaderButton } from '@/components/pwa-install-banner';
import {
  ClipboardList,
  ChefHat,
  Bell,
  UtensilsCrossed,
  ThumbsUp,
  Flame,
  Package,
  Sparkles,
  XCircle,
  TriangleAlert,
  NotebookPen,
  Check,
  type LucideIcon,
} from 'lucide-react';

interface OrderItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string | number;
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
  { id: 'new', label: 'Received', Icon: ClipboardList, desc: 'Order sent to kitchen' },
  { id: 'preparing', label: 'Cooking', Icon: ChefHat, desc: 'Chefs are preparing your meal' },
  { id: 'ready', label: 'Ready', Icon: Bell, desc: 'Dishes are ready for service' },
  { id: 'served', label: 'Served', Icon: UtensilsCrossed, desc: 'Served at your table' },
];

function getStepIndex(status: string): number {
  if (status === 'new') return 0;
  if (status === 'accepted' || status === 'preparing') return 1;
  if (status === 'ready' || status === 'out_for_delivery') return 2;
  if (status === 'served' || status === 'delivered' || status === 'completed') return 3;
  return 0;
}

const STATUS_DETAILS: Record<string, { title: string; subtitle: string; Icon: LucideIcon; badgeBg: string; iconBg: string; iconColor: string }> = {
  new: {
    title: 'Order Received!',
    subtitle: 'Your order has been sent to the Krishna Anandam kitchen.',
    Icon: ClipboardList,
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
  },
  accepted: {
    title: 'Order Accepted & Confirmed',
    subtitle: 'The chef has confirmed your dishes and added them to the queue.',
    Icon: ThumbsUp,
    badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-700',
  },
  preparing: {
    title: 'Freshly Preparing Your Food',
    subtitle: 'Our chefs are cooking your meal with fresh 100% vegetarian ingredients.',
    Icon: Flame,
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  ready: {
    title: 'Dishes Ready to Serve!',
    subtitle: 'Your food is ready and will be at your table in just a moment.',
    Icon: Bell,
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-700',
  },
  served: {
    title: 'Dishes Served — Enjoy!',
    subtitle: 'Hope you have a delightful pure vegetarian dining experience.',
    Icon: UtensilsCrossed,
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/70',
    iconColor: 'text-emerald-700 dark:text-emerald-400',
  },
  delivered: {
    title: 'Order Delivered!',
    subtitle: 'Your takeaway / pickup order has been completed.',
    Icon: Package,
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/70',
    iconColor: 'text-emerald-700 dark:text-emerald-400',
  },
  completed: {
    title: 'Order Completed',
    subtitle: 'Thank you for dining with Krishna Anandam, Vrindavan!',
    Icon: Sparkles,
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/70',
    iconColor: 'text-emerald-700 dark:text-emerald-400',
  },
  cancelled: {
    title: 'Order Cancelled',
    subtitle: 'This order was cancelled. Please speak with the restaurant staff.',
    Icon: XCircle,
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  rejected: {
    title: 'Order Not Accepted',
    subtitle: 'Kitchen was unable to accept this order. Please check with staff.',
    Icon: TriangleAlert,
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
};

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [inspectedStep, setInspectedStep] = useState<number | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();

      if (!res.ok || !data.order) {
        if (!order) {
          setError('Order not found');
        }
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
      if (!order) {
        setError('Failed to load order');
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, order]);

  useEffect(() => {
    fetchOrder();

    // 1. High-frequency live polling every 2.5s with cache-busting
    const interval = setInterval(fetchOrder, 2500);

    // 2. Supabase Realtime channel for instant push updates
    let channel: any = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel(`order-live-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`,
          },
          () => {
            fetchOrder();
          }
        )
        .subscribe();
    } catch (e) {
      console.error('Realtime subscription failed, falling back to polling:', e);
    }

    return () => {
      clearInterval(interval);
      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [orderId, fetchOrder]);

  useEffect(() => {
    setInspectedStep(null);
  }, [order?.status]);

  if (loading && !order) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F4F9F4] px-4 font-sans dark:bg-neutral-950">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto"></div>
          <p className="font-extrabold text-slate-800 text-base dark:text-gray-200">Connecting to live order tracker...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 bg-[#F4F9F4] font-sans dark:bg-neutral-950">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto dark:bg-red-950/50">
            <TriangleAlert className="w-8 h-8 text-red-600 dark:text-red-400" strokeWidth={2} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">{error || 'Order not found'}</h1>
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

  const isCancelled = order.status === 'cancelled' || order.status === 'rejected';
  const isCompleted = order.status === 'completed';
  const currentStep = getStepIndex(order.status);
  const info = STATUS_DETAILS[order.status] || STATUS_DETAILS.new;
  const inspectedIndex = inspectedStep ?? currentStep;
  const inspectedInfo = STEPS[inspectedIndex];
  const ringPercent = isCompleted ? 100 : Math.round(((currentStep + 1) / STEPS.length) * 100);
  const railPercent = (currentStep / (STEPS.length - 1)) * 100;
  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;

  const locationLabel =
    order.tables?.table_number
      ? `🍽️ Table ${order.tables.table_number}`
      : order.rooms?.room_number
      ? `🏨 Room ${order.rooms.room_number}`
      : order.order_type === 'home' || (!order.table_id && !order.room_id)
      ? '🛍️ Takeaway Order'
      : '🍽️ Dine-In';

  return (
    <div className="customer-page min-h-dvh bg-[#F4F9F4] pb-24 font-sans dark:bg-neutral-950">
      {/* Header */}
      <header
        style={{ top: 'var(--pwa-banner-offset, 0px)' }}
        className="sticky z-10 bg-white border-b border-emerald-100 shadow-2xs dark:bg-neutral-950 dark:border-neutral-800"
      >
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/menu"
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors dark:bg-neutral-800 dark:text-gray-200 dark:hover:bg-neutral-700"
            >
              ‹
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 dark:text-gray-100">Order #{order.order_number}</span>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                  {locationLabel}
                </span>
              </div>
              <p className="text-xs text-emerald-800 font-normal dark:text-emerald-400">KRISHNA ANANDAM • PURE VEG</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-200" />
            <Link
              href="/menu"
              className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950"
            >
              + Menu
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 md:px-6 py-4 space-y-4">

        {/* ── Live Status Hero Card ── */}
        <div className={`rounded-3xl p-5 text-center space-y-3 shadow-lg border relative overflow-hidden ${
          isCancelled
            ? 'bg-gradient-to-br from-red-50 to-red-100/60 border-red-200 dark:from-red-950/40 dark:to-neutral-900 dark:border-red-900'
            : isCompleted
            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/60 border-emerald-200 dark:from-emerald-950/40 dark:to-neutral-900 dark:border-emerald-800'
            : 'bg-gradient-to-br from-white to-emerald-50/40 border-emerald-100 dark:from-neutral-900 dark:to-neutral-900 dark:border-neutral-800'
        }`}>
          {/* Decorative background glow */}
          <div className={`absolute inset-0 pointer-events-none ${
            isCancelled ? 'bg-[radial-gradient(ellipse_at_top,rgba(254,202,202,0.4),transparent_60%)]'
            : isCompleted ? 'bg-[radial-gradient(ellipse_at_top,rgba(167,243,208,0.5),transparent_60%)]'
            : 'bg-[radial-gradient(ellipse_at_top,rgba(167,243,208,0.3),transparent_60%)]'
          }`} />

          {/* Icon with layered glow rings */}
          <div className="relative mx-auto w-fit">
            <div className={`absolute inset-0 rounded-3xl blur-xl opacity-40 scale-125 ${
              isCancelled ? 'bg-red-400' : isCompleted ? 'bg-emerald-400' : info.iconBg
            }`} />
            <div className={`relative w-20 h-20 mx-auto rounded-3xl ${info.iconBg} flex items-center justify-center shadow-lg ${
              !isCancelled && !isCompleted ? 'animate-[bounce_2s_ease-in-out_infinite]' : ''
            }`}>
              <info.Icon className={`w-10 h-10 ${info.iconColor}`} strokeWidth={1.8} />
            </div>
            {/* Outer pulse ring — only on active order */}
            {!isCancelled && !isCompleted && (
              <span className={`absolute -inset-2 rounded-[28px] border-2 ${info.iconBg.replace('bg-', 'border-')} animate-ping opacity-30`} />
            )}
          </div>

          <div className="relative">
            <h2 className="text-2xl font-black text-slate-900 dark:text-gray-100 leading-tight">{info.title}</h2>
            <p className="text-sm text-slate-500 dark:text-gray-400 font-medium mt-1">{info.subtitle}</p>
          </div>

          {/* Live pulsing sync badge */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Live • {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* ── Interactive Order Journey ── */}
        {!isCancelled && (
          <div className="relative bg-white dark:bg-neutral-900 rounded-3xl border border-emerald-100 dark:border-neutral-800 shadow-lg shadow-emerald-100/60 dark:shadow-black/40 overflow-hidden">
            {/* Live summary with animated ring */}
            <div className="relative bg-gradient-to-br from-emerald-50/90 via-white to-white px-5 pt-5 pb-5 border-b border-emerald-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-black uppercase tracking-[0.16em] text-emerald-900 dark:text-emerald-200">Order Journey</h3>
                {isCompleted ? (
                  <span className="flex items-center gap-1.5 text-xs font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    ALL DONE
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/70 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    15-25 min
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center gap-5">
                <div className="relative w-[92px] h-[92px] shrink-0">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <defs>
                      <linearGradient id="order-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6ee7b7" />
                        <stop offset="45%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                    </defs>
                    <circle cx="40" cy="40" r={ringRadius} fill="none" strokeWidth="7" className="stroke-slate-200 dark:stroke-neutral-700" />
                    <circle
                      cx="40"
                      cy="40"
                      r={ringRadius}
                      fill="none"
                      stroke="url(#order-progress-gradient)"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringCircumference - (ringCircumference * ringPercent) / 100}
                      className="transition-all duration-1000 ease-out drop-shadow-[0_0_6px_rgba(16,185,129,0.45)]"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-300/60 dark:shadow-emerald-950/60">
                      <info.Icon className="w-6 h-6" strokeWidth={2.2} />
                    </div>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900 dark:text-gray-100 leading-none tabular-nums tracking-tight">{ringPercent}%</span>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">complete</span>
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-gray-100 mt-1.5 leading-tight">{STEPS[currentStep].label}</p>
                  <p className="text-sm text-slate-500 dark:text-gray-400 font-medium leading-snug line-clamp-2 mt-0.5">{STEPS[currentStep].desc}</p>
                </div>
              </div>
            </div>

            {/* Interactive horizontal rail */}
            <div className="px-3 pt-6 pb-4">
              <div className="relative">
                <div className="absolute top-6 left-[12.5%] right-[12.5%] h-2 -translate-y-1/2 rounded-full bg-slate-100 dark:bg-neutral-800 shadow-inner">
                  <div
                    className="relative h-full rounded-full bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.45)] transition-all duration-1000 ease-out"
                    style={{ width: `${railPercent}%` }}
                  >
                    <span className="absolute inset-0 rounded-full bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.55)_40%,transparent_60%)] bg-[length:200%_100%] animate-[shimmer_2.4s_linear_infinite]" />
                    {railPercent > 0 && railPercent < 100 && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-[3px] border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                    )}
                  </div>
                </div>

                <div className="relative grid grid-cols-4">
                  {STEPS.map((step, idx) => {
                    const isPassed = idx < currentStep;
                    const isCurrent = idx === currentStep;
                    const isSelected = idx === inspectedIndex;

                    return (
                      <button
                        type="button"
                        key={step.id}
                        onClick={() => setInspectedStep(idx)}
                        aria-pressed={isSelected}
                        className="relative flex flex-col items-center gap-2 px-1 cursor-pointer group"
                      >
                        <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          isPassed
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-300/60 dark:shadow-emerald-950/50'
                            : isCurrent
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white ring-4 ring-emerald-100 dark:ring-emerald-900 shadow-lg shadow-emerald-300/50 dark:shadow-emerald-950/50 scale-110'
                            : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-gray-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/50 group-hover:text-emerald-500'
                        } ${isSelected && !isCurrent ? 'ring-2 ring-emerald-400/70 ring-offset-2' : ''}`}>
                          {isCurrent && (
                            <span className="absolute -inset-1.5 rounded-2xl bg-emerald-400/25 animate-ping" />
                          )}
                          {isPassed ? (
                            <Check className="w-6 h-6 relative" strokeWidth={3} />
                          ) : (
                            <step.Icon className="w-6 h-6 relative" strokeWidth={isCurrent ? 2.3 : 1.9} />
                          )}
                        </div>
                        <span className={`text-xs sm:text-[13px] leading-none text-center transition-colors tracking-wide ${
                          isCurrent
                            ? 'text-emerald-800 dark:text-emerald-300 font-black'
                            : isPassed
                            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                            : isSelected
                            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'text-slate-400 dark:text-gray-500 font-semibold'
                        }`}>
                          {step.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tap-to-inspect step detail */}
            <div className={`mx-4 mb-4 rounded-2xl border p-4 flex items-start gap-3 transition-colors ${
              inspectedIndex === currentStep
                ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                : 'bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700'
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                inspectedIndex === currentStep
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              }`}>
                <inspectedInfo.Icon className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-black text-slate-900 dark:text-gray-100">{inspectedInfo.label}</p>
                  {inspectedIndex === currentStep ? (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 bg-white dark:bg-neutral-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-neutral-700">
                      {inspectedIndex < currentStep ? 'Done' : 'Next'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-gray-400 font-medium leading-snug mt-1">{inspectedInfo.desc}</p>
              </div>
              {inspectedStep !== null && inspectedStep !== currentStep && (
                <button
                  type="button"
                  onClick={() => setInspectedStep(null)}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full shrink-0 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                >
                  Live
                </button>
              )}
            </div>
          </div>
        )}

        {/* Itemized Order Breakdown */}
        <div className="rounded-3xl border border-emerald-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-gray-200 border-b border-slate-100 dark:border-neutral-800 pb-2">
            Dishes Ordered ({order.order_items?.length || 0})
          </h3>

          <div className="space-y-2">
            {(order.order_items || []).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    {item.quantity}x
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200">{item.item_name}</span>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-gray-100">₹{(item.total_price || item.unit_price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 dark:border-neutral-800 pt-3 space-y-1.5 text-xs text-slate-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-slate-800 dark:text-gray-200">₹{order.subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (5%)</span>
              <span className="font-bold text-slate-800 dark:text-gray-200">₹{order.tax.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 dark:text-gray-100 pt-1.5 border-t border-slate-100 dark:border-neutral-800">
              <span>Total Payable</span>
              <span className="text-emerald-700 dark:text-emerald-400 text-base">₹{order.total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Special Instructions if provided */}
        {order.notes && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-sm text-amber-900 flex items-start gap-2.5 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200">
            <NotebookPen className="w-5 h-5 shrink-0 text-amber-700 mt-0.5 dark:text-amber-400" strokeWidth={2} />
            <div>
              <p className="font-extrabold uppercase text-xs text-amber-950 dark:text-amber-100">Cooking Instructions:</p>
              <p className="font-medium text-amber-900 mt-0.5 dark:text-amber-200">{order.notes}</p>
            </div>
          </div>
        )}

        {/* Customer & Timestamp Info */}
        <div className="rounded-2xl border border-emerald-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3.5 shadow-2xs text-xs text-slate-500 dark:text-gray-400 space-y-1.5">
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className="font-bold text-slate-800 dark:text-gray-200">{order.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Order Placed:</span>
            <span className="font-medium text-slate-700 dark:text-gray-300">
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Payment:</span>
            <span className="font-bold text-emerald-800 dark:text-emerald-300 capitalize">Pay on Service ({order.payment_method || 'Cash / UPI'})</span>
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
