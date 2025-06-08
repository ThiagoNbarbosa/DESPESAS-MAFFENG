const { Client } = require('pg');

async function setupDatabase() {
    // Parse the DATABASE_URL to extract connection parameters
    const dbUrl = process.env.DATABASE_URL;
    console.log('Connecting to database...');
    
    const client = new Client({
        connectionString: dbUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected successfully');

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

        console.log('Creating table...');
        await client.query(createTableQuery);
        console.log('Table "despesas" created successfully');

        // Enable Row Level Security
        try {
            await client.query('ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;');
            console.log('RLS enabled');
        } catch (err) {
            console.log('RLS already enabled or no permission:', err.message);
        }

        // Create policy for public access
        try {
            await client.query(`
                CREATE POLICY IF NOT EXISTS "Allow all operations for all users" ON despesas
                FOR ALL USING (true) WITH CHECK (true);
            `);
            console.log('Policy created');
        } catch (err) {
            console.log('Policy already exists or no permission:', err.message);
        }

        // Test the table by inserting and deleting a test record
        const testInsert = await client.query(`
            INSERT INTO despesas (item, valor, forma_pagamento, data_vencimento) 
            VALUES ('Test', 1.00, 'PIX', '2025-06-08') 
            RETURNING id;
        `);
        
        const testId = testInsert.rows[0].id;
        await client.query('DELETE FROM despesas WHERE id = $1', [testId]);
        
        console.log('Table is working correctly');
        console.log('Database setup completed successfully!');

    } catch (error) {
        console.error('Database setup failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await client.end();
    }
}

setupDatabase();