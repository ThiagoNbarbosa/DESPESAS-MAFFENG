const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createTable() {
    try {
        console.log('Creating despesas table...');
        
        // First, let's try to create the table by inserting a dummy record and letting Supabase create the structure
        const { data, error } = await supabase
            .from('despesas')
            .insert([{
                item: 'Test Item',
                valor: 10.00,
                forma_pagamento: 'PIX',
                data_vencimento: '2025-06-08'
            }])
            .select();

        if (error) {
            console.log('Table does not exist, attempting to create via storage bucket approach...');
            
            // Create storage bucket for receipts
            const { data: bucketData, error: bucketError } = await supabase.storage
                .createBucket('receipts', {
                    public: true,
                    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                    fileSizeLimit: 5242880 // 5MB
                });
            
            if (bucketError) {
                console.log('Bucket creation result:', bucketError.message);
            } else {
                console.log('Storage bucket "receipts" created successfully');
            }
            
            console.log('Please create the table manually in Supabase SQL Editor with this SQL:');
            console.log(`
CREATE TABLE despesas (
    id SERIAL PRIMARY KEY,
    item TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    forma_pagamento TEXT NOT NULL,
    parcela_atual INTEGER,
    total_parcelas INTEGER,
    valor_total NUMERIC,
    imagem_url TEXT,
    data_vencimento DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON despesas
FOR ALL USING (true) WITH CHECK (true);
            `);
            
        } else {
            console.log('Table already exists or was created successfully');
            // Clean up test data
            await supabase
                .from('despesas')
                .delete()
                .eq('item', 'Test Item');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

createTable();