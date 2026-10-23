import MenuPageClient from '@/components/menu-page-client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Krishna Anandam — Full Menu',
  description: 'Pure vegetarian restaurant menu with instant ordering.',
};

export default function MenuPage() {
  return <MenuPageClient />;
}
