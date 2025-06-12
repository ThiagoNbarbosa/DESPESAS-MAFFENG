// Login functionality
let supabase;

// Initialize Supabase client
document.addEventListener('DOMContentLoaded', function() {
    if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        console.log('Supabase initialized for login');
        
        // Temporarily disabled to prevent redirect loop
        // checkExistingAuth();
    } else {
        console.error('Supabase configuration missing');
        showNotification('Erro de configuração do sistema', 'error');
    }
    
    // Setup event listeners
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    loginForm.addEventListener('submit', handleLogin);
    
    // Enter key navigation
    emailInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });
    
    passwordInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
}

// Check if user is already authenticated
async function checkExistingAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (user && !error) {
            // User is already logged in, redirect to dashboard
            window.location.href = '/';
        }
    } catch (error) {
        console.log('No existing authentication found');
        // Don't redirect on auth errors from login page
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('login-btn');
    const loading = document.getElementById('loading');
    
    if (!email || !password) {
        showNotification('Por favor, preencha todos os campos', 'error');
        return;
    }
    
    try {
        // Show loading state
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> Entrando...';
        loading.style.display = 'block';
        
        // Attempt authentication
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            throw error;
        }
        
        if (data.user) {
            // Get user profile and role
            const userProfile = await getUserProfile(data.user.id);
            
            if (userProfile) {
                // Store user info in localStorage for quick access
                localStorage.setItem('tms_user', JSON.stringify({
                    id: data.user.id,
                    email: data.user.email,
                    name: userProfile.name,
                    role: userProfile.role
                }));
                
                showNotification(`Bem-vindo, ${userProfile.name}!`, 'success');
                
                // Redirect to dashboard after short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                throw new Error('Perfil de usuário não encontrado');
            }
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        let errorMessage = 'Erro ao fazer login';
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'E-mail ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'E-mail não confirmado';
        } else if (error.message.includes('Too many requests')) {
            errorMessage = 'Muitas tentativas. Tente novamente em alguns minutos';
        } else if (error.message.includes('Perfil de usuário não encontrado')) {
            errorMessage = 'Usuário não autorizado. Entre em contato com o administrador';
        }
        
        showNotification(errorMessage, 'error');
        
    } finally {
        // Reset loading state
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
        loading.style.display = 'none';
    }
}

// Get user profile from database
async function getUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Error in getUserProfile:', error);
        return null;
    }
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleBtn.className = 'fas fa-eye';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = getNotificationIcon(type);
    
    notification.innerHTML = `
        <i class="${icon}"></i>
        <div class="notification-content">
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    container.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

// Get notification icon based on type
function getNotificationIcon(type) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    return icons[type] || icons.info;
}