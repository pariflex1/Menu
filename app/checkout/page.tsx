'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useBucket } from '@/lib/hooks/use-bucket';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import Image from 'next/image';
import QRScannerModal from '@/components/qr-scanner-modal';

interface MenuItemDetail {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  veg_type: string;
}

/** Returns true if the stored session token is still valid (not expired). */
function isSessionValid(): boolean {
  try {
    const token = localStorage.getItem('session_token');
    const expiresAt = localStorage.getItem('session_expires_at');
    if (!token || !expiresAt) return false;
    return new Date() < new Date(expiresAt);
  } catch {
    return false;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearBucket, total, updateQuantity } = useBucket();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // QR / location state
  const [orderContext, setOrderContext] = useState<{ type: string; name: string } | null>(null);
  const [sessionValid, setSessionValid] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerRequired, setScannerRequired] = useState(false);

  // "Outside hotel" mode: user confirmed they are not at the restaurant
  const [outsideHotel, setOutsideHotel] = useState(false);

  const [menuItemsMap, setMenuItemsMap] = useState<Record<string, MenuItemDetail>>({});

  // Load menu item details for the checkout breakdown
  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch('/api/menu');
        const data = await res.json();
        if (data.categories) {
          const map: Record<string, MenuItemDetail> = {};
          data.categories.forEach((cat: { items: MenuItemDetail[] }) => {
            cat.items.forEach((item: MenuItemDetail) => {
              map[item.id] = item;
            });
          });
          setMenuItemsMap(map);
        }
      } catch (e) {
        console.error('Failed to load menu details:', e);
      }
    }
    fetchDetails();
  }, []);

  // Load stored QR context from localStorage on mount
  useEffect(() => {
    try {
      const savedContext = localStorage.getItem('order_context');
      if (savedContext) {
        const parsed = JSON.parse(savedContext);
        setOrderContext(parsed);
      }
      setSessionValid(isSessionValid());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const gstAmount = Number((total * 0.05).toFixed(2));
  const grandTotal = Number((total + gstAmount).toFixed(2));

  /** Called after successful QR scan */
  const handleQRSuccess = useCallback((ctx: { type: string; name: string; sessionToken?: string }) => {
    setOrderContext({ type: ctx.type, name: ctx.name });
    setSessionValid(true);
    setScannerRequired(false);
    setOutsideHotel(false);
    setError(null);
  }, []);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate customer info ONLY if placing takeaway/outside order
    if (outsideHotel) {
      if (!customerName.trim()) {
        setError('Please enter your name for takeaway.');
        return;
      }
      if (!customerPhone.trim() || !/^[0-9]{10}$/.test(customerPhone.trim())) {
        setPhoneError('Please enter a valid 10-digit mobile number.');
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
      setPhoneError(null);
    }

    // Determine session / location state
    const currentlyValid = isSessionValid();
    setSessionValid(currentlyValid);

    const hasContext = !!orderContext;
    const isInHotel = hasContext && currentlyValid;

    // If not outside-hotel mode and no valid session → force QR scan
    if (!outsideHotel && !isInHotel) {
      setScannerRequired(true);
      setIsScannerOpen(true);
      if (!hasContext) {
        setError('Please scan the QR code on your table to continue.');
      } else {
        setError('Your session has expired. Please scan the QR code again to continue.');
      }
      return;
    }

    setIsSubmitting(true);

    const sessionToken = currentlyValid ? localStorage.getItem('session_token') : null;
    const orderType = orderContext?.type || 'table';

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: uuidv4(),
          session_token: sessionToken,
          order_type: outsideHotel ? 'table' : orderType,
          items,
          customer_name: customerName.trim() || 'Dine-in Guest',
          customer_phone: customerPhone.trim() || '0000000000',
          payment_method: 'cash',
          notes: notes.trim() || null,
          skip_session: outsideHotel || !sessionToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'session_expired' || data.error === 'invalid_session') {
          // Session expired between validation and submission – force re-scan
          setSessionValid(false);
          setScannerRequired(true);
          setIsScannerOpen(true);
          setError('Session expired. Please scan the QR code again.');
        } else if (data.error === 'item_unavailable') {
          setError('One or more items are currently unavailable.');
        } else if (data.error === 'restaurant_closed') {
          setError('Kitchen is currently closed for orders.');
        } else {
          setError(data.error || 'Failed to place order. Please check with staff.');
        }
        setIsSubmitting(false);
        return;
      }

      clearBucket();
      router.push(`/order/${data.order.id}`);
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="customer-page flex min-h-dvh flex-col items-center justify-center px-4 bg-white">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-2xl border border-gray-100">
            🍽️
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Your basket is empty</h2>
          <p className="text-sm text-gray-400">Browse our menu and add dishes to get started.</p>
          <Button
            onClick={() => router.push('/menu')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2.5 rounded-lg"
          >
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  const locationLocked = !!orderContext && sessionValid;

  return (
    <div className="customer-page min-h-dvh bg-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/menu"
              className="text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
            >
              ← Menu
            </Link>
            <h1 className="text-base font-semibold text-gray-900">Confirm Order</h1>
          </div>
          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            KRISHNA ANANDAM
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        <form onSubmit={handlePlaceOrder} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-600 font-medium flex items-start gap-2">
              <span className="shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* 1. Order Items Breakdown */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Your Items ({items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
              <Link href="/menu" className="text-xs font-medium text-emerald-600 hover:underline">
                + Add More
              </Link>
            </div>

            <div className="divide-y divide-gray-50">
              {items.map((bucketItem) => {
                const detail = menuItemsMap[bucketItem.menu_item_id];
                const itemName = detail?.name || 'Menu Item';
                const itemPrice = detail?.price || bucketItem.unit_price || 0;
                const itemImage = detail?.image_url;

                return (
                  <div key={bucketItem.menu_item_id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {itemImage ? (
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-50 shrink-0">
                          <Image
                            src={itemImage}
                            alt={itemName}
                            fill
                            className="object-cover"
                            sizes="44px"
                            unoptimized={itemImage.startsWith('http')}
                          />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 text-lg border border-gray-100">
                          🍽️
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{itemName}</p>
                        <p className="text-xs text-gray-400">₹{itemPrice.toFixed(0)} each</p>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(bucketItem.menu_item_id, bucketItem.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-semibold text-gray-900">
                          {bucketItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(bucketItem.menu_item_id, bucketItem.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 w-14 text-right">
                        ₹{(itemPrice * bucketItem.quantity).toFixed(0)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Service Location — QR Only */}
          {!outsideHotel && (
            <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Service Location
                </h2>
                {locationLocked && (
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ Verified
                  </span>
                )}
              </div>

              {locationLocked ? (
                /* Session is valid — show location as a locked badge */
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <span className="text-lg">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{orderContext!.name}</p>
                    <p className="text-[11px] text-gray-400">Your order will be served here</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setScannerRequired(false); setIsScannerOpen(true); }}
                    className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 underline shrink-0"
                  >
                    Change
                  </button>
                </div>
              ) : (
                /* No valid session — prompt to scan */
                <div className="space-y-2">
                  {orderContext && !sessionValid && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-medium">
                      ⏰ Session expired for <strong>{orderContext.name}</strong>. Please scan the QR code again.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setScannerRequired(false); setIsScannerOpen(true); }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm px-4 py-3 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Scan Table QR Code
                  </button>
                  <p className="text-[11px] text-center text-gray-400">
                    Point your camera at the QR code on your table
                  </p>
                </div>
              )}

              {/* Outside hotel option */}
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-base border border-gray-200">
                    🚗
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">Not at the restaurant?</p>
                    <p className="text-[11px] text-gray-400 leading-tight">Place a takeaway order without QR</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOutsideHotel(true)}
                    className="shrink-0 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                  >
                    Takeaway
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Outside hotel banner */}
          {outsideHotel && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-lg border border-gray-200">
                  🚗
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Takeaway / Pickup Order</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    Enter your name and mobile number below. Your order will be prepared for pickup.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOutsideHotel(false)}
                  className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* 3. Customer Details — ONLY shown for Takeaway / Outside Order */}
          {outsideHotel ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Contact Details
                </h2>
                <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  Required
                </span>
              </div>

              <div>
                <label htmlFor="name" className="block text-xs font-medium text-gray-600 mb-1">
                  Your Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white focus:border-emerald-400 transition-all font-normal"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-medium text-gray-600 mb-1">
                  Mobile Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">+91</span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setCustomerPhone(val);
                      if (phoneError && val.length === 10) setPhoneError(null);
                    }}
                    required
                    placeholder="10-digit mobile number"
                    className={`w-full pl-11 pr-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all font-normal ${
                      phoneError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                  {customerPhone.length > 0 && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium ${
                      customerPhone.length === 10 ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
                      {customerPhone.length}/10
                    </span>
                  )}
                </div>
                {phoneError && (
                  <p className="mt-1 text-[11px] text-red-500 font-medium">{phoneError}</p>
                )}
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-medium text-gray-600 mb-1">
                  Cooking Instructions <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Less spicy, Jain preparation, extra chutney..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all font-normal"
                />
              </div>
            </div>
          ) : (
            /* Optional Cooking Instructions card for Dine-In */
            <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
              <label htmlFor="notes" className="block text-xs font-medium uppercase tracking-wider text-gray-400">
                Cooking Instructions <span className="normal-case text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Less spicy, Jain preparation, extra chutney, no onions..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all font-normal"
              />
            </div>
          )}

          {/* 4. Bill Summary */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-2.5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Bill Summary
            </h2>

            <div className="space-y-1.5 text-sm text-gray-500">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-medium text-gray-900">₹{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>GST (5%)</span>
                <span>₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between text-base font-semibold text-gray-900">
                <span>Total Payable</span>
                <span className="text-emerald-700">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 5. Place Order Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#00B14F] hover:bg-[#009b45] active:bg-[#00863c] text-white font-bold py-4 rounded-full text-base transition-all disabled:opacity-60 shadow-lg shadow-[#00B14F]/25"
          >
            {isSubmitting ? 'Placing Order...' : `Place Order • ₹${grandTotal.toFixed(2)}`}
          </Button>

          <p className="text-center text-xs text-gray-400 font-normal">
            Pay at counter or upon service (Cash / UPI / Card)
          </p>
        </form>
      </main>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setScannerRequired(false);
        }}
        onSuccess={handleQRSuccess}
        required={scannerRequired}
      />
    </div>
  );
}
