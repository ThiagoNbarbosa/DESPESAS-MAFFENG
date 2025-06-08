-- Execute este SQL no painel do Supabase (SQL Editor) para corrigir permissões

-- 1. Desabilitar RLS temporariamente para desenvolvimento
ALTER TABLE public.despesas DISABLE ROW LEVEL SECURITY;

-- 2. Criar políticas para storage de imagens
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true) 
ON CONFLICT (id) DO NOTHING;

-- 3. Criar políticas de storage
CREATE POLICY "Public upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Public view" ON storage.objects 
FOR SELECT USING (bucket_id = 'receipts');

-- 4. Adicionar colunas para status de pagamento e usuário
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS despesa_pai_id UUID REFERENCES public.despesas(id);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS usuario_criacao TEXT DEFAULT 'Usuário';

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_despesas_status ON public.despesas(status);
CREATE INDEX IF NOT EXISTS idx_despesas_vencimento ON public.despesas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_despesas_pai ON public.despesas(despesa_pai_id);