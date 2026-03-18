const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables in .env.local');
  console.error('URL:', supabaseUrl);
  console.error('Service Key length:', supabaseServiceKey?.length);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  const email = 'teste@doceriapro.com.br';
  const password = 'SenhaTeste123!';
  const fullName = 'Usuário de Teste';

  console.log(`Creating user: ${email}...`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: fullName },
    email_confirm: true
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('User already exists. You can use the existing credentials.');
    } else {
      console.error('Error creating user:', error.message);
      process.exit(1);
    }
  } else {
    console.log('User created successfully:', data.user.id);
  }

  console.log('\n--- Credentials ---');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('-------------------');
}

createTestUser();
