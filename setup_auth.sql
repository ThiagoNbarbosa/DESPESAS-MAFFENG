-- Configuração completa de autenticação e perfis de usuário

-- 1. Primeiro, certificar que auth está habilitado
-- Este comando deve ser executado no painel Supabase > SQL Editor

-- 2. Criar tabela de perfis de usuário
DROP TABLE IF EXISTS public.user_profiles CASCADE;
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'gerente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Conceder permissões públicas temporariamente
GRANT ALL ON public.user_profiles TO anon;
GRANT ALL ON public.user_profiles TO authenticated;

-- 5. Criar função para criar perfil automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), 'gerente');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar trigger para execução automática
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Inserir usuários predefinidos manualmente
-- Estes usuários devem ser criados primeiro no painel Authentication > Users
-- Depois execute este INSERT para criar os perfis

-- 7. Atualizar políticas da tabela despesas para controle de acesso
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Política para visualização: gerentes veem só suas despesas, admins veem tudo
CREATE POLICY "View expenses policy" ON public.despesas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR usuario_criacao = (
                SELECT name FROM public.user_profiles WHERE id = auth.uid()
            ))
        )
    );

-- Política para inserção: usuários autenticados podem criar despesas
CREATE POLICY "Insert expenses policy" ON public.despesas
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid())
    );

-- Política para atualização: gerentes só suas despesas, admins tudo
CREATE POLICY "Update expenses policy" ON public.despesas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR usuario_criacao = (
                SELECT name FROM public.user_profiles WHERE id = auth.uid()
            ))
        )
    );

-- 8. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_despesas_usuario ON public.despesas(usuario_criacao);

-- 9. Configurar storage policies para receipts bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false) 
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage policies para usuários autenticados
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'receipts' AND 
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Authenticated users can view receipts" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'receipts' AND 
        auth.uid() IS NOT NULL
    );

-- 10. Função helper para verificar role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM public.user_profiles 
    WHERE id = user_id;
    
    RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;