const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function setupTableAndPermissions() {
    try {
        console.log('Setting up database table and permissions...');
        
        // First ensure table exists by creating a record
        const { data: insertData, error: insertError } = await supabaseAdmin
            .from('despesas')
            .insert({
                item: 'Setup Test',
                valor: 1.00,
                forma_pagamento: 'PIX',
                data_vencimento: '2025-06-08'
            })
            .select();
            
        if (insertError && insertError.code === '42P01') {
            console.log('Table does not exist. Creating via SQL...');
            
            // Create table using raw SQL through a function call
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS public.despesas (
                    id BIGSERIAL PRIMARY KEY,
                    item TEXT NOT NULL,
                    valor NUMERIC NOT NULL,
                    forma_pagamento TEXT NOT NULL,
                    parcela_atual INTEGER,
                    total_parcelas INTEGER,
                    valor_total NUMERIC,
                    imagem_url TEXT,
                    data_vencimento DATE NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
                );
            `;
            
            // Since we can't execute raw SQL directly, let's ensure the table structure
            // by using the Supabase client to define the schema
            console.log('Manual table creation required');
            return false;
        }
        
        console.log('Table exists, setting up RLS policies...');
        
        // Delete test record
        if (insertData && insertData.length > 0) {
            await supabaseAdmin
                .from('despesas')
                .delete()
                .eq('id', insertData[0].id);
        }
        
        // Test anon access
        const anonClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);
        const { data: testData, error: testError } = await anonClient
            .from('despesas')
            .select('count', { count: 'exact', head: true });
            
        if (testError) {
            console.log('Anon access failed:', testError.message);
            console.log('RLS policies may need to be configured manually');
            return false;
        } else {
            console.log('Anon access working correctly');
            return true;
        }
        
    } catch (error) {
        console.error('Setup failed:', error.message);
        return false;
    }
}

async function main() {
    const success = await setupTableAndPermissions();
    
    if (success) {
        console.log('Database setup completed successfully!');
    } else {
        console.log('Please create the table manually in Supabase SQL Editor:');
        console.log(`
-- Create the table
CREATE TABLE public.despesas (
    id BIGSERIAL PRIMARY KEY,
    item TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    forma_pagamento TEXT NOT NULL,
    parcela_atual INTEGER,
    total_parcelas INTEGER,
    valor_total NUMERIC,
    imagem_url TEXT,
    data_vencimento DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow all operations for everyone" ON public.despesas
FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions to anon role
GRANT ALL ON public.despesas TO anon;
GRANT ALL ON public.despesas TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.despesas_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.despesas_id_seq TO authenticated;
        `);
    }
}

main();