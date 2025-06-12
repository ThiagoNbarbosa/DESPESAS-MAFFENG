// Supabase Configuration
// Get credentials from window object (injected by HTML template)
const supabaseUrl = window.SUPABASE_URL || '';
const supabaseKey = window.SUPABASE_ANON_KEY || '';

// Initialize Supabase client
let supabase;
if (supabaseUrl && supabaseKey) {
    try {
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log('Supabase initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
    }
} else {
    console.error('Missing Supabase credentials. Please check environment variables.');
}

// Global variables
let expenses = [];
let currentFilter = '';

// DOM Elements
const addExpenseBtn = document.getElementById('add-expense-btn');
const expenseModal = document.getElementById('expense-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const expenseForm = document.getElementById('expense-form');
const monthFilter = document.getElementById('month-filter');
const expensesTable = document.getElementById('expenses-table');
const expensesTbody = document.getElementById('expenses-tbody');
const noExpenses = document.getElementById('no-expenses');
const loadingOverlay = document.getElementById('loading-overlay');
const monthlyTotal = document.getElementById('monthly-total');
const totalExpenses = document.getElementById('total-expenses');
const formaPagamentoSelect = document.getElementById('forma_pagamento');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Try to get user info from authentication first
    tryGetCurrentUser().then(() => {
        initializeApp().then(() => {
            setupEventListeners();
            console.log('App initialized successfully');
        }).catch(error => {
            console.error('Error initializing app:', error);
            setupEventListeners();
        });
    });
});

// Try to get current user info without redirecting
async function tryGetCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (user && !error) {
            const userProfile = await getUserProfile(user.id);
            if (userProfile) {
                window.currentUser = {
                    id: user.id,
                    email: user.email,
                    name: capitalizeWords(userProfile.name),
                    role: userProfile.role
                };
                console.log('User authenticated:', capitalizeWords(userProfile.name));
            }
        }
    } catch (error) {
        console.log('No authenticated user found');
    }
}

// Check authentication before initializing app (disabled to prevent redirect loops)
async function checkAuthentication() {
    console.log('Authentication check disabled to prevent redirect loops');
    return;
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

// Update UI with user information
function updateUserInterface() {
    // Find header content and update structure
    const headerContent = document.querySelector('.header-content');
    
    // Remove existing user info if present
    const existingUserInfo = headerContent.querySelector('.user-info');
    if (existingUserInfo) {
        existingUserInfo.remove();
    }
    
    // Wrap existing content in header-title
    const existingTitle = headerContent.querySelector('h1');
    const existingSubtitle = headerContent.querySelector('p');
    
    if (existingTitle && !existingTitle.parentElement.classList.contains('header-title')) {
        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'header-title';
        titleWrapper.appendChild(existingTitle);
        titleWrapper.appendChild(existingSubtitle);
        headerContent.innerHTML = '';
        headerContent.appendChild(titleWrapper);
    }
    
    // Add user info to the right side of header
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    
    // Capitalize first letter of each word in name
    const capitalizedName = window.currentUser.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    // Translate role to Portuguese
    const roleTranslation = {
        'admin': 'Administrador',
        'gerente': 'Gerente'
    };
    const translatedRole = roleTranslation[window.currentUser.role] || window.currentUser.role;
    
    userInfo.innerHTML = `
        <div class="user-details" onclick="openProfilePage()" title="Clique para ver seu perfil">
            <span class="user-name">${capitalizedName}</span>
            <span class="user-role">${translatedRole}</span>
        </div>
        <div class="user-actions">
            <button onclick="handleLogout()" class="btn-logout" title="Sair do sistema">
                <i class="fas fa-sign-out-alt"></i>
                Sair
            </button>
        </div>
    `;
    
    headerContent.appendChild(userInfo);
    
    // Auto-fill user name in expense form
    const userNameInput = document.getElementById('usuario_criacao');
    if (userNameInput && window.currentUser.name) {
        userNameInput.value = capitalizedName;
        userNameInput.readOnly = true; // Prevent editing
    }
}

// Open profile page
function openProfilePage() {
    window.location.href = '/profile.html';
}

// Handle logout
async function handleLogout() {
    try {
        showLoading(true);
        
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            throw error;
        }
        
        // Clear stored user data
        localStorage.removeItem('tms_user');
        window.currentUser = null;
        
        // Redirect to login
        window.location.href = '/login.html';
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Erro ao fazer logout', 'error');
    } finally {
        showLoading(false);
    }
}

