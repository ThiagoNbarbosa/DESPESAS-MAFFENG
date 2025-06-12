// Demo categorization system for expense tracking
let expenses = [];
let categories = [];

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

// Initialize the demo application
document.addEventListener('DOMContentLoaded', function() {
    initializeDemo();
    setupEventListeners();
});

// Initialize demo with sample data
function initializeDemo() {
    loadCategories();
    loadDemoExpenses();
    renderExpenses();
    updateSummary();
}

// Load predefined categories
function loadCategories() {
    categories = [
        { id: 1, name: 'Alimentação', description: 'Gastos com comida e bebidas' },
        { id: 2, name: 'Transporte', description: 'Combustível, transporte público, Uber' },
        { id: 3, name: 'Moradia', description: 'Aluguel, condomínio, IPTU' },
        { id: 4, name: 'Saúde', description: 'Consultas, medicamentos, plano de saúde' },
        { id: 5, name: 'Educação', description: 'Cursos, livros, materiais' },
        { id: 6, name: 'Lazer', description: 'Cinema, restaurantes, viagens' },
        { id: 7, name: 'Roupas', description: 'Vestuário e acessórios' },
        { id: 8, name: 'Tecnologia', description: 'Eletrônicos, softwares, internet' },
        { id: 9, name: 'Casa', description: 'Móveis, decoração, utensílios' },
        { id: 10, name: 'Outros', description: 'Gastos diversos' }
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
}

// Load demo expenses with categories
function loadDemoExpenses() {
    expenses = [
        {
            id: 1,
            item: 'Supermercado Pão de Açúcar',
            category_id: 1,
            valor: 250.75,
            forma_pagamento: 'cartao_credito',
            data_vencimento: '2025-06-15',
            status: 'pendente',
            imagem_url: '#',
            created_at: '2025-06-01T10:00:00'
        },
        {
            id: 2,
            item: 'Uber para trabalho',
            category_id: 2,
            valor: 35.50,
            forma_pagamento: 'pix',
            data_vencimento: '2025-06-12',
            status: 'pago',
            imagem_url: '#',
            created_at: '2025-06-02T08:30:00'
        },
        {
            id: 3,
            item: 'Consulta médica',
            category_id: 4,
            valor: 180.00,
            forma_pagamento: 'dinheiro',
            data_vencimento: '2025-06-20',
            status: 'pendente',
            imagem_url: '#',
            created_at: '2025-06-03T14:15:00'
        },
        {
            id: 4,
            item: 'Netflix mensalidade',
            category_id: 6,
            valor: 39.90,
            forma_pagamento: 'cartao_debito',
            data_vencimento: '2025-06-25',
            status: 'pago',
            imagem_url: '#',
            created_at: '2025-06-04T16:45:00'
        },
        {
            id: 5,
            item: 'Curso online JavaScript',
            category_id: 5,
            valor: 199.99,
            forma_pagamento: 'cartao_credito',
            data_vencimento: '2025-06-30',
            status: 'pendente',
            imagem_url: '#',
            created_at: '2025-06-05T11:20:00'
        }
    ];
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
    
    // Currency input formatting
    const valorInput = document.getElementById('valor');
    valorInput.addEventListener('input', function(e) {
        formatCurrencyInput(e.target);
    });
    
    // File input handling
    const fileInput = document.getElementById('imagem');
    const fileDisplay = document.querySelector('.file-input-display');
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            fileDisplay.classList.add('file-selected');
            fileDisplay.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <p>Arquivo selecionado: ${e.target.files[0].name}</p>
                <small>Clique para alterar</small>
            `;
        } else {
            fileDisplay.classList.remove('file-selected');
            fileDisplay.innerHTML = `
                <i class="fas fa-upload"></i>
                <p>Clique aqui para selecionar uma imagem</p>
                <small>Formatos aceitos: JPG, PNG, GIF</small>
            `;
        }
    });
    
    // Close modal when clicking outside
    expenseModal.addEventListener('click', function(e) {
        if (e.target === expenseModal) {
            closeModal();
        }
    });
}

// Modal functions
function openModal() {
    expenseModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    expenseModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    expenseForm.reset();
    
    // Reset file input display
    const fileDisplay = document.querySelector('.file-input-display');
    fileDisplay.classList.remove('file-selected');
    fileDisplay.innerHTML = `
        <i class="fas fa-upload"></i>
        <p>Clique aqui para selecionar uma imagem</p>
        <small>Formatos aceitos: JPG, PNG, GIF</small>
    `;
}

// Form submission handler
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(expenseForm);
    const imageFile = document.getElementById('imagem').files[0];
    
    if (!imageFile) {
        showNotification('Por favor, selecione uma imagem de comprovante', 'error');
        return;
    }
    
    // Create new expense
    const newExpense = {
        id: expenses.length + 1,
        item: formData.get('item'),
        category_id: parseInt(formData.get('category_id')),
        valor: getNumericValue(formData.get('valor')),
        forma_pagamento: formData.get('forma_pagamento'),
        data_vencimento: formData.get('data_vencimento'),
        status: 'pendente',
        imagem_url: '#',
        created_at: new Date().toISOString()
    };
    
    // Add to expenses array
    expenses.push(newExpense);
    
    // Re-render and update
    renderExpenses();
    updateSummary();
    closeModal();
    
    showNotification('Despesa adicionada com sucesso!', 'success');
}

// Render expenses table
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
            <td><span class="payment-badge ${getPaymentClass(expense.forma_pagamento)}">${formatPaymentMethod(expense.forma_pagamento)}</span></td>
            <td>${formatDate(expense.data_vencimento)}</td>
            <td><a href="${expense.imagem_url}" target="_blank" class="receipt-link">Ver Comprovante</a></td>
            <td>
                <div class="expense-actions">
                    ${expense.status === 'pendente' ? 
                        `<button class="btn-action btn-pay" onclick="markAsPaid(${expense.id})">
                            <i class="fas fa-check"></i> Pagar
                         </button>` : 
                        `<span class="status-paid">
                            <i class="fas fa-check-circle"></i> Pago
                         </span>`
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

// Helper functions
function getCategoryName(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Sem categoria';
}

function getPaymentClass(paymentMethod) {
    return `payment-${paymentMethod}`;
}

function formatPaymentMethod(method) {
    const methods = {
        'dinheiro': 'Dinheiro',
        'pix': 'PIX',
        'cartao_debito': 'C. Débito',
        'cartao_credito': 'C. Crédito',
        'boleto_vista': 'Boleto Vista',
        'boleto_prazo': 'Boleto Prazo',
        'transferencia': 'Transferência'
    };
    return methods[method] || method;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatCurrencyDisplay(value) {
    return parseFloat(value).toFixed(2).replace('.', ',');
}

function formatCurrencyInput(input) {
    let value = input.value.replace(/\D/g, '');
    value = (value / 100).toFixed(2);
    value = value.replace('.', ',');
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    input.value = value;
}

function getNumericValue(formattedValue) {
    return parseFloat(formattedValue.replace(/\./g, '').replace(',', '.')) || 0;
}

function filterExpensesByMonth(expenses) {
    const selectedMonth = monthFilter.value;
    if (!selectedMonth) return expenses;
    
    return expenses.filter(expense => {
        const expenseMonth = expense.data_vencimento.substring(0, 7);
        return expenseMonth === selectedMonth;
    });
}

function handleMonthFilter() {
    renderExpenses();
    updateSummary();
}

function updateSummary() {
    const filteredExpenses = filterExpensesByMonth(expenses);
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.valor, 0);
    
    monthlyTotal.textContent = `R$ ${formatCurrencyDisplay(total)}`;
    totalExpenses.textContent = filteredExpenses.length;
}

function markAsPaid(expenseId) {
    const expense = expenses.find(exp => exp.id === expenseId);
    if (expense) {
        expense.status = 'pago';
        renderExpenses();
        showNotification('Despesa marcada como paga!', 'success');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    const container = document.getElementById('notification-container');
    container.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-triangle',
        'warning': 'fa-exclamation-circle',
        'info': 'fa-info-circle'
    };
    return icons[type] || icons.info;
}