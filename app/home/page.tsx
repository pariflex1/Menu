import type { Metadata } from 'next';
import MenuCategoriesHome from '@/components/menu-categories-home';

export const metadata: Metadata = {
  title: 'Menu Categories | Krishna Anandam',
  description: 'Browse every category on the Krishna Anandam menu and jump straight to the dishes you want.',
};

export default function HomePage() {
  return <MenuCategoriesHome />;
}
