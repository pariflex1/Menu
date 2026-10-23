import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/auth/api-guards';
import { can, STAFF_ROLES } from '@/lib/auth/roles';
import { z } from 'zod';
import { logActivity } from '@/lib/logging';

const createStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10, 'Enter 10-digit mobile number'),
  role: z.enum(STAFF_ROLES),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

export async function GET() {
  const guard = await requireRoleApi([], can.manageStaff);
  if (!guard.ok) return guard.response;

  const supabase = createServiceClient();

  const { data: profiles, error: pErr } = await supabase
    .from('user_profiles')
    .select('id, user_id, restaurant_id, name, phone, role, created_at')
    .eq('restaurant_id', guard.session.restaurantId)
    .order('created_at', { ascending: true });

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  // Fetch emails from auth.users
  const { data: usersData, error: uErr } = await supabase.auth.admin.listUsers();
  const emailMap: Record<string, string> = {};
  if (!uErr && usersData?.users) {
    usersData.users.forEach((u) => {
      if (u.email) emailMap[u.id] = u.email;
    });
  }

  const staff = (profiles || []).map((p) => ({
    ...p,
    email: emailMap[p.user_id] || 'N/A',
  }));

  return NextResponse.json({ staff });
}

export async function POST(request: Request) {
  const guard = await requireRoleApi([], can.manageStaff);
  if (!guard.ok) return guard.response;

  const body = await request.json();
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, phone: rawPhone, role, password } = parsed.data;

  // Enforce strictly 10-digit mobile number
  const digitsOnly = rawPhone.replace(/\D/g, '');
  const phone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
  if (phone.length !== 10) {
    return NextResponse.json(
      { error: 'Mobile number must be exactly 10 digits', issues: { phone: ['Enter a valid 10-digit mobile number'] } },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Check if mobile number is already registered
  const { data: existingPhone } = await supabase
    .from('user_profiles')
    .select('id, name')
    .eq('phone', phone)
    .maybeSingle();

  if (existingPhone) {
    return NextResponse.json(
      { error: `Mobile number ${phone} is already registered for staff member "${existingPhone.name}"` },
      { status: 400 },
    );
  }

  // Use provided email or auto-generate one from phone for Supabase auth
  const email = parsed.data.email && parsed.data.email.trim()
    ? parsed.data.email.trim()
    : `staff.${phone}@krishnaanandam.internal`;

  // 1. Create auth user in Supabase
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone },
  });

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 });
  }

  // 2. Insert into user_profiles
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userData.user.id,
      restaurant_id: guard.session.restaurantId,
      name,
      phone,
      role,
    })
    .select()
    .single();

  if (profileError) {
    // Rollback auth user creation if profile insert fails
    await supabase.auth.admin.deleteUser(userData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Log staff creation
  await logActivity({
    restaurantId: guard.session.restaurantId,
    action: 'STAFF_CREATED',
    level: 'info',
    actorName: guard.session.name || 'Admin',
    actorRole: guard.session.role,
    details: `Added new staff member "${name}" (${role}) with mobile ${phone}`,
    metadata: { staff_id: profile.id, role, phone, email },
  });

  return NextResponse.json(
    {
      staff: {
        ...profile,
        email: userData.user.email,
      },
    },
    { status: 201 },
  );
}
