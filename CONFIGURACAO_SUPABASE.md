# Configuração Completa do Supabase para TMS Dashboard

## PROBLEMA RESOLVIDO: Erro de Permissões
Se você está vendo erro "permission denied for table user_profiles", siga este guia atualizado.

## 1. Configurações de Autenticação (Authentication Settings)

### Passo 1: Acessar Authentication Settings
1. No painel Supabase, vá para **Authentication** > **Settings**
2. Na seção **General**:
   - **Enable email confirmations**: ❌ DESATIVAR (para desenvolvimento)
   - **Enable phone confirmations**: ❌ DESATIVAR 
   - **Enable manual linking**: ✅ ATIVAR

### Passo 2: Configurar Email Templates (opcional para desenvolvimento)
1. Em **Auth** > **Email Templates**
2. Pode deixar padrão para desenvolvimento

## 2. CORREÇÃO DE PERMISSÕES - Execute este SQL primeiro

### Passo 1: SQL Editor - Corrigir Permissões
1. Vá para **SQL Editor** no painel Supabase
2. Cole e execute o arquivo `supabase_fix.sql` ou este SQL:

```sql
-- CORREÇÃO COMPLETA DE PERMISSÕES SUPABASE

-- 1. Recriar tabela user_profiles com permissões corretas
DROP TABLE IF EXISTS public.user_profiles CASCADE;

CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'gerente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Desabilitar RLS completamente
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas DISABLE ROW LEVEL SECURITY;

-- 3. Conceder TODAS as permissões para todos os roles
GRANT ALL PRIVILEGES ON public.user_profiles TO anon;
GRANT ALL PRIVILEGES ON public.user_profiles TO authenticated;
GRANT ALL PRIVILEGES ON public.user_profiles TO service_role;
GRANT ALL PRIVILEGES ON public.despesas TO anon;
GRANT ALL PRIVILEGES ON public.despesas TO authenticated;
GRANT ALL PRIVILEGES ON public.despesas TO service_role;

-- 4. Garantir permissões no schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT CREATE ON SCHEMA public TO anon;
GRANT CREATE ON SCHEMA public TO authenticated;
GRANT CREATE ON SCHEMA public TO service_role;

-- 5. Função para criar perfil automaticamente (com SECURITY DEFINER)
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
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 6. Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Storage para imagens
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

-- 8. Políticas de storage permissivas
DROP POLICY IF EXISTS "authenticated_uploads" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_access" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete" ON storage.objects;

CREATE POLICY "allow_all_authenticated" ON storage.objects
    FOR ALL USING (bucket_id = 'receipts')
    WITH CHECK (bucket_id = 'receipts');
```

## 3. SOLUÇÃO PARA ERRO DE PERMISSÕES

### O Problema
Se você está vendo "permission denied for table user_profiles", significa que as políticas RLS estão bloqueando as operações.

### Solução Rápida
Execute este SQL no **SQL Editor** para desabilitar completamente o RLS:

```sql
-- DESABILITAR RLS COMPLETAMENTE (para desenvolvimento)
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_profiles;

-- Garantir permissões máximas
GRANT ALL ON public.user_profiles TO anon;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.despesas TO anon;
GRANT ALL ON public.despesas TO authenticated; 
GRANT ALL ON public.despesas TO service_role;
```

## 4. Criar Usuários Manualmente (PASSO OBRIGATÓRIO)

### Passo 1: Adicionar Usuários no Painel
1. Vá para **Authentication** > **Users**
2. Clique em **Add user** para cada um:

**Usuário 1 (Admin):**
- Email: `thiago@maffeng.com`
- Password: `TMS@2025!`
- Auto Confirm User: ✅ MARCAR

**Usuário 2 (Admin):**
- Email: `ygor@maffeng.com` 
- Password: `TMS@2025!`
- Auto Confirm User: ✅ MARCAR

**Usuário 3 (Gerente):**
- Email: `user@maffeng.com`
- Password: `TMS@2025!`
- Auto Confirm User: ✅ MARCAR

**Usuário 4 (Gerente):**
- Email: `mikaelly@maffeng.com`
- Password: `TMS@2025!`
- Auto Confirm User: ✅ MARCAR

### Passo 2: Criar Perfis Manualmente
Após criar os usuários de autenticação, execute este SQL:

