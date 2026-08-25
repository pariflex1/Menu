'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      localStorage.setItem('pwa_installed', 'true');
      return;
    }

    // 2. Check if user already installed or previously dismissed
    const isInstalled = localStorage.getItem('pwa_installed') === 'true';
    if (isInstalled) {
      return;
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);

    if (isIosDevice && isSafari) {
      setIsIOS(true);
      const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
      if (!isDismissed) {
        setIsVisible(true);
      }
    }

    // 4. Listen for beforeinstallprompt (Chrome / Android / Edge / Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    // 5. Listen for app installed event
    const handleAppInstalled = () => {
      setIsVisible(false);
      localStorage.setItem('pwa_installed', 'true');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback if prompt was not captured yet
      alert("To install, tap your browser's menu (⋮ or Share) and select 'Install app' or 'Add to Home screen'.");
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true');
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Sticky Top PWA Install Banner */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-gray-900 via-slate-900 to-emerald-950 text-white px-3 py-2 border-b border-emerald-900/50 shadow-md">
        <div className="max-w-[480px] mx-auto flex items-center justify-between gap-2.5">
          {/* App Icon + Text */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#00B14F] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs border border-white/20">
              KA
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-xs leading-tight text-white truncate">
                Krishna Anandam App
              </p>
              <p className="text-[10px] text-emerald-200 leading-tight truncate">
                Instant ordering & live dish tracking
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-[#00B14F] hover:bg-[#009b45] active:scale-95 text-white font-black text-[11px] px-3 py-1.5 rounded-full shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>+</span>
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss install banner"
              className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white text-xs transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari "Add to Home Screen" Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white text-gray-900 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📲</span>
                <h3 className="font-black text-sm">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              To install the Krishna Anandam app on your home screen:
            </p>

            <ol className="space-y-2.5 text-xs text-gray-700 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00B14F] text-white flex items-center justify-center font-bold text-[10px]">
                  1
                </span>
                <span>
                  Tap the <strong>Share</strong> icon (
                  <span className="inline-block text-base leading-none">⎋</span>
                  ) in Safari toolbar
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00B14F] text-white flex items-center justify-center font-bold text-[10px]">
                  2
                </span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong> (➕)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00B14F] text-white flex items-center justify-center font-bold text-[10px]">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> at the top right corner
                </span>
              </li>
            </ol>

            <button
              onClick={() => {
                setShowIOSModal(false);
                setIsVisible(false);
                sessionStorage.setItem('pwa_banner_dismissed', 'true');
              }}
              className="w-full bg-[#00B14F] text-white font-bold text-xs py-2.5 rounded-xl shadow-xs"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
