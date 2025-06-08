const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
    try {
        console.log('Setting up database...');
        
        // Create the despesas table
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS despesas (
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
                
                -- Enable Row Level Security
                ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
                
                -- Allow anonymous users to read and write
                CREATE POLICY IF NOT EXISTS "Allow all operations for anon users" ON despesas
                FOR ALL USING (true) WITH CHECK (true);
            `
        });
        
        if (error) {
            console.error('Error creating table:', error);
            return;
        }
        
        console.log('Table created successfully');
        
        // Create storage bucket for receipts
        const { data: bucketData, error: bucketError } = await supabase.storage
            .createBucket('receipts', {
                public: true,
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
                fileSizeLimit: 5242880 // 5MB
            });
        
        if (bucketError && !bucketError.message.includes('already exists')) {
            console.error('Error creating bucket:', bucketError);
        } else {
            console.log('Storage bucket created successfully');
        }
        
        console.log('Database setup completed!');
        
    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setupDatabase();