# Menu Ordering System - Updated Flow

## ✅ Changes Completed

The app has been updated to allow customers to browse the menu **without scanning a QR code first**.

---

## New Customer Flow

### 1. Direct Menu Access
- Visit: **http://localhost:3000**
- Automatically redirects to menu
- Browse all items without QR code
- Add items to bucket

### 2. Checkout with Options
When customer clicks "View Bucket" → "Checkout", they will:

**Step 1: Enter Details**
- Name
- Mobile Number
- Special Instructions (optional)

**Step 2: Choose Order Method**
After entering details, customer sees 2 options:

#### Option A: Scan QR Code 📱
- For table or room service
- Customer scans QR code on their table/room
- Order is linked to specific table/room

#### Option B: Place Order Manually ✍️
- Customer places order without QR
- Staff will confirm table/location when delivering
- Order goes directly to dashboard

---

## QR Code Flow (Still Available)

Customers can still scan QR first:
1. Scan QR code: `http://localhost:3000/q?t=T01-XYZ789`
2. Browse menu with session
3. Checkout automatically uses QR session
4. No need to choose order method (already has QR session)

---

## How It Works

### Without QR (New Flow)
```
Homepage → Menu → Add Items → Checkout
  ↓
Enter Name & Phone
  ↓
Choose: [Scan QR] or [Manual Order]
  ↓
Order Created → Dashboard
```

### With QR (Original Flow)
```
Scan QR → Menu → Add Items → Checkout
  ↓
Enter Name & Phone
  ↓
Order Created (auto-linked to table) → Dashboard
```

---

## Benefits

### For Customers
✅ Can browse menu before arriving at restaurant
✅ Can start ordering without QR code
✅ Flexibility to scan QR later at checkout
✅ Can place order even without QR (manual mode)

### For Restaurant
✅ Customers can browse menu online
✅ Orders with QR are automatically linked to tables
✅ Manual orders still captured (staff confirms location)
✅ All orders appear in dashboard regardless of method

---

## Testing the New Flow

### Test 1: Manual Order (No QR)
1. Open: http://localhost:3000
2. Browse menu and add items
3. Click "View Bucket" → "Checkout"
4. Enter name: `John Doe`, phone: `9876543210`
5. Click "Continue"
6. Select "Place Order Manually"
7. Order appears in dashboard without table assignment

### Test 2: Order with QR at Checkout
1. Open: http://localhost:3000
2. Browse menu and add items
3. Click "View Bucket" → "Checkout"
4. Enter name and phone
5. Click "Continue"
6. Select "Scan QR Code"
7. Scan: http://localhost:3000/q?t=T01-XYZ789
8. Order gets linked to Table T01

### Test 3: QR First (Original)
1. Scan: http://localhost:3000/q?t=T01-XYZ789
2. Browse menu and add items
3. Checkout automatically uses QR session
4. Order linked to Table T01

---

## Dashboard View

Staff dashboard shows all orders:
- Orders **with QR**: Shows table/room number (e.g., "Table T01")
- Orders **without QR**: Shows "Manual Order" (staff confirms location)

---

## Technical Changes

### Files Modified
1. `app/page.tsx` - Auto-redirect to menu
2. `app/api/restaurants/default/route.ts` - New API to get default restaurant
3. `app/checkout/page.tsx` - Two-step checkout with order method selection
4. `lib/validation/orders.ts` - Added `skip_session` flag
5. `app/api/orders/route.ts` - Handle manual orders without QR session

### Database Impact
- No schema changes needed
- Manual orders have `table_id = null` and `room_id = null`
- QR orders still linked to specific tables/rooms

---

## Next Steps

1. **Run database setup** (if not done):
   - Open: https://supabase.com/dashboard/project/mjgneisuyrlvvcjtdaaz/sql
   - Paste contents of `setup-database.sql`
   - Click RUN

2. **Create staff user** (see QUICK_START.md)

3. **Test the app**:
   - App is running at: http://localhost:3000
   - Staff dashboard: http://localhost:3000/login

---

## Future Enhancements

- Table selection dropdown for manual orders
- Location detection for nearby tables
- Table availability status
- Queue management for manual orders

---

**App is ready! Customers can now browse and order with or without QR codes.**
