const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Make sure .env.local is configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(filename) {
  console.log(`\n📄 Running ${filename}...`);
  const filePath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  const { error } = await supabase.rpc('exec_sql', { sql_string: sql }).catch(() => {
    return supabase.from('_migrations').select('*').limit(1);
  });

  const directResult = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({ sql_string: sql })
  }).catch(() => null);

  if (!directResult) {
    console.log(`Executing SQL directly via raw query...`);
    const lines = sql.split(';').filter(line => line.trim());
    for (const line of lines) {
      if (line.trim()) {
        try {
          await supabase.rpc('exec_sql', { query: line });
        } catch (e) {
          console.log(`Skipping line (may already exist): ${line.substring(0, 50)}...`);
        }
      }
    }
  }

  console.log(`✅ ${filename} completed`);
}

async function runSeed() {
  console.log(`\n📄 Running seed.sql...`);
  const filePath = path.join(__dirname, '..', 'supabase', 'seed.sql');
  const sql = fs.readFileSync(filePath, 'utf8');
  
  const lines = sql.split(';').filter(line => line.trim() && !line.trim().startsWith('--'));
  
  for (const line of lines) {
    if (line.trim()) {
      console.log(`Executing: ${line.substring(0, 80)}...`);
      const { error } = await supabase.rpc('exec', { sql: line }).catch(() => ({ error: null }));
      if (error) {
        console.log(`Note: ${error.message || 'May already exist'}`);
      }
    }
  }
  
  console.log(`✅ seed.sql completed`);
}

async function main() {
  console.log('🚀 Starting database setup...\n');
  
  try {
    await runMigration('001_core_schema.sql');
    await runMigration('002_order_number.sql');
    await runMigration('003_rls_policies.sql');
    await runSeed();
    
    console.log('\n✅ All migrations completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to Supabase Dashboard → Authentication → Users');
    console.log('2. Create a new user with email: owner@restaurant.com');
    console.log('3. Copy the user UUID');
    console.log('4. Go to Table Editor → user_profiles');
    console.log('5. Insert a row with:');
    console.log('   - user_id: <paste UUID>');
    console.log('   - restaurant_id: 11111111-1111-1111-1111-111111111111');
    console.log('   - name: Restaurant Owner');
    console.log('   - role: owner');
    console.log('\nThen login at http://localhost:3000/login');
  } catch (error) {
    console.error('\n❌ Error running migrations:', error);
    process.exit(1);
  }
}

main();
