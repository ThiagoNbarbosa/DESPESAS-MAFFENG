// Profile Page JavaScript
const { createClient } = supabase;

// Initialize Supabase client
const supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

let currentUser = null;
let userProfile = null;

// Initialize profile page
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuthentication();
    if (currentUser) {
        await loadUserProfile();
        await loadUserStats();
        updateUserInterface();
        setupPermissions();
    }
});

// Check if user is authenticated
async function checkAuthentication() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error || !user) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = '/login.html';
            return;
        }
        
        currentUser = user;
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = '/login.html';
    }
}

// Load user profile from database
async function loadUserProfile() {
    if (!currentUser) return;

    showLoading(true);
    
    try {
        const { data, error } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.error('Error loading profile:', error);
            showNotification('Erro ao carregar perfil do usuário', 'error');
            return;
        }

        userProfile = data;
        
    } catch (error) {
        console.error('Profile loading failed:', error);
        showNotification('Erro ao conectar com o banco de dados', 'error');
    } finally {
        showLoading(false);
    }
}

// Load user statistics
async function loadUserStats() {
    if (!currentUser || !userProfile) return;

    try {
        // Get user's expenses based on role
        let query = supabaseClient.from('despesas').select('*');
        
        // If user is not admin, only show their own expenses
        if (userProfile.role !== 'admin') {
            query = query.eq('created_by', currentUser.id);
        }

        const { data: expenses, error } = await query;

        if (error) {
            console.error('Error loading expenses:', error);
            return;
        }

        // Calculate statistics
        const totalExpenses = expenses.length;
        const totalAmount = expenses.reduce((sum, expense) => sum + parseFloat(expense.valor || 0), 0);
        const paidExpenses = expenses.filter(expense => expense.status === 'paid').length;
        const pendingExpenses = expenses.filter(expense => expense.status === 'pending').length;

        // Update UI
        document.getElementById('total-expenses').textContent = totalExpenses;
        document.getElementById('total-amount').textContent = formatCurrencyDisplay(totalAmount);
        document.getElementById('paid-expenses').textContent = paidExpenses;
        document.getElementById('pending-expenses').textContent = pendingExpenses;

    } catch (error) {
        console.error('Stats loading failed:', error);
    }
}

// Update user interface with profile data
function updateUserInterface() {
    if (!userProfile) return;

    // Update profile information
    document.getElementById('profile-name').textContent = userProfile.name || 'Nome não informado';
    document.getElementById('profile-email').textContent = userProfile.email;
    document.getElementById('profile-created').textContent = formatDate(userProfile.created_at);

    // Update role badge
    const roleBadge = document.getElementById('profile-role');
    roleBadge.textContent = userProfile.role === 'admin' ? 'Administrador' : 'Gerente';
    roleBadge.className = `role-badge ${userProfile.role}`;

    // Update header with user info
    updateHeaderUserInfo();
}

// Update header with user information
function updateHeaderUserInfo() {
    const headerContent = document.querySelector('.header-content');
    
    // Remove existing user info if present
    const existingUserInfo = headerContent.querySelector('.user-info');
    if (existingUserInfo) {
        existingUserInfo.remove();
    }

    // Add user info to header
    const userInfoHTML = `
        <div class="user-info">
            <div class="user-details">
                <span class="user-name">${userProfile.name}</span>
                <span class="user-role">${userProfile.role === 'admin' ? 'Administrador' : 'Gerente'}</span>
            </div>
            <div class="user-actions">
                <button onclick="goBackToDashboard()" class="btn-secondary">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </button>
                <button onclick="handleLogout()" class="btn-logout">
                    <i class="fas fa-sign-out-alt"></i> Sair
                </button>
            </div>
        </div>
    `;
    
    headerContent.insertAdjacentHTML('beforeend', userInfoHTML);
}

// Setup permissions display based on user role
function setupPermissions() {
    if (!userProfile) return;

    const permissions = {
        view: true, // All users can view
        create: true, // All users can create
        edit: userProfile.role === 'admin', // Only admins can edit all
        delete: userProfile.role === 'admin' // Only admins can delete
    };

    // Update permission items
    updatePermissionItem('view-permission', permissions.view, 'Visualizar todas as despesas');
    updatePermissionItem('create-permission', permissions.create, 'Criar novas despesas');
    
    if (userProfile.role === 'admin') {
        updatePermissionItem('edit-permission', permissions.edit, 'Editar qualquer despesa');
        updatePermissionItem('delete-permission', permissions.delete, 'Excluir qualquer despesa');
    } else {
        updatePermissionItem('edit-permission', false, 'Editar apenas suas despesas');
        updatePermissionItem('delete-permission', false, 'Não pode excluir despesas');
    }
}

// Update individual permission item
function updatePermissionItem(elementId, hasPermission, description) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const span = element.querySelector('span');
    if (span) {
        span.textContent = description;
    }

    if (hasPermission) {
        element.classList.remove('disabled');
    } else {
        element.classList.add('disabled');
    }
}

// Go back to dashboard
function goBackToDashboard() {
    window.location.href = '/';
}

// Handle logout
async function handleLogout() {
    try {
        showLoading(true);
        
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            console.error('Logout error:', error);
            showNotification('Erro ao fazer logout', 'error');
            return;
        }

        showNotification('Logout realizado com sucesso', 'success');
        
        // Redirect to login after short delay
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);

    } catch (error) {
        console.error('Logout failed:', error);
        showNotification('Erro inesperado ao fazer logout', 'error');
    } finally {
        showLoading(false);
    }
}

// Format currency for display
function formatCurrencyDisplay(value) {
    if (isNaN(value) || value === null || value === undefined) {
        return 'R$ 0,00';
    }
    
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'Data não informada';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = getNotificationIcon(type);
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
    `;

    container.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);

    // Allow manual close
    notification.addEventListener('click', () => {
        notification.remove();
    });
}

// Get notification icon based on type
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}