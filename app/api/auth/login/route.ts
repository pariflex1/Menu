import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { loginSchema } from '@/lib/validation/auth';
import { logActivity } from '@/lib/logging';

export async function POST(request: Request) {
  const body = await request.json();

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { identifier, password } = parsed.data;
  const rawIdentifier = identifier.trim();
  const isEmail = rawIdentifier.includes('@');
  let email = rawIdentifier;
  let matchedProfile: any = null;

  // If not email, treat as 10-digit mobile number
  if (!isEmail) {
    const digitsOnly = rawIdentifier.replace(/\D/g, '');
    const mobile10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    if (mobile10.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number' },
        { status: 400 },
      );
    }

    const serviceClient = createServiceClient();

    // 1. Direct match on phone column
    const { data: directProfiles } = await serviceClient
      .from('user_profiles')
      .select('user_id, name, phone, role, restaurant_id')
      .or(`phone.eq.${mobile10},phone.ilike.%${mobile10}`);

    matchedProfile = directProfiles && directProfiles.length > 0 ? directProfiles[0] : null;

    // 2. Fallback: normalize all profiles in case phone had spaces or country code
    if (!matchedProfile) {
      const { data: allProfiles } = await serviceClient
        .from('user_profiles')
        .select('user_id, name, phone, role, restaurant_id');

      matchedProfile =
        allProfiles?.find((p) => {
          if (!p.phone) return false;
          const pDigits = p.phone.replace(/\D/g, '');
          return pDigits.slice(-10) === mobile10;
        }) || null;
    }

    if (!matchedProfile) {
      await logActivity({
        action: 'LOGIN_FAILED',
        level: 'warning',
        actorName: mobile10,
        actorRole: 'guest',
        details: `Login attempt with unregistered 10-digit mobile number: ${mobile10}`,
      });
      return NextResponse.json(
        { error: 'No account found for this 10-digit mobile number' },
        { status: 401 },
      );
    }

    // Get the email from auth.users
    const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(
      matchedProfile.user_id,
    );
    if (userError || !userData?.user?.email) {
      return NextResponse.json(
        { error: 'Account email configuration incomplete. Please contact admin.' },
        { status: 401 },
      );
    }
    email = userData.user.email;
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    await logActivity({
      restaurantId: matchedProfile?.restaurant_id,
      action: 'LOGIN_FAILED',
      level: 'warning',
      actorName: matchedProfile?.name || rawIdentifier,
      actorRole: matchedProfile?.role || 'guest',
      details: `Failed login attempt for ${rawIdentifier}: ${error.message}`,
    });
    return NextResponse.json({ error: 'Invalid credentials. Please check password.' }, { status: 401 });
  }

  // Verify the user has a staff profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, name, role, restaurant_id, phone')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: 'No staff access configured for this account' },
      { status: 403 },
    );
  }

  // Log successful login
  await logActivity({
    restaurantId: profile.restaurant_id,
    action: 'STAFF_LOGIN',
    level: 'success',
    actorName: profile.name || email,
    actorRole: profile.role,
    details: `Staff member ${profile.name} (${profile.role}) logged in successfully via ${isEmail ? 'email' : '10-digit mobile'}`,
    metadata: {
      login_type: isEmail ? 'email' : 'mobile',
      user_id: data.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}