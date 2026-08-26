'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { StaffSession } from '@/lib/auth/session';
import QRCode from 'qrcode';
import Image from 'next/image';
import PwaInstallBanner, { PwaHeaderButton, PwaInstallButton } from '@/components/pwa-install-banner';

interface OrderItem {
  id: string;
  menu_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  addon_ids?: string[];
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  order_type: string;
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  tax: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  table_id?: string;
  room_id?: string;
  tables?: { table_number: string } | null;
  rooms?: { room_number: string } | null;
  order_items?: OrderItem[];
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  veg_type: string;
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
}

interface StaffMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'manager' | 'kitchen' | 'staff';
  created_at: string;
}

interface TableItem {
  id: string;
  table_number: string;
  capacity: number;
  status: string;
  qr_token: string;
}

interface RoomItem {
  id: string;
  room_number: string;
  floor: string | null;
  status: string;
  qr_token: string;
}

interface Props {
  session: StaffSession;
}

type SuperAdminTab = 'orders' | 'menu' | 'categories' | 'staff' | 'tables';

const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  new: [
    { label: 'Accept Order', next: 'accepted', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { label: 'Cancel', next: 'cancelled', color: 'bg-white hover:bg-red-50 text-red-600 border border-red-200' },
  ],
  accepted: [
    { label: 'Start Preparing', next: 'preparing', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
    { label: 'Cancel', next: 'cancelled', color: 'bg-white hover:bg-red-50 text-red-600 border border-red-200' },
  ],
  preparing: [
    { label: 'Mark Ready', next: 'ready', color: 'bg-purple-600 hover:bg-purple-700 text-white' },
    { label: 'Cancel', next: 'cancelled', color: 'bg-white hover:bg-red-50 text-red-600 border border-red-200' },
  ],
  ready: [
    { label: 'Mark Served', next: 'served', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { label: 'Complete', next: 'completed', color: 'bg-gray-900 hover:bg-black text-white' },
  ],
  served: [
    { label: 'Complete Order', next: 'completed', color: 'bg-gray-900 hover:bg-black text-white' },
  ],
  out_for_delivery: [
    { label: 'Delivered', next: 'delivered', color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  ],
  delivered: [
    { label: 'Close', next: 'completed', color: 'bg-gray-900 hover:bg-black text-white' },
  ],
};

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  new: { label: 'New Order', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  accepted: { label: 'Confirmed', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  preparing: { label: 'In Kitchen', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  ready: { label: 'Ready', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
  served: { label: 'Served', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  out_for_delivery: { label: 'Out for Delivery', bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700', dot: 'bg-sky-500' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  completed: { label: 'Completed', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function DashboardClient({ session }: Props) {
  const isSuperAdmin = session.role === 'owner' || session.role === 'manager';

  // Common orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState<'active' | 'all' | 'new' | 'preparing' | 'ready' | 'completed'>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | 'table' | 'room' | 'home'>('all');

  // Super Admin specific state
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('orders');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [qrViewMode, setQrViewMode] = useState<'tables' | 'rooms'>('tables');

  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');

  // Modals state
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<{
    name: string;
    subtitle: string;
    type: 'table' | 'room';
    url: string;
    qrDataUrl: string;
  } | null>(null);

  // Form states
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    category_id: '',
    price: '',
    description: '',
    image_url: '',
    veg_type: 'veg',
    is_featured: false,
  });

  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff' as 'owner' | 'manager' | 'kitchen' | 'staff',
  });

  const [newCatForm, setNewCatForm] = useState({
    name: '',
    description: '',
    sort_order: 1,
  });

  const [newTableForm, setNewTableForm] = useState({
    table_number: '',
    capacity: 4,
  });

  const [newRoomForm, setNewRoomForm] = useState({
    room_number: '',
    floor: '1st Floor',
  });

  // Live polling for orders every 3s
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Super Admin data
  useEffect(() => {
    if (isSuperAdmin) {
      fetchCategories();
      fetchMenuItems();
      fetchStaff();
      fetchTables();
      fetchRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  async function fetchOrders() {
    try {
      const res = await fetch(`/api/admin/orders?restaurant_id=${session.restaurantId}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch(`/api/admin/categories?restaurant_id=${session.restaurantId}`);
      const data = await res.json();
      if (res.ok && data.categories) {
        setCategories(data.categories);
        if (data.categories.length > 0 && !newItemForm.category_id) {
          setNewItemForm((prev) => ({ ...prev, category_id: data.categories[0].id }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch categories:', e);
    }
  }

  async function fetchMenuItems() {
    try {
      const res = await fetch('/api/admin/menu-items');
      const data = await res.json();
      if (res.ok && data.items) {
        setMenuItems(data.items);
      }
    } catch (e) {
      console.error('Failed to fetch menu items:', e);
    }
  }

  async function fetchStaff() {
    try {
      const res = await fetch('/api/admin/staff');
      const data = await res.json();
      if (res.ok && data.staff) {
        setStaffList(data.staff);
      }
    } catch (e) {
      console.error('Failed to fetch staff:', e);
    }
  }

  async function fetchTables() {
    try {
      const res = await fetch('/api/admin/tables');
      const data = await res.json();
      if (res.ok && data.tables) setTables(data.tables);
    } catch (e) {
      console.error('Failed to fetch tables:', e);
    }
  }

  async function fetchRooms() {
    try {
      const res = await fetch('/api/admin/rooms');
      const data = await res.json();
      if (res.ok && data.rooms) setRooms(data.rooms);
    } catch (e) {
      console.error('Failed to fetch rooms:', e);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update order status');
      }
    } catch {
      alert('Network error updating status');
    }
  }

  async function handleToggleAvailability(item: MenuItem) {
    const newStatus = !item.is_available;
    setMenuItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i))
    );
    try {
      await fetch(`/api/admin/menu-items/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: newStatus }),
      });
    } catch {
      fetchMenuItems();
    }
  }

  async function handleDeleteMenuItem(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/menu-items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMenuItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        alert('Failed to delete item');
      }
    } catch {
      alert('Network error');
    }
  }

  async function handleSaveNewItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemForm.name || !newItemForm.price || !newItemForm.category_id) {
      alert('Please fill all required fields');
      return;
    }
    try {
      const res = await fetch('/api/admin/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemForm.name.trim(),
          category_id: newItemForm.category_id,
          price: parseFloat(newItemForm.price),
          description: newItemForm.description.trim() || undefined,
          image_url: newItemForm.image_url.trim() || undefined,
          veg_type: newItemForm.veg_type,
          is_featured: newItemForm.is_featured,
          is_available: true,
          sort_order: 100,
        }),
      });
      if (res.ok) {
        setIsAddItemOpen(false);
        setNewItemForm({
          name: '',
          category_id: categories[0]?.id || '',
          price: '',
          description: '',
          image_url: '',
          veg_type: 'veg',
          is_featured: false,
        });
        fetchMenuItems();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add menu item');
      }
    } catch {
      alert('Network error');
    }
  }

  async function handleSaveEditItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/admin/menu-items/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingItem.name,
          category_id: editingItem.category_id,
          price: editingItem.price,
          description: editingItem.description,
          image_url: editingItem.image_url,
          veg_type: editingItem.veg_type,
          is_featured: editingItem.is_featured,
        }),
      });
      if (res.ok) {
        setEditingItem(null);
        fetchMenuItems();
      } else {
        alert('Failed to update menu item');
      }
    } catch {
      alert('Network error');
    }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaffForm),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddStaffOpen(false);
        setNewStaffForm({ name: '', email: '', phone: '', password: '', role: 'staff' });
        fetchStaff();
      } else {
        alert(data.error || 'Failed to create staff member');
      }
    } catch {
      alert('Network error');
    }
  }

  async function handleDeleteStaff(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStaffList((prev) => prev.filter((s) => s.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove staff');
      }
    } catch {
      alert('Network error');
    }
  }

  async function handleAddTable(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTableForm),
      });
      if (res.ok) {
        setIsAddTableOpen(false);
        setNewTableForm({ table_number: '', capacity: 4 });
        fetchTables();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create table');
      }
    } catch {
      alert('Network error');
    }
  }

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_number: newRoomForm.room_number.trim(),
          floor: newRoomForm.floor.trim() || undefined,
          status: 'available',
        }),
      });
      if (res.ok) {
        setIsAddRoomOpen(false);
        setNewRoomForm({ room_number: '', floor: '1st Floor' });
        fetchRooms();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add room');
      }
    } catch {
      alert('Network error');
    }
  }

  async function handleDeleteTable(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/tables/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTables((prev) => prev.filter((t) => t.id !== id));
      } else {
        alert('Failed to delete table');
      }
    } catch {
      alert('Network error');
    }
  }

  async function handleDeleteRoom(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/rooms/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRooms((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert('Failed to delete room');
      }
    } catch {
      alert('Network error');
    }
  }

  async function showQRModal(name: string, subtitle: string, type: 'table' | 'room', token: string) {
    const origin = window.location.origin;
    const url = `${origin}/q?t=${token}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: { dark: '#047857', light: '#ffffff' },
      });
      setSelectedQR({ name, subtitle, type, url, qrDataUrl });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (typeFilter !== 'all' && order.order_type !== typeFilter) return false;
      if (orderFilter === 'all') return true;
      if (orderFilter === 'active') return !['completed', 'delivered', 'cancelled'].includes(order.status);
      if (orderFilter === 'new') return order.status === 'new';
      if (orderFilter === 'preparing') return ['accepted', 'preparing'].includes(order.status);
      if (orderFilter === 'ready') return order.status === 'ready';
      if (orderFilter === 'completed') return ['completed', 'delivered', 'served'].includes(order.status);
      return true;
    });
  }, [orders, orderFilter, typeFilter]);

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCatFilter !== 'all' && item.category_id !== selectedCatFilter) return false;
      if (!menuSearch.trim()) return true;
      const q = menuSearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    });
  }, [menuItems, selectedCatFilter, menuSearch]);

  const activeOrdersCount = orders.filter((o) => !['completed', 'delivered', 'cancelled'].includes(o.status)).length;
  const newOrdersCount = orders.filter((o) => o.status === 'new').length;
  const todayRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // ══════════════════════════════════════════════════════════════
  // RENDER: STAFF VIEW (KITCHEN & STAFF ROLE)
  // ══════════════════════════════════════════════════════════════
  if (!isSuperAdmin) {
    return (
      <div className="min-h-dvh bg-gray-50/50 pb-20 font-sans">
        {/* PWA Install Banner */}
        <PwaInstallBanner />

        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200/80 px-4 py-3 shadow-2xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-white border border-gray-200/80 shrink-0 shadow-2xs">
                <Image
                  src="https://krishnaanandam.in/wp-content/uploads/2026/08/Hotel-Krsihna-Anandam-Logo.webp"
                  alt="Krishna Anandam"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900 leading-tight">Kitchen & Operations Hub</h1>
                <p className="text-[11px] text-gray-500 font-normal">{session.name} &bull; <span className="capitalize">{session.role}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PwaHeaderButton />
              <button
                onClick={handleLogout}
                className="text-xs font-medium text-gray-600 hover:text-red-600 bg-gray-50 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Status filter bar */}
          <div className="max-w-4xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 pb-1">
            {(['active', 'new', 'preparing', 'ready', 'all'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setOrderFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all shrink-0 ${
                  orderFilter === st
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                }`}
              >
                {st === 'active' ? `Active (${activeOrdersCount})` : st === 'new' ? `New (${newOrdersCount})` : st}
              </button>
            ))}
          </div>
        </header>

        {/* Live Orders List */}
        <main className="max-w-4xl mx-auto p-4 space-y-3.5">
          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-200/80 p-12 text-center space-y-2 mt-4 shadow-2xs">
              <div className="text-3xl">🍽️</div>
              <h3 className="text-sm font-semibold text-gray-800">No Orders in this view</h3>
              <p className="text-xs text-gray-400">Incoming guest orders will automatically pop up here live.</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const badge = STATUS_BADGES[order.status] || STATUS_BADGES.new;
              const locationName =
                order.tables?.table_number
                  ? `Table ${order.tables.table_number}`
                  : order.rooms?.room_number
                  ? `Room ${order.rooms.room_number}`
                  : order.customer_name
                  ? order.customer_name
                  : order.order_type === 'home'
                  ? 'Takeaway'
                  : 'Direct Order';

              const bundleItems = order.order_items || [];
              const totalItemsCount = bundleItems.reduce((s, i) => s + i.quantity, 0);

              return (
                <div
                  key={order.id}
                  className="bg-white border border-gray-200/90 rounded-2xl p-4 space-y-3 shadow-2xs hover:shadow-xs transition-all"
                >
                  {/* Order header */}
                  <div className="flex items-start justify-between border-b border-gray-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-gray-900">
                          #{order.order_number}
                        </span>
                        <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                          {order.rooms?.room_number ? '🏨' : '📍'} {locationName}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 font-normal mt-0.5">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull;{' '}
                        <span className="font-medium text-gray-700">{order.customer_name}</span>
                      </p>
                    </div>

                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 ${badge.bg} ${badge.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Bundle Itemized breakdown */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1.5">
                      <span>📦 {totalItemsCount} items</span>
                      <span className="text-gray-900 font-bold">₹{order.total.toFixed(0)}</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {bundleItems.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between text-xs gap-2">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <span className="font-bold text-emerald-700 shrink-0">{item.quantity}x</span>
                            <span className="font-medium text-gray-800 truncate">{item.item_name}</span>
                          </div>
                          <span className="font-semibold text-gray-600 shrink-0">
                            ₹{item.total_price.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Special Cooking Instructions */}
                  {order.notes && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 flex items-start gap-2">
                      <span className="text-sm shrink-0">📝</span>
                      <div>
                        <p className="font-semibold text-[10px] uppercase text-amber-900 tracking-wider">Instructions:</p>
                        <p className="font-normal text-amber-800">{order.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    {(STATUS_ACTIONS[order.status] || []).map((action) => (
                      <button
                        key={action.next}
                        onClick={() => updateOrderStatus(order.id, action.next)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold active:scale-95 transition-all shadow-2xs ${action.color}`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </main>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER: SUPER ADMIN DASHBOARD (ENTERPRISE RESTAURANT SUITE)
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-dvh bg-gray-50/40 pb-16 font-sans">
      {/* ─── Top Sticky PWA Install Banner ─── */}
      <PwaInstallBanner />

      {/* ─── Top Navbar ─── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-gray-200/80 shrink-0 shadow-2xs">
              <Image
                src="https://krishnaanandam.in/wp-content/uploads/2026/08/Hotel-Krsihna-Anandam-Logo.webp"
                alt="Krishna Anandam"
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                  KRISHNA ANANDAM
                </h1>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Admin Hub
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-normal">Restaurant Management & Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Install App Button */}
            <PwaHeaderButton />

            <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-900">{session.name}</p>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  {session.role}
                </p>
              </div>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="text-xs font-medium border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg transition-colors cursor-pointer"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* ─── Navigation Tabs ─── */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 pb-2.5">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'orders'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Live Orders</span>
            {newOrdersCount > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-bounce">
                {newOrdersCount} New
              </span>
            )}
            {activeOrdersCount > 0 && newOrdersCount === 0 && (
              <span className="bg-gray-700 text-white text-[10px] font-medium px-1.5 py-0.2 rounded-full">
                {activeOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'menu'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Menu Dishes</span>
            <span className="bg-gray-200 text-gray-700 text-[10px] font-medium px-1.5 py-0.2 rounded-full">
              {menuItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'categories'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Categories</span>
            <span className="bg-gray-200 text-gray-700 text-[10px] font-medium px-1.5 py-0.2 rounded-full">
              {categories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'staff'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Staff</span>
            <span className="bg-gray-200 text-gray-700 text-[10px] font-medium px-1.5 py-0.2 rounded-full">
              {staffList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'tables'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>Tables & Room QR</span>
            <span className="bg-gray-200 text-gray-700 text-[10px] font-medium px-1.5 py-0.2 rounded-full">
              {tables.length + rooms.length}
            </span>
          </button>
        </div>
      </header>

      {/* Metric Highlights Banner */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-2xs">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Active Orders</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{activeOrdersCount}</p>
          </div>
          <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-2xs">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Sales Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹{todayRevenue.toFixed(0)}</p>
          </div>
          <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-2xs">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Dining Tables</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{tables.length}</p>
          </div>
          <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-2xs">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Hotel Rooms</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{rooms.length}</p>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* TAB 1: LIVE ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(['active', 'all', 'new', 'preparing', 'ready', 'completed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all shrink-0 ${
                      orderFilter === st
                        ? 'bg-gray-900 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {st === 'active' ? 'Active Orders' : st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                {(['all', 'table', 'room', 'home'] as const).map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setTypeFilter(tp)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-all ${
                      typeFilter === tp
                        ? 'bg-emerald-700 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {tp === 'all' ? 'All Types' : tp === 'home' ? 'Takeaway' : tp === 'room' ? '🏨 Rooms' : '📍 Tables'}
                  </button>
                ))}
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl bg-white border border-gray-200/80 p-12 text-center space-y-2 shadow-2xs">
                <div className="text-3xl">🍽️</div>
                <h3 className="text-sm font-semibold text-gray-800">No Orders in this view</h3>
                <p className="text-xs text-gray-400">Orders placed by guests will automatically appear here live.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => {
                  const badge = STATUS_BADGES[order.status] || STATUS_BADGES.new;
                  const locationName =
                    order.tables?.table_number
                      ? `Table ${order.tables.table_number}`
                      : order.rooms?.room_number
                      ? `Room ${order.rooms.room_number}`
                      : order.customer_name
                      ? order.customer_name
                      : order.order_type === 'home'
                      ? 'Takeaway'
                      : 'Direct Order';

                  const bundleItems = order.order_items || [];
                  const totalItemsCount = bundleItems.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-gray-900">
                                #{order.order_number}
                              </span>
                              <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                                {order.rooms?.room_number ? '🏨' : '📍'} {locationName}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 font-normal mt-0.5">
                              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull;{' '}
                              <span className="font-medium text-gray-700">{order.customer_name}</span>
                            </p>
                          </div>

                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${badge.bg} ${badge.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            <span>{badge.label}</span>
                          </span>
                        </div>

                        <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1.5">
                            <span>📦 {totalItemsCount} items</span>
                            <span className="text-gray-900 font-bold">₹{order.total.toFixed(0)}</span>
                          </div>

                          <div className="space-y-1.5 max-h-44 overflow-y-auto no-scrollbar pt-1">
                            {bundleItems.map((item, idx) => (
                              <div key={idx} className="flex items-start justify-between text-xs gap-2">
                                <div className="flex items-start gap-1.5 min-w-0">
                                  <span className="font-bold text-emerald-700 shrink-0">{item.quantity}x</span>
                                  <span className="font-medium text-gray-800 truncate">{item.item_name}</span>
                                </div>
                                <span className="font-semibold text-gray-600 shrink-0">
                                  ₹{item.total_price.toFixed(0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {order.notes && (
                          <div className="mt-2.5 bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900 flex items-start gap-2">
                            <span className="text-sm shrink-0">📝</span>
                            <div>
                              <p className="font-semibold text-[10px] uppercase text-amber-900 tracking-wider">Instructions:</p>
                              <p className="font-normal text-amber-800">{order.notes}</p>
                            </div>
                          </div>
                        )}

                        {order.customer_phone && order.customer_phone !== '0000000000' && (
                          <div className="mt-2 text-xs text-gray-500 font-medium flex items-center gap-1.5">
                            <span>📞</span>
                            <a href={`tel:${order.customer_phone}`} className="text-emerald-700 hover:underline">
                              +91 {order.customer_phone}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                        {(STATUS_ACTIONS[order.status] || []).map((action) => (
                          <button
                            key={action.next}
                            onClick={() => updateOrderStatus(order.id, action.next)}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold shadow-2xs transition-all ${action.color}`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MENU ITEMS */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                  />
                  {menuSearch && (
                    <button
                      onClick={() => setMenuSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={selectedCatFilter}
                  onChange={(e) => setSelectedCatFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">All Categories ({menuItems.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsAddItemOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>+ Add New Dish</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMenuItems.map((item) => {
                const cat = categories.find((c) => c.id === item.category_id);
                return (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-xl p-3 shadow-2xs transition-all flex gap-3 ${
                      !item.is_available ? 'opacity-60 border-gray-200 bg-gray-50/50' : 'border-gray-200/80 hover:border-gray-300'
                    }`}
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                          unoptimized={item.image_url.startsWith('http')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{item.name}</h3>
                          <span className="text-xs font-bold text-gray-900 shrink-0">
                            ₹{item.price.toFixed(0)}
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-700 font-semibold uppercase mt-0.5">
                          {cat?.name || 'Dish'}
                        </p>
                        {item.description && (
                          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 mt-1">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                            item.is_available
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {item.is_available ? 'In Stock' : 'Sold Out'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="text-[11px] text-gray-600 hover:text-emerald-700 font-medium px-2 py-0.5 hover:bg-gray-100 rounded-md"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMenuItem(item.id, item.name)}
                            className="text-[11px] text-red-500 hover:text-red-700 font-medium px-2 py-0.5 hover:bg-red-50 rounded-md"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Menu Categories</h2>
                <p className="text-xs text-gray-500">Organize dish categories on your guest menu</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat) => {
                const count = menuItems.filter((i) => i.category_id === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{cat.name}</h3>
                      <p className="text-xs text-emerald-700 font-semibold mt-0.5">{count} Dishes</p>
                      {cat.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{cat.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: STAFF */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Staff Members & Roles</h2>
                <p className="text-xs text-gray-500">Manage accounts and role permissions for staff members</p>
              </div>
              <button
                onClick={() => setIsAddStaffOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-2xs transition-all"
              >
                + Add Staff
              </button>
            </div>

            <div className="bg-white border border-gray-200/80 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200/80 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Mobile</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-normal text-gray-800">
                  {staffList.map((st) => (
                    <tr key={st.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3.5 font-semibold text-gray-900">{st.name}</td>
                      <td className="p-3.5 text-gray-600">{st.email}</td>
                      <td className="p-3.5 text-gray-600">{st.phone || 'N/A'}</td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            st.role === 'owner'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : st.role === 'manager'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : st.role === 'kitchen'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {st.role}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {st.user_id !== session.userId && (
                          <button
                            onClick={() => handleDeleteStaff(st.id, st.name)}
                            className="text-red-500 hover:text-red-700 font-medium text-xs hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: TABLES & HOTEL ROOMS QR STAND GENERATOR */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-gray-900">QR Code Stand Cards Generator</h2>
                </div>
                <p className="text-xs text-gray-500">Generate, view, and print physical QR Stand Cards for Dining Tables & Hotel Rooms</p>
              </div>

              <div className="flex items-center gap-2">
                {qrViewMode === 'tables' ? (
                  <button
                    onClick={() => setIsAddTableOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
                  >
                    <span>+ Add Dining Table</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAddRoomOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
                  >
                    <span>+ Add Hotel Room</span>
                  </button>
                )}
              </div>
            </div>

            {/* Toggle between Dining Tables and Hotel Rooms */}
            <div className="flex items-center gap-2 border-b border-gray-200/80 pb-2">
              <button
                onClick={() => setQrViewMode('tables')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  qrViewMode === 'tables'
                    ? 'bg-gray-900 text-white shadow-2xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>🪑 Dining Tables</span>
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {tables.length}
                </span>
              </button>

              <button
                onClick={() => setQrViewMode('rooms')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  qrViewMode === 'rooms'
                    ? 'bg-gray-900 text-white shadow-2xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>🏨 Hotel Rooms (In-Room Dining)</span>
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {rooms.length}
                </span>
              </button>
            </div>

            {/* Subtab 1: Tables Grid */}
            {qrViewMode === 'tables' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center text-xs border border-emerald-200">
                          {t.table_number}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">Table {t.table_number}</h3>
                          <p className="text-[11px] text-gray-400 font-normal">Capacity: {t.capacity} Guests</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                        <button
                          onClick={() => handleDeleteTable(t.id, `Table ${t.table_number}`)}
                          className="text-red-400 hover:text-red-600 text-xs p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2 text-center text-xs font-mono text-gray-600 truncate border border-gray-100">
                      Token: {t.qr_token}
                    </div>

                    <button
                      onClick={() => showQRModal(`Table ${t.table_number}`, 'DINE-IN ORDERING', 'table', t.qr_token)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>📷 Print Table QR Stand</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Subtab 2: Hotel Rooms Grid */}
            {qrViewMode === 'rooms' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {rooms.length === 0 ? (
                  <div className="col-span-full bg-white border border-gray-200/80 rounded-2xl p-12 text-center space-y-3">
                    <div className="text-3xl">🏨</div>
                    <h3 className="text-sm font-bold text-gray-800">No Hotel Rooms configured yet</h3>
                    <p className="text-xs text-gray-500">Add hotel rooms so guests can scan in-room QR codes to order room service.</p>
                    <button
                      onClick={() => setIsAddRoomOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs"
                    >
                      + Add First Room
                    </button>
                  </div>
                ) : (
                  rooms.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center text-xs border border-emerald-200">
                            {r.room_number}
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">Room {r.room_number}</h3>
                            <p className="text-[11px] text-emerald-700 font-semibold">{r.floor || 'Guest Room'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                            Room Service
                          </span>
                          <button
                            onClick={() => handleDeleteRoom(r.id, `Room ${r.room_number}`)}
                            className="text-red-400 hover:text-red-600 text-xs p-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-2 text-center text-xs font-mono text-gray-600 truncate border border-gray-100">
                        Token: {r.qr_token}
                      </div>

                      <button
                        onClick={() => showQRModal(`Room ${r.room_number}`, r.floor ? `${r.floor} • In-Room Dining` : 'In-Room Dining', 'room', r.qr_token)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>📷 Print Room QR Stand</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: ADD DISH */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Add New Menu Dish</h3>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewItem} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paneer Butter Masala"
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={newItemForm.category_id}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category_id: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="240"
                    value={newItemForm.price}
                    onChange={(e) => setNewItemForm({ ...newItemForm, price: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Photo URL (Unsplash or Image Link)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newItemForm.image_url}
                  onChange={(e) => setNewItemForm({ ...newItemForm, image_url: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Rich tomato gravy, cottage cheese cubes, fresh cream & kasuri methi"
                  value={newItemForm.description}
                  onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="featured"
                  checked={newItemForm.is_featured}
                  onChange={(e) => setNewItemForm({ ...newItemForm, is_featured: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <label htmlFor="featured" className="text-xs font-medium text-gray-700 cursor-pointer">
                  Tag as Popular Special
                </label>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  variant="outline"
                  className="flex-1 text-xs font-medium rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  Save Dish
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT DISH */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Edit Menu Item</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={editingItem.category_id}
                    onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Photo URL</label>
                <input
                  type="url"
                  value={editingItem.image_url || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  variant="outline"
                  className="flex-1 text-xs font-medium rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  Update Dish
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD STAFF */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Add Staff Member</h3>
              <button
                onClick={() => setIsAddStaffOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newStaffForm.name}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@krishnaanandam.com"
                  value={newStaffForm.email}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={newStaffForm.phone}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    value={newStaffForm.role}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold"
                  >
                    <option value="staff">Staff / Waiter</option>
                    <option value="kitchen">Kitchen Chef</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Login Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newStaffForm.password}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  variant="outline"
                  className="flex-1 text-xs font-medium rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  Create Staff
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD DINING TABLE */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Add Dining Table</h3>
              <button
                onClick={() => setIsAddTableOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Table Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. T04"
                  value={newTableForm.table_number}
                  onChange={(e) => setNewTableForm({ ...newTableForm, table_number: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Guest Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newTableForm.capacity}
                  onChange={(e) => setNewTableForm({ ...newTableForm, capacity: parseInt(e.target.value) || 2 })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  variant="outline"
                  className="flex-1 text-xs font-medium rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  Add Table
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ADD HOTEL ROOM */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Add Hotel Room</h3>
              <button
                onClick={() => setIsAddRoomOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, 202, Suite 01"
                  value={newRoomForm.room_number}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, room_number: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Floor / Section</label>
                <input
                  type="text"
                  placeholder="e.g. 1st Floor, 2nd Floor"
                  value={newRoomForm.floor}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, floor: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  variant="outline"
                  className="flex-1 text-xs font-medium rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  Add Room
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: PRINTABLE QR CODE STAND CARD (FOR TABLE OR ROOM) */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">{selectedQR.name} Stand Card</h3>
              <button
                onClick={() => setSelectedQR(null)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div
              id="qr-stand-card"
              className="bg-white border-2 border-emerald-600 rounded-2xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xs font-bold text-gray-900 tracking-wider">KRISHNA ANANDAM</span>
              </div>
              <p className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block">
                {selectedQR.type === 'room' ? 'IN-ROOM DINING & ROOM SERVICE' : '100% PURE VEG RESTAURANT'}
              </p>

              <div className="relative w-44 h-44 mx-auto bg-white p-2 rounded-xl border border-gray-200 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedQR.qrDataUrl} alt="Table QR" className="w-full h-full object-contain rounded-lg" />
              </div>

              <div>
                <p className="text-base font-bold text-gray-900">{selectedQR.name}</p>
                <p className="text-[11px] text-gray-500 font-normal">
                  {selectedQR.type === 'room'
                    ? 'Scan with phone camera to order fresh food to your room'
                    : 'Scan with mobile camera to browse menu & order'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => {
                  const printWin = window.open('', '', 'width=600,height=600');
                  if (printWin) {
                    printWin.document.write(`
                      <html>
                        <head>
                          <title>Print Stand - ${selectedQR.name}</title>
                          <style>
                            body { font-family: sans-serif; text-align: center; padding: 40px; }
                            .card { border: 3px solid #059669; border-radius: 20px; padding: 24px; max-width: 300px; margin: 0 auto; }
                            h1 { color: #111827; margin: 0; font-size: 18px; }
                            p { color: #059669; margin: 4px 0 12px 0; font-size: 12px; font-weight: bold; }
                            img { width: 200px; height: 200px; margin: 12px 0; }
                            .table { font-size: 22px; font-weight: 800; color: #111827; margin-top: 8px; }
                            .sub { font-size: 11px; color: #6b7280; margin-top: 6px; }
                          </style>
                        </head>
                        <body>
                          <div class="card">
                            <h1>KRISHNA ANANDAM</h1>
                            <p>${selectedQR.type === 'room' ? 'IN-ROOM DINING • ROOM SERVICE' : '100% PURE VEGETARIAN'}</p>
                            <img src="${selectedQR.qrDataUrl}" />
                            <div class="table">${selectedQR.name}</div>
                            <div class="sub">${selectedQR.type === 'room' ? 'Scan with Camera for Room Service' : 'Scan with Camera to Order'}</div>
                          </div>
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                    printWin.focus();
                    printWin.print();
                  }
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 rounded-lg shadow-2xs"
              >
                🖨️ Print Stand Card
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
