export interface OfferBanner {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  image_url: string;
  link_url?: string;
  is_active: boolean;
  sort_order: number;
}

export const DEFAULT_OFFER_BANNERS: OfferBanner[] = [
  {
    id: 'banner-1',
    title: 'Royal Delux Thali Feast',
    subtitle: 'Flat 20% OFF on authentic pure desi ghee platters',
    badge: '20% OFF',
    image_url: 'https://images.unsplash.com/photo-1589778655375-3e622a9fc91c?auto=format&fit=crop&w=1200&q=80',
    link_url: '/menu?cat=thali',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'banner-2',
    title: 'South Indian Morning Combo',
    subtitle: 'Crispy Butter Masala Dosa + Vrindavan Filter Coffee',
    badge: 'BREAKFAST SPECIAL',
    image_url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1200&q=80',
    link_url: '/menu?cat=south-indian',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'banner-3',
    title: 'Tandoori Sizzlers & Nazrane',
    subtitle: 'Clay-oven Paneer Tikka served sizzling hot with mint dip',
    badge: "CHEF'S SIGNATURE",
    image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=1200&q=80',
    link_url: '/menu?cat=tandoor',
    is_active: true,
    sort_order: 3,
  },
  {
    id: 'banner-4',
    title: 'Desi Chinese Sensation',
    subtitle: 'Chilli Paneer Gravy + Veg Hakka Noodles Combo deal',
    badge: 'SUPER SAVER',
    image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=1200&q=80',
    link_url: '/menu?cat=chinese',
    is_active: true,
    sort_order: 4,
  },
  {
    id: 'banner-5',
    title: 'Sweet Delights & Kulfi',
    subtitle: 'Buy 1 Get 1 on Kesar Badam Matka Kulfi & desserts',
    badge: 'BUY 1 GET 1',
    image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1200&q=80',
    link_url: '/menu?cat=desserts',
    is_active: true,
    sort_order: 5,
  },
  {
    id: 'banner-6',
    title: 'Special Mocktails & Shakes',
    subtitle: 'Beat the heat with refreshing mojitos, lassi & shakes',
    badge: 'COOL OFFERS',
    image_url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80',
    link_url: '/menu?cat=beverages',
    is_active: true,
    sort_order: 6,
  },
];

export const BANNERS_STORAGE_KEY = 'ka_offer_banners_v1';

let currentBanners: OfferBanner[] = [...DEFAULT_OFFER_BANNERS];

export function getGlobalBanners(): OfferBanner[] {
  return currentBanners;
}

export function setGlobalBanners(banners: OfferBanner[]) {
  currentBanners = banners;
}
