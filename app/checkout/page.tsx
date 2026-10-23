'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useBucket } from '@/lib/hooks/use-bucket';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import QRScannerModal from '@/components/qr-scanner-modal';
import BottomNav from '@/components/bottom-nav';
import ThemeToggle from '@/components/theme-toggle';
import { LocateFixed, Loader2, MapPin, QrCode, ShoppingBag } from 'lucide-react';

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
  const [customerLocation, setCustomerLocation] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
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

  // Load menu item details for the checkout breakdown (Instant SWR cache)
  useEffect(() => {
    try {
      const cached = localStorage.getItem('ka_menu_cache_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.categories) {
          const map: Record<string, MenuItemDetail> = {};
          parsed.categories.forEach((cat: { items: MenuItemDetail[] }) => {
            cat.items.forEach((item: MenuItemDetail) => {
              map[item.id] = item;
            });
          });
          setMenuItemsMap(map);
        }
      }
    } catch {
      // Ignore cache parse error
    }

    async function fetchDetails() {
      try {
        const res = await fetch('/api/menu?refresh=true', { cache: 'no-store' });
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
    } catch {
      // Ignore localStorage errors
    }
    setSessionValid(isSessionValid());
  }, []);

  // Tax calculation (5% GST)
  const gstAmount = total * 0.05;
  const grandTotal = total + gstAmount;

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location is not supported on this device. Please enter it manually.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationCoords({ lat: latitude, lng: longitude });

        let label = `Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { Accept: 'application/json' } },
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name) label = data.display_name;
          }
        } catch {
          // Keep the coordinate fallback
        }

        setCustomerLocation(label);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Please allow access or enter it manually.');
        } else if (err.code === err.TIMEOUT) {
          setLocationError('Location request timed out. Please try again or enter it manually.');
        } else {
          setLocationError('Could not fetch your location. Please enter it manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  // Handler for QR scan success
  const handleQRSuccess = useCallback(
    (context: { type: string; name: string; sessionToken?: string }) => {
      setOrderContext({ type: context.type, name: context.name });
      setSessionValid(true);
      setIsScannerOpen(false);
      setScannerRequired(false);
      setOutsideHotel(false);
    },
    [],
  );

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
      if (!customerLocation.trim()) {
        setLocationError('Please enter your location or use your current location.');
        setError('Please enter your location or use your current location.');
        return;
      }
      setLocationError(null);
    }

    // Determine session / location state
    const currentlyValid = isSessionValid();
    const currentContext = orderContext;

    // Enforce QR code scan ONLY when customer is ordering at the restaurant (not outside)
    if (!outsideHotel && (!currentContext || !currentlyValid)) {
      setScannerRequired(true);
      setIsScannerOpen(true);
      return;
    }

    if (items.length === 0) {
      setError('Your basket is empty. Add some delicious dishes first!');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderType = outsideHotel ? 'home' : (currentContext?.type || 'table');
      const sessionToken = outsideHotel ? null : localStorage.getItem('session_token');

      // Fetch active restaurant
      const restRes = await fetch('/api/restaurants/default');
      const restData = await restRes.json();
      const restaurantId = restData?.restaurant?.id;

      if (!restaurantId) {
        throw new Error('Restaurant not found');
      }

      const orderNotes = [
        outsideHotel ? `Location: ${customerLocation.trim()}` : null,
        notes.trim() || null,
      ]
        .filter(Boolean)
        .join(' | ');

      const payload = {
        idempotency_key: uuidv4(),
        restaurant_id: restaurantId,
        order_type: orderType,
        customer_name: outsideHotel ? customerName.trim() : (currentContext?.name || 'Table Customer'),
        customer_phone: outsideHotel ? customerPhone.trim() : '0000000000',
        customer_location: outsideHotel ? customerLocation.trim() : undefined,
        customer_latitude: outsideHotel ? locationCoords?.lat : undefined,
        customer_longitude: outsideHotel ? locationCoords?.lng : undefined,
        payment_method: 'cash',
        payment_status: 'pending',
        session_token: sessionToken,
        notes: orderNotes || null,
        items: items.map((i) => ({
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          addon_ids: i.addon_ids || [],
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'session_expired' || data.error === 'invalid_session') {
          localStorage.removeItem('session_token');
          localStorage.removeItem('session_expires_at');
          setSessionValid(false);
          setScannerRequired(true);
          setIsScannerOpen(true);
          setIsSubmitting(false);
          return;
        }
        setError(data.error || 'Failed to place order. Please try again.');
        setIsSubmitting(false);
        return;
      }

      try {
        localStorage.setItem('latest_order_id', data.order.id);
        const recents = localStorage.getItem('recent_orders');
        const parsedRecents = recents ? JSON.parse(recents) : [];
        if (!parsedRecents.includes(data.order.id)) {
          parsedRecents.unshift(data.order.id);
          localStorage.setItem('recent_orders', JSON.stringify(parsedRecents.slice(0, 10)));
        }
      } catch {
        // ignore storage errors
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
      <div className="customer-page flex min-h-dvh flex-col items-center justify-center px-4 bg-white dark:bg-neutral-950">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-3xl border border-gray-100 dark:bg-neutral-900 dark:border-neutral-800">
            🍽️
          </div>
          <h2 className="text-2xl font-semibold text-black dark:text-gray-100">Your basket is empty</h2>
          <p className="text-base text-black dark:text-gray-400 font-normal">Browse our menu and add dishes to get started.</p>
          <Button
            onClick={() => router.push('/menu')}
            className="bg-[#05C12F] hover:bg-[#04A328] text-white font-medium text-base px-6 py-3 rounded-xl"
          >
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  const locationLocked = !!orderContext && sessionValid;

  return (
    <div className="customer-page min-h-dvh bg-white pb-32 font-sans dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-2xs dark:bg-neutral-950 dark:border-neutral-800">
        <div className="mx-auto w-full max-w-4xl px-4 md:px-6 py-3.5 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-base font-medium text-black dark:text-gray-100 hover:bg-gray-100 bg-gray-50 px-3.5 py-1.5 rounded-lg border border-gray-300 transition-colors dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            ← Menu
          </Link>
          <ThemeToggle className="bg-gray-50 hover:bg-gray-100 text-black dark:text-gray-100 border border-gray-300 dark:bg-neutral-900 dark:border-neutral-700 dark:hover:bg-neutral-800" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 md:px-6 py-5">
        <form onSubmit={handlePlaceOrder} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-base text-red-600 font-medium dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 flex items-start gap-2">
              <span className="shrink-0 text-lg">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* 1. Order Items Breakdown */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:bg-neutral-900 dark:border-neutral-800 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-3">
              <h2 className="text-base font-semibold uppercase tracking-wider text-black dark:text-gray-100">
                Your Items ({items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
              <Link href="/menu" className="text-base font-medium text-emerald-800 hover:underline dark:text-emerald-400">
                + Add More
              </Link>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
              {items.map((bucketItem) => {
                const detail = menuItemsMap[bucketItem.menu_item_id];
                const itemName = detail?.name || 'Menu Item';
                const itemPrice = detail?.price || bucketItem.unit_price || 0;

                return (
                  <div key={bucketItem.menu_item_id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-lg border border-gray-200 text-black dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100">
                        🍽️
                      </div>
                      <div className="min-w-0">
                        <p className="text-base sm:text-lg font-semibold text-black dark:text-gray-100 truncate">{itemName}</p>
                        <p className="text-sm font-normal text-black dark:text-gray-100">₹{itemPrice.toFixed(0)} each</p>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl overflow-hidden shadow-2xs dark:bg-neutral-800 dark:border-neutral-700">
                        <button
                          type="button"
                          onClick={() => updateQuantity(bucketItem.menu_item_id, bucketItem.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center font-medium text-black dark:text-gray-100 hover:bg-gray-200 active:bg-gray-300 text-base dark:hover:bg-neutral-700 dark:active:bg-neutral-600"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-base font-semibold text-black dark:text-gray-100">
                          {bucketItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(bucketItem.menu_item_id, bucketItem.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center font-medium text-black dark:text-gray-100 hover:bg-gray-200 active:bg-gray-300 text-base dark:hover:bg-neutral-700 dark:active:bg-neutral-600"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-base font-semibold text-black dark:text-gray-100 w-16 text-right">
                        ₹{(itemPrice * bucketItem.quantity).toFixed(0)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Order Mode — both Scan QR and Takeaway stay visible as tabs */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:bg-neutral-900 dark:border-neutral-800 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold uppercase tracking-wider text-black dark:text-gray-100">
                Service Location
              </h2>
              {!outsideHotel && locationLocked && (
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                  ✓ Verified
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-gray-100 p-1.5 dark:bg-neutral-800">
              <button
                type="button"
                onClick={() => setOutsideHotel(false)}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wide transition-all cursor-pointer ${
                  !outsideHotel
                    ? 'bg-[#05C12F] text-white shadow-sm'
                    : 'text-black hover:bg-white dark:text-gray-200 dark:hover:bg-neutral-700'
                }`}
              >
                <QrCode className="w-4 h-4 shrink-0" />
                SCAN QR CODE
              </button>
              <button
                type="button"
                onClick={() => setOutsideHotel(true)}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wide transition-all cursor-pointer ${
                  outsideHotel
                    ? 'bg-[#05C12F] text-white shadow-sm'
                    : 'text-black hover:bg-white dark:text-gray-200 dark:hover:bg-neutral-700'
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                TAKE AWAY
              </button>
            </div>

            {!outsideHotel ? (
              locationLocked ? (
                /* Session is valid — show location as a locked badge */
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 dark:bg-neutral-800 dark:border-neutral-700">
                  <span className="text-2xl">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-black dark:text-gray-100">{orderContext!.name}</p>
                    <p className="text-sm text-black dark:text-gray-100 font-normal">Your order will be served here</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setScannerRequired(false); setIsScannerOpen(true); }}
                    className="text-sm font-medium text-emerald-800 hover:text-emerald-900 underline shrink-0 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    Change
                  </button>
                </div>
              ) : (
                /* No valid session — prompt to scan */
                <div className="space-y-2.5">
                  {orderContext && !sessionValid && (
                    <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 font-medium dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                      ⏰ Session expired for <strong>{orderContext.name}</strong>. Please scan the QR code again.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setScannerRequired(false); setIsScannerOpen(true); }}
                    className="w-full flex items-center justify-center gap-2 bg-[#05C12F] hover:bg-[#04A328] active:bg-[#038723] text-white font-medium text-base px-5 py-3.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    <QrCode className="w-5 h-5" />
                    SCAN QR CODE
                  </button>
                  <p className="text-sm text-center text-black dark:text-gray-100 font-normal">
                    Point your camera at the QR code on your table
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3.5 dark:bg-neutral-800 dark:border-neutral-700">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg border border-gray-200 dark:bg-neutral-900 dark:border-neutral-700">
                    🛍️
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-black dark:text-gray-100">Takeaway / Pickup Order</p>
                    <p className="text-sm text-black dark:text-gray-100 font-normal mt-0.5 leading-relaxed">
                      Enter your name, mobile number and location below. Your order will be prepared for pickup.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Customer Details — ONLY shown for Takeaway / Outside Order */}
          {outsideHotel ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:bg-neutral-900 dark:border-neutral-800 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold uppercase tracking-wider text-black dark:text-gray-100">
                  Contact Details
                </h2>
                <span className="text-xs font-semibold bg-gray-100 text-black dark:bg-neutral-800 dark:text-gray-100 px-2.5 py-0.5 rounded-full">
                  Required
                </span>
              </div>

              <div>
                <label htmlFor="name" className="block text-base font-medium text-black dark:text-gray-100 mb-1">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-black dark:text-gray-100 dark:bg-neutral-800 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-400 transition-all font-normal placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-base font-medium text-black dark:text-gray-100 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-black dark:text-gray-100 font-medium">+91</span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setCustomerPhone(val);
                      if (phoneError && val.length === 10) setPhoneError(null);
                    }}
                    onBlur={() => {
                      if (customerPhone.length > 0 && customerPhone.length !== 10) {
                        setPhoneError('Please enter a valid 10-digit mobile number.');
                      }
                    }}
                    required
                    placeholder="10-digit mobile number"
                    className={`w-full pl-16 pr-14 py-3 border rounded-xl text-base text-black dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-neutral-900 transition-all font-normal placeholder:text-gray-500 dark:placeholder:text-gray-400 ${
                      phoneError ? 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/40' : 'border-gray-300 bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800'
                    }`}
                  />
                  {customerPhone.length > 0 && (
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold ${
                      customerPhone.length === 10 ? 'text-emerald-700 dark:text-emerald-400' : 'text-black dark:text-gray-100'
                    }`}>
                      {customerPhone.length}/10
                    </span>
                  )}
                </div>
                {phoneError && (
                  <p className="mt-1.5 text-sm text-red-600 font-medium">{phoneError}</p>
                )}
              </div>

              <div>
                <label htmlFor="location" className="block text-base font-medium text-black dark:text-gray-100 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400 pointer-events-none" />
                  <input
                    id="location"
                    type="text"
                    autoComplete="street-address"
                    value={customerLocation}
                    onChange={(e) => {
                      setCustomerLocation(e.target.value);
                      if (locationError && e.target.value.trim()) setLocationError(null);
                    }}
                    required
                    placeholder="House / street / landmark / area"
                    className={`w-full pl-12 pr-4 py-3 border rounded-xl text-base text-black dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-neutral-900 transition-all font-normal placeholder:text-gray-500 dark:placeholder:text-gray-400 ${
                      locationError ? 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/40' : 'border-gray-300 bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800'
                    }`}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleFetchCurrentLocation}
                  disabled={isLocating}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60 text-[#05C12F] border border-[#05C12F] font-semibold text-base px-4 py-3 rounded-xl transition-all cursor-pointer dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-emerald-400 dark:border-emerald-500"
                >
                  {isLocating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <LocateFixed className="w-5 h-5" />
                  )}
                  {isLocating ? 'Fetching current location...' : 'Use Current Location'}
                </button>

                {locationCoords && (
                  <a
                    href={`https://www.google.com/maps?q=${locationCoords.lat},${locationCoords.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-400"
                  >
                    <MapPin className="w-4 h-4" />
                    Open captured location in Google Maps
                  </a>
                )}

                {locationError && (
                  <p className="mt-1.5 text-sm text-red-600 font-medium">{locationError}</p>
                )}
              </div>

              <div>
                <label htmlFor="notes" className="block text-base font-medium text-black dark:text-gray-100 mb-1">
                  Cooking Instructions <span className="text-gray-500 font-normal dark:text-gray-400">(Optional)</span>
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Less spicy, Jain preparation, extra chutney..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-black dark:text-gray-100 dark:bg-neutral-800 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-400 transition-all font-normal placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>
            </div>
          ) : (
            /* Optional Cooking Instructions card for Dine-In */
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:bg-neutral-900 dark:border-neutral-800 space-y-2.5 shadow-2xs">
              <label htmlFor="notes" className="block text-base font-semibold uppercase tracking-wider text-black dark:text-gray-100">
                Cooking Instructions <span className="normal-case text-gray-500 font-normal dark:text-gray-400">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Less spicy, Jain preparation, extra chutney, no onions..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-black dark:text-gray-100 dark:bg-neutral-800 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white dark:focus:bg-neutral-900 focus:border-emerald-400 transition-all font-normal placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
          )}

          {/* 4. Bill Summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:bg-neutral-900 dark:border-neutral-800 space-y-3 shadow-2xs">
            <h2 className="text-base font-semibold uppercase tracking-wider text-black dark:text-gray-100">
              Bill Summary
            </h2>

            <div className="space-y-2 text-base text-black dark:text-gray-100 font-normal">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-black dark:text-gray-100">₹{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base text-black dark:text-gray-100">
                <span>GST (5%)</span>
                <span className="font-semibold text-black dark:text-gray-100">₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold dark:border-neutral-700 text-black dark:text-gray-100">
                <span>Total Payable</span>
                <span className="text-black dark:text-gray-100 text-xl font-bold">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 5. Place Order Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#05C12F] hover:bg-[#04A328] active:bg-[#038723] text-white font-bold py-4 rounded-full text-lg transition-all disabled:opacity-60 shadow-lg shadow-[#05C12F]/25 cursor-pointer"
          >
            {isSubmitting ? 'Placing Order...' : `Place Order • ₹${grandTotal.toFixed(2)}`}
          </Button>

          <p className="text-center text-sm text-black dark:text-gray-100 font-normal">
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

      {/* Bottom Navigation Dock showing Basket as active tab */}
      <BottomNav activeTab="basket" />
    </div>
  );
}
