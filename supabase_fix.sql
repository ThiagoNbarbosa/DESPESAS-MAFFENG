-- CORREÇÃO DE PERMISSÕES SUPABASE - Execute no SQL Editor

-- 1. Recriar tabela user_profiles com permissões corretas
DROP TABLE IF EXISTS public.user_profiles CASCADE;

CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'gerente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Desabilitar RLS completamente para evitar problemas de permissão
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 3. Conceder permissões completas para todos os roles
GRANT ALL PRIVILEGES ON public.user_profiles TO anon;
GRANT ALL PRIVILEGES ON public.user_profiles TO authenticated;
GRANT ALL PRIVILEGES ON public.user_profiles TO service_role;

-- 4. Garantir permissões no schema public
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- 5. Dar permissões de criação no schema public
GRANT CREATE ON SCHEMA public TO anon;
GRANT CREATE ON SCHEMA public TO authenticated;
GRANT CREATE ON SCHEMA public TO service_role;

-- 6. Verificar e corrigir tabela despesas
ALTER TABLE public.despesas DISABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON public.despesas TO anon;
GRANT ALL PRIVILEGES ON public.despesas TO authenticated;
GRANT ALL PRIVILEGES ON public.despesas TO service_role;

-- 7. Função para criar perfil automaticamente (com permissões de SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 
        'gerente'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 8. Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Configurar storage bucket para receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'receipts', 
    'receipts', 
    false, 
    52428800, -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) 
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 10. Políticas de storage mais permissivas
DROP POLICY IF EXISTS "authenticated_uploads" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_access" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete" ON storage.objects;

CREATE POLICY "allow_all_authenticated" ON storage.objects
    FOR ALL USING (bucket_id = 'receipts')
    WITH CHECK (bucket_id = 'receipts');

-- 11. Inserir usuários de teste (execute apenas se não existirem)
-- Nota: Você precisa criar estes usuários manualmente em Authentication > Users primeiro

-- Verificar se os usuários existem antes de inserir perfis
DO $$
BEGIN
    -- Inserir perfis apenas se não existirem
    INSERT INTO public.user_profiles (id, email, name, role) VALUES
    -- Substitua os UUIDs pelos IDs reais dos usuários criados no painel Authentication
    ('00000000-0000-0000-0000-000000000001', 'thiago@maffeng.com', 'Thiago Mafra', 'admin'),
    ('00000000-0000-0000-0000-000000000002', 'ygor@maffeng.com', 'Ygor Mafra', 'admin'),
    ('00000000-0000-0000-0000-000000000003', 'user@maffeng.com', 'Usuário Gerente', 'gerente'),
    ('00000000-0000-0000-0000-000000000004', 'mikaelly@maffeng.com', 'Mikaelly', 'gerente')
    ON CONFLICT (email) DO NOTHING;
    
    RAISE NOTICE 'Usuários de exemplo inseridos (se não existiam)';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao inserir usuários: %', SQLERRM;
END $$;

-- 12. Verificar resultado
SELECT 'user_profiles' as tabela, count(*) as registros FROM public.user_profiles
UNION ALL
SELECT 'despesas' as tabela, count(*) as registros FROM public.despesas;

-- 13. Mostrar permissões atuais
SELECT 
    schemaname, 
    tablename, 
    tableowner, 
    hasinserts, 
    hasselects, 
    hasupdates, 
    hasdeletes 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'despesas');

RAISE NOTICE 'Correção de permissões concluída!';
RAISE NOTICE 'Agora crie os usuários manualmente em Authentication > Users';
RAISE NOTICE 'Depois execute: UPDATE user_profiles SET id = ''ID_REAL_DO_USUARIO'' WHERE email = ''email@exemplo.com''';