// Script para criar usuários predefinidos no Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Usuários predefinidos
const predefinedUsers = [
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
    console.log('Iniciando criação de usuários...');
    
    for (const userData of predefinedUsers) {
        try {
            console.log(`Criando usuário: ${userData.email}`);
            
            // Criar usuário na autenticação
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true,
                user_metadata: {
                    name: userData.name
                }
            });
            
            if (authError) {
                if (authError.message.includes('already registered')) {
                    console.log(`  ⚠️  Usuário ${userData.email} já existe na autenticação`);
                    
                    // Tentar obter o usuário existente
                    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
                    if (!listError) {
                        const existingUser = existingUsers.users.find(u => u.email === userData.email);
                        if (existingUser) {
                            // Verificar se perfil existe
                            const { data: profileData, error: profileError } = await supabase
                                .from('user_profiles')
                                .select('*')
                                .eq('id', existingUser.id)
                                .single();
                            
                            if (profileError && profileError.code === 'PGRST116') {
                                // Perfil não existe, criar
                                console.log(`  📝 Criando perfil para usuário existente: ${userData.email}`);
                                const { error: insertError } = await supabase
                                    .from('user_profiles')
                                    .insert({
                                        id: existingUser.id,
                                        email: userData.email,
                                        name: userData.name,
                                        role: userData.role
                                    });
                                
                                if (insertError) {
                                    console.error(`  ❌ Erro ao criar perfil para ${userData.email}:`, insertError.message);
                                } else {
                                    console.log(`  ✅ Perfil criado para ${userData.email}`);
                                }
                            } else {
                                console.log(`  ✅ Perfil já existe para ${userData.email}`);
                            }
                        }
                    }
                    continue;
                } else {
                    throw authError;
                }
            }
            
            if (authData.user) {
                console.log(`  ✅ Usuário criado na autenticação: ${userData.email}`);
                
                // Criar perfil do usuário
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .insert({
                        id: authData.user.id,
                        email: userData.email,
                        name: userData.name,
                        role: userData.role
                    });
                
                if (profileError) {
                    console.error(`  ❌ Erro ao criar perfil para ${userData.email}:`, profileError.message);
                } else {
                    console.log(`  ✅ Perfil criado para ${userData.email}`);
                }
            }
            
        } catch (error) {
            console.error(`❌ Erro ao processar usuário ${userData.email}:`, error.message);
        }
    }
    
    console.log('\n📋 Resumo dos usuários criados:');
    console.log('Email: thiago@maffeng.com | Senha: TMS@2025! | Role: admin');
    console.log('Email: ygor@maffeng.com | Senha: TMS@2025! | Role: admin');
    console.log('Email: user@maffeng.com | Senha: TMS@2025! | Role: gerente');
    console.log('Email: mikaelly@maffeng.com | Senha: TMS@2025! | Role: gerente');
    console.log('\nUsuários prontos para login no sistema TMS Dashboard!');
}

// Verificar conexão e criar usuários
async function main() {
    try {
        // Testar conexão
        const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
        if (error) {
            console.error('❌ Erro de conexão com Supabase:', error.message);
            console.log('Certifique-se de que:');
            console.log('1. As variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão configuradas');
            console.log('2. A tabela user_profiles foi criada (execute setup_auth.sql)');
            return;
        }
        
        console.log('✅ Conexão com Supabase estabelecida');
        await createUsers();
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    }
}

main();