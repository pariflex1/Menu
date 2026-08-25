# Quick Start Guide - QR Ordering System

## Current Status
✅ App code is complete (Phases 1-7, 9)
✅ Environment variables configured
✅ Dependencies installed
⏳ Database setup needed

---

## Step 1: Setup Database (5 minutes)

### Option A: Via Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/mjgneisuyrlvvcjtdaaz/sql/new
   - Or: Dashboard → SQL Editor → New Query

2. **Run the setup script**
   - Open the file `setup-database.sql` in your project root
   - Copy ALL contents (Ctrl+A, Ctrl+C)
   - Paste into Supabase SQL Editor
   - Click **RUN** (or press Ctrl+Enter)
   - Wait for "Success. No rows returned" message

3. **Verify tables created**
   - Go to: Table Editor
   - You should see tables: restaurants, tables, rooms, menu_items, orders, etc.

---

## Step 2: Create Your First Staff User (3 minutes)

### Create Auth User
1. Go to: https://supabase.com/dashboard/project/mjgneisuyrlvvcjtdaaz/auth/users
2. Click **Add user** → **Create new user**
3. Enter:
   - Email: `owner@restaurant.com`
   - Password: Choose a strong password (remember it!)
   - Auto Confirm User: ✅ (check this)
4. Click **Create user**
5. **COPY THE USER'S UUID** (you'll see it in the list, format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

### Link User to Restaurant
1. Go to: Table Editor → user_profiles
2. Click **Insert** → **Insert row**
3. Fill in:
   - `user_id`: Paste the UUID you copied above
   - `restaurant_id`: `11111111-1111-1111-1111-111111111111`
   - `name`: `Restaurant Owner`
   - `role`: `owner`
   - `phone`: `+91 9876543210` (optional)
4. Click **Save**

---

## Step 3: Start the App

Open terminal in project folder and run:
```bash
npm run dev
```

The app will start at: **http://localhost:3000**

---

## Step 4: Test the Complete Flow (5 minutes)

### A. Staff Login
1. Go to: http://localhost:3000/login
2. Login with:
   - Email: `owner@restaurant.com`
   - Password: (the one you set in Step 2)
3. You should be redirected to: http://localhost:3000/dashboard

### B. Simulate Customer QR Scan (Open in Incognito/Private Window)
1. Open new **incognito/private browser window**
2. Go to: http://localhost:3000/q?t=T01-XYZ789
   - This simulates scanning Table 1's QR code
3. You'll be redirected to the menu

### C. Place an Order (Customer View)
1. Browse menu items
2. Click **Add** on any items
3. Click **View Bucket** (bottom bar)
4. Review your items
5. Click **Checkout**
6. Fill in:
   - Name: `John Doe`
   - Phone: `9876543210`
7. Click **Place Order**
8. You'll see order confirmation with order number

### D. Manage Order (Staff View)
1. Go back to your staff dashboard window
2. The new order should appear automatically (refreshes every 3 seconds)
3. Click status buttons in order:
   - **Accept** → **Preparing** → **Ready** → **Served**
4. Go back to customer window - status updates in real-time!

---

## What's Included (Demo Data)

### Restaurant
- **Name:** The Grand Bistro
- **Address:** 123 MG Road, Bangalore
- **Tax:** 5%
- **Hours:** 9:00 AM - 11:00 PM

### Tables (QR Tokens)
- Table T01: `http://localhost:3000/q?t=T01-XYZ789`
- Table T02: `http://localhost:3000/q?t=T02-ABC456`
- Table T03: `http://localhost:3000/q?t=T03-DEF123`

### Rooms (QR Tokens)
- Room 101: `http://localhost:3000/q?t=R101-GHI789`
- Room 102: `http://localhost:3000/q?t=R102-JKL012`
- Room 201: `http://localhost:3000/q?t=R201-MNO345`

### Menu Items
**Starters:**
- Paneer Tikka (₹280)
- Chicken 65 (₹320)
- Veg Spring Rolls (₹180)

**Main Course:**
- Butter Paneer (₹260)
- Chicken Butter Masala (₹340)
- Dal Makhani (₹220)
- Veg Biryani (₹240)

**Beverages:**
- Masala Chai (₹40)
- Fresh Lime Soda (₹60)
- Cold Coffee (₹120)

**Desserts:**
- Gulab Jamun (₹100)
- Chocolate Brownie (₹160)

---

## Admin Features Available

### Dashboard (http://localhost:3000/dashboard)
- Real-time order monitoring
- Filter by order type (Table/Room/Home)
- Order status management
- Auto-refresh every 3 seconds

### Menu Management
- Add/edit/delete categories
- Add/edit/delete menu items
- Toggle item availability
- Set prices and descriptions
- Upload images (via Supabase Storage)

### Table & Room Management
- Add/edit/delete tables
- Add/edit/delete rooms
- Generate QR codes
- Set capacity and status

---

## Troubleshooting

### "Invalid environment variables"
- Check `.env.local` exists and has all keys filled
- Restart dev server: Stop (Ctrl+C) and run `npm run dev` again

### "No staff access configured"
- Make sure user_profiles row has correct `user_id` matching your Supabase Auth user
- Check `restaurant_id` is `11111111-1111-1111-1111-111111111111`

### Orders not appearing in dashboard
- Check browser console for errors
- Verify RLS policies ran (Step 1)
- Confirm staff user is linked to same restaurant_id

### "Session expired" when placing order
- QR sessions expire after 5 minutes
- For testing, just scan again: http://localhost:3000/q?t=T01-XYZ789

---

## Next Steps

Once everything works:

1. **Customize your restaurant**
   - Update restaurant name, address, phone in `restaurants` table
   - Add your actual menu items
   - Upload menu item images

2. **Generate real QR codes**
   - Use online QR generator: https://www.qr-code-generator.com/
   - For Table T01: `http://localhost:3000/q?t=T01-XYZ789`
   - Print and place on tables

3. **Deploy to production**
   - Push code to GitHub
   - Deploy to Vercel
   - Update `NEXT_PUBLIC_SITE_URL` in Vercel env vars
   - Regenerate QR codes with production URL

---

## Support

- Check `prd.md` for detailed feature specifications
- Review `IMPLEMENTATION_STATUS.md` for what's implemented
- See `SETUP.md` for advanced configuration

---

## Security Notes

✅ Prices always calculated server-side (never trust client)
✅ Order numbers generated atomically (no duplicates)
✅ QR sessions expire after 5 minutes
✅ Row Level Security enabled on all tables
✅ Role-based access control enforced
✅ Idempotency keys prevent duplicate orders
