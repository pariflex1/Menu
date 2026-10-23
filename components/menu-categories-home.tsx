'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

const CARD_HEIGHT = 150;

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

  const headerRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const metaRef = useRef<Array<{ y: number; h: number }>>([]);
  const tickRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/menu?refresh=true', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      } catch {
        // Leave the empty state visible if the menu cannot be loaded
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(() => {
    tickRef.current = false;
    const stickyBottom = (headerRef.current?.getBoundingClientRect().bottom ?? 0) + 8;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;

    itemRefs.current.forEach((el, index) => {
      if (!el) return;
      const meta = metaRef.current[index] ?? { y: 0, h: CARD_HEIGHT };
      const h = meta.h || CARD_HEIGHT;
      const top = meta.y - scrollY;

      const leaving = Math.min(Math.max((stickyBottom - top) / h, 0), 1.4);
      const entering = Math.min(
        Math.max((top - (viewportHeight - h * 1.2)) / (h * 1.2), 0),
        1
      );
      const dd = Math.min(leaving, 1);

      const scale = 1 - 0.09 * dd - 0.05 * entering;
      const translateY = leaving * h * 0.55 + entering * 44;
      const rotateX = dd * 24;
      const opacity = Math.min(Math.max(1 - 0.9 * dd - 0.55 * entering, 0), 1);

      el.style.transform = `translate3d(0,${translateY.toFixed(1)}px,0) rotateX(${rotateX.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      el.style.opacity = opacity.toFixed(2);
      el.style.pointerEvents = opacity < 0.3 ? 'none' : '';

      const emoji = el.querySelector<HTMLElement>('[data-emoji]');
      if (emoji) {
        emoji.style.transform = `rotate(${(-12 + dd * 10 - entering * 14).toFixed(1)}deg) translateY(${(-dd * 14 + entering * 22).toFixed(1)}px)`;
      }
    });
  }, []);

  const measure = useCallback(() => {
    itemRefs.current.forEach((el) => {
      if (el) el.style.transform = 'none';
    });

    metaRef.current = itemRefs.current.map((el) => {
      if (!el) return { y: 0, h: CARD_HEIGHT };
      const rect = el.getBoundingClientRect();
      return { y: rect.top + window.scrollY, h: el.offsetHeight };
    });

    update();
  }, [update]);

  useEffect(() => {
    const raf = requestAnimationFrame(measure);
    const timeout = setTimeout(measure, 150);
    const fonts = document.fonts?.ready;
    if (fonts) fonts.then(measure).catch(() => undefined);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [measure, categories]);

  useEffect(() => {
    const onScroll = () => {
      if (!tickRef.current) {
        tickRef.current = true;
        requestAnimationFrame(update);
      }
    };
    const onResize = () => measure();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [measure, update]);

  return (
    <div className={`${styles.page} ${fontClassName}`}>
      <header ref={headerRef} className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Our Menu</h1>
            <p className={styles.sub}>{categories.length} categories</p>
          </div>
          <ThemeToggle className="bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-300" />
        </div>
      </header>

      <main className={styles.main}>
        {loading && categories.length === 0 && (
          <div aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className={styles.wrap} style={{ zIndex: index + 1 }}>
                <div className={styles.skeleton} />
              </div>
            ))}
          </div>
        )}

        {!loading && categories.length === 0 && (
          <div className={styles.empty}>No categories available.</div>
        )}

        <div>
          {categories.map((category, index) => {
            const curated = getCurated(category.name, index);
            const description = curated.description || category.description || category.name;
            const itemCount = category.items?.length || 0;

            return (
              <div
                key={category.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                className={styles.wrap}
                style={{ zIndex: index + 1 }}
              >
                <Link
                  href={`/menu?cat=${encodeURIComponent(category.id)}`}
                  className={styles.card}
                  aria-label={`${category.name}, ${itemCount} dishes`}
                  style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,.3),rgba(255,255,255,.3)), linear-gradient(135deg,${hexToRgba(curated.gradient[0], 0.45)},${hexToRgba(curated.gradient[1], 0.45)})`,
                  }}
                >
                  <span className={styles.blob} />
                  <div className={styles.txt}>
                    <h2>{category.name.toUpperCase()}</h2>
                    <span className={styles.pill}>{itemCount} Dishes</span>
                    <p>{description}</p>
                  </div>
                  <span className={styles.emo} data-emoji>
                    {curated.emoji}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </main>

      <BottomNav activeTab="home" />
    </div>
  );
}
