'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/bottom-nav';
import ThemeToggle from '@/components/theme-toggle';
import styles from './menu-categories-home.module.css';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string;
  image_url?: string | null;
  sort_order: number;
  items: MenuItem[];
}

interface CuratedCategory {
  description: string;
  emoji: string;
  gradient: [string, string];
}

const CURATED: Record<string, CuratedCategory> = {
  breakfast: { description: 'Served from 07:30 AM', emoji: '🍳', gradient: ['#ffd37a', '#ffb86b'] },
  'south indian special': { description: 'Traditional South Indian delicacies', emoji: '🥞', gradient: ['#a8e6b5', '#7fd6c2'] },
  beverages: { description: 'Hot drinks, shakes & refreshing beverages', emoji: '☕', gradient: ['#f2c9a0', '#e8a97e'] },
  mocktails: { description: 'Handcrafted signature mocktails', emoji: '🍹', gradient: ['#ffb3cf', '#ff8fb8'] },
  snacks: { description: 'Quick bites and crunchy snacks', emoji: '🍟', gradient: ['#ffb0a0', '#ff8f8f'] },
  'soup kettle': { description: 'Warm, comforting and delicious soups', emoji: '🥣', gradient: ['#ffc98a', '#ffa86b'] },
  'chinese favourites': { description: 'Indo-Chinese starters, noodles & rice', emoji: '🥡', gradient: ['#ff9e9e', '#ff7f8a'] },
  'tandoori nazrane': { description: 'Clay-oven grilled appetizers & kebabs', emoji: '🍢', gradient: ['#ffb38a', '#ff9a76'] },
  'salads & raita': { description: 'Fresh accompaniments & yogurt bowls', emoji: '🥗', gradient: ['#c5ec8f', '#9fe08a'] },
  'bahar-e-basmati': { description: 'Fragrant aromatic Basmati rice preparations & biryanis', emoji: '🍚', gradient: ['#f7e08a', '#f2c66b'] },
  'paneer & vegetables': { description: 'Main course North Indian curries and gravies', emoji: '🧀', gradient: ['#ffbf9b', '#f5a08a'] },
  'indian breads': { description: 'Fresh tandoor and tawa baked breads', emoji: '🫓', gradient: ['#e6cfa0', '#d9b98a'] },
  'desserts & ice creams': { description: 'Sweet treats, halwas and premium ice creams', emoji: '🍨', gradient: ['#d4b8ff', '#b9a0f5'] },
  thali: { description: 'Complete wholesome meal platters', emoji: '🍱', gradient: ['#9fd4ff', '#7fb8ff'] },
};

const FALLBACK_GRADIENTS: Array<[string, string]> = [
  ['#ffd37a', '#ffb86b'],
  ['#a8e6b5', '#7fd6c2'],
  ['#ffb3cf', '#ff8fb8'],
  ['#ffc98a', '#ffa86b'],
  ['#c5ec8f', '#9fe08a'],
  ['#d4b8ff', '#b9a0f5'],
  ['#9fd4ff', '#7fb8ff'],
];

const MENU_CACHE_KEY = 'ka_menu_cache_v1';

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getCurated(name: string, index: number): CuratedCategory {
  return (
    CURATED[name.trim().toLowerCase()] || {
      description: '',
      emoji: '🍽️',
      gradient: FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length],
    }
  );
}

export default function MenuCategoriesHome({ fontClassName = '' }: { fontClassName?: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let hasCached = false;

    // Instant paint from the last successful menu payload.
    try {
      const cached = localStorage.getItem(MENU_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.categories) && parsed.categories.length > 0) {
          setCategories(parsed.categories);
          setLoading(false);
          hasCached = true;
        }
      }
    } catch {
      // Ignore malformed cache
    }

    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch('/api/menu', { signal: controller.signal });
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.categories)) {
          setCategories(data.categories);
          try {
            localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(data));
          } catch {
            // Ignore quota errors
          }
        }
      } catch {
        // Keep cached/empty state if the network is unavailable
      } finally {
        if (!cancelled && !hasCached) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const totalDishes = useMemo(
    () => categories.reduce((sum, category) => sum + (category.items?.length || 0), 0),
    [categories]
  );

  return (
    <div className={`${styles.page} ${fontClassName}`}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Our Menu</h1>
            <p className={styles.sub}>
              {categories.length} categories · {totalDishes} dishes
            </p>
          </div>
          <ThemeToggle className="bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-300" />
        </div>
      </header>

      <main className={styles.main}>
        {loading && categories.length === 0 && (
          <div className={styles.grid} aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className={styles.skeleton} />
            ))}
          </div>
        )}

        {!loading && categories.length === 0 && (
          <div className={styles.empty}>No categories available.</div>
        )}

        <div className={styles.grid}>
          {categories.map((category, index) => {
            const curated = getCurated(category.name, index);
            const description = curated.description || category.description || 'Pure veg delicacies';
            const itemCount = category.items?.length || 0;

            return (
              <Link
                key={category.id}
                href={`/menu?cat=${encodeURIComponent(category.id)}`}
                prefetch={false}
                className={styles.card}
                aria-label={`${category.name}, ${itemCount} dishes`}
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,.35),rgba(255,255,255,.35)), linear-gradient(135deg,${hexToRgba(curated.gradient[0], 0.5)},${hexToRgba(curated.gradient[1], 0.5)})`,
                }}
              >
                <span className={styles.blob} aria-hidden="true" />
                <div className={styles.cardTop}>
                  <span className={styles.emo} aria-hidden="true">
                    {curated.emoji}
                  </span>
                  <span className={styles.pill}>{itemCount} Dishes</span>
                </div>
                <div className={styles.cardBody}>
                  <h2>{category.name}</h2>
                  <p>{description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <BottomNav activeTab="home" />
    </div>
  );
}
