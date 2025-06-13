-- INSTRUÇÕES: Execute este SQL no painel do Supabase
-- 1. Acesse https://supabase.com/dashboard
-- 2. Selecione seu projeto
-- 3. Vá em "SQL Editor"
-- 4. Cole e execute este código completo

-- Criar tabela de categorias
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso público para categories
DROP POLICY IF EXISTS "Allow all operations on categories" ON public.categories;
CREATE POLICY "Allow all operations on categories" ON public.categories
FOR ALL USING (true) WITH CHECK (true);

-- Conceder permissões para categories
GRANT ALL ON public.categories TO anon;
GRANT ALL ON public.categories TO authenticated;

-- Inserir categorias de negócio
INSERT INTO public.categories (name) VALUES 
    ('Pagamento funcionários'),
    ('Material'),
    ('Mão de Obra'),
    ('Prestador de serviços'),
    ('Aluguel de ferramentas'),
    ('Manutenção em veículo')
ON CONFLICT (name) DO NOTHING;

-- Criar tabela de despesas
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

-- Habilitar RLS na tabela despesas
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso público para despesas
DROP POLICY IF EXISTS "Allow all operations on despesas" ON public.despesas;
CREATE POLICY "Allow all operations on despesas" ON public.despesas
FOR ALL USING (true) WITH CHECK (true);

-- Conceder permissões para despesas
GRANT ALL ON public.despesas TO anon;
GRANT ALL ON public.despesas TO authenticated;

-- Verificar se tudo foi criado corretamente
SELECT 'Categories created:' as status, count(*) as total FROM public.categories;
SELECT 'Tables ready:' as status, tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('categories', 'despesas');