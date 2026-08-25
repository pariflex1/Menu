import { useState, useEffect, useCallback } from 'react';

export interface BucketItem {
  menu_item_id: string;
  quantity: number;
  unit_price?: number;   // store price for total computation
  addon_ids?: string[];
  notes?: string;
}

const BUCKET_KEY = 'order_bucket';
const BUCKET_EVENT = 'bucket_updated';

// Global in-memory state shared across all hook instances
let globalItems: BucketItem[] = [];

// Notify all hook instances that the bucket changed
function broadcast() {
  try {
    localStorage.setItem(BUCKET_KEY, JSON.stringify(globalItems));
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(BUCKET_EVENT));
}

// Load from localStorage once on startup
try {
  const stored = localStorage.getItem(BUCKET_KEY);
  if (stored) globalItems = JSON.parse(stored);
} catch { /* ignore */ }

// Global cache of menu item prices
let priceCache: Record<string, number> = {};
export function setPriceCache(id: string, price: number) {
  priceCache[id] = price;
}

export function useBucket() {
  const [items, setItems] = useState<BucketItem[]>(globalItems);

  // Subscribe to bucket broadcast events
  useEffect(() => {
    const handler = () => setItems([...globalItems]);
    window.addEventListener(BUCKET_EVENT, handler);
    // Sync from localStorage on mount (for SSR hydration)
    try {
      const stored = localStorage.getItem(BUCKET_KEY);
      if (stored) {
        globalItems = JSON.parse(stored);
        setItems([...globalItems]);
      }
    } catch { /* ignore */ }
    return () => window.removeEventListener(BUCKET_EVENT, handler);
  }, []);

  // Compute subtotal from stored unit_price or priceCache
  const total = items.reduce((sum, item) => {
    const price = item.unit_price ?? priceCache[item.menu_item_id] ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const totalItemCount = items.reduce((s, i) => s + i.quantity, 0);

  const addItem = useCallback((item: BucketItem) => {
    const existing = globalItems.find((i) => i.menu_item_id === item.menu_item_id);
    if (existing) {
      globalItems = globalItems.map((i) =>
        i.menu_item_id === item.menu_item_id
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      );
    } else {
      globalItems = [...globalItems, item];
    }
    broadcast();
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      globalItems = globalItems.filter((i) => i.menu_item_id !== menuItemId);
    } else {
      globalItems = globalItems.map((i) =>
        i.menu_item_id === menuItemId ? { ...i, quantity } : i
      );
    }
    broadcast();
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    globalItems = globalItems.filter((i) => i.menu_item_id !== menuItemId);
    broadcast();
  }, []);

  const clearBucket = useCallback(() => {
    globalItems = [];
    localStorage.removeItem(BUCKET_KEY);
    window.dispatchEvent(new CustomEvent(BUCKET_EVENT));
  }, []);

  return {
    items,
    total,
    totalItemCount,
    addItem,
    updateQuantity,
    removeItem,
    clearBucket,
  };
}
