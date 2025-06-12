const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getCategories() {
    try {
        console.log('Getting current categories from database...');
        
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error getting categories:', error);
            return;
        }

        console.log('Current categories in database:');
        categories.forEach(cat => {
            console.log(`{ id: '${cat.id}', name: '${cat.name}' },`);
        });

        // Let's also ensure we have all the categories we need
        const requiredCategories = [
            'Pagamento funcionários',
            'Material',
            'Mão de Obra',
            'Prestador de serviços',
            'Aluguel de ferramentas',
            'Manutenção em veículo'
        ];

        const existingNames = categories.map(cat => cat.name);
        const missingCategories = requiredCategories.filter(name => !existingNames.includes(name));

        if (missingCategories.length > 0) {
            console.log('Missing categories, adding them...');
            const categoriesToAdd = missingCategories.map(name => ({ name }));
            
            const { data: newCategories, error: insertError } = await supabase
                .from('categories')
                .insert(categoriesToAdd)
                .select();

            if (insertError) {
                console.error('Error adding missing categories:', insertError);
            } else {
                console.log('Added missing categories:', newCategories);
            }
        }

        // Get final list
        const { data: finalCategories, error: finalError } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (!finalError) {
            console.log('\nFinal category list for JavaScript:');
            finalCategories.forEach(cat => {
                console.log(`{ id: '${cat.id}', name: '${cat.name}' },`);
            });
        }

    } catch (error) {
        console.error('Get categories failed:', error);
    }
}

getCategories();