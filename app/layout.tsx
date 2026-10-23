import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import PwaInstallBanner, { PwaProvider } from '@/components/pwa-install-banner';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Krishna Anandam — Menu',
    template: '%s · Krishna Anandam',
  },
  description: 'Order food online at Krishna Anandam, Vrindavan. Browse our full menu and place your order.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Krishna Anandam',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Krishna Anandam',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#059669',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <Script
          id="user-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=window.location.pathname;if(p.indexOf('/login')===0||p.indexOf('/dashboard')===0)return;if(localStorage.getItem('ka_user_theme')==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){}})();`,
          }}
        />
        <Script
          id="pwa-prompt-capture"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){window.__deferredPwaPrompt=window.__deferredPwaPrompt||null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__deferredPwaPrompt=e;window.__pwaPromptReady=true;window.dispatchEvent(new Event('pwa-prompt-ready'));});})();`,
          }}
        />
        <ThemeProvider>
          <PwaProvider>
            <PwaInstallBanner />
            {children}
          </PwaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}