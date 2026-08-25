require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables in .env.local');
  process.exit(1);
}

async function executeSQLFile(filename) {
  console.log(`\n📄 Executing ${filename}...`);
  const filePath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const text = await response.text();
      console.log(`   ⚠️  Response: ${text}`);
    } else {
      console.log(`   ✅ ${filename} executed successfully`);
    }
  } catch (err) {
    console.log(`   ⚠️  ${err.message}`);
  }
}

async function executeSQLDirect(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql })
    });

    const text = await response.text();
    return { ok: response.ok, text };
  } catch (err) {
    return { ok: false, text: err.message };
  }
}

async function main() {
  console.log('🚀 Creating database tables directly...\n');
  console.log('📡 Supabase URL:', supabaseUrl);
  console.log('\n⚠️  IMPORTANT: This method may not work with Supabase RPC.\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  RECOMMENDED: Manual Setup (Takes 2 minutes)');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('1. Open this URL in your browser:');
  console.log('   https://supabase.com/dashboard/project/mjgneisuyrlvvcjtdaaz/sql/new\n');
  console.log('2. Open the file: setup-database.sql');
  console.log('   Location: E:\\Visitor Management System\\My Projects\\Menu\\setup-database.sql\n');
  console.log('3. Copy ALL contents (Ctrl+A, Ctrl+C)');
  console.log('4. Paste into Supabase SQL Editor');
  console.log('5. Click the RUN button\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('After completing the above steps:');
  console.log('- Refresh http://localhost:3000');
  console.log('- The menu will load automatically!\n');
}

main();
