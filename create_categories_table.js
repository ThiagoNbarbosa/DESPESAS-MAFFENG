const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createCategoriesTable() {
    try {
        console.log('Creating categories table and inserting data...');
        
        // First, try to create the categories table via RPC
        const { data: createTableData, error: createTableError } = await supabase
            .rpc('exec_sql', {
                query: `
                    CREATE TABLE IF NOT EXISTS categories (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL UNIQUE,
                        description TEXT,
                        color VARCHAR(7) DEFAULT '#007bff',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                `
            });

        if (createTableError) {
            console.log('RPC method not available, trying direct table creation...');
            
            // Business-focused categories for construction/service companies
            const categories = [
                { name: 'Pagamento funcionários', description: 'Salários, benefícios e encargos trabalhistas', color: '#28a745' },
                { name: 'Material', description: 'Materiais de construção e insumos', color: '#007bff' },
                { name: 'Mão de Obra', description: 'Serviços de mão de obra terceirizada', color: '#6f42c1' },
                { name: 'Prestador de serviços', description: 'Contratação de prestadores de serviços especializados', color: '#dc3545' },
                { name: 'Aluguel de ferramentas', description: 'Locação de equipamentos e ferramentas', color: '#fd7e14' },
                { name: 'Manutenção em veículo', description: 'Manutenção, combustível e reparos de veículos', color: '#20c997' }
            ];

            const { data: insertData, error: insertError } = await supabase
                .from('categories')
                .insert(categories);

            if (insertError) {
                console.error('Error inserting categories:', insertError);
                console.log('Categories table may need to be created manually in Supabase dashboard');
                return;
            }

            console.log('Categories inserted successfully');
        } else {
            console.log('Categories table created successfully');
            
            // Business-focused categories for construction/service companies
            const categories = [
                { name: 'Pagamento funcionários', description: 'Salários, benefícios e encargos trabalhistas', color: '#28a745' },
                { name: 'Material', description: 'Materiais de construção e insumos', color: '#007bff' },
                { name: 'Mão de Obra', description: 'Serviços de mão de obra terceirizada', color: '#6f42c1' },
                { name: 'Prestador de serviços', description: 'Contratação de prestadores de serviços especializados', color: '#dc3545' },
                { name: 'Aluguel de ferramentas', description: 'Locação de equipamentos e ferramentas', color: '#fd7e14' },
                { name: 'Manutenção em veículo', description: 'Manutenção, combustível e reparos de veículos', color: '#20c997' }
            ];

            const { data: insertData, error: insertError } = await supabase
                .from('categories')
                .insert(categories);

            if (insertError) {
                console.error('Error inserting categories:', insertError);
                return;
            }

            console.log('Categories inserted successfully');
        }

        // Try to add category_id column to despesas table
        const { data: alterData, error: alterError } = await supabase
            .rpc('exec_sql', {
                query: `
                    ALTER TABLE despesas 
                    ADD COLUMN IF NOT EXISTS category_id INTEGER 
                    REFERENCES categories(id) ON DELETE SET NULL;
                `
            });

        if (alterError) {
            console.log('Note: category_id column may need to be added manually to despesas table');
        } else {
            console.log('category_id column added to despesas table');
        }

        console.log('Category system setup completed!');

    } catch (error) {
        console.error('Setup failed:', error);
    }
}

createCategoriesTable();