```sql
-- Inserir perfis manualmente (substitua os IDs pelos reais)
-- Copie o ID de cada usuário da aba Authentication > Users

INSERT INTO public.user_profiles (id, email, name, role) VALUES 
-- Substitua 'ID_DO_USUARIO' pelo UUID real de cada usuário
('ID_DO_THIAGO', 'thiago@maffeng.com', 'Thiago Mafra', 'admin'),
('ID_DO_YGOR', 'ygor@maffeng.com', 'Ygor Mafra', 'admin'),
('ID_DO_USER', 'user@maffeng.com', 'Usuário Gerente', 'gerente'),
('ID_DA_MIKAELLY', 'mikaelly@maffeng.com', 'Mikaelly', 'gerente')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role;
```

## 4. Verificar Configuração

### Passo 1: Verificar Usuários
Execute este SQL para conferir:
```sql
SELECT email, name, role, created_at 
FROM public.user_profiles 
ORDER BY created_at;
```

### Passo 2: Testar Login
1. Acesse `/login.html` no seu projeto
2. Teste login com: `thiago@maffeng.com` / `TMS@2025!`
3. Deve redirecionar para o dashboard com sucesso

## 5. Problemas Comuns e Soluções

### Problema: "Database error creating new user"
**Solução**: Verifique se:
1. Authentication está ativado no projeto Supabase
2. Email confirmations estão DESATIVADAS
3. O SQL de configuração foi executado completamente

### Problema: "User already exists"
**Solução**: 
1. Delete o usuário em Authentication > Users
2. Delete o perfil em SQL: `DELETE FROM user_profiles WHERE email = 'email@exemplo.com'`
3. Recrie o usuário

### Problema: Login não funciona
**Solução**:
1. Verifique se as variáveis de ambiente estão corretas
2. Confirme que o usuário está com status "confirmed" 
3. Teste as credenciais no painel Supabase

## 6. URLs de Acesso Final
- Login: `/login.html`
- Dashboard: `/` (redireciona para login se não autenticado)
- Perfil: `/profile.html`

## 5. COMO DEFINIR NÍVEIS DE ACESSO (Admin vs Gerente)

### O que cada nível pode fazer:

**ADMINISTRADOR:**
- Visualizar todas as despesas do sistema
- Criar novas despesas  
- Editar qualquer despesa (de qualquer usuário)
- Excluir despesas
- Marcar despesas como pagas
- Acesso completo ao sistema

**GERENTE:**
- Visualizar todas as despesas do sistema
- Criar novas despesas
- Editar apenas suas próprias despesas
- Não pode excluir despesas
- Pode marcar suas despesas como pagas

### Como alterar o nível de um usuário:

1. **Via SQL Editor no Supabase:**
```sql
-- Para tornar um usuário ADMIN
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'email@usuario.com';

-- Para tornar um usuário GERENTE
UPDATE public.user_profiles 
SET role = 'gerente' 
WHERE email = 'email@usuario.com';

-- Verificar todos os usuários e seus níveis
SELECT email, name, role, created_at 
FROM public.user_profiles 
ORDER BY role, name;
```

2. **Criando novos usuários com nível específico:**
   - Crie o usuário em Authentication > Users
   - Copie o ID do usuário
   - Execute o SQL:
```sql
INSERT INTO public.user_profiles (id, email, name, role) VALUES 
('ID_DO_USUARIO', 'novo@email.com', 'Nome Completo', 'admin');
-- ou 'gerente' para nível gerente
```

### Controle de Acesso no Sistema:

O sistema automaticamente controla o que cada usuário pode fazer:

- **Botões de edição/exclusão:** Só aparecem se o usuário tiver permissão
- **Formulários:** Adaptam-se ao nível do usuário
- **Página de perfil:** Mostra as permissões específicas do usuário

## Credenciais Finais
- **Admin**: thiago@maffeng.com / TMS@2025!
- **Admin**: ygor@maffeng.com / TMS@2025!  
- **Gerente**: user@maffeng.com / TMS@2025!
- **Gerente**: mikaelly@maffeng.com / TMS@2025!

## Resolução de Problemas Comuns

### Login retorna "email_provider_disabled"
1. Vá para Authentication > Settings
2. Em "Auth Providers", certifique-se que "Email" está ATIVADO
3. Salve as configurações

### Usuário criado mas não consegue fazer login
1. Verifique se "Auto Confirm User" foi marcado
2. Se não foi, vá em Authentication > Users
3. Clique no usuário e marque "Email Confirmed"

### Despesas não aparecem para gerentes
1. Verifique se o usuário tem perfil criado na tabela user_profiles
2. Execute: `SELECT * FROM user_profiles WHERE email = 'email@usuario.com'`
3. Se não existir, crie manualmente