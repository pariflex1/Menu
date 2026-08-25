const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjgneisuyrlvvcjtdaaz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  const { data: rest } = await supabase.from('restaurants').select('*').single();
  const { data: settings } = await supabase.from('restaurant_settings').select('*').single();
  const { data: categories } = await supabase.from('categories').select('id, name').order('sort_order');
  const { count: totalItems } = await supabase.from('menu_items').select('*', { count: 'exact', head: true });

  console.log('--- RESTAURANT INFO ---');
  console.log('Name:', rest.name);
  console.log('Slug:', rest.slug);
  console.log('Address:', rest.address);
  console.log('Phone:', rest.phone);
  console.log('Email:', rest.email);
  console.log('Tax Percent:', settings.tax_percent + '%');
  console.log('Opening Hours:', settings.opening_time, 'to', settings.closing_time);
  console.log('Total Categories:', categories.length);
  console.log('Total Menu Items:', totalItems);
}

verify().catch(console.error);
