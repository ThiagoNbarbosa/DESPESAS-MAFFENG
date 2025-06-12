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
        
        // Insert basic categories (just name and description)
        const categories = [
            { name: 'Alimentação', description: 'Gastos com comida e bebidas' },
            { name: 'Transporte', description: 'Combustível, transporte público, Uber' },
            { name: 'Moradia', description: 'Aluguel, condomínio, IPTU' },
            { name: 'Saúde', description: 'Consultas, medicamentos, plano de saúde' },
            { name: 'Educação', description: 'Cursos, livros, materiais' },
            { name: 'Lazer', description: 'Cinema, restaurantes, viagens' },
            { name: 'Roupas', description: 'Vestuário e acessórios' },
            { name: 'Tecnologia', description: 'Eletrônicos, softwares, internet' },
            { name: 'Casa', description: 'Móveis, decoração, utensílios' },
            { name: 'Outros', description: 'Gastos diversos' }
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