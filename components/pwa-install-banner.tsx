'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import Image from 'next/image';
import { Download, Smartphone, Check, Share, Plus, Home } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null;
    __pwaPromptReady?: boolean;
  }
}

type ManualGuide = 'ios' | 'mac' | null;

interface PwaContextType {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  triggerInstall: () => Promise<boolean>;
}

const PwaContext = createContext<PwaContextType>({
  canInstall: false,
  isInstalled: false,
  isIOS: false,
  triggerInstall: async () => false,
});

function readStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  } catch {
    return false;
  }
}

function detectPlatform() {
  const ua = window.navigator.userAgent.toLowerCase();
  const maxTouchPoints = window.navigator.maxTouchPoints || 0;
  const isIpadOs = window.navigator.platform === 'MacIntel' && maxTouchPoints > 1;
  const isIOS = /iphone|ipad|ipod/.test(ua) || isIpadOs;
  const isMacSafari =
    !isIOS &&
    /macintosh/.test(ua) &&
    /safari/.test(ua) &&
    !/chrome|chromium|crios|fxios|edg|firefox|opr/.test(ua);
  return { isIOS, isMacSafari };
}

async function waitForPrompt(timeoutMs = 1500): Promise<BeforeInstallPromptEvent | null> {
  if (window.__deferredPwaPrompt) return window.__deferredPwaPrompt;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: BeforeInstallPromptEvent | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('pwa-prompt-ready', onReady);
      clearTimeout(timer);
      resolve(value);
    };
    const onReady = () => finish(window.__deferredPwaPrompt || null);
    const timer = setTimeout(() => finish(window.__deferredPwaPrompt || null), timeoutMs);
    window.addEventListener('pwa-prompt-ready', onReady);
  });
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMacSafari, setIsMacSafari] = useState(false);
  const [guide, setGuide] = useState<ManualGuide>(null);

  const markInstalled = useCallback(() => {
    setIsInstalled(true);
    setDeferredPrompt(null);
    setGuide(null);
    window.__deferredPwaPrompt = null;
    try {
      localStorage.setItem('pwa_installed', 'true');
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    // 1. Already running as an installed app? Hide install UI immediately.
    if (readStandalone()) {
      markInstalled();
      return;
    }

    // 2. Previously installed on this device.
    try {
      if (localStorage.getItem('pwa_installed') === 'true') {
        setIsInstalled(true);
      }
    } catch {
      // ignore storage errors
    }

    // 3. Detect platforms that need a manual "Add to Home Screen / Dock" flow.
    const platform = detectPlatform();
    setIsIOS(platform.isIOS);
    setIsMacSafari(platform.isMacSafari);

    // 4. Pick up a prompt captured before React hydrated (inline script in layout).
    if (window.__deferredPwaPrompt) {
      setDeferredPrompt(window.__deferredPwaPrompt);
    }
    const syncPrompt = () => {
      if (window.__deferredPwaPrompt) setDeferredPrompt(window.__deferredPwaPrompt);
    };
    window.addEventListener('pwa-prompt-ready', syncPrompt);

    // 5. Also capture the prompt directly in case it fires later.
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__deferredPwaPrompt = promptEvent;
      window.__pwaPromptReady = true;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => markInstalled();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && readStandalone()) markInstalled();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    document.addEventListener('visibilitychange', handleVisibility);

    // 6. Register the service worker (required for installability on most browsers).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // installation will still work where the browser allows it
      });
    }

    return () => {
      window.removeEventListener('pwa-prompt-ready', syncPrompt);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [markInstalled]);

  const triggerInstall = useCallback(async (): Promise<boolean> => {
    if (isInstalled) return true;

    // Android, Windows, macOS Chrome/Edge, Samsung Internet: native one-tap install.
    const promptEvent = deferredPrompt || (await waitForPrompt());
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        window.__deferredPwaPrompt = null;
        setDeferredPrompt(null);
        if (choice.outcome === 'accepted') {
          markInstalled();
          return true;
        }
        return false;
      } catch {
        // Fall through to the platform guide below.
      }
    }

    // iOS Safari and macOS Safari do not expose an install API.
    if (isIOS) {
      setGuide('ios');
      return false;
    }
    if (isMacSafari) {
      setGuide('mac');
      return false;
    }

    return false;
  }, [deferredPrompt, isInstalled, isIOS, isMacSafari, markInstalled]);

  const canInstall = !isInstalled && (!!deferredPrompt || isIOS || isMacSafari);

  return (
    <PwaContext.Provider value={{ canInstall, isInstalled, isIOS, triggerInstall }}>
      {children}

      {guide && !isInstalled && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-300 dark:bg-neutral-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white border border-gray-200 shrink-0 shadow-sm">
                <Image
                  src="https://krishnaanandam.in/wp-content/uploads/2026/08/Hotel-Krsihna-Anandam-Logo.webp"
                  alt="Krishna Anandam"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <div>
                <h3 className="font-black text-base text-gray-900 leading-tight dark:text-gray-100">
                  {guide === 'ios' ? 'Add to Home Screen' : 'Add to Dock'}
                </h3>
                <p className="text-xs text-gray-500 font-normal mt-0.5 dark:text-gray-400">
                  {guide === 'ios'
                    ? 'Install the Krishna Anandam app on your iPhone or iPad'
                    : 'Install the Krishna Anandam app on your Mac'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(guide === 'ios'
                ? [
                    { step: 1, Icon: Share, title: 'Tap Share', desc: 'in the Safari toolbar' },
                    { step: 2, Icon: Plus, title: 'Choose Add to Home Screen', desc: 'from the share menu' },
                    { step: 3, Icon: Check, title: 'Tap Add', desc: 'to install the app' },
                  ]
                : [
                    { step: 1, Icon: Share, title: 'Open the Share menu', desc: 'in Safari (or File > Add to Dock)' },
                    { step: 2, Icon: Plus, title: 'Choose Add to Dock', desc: 'from the menu' },
                    { step: 3, Icon: Home, title: 'Click Add', desc: 'to install the app' },
                  ]
              ).map(({ step, Icon, title, desc }) => (
                <div key={step} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100 dark:bg-neutral-800 dark:border-neutral-700">
                  <div className="w-9 h-9 rounded-xl bg-[#05C12F] text-white flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" strokeWidth={2.4} />
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-gray-100">{title}</strong> {desc}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={markInstalled}
              className="w-full bg-[#05C12F] hover:bg-[#04A328] text-white font-extrabold py-3.5 rounded-2xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {guide === 'ios' ? "I've Added to Home Screen" : "I've Added the App"}
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

export default function PwaInstallBanner() {
  const { canInstall, isInstalled, triggerInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  if (isInstalled || !canInstall) return null;

  const handleClick = async () => {
    setInstalling(true);
    await triggerInstall();
    setInstalling(false);
  };

  return (
    <div className="sticky top-0 z-[60] w-full bg-yellow-400 text-black px-3 py-2 shadow-md border-b border-yellow-500/70">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-white shrink-0 shadow-sm border border-black/10">
            <Image
              src="https://krishnaanandam.in/wp-content/uploads/2026/08/Hotel-Krsihna-Anandam-Logo.webp"
              alt="Krishna Anandam"
              width={32}
              height={32}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-xs leading-tight text-black truncate">Install Krishna Anandam App</p>
            <p className="text-[10px] text-black/70 leading-tight truncate font-semibold">
              Faster ordering &bull; Works offline
            </p>
          </div>
        </div>

        <button
          onClick={handleClick}
          disabled={installing}
          className="bg-black text-white font-extrabold text-xs px-4 py-1.5 rounded-full shadow-md hover:bg-neutral-800 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-70"
        >
          {installing ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{installing ? 'Installing...' : 'Install Now'}</span>
        </button>
      </div>
    </div>
  );
}

export function PwaHeaderButton({
  className = '',
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  const { canInstall, isInstalled, triggerInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  if (isInstalled || !canInstall) return null;

  const handleClick = async () => {
    setInstalling(true);
    await triggerInstall();
    setInstalling(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={installing}
      aria-label="Install App"
      className={`flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all press-scale shrink-0 cursor-pointer shadow-sm disabled:opacity-70 ${className}`}
    >
      {installing ? (
        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      {showText && <span>{installing ? '...' : 'Install'}</span>}
    </button>
  );
}

export function PwaAdminBanner() {
  const { canInstall, isInstalled, triggerInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  if (isInstalled || !canInstall) return null;

  const handleClick = async () => {
    setInstalling(true);
    await triggerInstall();
    setInstalling(false);
  };

  return (
    <div className="w-full bg-gradient-to-r from-emerald-700 via-[#05C12F] to-emerald-800 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl overflow-hidden bg-white shrink-0 border border-white/20">
          <Image
            src="https://krishnaanandam.in/wp-content/uploads/2026/08/Hotel-Krsihna-Anandam-Logo.webp"
            alt="App"
            width={32}
            height={32}
            className="w-full h-full object-cover"
            unoptimized
          />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight text-white truncate">Install Dashboard App</p>
          <p className="text-xs text-emerald-200 leading-tight truncate font-normal">
            One-tap access &bull; No browser needed
          </p>
        </div>
      </div>
      <button
        onClick={handleClick}
        disabled={installing}
        className="bg-white text-emerald-800 font-extrabold text-xs px-4 py-2 rounded-xl shadow hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-70"
      >
        {installing ? (
          <span className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Smartphone className="w-3.5 h-3.5" />
        )}
        <span>{installing ? 'Installing...' : 'Install App'}</span>
      </button>
    </div>
  );
}

export function PwaInstallButton({
  className = '',
  label = 'Install App',
  variant = 'default',
}: {
  className?: string;
  label?: string;
  variant?: 'default' | 'pill' | 'admin' | 'outline';
}) {
  const { canInstall, isInstalled, triggerInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);

  if (isInstalled || !canInstall) return null;

  const handleClick = async () => {
    setInstalling(true);
    await triggerInstall();
    setInstalling(false);
  };

  const baseProps = {
    onClick: handleClick,
    disabled: installing,
    className: '',
  };

  const icon = installing
    ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
    : <Download className="w-3.5 h-3.5" />;

  if (variant === 'pill') {
    return (
      <button {...baseProps}
        className={`flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-70 ${className}`}
      >
        {icon}
        <span>{installing ? 'Installing...' : label}</span>
      </button>
    );
  }

  if (variant === 'admin') {
    return (
      <button {...baseProps}
        className={`flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-70 ${className}`}
      >
        {icon}
        <span>{installing ? 'Installing...' : label}</span>
      </button>
    );
  }

  if (variant === 'outline') {
    return (
      <button {...baseProps}
        className={`flex items-center gap-1.5 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 active:scale-95 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer disabled:opacity-70 ${className}`}
      >
        {icon}
        <span>{installing ? 'Installing...' : label}</span>
      </button>
    );
  }

  return (
    <button {...baseProps}
      className={`flex items-center gap-1.5 bg-[#05C12F] hover:bg-[#04A328] active:scale-95 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-70 ${className}`}
    >
      {icon}
      <span>{installing ? 'Installing...' : label}</span>
    </button>
  );
}
