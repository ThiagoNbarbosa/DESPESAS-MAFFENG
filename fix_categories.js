const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixCategories() {
    try {
        console.log('Checking categories table structure...');
        
        // First, let's see if categories table exists and what columns it has
        const { data: existingCategories, error: selectError } = await supabase
            .from('categories')
            .select('*')
            .limit(1);

        if (selectError) {
            console.log('Categories table may not exist, creating it...');
            
            // Try to create a simple categories table with just name
            const categories = [
                { name: 'Pagamento funcionários' },
                { name: 'Material' },
                { name: 'Mão de Obra' },
                { name: 'Prestador de serviços' },
                { name: 'Aluguel de ferramentas' },
                { name: 'Manutenção em veículo' }
            ];

            const { data: insertData, error: insertError } = await supabase
                .from('categories')
                .insert(categories);

            if (insertError) {
                console.error('Error creating categories:', insertError);
                console.log('Let me try a different approach - checking existing table structure...');
                
                // Let's try to get the schema information
                const { data: schemaData, error: schemaError } = await supabase
                    .from('categories')
                    .select();

                if (schemaError) {
                    console.error('Schema check error:', schemaError);
                } else {
                    console.log('Table exists but is empty or has different structure');
                    console.log('Existing data:', schemaData);
                }
                return;
            }

            console.log('Categories created successfully');
        } else {
            console.log('Categories table exists');
            console.log('Existing categories:', existingCategories);
            
            // Clear existing categories and insert new ones
            const { error: deleteError } = await supabase
                .from('categories')
                .delete()
                .neq('id', 0); // Delete all records

            if (deleteError) {
                console.error('Error clearing categories:', deleteError);
                return;
            }

            // Insert new categories
            const categories = [
                { name: 'Pagamento funcionários' },
                { name: 'Material' },
                { name: 'Mão de Obra' },
                { name: 'Prestador de serviços' },
                { name: 'Aluguel de ferramentas' },
                { name: 'Manutenção em veículo' }
            ];

            const { data: insertData, error: insertError } = await supabase
                .from('categories')
                .insert(categories);

            if (insertError) {
                console.error('Error inserting new categories:', insertError);
                return;
            }

            console.log('Categories updated successfully');
        }

        // Verify the results
        const { data: finalCategories, error: finalError } = await supabase
            .from('categories')
            .select('*');

        if (finalError) {
            console.error('Error verifying categories:', finalError);
        } else {
            console.log('Final categories in database:');
            finalCategories.forEach(cat => console.log(`- ID: ${cat.id}, Name: ${cat.name}`));
        }

    } catch (error) {
        console.error('Fix categories failed:', error);
    }
}

fixCategories();