// Load categories (hardcoded for now)
async function loadCategories() {
    try {
        // Business-focused categories for construction/service companies (using real database UUIDs)
        const categories = [
            { id: 'ae285d84-f8e9-44b5-bbdc-873cf3f2004c', name: 'Aluguel de ferramentas', description: 'Locação de equipamentos e ferramentas' },
            { id: '80b32dda-7732-4cf6-b905-efb2cfdb85f4', name: 'Manutenção em veículo', description: 'Manutenção, combustível e reparos de veículos' },
            { id: '14623dfe-5abc-4016-9dbe-b8114cd31672', name: 'Mão de Obra', description: 'Serviços de mão de obra terceirizada' },
            { id: '5ea857de-736f-48b6-90e0-a8c8f0fd2089', name: 'Material', description: 'Materiais de construção e insumos' },
            { id: '392e4150-82f5-48b2-93d0-66db46056118', name: 'Pagamento funcionários', description: 'Salários, benefícios e encargos trabalhistas' },
            { id: '71d03122-fd05-4685-a969-ebfafb31f7e4', name: 'Prestador de serviços', description: 'Contratação de prestadores de serviços especializados' }
        ];

        // Populate category dropdown
        const categorySelect = document.getElementById('category_id');
        categorySelect.innerHTML = '<option value="">Selecione uma categoria...</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });

        // Store categories globally for later use
        window.expenseCategories = categories;
        
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('Erro ao carregar categorias', 'error');
    }
}

// Get category name by ID
function getCategoryName(categoryId) {
    if (!categoryId || !window.expenseCategories) {
        return 'Sem categoria';
    }
    
    const category = window.expenseCategories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Categoria não encontrada';
}

// Initialize the application
async function initializeApp() {
    try {
        showLoading(true);
        await loadCategories();
        await loadExpenses();
        updateSummary();
        showLoading(false);
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Erro ao carregar a aplicação', 'error');
        showLoading(false);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Modal controls
    addExpenseBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Form submission
    expenseForm.addEventListener('submit', handleFormSubmit);
    
    // Month filter
    monthFilter.addEventListener('change', handleMonthFilter);
    
    // Payment method change
    formaPagamentoSelect.addEventListener('change', handlePaymentMethodChange);
    
    // Currency formatting
    document.getElementById('valor').addEventListener('input', function(e) {
        formatCurrencyInput(e.target);
    });
    
    // Close modal when clicking outside
    expenseModal.addEventListener('click', function(e) {
        if (e.target === expenseModal) {
            closeModal();
        }
    });
    
    // Details modal event listeners
    const detailsModal = document.getElementById('details-modal');
    const closeDetailsBtn = document.getElementById('close-details-modal');
    
    closeDetailsBtn.addEventListener('click', closeDetailsModal);
    detailsModal.addEventListener('click', function(e) {
        if (e.target === detailsModal) {
            closeDetailsModal();
        }
    });
    
    // File input display
    const fileInput = document.getElementById('imagem');
    const fileDisplay = document.querySelector('.file-input-display span');
    const fileDisplayContainer = document.querySelector('.file-input-display');
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            fileDisplay.textContent = e.target.files[0].name;
            fileDisplayContainer.classList.add('file-selected');
        } else {
            fileDisplay.textContent = 'Clique para selecionar uma imagem';
            fileDisplayContainer.classList.remove('file-selected');
        }
    });
}

// Capitalize first letter of each word
function capitalizeWords(str) {
    if (!str) return str;
    return str.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
}

// Open modal
function openModal() {
    expenseModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Auto-fill user field with current user or default
    const userInput = document.getElementById('usuario_criacao');
    if (window.currentUser && window.currentUser.name) {
        userInput.value = capitalizeWords(window.currentUser.name);
    } else {
        // Fallback to saved user name or default user
        const savedUser = localStorage.getItem('tms_usuario');
        userInput.value = capitalizeWords(savedUser || 'Usuário Padrão');
    }
}

