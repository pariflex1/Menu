import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Krishna Anandam — Pure Veg Restaurant',
    short_name: 'Krishna Anandam',
    description: '100% Pure Vegetarian Restaurant Menu & QR Ordering, Vrindavan',
    start_url: '/menu',
    id: '/menu',
    scope: '/',
    display: 'standalone',
    background_color: '#F7F9F8',
    theme_color: '#00B14F',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
