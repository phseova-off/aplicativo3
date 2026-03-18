const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function debugRLS() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    console.log('Logging in as teste@doceriapro.com.br...');
    const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'teste@doceriapro.com.br',
        password: 'SenhaTeste123!'
    });

    if (authErr) {
        console.error('Auth error:', authErr.message);
        return;
    }

    const userId = session.user.id;
    console.log('Logged in! User ID:', userId);

    console.log('Attempting to update confeitaria...');
    const { error: updateErr } = await supabase
        .from('confeitarias')
        .update({ nome: 'Doceria de Teste Debug' })
        .eq('id', userId);

    if (updateErr) {
        console.error('Update error:', updateErr.message);
        console.error('Error code:', updateErr.code);
    } else {
        console.log('Update successful!');
    }
}

debugRLS();
