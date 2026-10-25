'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { StaffSession } from '@/lib/auth/session';
import QRCode from 'qrcode';
import Image from 'next/image';

import { OfferBanner, DEFAULT_OFFER_BANNERS, BANNERS_STORAGE_KEY } from '@/lib/banners';

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
  delivery_address_id?: string | null;
  tables?: { table_number: string } | null;
  rooms?: { room_number: string } | null;
  customer_addresses?: {
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    pincode: string;
  } | null;
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

type SuperAdminTab = 'orders' | 'menu' | 'categories' | 'banners' | 'staff' | 'tables' | 'logs' | 'report';

type ReportType = 'orders' | 'sales' | 'menu' | 'staff' | 'tables' | 'logs';

interface ReportColumn {
  label: string;
}

interface ReportTable {
  title: string;
  filename: string;
  columns: ReportColumn[];
  rows: Array<Array<string | number>>;
  summary: Array<{ label: string; value: string }>;
}

const REPORT_TYPES: Array<{ value: ReportType; label: string }> = [
  { value: 'orders', label: 'Orders Report' },
  { value: 'sales', label: 'Sales by Item' },
  { value: 'menu', label: 'Menu Items' },
  { value: 'staff', label: 'Staff' },
  { value: 'tables', label: 'Tables & Rooms' },
  { value: 'logs', label: 'Activity Logs' },
];

const REPORT_ORDER_STATUSES = [
  'new',
  'accepted',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled',
];

const REPORT_PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi_manual', label: 'UPI (manual)' },
  { value: 'room_bill', label: 'Room bill' },
  { value: 'gateway', label: 'Gateway' },
  { value: 'pending', label: 'Payment pending' },
  { value: 'paid', label: 'Payment paid' },
];

