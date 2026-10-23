import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import MenuCategoriesHome from '@/components/menu-categories-home';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Menu Categories | Krishna Anandam',
  description: 'Browse every category on the Krishna Anandam menu and jump straight to the dishes you want.',
};

export default function HomePage() {
  return <MenuCategoriesHome fontClassName={jakarta.variable} />;
}
