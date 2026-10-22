'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { OfferBanner, DEFAULT_OFFER_BANNERS, BANNERS_STORAGE_KEY } from '@/lib/banners';

interface Props {
  onSelectCategory?: (categoryQuery: string) => void;
}

export default function OfferCarousel({ onSelectCategory }: Props) {
  const [banners, setBanners] = useState<OfferBanner[]>(DEFAULT_OFFER_BANNERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Load banners from API & localStorage cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem(BANNERS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBanners(parsed);
        }
      }
    } catch {
      // Ignore cache error
    }

    async function fetchBanners() {
      try {
        const res = await fetch('/api/banners');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.banners) && data.banners.length > 0) {
            setBanners(data.banners);
            try {
              localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(data.banners));
            } catch {
              // Ignore
            }
          }
        }
      } catch {
        // Fallback to default
      }
    }
    fetchBanners();

    // Listen to admin banner updates event
    const handleUpdate = () => fetchBanners();
    window.addEventListener('offer_banners_updated', handleUpdate);
    return () => window.removeEventListener('offer_banners_updated', handleUpdate);
  }, []);

  const total = banners.length;

  // Auto-slide running timer
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 4000);

    return () => clearInterval(interval);
  }, [total, isPaused]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // swipe left -> next
        setCurrentIndex((prev) => (prev + 1) % total);
      } else {
        // swipe right -> prev
        setCurrentIndex((prev) => (prev - 1 + total) % total);
      }
    }
    touchStartX.current = null;
    setIsPaused(false);
  };

  if (total === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-sm border border-gray-100 bg-white"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides Container */}
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner, index) => {
          return (
            <div
              key={banner.id || index}
              className="w-full shrink-0 relative aspect-[21/9] sm:aspect-[24/9] bg-gray-900 overflow-hidden"
            >
              <Image
                src={banner.image_url}
                alt={banner.title}
                fill
                priority={index === 0}
                className="object-cover opacity-85 hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 480px) 100vw, 480px"
                unoptimized={banner.image_url.startsWith('http')}
              />

              {/* Gradient Scrim Overlay for crisp contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-3.5 sm:p-4 text-white">
                <div className="space-y-1">
                  {banner.badge && (
                    <span className="inline-block bg-[#2E5026] text-white text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs tracking-wider border border-white/20">
                      {banner.badge}
                    </span>
                  )}
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight drop-shadow-xs line-clamp-1">
                    {banner.title}
                  </h3>
                  {banner.subtitle && (
                    <p className="text-[10px] sm:text-xs text-gray-200 line-clamp-1 font-normal opacity-95">
                      {banner.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prev / Next Chevrons (discreet on mobile, clear on hover) */}
      {total > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + total) % total)}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center text-xs backdrop-blur-xs transition-colors cursor-pointer"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % total)}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center text-xs backdrop-blur-xs transition-colors cursor-pointer"
          >
            ›
          </button>
        </>
      )}

      {/* Slide Indicators (Dots + Counter) */}
      <div className="absolute bottom-2 right-3 flex items-center gap-1.5 z-10 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`transition-all rounded-full ${
              currentIndex === i ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
