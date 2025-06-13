const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupSimple() {
    try {
        console.log('Checking existing categories...');
        
        // Check current categories
        const { data: existingCategories, error: selectError } = await supabase
            .from('categories')
            .select('*');

        if (selectError) {
            console.log('Categories table may not exist:', selectError.message);
            console.log('\nPor favor, crie as tabelas no painel do Supabase:');
            console.log('1. Acesse https://supabase.com/dashboard');
            console.log('2. Vá para SQL Editor');
            console.log('3. Execute este SQL:');
            console.log(`
-- Criar tabela de categorias
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso público
CREATE POLICY "Allow all operations on categories" ON public.categories
FOR ALL USING (true) WITH CHECK (true);

-- Conceder permissões
GRANT ALL ON public.categories TO anon;
GRANT ALL ON public.categories TO authenticated;

-- Criar tabela de despesas
CREATE TABLE public.despesas (
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

-- Habilitar RLS
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso público
CREATE POLICY "Allow all operations on despesas" ON public.despesas
FOR ALL USING (true) WITH CHECK (true);

-- Conceder permissões
GRANT ALL ON public.despesas TO anon;
GRANT ALL ON public.despesas TO authenticated;
            `);
            return;
        }

        console.log('Categories table exists. Current categories:', existingCategories?.length || 0);

        // Clear existing categories
        if (existingCategories && existingCategories.length > 0) {
            console.log('Clearing existing categories...');
            const { error: deleteError } = await supabase
                .from('categories')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (deleteError) {
                console.log('Could not clear categories:', deleteError.message);
            }
        }

        // Insert new categories (only name field)
        console.log('Inserting business categories...');
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
            .insert(categories)
            .select();

        if (insertError) {
            console.log('Error inserting categories:', insertError.message);
            return;
        }

        console.log('Categories inserted successfully!');
        
        // Show final categories with IDs for JavaScript
        const { data: finalCategories, error: finalError } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (!finalError && finalCategories) {
            console.log('\nCategorias criadas (para usar no JavaScript):');
            finalCategories.forEach(cat => {
                console.log(`{ id: '${cat.id}', name: '${cat.name}' },`);
            });
        }

    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setupSimple();