const https = require('https');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// SQL to create the table
const createTableSQL = `
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

ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all operations" ON despesas
FOR ALL USING (true) WITH CHECK (true);
`;

function executeSQL(sql) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            query: sql
        });

        const options = {
            hostname: supabaseUrl.replace('https://', '').replace('http://', ''),
            port: 443,
            path: '/rest/v1/rpc/exec_sql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

async function createTable() {
    try {
        console.log('Creating database table...');
        const result = await executeSQL(createTableSQL);
        console.log('Table created successfully:', result);
    } catch (error) {
        console.log('Direct SQL failed:', error.message);
        
        // Try alternative: create by inserting dummy data
        console.log('Attempting to create table via INSERT...');
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(supabaseUrl, serviceKey);
            
            // This will fail but might trigger table creation
            const { error } = await supabase
                .from('despesas')
                .insert({
                    item: 'Setup Test',
                    valor: 1.00,
                    forma_pagamento: 'PIX',
                    data_vencimento: '2025-06-08'
                });
            
            if (error && error.code !== '42P01') {
                console.log('Table exists or was created');
                // Delete test data
                await supabase
                    .from('despesas')
                    .delete()
                    .eq('item', 'Setup Test');
            }
        } catch (insertError) {
            console.log('Insert method also failed:', insertError.message);
        }
    }
}

createTable();