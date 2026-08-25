# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works)
- Git (optional)

## 1. Database Setup

### Create a Supabase Project
1. Go to https://supabase.com and create a new project
2. Wait for the database to be provisioned
3. Note down your project URL and keys

### Run Migrations
1. In your Supabase dashboard, go to **SQL Editor**
2. Run these files in order:
   - `supabase/migrations/001_core_schema.sql`
   - `supabase/migrations/002_order_number.sql`
   - `supabase/migrations/003_rls_policies.sql`
   - `supabase/seed.sql` (optional, for demo data)

## 2. Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   **Find these values in Supabase Dashboard:**
   - Go to **Settings** → **API**
   - Copy the Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
   
   ⚠️ **IMPORTANT**: Never commit `.env.local` to git!

## 3. Install Dependencies

```bash
npm install
```

## 4. Create Your First Staff User

### Option A: Via Supabase Dashboard (Recommended)
1. Go to **Authentication** → **Users** in Supabase
2. Click **Add user** → **Create new user**
3. Enter email: `owner@restaurant.com`
4. Enter password: (choose a strong password)
5. Click **Create user**
6. Copy the user's UUID

### Add Staff Profile
1. Go to **Table Editor** → `user_profiles`
2. Click **Insert** → **Insert row**
3. Fill in:
   - `user_id`: paste the UUID from above
   - `restaurant_id`: `11111111-1111-1111-1111-111111111111` (from seed data)
   - `name`: Your name
   - `role`: `owner`
4. Click **Save**

### Option B: Via SQL
```sql
-- Replace with your actual values
INSERT INTO user_profiles (user_id, restaurant_id, name, role)
VALUES (
  'YOUR_USER_UUID_FROM_AUTH_USERS',
  '11111111-1111-1111-1111-111111111111',
  'Restaurant Owner',
  'owner'
);
```

## 5. Run the Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## 6. Test the Flow

### Staff Login
1. Go to http://localhost:3000/login
2. Login with the credentials you created
3. You should be redirected to `/dashboard`

### Customer Order Flow (QR Scan)
1. Open a new incognito/private window
2. Go to: http://localhost:3000/q?t=T01-XYZ789
   - This simulates scanning Table 1's QR code (from seed data)
3. You'll be redirected to the menu
4. Add items to your bucket
5. Click "View Bucket" → Fill in name/phone → Place order
6. You'll see your order tracking page

### Manager View
1. Back in your staff window at `/dashboard`
2. You should see the new order appear (auto-refreshes every 3 seconds)
3. Click "accepted" → "preparing" → "ready" → "served"
4. The customer's tracking page updates in real-time

## 7. Customize for Your Restaurant

### Update Restaurant Info
```sql
UPDATE restaurants
SET 
  name = 'Your Restaurant Name',
  slug = 'your-slug',
  phone = '+91 XXXXXXXXXX',
  email = 'orders@yourrestaurant.com',
  address = 'Your address'
WHERE id = '11111111-1111-1111-1111-111111111111';
```

### Update Settings
```sql
UPDATE restaurant_settings
SET 
  tax_percent = 5.00,           -- Your GST/tax rate
  delivery_fee = 30.00,         -- Home delivery fee
  min_home_order_amount = 200.00,
  opening_time = '09:00',
  closing_time = '23:00'
WHERE restaurant_id = '11111111-1111-1111-1111-111111111111';
```

### Add Your Tables
```sql
INSERT INTO tables (restaurant_id, table_number, capacity, qr_token)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'T04', 4, 'T04-ABC123'),
  ('11111111-1111-1111-1111-111111111111', 'T05', 2, 'T05-DEF456');
```

### Generate QR Codes
For each table, create a QR code pointing to:
```
https://yourdomain.com/q?t=YOUR_QR_TOKEN
```

For example: `https://yourdomain.com/q?t=T04-ABC123`

Use any QR generator (e.g., https://www.qr-code-generator.com/)

## Common Issues

### "Invalid environment variables"
- Make sure `.env.local` exists and has all required keys
- Restart the dev server after changing environment variables

### "No staff access configured"
- Check that your `user_profiles` row has the correct `user_id` matching your Supabase auth user
- Verify the `restaurant_id` exists in the `restaurants` table

### "Session expired" when placing order
- QR sessions expire after 5 minutes
- For testing, you can extend this in `app/api/qr/session/route.ts` (line with `5 * 60 * 1000`)

### Orders not appearing in dashboard
- Check that the `restaurant_id` in your order matches the staff user's `restaurant_id`
- Look in browser console for API errors

## Production Deployment

### Deploy to Vercel
1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Update Production URLs
- Change `NEXT_PUBLIC_SITE_URL` to your production domain
- Update QR codes to point to production domain
- Enable custom domain in Vercel if needed

## Next Steps
- Implement remaining phases (see IMPLEMENTATION_STATUS.md)
- Add your actual menu items
- Print and place QR codes on tables
- Train staff on using the dashboard
- Test with real orders

## Support
- Check `prd.md` for detailed feature specifications
- Review `IMPLEMENTATION_STATUS.md` for what's implemented
- API contracts are documented in `prd.md` §8
