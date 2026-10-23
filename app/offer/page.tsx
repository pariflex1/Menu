import ReelCarousel from '@/components/reel-carousel';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exclusive Offers & Deals | Krishna Anandam',
  description: 'Explore full-screen offer reels and daily discounts on pure vegetarian delicacies at Krishna Anandam Vrindavan.',
};

export default function OfferPage() {
  return <ReelCarousel />;
}
