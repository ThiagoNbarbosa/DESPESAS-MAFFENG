-- CONFIGURAÇÃO SIMPLES DE AUTENTICAÇÃO SUPABASE
-- Execute este SQL no painel Supabase > SQL Editor

-- 1. Criar tabela de perfis (sem RLS inicialmente)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'gerente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Desabilitar RLS para permitir operações iniciais
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 3. Conceder permissões básicas
GRANT ALL ON public.user_profiles TO anon;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 4. Configurar tabela despesas para aceitar autenticação
ALTER TABLE public.despesas DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.despesas TO anon;
GRANT ALL ON public.despesas TO authenticated;

-- 5. Configurar storage para imagens
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false) 
ON CONFLICT (id) DO UPDATE SET public = false;

-- 6. Políticas de storage básicas
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated access" ON storage.objects;

CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Allow authenticated access" ON storage.objects
    FOR SELECT USING (bucket_id = 'receipts');

-- 7. Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 'gerente')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- NOTA: Após executar este SQL, vá para Authentication > Users e crie os usuários manualmente:
-- thiago@maffeng.com
-- ygor@maffeng.com  
-- user@maffeng.com
-- mikaelly@maffeng.com
-- 
-- Depois execute o SQL abaixo para definir os roles corretos:

-- UPDATE public.user_profiles SET role = 'admin', name = 'Thiago Mafra' WHERE email = 'thiago@maffeng.com';
-- UPDATE public.user_profiles SET role = 'admin', name = 'Ygor Mafra' WHERE email = 'ygor@maffeng.com';
-- UPDATE public.user_profiles SET role = 'gerente', name = 'Usuário Gerente' WHERE email = 'user@maffeng.com';
-- UPDATE public.user_profiles SET role = 'gerente', name = 'Mikaelly' WHERE email = 'mikaelly@maffeng.com';