// Script para criar usuários diretamente no Supabase
// Execute este arquivo com: node create_users.js

const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Chave de serviço, não anon

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas');
    console.log('Configure as variáveis de ambiente primeiro');
    process.exit(1);
}

// Cliente Supabase com chave de serviço (admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Usuários para criar
const users = [
    {
        email: 'thiago@maffeng.com',
        password: 'TMS@2025!',
        name: 'Thiago Mafra',
        role: 'admin'
    },
    {
        email: 'ygor@maffeng.com',
        password: 'TMS@2025!',
        name: 'Ygor Mafra',
        role: 'admin'
    },
    {
        email: 'user@maffeng.com',
        password: 'TMS@2025!',
        name: 'Usuário Gerente',
        role: 'gerente'
    },
    {
        email: 'mikaelly@maffeng.com',
        password: 'TMS@2025!',
        name: 'Mikaelly',
        role: 'gerente'
    }
];

async function createUsers() {
    console.log('🚀 Iniciando criação de usuários...');
    
    for (const userData of users) {
        try {
            console.log(`\n📧 Criando usuário: ${userData.email}`);
            
            // Criar usuário usando Admin API
            const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true, // Confirmar email automaticamente
                user_metadata: {
                    name: userData.name
                }
            });

            if (authError) {
                if (authError.message.includes('already registered')) {
                    console.log(`⚠️  Usuário ${userData.email} já existe, pulando...`);
                    continue;
                } else {
                    console.error(`❌ Erro ao criar auth user ${userData.email}:`, authError.message);
                    continue;
                }
            }

            console.log(`✅ Usuário auth criado: ${authUser.user.id}`);

            // Criar perfil do usuário
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .upsert({
                    id: authUser.user.id,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role
                }, {
                    onConflict: 'id'
                });

            if (profileError) {
                console.error(`❌ Erro ao criar perfil ${userData.email}:`, profileError.message);
            } else {
                console.log(`✅ Perfil criado para ${userData.email} (${userData.role})`);
            }

        } catch (error) {
            console.error(`❌ Erro inesperado para ${userData.email}:`, error.message);
        }
    }

    console.log('\n🎉 Processo de criação de usuários concluído!');
    
    // Verificar usuários criados
    await verifyUsers();
}

async function verifyUsers() {
    console.log('\n🔍 Verificando usuários criados...');
    
    try {
        const { data: profiles, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at');

        if (error) {
            console.error('❌ Erro ao verificar usuários:', error.message);
            return;
        }

        if (profiles && profiles.length > 0) {
            console.log('\n📋 Usuários encontrados:');
            profiles.forEach(profile => {
                console.log(`   • ${profile.email} - ${profile.name} (${profile.role})`);
            });
        } else {
            console.log('❌ Nenhum usuário encontrado na tabela user_profiles');
        }

        // Verificar Auth users
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (!authError && authUsers) {
            console.log(`\n🔐 Total de usuários Auth: ${authUsers.users.length}`);
        }

    } catch (error) {
        console.error('❌ Erro na verificação:', error.message);
    }
}

async function main() {
    try {
        console.log('🎯 TMS Dashboard - Criador de Usuários');
        console.log('=====================================');
        
        // Testar conexão
        const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
        
        if (error) {
            console.error('❌ Erro de conexão com Supabase:', error.message);
            console.log('\n💡 Dicas para resolver:');
            console.log('1. Verifique se as variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão corretas');
            console.log('2. Execute o SQL de correção de permissões (supabase_fix.sql)');
            console.log('3. Certifique-se que a tabela user_profiles existe');
            return;
        }

        console.log('✅ Conexão com Supabase OK');
        
        await createUsers();
        
    } catch (error) {
        console.error('❌ Erro fatal:', error.message);
    }
}

// Executar script
if (require.main === module) {
    main();
}

module.exports = { createUsers, verifyUsers };