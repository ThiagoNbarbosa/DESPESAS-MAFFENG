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
    initializeApp();
    setupEventListeners();
});

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
            item: formData.get('item'),
            valor: getNumericValue(formData.get('valor')),
            forma_pagamento: formData.get('forma_pagamento'),
            data_vencimento: formData.get('data_vencimento'),
            parcela_atual: 1, // Always start with first installment for new expenses
            total_parcelas: formData.get('total_parcelas') ? parseInt(formData.get('total_parcelas')) : 1,
            valor_total: formData.get('valor_total') ? getNumericValue(formData.get('valor_total')) : getNumericValue(formData.get('valor')),
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
        <tr>
            <td>${expense.item}</td>
            <td>R$ ${formatCurrencyDisplay(expense.valor)}</td>
            <td><span class="payment-badge ${getPaymentClass(expense.forma_pagamento)}">${expense.forma_pagamento}</span></td>
            <td>${formatInstallments(expense.parcela_atual, expense.total_parcelas)}</td>
            <td>${formatDate(expense.data_vencimento)}</td>
            <td>${expense.imagem_url ? `<a href="${expense.imagem_url}" target="_blank" class="receipt-link">Ver Comprovante</a>` : '-'}</td>
            <td>${formatDateTime(expense.created_at)}</td>
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
