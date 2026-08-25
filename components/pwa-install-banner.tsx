'use client';

import { useState, useEffect, createContext, useContext } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaContextType {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  triggerInstall: () => Promise<void>;
}

const PwaContext = createContext<PwaContextType>({
  canInstall: false,
  isInstalled: false,
  isIOS: false,
  triggerInstall: async () => {},
});

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // 1. Check if running in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      try {
        localStorage.setItem('pwa_installed', 'true');
      } catch {}
      return;
    }

    // 2. Check localStorage
    try {
      if (localStorage.getItem('pwa_installed') === 'true') {
        setIsInstalled(true);
        return;
      }
    } catch {}

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);
    if (isIosDevice && isSafari) {
      setIsIOS(true);
    }

    // 4. Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 5. Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem('pwa_installed', 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (isInstalled) return;

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          try {
            localStorage.setItem('pwa_installed', 'true');
          } catch {}
        }
        setDeferredPrompt(null);
        return;
      } catch {
        // Fallback to guide modal
      }
    }

    setShowGuideModal(true);
  };

  return (
    <PwaContext.Provider
      value={{
        canInstall: !isInstalled,
        isInstalled,
        isIOS,
        triggerInstall,
      }}
    >
      {children}

      {/* Installation Guide Modal (For iOS and browsers where prompt was not auto-triggered) */}
      {showGuideModal && !isInstalled && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white text-gray-900 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00B14F] text-white flex items-center justify-center font-black text-xs">
                  KA
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 leading-tight">
                    Install Krishna Anandam
                  </h3>
                  <p className="text-[11px] text-gray-500">Fast app on your home screen</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isIOS ? (
              /* iOS Safari Steps */
              <div className="space-y-3">
                <p className="text-xs text-gray-600">
                  Follow these 3 simple steps to add to your iPhone/iPad Home Screen:
                </p>
                <ol className="space-y-2.5 text-xs text-gray-700 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00B14F] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      1
                    </span>
                    <span>
                      Tap the <strong>Share</strong> button (
                      <span className="inline-block text-sm leading-none">⎋</span>
                      ) in Safari
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00B14F] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      2
                    </span>
                    <span>
                      Scroll and tap <strong>Add to Home Screen</strong> (➕)
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00B14F] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      3
                    </span>
                    <span>
                      Tap <strong>Add</strong> at top right corner
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              /* Android / Chrome / Edge Steps */
              <div className="space-y-3">
                <p className="text-xs text-gray-600">
                  To install the app directly on your phone or desktop:
                </p>
                <ol className="space-y-2.5 text-xs text-gray-700 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00B14F] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      1
                    </span>
                    <span>
                      Tap browser menu (<strong>⋮</strong> or <strong>⋯</strong>) in top right
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00B14F] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      2
                    </span>
                    <span>
                      Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>
                    </span>
                  </li>
                </ol>
              </div>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full bg-[#00B14F] hover:bg-[#009b45] text-white font-extrabold text-xs py-3 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Got it, Close
            </button>
          </div>
        </div>
      )}
    </PwaContext.Provider>
  );
}

export function usePwaInstall() {
  return useContext(PwaContext);
}

/**
 * Top Sticky PWA Install Banner
 * Always visible at the very top of the screen when not installed.
 * Disappears permanently as soon as the user installs the PWA.
 */
export default function PwaInstallBanner() {
  const { canInstall, triggerInstall } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-gray-900 via-slate-900 to-emerald-950 text-white px-3 py-2 border-b border-emerald-800/40 shadow-sm">
      <div className="max-w-[480px] mx-auto flex items-center justify-between gap-2.5">
        {/* App Icon + Tagline */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#00B14F] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs border border-white/20">
            KA
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-xs leading-tight text-white truncate">
              Krishna Anandam App
            </p>
            <p className="text-[10px] text-emerald-300 leading-tight truncate">
              Install for instant ordering & faster speed
            </p>
          </div>
        </div>

        {/* High-visibility Install Button */}
        <button
          onClick={triggerInstall}
          className="bg-[#00B14F] hover:bg-[#009b45] active:scale-95 text-white font-black text-xs px-3.5 py-1.5 rounded-full shadow-md shadow-[#00B14F]/30 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer animate-pulse"
        >
          <span>📲</span>
          <span>Install App</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Compact Header Install Button
 * Can be placed directly inside any header bar (e.g. next to search or title)
 */
export function PwaHeaderButton() {
  const { canInstall, triggerInstall } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <button
      onClick={triggerInstall}
      aria-label="Install App"
      className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-2.5 py-1.5 rounded-full text-[11px] font-black transition-all press-scale shrink-0 cursor-pointer shadow-2xs"
    >
      <span>📲</span>
      <span className="hidden xs:inline">Install</span>
    </button>
  );
}