// Close modal
function closeModal() {
    expenseModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    expenseForm.reset();
    
    // No special form sections to reset since installment fields were removed
    
    // Reset file input display
    document.querySelector('.file-input-display span').textContent = 'Clique para selecionar uma imagem';
    document.querySelector('.file-input-display').classList.remove('file-selected');
}

// Handle payment method change (simplified - no installments)
function handlePaymentMethodChange(e) {
    // No special handling needed since we removed installment fields
    // This function can remain for future extensibility
}

// Format currency input with Brazilian formatting
function formatCurrencyInput(input) {
    let value = input.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value === '') {
        input.value = '';
        return;
    }
    
    // Convert to cents (divide by 100 for decimal places)
    value = parseInt(value);
    
    // Format as currency with Brazilian formatting
    const formatted = (value / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    input.value = formatted;
}

// Get numeric value from formatted currency input
function getNumericValue(formattedValue) {
    if (!formattedValue) return 0;
    
    // Remove formatting and convert to float
    const cleanValue = formattedValue
        .replace(/\./g, '') // Remove thousand separators
        .replace(',', '.'); // Replace comma with dot for decimal
    
    return parseFloat(cleanValue) || 0;
}

// Format currency for display (from numeric value)
function formatCurrencyDisplay(value) {
    if (!value && value !== 0) return '0,00';
    
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Mark expense as paid
async function markAsPaid(expenseId) {
    try {
        showLoading(true);
        
        const { error } = await supabase
            .from('despesas')
            .update({ 
                status: 'pago',
                data_pagamento: new Date().toISOString()
            })
            .eq('id', expenseId);
        
        if (error) {
            throw error;
        }
        
        showNotification('Despesa marcada como paga!', 'success');
        await loadExpenses();
        updateSummary();
        
    } catch (error) {
        console.error('Error marking as paid:', error);
        showNotification('Erro ao marcar despesa como paga', 'error');
    } finally {
        showLoading(false);
    }
}

// Show expense details modal
async function showExpenseDetails(expenseId) {
    try {
        showLoading(true);
        
        // Get expense details and related installments
        const { data: expense, error: expenseError } = await supabase
            .from('despesas')
            .select('*')
            .eq('id', expenseId)
            .single();
            
        if (expenseError) {
            throw expenseError;
        }
        
        // Get all related installments (if this is part of a parcelated expense)
        let relatedExpenses = [expense];
        if (expense.despesa_pai_id || expense.total_parcelas > 1) {
            const parentId = expense.despesa_pai_id || expense.id;
            const { data: allInstallments, error: installmentsError } = await supabase
                .from('despesas')
                .select('*')
                .or(`id.eq.${parentId},despesa_pai_id.eq.${parentId}`)
                .order('parcela_atual');
                
            if (!installmentsError) {
                relatedExpenses = allInstallments;
            }
        }
        
        openDetailsModal(expense, relatedExpenses);
        
    } catch (error) {
        console.error('Error loading expense details:', error);
        showNotification('Erro ao carregar detalhes da despesa', 'error');
    } finally {
        showLoading(false);
    }
}

// Open details modal
function openDetailsModal(expense, relatedExpenses) {
    const detailsModal = document.getElementById('details-modal');
    const detailsContent = document.getElementById('details-content');
    
    const currentDate = new Date();
    const totalPaid = relatedExpenses.filter(e => e.status === 'pago').length;
    const totalPending = relatedExpenses.filter(e => e.status === 'pendente').length;
    
    detailsContent.innerHTML = `
        <div class="expense-overview">
            <div class="overview-header">
                <h4 class="overview-title">${expense.item}</h4>
                <span class="overview-status status-${expense.status}">${expense.status}</span>
            </div>
            <div class="overview-grid">
                <div class="overview-item">
                    <span class="overview-label">Usuário</span>
                    <span class="overview-value">${capitalizeWords(expense.usuario_criacao) || 'Não informado'}</span>
                </div>
                <div class="overview-item">
                    <span class="overview-label">Data de Vencimento</span>
                    <span class="overview-value">${formatDate(expense.data_vencimento)}</span>
                </div>
                <div class="overview-item">
                    <span class="overview-label">Forma de Pagamento</span>
                    <span class="overview-value">${expense.forma_pagamento}</span>
                </div>
                <div class="overview-item">
                    <span class="overview-label">Valor da Parcela</span>
                    <span class="overview-value">R$ ${formatCurrencyDisplay(expense.valor)}</span>
                </div>
                <div class="overview-item">
                    <span class="overview-label">Total de Parcelas</span>
                    <span class="overview-value">${expense.total_parcelas}x</span>
                </div>
                <div class="overview-item">
                    <span class="overview-label">Valor Total</span>
                    <span class="overview-value">R$ ${formatCurrencyDisplay(expense.valor_total || expense.valor)}</span>
                </div>
                <div class="overview-item">
                    <span class="overview-label">Parcelas Pagas</span>
                    <span class="overview-value">${totalPaid}/${expense.total_parcelas}</span>
                </div>
                <div class="overview-item">
                    <span class="overview-label">Parcelas Pendentes</span>
                    <span class="overview-value">${totalPending}</span>
                </div>
            </div>
        </div>
        
        ${expense.total_parcelas > 1 ? `
            <div class="installments-section">
                <h5 class="section-title">
                    <i class="fas fa-calendar-alt"></i>
                    Cronograma de Parcelas
                </h5>
                <div class="installments-timeline">
                    ${relatedExpenses.map(installment => {
                        const dueDate = new Date(installment.data_vencimento);
                        const isOverdue = installment.status === 'pendente' && dueDate < currentDate;
                        const isCurrent = installment.status === 'pendente' && !isOverdue;
                        
                        return `
                            <div class="installment-card ${installment.status === 'pago' ? 'paid' : isOverdue ? 'overdue' : isCurrent ? 'current' : ''}">
                                <div class="installment-header">
                                    <span class="installment-number">Parcela ${installment.parcela_atual}/${installment.total_parcelas}</span>
                                    <span class="installment-status status-${installment.status}">${installment.status}</span>
                                </div>
                                
                                ${installment.status === 'pendente' ? `
                                    <button class="installment-pay-btn" onclick="markAsPaid('${installment.id}')">
                                        <i class="fas fa-check"></i> Marcar como Pago
                                    </button>
                                ` : ''}
                                
                                <div class="installment-info">
                                    <div class="overview-item">
                                        <span class="overview-label">Valor</span>
                                        <span class="overview-value">R$ ${formatCurrencyDisplay(installment.valor)}</span>
                                    </div>
                                    <div class="overview-item">
                                        <span class="overview-label">Vencimento</span>
                                        <span class="overview-value">${formatDate(installment.data_vencimento)}</span>
                                    </div>
                                    ${installment.data_pagamento ? `
                                        <div class="overview-item">
                                            <span class="overview-label">Data do Pagamento</span>
                                            <span class="overview-value">${formatDate(installment.data_pagamento.split('T')[0])}</span>
                                        </div>
                                    ` : ''}
                                    ${isOverdue ? `
                                        <div class="overview-item">
                                            <span class="overview-label" style="color: #dc3545;">Status</span>
                                            <span class="overview-value" style="color: #dc3545;">Vencida</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}
        
        ${expense.imagem_url ? `
            <div class="installments-section">
                <h5 class="section-title">
                    <i class="fas fa-image"></i>
                    Comprovante da Despesa
                </h5>
                <div class="receipt-preview">
                    <div class="receipt-container">
                        <img src="${expense.imagem_url}" alt="Comprovante - ${expense.item}" 
                             style="max-width: 100%; height: auto; border-radius: 8px; border: 2px solid #e1e8ed; box-shadow: 0 4px 8px rgba(0,0,0,0.1); cursor: pointer;"
                             onclick="window.open('${expense.imagem_url}', '_blank')">
                        <p style="margin-top: 0.5rem; color: #6c757d; font-size: 0.9rem;">
                            <i class="fas fa-external-link-alt"></i> Clique na imagem para visualizar em tamanho completo
                        </p>
                    </div>
                </div>
            </div>
        ` : ''}
    `;
    
    detailsModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close details modal
function closeDetailsModal() {
    const detailsModal = document.getElementById('details-modal');
    detailsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        // Get form data
        const formData = new FormData(expenseForm);
        
        // Validate required image field
        const imageFile = formData.get('imagem');
        if (!imageFile || imageFile.size === 0) {
            showNotification('Por favor, selecione uma imagem do comprovante', 'error');
            showLoading(false);
            return;
        }
        
        // Get user name from form or use current user
        let userName = formData.get('usuario_criacao');
        if (!userName && window.currentUser && window.currentUser.name) {
            userName = window.currentUser.name;
        } else if (!userName) {
            userName = localStorage.getItem('tms_usuario') || 'Usuário Padrão';
        }
        
        // Ensure name is properly capitalized
        userName = capitalizeWords(userName);

        const expenseData = {
            usuario_criacao: userName,
            item: formData.get('item'),
            valor: getNumericValue(formData.get('valor')),
            forma_pagamento: formData.get('forma_pagamento'),
            data_vencimento: formData.get('data_vencimento'),
            category_id: formData.get('category_id') || null,
            parcela_atual: 1, 
            total_parcelas: 1, // Always set to 1 since we're not creating installments anymore
            valor_total: getNumericValue(formData.get('valor')), // Use the same value for total
            status: 'pendente',
            imagem_url: null
        };
        
        // Handle image upload (now required)
        const imageUrl = await uploadImage(imageFile);
        expenseData.imagem_url = imageUrl;
        
        // Save to database
        const { data, error } = await supabase
            .from('despesas')
            .insert([expenseData])
            .select();
        
        if (error) {
            throw error;
        }
        
        // Save user name for future use (properly capitalized)
        localStorage.setItem('tms_usuario', userName);
        
        showNotification('Despesa adicionada com sucesso!', 'success');
        closeModal();
        await loadExpenses();
        updateSummary();
        
    } catch (error) {
        console.error('Error saving expense:', error);
        showNotification('Erro ao salvar despesa: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Upload image to Supabase Storage
async function uploadImage(file) {
    try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('receipts')
            .upload(fileName, file);
        
        if (error) {
            throw error;
        }
        
        // Get public URL
        const { data: publicData } = supabase.storage
            .from('receipts')
            .getPublicUrl(fileName);
        
        return publicData.publicUrl;
        
    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Erro ao fazer upload da imagem');
    }
}

// Load expenses from database
async function loadExpenses() {
    try {
        const { data, error } = await supabase
            .from('despesas')
            .select(`
                *,
                categories (
                    id,
                    name
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            if (error.code === '42P01') {
                // Table doesn't exist - show setup message
                showSetupMessage();
                return;
            }
            throw error;
        }
        
        expenses = data || [];
        renderExpenses();
        
    } catch (error) {
        console.error('Error loading expenses:', error);
        if (error.code === '42P01') {
            showSetupMessage();
        } else {
            showNotification('Erro ao carregar despesas: ' + error.message, 'error');
        }
    }
}

// Show setup message when table doesn't exist
function showSetupMessage() {
    const tableContainer = document.querySelector('.table-container');
    tableContainer.innerHTML = `
        <div class="setup-message">
            <div class="setup-icon">
                <i class="fas fa-database"></i>
            </div>
            <h3>Configuração necessária</h3>
            <p>Para usar o TMS Dashboard, você precisa criar a tabela de despesas no seu banco Supabase.</p>
            <div class="setup-instructions">
                <h4>Passos para configurar:</h4>
                <ol>
                    <li>Acesse o <a href="https://supabase.com/dashboard/projects" target="_blank">painel do Supabase</a></li>
                    <li>Vá para o seu projeto → SQL Editor</li>
                    <li>Execute o seguinte SQL:</li>
                </ol>
                <div class="sql-code">
                    <code>
-- Create the table
CREATE TABLE public.despesas (
    id BIGSERIAL PRIMARY KEY,
    item TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    forma_pagamento TEXT NOT NULL,
    parcela_atual INTEGER,
    total_parcelas INTEGER,
    valor_total NUMERIC,
    imagem_url TEXT,
    data_vencimento DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow all operations" ON public.despesas
FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.despesas TO anon;
GRANT ALL ON public.despesas TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.despesas_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.despesas_id_seq TO authenticated;
                    </code>
                </div>
                <button id="reload-btn" class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh"></i> Recarregar após configuração
                </button>
            </div>
        </div>
    `;
}

// Render expenses in table
function renderExpenses() {
    const filteredExpenses = filterExpensesByMonth(expenses);
    
    if (filteredExpenses.length === 0) {
        expensesTable.style.display = 'none';
        noExpenses.style.display = 'block';
        return;
    }
    
    expensesTable.style.display = 'table';
    noExpenses.style.display = 'none';
    
    expensesTbody.innerHTML = filteredExpenses.map(expense => `
        <tr class="expense-row ${expense.status === 'pago' ? 'expense-paid' : ''}" data-expense-id="${expense.id}">
            <td>${expense.item}</td>
            <td><span class="category-badge">${getCategoryName(expense.category_id)}</span></td>
            <td>R$ ${formatCurrencyDisplay(expense.valor)}</td>
            <td><span class="payment-badge ${getPaymentClass(expense.forma_pagamento)}">${expense.forma_pagamento}</span></td>
            <td>${formatInstallments(expense.parcela_atual, expense.total_parcelas)}</td>
            <td>${formatDate(expense.data_vencimento)}</td>
            <td>${expense.imagem_url ? `<a href="${expense.imagem_url}" target="_blank" class="receipt-link">Ver Comprovante</a>` : '-'}</td>
            <td>
                <div class="expense-actions">
                    ${expense.status === 'pendente' ? 
                        `<button class="btn-action btn-pay" onclick="markAsPaid('${expense.id}')">
                            <i class="fas fa-check"></i> Pagar
                         </button>` : 
                        `<span class="status-paid">
                            <i class="fas fa-check-circle"></i> Pago
                         </span>`
                    }
                    <button class="btn-action btn-details" onclick="showExpenseDetails('${expense.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Filter expenses by selected month
function filterExpensesByMonth(expenses) {
    if (!currentFilter) {
        return expenses;
    }
    
    return expenses.filter(expense => {
        const expenseMonth = new Date(expense.data_vencimento).getMonth() + 1;
        return expenseMonth.toString().padStart(2, '0') === currentFilter;
    });
}

// Handle month filter change
function handleMonthFilter(e) {
    currentFilter = e.target.value;
    renderExpenses();
    updateSummary();
}

// Update summary cards
function updateSummary() {
    const filteredExpenses = filterExpensesByMonth(expenses);
    
    // Calculate totals
    const monthlyTotalValue = filteredExpenses.reduce((sum, expense) => sum + expense.valor, 0);
    const totalExpensesCount = filteredExpenses.length;
    
    // Update DOM
    monthlyTotal.textContent = `R$ ${formatCurrencyDisplay(monthlyTotalValue)}`;
    totalExpenses.textContent = totalExpensesCount;
}

// Utility functions
function getPaymentClass(paymentMethod) {
    const classMap = {
        'PIX': 'payment-pix',
        'Cartão de Crédito': 'payment-cartao',
        'Boleto à Vista': 'payment-boleto-vista',
        'Boleto a Prazo': 'payment-boleto-prazo'
    };
    return classMap[paymentMethod] || '';
}

function formatInstallments(current, total) {
    if (!current || !total) {
        return '-';
    }
    return `${current}/${total}`;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Show/hide loading overlay
function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = getNotificationIcon(type);
    notification.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    const container = document.getElementById('notification-container');
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Error handling for Supabase connection
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (event.reason?.message?.includes('supabase')) {
        showNotification('Erro de conexão com o banco de dados. Verifique suas configurações.', 'error');
    }
});

// Check Supabase connection on load
async function checkSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('despesas')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            throw error;
        }
        
        console.log('Supabase connection successful');
        
    } catch (error) {
        console.error('Supabase connection failed:', error);
        showNotification('Falha na conexão com o banco de dados. Verifique suas configurações do Supabase.', 'error');
    }
}

// Initialize connection check
checkSupabaseConnection();
