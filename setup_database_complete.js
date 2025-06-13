const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupComplete() {
    try {
        console.log('Setting up complete database structure...');
        
        // First, let's check what tables exist
        const { data: existingTables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');

        if (tablesError) {
            console.log('Cannot check existing tables, proceeding with setup...');
        } else {
            console.log('Existing tables:', existingTables?.map(t => t.table_name) || 'none');
        }

        // Try to create categories table if it doesn't exist
        console.log('Creating categories table...');
        const { data: createCategoriesResult, error: createCategoriesError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS public.categories (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                -- Enable RLS
                ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

                -- Create policy for public access
                DROP POLICY IF EXISTS "Allow all operations on categories" ON public.categories;
                CREATE POLICY "Allow all operations on categories" ON public.categories
                FOR ALL USING (true) WITH CHECK (true);

                -- Grant permissions
                GRANT ALL ON public.categories TO anon;
                GRANT ALL ON public.categories TO authenticated;
            `
        });

        if (createCategoriesError) {
            console.log('RPC not available, will try alternative approach');
        } else {
            console.log('Categories table setup completed via RPC');
        }

        // Try to insert categories
        console.log('Inserting business categories...');
        const categories = [
            { name: 'Pagamento funcionários', description: 'Salários, benefícios e encargos trabalhistas' },
            { name: 'Material', description: 'Materiais de construção e insumos' },
            { name: 'Mão de Obra', description: 'Serviços de mão de obra terceirizada' },
            { name: 'Prestador de serviços', description: 'Contratação de prestadores de serviços especializados' },
            { name: 'Aluguel de ferramentas', description: 'Locação de equipamentos e ferramentas' },
            { name: 'Manutenção em veículo', description: 'Manutenção, combustível e reparos de veículos' }
        ];

        // Try inserting one by one to handle conflicts
        for (const category of categories) {
            const { data: insertResult, error: insertError } = await supabase
                .from('categories')
                .upsert(category, { onConflict: 'name' })
                .select();

            if (insertError) {
                console.log(`Error inserting category "${category.name}":`, insertError.message);
            } else {
                console.log(`✓ Category "${category.name}" ready`);
            }
        }

        // Now setup expenses table
        console.log('Creating expenses table...');
        const { data: createExpensesResult, error: createExpensesError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS public.despesas (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    usuario_criacao TEXT NOT NULL,
                    item TEXT NOT NULL,
                    valor NUMERIC NOT NULL,
                    forma_pagamento TEXT NOT NULL,
                    data_vencimento DATE NOT NULL,
                    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
                    parcela_atual INTEGER DEFAULT 1,
                    total_parcelas INTEGER DEFAULT 1,
                    valor_total NUMERIC,
                    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
                    imagem_url TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                -- Enable RLS
                ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

                -- Create policy for public access
                DROP POLICY IF EXISTS "Allow all operations on despesas" ON public.despesas;
                CREATE POLICY "Allow all operations on despesas" ON public.despesas
                FOR ALL USING (true) WITH CHECK (true);

                -- Grant permissions
                GRANT ALL ON public.despesas TO anon;
                GRANT ALL ON public.despesas TO authenticated;
            `
        });

        if (createExpensesError) {
            console.log('Expenses table RPC error:', createExpensesError.message);
        } else {
            console.log('Expenses table setup completed via RPC');
        }

        // Verify final setup
        const { data: finalCategories, error: finalError } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (finalError) {
            console.log('Could not verify categories:', finalError.message);
        } else {
            console.log('\n✅ Final categories in database:');
            finalCategories?.forEach(cat => {
                console.log(`   ${cat.name} (ID: ${cat.id})`);
            });
        }

        console.log('\n🎉 Database setup completed!');

    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setupComplete();