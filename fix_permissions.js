// Script to fix Supabase RLS permissions
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPermissions() {
    try {
        console.log('Fixing RLS permissions...');
        
        // Disable RLS for now (for development)
        const { error: disableRLSError } = await supabase.rpc('exec_sql', {
            sql: `
                -- Disable RLS on tables
                ALTER TABLE public.despesas DISABLE ROW LEVEL SECURITY;
                
                -- Grant permissions to authenticated users
                GRANT ALL ON public.despesas TO authenticated;
                GRANT ALL ON public.despesas TO anon;
                
                -- Grant permissions on storage buckets
                INSERT INTO storage.buckets (id, name, public) 
                VALUES ('receipts', 'receipts', true) 
                ON CONFLICT (id) DO NOTHING;
                
                -- Create storage policies
                CREATE POLICY "Anyone can upload receipts" ON storage.objects 
                FOR INSERT WITH CHECK (bucket_id = 'receipts');
                
                CREATE POLICY "Anyone can view receipts" ON storage.objects 
                FOR SELECT USING (bucket_id = 'receipts');
            `
        });
        
        if (disableRLSError) {
            console.error('Error disabling RLS:', disableRLSError);
            return;
        }
        
        console.log('RLS permissions fixed successfully!');
        
    } catch (error) {
        console.error('Error fixing permissions:', error);
    }
}

fixPermissions();