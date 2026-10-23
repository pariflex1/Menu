'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { OfferBanner, DEFAULT_OFFER_BANNERS, BANNERS_STORAGE_KEY } from '@/lib/banners';
import BottomNav from '@/components/bottom-nav';
import ThemeToggle from '@/components/theme-toggle';
import { useBucket } from '@/lib/hooks/use-bucket';

export default function ReelCarousel() {
  const { totalItemCount } = useBucket();
  const [banners, setBanners] = useState<OfferBanner[]>(DEFAULT_OFFER_BANNERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch fresh banners from the API; only use the cache if the network fails
  useEffect(() => {
    async function fetchBanners() {
      try {
        const res = await fetch('/api/banners', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load banners');
        const data = await res.json();
        if (Array.isArray(data.banners) && data.banners.length > 0) {
          setBanners(data.banners);
          try {
            localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(data.banners));
          } catch {
            // Ignore
          }
          return;
        }
      } catch {
        // Fall through to cache
      }

      try {
        const cached = localStorage.getItem(BANNERS_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setBanners(parsed);
        }
      } catch {
        // Ignore cache error
      }
    }

    fetchBanners();

    const handleUpdate = () => fetchBanners();
    window.addEventListener('offer_banners_updated', handleUpdate);
    return () => window.removeEventListener('offer_banners_updated', handleUpdate);
  }, []);

  const total = banners.length;

  const handleNext = () => {
    if (total > 0) setCurrentIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = () => {
    if (total > 0) setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  // Auto-run continuous loop: advances every 4.5 seconds unless paused by user interaction
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 4500);

    return () => clearInterval(interval);
  }, [total, isPaused]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [total]);

  // Touch Swipe for mobile reels
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartY.current = null;
    // Resume auto-loop after 5s
    setTimeout(() => setIsPaused(false), 5000);
  };

  // Wheel scroll debounce for trackpad/mouse
  const lastWheelTime = useRef(0);
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 400) return;
    if (Math.abs(e.deltaY) > 25) {
      lastWheelTime.current = now;
      if (e.deltaY > 0) handleNext();
      else handlePrev();
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: banners[currentIndex]?.title || 'Special Offer - Krishna Anandam',
      text: banners[currentIndex]?.subtitle || 'Check out this exclusive pure vegetarian offer!',
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (total === 0) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#FCFCFC] text-gray-800">
        No active offers.
      </div>
    );
  }

  const bottomPadding = totalItemCount > 0 ? 'pb-[10.5rem]' : 'pb-[7.5rem]';

  return (
    <div className="min-h-dvh w-full bg-black flex justify-center">
      <div
        ref={containerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative w-full max-w-[480px] h-dvh bg-black overflow-hidden select-none touch-none flex flex-col justify-between"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* ─── Reel Story Progress Bars (Top) ─── */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5 pointer-events-none">
          {banners.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full overflow-hidden bg-white/40"
            >
              <div
                className={`h-full transition-all duration-300 ${
                  i === currentIndex
                    ? 'bg-white w-full'
                    : i < currentIndex
                    ? 'bg-white/90 w-full'
                    : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>

        {/* ─── Top Floating Header with subtle top shade ─── */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20" />
        <header className="absolute top-5 left-0 right-0 z-30 px-3.5 py-1.5 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-normal tracking-wide uppercase">Reels Deals</span>
          </div>

          <ThemeToggle className="bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/20 text-white" />
        </header>

        {/* ─── Reel Slides Container (Vertical Reel Transition) ─── */}
        <div
          className="w-full h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateY(-${currentIndex * 100}%)` }}
        >
          {banners.map((banner, index) => {
            return (
              <div
                key={banner.id || index}
                className="relative w-full h-full flex flex-col justify-between overflow-hidden shrink-0"
              >
                {/* Full Bleed Image: 100% CLEAR and vivid, NO overall dark tint */}
                <div className="absolute inset-0">
                  <Image
                    src={banner.image_url}
                    alt={banner.title}
                    fill
                    priority={index === 0 || index === 1}
                    className="object-cover opacity-100 scale-100 transition-transform duration-1000"
                    sizes="(max-width: 480px) 100vw, 480px"
                    unoptimized={banner.image_url.startsWith('http') || banner.image_url.startsWith('/uploads')}
                  />
                  {/* Overlay ONLY on bottom side so text is clear while main image is fully bright */}
                  <div className="absolute bottom-0 left-0 right-0 h-[52%] bg-gradient-to-t from-black/95 via-black/75 via-40% to-transparent pointer-events-none" />
                </div>

                {/* Top spacer */}
                <div className="h-28" />

                {/* Bottom Reel Content Overlay */}
                <div className={`relative z-10 px-5 ${bottomPadding} w-full text-white space-y-2.5`}>
                  {/* Badge */}
                  {banner.badge && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-[#05C12F] text-white text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-white/20 shadow-md">
                        <Flame className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                        <span>{banner.badge}</span>
                      </span>
                      <span className="text-[10px] font-normal text-emerald-300 bg-black/50 px-2 py-0.5 rounded-full border border-white/15">
                        {index + 1} of {total}
                      </span>
                    </div>
                  )}

                  {/* Offer Title */}
                  <h1 className="text-2xl font-bold leading-tight drop-shadow-md text-white">
                    {banner.title}
                  </h1>

                  {/* Subtitle / Description */}
                  {banner.subtitle && (
                    <p className="text-sm font-normal text-gray-200 leading-relaxed drop-shadow-sm line-clamp-2">
                      {banner.subtitle}
                    </p>
                  )}

                  {/* Action CTA Button */}
                  <div className="pt-1.5 flex items-center gap-2.5">
                    <Link
                      href={banner.link_url || '/'}
                      className="flex-1 bg-[#05C12F] hover:bg-[#04A328] active:bg-[#038723] text-white font-semibold py-3 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#05C12F]/40 transition-all border border-white/20 cursor-pointer text-sm"
                    >
                      <span>Order Now & Claim</span>
                      <span>→</span>
                    </Link>

                    <button
                      onClick={handleShare}
                      aria-label="Share offer"
                      className="w-11 h-11 rounded-2xl bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md text-white flex items-center justify-center text-lg transition-all border border-white/20 cursor-pointer shrink-0"
                    >
                      {copied ? '✓' : '↗'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Right Side Reel Vertical Chevrons ─── */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2">
          <button
            onClick={handlePrev}
            aria-label="Previous reel"
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 text-sm transition-colors cursor-pointer"
          >
            ▲
          </button>

          <div className="flex flex-col items-center gap-1 py-1">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Jump to reel ${i + 1}`}
                className={`rounded-full transition-all cursor-pointer ${
                  currentIndex === i
                    ? 'w-2 h-5 bg-white shadow-lg'
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            aria-label="Next reel"
            className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 text-sm transition-colors cursor-pointer"
          >
            ▼
          </button>
        </div>

        {/* ─── Contained Bottom Navigation Dock inside the mobile frame ─── */}
        <BottomNav activeTab="offer" />
      </div>
    </div>
  );
}
