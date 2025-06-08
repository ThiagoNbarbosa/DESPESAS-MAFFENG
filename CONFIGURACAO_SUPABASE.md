# Configuração Completa do Supabase para TMS Dashboard

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

## 2. Executar SQL de Configuração

### Passo 1: SQL Editor
1. Vá para **SQL Editor** no painel Supabase
2. Cole e execute o SQL abaixo:

```sql
-- CONFIGURAÇÃO COMPLETA DO TMS DASHBOARD

-- 1. Criar tabela de perfis
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'gerente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Remover RLS temporariamente
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas DISABLE ROW LEVEL SECURITY;

-- 3. Conceder permissões
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON public.despesas TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 4. Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name, role)
    VALUES (NEW.id, NEW.email, 
            COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 
            'gerente')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para auto-criação de perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Storage para imagens
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false) 
ON CONFLICT (id) DO NOTHING;

-- 7. Políticas de storage
DROP POLICY IF EXISTS "authenticated_uploads" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_access" ON storage.objects;

CREATE POLICY "authenticated_uploads" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "authenticated_access" ON storage.objects
    FOR SELECT USING (bucket_id = 'receipts');
```

## 3. Criar Usuários Manualmente

### Passo 1: Adicionar Usuários
1. Vá para **Authentication** > **Users**
2. Clique em **Add user**
3. Para cada usuário, preencha:

**Usuário 1:**
- Email: `thiago@maffeng.com`
- Password: `TMS@2025!`
- Auto Confirm User: ✅ SIM

**Usuário 2:**
- Email: `ygor@maffeng.com` 
- Password: `TMS@2025!`
- Auto Confirm User: ✅ SIM

**Usuário 3:**
- Email: `user@maffeng.com`
- Password: `TMS@2025!`
- Auto Confirm User: ✅ SIM

**Usuário 4:**
- Email: `mikaelly@maffeng.com`
- Password: `TMS@2025!`
- Auto Confirm User: ✅ SIM

### Passo 2: Configurar Roles dos Usuários
Após criar todos os usuários, execute este SQL:

```sql
-- Atualizar roles e nomes dos usuários
UPDATE public.user_profiles SET 
    role = 'admin', 
    name = 'Thiago Mafra' 
WHERE email = 'thiago@maffeng.com';

UPDATE public.user_profiles SET 
    role = 'admin', 
    name = 'Ygor Mafra' 
WHERE email = 'ygor@maffeng.com';

UPDATE public.user_profiles SET 
    role = 'gerente', 
    name = 'Usuário Gerente' 
WHERE email = 'user@maffeng.com';

UPDATE public.user_profiles SET 
    role = 'gerente', 
    name = 'Mikaelly' 
WHERE email = 'mikaelly@maffeng.com';
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

## Credenciais Finais
- **Admin**: thiago@maffeng.com / TMS@2025!
- **Admin**: ygor@maffeng.com / TMS@2025!  
- **Gerente**: user@maffeng.com / TMS@2025!
- **Gerente**: mikaelly@maffeng.com / TMS@2025!