function reportMoney(value: number | string | null | undefined): string {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function reportInRange(value: string, from: string, to: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (from) {
    const start = new Date(`${from}T00:00:00`);
    if (date < start) return false;
  }
  if (to) {
    const end = new Date(`${to}T23:59:59.999`);
    if (date > end) return false;
  }
  return true;
}

function reportEscapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function reportCsvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadReportCsv(report: ReportTable): void {
  const csv = [
    report.columns.map((column) => reportCsvCell(column.label)).join(','),
    ...report.rows.map((row) => row.map(reportCsvCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function openReportPdf(report: ReportTable, filterSummary: string): void {
  const popup = window.open('', '_blank');
  if (!popup) {
    alert('Please allow pop-ups to download the PDF report.');
    return;
  }

  const summaryHtml = report.summary
    .map(
      (item) =>
        `<div class="summary-card"><span>${reportEscapeHtml(item.label)}</span><strong>${reportEscapeHtml(item.value)}</strong></div>`,
    )
    .join('');

  const headHtml = report.columns
    .map((column) => `<th>${reportEscapeHtml(column.label)}</th>`)
    .join('');

  const bodyHtml = report.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${reportEscapeHtml(cell)}</td>`)
          .join('')}</tr>`,
    )
    .join('');

  popup.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${reportEscapeHtml(report.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 24px; }
  .toolbar { margin-bottom: 16px; }
  .toolbar button { background: #05c12f; color: #fff; border: 0; border-radius: 8px; padding: 10px 18px; font-size: 14px; font-weight: 700; cursor: pointer; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .subtitle { color: #444; font-size: 12px; margin-bottom: 16px; }
  .summary { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .summary-card { border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; min-width: 120px; background: #fafafa; }
  .summary-card span { display: block; font-size: 10px; text-transform: uppercase; color: #666; letter-spacing: 0.04em; }
  .summary-card strong { font-size: 15px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #f1f5f1; border: 1px solid #ccc; padding: 6px; text-align: left; }
  td { border: 1px solid #ddd; padding: 5px 6px; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .footer { margin-top: 14px; font-size: 10px; color: #666; }
  @media print { .toolbar { display: none; } body { margin: 0; } }
</style>
</head>
<body>
  <div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>KRISHNA ANANDAM — ${reportEscapeHtml(report.title)}</h1>
  <div class="subtitle">${reportEscapeHtml(filterSummary)}</div>
  <div class="summary">${summaryHtml}</div>
  <table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml || '<tr><td>No records found</td></tr>'}</tbody></table>
  <div class="footer">Generated ${reportEscapeHtml(new Date().toLocaleString('en-IN'))} • ${report.rows.length} records</div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 350); };</script>
</body>
</html>`);
  popup.document.close();
}

interface ActivityLog {
  id: string;
  restaurant_id: string;
  action: string;
  level: 'info' | 'warning' | 'error' | 'success';
  actor_name: string;
  actor_role: string;
  details: string;
  metadata?: Record<string, any>;
  created_at: string;
}

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

export function getOrderChannelInfo(order: Order) {
  // 1. Hotel Room Service order
  if (order.rooms?.room_number || order.room_id || order.order_type === 'room') {
    const roomNum = order.rooms?.room_number;
    return {
      channel: 'room' as const,
      categoryLabel: 'Rooms',
      badgeLabel: roomNum ? `Room ${roomNum}` : 'Room Service',
      icon: '🏨',
      badgeClass: 'bg-blue-50 text-blue-900 border-blue-300',
    };
  }

  // 2. Restaurant Dine-in Table order
  if (order.tables?.table_number || order.table_id || (order.order_type === 'table' && (order.table_id || order.tables?.table_number))) {
    const tableNum = order.tables?.table_number;
    return {
      channel: 'table' as const,
      categoryLabel: 'Tables',
      badgeLabel: tableNum ? `Table ${tableNum}` : 'Table Service',
      icon: '🍽️',
      badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    };
  }

  // 3. Takeaway / Pickup order (order_type === 'home' or orders without table/room)
  const custName =
    order.customer_name &&
    order.customer_name !== 'Dine-in Guest' &&
    order.customer_name !== 'Table Customer'
      ? order.customer_name
      : null;

  return {
    channel: 'home' as const,
    categoryLabel: 'Takeaway',
    badgeLabel: custName ? `Takeaway • ${custName}` : 'Takeaway',
    icon: '🛍️',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
  };
}

export function getOrderLocationLink(order: Order): string | null {
  if (getOrderChannelInfo(order).channel !== 'home') return null;

  const address = order.customer_addresses;
  const addressQuery = [
    address?.address_line1,
    address?.address_line2,
    address?.city,
    address?.state,
    address?.pincode,
  ]
    .filter(Boolean)
    .join(', ')
    .trim();

  const notesLocation = order.notes?.match(/Location:\s*([^|]+)/i)?.[1]?.trim();
  const query = addressQuery || notesLocation;

  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function DashboardClient({ session }: Props) {
  const isSuperAdmin = session.role === 'owner' || session.role === 'manager';

  // Orders state
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

  // Offer Reels Carousel state (4 slides)
  const [bannersList, setBannersList] = useState<OfferBanner[]>(DEFAULT_OFFER_BANNERS);
  const [isSavingBanners, setIsSavingBanners] = useState(false);
  const [bannerSaveMsg, setBannerSaveMsg] = useState<string | null>(null);
  const [bannerUploadStates, setBannerUploadStates] = useState<Record<number, 'idle' | 'uploading' | 'done' | 'error'>>({});

  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');

  // Modals state
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
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

  const [newTableForm, setNewTableForm] = useState({
    table_number: '',
    capacity: 4,
  });

  const [newRoomForm, setNewRoomForm] = useState({
    room_number: '',
    floor: '',
  });

  // Log entry modal state (used from the Reports tab)
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [newLogForm, setNewLogForm] = useState({
    action: 'SYSTEM_NOTE',
    level: 'info' as 'info' | 'warning' | 'error' | 'success',
    details: '',
  });
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Reports state
  const [reportType, setReportType] = useState<ReportType>('orders');
  const [reportData, setReportData] = useState<{ orders: Order[]; logs: ActivityLog[] }>({
    orders: [],
    logs: [],
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [reportOrderType, setReportOrderType] = useState<'all' | 'table' | 'room' | 'home'>('all');
  const [reportOrderStatus, setReportOrderStatus] = useState('all');
  const [reportPayment, setReportPayment] = useState('all');
  const [reportMenuCategory, setReportMenuCategory] = useState('all');
  const [reportVegType, setReportVegType] = useState('all');
  const [reportAvailability, setReportAvailability] = useState('all');
  const [reportStaffRole, setReportStaffRole] = useState('all');
  const [reportAssetType, setReportAssetType] = useState<'all' | 'table' | 'room'>('all');
  const [reportAssetStatus, setReportAssetStatus] = useState('all');
  const [reportLogLevel, setReportLogLevel] = useState('all');
  const [activityLogLevel, setActivityLogLevel] = useState('all');

  // Initial fetch
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);

    if (isSuperAdmin) {
      fetchCategories();
      fetchMenuItems();
      fetchStaffList();
      fetchTablesAndRooms();
      fetchBanners();
    }

    return () => clearInterval(interval);
  }, [isSuperAdmin]);

  async function fetchOrders() {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // Ignore polling errors
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        if (data.categories?.length > 0 && !newItemForm.category_id) {
          setNewItemForm((prev) => ({ ...prev, category_id: data.categories[0].id }));
        }
      }
    } catch {
      // Ignore
    }
  }

  async function fetchMenuItems() {
    try {
      const res = await fetch('/api/admin/menu-items');
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.items || []);
      }
    } catch {
      // Ignore
    }
  }

  async function fetchStaffList() {
    try {
      const res = await fetch('/api/admin/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch {
      // Ignore
    }
  }

  async function fetchTablesAndRooms() {
    try {
      const resT = await fetch('/api/admin/tables');
      if (resT.ok) {
        const dataT = await resT.json();
        setTables(dataT.tables || []);
      }
      const resR = await fetch('/api/admin/rooms');
      if (resR.ok) {
        const dataR = await resR.json();
        setRooms(dataR.rooms || []);
      }
    } catch {
      // Ignore
    }
  }

  async function fetchBanners() {
    try {
      const res = await fetch('/api/admin/banners');
      if (res.ok) {
        const data = await res.json();
        if (res.ok && Array.isArray(data.banners) && data.banners.length > 0) {
          setBannersList(data.banners);
          return;
        }
      }
    } catch {
      // Fallback
    }
    try {
      const cached = localStorage.getItem(BANNERS_STORAGE_KEY);
      if (cached) {
        setBannersList(JSON.parse(cached));
      }
    } catch {
      // Ignore
    }
  }

  async function handleSaveBanners(updated: OfferBanner[]) {
    setIsSavingBanners(true);
    setBannerSaveMsg(null);
    try {
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banners: updated }),
      });
      const data = await res.json();
      if (res.ok) {
        const saved = data.banners || updated;
        setBannersList(saved);
        try {
          localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(saved));
          window.dispatchEvent(new Event('offer_banners_updated'));
        } catch { /* ignore */ }
        setBannerSaveMsg('Offer reels published successfully!');
        setTimeout(() => setBannerSaveMsg(null), 3000);
      } else {
        alert('Failed to save offer reels');
      }
    } catch {
      alert('Network error saving offer reels');
    } finally {
      setIsSavingBanners(false);
    }
  }

  function handleResetBanners() {
    if (confirm('Reset to 4 default offer reel slides?')) {
      handleSaveBanners(DEFAULT_OFFER_BANNERS);
    }
  }

  async function fetchReportData() {
    if (!isSuperAdmin) return;
    setReportLoading(true);
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) {
        const data = await res.json();
        setReportData({ orders: data.orders || [], logs: data.logs || [] });
      }
    } catch {
      // Ignore report fetch errors
    } finally {
      setReportLoading(false);
    }
  }

  async function handleCreateLogEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!newLogForm.details.trim()) return;
    setIsSubmittingLog(true);
    try {
      const res = await fetch('/api/admin/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLogForm),
      });
      if (res.ok) {
        setNewLogForm({ action: 'SYSTEM_NOTE', level: 'info', details: '' });
        setIsAddLogOpen(false);
        fetchReportData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to create log entry');
      }
    } catch {
      alert('Network error creating log entry');
    } finally {
      setIsSubmittingLog(false);
    }
  }

  async function updateOrderStatus(orderId: string, nextStatus: string) {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchOrders();
      } else {
        alert('Could not update order status');
      }
    } catch {
      alert('Network error updating status');
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  }

  async function handleSaveNewItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItemForm,
          price: parseFloat(newItemForm.price) || 0,
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
        alert('Failed to add dish');
      }
    } catch {
      alert('Error creating dish');
    }
  }

  async function handleSaveEditItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/admin/menu-items/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem),
      });
      if (res.ok) {
        setEditingItem(null);
        fetchMenuItems();
      } else {
        alert('Failed to update dish');
      }
    } catch {
      alert('Error updating dish');
    }
  }

  async function handleDeleteMenuItem(id: string, name: string) {
    if (!confirm(`Delete "${name}" from the menu?`)) return;
    try {
      const res = await fetch(`/api/admin/menu-items/${id}`, { method: 'DELETE' });
      if (res.ok) fetchMenuItems();
      else alert('Failed to delete dish');
    } catch {
      alert('Error deleting dish');
    }
  }

  async function handleToggleAvailability(item: MenuItem) {
    try {
      const res = await fetch(`/api/admin/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !item.is_available }),
      });
      if (res.ok) fetchMenuItems();
    } catch {
      // Ignore
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
      if (res.ok) {
        setIsAddStaffOpen(false);
        setNewStaffForm({ name: '', email: '', phone: '', password: '', role: 'staff' });
        fetchStaffList();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create staff member');
      }
    } catch {
      alert('Error creating staff');
    }
  }

  async function handleDeleteStaff(id: string, name: string) {
    if (!confirm(`Remove staff access for ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
      if (res.ok) fetchStaffList();
      else alert('Failed to remove staff');
    } catch {
      alert('Error deleting staff');
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
        fetchTablesAndRooms();
      } else {
        alert('Failed to add dining table');
      }
    } catch {
      alert('Error creating table');
    }
  }

  async function handleDeleteTable(id: string, name: string) {
    if (!confirm(`Delete table ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/tables/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTablesAndRooms();
      else alert('Failed to delete table');
    } catch {
      alert('Error deleting table');
    }
  }

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoomForm),
      });
      if (res.ok) {
        setIsAddRoomOpen(false);
        setNewRoomForm({ room_number: '', floor: '' });
        fetchTablesAndRooms();
      } else {
        alert('Failed to add room');
      }
    } catch {
      alert('Error creating room');
    }
  }

  async function handleDeleteRoom(id: string, name: string) {
    if (!confirm(`Delete hotel room ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/rooms/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTablesAndRooms();
      else alert('Failed to delete room');
    } catch {
      alert('Error deleting room');
    }
  }

  async function showQRModal(name: string, subtitle: string, type: 'table' | 'room', token: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://krishnaanandam.in';
    const targetUrl = `${origin}/q?t=${token}`;
    try {
      const dataUrl = await QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      setSelectedQR({ name, subtitle, type, url: targetUrl, qrDataUrl: dataUrl });
    } catch {
      alert('Failed to generate QR code');
    }
  }

  // Counts per channel respecting current status filter
  const countsByType = useMemo(() => {
    const counts = { all: 0, table: 0, room: 0, home: 0 };
    orders.forEach((o) => {
      const matchesStatus =
        orderFilter === 'all'
          ? true
          : orderFilter === 'active'
          ? ['new', 'accepted', 'preparing', 'ready', 'served', 'out_for_delivery'].includes(o.status)
          : o.status === orderFilter;

      if (matchesStatus) {
        counts.all++;
        const info = getOrderChannelInfo(o);
        counts[info.channel]++;
      }
    });
    return counts;
  }, [orders, orderFilter]);

  // Overall counts across all statuses for fallback guidance
  const totalCountsByType = useMemo(() => {
    const counts = { all: 0, table: 0, room: 0, home: 0 };
    orders.forEach((o) => {
      counts.all++;
      const info = getOrderChannelInfo(o);
      counts[info.channel]++;
    });
    return counts;
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (typeFilter !== 'all') {
        const info = getOrderChannelInfo(o);
        if (info.channel !== typeFilter) return false;
      }
      if (orderFilter === 'active') {
        return ['new', 'accepted', 'preparing', 'ready', 'served', 'out_for_delivery'].includes(o.status);
      }
      if (orderFilter === 'all') return true;
      return o.status === orderFilter;
    });
  }, [orders, orderFilter, typeFilter]);

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((i) => {
      if (selectedCatFilter !== 'all' && i.category_id !== selectedCatFilter) return false;
      if (menuSearch.trim()) {
        const q = menuSearch.toLowerCase();
        return i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, selectedCatFilter, menuSearch]);

  const activeOrdersCount = orders.filter((o) =>
    ['new', 'accepted', 'preparing', 'ready', 'served', 'out_for_delivery'].includes(o.status)
  ).length;

  const newOrdersCount = orders.filter((o) => o.status === 'new').length;

  const reportTable = useMemo<ReportTable>(() => {
    const query = reportSearch.trim().toLowerCase();
    const matches = (values: Array<string | number | null | undefined>) =>
      !query ||
      values
        .filter((value) => value !== null && value !== undefined && String(value).length > 0)
        .join(' ')
        .toLowerCase()
        .includes(query);

    const formattedDate = (value: string) =>
      new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    const filteredOrders = reportData.orders.filter((order) => {
      if (!reportInRange(order.created_at, reportFrom, reportTo)) return false;
      if (reportOrderType !== 'all' && getOrderChannelInfo(order).channel !== reportOrderType) return false;
      if (reportOrderStatus !== 'all' && order.status !== reportOrderStatus) return false;
      if (
        reportPayment !== 'all' &&
        order.payment_method !== reportPayment &&
        order.payment_status !== reportPayment
      ) {
        return false;
      }
      return matches([
        order.order_number,
        order.customer_name,
        order.customer_phone,
        order.notes,
        order.tables?.table_number,
        order.rooms?.room_number,
        order.customer_addresses?.address_line1,
        ...(order.order_items || []).map((item) => item.item_name),
      ]);
    });

    const orderAddress = (order: Order) => {
      const address = order.customer_addresses;
      if (address) {
        return [
          address.address_line1,
          address.address_line2,
          address.city,
          address.state,
          address.pincode,
        ]
          .filter(Boolean)
          .join(', ');
      }
      return order.notes?.match(/Location:\s*([^|]+)/i)?.[1]?.trim() || '-';
    };

    switch (reportType) {
      case 'orders': {
        const rows = filteredOrders.map((order) => [
          `#${order.order_number}`,
          formattedDate(order.created_at),
          getOrderChannelInfo(order).categoryLabel,
          order.status,
          order.customer_name || '-',
          order.customer_phone && order.customer_phone !== '0000000000'
            ? order.customer_phone
            : '-',
          orderAddress(order),
          (order.order_items || []).reduce((sum, item) => sum + item.quantity, 0),
          reportMoney(order.subtotal),
          reportMoney(order.tax),
          reportMoney(order.delivery_fee),
          reportMoney(order.total),
          `${order.payment_method} / ${order.payment_status}`,
        ]);
        const activeOrders = filteredOrders.filter((order) => order.status !== 'cancelled');
        const revenue = activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const tax = activeOrders.reduce((sum, order) => sum + Number(order.tax || 0), 0);
        const delivery = activeOrders.reduce(
          (sum, order) => sum + Number(order.delivery_fee || 0),
          0,
        );
        return {
          title: 'Orders Report',
          filename: 'orders-report',
          columns: [
            { label: 'Order #' },
            { label: 'Date' },
            { label: 'Type' },
            { label: 'Status' },
            { label: 'Customer' },
            { label: 'Phone' },
            { label: 'Address' },
            { label: 'Items' },
            { label: 'Subtotal' },
            { label: 'Tax' },
            { label: 'Delivery' },
            { label: 'Total' },
            { label: 'Payment' },
          ],
          rows,
          summary: [
            { label: 'Orders', value: String(filteredOrders.length) },
            { label: 'Revenue', value: reportMoney(revenue) },
            { label: 'Tax', value: reportMoney(tax) },
            { label: 'Delivery fees', value: reportMoney(delivery) },
            {
              label: 'Avg. order',
              value: reportMoney(activeOrders.length ? revenue / activeOrders.length : 0),
            },
          ],
        };
      }

      case 'sales': {
        const rows: Array<Array<string | number>> = [];
        let quantity = 0;
        let amount = 0;

        for (const order of filteredOrders) {
          for (const item of order.order_items || []) {
            const lineTotal = Number(item.total_price || 0);
            quantity += item.quantity;
            amount += lineTotal;
            rows.push([
              `#${order.order_number}`,
              formattedDate(order.created_at),
              getOrderChannelInfo(order).categoryLabel,
              item.item_name,
              item.quantity,
              reportMoney(item.unit_price),
              reportMoney(lineTotal),
              order.status,
            ]);
          }
        }

        return {
          title: 'Sales by Item',
          filename: 'sales-report',
          columns: [
            { label: 'Order #' },
            { label: 'Date' },
            { label: 'Type' },
            { label: 'Item' },
            { label: 'Qty' },
            { label: 'Unit Price' },
            { label: 'Total' },
            { label: 'Status' },
          ],
          rows,
          summary: [
            { label: 'Line items', value: String(rows.length) },
            { label: 'Items sold', value: String(quantity) },
            { label: 'Sales', value: reportMoney(amount) },
            { label: 'Orders', value: String(filteredOrders.length) },
          ],
        };
      }

      case 'menu': {
        const filtered = menuItems.filter((item) => {
          if (reportMenuCategory !== 'all' && item.category_id !== reportMenuCategory) return false;
          if (reportVegType !== 'all' && item.veg_type !== reportVegType) return false;
          if (reportAvailability === 'available' && !item.is_available) return false;
          if (reportAvailability === 'unavailable' && item.is_available) return false;
          return matches([
            item.name,
            item.description,
            categories.find((category) => category.id === item.category_id)?.name,
          ]);
        });

        const rows = filtered.map((item) => [
          item.name,
          categories.find((category) => category.id === item.category_id)?.name || '-',
          reportMoney(item.price),
          item.veg_type,
          item.is_available ? 'Yes' : 'No',
          item.is_featured ? 'Yes' : 'No',
          item.sort_order,
        ]);

        const available = filtered.filter((item) => item.is_available).length;
        const totalPrice = filtered.reduce((sum, item) => sum + Number(item.price || 0), 0);

        return {
          title: 'Menu Items Report',
          filename: 'menu-report',
          columns: [
            { label: 'Item' },
            { label: 'Category' },
            { label: 'Price' },
            { label: 'Veg Type' },
            { label: 'Available' },
            { label: 'Featured' },
            { label: 'Sort Order' },
          ],
          rows,
          summary: [
            { label: 'Items', value: String(filtered.length) },
            { label: 'Available', value: String(available) },
            { label: 'Unavailable', value: String(filtered.length - available) },
            {
              label: 'Avg. price',
              value: reportMoney(filtered.length ? totalPrice / filtered.length : 0),
            },
          ],
        };
      }

      case 'staff': {
        const filtered = staffList.filter((member) => {
          if (reportStaffRole !== 'all' && member.role !== reportStaffRole) return false;
          return matches([member.name, member.email, member.phone, member.role]);
        });

        const rows = filtered.map((member) => [
          member.name,
          member.role,
          member.email || '-',
          member.phone || '-',
          member.created_at ? new Date(member.created_at).toLocaleDateString('en-IN') : '-',
        ]);

        return {
          title: 'Staff Report',
          filename: 'staff-report',
          columns: [
            { label: 'Name' },
            { label: 'Role' },
            { label: 'Email' },
            { label: 'Phone' },
            { label: 'Joined' },
          ],
          rows,
          summary: [
            { label: 'Staff', value: String(filtered.length) },
            {
              label: 'Owners / Managers',
              value: String(filtered.filter((member) => ['owner', 'manager'].includes(member.role)).length),
            },
          ],
        };
      }

      case 'tables': {
        const rows: Array<Array<string | number>> = [];
        let tableCount = 0;
        let roomCount = 0;
        let availableCount = 0;

        if (reportAssetType !== 'room') {
          const filteredTables = tables.filter((table) => {
            if (reportAssetStatus !== 'all' && table.status !== reportAssetStatus) return false;
            return matches([table.table_number, table.status, table.capacity]);
          });
          tableCount = filteredTables.length;
          availableCount += filteredTables.filter((table) => table.status === 'available').length;
          for (const table of filteredTables) {
            rows.push(['Table', table.table_number, table.capacity, table.status]);
          }
        }

        if (reportAssetType !== 'table') {
          const filteredRooms = rooms.filter((room) => {
            if (reportAssetStatus !== 'all' && room.status !== reportAssetStatus) return false;
            return matches([room.room_number, room.floor, room.status]);
          });
          roomCount = filteredRooms.length;
          availableCount += filteredRooms.filter((room) => room.status === 'available').length;
          for (const room of filteredRooms) {
            rows.push(['Room', room.room_number, room.floor || '-', room.status]);
          }
        }

        return {
          title: 'Tables & Rooms Report',
          filename: 'tables-rooms-report',
          columns: [
            { label: 'Type' },
            { label: 'Number' },
            { label: 'Capacity / Floor' },
            { label: 'Status' },
          ],
          rows,
          summary: [
            { label: 'Tables', value: String(tableCount) },
            { label: 'Rooms', value: String(roomCount) },
            { label: 'Available', value: String(availableCount) },
            { label: 'Total', value: String(tableCount + roomCount) },
          ],
        };
      }

      case 'logs': {
        const filtered = reportData.logs.filter((log) => {
          if (!reportInRange(log.created_at, reportFrom, reportTo)) return false;
          if (reportLogLevel !== 'all' && log.level !== reportLogLevel) return false;
          return matches([log.action, log.actor_name, log.actor_role, log.details, log.level]);
        });

        const rows = filtered.map((log) => [
          formattedDate(log.created_at),
          log.level,
          log.action,
          log.actor_name || '-',
          log.actor_role || '-',
          log.details,
        ]);

        return {
          title: 'Activity Logs Report',
          filename: 'activity-logs-report',
          columns: [
            { label: 'Date' },
            { label: 'Level' },
            { label: 'Action' },
            { label: 'Actor' },
            { label: 'Role' },
            { label: 'Details' },
          ],
          rows,
          summary: [
            { label: 'Log entries', value: String(filtered.length) },
            { label: 'Warnings', value: String(filtered.filter((log) => log.level === 'warning').length) },
            { label: 'Errors', value: String(filtered.filter((log) => log.level === 'error').length) },
            { label: 'Success', value: String(filtered.filter((log) => log.level === 'success').length) },
          ],
        };
      }
    }
  }, [
    reportType,
    reportData,
    reportFrom,
    reportTo,
    reportSearch,
    reportOrderType,
    reportOrderStatus,
    reportPayment,
    reportMenuCategory,
    reportVegType,
    reportAvailability,
    reportStaffRole,
    reportAssetType,
    reportAssetStatus,
    reportLogLevel,
    menuItems,
    categories,
    staffList,
    tables,
    rooms,
  ]);

  const reportAssetStatuses = useMemo(
    () =>
      Array.from(
        new Set([
          ...tables.map((table) => table.status),
          ...rooms.map((room) => room.status),
        ]),
      ).filter(Boolean),
    [tables, rooms],
  );

  const reportFilterSummary = useMemo(() => {
    const parts = [`Type: ${reportType}`];
    if (reportFrom) parts.push(`From: ${reportFrom}`);
    if (reportTo) parts.push(`To: ${reportTo}`);
    if (reportSearch.trim()) parts.push(`Search: ${reportSearch.trim()}`);
    if (reportOrderType !== 'all') parts.push(`Order type: ${reportOrderType}`);
    if (reportOrderStatus !== 'all') parts.push(`Status: ${reportOrderStatus}`);
    if (reportPayment !== 'all') parts.push(`Payment: ${reportPayment}`);
    if (reportMenuCategory !== 'all') {
      parts.push(
        `Category: ${categories.find((category) => category.id === reportMenuCategory)?.name || reportMenuCategory}`,
      );
    }
    if (reportVegType !== 'all') parts.push(`Veg type: ${reportVegType}`);
    if (reportAvailability !== 'all') parts.push(`Availability: ${reportAvailability}`);
    if (reportStaffRole !== 'all') parts.push(`Role: ${reportStaffRole}`);
    if (reportAssetType !== 'all') parts.push(`Asset: ${reportAssetType}`);
    if (reportAssetStatus !== 'all') parts.push(`Asset status: ${reportAssetStatus}`);
    if (reportLogLevel !== 'all') parts.push(`Log level: ${reportLogLevel}`);
    return parts.join(' • ');
  }, [
    reportType,
    reportFrom,
    reportTo,
    reportSearch,
    reportOrderType,
    reportOrderStatus,
    reportPayment,
    reportMenuCategory,
    reportVegType,
    reportAvailability,
    reportStaffRole,
    reportAssetType,
    reportAssetStatus,
    reportLogLevel,
    categories,
  ]);

  const filteredActivityLogs = useMemo(
    () =>
      activityLogLevel === 'all'
        ? reportData.logs
        : reportData.logs.filter((log) => log.level === activityLogLevel),
    [reportData.logs, activityLogLevel],
  );

  function handleResetReportFilters() {
    setReportFrom('');
    setReportTo('');
    setReportSearch('');
    setReportOrderType('all');
    setReportOrderStatus('all');
    setReportPayment('all');
    setReportMenuCategory('all');
    setReportVegType('all');
    setReportAvailability('all');
    setReportStaffRole('all');
    setReportAssetType('all');
    setReportAssetStatus('all');
    setReportLogLevel('all');
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER: STAFF VIEW (KITCHEN & STAFF ROLE)
  // ══════════════════════════════════════════════════════════════
  if (!isSuperAdmin) {
    return (
      <div className="min-h-dvh bg-gray-50/50 pb-20 font-sans">
        {/* Top Header */}
        <header
          style={{ top: 'var(--pwa-banner-offset, 0px)' }}
          className="sticky z-30 bg-white border-b border-gray-200/80 px-4 py-3.5 shadow-2xs"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-gray-200 shrink-0 shadow-2xs">
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
                <h1 className="text-xl sm:text-lg sm:text-2xl font-semibold text-black leading-tight">Kitchen & Operations Hub</h1>
                <p className="text-base font-medium text-black">{session.name} &bull; <span className="capitalize">{session.role}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="text-base font-semibold text-black hover:text-red-600 bg-gray-50 hover:bg-red-50 px-4 py-2 rounded-xl border border-gray-300 hover:border-red-300 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Status & Channel filter bars */}
          <div className="max-w-4xl mx-auto space-y-2 pt-3 pb-1">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {(['active', 'new', 'preparing', 'ready', 'all'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderFilter(st)}
                  className={`px-4 py-2 rounded-xl text-base font-medium capitalize transition-all shrink-0 cursor-pointer ${
                    orderFilter === st
                      ? 'bg-black text-white shadow-xs'
                      : 'bg-white text-black hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {st === 'active' ? `Active (${activeOrdersCount})` : st === 'new' ? `New (${newOrdersCount})` : st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {(['all', 'table', 'room', 'home'] as const).map((tp) => (
                <button
                  key={tp}
                  onClick={() => setTypeFilter(tp)}
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold capitalize transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    typeFilter === tp
                      ? 'bg-[#05C12F] text-white shadow-xs'
                      : 'bg-white text-black hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {tp === 'all'
                    ? `All Types (${countsByType.all})`
                    : tp === 'home'
                    ? `🛍️ Takeaway (${countsByType.home})`
                    : tp === 'room'
                    ? `🏨 Rooms (${countsByType.room})`
                    : `🍽️ Tables (${countsByType.table})`}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Live Orders List */}
        <main className="max-w-4xl mx-auto p-4 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-200/80 p-12 text-center space-y-2 mt-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-black">
                {typeFilter !== 'all'
                  ? `No ${orderFilter === 'active' ? 'active' : orderFilter} orders for ${typeFilter === 'home' ? 'Takeaway' : typeFilter === 'room' ? 'Rooms' : 'Tables'}`
                  : 'No Orders in this view'}
              </h3>
              {orderFilter !== 'all' && totalCountsByType[typeFilter] > 0 && (
                <button
                  onClick={() => setOrderFilter('all')}
                  className="mt-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 cursor-pointer"
                >
                  View past / completed {typeFilter === 'home' ? 'Takeaway' : typeFilter === 'room' ? 'Rooms' : 'Tables'} orders ({totalCountsByType[typeFilter]})
                </button>
              )}
            </div>
          ) : (
            filteredOrders.map((order) => {
              const badge = STATUS_BADGES[order.status] || STATUS_BADGES.new;
              const channelInfo = getOrderChannelInfo(order);
              const locationLink = getOrderLocationLink(order);

              const bundleItems = order.order_items || [];
              const totalItemsCount = bundleItems.reduce((s, i) => s + i.quantity, 0);

              return (
                <div
                  key={order.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 shadow-2xs hover:shadow-xs transition-all"
                >
                  {/* Order header */}
                  <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-2xl font-semibold text-black">
                          #{order.order_number}
                        </span>
                        <span className={`text-base font-semibold px-3 py-0.5 rounded-lg border flex items-center gap-1.5 ${channelInfo.badgeClass}`}>
                          <span>{channelInfo.icon}</span>
                          <span>{channelInfo.badgeLabel}</span>
                        </span>
                      </div>
                      <p className="text-base font-medium text-black mt-1">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {order.customer_name && order.customer_name !== 'Dine-in Guest' && order.customer_name !== 'Table Customer' && (
                          <> &bull; <span className="font-semibold">{order.customer_name}</span></>
                        )}
                      </p>
                    </div>

                    <span className={`text-base font-semibold px-3.5 py-1.5 rounded-xl border flex items-center gap-2 shrink-0 ${badge.bg} ${badge.text}`}>
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Bundle Itemized breakdown */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between text-base font-semibold text-black border-b border-gray-200 pb-2">
                      <span>📦 {totalItemsCount} items</span>
                      <span className="text-xl font-bold text-black">₹{order.total.toFixed(0)}</span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {bundleItems.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between text-base font-medium gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-black font-semibold shrink-0">{item.quantity}x</span>
                            <span className="text-black font-medium truncate">{item.item_name}</span>
                          </div>
                          <span className="text-black font-semibold shrink-0">
                            ₹{item.total_price.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Special Cooking Notes */}
                  {order.notes && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-base font-medium text-black flex items-start gap-2.5">
                      <span className="text-lg shrink-0">📝</span>
                      <div>
                        <p className="text-sm font-semibold text-amber-900 uppercase tracking-wide">Customer Note:</p>
                        <p className="text-base font-normal text-black mt-0.5">{order.notes}</p>
                      </div>
                    </div>
                  )}

                  {locationLink && (
                    <a
                      href={locationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl px-4 py-2.5 text-base font-semibold transition-colors"
                    >
                      <span>📍</span>
                      <span>Open Location in Google Maps</span>
                    </a>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {(STATUS_ACTIONS[order.status] || []).map((action) => (
                      <button
                        key={action.next}
                        onClick={() => updateOrderStatus(order.id, action.next)}
                        className={`flex-1 py-3 px-4 rounded-xl text-base font-semibold transition-all shadow-2xs cursor-pointer ${action.color}`}
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
  // RENDER: SUPER ADMIN DASHBOARD
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-dvh bg-gray-50/40 pb-16 font-sans">
      {/* ─── Top Navbar ─── */}
      <header
        style={{ top: 'var(--pwa-banner-offset, 0px)' }}
        className="sticky z-30 bg-white border-b border-gray-200 shadow-2xs"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-white border border-gray-200 shrink-0 shadow-2xs">
              <Image
                src="https://krishnaanandam.in/wp-content/uploads/2026/08/Hotel-Krsihna-Anandam-Logo.webp"
                alt="Krishna Anandam"
                width={44}
                height={44}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-semibold text-black leading-tight">
                  KRISHNA ANANDAM
                </h1>
                <span className="hidden sm:inline-flex text-sm font-semibold bg-emerald-50 text-black border border-emerald-300 px-3 py-0.5 rounded-full">
                  Admin Panel
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-right">
                <p className="text-base font-semibold text-black">{session.name}</p>
                <p className="text-sm font-medium text-black uppercase">
                  {session.role}
                </p>
              </div>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-base font-medium border-gray-300 text-black hover:bg-red-50 hover:text-red-700 hover:border-red-300 rounded-xl transition-colors cursor-pointer py-2 px-4"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* ─── Navigation Tabs (mobile: select menu) ─── */}
        <div className="md:hidden max-w-7xl mx-auto px-4 pb-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Dashboard Section</span>
            <select
              value={activeTab}
              onChange={(event) => {
                const tab = event.target.value as SuperAdminTab;
                setActiveTab(tab);
                if (tab === 'report' || tab === 'logs') fetchReportData();
              }}
              className="w-full bg-gray-100 border border-gray-300 rounded-xl px-3 py-3 text-base font-semibold text-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="orders">Live Orders{activeOrdersCount > 0 ? ` (${activeOrdersCount})` : ''}</option>
              <option value="menu">Menu Dishes</option>
              <option value="categories">Categories</option>
              <option value="banners">Offer Reels</option>
              <option value="staff">Staff</option>
              <option value="tables">Tables &amp; Room QR</option>
              <option value="logs">Activity Logs</option>
              <option value="report">Reports</option>
            </select>
          </label>
        </div>

        <div className="hidden md:flex max-w-7xl mx-auto px-4 md:px-6 items-center gap-2 overflow-x-auto no-scrollbar pt-1.5 pb-3">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-black text-white shadow-xs'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
          >
            <span>Live Orders</span>
            {newOrdersCount > 0 && (
              <span className="bg-emerald-500 text-white text-sm font-semibold px-2 py-0.5 rounded-full animate-bounce">
                {newOrdersCount} New
              </span>
            )}
            {activeOrdersCount > 0 && newOrdersCount === 0 && (
              <span className="bg-black text-white text-sm font-semibold px-2 py-0.5 rounded-full">
                {activeOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-black text-white shadow-xs'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
          >
            <span>Menu Dishes</span>
            <span className="bg-gray-200 text-black text-sm font-semibold px-2 py-0.5 rounded-full">
              {menuItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-black text-white shadow-xs'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
          >
            <span>Categories</span>
            <span className="bg-gray-200 text-black text-sm font-semibold px-2 py-0.5 rounded-full">
              {categories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'banners'
                ? 'bg-black text-white shadow-xs'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
          >
            <span>Offer Reels (4 Images)</span>
            <span className="bg-[#05C12F] text-white text-sm font-semibold px-2 py-0.5 rounded-full">
              {bannersList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-black text-white shadow-xs'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
          >
            <span>Staff</span>
            <span className="bg-gray-200 text-black text-sm font-semibold px-2 py-0.5 rounded-full">
              {staffList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'tables'
                ? 'bg-black text-white shadow-xs'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
          >
            <span>Tables &amp; Room QR</span>
            <span className="bg-gray-200 text-black text-sm font-semibold px-2 py-0.5 rounded-full">
              {tables.length + rooms.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('logs');
              fetchReportData();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-black text-white shadow-xs'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
          >
            <span>Activity Logs</span>
            <span className="bg-purple-100 text-purple-900 text-sm font-semibold px-2 py-0.5 rounded-full">
              {reportData.logs.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('report');
              fetchReportData();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'report'
                ? 'bg-black text-white shadow-xs'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }`}
          >
            <span>Reports</span>
            <span className="bg-sky-100 text-black text-sm font-semibold px-2 py-0.5 rounded-full">
              PDF / CSV
            </span>
          </button>
        </div>
      </header>

      {/* ─── Main Content Tabs ─── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-5">
        {/* TAB 1: LIVE ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {(['active', 'all', 'new', 'preparing', 'ready', 'completed'] as const).map((st) => {
                  const count =
                    st === 'all'
                      ? orders.length
                      : st === 'active'
                      ? activeOrdersCount
                      : orders.filter((o) => o.status === st).length;
                  return (
                    <button
                      key={st}
                      onClick={() => setOrderFilter(st)}
                      className={`px-4 py-2 rounded-xl text-base font-semibold capitalize transition-all shrink-0 cursor-pointer ${
                        orderFilter === st
                          ? 'bg-black text-white shadow-2xs'
                          : 'bg-gray-100 text-black hover:bg-gray-200'
                      }`}
                    >
                      {st === 'active' ? `Active Orders (${count})` : `${st} (${count})`}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {(['all', 'table', 'room', 'home'] as const).map((tp) => (
                  <button
                    key={tp}
                    onClick={() => setTypeFilter(tp)}
                    className={`px-3.5 py-2 rounded-xl text-base font-semibold capitalize transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                      typeFilter === tp
                        ? 'bg-[#05C12F] text-white shadow-2xs'
                        : 'bg-gray-100 text-black hover:bg-gray-200'
                    }`}
                  >
                    {tp === 'all'
                      ? `All Types (${countsByType.all})`
                      : tp === 'home'
                      ? `🛍️ Takeaway (${countsByType.home})`
                      : tp === 'room'
                      ? `🏨 Rooms (${countsByType.room})`
                      : `🍽️ Tables (${countsByType.table})`}
                  </button>
                ))}
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center space-y-2 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {typeFilter !== 'all'
                    ? `No ${orderFilter === 'active' ? 'active' : orderFilter} orders for ${typeFilter === 'home' ? 'Takeaway' : typeFilter === 'room' ? 'Rooms' : 'Tables'}`
                    : 'No Orders in this view'}
                </h3>
                {orderFilter !== 'all' && totalCountsByType[typeFilter] > 0 && (
                  <button
                    onClick={() => setOrderFilter('all')}
                    className="mt-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 cursor-pointer"
                  >
                    View past / completed {typeFilter === 'home' ? 'Takeaway' : typeFilter === 'room' ? 'Rooms' : 'Tables'} orders ({totalCountsByType[typeFilter]})
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => {
                  const badge = STATUS_BADGES[order.status] || STATUS_BADGES.new;
                  const channelInfo = getOrderChannelInfo(order);
                  const locationLink = getOrderLocationLink(order);

                  const bundleItems = order.order_items || [];
                  const totalItemsCount = bundleItems.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <div
                      key={order.id}
                      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="text-2xl font-semibold text-black">
                                #{order.order_number}
                              </span>
                              <span className={`text-base font-semibold px-3 py-0.5 rounded-lg border flex items-center gap-1.5 ${channelInfo.badgeClass}`}>
                                <span>{channelInfo.icon}</span>
                                <span>{channelInfo.badgeLabel}</span>
                              </span>
                            </div>
                            <p className="text-base font-normal text-black mt-1">
                              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {order.customer_name && order.customer_name !== 'Dine-in Guest' && order.customer_name !== 'Table Customer' && (
                                <> &bull; <span className="font-semibold">{order.customer_name}</span></>
                              )}
                            </p>
                          </div>

                          <span className={`text-base font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-2 shrink-0 ${badge.bg} ${badge.text}`}>
                            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                            <span>{badge.label}</span>
                          </span>
                        </div>

                        <div className="mt-3 bg-gray-50 rounded-xl p-3.5 border border-gray-200 space-y-2">
                          <div className="flex items-center justify-between text-base font-semibold text-black border-b border-gray-200 pb-2">
                            <span>📦 {totalItemsCount} items</span>
                            <span className="text-xl font-bold text-black">₹{order.total.toFixed(0)}</span>
                          </div>

                          <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pt-1">
                            {bundleItems.map((item, idx) => (
                              <div key={idx} className="flex items-start justify-between text-base font-normal text-black gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className="font-semibold text-black shrink-0">{item.quantity}x</span>
                                  <span className="text-black font-normal truncate">{item.item_name}</span>
                                </div>
                                <span className="font-semibold text-black shrink-0">
                                  ₹{item.total_price.toFixed(0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {order.notes && (
                          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-base font-normal text-black flex items-start gap-2.5">
                            <span className="text-base shrink-0">📝</span>
                            <div>
                              <p className="text-sm font-semibold text-amber-900 uppercase tracking-wide">Customer Note:</p>
                              <p className="text-base font-normal text-black mt-0.5">{order.notes}</p>
                            </div>
                          </div>
                        )}

                        {order.customer_phone && order.customer_phone !== '0000000000' && (
                          <div className="mt-2.5 text-base text-black font-normal flex items-center gap-2">
                            <span>📞</span>
                            <a href={`tel:${order.customer_phone}`} className="text-black font-medium hover:underline">
                              +91 {order.customer_phone}
                            </a>
                          </div>
                        )}

                        {locationLink && (
                          <a
                            href={locationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2.5 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-base font-semibold text-blue-800 transition-colors hover:bg-blue-100"
                          >
                            <span>📍</span>
                            <span>Location</span>
                          </a>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-gray-100 flex flex-wrap gap-2">
                        {(STATUS_ACTIONS[order.status] || []).map((action) => (
                          <button
                            key={action.next}
                            onClick={() => updateOrderStatus(order.id, action.next)}
                            className={`flex-1 py-2.5 px-3.5 rounded-xl text-base font-semibold shadow-2xs transition-all cursor-pointer ${action.color}`}
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
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-base font-normal text-black focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white placeholder:text-gray-500"
                  />
                  {menuSearch && (
                    <button
                      onClick={() => setMenuSearch('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-black hover:text-gray-700"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={selectedCatFilter}
                  onChange={(e) => setSelectedCatFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                className="bg-[#05C12F] hover:bg-[#04A328] text-white font-semibold text-base px-5 py-2.5 rounded-xl shadow-2xs transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <span>+ Add New Dish</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMenuItems.map((item) => {
                const cat = categories.find((c) => c.id === item.category_id);
                return (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-2xs transition-all flex gap-4 ${
                      !item.is_available ? 'opacity-60 border-gray-200 bg-gray-50/50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                          unoptimized={item.image_url.startsWith('http')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="text-lg font-semibold text-black truncate">{item.name}</h3>
                          <span className="text-lg font-bold text-black shrink-0">
                            ₹{item.price.toFixed(0)}
                          </span>
                        </div>
                        <p className="text-base text-black font-medium uppercase mt-0.5">
                          {cat?.name || 'Dish'}
                        </p>
                        {item.description && (
                          <p className="text-base text-black font-normal line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-gray-100 mt-2">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`text-sm font-semibold px-3 py-1 rounded-full border transition-all cursor-pointer ${
                            item.is_available
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-red-50 text-red-800 border-red-300'
                          }`}
                        >
                          {item.is_available ? 'In Stock' : 'Sold Out'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="text-base text-black hover:text-emerald-800 font-medium px-2.5 py-1 hover:bg-gray-100 rounded-lg cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMenuItem(item.id, item.name)}
                            className="text-base text-red-600 hover:text-red-800 font-medium px-2.5 py-1 hover:bg-red-50 rounded-lg cursor-pointer"
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
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <h2 className="text-2xl font-semibold text-black">Menu Categories</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const count = menuItems.filter((i) => i.category_id === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-xl font-semibold text-black">{cat.name}</h3>
                      <p className="text-base text-black font-medium mt-1">{count} Dishes</p>
                      {cat.description && (
                        <p className="text-base text-black font-normal mt-1 line-clamp-1">{cat.description}</p>
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
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <h2 className="text-2xl font-semibold text-black">Staff Members</h2>
              <button
                onClick={() => setIsAddStaffOpen(true)}
                className="bg-[#05C12F] hover:bg-[#04A328] text-white font-semibold text-base px-5 py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                + Add Staff Member
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map((st) => (
                <div
                  key={st.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-black">{st.name}</h3>
                      <p className="text-base text-black font-normal">{st.email}</p>
                      <p className="text-base text-black font-medium">{st.phone}</p>
                    </div>
                    <span
                      className={`text-base font-semibold px-3 py-1 rounded-full border capitalize ${
                        st.role === 'owner'
                          ? 'bg-purple-50 text-purple-900 border-purple-300'
                          : st.role === 'kitchen'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : st.role === 'manager'
                          ? 'bg-blue-50 text-blue-900 border-blue-300'
                          : 'bg-gray-100 text-black border border-gray-300'
                      }`}
                    >
                      {st.role}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => handleDeleteStaff(st.id, st.name)}
                      className="text-base text-red-600 hover:text-red-800 font-medium hover:bg-red-50 px-3 py-1 rounded-lg cursor-pointer"
                    >
                      Remove Access
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: TABLES & ROOMS */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <h2 className="text-2xl font-semibold text-black">QR Codes for Tables &amp; Rooms</h2>

              <div className="flex items-center gap-2">
                <div className="bg-gray-100 p-1 rounded-xl flex items-center">
                  <button
                    onClick={() => setQrViewMode('tables')}
                    className={`px-4 py-2 rounded-lg text-base font-semibold transition-all cursor-pointer ${
                      qrViewMode === 'tables' ? 'bg-white text-black shadow-xs' : 'text-black'
                    }`}
                  >
                    Tables ({tables.length})
                  </button>
                  <button
                    onClick={() => setQrViewMode('rooms')}
                    className={`px-4 py-2 rounded-lg text-base font-semibold transition-all cursor-pointer ${
                      qrViewMode === 'rooms' ? 'bg-white text-black shadow-xs' : 'text-black'
                    }`}
                  >
                    Rooms ({rooms.length})
                  </button>
                </div>

                {qrViewMode === 'tables' ? (
                  <button
                    onClick={() => setIsAddTableOpen(true)}
                    className="bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold px-4 py-2 rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    + Add Table
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAddRoomOpen(true)}
                    className="bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold px-4 py-2 rounded-xl shadow-2xs transition-all cursor-pointer"
                  >
                    + Add Room
                  </button>
                )}
              </div>
            </div>

            {/* Subtab 1: Dining Tables Grid */}
            {qrViewMode === 'tables' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-emerald-50 text-black font-semibold flex items-center justify-center text-base border border-emerald-300">
                          {t.table_number}
                        </span>
                        <div>
                          <h3 className="text-xl font-semibold text-black">Table {t.table_number}</h3>
                          <p className="text-base text-black font-medium">Capacity: {t.capacity} Guests</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTable(t.id, t.table_number)}
                        className="text-red-500 hover:text-red-700 text-lg font-semibold p-1.5 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="bg-gray-100 rounded-xl p-2.5 text-center text-base font-mono font-medium text-black truncate border border-gray-200">
                      Token: {t.qr_token}
                    </div>

                    <button
                      onClick={() => showQRModal(`Table ${t.table_number}`, 'DINE-IN ORDERING', 'table', t.qr_token)}
                      className="w-full bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold py-2.5 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>📷 Print Table QR Stand</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Subtab 2: Hotel Rooms Grid */}
            {qrViewMode === 'rooms' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-emerald-50 text-black font-semibold flex items-center justify-center text-base border border-emerald-300">
                          {r.room_number}
                        </span>
                        <div>
                          <h3 className="text-xl font-semibold text-black">Room {r.room_number}</h3>
                          <p className="text-base text-black font-medium">{r.floor || 'Guest Room'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold bg-blue-50 text-black border border-blue-300 px-2.5 py-0.5 rounded-full">
                          Room Service
                        </span>
                        <button
                          onClick={() => handleDeleteRoom(r.id, `Room ${r.room_number}`)}
                          className="text-red-500 hover:text-red-700 text-lg font-semibold p-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-100 rounded-xl p-2.5 text-center text-base font-mono font-medium text-black truncate border border-gray-200">
                      Token: {r.qr_token}
                    </div>

                    <button
                      onClick={() => showQRModal(`Room ${r.room_number}`, r.floor ? `${r.floor} • In-Room Dining` : 'In-Room Dining', 'room', r.qr_token)}
                      className="w-full bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold py-2.5 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>📷 Print Room QR Stand</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: OFFER REEL IMAGES (4 SLIDES MANAGED BY ADMIN) ─── */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-black">
                  Offer Reel Images (4 Slides)
                </h2>
                <span className="text-base font-semibold bg-emerald-100 text-black px-3.5 py-0.5 rounded-full border border-emerald-300">
                  {bannersList.filter((b) => b.is_active).length} Active of {bannersList.length}
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button
                  onClick={handleResetBanners}
                  variant="outline"
                  className="text-base font-semibold border-gray-300 text-black hover:bg-gray-100 cursor-pointer py-2.5 px-4 rounded-xl"
                >
                  Reset Defaults
                </Button>
                <Button
                  onClick={() => handleSaveBanners(bannersList)}
                  disabled={isSavingBanners}
                  className="bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  {isSavingBanners ? 'Saving...' : 'Publish Banners'}
                </Button>
              </div>
            </div>

            {bannerSaveMsg && (
              <div className="bg-emerald-50 border border-emerald-300 text-black px-4 py-3 rounded-xl text-base font-semibold flex items-center gap-2 animate-in fade-in">
                <span>✓</span>
                <span>{bannerSaveMsg}</span>
              </div>
            )}

            {/* Banners Grid / List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {bannersList.map((banner, index) => {
                return (
                  <div
                    key={banner.id || index}
                    className={`bg-white border rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
                      banner.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'
                    }`}
                  >
                    {/* Live Image Banner Preview */}
                    <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-gray-900 overflow-hidden group">
                      <Image
                        src={banner.image_url}
                        alt={banner.title}
                        fill
                        className="object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                        sizes="500px"
                        unoptimized={banner.image_url.startsWith('http')}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-between p-4 text-white">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-white/20 text-white">
                            Reel Slide #{index + 1}
                          </span>
                          <span className="text-sm font-semibold bg-[#05C12F] text-white px-3 py-0.5 rounded-full shadow-xs uppercase">
                            {banner.badge || 'OFFER'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xl font-semibold text-white line-clamp-1">{banner.title}</p>
                          <p className="text-base font-medium text-white line-clamp-1 opacity-95">{banner.subtitle}</p>
                        </div>
                      </div>
                    </div>

                    {/* Banner Controls & Fields */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <label className="text-base font-semibold text-black">Slide Status</label>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = bannersList.map((b, i) =>
                                i === index ? { ...b, is_active: !b.is_active } : b
                              );
                              setBannersList(updated);
                            }}
                            className={`text-base font-semibold px-3 py-1 rounded-full cursor-pointer transition-colors ${
                              banner.is_active
                                ? 'bg-emerald-50 text-black border border-emerald-300'
                                : 'bg-gray-100 text-black border border-gray-300'
                            }`}
                          >
                            {banner.is_active ? '● Active' : '○ Hidden'}
                          </button>
                        </div>

                        <div>
                          <label className="text-base font-semibold text-black">
                            Headline / Title
                          </label>
                          <input
                            type="text"
                            value={banner.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBannersList((prev) =>
                                prev.map((b, i) => (i === index ? { ...b, title: val } : b))
                              );
                            }}
                            className="mt-1 w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black focus:bg-white focus:ring-1 focus:ring-[#05C12F] outline-none"
                            placeholder="e.g. Royal Delux Thali Feast"
                          />
                        </div>

                        <div>
                          <label className="text-base font-semibold text-black">
                            Offer Badge
                          </label>
                          <input
                            type="text"
                            value={banner.badge}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBannersList((prev) =>
                                prev.map((b, i) => (i === index ? { ...b, badge: val } : b))
                              );
                            }}
                            className="mt-1 w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black focus:bg-white focus:ring-1 focus:ring-[#05C12F] outline-none"
                            placeholder="e.g. 20% OFF or SPECIAL COMBO"
                          />
                        </div>

                        <div>
                          <label className="text-base font-semibold text-black">
                            Offer Subtitle / Description
                          </label>
                          <input
                            type="text"
                            value={banner.subtitle}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBannersList((prev) =>
                                prev.map((b, i) => (i === index ? { ...b, subtitle: val } : b))
                              );
                            }}
                            className="mt-1 w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black focus:bg-white focus:ring-1 focus:ring-[#05C12F] outline-none"
                            placeholder="e.g. Flat 20% OFF on all authentic platters"
                          />
                        </div>

                        <div>
                          <label className="text-base font-semibold text-black">
                            Banner Image
                          </label>
                          <div className="mt-1 space-y-2">
                            {/* File Upload Button */}
                            <label
                              htmlFor={`banner-upload-${index}`}
                              className={`flex items-center justify-center gap-2.5 w-full border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer transition-all ${
                                bannerUploadStates[index] === 'uploading'
                                  ? 'border-amber-400 bg-amber-50 text-black'
                                  : bannerUploadStates[index] === 'done'
                                  ? 'border-emerald-400 bg-emerald-50 text-black'
                                  : bannerUploadStates[index] === 'error'
                                  ? 'border-red-400 bg-red-50 text-red-700'
                                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-black'
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <span className="text-base font-medium text-black">
                                {bannerUploadStates[index] === 'uploading'
                                  ? 'Uploading & converting to WebP...'
                                  : bannerUploadStates[index] === 'done'
                                  ? '✓ Image uploaded (WebP <200KB)'
                                  : bannerUploadStates[index] === 'error'
                                  ? 'Upload failed — try again'
                                  : 'Click to upload image (auto WebP <200KB)'}
                              </span>
                              <input
                                id={`banner-upload-${index}`}
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                disabled={bannerUploadStates[index] === 'uploading'}
                                onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  if (!f) return;
                                  setBannerUploadStates((prev) => ({ ...prev, [index]: 'uploading' }));
                                  try {
                                    const fd = new FormData();
                                    fd.append('file', f);
                                    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
                                    const data = await res.json();
                                    if (res.ok && data.url) {
                                      setBannersList((prev) =>
                                        prev.map((b, i) => (i === index ? { ...b, image_url: data.url } : b))
                                      );
                                      setBannerUploadStates((prev) => ({ ...prev, [index]: 'done' }));
                                      setTimeout(() => setBannerUploadStates((prev) => ({ ...prev, [index]: 'idle' })), 3000);
                                    } else {
                                      setBannerUploadStates((prev) => ({ ...prev, [index]: 'error' }));
                                      setTimeout(() => setBannerUploadStates((prev) => ({ ...prev, [index]: 'idle' })), 4000);
                                    }
                                  } catch {
                                    setBannerUploadStates((prev) => ({ ...prev, [index]: 'error' }));
                                    setTimeout(() => setBannerUploadStates((prev) => ({ ...prev, [index]: 'idle' })), 4000);
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            {/* Current image URL (read-only display) */}
                            {banner.image_url && (
                              <p className="text-sm font-normal text-black truncate px-1" title={banner.image_url}>
                                {banner.image_url}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-base text-black font-medium">
                        <span>Position {index + 1} of {bannersList.length}</span>
                        <button
                          type="button"
                          onClick={() => handleSaveBanners(bannersList)}
                          className="font-semibold text-[#05C12F] hover:underline cursor-pointer"
                        >
                          Save changes ›
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB: ACTIVITY LOGS ─── */}
        {activeTab === 'logs' && (
          <div className="space-y-5">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-semibold text-black">System &amp; Activity Logs</h2>
                  <span className="text-base font-semibold bg-purple-100 text-purple-900 border border-purple-300 px-3 py-0.5 rounded-full">
                    Admin Only
                  </span>
                </div>
                <p className="text-base font-normal text-black mt-1">
                  Audit trail of staff logins, order events, staff updates, and administrative notes
                </p>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button
                  onClick={fetchReportData}
                  disabled={reportLoading}
                  variant="outline"
                  className="text-base font-semibold border-gray-300 text-black hover:bg-gray-100 cursor-pointer py-2.5 px-4 rounded-xl"
                >
                  {reportLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button
                  onClick={() => setIsAddLogOpen(true)}
                  className="bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold px-5 py-2.5 rounded-xl cursor-pointer shadow-sm"
                >
                  + Create Log Entry
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {(['all', 'info', 'success', 'warning', 'error'] as const).map((lvl) => {
                const count = lvl === 'all'
                  ? reportData.logs.length
                  : reportData.logs.filter((log) => log.level === lvl).length;
                return (
                  <button
                    key={lvl}
                    onClick={() => setActivityLogLevel(lvl)}
                    className={`px-4 py-2 rounded-xl text-base font-medium capitalize transition-all cursor-pointer shrink-0 ${
                      activityLogLevel === lvl
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-white text-black hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {lvl === 'all' ? `All Events (${count})` : `${lvl} (${count})`}
                  </button>
                );
              })}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
              {filteredActivityLogs.length === 0 ? (
                <div className="p-12 text-center text-black">
                  <p className="text-xl font-semibold text-black">No log entries found</p>
                  <p className="text-base text-black mt-1">Log events will appear as staff login and manage the portal.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredActivityLogs.map((log) => {
                    const levelStyles: Record<string, string> = {
                      success: 'bg-emerald-50 text-emerald-900 border-emerald-300',
                      warning: 'bg-amber-50 text-amber-900 border-amber-300',
                      error: 'bg-red-50 text-red-900 border-red-300',
                      info: 'bg-blue-50 text-blue-900 border-blue-300',
                    };
                    const badge = levelStyles[log.level] || levelStyles.info;
                    const dateFormatted = new Date(log.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <div key={log.id} className="p-4 sm:p-5 hover:bg-gray-50/60 transition-colors">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-lg text-black">{log.action}</span>
                          <span className={`text-sm px-2.5 py-0.5 rounded-full border uppercase font-semibold ${badge}`}>
                            {log.level}
                          </span>
                          {log.metadata?.manual_entry && (
                            <span className="text-sm bg-purple-50 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-full font-medium">
                              Manual Note
                            </span>
                          )}
                        </div>
                        <p className="text-base text-black font-normal leading-relaxed">{log.details}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-base text-black font-medium">
                          <span>
                            Actor: <strong className="text-black font-semibold">{log.actor_name}</strong> ({log.actor_role})
                          </span>
                          <span>&bull;</span>
                          <span className="font-normal">{dateFormatted}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: REPORTS ─── */}
        {activeTab === 'report' && (
          <div className="space-y-5">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-black">Reports &amp; Exports</h2>
                    <span className="text-base font-semibold bg-sky-100 text-sky-900 border border-sky-300 px-3 py-0.5 rounded-full">
                      Admin Only
                    </span>
                  </div>
                  <p className="text-base font-normal text-black mt-1">
                    Filter records, preview the result, and download a CSV or PDF report.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    onClick={fetchReportData}
                    disabled={reportLoading}
                    variant="outline"
                    className="text-base font-semibold border-gray-300 text-black hover:bg-gray-100 cursor-pointer py-2.5 px-4 rounded-xl"
                  >
                    {reportLoading ? 'Loading...' : '🔄 Refresh'}
                  </Button>
                  {reportType === 'logs' && (
                    <Button
                      onClick={() => setIsAddLogOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-base font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
                    >
                      + Create Log Entry
                    </Button>
                  )}
                  <Button
                    onClick={() => downloadReportCsv(reportTable)}
                    className="bg-black hover:bg-gray-800 text-white text-base font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    ⬇ Download CSV
                  </Button>
                  <Button
                    onClick={() => openReportPdf(reportTable, reportFilterSummary)}
                    className="bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    📄 Download PDF
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Report Type</span>
                  <select
                    value={reportType}
                    onChange={(event) => setReportType(event.target.value as ReportType)}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {REPORT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                {(reportType === 'orders' || reportType === 'sales' || reportType === 'logs') && (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">From date</span>
                      <input
                        type="date"
                        value={reportFrom}
                        onChange={(event) => setReportFrom(event.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">To date</span>
                      <input
                        type="date"
                        value={reportTo}
                        onChange={(event) => setReportTo(event.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </label>
                  </>
                )}

                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Search</span>
                  <input
                    type="text"
                    value={reportSearch}
                    onChange={(event) => setReportSearch(event.target.value)}
                    placeholder="Order #, customer, phone, item, staff, table, log..."
                    className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </label>

                {(reportType === 'orders' || reportType === 'sales') && (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Order type</span>
                      <select
                        value={reportOrderType}
                        onChange={(event) =>
                          setReportOrderType(event.target.value as 'all' | 'table' | 'room' | 'home')
                        }
                        className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">All types</option>
                        <option value="table">Table</option>
                        <option value="room">Room</option>
                        <option value="home">Takeaway / Home</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Order status</span>
                      <select
                        value={reportOrderStatus}
                        onChange={(event) => setReportOrderStatus(event.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">All statuses</option>
                        {REPORT_ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Payment</span>
                      <select
                        value={reportPayment}
                        onChange={(event) => setReportPayment(event.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">All payments</option>
                        {REPORT_PAYMENT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                {reportType === 'menu' && (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Category</span>
                      <select
                        value={reportMenuCategory}
                        onChange={(event) => setReportMenuCategory(event.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">All categories</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Veg type</span>
                      <select
                        value={reportVegType}
                        onChange={(event) => setReportVegType(event.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">All types</option>
                        <option value="veg">Veg</option>
                        <option value="non_veg">Non-veg</option>
                        <option value="egg">Egg</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Availability</span>
                      <select
                        value={reportAvailability}
                        onChange={(event) => setReportAvailability(event.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">All items</option>
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </label>
                  </>
                )}

                {reportType === 'staff' && (
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Role</span>
                    <select
                      value={reportStaffRole}
                      onChange={(event) => setReportStaffRole(event.target.value)}
                      className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="all">All roles</option>
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="kitchen">Kitchen</option>
                      <option value="staff">Staff</option>
                    </select>
                  </label>
                )}

                {reportType === 'tables' && (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Asset type</span>
                      <select
                        value={reportAssetType}
                        onChange={(event) =>
                          setReportAssetType(event.target.value as 'all' | 'table' | 'room')
                        }
                        className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">Tables &amp; rooms</option>
                        <option value="table">Tables only</option>
                        <option value="room">Rooms only</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Status</span>
                      <select
                        value={reportAssetStatus}
                        onChange={(event) => setReportAssetStatus(event.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="all">All statuses</option>
                        {reportAssetStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                {reportType === 'logs' && (
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">Log level</span>
                    <select
                      value={reportLogLevel}
                      onChange={(event) => setReportLogLevel(event.target.value)}
                      className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-base font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="all">All levels</option>
                      <option value="info">Info</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </label>
                )}

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleResetReportFilters}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-black text-base font-semibold px-4 py-2.5 rounded-xl border border-gray-300 transition-colors cursor-pointer"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {reportTable.summary.map((item) => (
                <div
                  key={item.label}
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs"
                >
                  <p className="text-base font-medium text-black">{item.label}</p>
                  <p className="text-2xl font-bold text-black mt-1">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-semibold text-black">{reportTable.title}</h3>
                  <p className="text-base font-normal text-black mt-0.5">
                    {reportTable.rows.length} records found
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-600">
                  Preview shows first 200 rows. Exports include every filtered record.
                </p>
              </div>

              {reportLoading ? (
                <div className="p-12 text-center text-black">
                  <p className="text-xl font-semibold">Loading report data...</p>
                </div>
              ) : reportTable.rows.length === 0 ? (
                <div className="p-12 text-center text-black">
                  <p className="text-4xl mb-2">📊</p>
                  <p className="text-xl font-semibold">No records match these filters</p>
                  <p className="text-base mt-1">Adjust the report type, date range, or search terms.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-base">
                      <thead className="bg-gray-50">
                        <tr>
                          {reportTable.columns.map((column) => (
                            <th
                              key={column.label}
                              className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-700 whitespace-nowrap"
                            >
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reportTable.rows.slice(0, 200).map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-50/70">
                            {row.map((cell, cellIndex) => (
                              <td
                                key={cellIndex}
                                className="px-4 py-2.5 text-base font-normal text-black align-top"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reportTable.rows.length > 200 && (
                    <p className="px-5 py-3 text-sm font-medium text-gray-600 border-t border-gray-200 bg-gray-50">
                      Showing the first 200 of {reportTable.rows.length} records. Download CSV or PDF
                      to get the complete report.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: ADD DISH */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-2xl font-semibold text-black">Add New Menu Dish</h3>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 text-base font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewItem} className="space-y-4">
              <div>
                <label className="block text-base font-semibold text-black mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paneer Butter Masala"
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black focus:ring-1 focus:ring-[#05C12F] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-base font-semibold text-black mb-1">Category *</label>
                  <select
                    value={newItemForm.category_id}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category_id: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-semibold text-black mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="240"
                    value={newItemForm.price}
                    onChange={(e) => setNewItemForm({ ...newItemForm, price: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-semibold text-black mb-1">Photo URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newItemForm.image_url}
                  onChange={(e) => setNewItemForm({ ...newItemForm, image_url: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-black mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Rich tomato gravy, cottage cheese cubes, fresh cream & kasuri methi"
                  value={newItemForm.description}
                  onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="featured"
                  checked={newItemForm.is_featured}
                  onChange={(e) => setNewItemForm({ ...newItemForm, is_featured: e.target.checked })}
                  className="rounded text-[#05C12F] focus:ring-[#05C12F] w-5 h-5 cursor-pointer"
                />
                <label htmlFor="featured" className="text-base font-medium text-black cursor-pointer">
                  Tag as Popular Special
                </label>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  variant="outline"
                  className="flex-1 text-base font-semibold border-gray-300 text-black hover:bg-gray-100 rounded-xl py-2.5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold rounded-xl py-2.5 cursor-pointer"
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
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-2xl font-semibold text-black">Edit Menu Item</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 text-base font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="space-y-4">
              <div>
                <label className="block text-base font-semibold text-black mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-base font-semibold text-black mb-1">Category</label>
                  <select
                    value={editingItem.category_id}
                    onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-semibold text-black mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-semibold text-black mb-1">Photo URL</label>
                <input
                  type="url"
                  value={editingItem.image_url || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-black mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  variant="outline"
                  className="flex-1 text-base font-semibold border-gray-300 text-black hover:bg-gray-100 rounded-xl py-2.5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold rounded-xl py-2.5 cursor-pointer"
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
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-2xl font-semibold text-black">Add Staff Member</h3>
              <button
                onClick={() => setIsAddStaffOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 text-base font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-base font-semibold text-black mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newStaffForm.name}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-black mb-1">
                  Email Address <span className="text-sm font-normal text-black">(optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="ramesh@krishnaanandam.com"
                  value={newStaffForm.email}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                />
                <p className="text-sm text-black font-normal mt-1">If left blank, staff can login with their mobile number + password.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-base font-semibold text-black mb-1">10-Digit Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    pattern="[0-9]{10}"
                    placeholder="9876543210"
                    value={newStaffForm.phone}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setNewStaffForm({ ...newStaffForm, phone: clean });
                    }}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                  />
                  <p className="text-sm text-black font-normal mt-1">Must be exactly 10 digits for mobile login.</p>
                </div>

                <div>
                  <label className="block text-base font-semibold text-black mb-1">Role *</label>
                  <select
                    value={newStaffForm.role}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                  >
                    <option value="staff">Staff / Waiter</option>
                    <option value="kitchen">Kitchen Chef</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-base font-semibold text-black mb-1">Login Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newStaffForm.password}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  variant="outline"
                  className="flex-1 text-base font-semibold border-gray-300 text-black hover:bg-gray-100 rounded-xl py-2.5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold rounded-xl py-2.5 cursor-pointer"
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
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-2xl font-semibold text-black">Add Dining Table</h3>
              <button
                onClick={() => setIsAddTableOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 text-base font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-base font-semibold text-black mb-1">Table Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. T04"
                  value={newTableForm.table_number}
                  onChange={(e) => setNewTableForm({ ...newTableForm, table_number: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-black mb-1">Guest Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newTableForm.capacity}
                  onChange={(e) => setNewTableForm({ ...newTableForm, capacity: parseInt(e.target.value) || 2 })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  variant="outline"
                  className="flex-1 text-base font-semibold border-gray-300 text-black hover:bg-gray-100 rounded-xl py-2.5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold rounded-xl py-2.5 cursor-pointer"
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
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-2xl font-semibold text-black">Add Hotel Room</h3>
              <button
                onClick={() => setIsAddRoomOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 text-base font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-4">
              <div>
                <label className="block text-base font-semibold text-black mb-1">Room Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, 202, Suite 01"
                  value={newRoomForm.room_number}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, room_number: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-black mb-1">Floor / Section</label>
                <input
                  type="text"
                  placeholder="e.g. 1st Floor, 2nd Floor"
                  value={newRoomForm.floor}
                  onChange={(e) => setNewRoomForm({ ...newRoomForm, floor: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  variant="outline"
                  className="flex-1 text-base font-semibold border-gray-300 text-black hover:bg-gray-100 rounded-xl py-2.5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold rounded-xl py-2.5 cursor-pointer"
                >
                  Add Room
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: PRINTABLE QR CODE STAND CARD */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-2xl font-semibold text-black">{selectedQR.name} Stand Card</h3>
              <button
                onClick={() => setSelectedQR(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 text-base font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div
              id="qr-stand-card"
              className="bg-white border-2 border-emerald-600 rounded-2xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-lg font-semibold text-black tracking-wider">KRISHNA ANANDAM</span>
              </div>
              <p className="text-sm font-semibold bg-emerald-50 text-black border border-emerald-300 px-3 py-1 rounded-full inline-block">
                {selectedQR.type === 'room' ? 'IN-ROOM DINING & ROOM SERVICE' : '100% PURE VEG RESTAURANT'}
              </p>

              <div className="relative w-48 h-48 mx-auto bg-white p-2 rounded-xl border border-gray-200 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedQR.qrDataUrl} alt="Table QR" className="w-full h-full object-contain rounded-lg" />
              </div>

              <div>
                <p className="text-xl font-semibold text-black">{selectedQR.name}</p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
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
                            h1 { color: #000000; margin: 0; font-size: 20px; font-weight: 600; }
                            p { color: #059669; margin: 6px 0 16px 0; font-size: 14px; font-weight: 500; }
                            img { width: 200px; height: 200px; margin: 12px 0; }
                            .table { font-size: 24px; font-weight: 600; color: #000000; margin-top: 10px; }
                          </style>
                        </head>
                        <body>
                          <div class="card">
                            <h1>KRISHNA ANANDAM</h1>
                            <p>${selectedQR.type === 'room' ? 'IN-ROOM DINING • ROOM SERVICE' : '100% PURE VEGETARIAN'}</p>
                            <img src="${selectedQR.qrDataUrl}" />
                            <div class="table">${selectedQR.name}</div>
                          </div>
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                    printWin.focus();
                    printWin.print();
                  }
                }}
                className="flex-1 bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold py-2.5 rounded-xl shadow-2xs cursor-pointer"
              >
                🖨️ Print Stand Card
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: CREATE LOG ENTRY (ADMIN ONLY) */}
      {isAddLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-2xl font-semibold text-black">Create Log Entry</h3>
                <p className="text-base font-normal text-black mt-0.5">Record a system note or audit entry</p>
              </div>
              <button
                onClick={() => setIsAddLogOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 text-base font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLogEntry} className="space-y-4">
              <div>
                <label className="block text-base font-semibold text-black mb-1">Log Action *</label>
                <select
                  value={newLogForm.action}
                  onChange={(e) => setNewLogForm({ ...newLogForm, action: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                >
                  <option value="SYSTEM_NOTE">System Note</option>
                  <option value="SHIFT_HANDOVER">Shift Handover</option>
                  <option value="CASH_COUNT">Cash / Counter Audit</option>
                  <option value="INVENTORY_CHECK">Stock &amp; Inventory Check</option>
                  <option value="MAINTENANCE">Equipment / Facility Maintenance</option>
                  <option value="SECURITY_AUDIT">Security Audit</option>
                </select>
              </div>

              <div>
                <label className="block text-base font-semibold text-black mb-1">Severity Level *</label>
                <select
                  value={newLogForm.level}
                  onChange={(e) => setNewLogForm({ ...newLogForm, level: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="success">Success (Green)</option>
                  <option value="warning">Warning (Yellow)</option>
                  <option value="error">Error (Red)</option>
                </select>
              </div>

              <div>
                <label className="block text-base font-semibold text-black mb-1">Details / Note *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter detailed audit notes, observations, or incident report..."
                  value={newLogForm.details}
                  onChange={(e) => setNewLogForm({ ...newLogForm, details: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 text-base font-normal text-black focus:bg-white focus:ring-1 focus:ring-[#05C12F]"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  onClick={() => setIsAddLogOpen(false)}
                  variant="outline"
                  className="flex-1 text-base font-semibold border-gray-300 text-black hover:bg-gray-100 rounded-xl py-2.5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="flex-1 bg-[#05C12F] hover:bg-[#04A328] text-white text-base font-semibold rounded-xl py-2.5 cursor-pointer shadow-xs"
                >
                  {isSubmittingLog ? 'Saving...' : 'Save Log Entry'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
