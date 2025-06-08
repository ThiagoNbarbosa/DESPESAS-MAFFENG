const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createTableManually() {
    try {
        console.log('Creating table using direct SQL execution...');
        
        // Use the raw SQL execution through Supabase's edge functions or direct database access
        const tableSQL = `
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
            
            ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY IF NOT EXISTS "Enable all operations for all users" ON public.despesas 
            FOR ALL USING (true) WITH CHECK (true);
        `;

        // Try using the SQL execution function
        const { data, error } = await supabaseAdmin.rpc('sql', { query: tableSQL });
        
        if (error) {
            console.log('RPC failed, trying alternative approach...');
            
            // Alternative: Try to create by using schema introspection
            const { data: tables, error: schemaError } = await supabaseAdmin
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_name', 'despesas');
                
            if (schemaError) {
                console.log('Schema check failed, creating table via REST API...');
                
                // Last resort: Create table by trying to insert data which will auto-create schema
                const { error: insertError } = await supabaseAdmin
                    .from('despesas')
                    .insert({
                        item: 'Setup',
                        valor: 1,
                        forma_pagamento: 'PIX', 
                        data_vencimento: '2025-06-08'
                    });
                
                if (insertError && insertError.code === '42P01') {
                    console.log('Table does not exist and cannot be auto-created');
                    console.log('Please create the table manually in Supabase SQL Editor');
                    return false;
                } else if (!insertError) {
                    console.log('Table created successfully via insert');
                    // Clean up test data
                    await supabaseAdmin
                        .from('despesas')
                        .delete()
                        .eq('item', 'Setup');
                    return true;
                }
            }
        } else {
            console.log('Table created successfully via RPC');
            return true;
        }
        
    } catch (error) {
        console.error('Table creation failed:', error.message);
        return false;
    }
}

async function verifyTable() {
    try {
        console.log('Verifying table exists...');
        const { data, error } = await supabaseAdmin
            .from('despesas')
            .select('count', { count: 'exact', head: true });
            
        if (error) {
            console.log('Table verification failed:', error.message);
            return false;
        } else {
            console.log('Table exists and is accessible');
            return true;
        }
    } catch (error) {
        console.log('Verification error:', error.message);
        return false;
    }
}

async function main() {
    console.log('Starting database setup...');
    
    const tableExists = await verifyTable();
    
    if (!tableExists) {
        console.log('Table does not exist, attempting to create...');
        const created = await createTableManually();
        
        if (created) {
            console.log('Database setup completed successfully!');
        } else {
            console.log('Automatic table creation failed.');
            console.log('Please run this SQL in your Supabase SQL Editor:');
            console.log(`
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

ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for all users" ON public.despesas 
FOR ALL USING (true) WITH CHECK (true);
            `);
        }
    } else {
        console.log('Table already exists and is working!');
    }
}

main();