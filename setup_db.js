const { Client } = require('pg');

async function setupDatabase() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Create the despesas table
        const createTableQuery = `
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
        `;

        await client.query(createTableQuery);
        console.log('Table "despesas" created successfully');

        // Enable Row Level Security and create policies
        const securityQueries = [
            'ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;',
            `CREATE POLICY IF NOT EXISTS "Allow all operations for authenticated users" ON despesas
             FOR ALL USING (true) WITH CHECK (true);`
        ];

        for (const query of securityQueries) {
            try {
                await client.query(query);
                console.log('Security policy applied');
            } catch (err) {
                console.log('Security policy already exists or permission denied:', err.message);
            }
        }

        console.log('Database setup completed successfully!');

    } catch (error) {
        console.error('Database setup failed:', error.message);
    } finally {
        await client.end();
    }
}

setupDatabase();