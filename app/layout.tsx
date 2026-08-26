import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PwaProvider } from '@/components/pwa-install-banner';

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
        <PwaProvider>
          {children}
        </PwaProvider>
      </body>
    </html>
  );
}