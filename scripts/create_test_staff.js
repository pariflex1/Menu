const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = 'staff@krishnaanandam.com';
  const password = 'Password123!';
  const name = 'Krishna Staff';
  const role = 'owner'; // or manager

  console.log(`Checking user: ${email}...`);

  // Check if user exists in auth.users
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('List users error:', listError);
    return;
  }

  let user = usersData.users.find(u => u.email === email);

  if (!user) {
    console.log('Creating auth user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (createError) {
      console.error('Failed to create auth user:', createError);
      return;
    }
    user = newUser.user;
    console.log('Auth user created successfully:', user.id);
  } else {
    console.log('Auth user already exists:', user.id);
    // Update password just to be sure
    await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    console.log('Password reset to:', password);
  }

  // Check user_profiles columns
  console.log('Upserting user_profile for user_id:', user.id);
  
  // Try upserting with role and name
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      name,
      phone: '+91 91290 54406',
      role,
      restaurant_id: '11111111-1111-1111-1111-111111111111'
    }, { onConflict: 'user_id' })
    .select();

  if (profileError) {
    console.log('Note: upsert with restaurant_id failed, trying without restaurant_id:', profileError.message);
    const { data: p2, error: e2 } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        name,
        phone: '+91 91290 54406',
        role
      }, { onConflict: 'user_id' })
      .select();
    
    if (e2) {
      console.error('Profile upsert failed:', e2);
    } else {
      console.log('Profile created/updated successfully (single tenant format):', p2);
    }
  } else {
    console.log('Profile created/updated successfully:', profile);
  }

  console.log('\n=======================================');
  console.log('✅ TEST STAFF ACCOUNT READY:');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Role:     ${role}`);
  console.log('=======================================\n');
}

main().catch(console.error);
