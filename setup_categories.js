const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupCategories() {
    try {
        console.log('Creating categories table...');
        
        // Create categories table
        const { error: createError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS categories (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    description TEXT,
                    color VARCHAR(7) DEFAULT '#007bff',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        });

        if (createError) {
            console.error('Error creating categories table:', createError);
            return;
        }

        console.log('Categories table created successfully');

        // Insert predefined categories
        const categories = [
            { name: 'Alimentação', description: 'Gastos com comida e bebidas', color: '#28a745' },
            { name: 'Transporte', description: 'Combustível, transporte público, Uber', color: '#007bff' },
            { name: 'Moradia', description: 'Aluguel, condomínio, IPTU', color: '#6f42c1' },
            { name: 'Saúde', description: 'Consultas, medicamentos, plano de saúde', color: '#dc3545' },
            { name: 'Educação', description: 'Cursos, livros, materiais', color: '#fd7e14' },
            { name: 'Lazer', description: 'Cinema, restaurantes, viagens', color: '#20c997' },
            { name: 'Roupas', description: 'Vestuário e acessórios', color: '#e83e8c' },
            { name: 'Tecnologia', description: 'Eletrônicos, softwares, internet', color: '#17a2b8' },
            { name: 'Casa', description: 'Móveis, decoração, utensílios', color: '#6c757d' },
            { name: 'Outros', description: 'Gastos diversos', color: '#343a40' }
        ];

        console.log('Inserting predefined categories...');
        
        const { error: insertError } = await supabase
            .from('categories')
            .insert(categories);

        if (insertError) {
            console.error('Error inserting categories:', insertError);
            return;
        }

        console.log('Categories inserted successfully');

        // Add foreign key constraint to despesas table
        console.log('Adding category_id column to despesas table...');
        
        const { error: alterError } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE despesas 
                ADD COLUMN IF NOT EXISTS category_id INTEGER 
                REFERENCES categories(id) ON DELETE SET NULL;
            `
        });

        if (alterError) {
            console.error('Error adding category_id column:', alterError);
            return;
        }

        console.log('Category system setup completed successfully!');

    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setupCategories();