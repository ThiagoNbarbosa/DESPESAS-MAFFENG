const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createBasicCategories() {
    try {
        console.log('Creating basic categories...');
        
        // Business-focused categories for construction/service companies
        const categories = [
            { name: 'Pagamento funcionários', description: 'Salários, benefícios e encargos trabalhistas' },
            { name: 'Material', description: 'Materiais de construção e insumos' },
            { name: 'Mão de Obra', description: 'Serviços de mão de obra terceirizada' },
            { name: 'Prestador de serviços', description: 'Contratação de prestadores de serviços especializados' },
            { name: 'Aluguel de ferramentas', description: 'Locação de equipamentos e ferramentas' },
            { name: 'Manutenção em veículo', description: 'Manutenção, combustível e reparos de veículos' }
        ];

        const { data: insertData, error: insertError } = await supabase
            .from('categories')
            .insert(categories);

        if (insertError) {
            console.error('Error inserting categories:', insertError);
            return;
        }

        console.log('Categories inserted successfully');
        console.log('Category system is ready!');

    } catch (error) {
        console.error('Setup failed:', error);
    }
}

createBasicCategories();