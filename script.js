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
const parcelasSection = document.querySelector('.parcelas-section');
const valorTotalSection = document.querySelector('.valor-total-section');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
});

// Check authentication before initializing app
async function checkAuthentication() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!user || error) {
            // No authenticated user, redirect to login
            window.location.href = '/login.html';
            return;
        }
        
        // User is authenticated, get profile and initialize app
        const userProfile = await getUserProfile(user.id);
        
        if (!userProfile) {
            showNotification('Perfil de usuário não encontrado', 'error');
            await supabase.auth.signOut();
            window.location.href = '/login.html';
            return;
        }
        
        // Store user info and initialize
        window.currentUser = {
            id: user.id,
            email: user.email,
            name: userProfile.name,
            role: userProfile.role
        };
        
        // Update UI with user info
        updateUserInterface();
        
        // Initialize the application
        await initializeApp();
        setupEventListeners();
        
    } catch (error) {
        console.error('Authentication check failed:', error);
        showNotification('Erro de autenticação', 'error');
        window.location.href = '/login.html';
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

// Update UI with user information
function updateUserInterface() {
    // Add user info to header
    const header = document.querySelector('.header');
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.innerHTML = `
        <div class="user-details">
            <span class="user-name">${window.currentUser.name}</span>
            <span class="user-role">${window.currentUser.role}</span>
        </div>
        <button onclick="handleLogout()" class="logout-btn">
            <i class="fas fa-sign-out-alt"></i>
        </button>
    `;
    
    header.appendChild(userInfo);
    
    // Auto-fill user name in expense form
    const userNameInput = document.getElementById('usuario_criacao');
    if (userNameInput && window.currentUser.name) {
        userNameInput.value = window.currentUser.name;
        userNameInput.readOnly = true; // Prevent editing
    }
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

// Initialize the application
async function initializeApp() {
    try {
        showLoading(true);
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
    
    // Auto-calculate total value and currency formatting
    document.getElementById('valor').addEventListener('input', function(e) {
        formatCurrencyInput(e.target);
        calculateTotalValue();
    });
    document.getElementById('total_parcelas').addEventListener('input', calculateTotalValue);
    
    // Format currency on valor_total when it changes
    document.getElementById('valor_total').addEventListener('input', function(e) {
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
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            fileDisplay.textContent = e.target.files[0].name;
        } else {
            fileDisplay.textContent = 'Clique para selecionar uma imagem';
        }
    });
}

// Open modal
function openModal() {
    expenseModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Load saved user name
    const savedUser = localStorage.getItem('tms_usuario');
    if (savedUser) {
        document.getElementById('usuario_criacao').value = savedUser;
    }
}

// Close modal
function closeModal() {
    expenseModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    expenseForm.reset();
    
    // Reset form sections
    parcelasSection.style.display = 'none';
    valorTotalSection.style.display = 'none';
    parcelasSection.classList.remove('show');
    valorTotalSection.classList.remove('show');
    
    // Reset labels
    document.querySelector('.label-parcela').style.display = 'none';
    document.querySelector('.label-valor').style.display = 'inline';
    
    // Reset file input display
    document.querySelector('.file-input-display span').textContent = 'Clique para selecionar uma imagem';
}

// Handle payment method change
function handlePaymentMethodChange(e) {
    const paymentMethod = e.target.value;
    const showInstallments = paymentMethod === 'cartao_credito' || paymentMethod === 'boleto_prazo';
    
    const labelParcela = document.querySelector('.label-parcela');
    const labelValor = document.querySelector('.label-valor');
    
    if (showInstallments) {
        // Show installment sections with animation
        parcelasSection.style.display = 'block';
        valorTotalSection.style.display = 'block';
        parcelasSection.classList.add('show');
        valorTotalSection.classList.add('show');
        
        // Change label to "Valor da Parcela"
        labelParcela.style.display = 'inline';
        labelValor.style.display = 'none';
    } else {
        // Hide installment sections
        parcelasSection.style.display = 'none';
        valorTotalSection.style.display = 'none';
        parcelasSection.classList.remove('show');
        valorTotalSection.classList.remove('show');
        
        // Change label back to "Valor"
        labelParcela.style.display = 'none';
        labelValor.style.display = 'inline';
        
        // Clear installment fields
        document.getElementById('total_parcelas').value = '';
        document.getElementById('valor_total').value = '';
    }
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
                    <span class="overview-value">${expense.usuario_criacao || 'Não informado'}</span>
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

// Calculate total value automatically
function calculateTotalValue() {
    const valorParcelaFormatted = document.getElementById('valor').value;
    const valorParcela = getNumericValue(valorParcelaFormatted);
    const totalParcelas = parseInt(document.getElementById('total_parcelas').value) || 1;
    const valorTotal = valorParcela * totalParcelas;
    
    if (valorParcela > 0 && totalParcelas > 0) {
        const valorTotalInput = document.getElementById('valor_total');
        const formatted = valorTotal.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        valorTotalInput.value = formatted;
    } else {
        document.getElementById('valor_total').value = '';
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        // Get form data
        const formData = new FormData(expenseForm);
        const expenseData = {
            usuario_criacao: formData.get('usuario_criacao'),
            item: formData.get('item'),
            valor: getNumericValue(formData.get('valor')),
            forma_pagamento: formData.get('forma_pagamento'),
            data_vencimento: formData.get('data_vencimento'),
            parcela_atual: 1, // Always start with first installment for new expenses
            total_parcelas: formData.get('total_parcelas') ? parseInt(formData.get('total_parcelas')) : 1,
            valor_total: formData.get('valor_total') ? getNumericValue(formData.get('valor_total')) : getNumericValue(formData.get('valor')),
            status: 'pendente', // Default status for new expenses
            imagem_url: null
        };
        
        // Handle image upload
        const imageFile = formData.get('imagem');
        if (imageFile && imageFile.size > 0) {
            const imageUrl = await uploadImage(imageFile);
            expenseData.imagem_url = imageUrl;
        }
        
        // Save to database
        const { data, error } = await supabase
            .from('despesas')
            .insert([expenseData])
            .select();
        
        if (error) {
            throw error;
        }
        
        // Create future installments if this is a parcelated expense
        if (expenseData.total_parcelas > 1) {
            await createFutureInstallments(data[0], expenseData);
        }
        
        // Save user name for future use
        localStorage.setItem('tms_usuario', expenseData.usuario_criacao);
        
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

// Create future installments for parcelated expenses
async function createFutureInstallments(firstInstallment, originalData) {
    try {
        const futureInstallments = [];
        const baseDate = new Date(originalData.data_vencimento);
        
        for (let i = 2; i <= originalData.total_parcelas; i++) {
            const nextDate = new Date(baseDate);
            nextDate.setMonth(nextDate.getMonth() + (i - 1));
            
            const futureInstallment = {
                usuario_criacao: originalData.usuario_criacao,
                item: originalData.item,
                valor: originalData.valor,
                forma_pagamento: originalData.forma_pagamento,
                data_vencimento: nextDate.toISOString().split('T')[0],
                parcela_atual: i,
                total_parcelas: originalData.total_parcelas,
                valor_total: originalData.valor_total,
                imagem_url: originalData.imagem_url,
                status: 'pendente',
                despesa_pai_id: firstInstallment.id
            };
            
            futureInstallments.push(futureInstallment);
        }
        
        const { error } = await supabase
            .from('despesas')
            .insert(futureInstallments);
            
        if (error) {
            console.error('Error creating future installments:', error);
        }
        
    } catch (error) {
        console.error('Error in createFutureInstallments:', error);
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
            .select('*')
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
