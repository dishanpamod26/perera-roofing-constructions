// ==========================================
// STATE MANAGEMENT & LOCAL STORAGE
// ==========================================

// Default roofing sheets database is now completely empty by default
const DEFAULT_PRODUCTS = [];

// Initialize State
let products = JSON.parse(localStorage.getItem('pr_products')) || [];
let salesLogs = JSON.parse(localStorage.getItem('pr_sales_logs')) || [];
let brands = JSON.parse(localStorage.getItem('pr_brands')) || ['Sigiri', 'Rhino'];
let cart = []; // In-memory active quotation cart
let activeChart = null; // ChartJS instance reference

// Save products database helper
function saveProducts() {
    localStorage.setItem('pr_products', JSON.stringify(products));
}

// Save sales logs database helper
function saveSales() {
    localStorage.setItem('pr_sales_logs', JSON.stringify(salesLogs));
}

// Save brands helper
function saveBrands() {
    localStorage.setItem('pr_brands', JSON.stringify(brands));
}

// ==========================================
// TOAST NOTIFICATIONS HELPER
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'check-circle-2';
    if (type === 'danger') iconName = 'alert-octagon';
    if (type === 'warning') iconName = 'alert-triangle';
    if (type === 'info') iconName = 'info';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    // Slide out after 3 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// ==========================================
// DYNAMIC BRANDS RENDERING CONTROLLER
// ==========================================
function renderBrandControls() {
    // 1. Calculator catalog brand tabs
    const catalogTabs = document.getElementById('catalog-brand-tabs');
    if (catalogTabs) {
        let catalogActiveBrand = 'all';
        const prevActive = catalogTabs.querySelector('.brand-tab.active');
        if (prevActive) {
            catalogActiveBrand = prevActive.getAttribute('data-brand');
        }
        
        let tabsHTML = `<button class="brand-tab ${catalogActiveBrand === 'all' ? 'active' : ''}" data-brand="all">All Brands</button>`;
        brands.forEach(b => {
            tabsHTML += `<button class="brand-tab ${catalogActiveBrand.toLowerCase() === b.toLowerCase() ? 'active' : ''}" data-brand="${b}">${b}</button>`;
        });
        tabsHTML += `<button class="brand-tab ${catalogActiveBrand === 'other' ? 'active' : ''}" data-brand="other">Other</button>`;
        
        catalogTabs.innerHTML = tabsHTML;
        
        // Re-bind click listeners
        catalogTabs.querySelectorAll('.brand-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                catalogTabs.querySelectorAll('.brand-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                renderCatalog();
            });
        });
    }
    
    // 2. Inventory brand filter select
    const invFilterSelect = document.getElementById('inventory-filter-brand');
    if (invFilterSelect) {
        const prevVal = invFilterSelect.value || 'all';
        let optionsHTML = `<option value="all">All Brands</option>`;
        brands.forEach(b => {
            optionsHTML += `<option value="${b}">${b}</option>`;
        });
        optionsHTML += `<option value="Other">Other</option>`;
        invFilterSelect.innerHTML = optionsHTML;
        invFilterSelect.value = prevVal;
    }
    
    // 3. Product add/edit modal brand select
    const prodModalSelect = document.getElementById('product-brand-val');
    if (prodModalSelect) {
        let modalOptions = '';
        brands.forEach(b => {
            modalOptions += `<option value="${b}">${b}</option>`;
        });
        modalOptions += `<option value="Other">Other</option>`;
        prodModalSelect.innerHTML = modalOptions;
    }
    
    // 4. Lot Modal brand select
    const lotModalSelect = document.getElementById('lot-brand-val');
    if (lotModalSelect) {
        const prevVal = lotModalSelect.value;
        let lotOptions = '';
        brands.forEach(b => {
            lotOptions += `<option value="${b}">${b}</option>`;
        });
        lotOptions += `<option value="Other">Other</option>`;
        lotModalSelect.innerHTML = lotOptions;
        if (prevVal && lotModalSelect.querySelector(`option[value="${prevVal}"]`)) {
            lotModalSelect.value = prevVal;
        }
    }
}

// ==========================================
// APP INITIALIZATION & NAVIGATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Setup live date
    updateLiveDate();
    setInterval(updateLiveDate, 60000); // Update every minute
    
    // Render dynamic brand selections
    renderBrandControls();
    
    // Tab switching routing
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
    
    // Initial UI render
    switchTab('dashboard');
    lucide.createIcons();
    
    // Event listeners
    setupEventListeners();
});

function updateLiveDate() {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-US', options);
    document.getElementById('live-date').textContent = dateStr;
}

function switchTab(tabId) {
    // Update active nav buttons styling
    const navButtons = document.querySelectorAll('.nav-item');
    navButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Toggle tab panes visibility
    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
    
    // Update top header text based on active tab
    const title = document.getElementById('current-tab-title');
    const subtitle = document.getElementById('current-tab-subtitle');
    
    if (tabId === 'dashboard') {
        title.textContent = 'Dashboard Overview';
        subtitle.textContent = 'Real-time sales statistics and stock statuses';
        renderDashboard();
    } else if (tabId === 'calculator') {
        title.textContent = 'Quotation Calculator';
        subtitle.textContent = 'Select roofing sheets, add quantity/discounts, and make sales';
        renderCatalog();
        renderCart();
    } else if (tabId === 'inventory') {
        title.textContent = 'Inventory Management';
        subtitle.textContent = 'Add products, update buying/selling prices, and adjust stock counts';
        renderInventory();
    } else if (tabId === 'sales') {
        title.textContent = 'Sales Transaction Logs';
        subtitle.textContent = 'Full history of completed customer purchases, costs, and profits';
        renderSalesLogs();
    }
    
    lucide.createIcons();
}

// ==========================================
// SYSTEM EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    // 1. Calculator search
    const searchInput = document.getElementById('catalog-search');
    searchInput.addEventListener('input', () => {
        renderCatalog();
    });
    
    // 2. Extra discount handlers in cart
    const extraDiscVal = document.getElementById('extra-discount-val');
    const extraDiscType = document.getElementById('extra-discount-type');
    
    extraDiscVal.addEventListener('input', () => {
        if (extraDiscVal.value < 0) extraDiscVal.value = 0;
        calculateCartTotals();
    });
    
    extraDiscType.addEventListener('change', () => {
        calculateCartTotals();
    });
    
    // 3. Calculator View Swapper (Customer vs Internal)
    const viewTabs = document.querySelectorAll('.view-tab');
    viewTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            viewTabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const targetView = e.currentTarget.getAttribute('data-view');
            const custView = document.getElementById('summary-customer-view');
            const intView = document.getElementById('summary-internal-view');
            
            if (targetView === 'customer') {
                custView.classList.add('active');
                intView.classList.remove('active');
            } else {
                custView.classList.remove('active');
                intView.classList.add('active');
            }
        });
    });
    
    // 4. Cart actions (Clear, Print, Confirm)
    document.getElementById('clear-cart-btn').addEventListener('click', () => {
        if (cart.length > 0) {
            cart = [];
            document.getElementById('extra-discount-val').value = 0;
            renderCart();
            showToast('Quotation cart cleared!', 'info');
        }
    });
    
    document.getElementById('confirm-sale-btn').addEventListener('click', () => {
        checkoutQuotation();
    });
    
    document.getElementById('print-invoice-btn').addEventListener('click', () => {
        triggerInvoicePrint();
    });
    
    // 5. Inventory search & filters
    const invSearch = document.getElementById('inventory-search');
    const invBrandFilter = document.getElementById('inventory-filter-brand');
    
    invSearch.addEventListener('input', () => renderInventory());
    invBrandFilter.addEventListener('change', () => renderInventory());
    
    // 6. Product modal controls
    const addProductBtn = document.getElementById('add-product-btn');
    const productModal = document.getElementById('product-modal');
    const closeProductModal = document.getElementById('close-product-modal');
    const cancelProductModal = document.getElementById('cancel-product-modal');
    const productForm = document.getElementById('product-form');
    
    addProductBtn.addEventListener('click', () => {
        document.getElementById('modal-product-title').textContent = 'Add New Roofing Sheet';
        document.getElementById('product-id-val').value = '';
        productForm.reset();
        renderBrandControls();
        productModal.classList.add('active');
    });
    
    const closeModalFunc = () => {
        productModal.classList.remove('active');
    };
    
    closeProductModal.addEventListener('click', closeModalFunc);
    cancelProductModal.addEventListener('click', closeModalFunc);
    
    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProductFromForm();
        closeModalFunc();
    });
    
    // 7. Quick Add Brand Button
    document.getElementById('add-brand-quick-btn').addEventListener('click', () => {
        const rawBrand = prompt("Enter new brand name (e.g. Sigiri, Rhino, LANKA):");
        if (rawBrand && rawBrand.trim()) {
            const cleanBrand = rawBrand.trim();
            // Check if brand exists
            if (brands.some(b => b.toLowerCase() === cleanBrand.toLowerCase())) {
                showToast(`Brand "${cleanBrand}" already exists!`, 'warning');
                return;
            }
            brands.push(cleanBrand);
            saveBrands();
            renderBrandControls();
            
            // Auto select new brand in modal
            document.getElementById('product-brand-val').value = cleanBrand;
            showToast(`Brand "${cleanBrand}" added and selected!`, 'success');
        }
    });
    
    // 8. CSV Downloads (Spreadsheet Reports)
    document.getElementById('download-inventory-csv-btn').addEventListener('click', downloadInventoryCSV);
    document.getElementById('download-sales-csv-btn').addEventListener('click', downloadSalesCSV);
    
    // 9. Stock Lot Modal Event Listeners
    const addLotBtn = document.getElementById('add-lot-btn');
    const lotModal = document.getElementById('lot-modal');
    const closeLotModal = document.getElementById('close-lot-modal');
    const cancelLotModal = document.getElementById('cancel-lot-modal');
    const lotForm = document.getElementById('lot-form');
    
    addLotBtn.addEventListener('click', () => {
        lotForm.reset();
        document.getElementById('lot-items-container').innerHTML = '';
        renderBrandControls(); // dynamic list
        addLotItemRow(); // first row
        lotModal.classList.add('active');
    });
    
    const closeLotModalFunc = () => {
        lotModal.classList.remove('active');
    };
    
    closeLotModal.addEventListener('click', closeLotModalFunc);
    cancelLotModal.addEventListener('click', closeLotModalFunc);
    
    lotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveLotToStock();
    });
    
    document.getElementById('add-lot-row-btn').addEventListener('click', () => {
        addLotItemRow();
    });
    
    document.getElementById('lot-brand-val').addEventListener('change', () => {
        const selectedBrand = document.getElementById('lot-brand-val').value;
        const rows = document.querySelectorAll('.lot-item-row');
        rows.forEach(row => {
            const select = row.querySelector('.lot-item-product-select');
            const prevVal = select.value;
            populateRowProductsSelect(select, selectedBrand);
            if (select.querySelector(`option[value="${prevVal}"]`)) {
                select.value = prevVal;
            }
        });
        calculateLotCosts();
    });
    
    document.getElementById('lot-cost-val').addEventListener('input', () => {
        calculateLotCosts();
    });
    
    // 10. Sales log filters & operations
    const salesSearch = document.getElementById('sales-search');
    const salesFilterDate = document.getElementById('sales-filter-date');
    const clearDateBtn = document.getElementById('clear-date-filter');
    
    salesSearch.addEventListener('input', () => renderSalesLogs());
    salesFilterDate.addEventListener('change', () => renderSalesLogs());
    clearDateBtn.addEventListener('click', () => {
        salesFilterDate.value = '';
        renderSalesLogs();
    });
    
    document.getElementById('reset-sales-btn').addEventListener('click', () => {
        if (confirm('WARNING: Are you sure you want to clear ALL sales logs? This action is permanent!')) {
            salesLogs = [];
            saveSales();
            renderSalesLogs();
            showToast('All transaction logs deleted successfully!', 'danger');
        }
    });
    
    // 11. Backup & Restore Database
    document.getElementById('export-db-btn').addEventListener('click', exportDatabase);
    document.getElementById('import-db-btn').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', importDatabase);
    
    // 12. Dashboard chart filter buttons
    const chartFilters = document.querySelectorAll('.chart-filter-btn');
    chartFilters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            chartFilters.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const period = e.currentTarget.getAttribute('data-period');
            updateDashboardCharts(period);
        });
    });
}

// ==========================================
// STOCK LOT CALCULATION UTILITIES
// ==========================================

function addLotItemRow() {
    const container = document.getElementById('lot-items-container');
    const selectedBrand = document.getElementById('lot-brand-val').value;
    const row = document.createElement('div');
    row.className = 'lot-item-row';
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.alignItems = 'flex-start';
    row.style.marginTop = '4px';
    
    row.innerHTML = `
        <div style="flex: 2; display: flex; flex-direction: column;">
            <select class="lot-item-product-select form-select-sm" required style="width: 100%; height: 38px; padding: 0 8px; border: 1px solid var(--border); border-radius: var(--radius-sm);">
                <!-- Injected dynamically -->
            </select>
            <input type="text" class="lot-item-new-product-input" placeholder="Enter new sheet size details..." style="display: none; height: 38px; margin-top: 4px; padding: 0 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px;">
        </div>
        <div style="flex: 1;">
            <input type="number" class="lot-item-qty-input" placeholder="Sheets" required min="1" style="width: 100%; height: 38px; padding: 0 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px;">
        </div>
        <button type="button" class="btn-icon delete-action remove-lot-row-btn" style="height: 38px; width: 38px; border: 1px solid var(--border); border-radius: var(--radius-sm); margin: 0; display: flex; align-items: center; justify-content: center;" title="Remove row">
            <i data-lucide="trash-2"></i>
        </button>
    `;
    
    container.appendChild(row);
    lucide.createIcons();
    
    const productSelect = row.querySelector('.lot-item-product-select');
    const newProductInput = row.querySelector('.lot-item-new-product-input');
    const qtyInput = row.querySelector('.lot-item-qty-input');
    const removeBtn = row.querySelector('.remove-lot-row-btn');
    
    // Populate select options
    populateRowProductsSelect(productSelect, selectedBrand);
    
    // Select change listener
    productSelect.addEventListener('change', () => {
        if (productSelect.value === '__new__') {
            newProductInput.style.display = 'block';
            newProductInput.required = true;
        } else {
            newProductInput.style.display = 'none';
            newProductInput.required = false;
        }
        calculateLotCosts();
    });
    
    // Quantity change listener
    qtyInput.addEventListener('input', () => {
        if (qtyInput.value < 1) qtyInput.value = '';
        calculateLotCosts();
    });
    
    // Remove row listener
    removeBtn.addEventListener('click', () => {
        const rowsCount = document.querySelectorAll('.lot-item-row').length;
        if (rowsCount > 1) {
            row.remove();
            calculateLotCosts();
        } else {
            showToast('Must have at least one sheet type in the lot!', 'warning');
        }
    });
    
    calculateLotCosts();
}

function populateRowProductsSelect(selectElement, brand) {
    const brandProducts = products.filter(p => p.brand.toLowerCase() === brand.toLowerCase());
    let selectHTML = `<option value="" disabled selected>-- Select Sheet Size --</option>`;
    brandProducts.forEach(p => {
        selectHTML += `<option value="${p.id}">${p.name} (Stock: ${p.stock})</option>`;
    });
    selectHTML += `<option value="__new__" style="font-weight: bold; color: var(--secondary);">+ Add New Size...</option>`;
    selectElement.innerHTML = selectHTML;
}

function calculateLotCosts() {
    const lotCostVal = parseFloat(document.getElementById('lot-cost-val').value) || 0;
    const qtyInputs = document.querySelectorAll('.lot-item-qty-input');
    
    let totalSheets = 0;
    qtyInputs.forEach(input => {
        totalSheets += parseInt(input.value) || 0;
    });
    
    const costPerSheet = totalSheets > 0 ? lotCostVal / totalSheets : 0;
    
    document.getElementById('lot-preview-total-sheets').textContent = totalSheets.toLocaleString('en-US');
    document.getElementById('lot-preview-cost-per-sheet').textContent = `LKR ${costPerSheet.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function saveLotToStock() {
    const brand = document.getElementById('lot-brand-val').value;
    const weight = parseFloat(document.getElementById('lot-weight-val').value) || 0;
    const lotCost = parseFloat(document.getElementById('lot-cost-val').value) || 0;
    const rows = document.querySelectorAll('.lot-item-row');
    
    if (lotCost <= 0) {
        showToast('Please enter a valid total lot cost!', 'warning');
        return;
    }
    
    // Validate sheet entries
    let totalSheets = 0;
    const itemsToUpdate = [];
    
    for (let row of rows) {
        const select = row.querySelector('.lot-item-product-select');
        const qtyInput = row.querySelector('.lot-item-qty-input');
        const qty = parseInt(qtyInput.value) || 0;
        
        if (!select.value) {
            showToast('Please select or specify a product size for all rows!', 'warning');
            return;
        }
        
        if (qty <= 0) {
            showToast('Please enter a valid quantity of sheets!', 'warning');
            return;
        }
        
        totalSheets += qty;
        
        if (select.value === '__new__') {
            const newNameInput = row.querySelector('.lot-item-new-product-input');
            const newName = newNameInput.value.trim();
            if (!newName) {
                showToast('Please enter the name/description for the new sheet!', 'warning');
                return;
            }
            itemsToUpdate.push({
                isNew: true,
                name: newName,
                qty: qty
            });
        } else {
            itemsToUpdate.push({
                isNew: false,
                productId: select.value,
                qty: qty
            });
        }
    }
    
    if (totalSheets <= 0) {
        showToast('Total sheet count in this lot must be greater than zero!', 'warning');
        return;
    }
    
    const calculatedCostPerSheet = lotCost / totalSheets;
    
    // Update database items
    itemsToUpdate.forEach(item => {
        if (item.isNew) {
            const newId = 'prod_' + Date.now() + Math.random().toString(36).substr(2, 4);
            products.push({
                id: newId,
                name: item.name,
                brand: brand,
                buyingPrice: calculatedCostPerSheet,
                sellingPrice: calculatedCostPerSheet * 1.2, // Default 20% margin
                stock: item.qty,
                alertLevel: 10
            });
        } else {
            const prod = products.find(p => p.id === item.productId);
            if (prod) {
                prod.stock += item.qty;
                prod.buyingPrice = calculatedCostPerSheet; // auto update buying price to lot average
            }
        }
    });
    
    saveProducts();
    
    // Clean up UI & notify
    document.getElementById('lot-modal').classList.remove('active');
    renderInventory();
    renderCatalog();
    renderDashboard();
    
    showToast(`Stock Lot successfully added! Calculated Buying Cost/Sheet: LKR ${calculatedCostPerSheet.toLocaleString('en-US', {minimumFractionDigits: 2})}`, 'success');
}

// ==========================================
// CATALOGUE & CART (CALCULATOR TAB)
// ==========================================

// Render left product grid catalog
function renderCatalog() {
    const searchVal = document.getElementById('catalog-search').value.toLowerCase();
    const brandTabs = document.getElementById('catalog-brand-tabs');
    let activeBrandTab = 'all';
    
    const activeTabBtn = brandTabs ? brandTabs.querySelector('.brand-tab.active') : null;
    if (activeTabBtn) {
        activeBrandTab = activeTabBtn.getAttribute('data-brand').toLowerCase();
    }
    
    const container = document.getElementById('catalog-container');
    container.innerHTML = '';
    
    // Filter products
    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchVal) || p.brand.toLowerCase().includes(searchVal);
        
        let matchesBrand = false;
        if (activeBrandTab === 'all') {
            matchesBrand = true;
        } else if (activeBrandTab === 'other') {
            matchesBrand = !brands.some(b => b.toLowerCase() === p.brand.toLowerCase());
        } else {
            matchesBrand = p.brand.toLowerCase() === activeBrandTab;
        }
        
        return matchesSearch && matchesBrand;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-placeholder" style="grid-column: 1/-1;">
                <i data-lucide="package-search"></i>
                <p>No products match your selection. ${products.length === 0 ? 'Go to Inventory and add some products!' : ''}</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    filtered.forEach(p => {
        const isOutOfStock = p.stock <= 0;
        let stockBadgeText = 'In Stock';
        let stockBadgeClass = 'in-stock';
        
        if (p.stock === 0) {
            stockBadgeText = 'Out of Stock';
            stockBadgeClass = 'out-stock';
        } else if (p.stock <= p.alertLevel) {
            stockBadgeText = `Low: ${p.stock} left`;
            stockBadgeClass = 'low-stock';
        }
        
        let brandClass = 'other';
        if (p.brand.toLowerCase() === 'sigiri') brandClass = 'sigiri';
        else if (p.brand.toLowerCase() === 'rhino') brandClass = 'rhino';
        
        const card = document.createElement('div');
        card.className = `product-card ${isOutOfStock ? 'out-of-stock-card' : ''}`;
        card.innerHTML = `
            <span class="card-brand-badge ${brandClass}">${p.brand}</span>
            <h4>${p.name}</h4>
            <div class="price-box">
                <div class="price-row-item text-muted">
                    <span>Buying cost:</span>
                    <span class="val">LKR ${p.buyingPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="price-row-item">
                    <span>Selling price:</span>
                    <span class="val text-navy">LKR ${p.sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
            <span class="stock-indicator-badge ${stockBadgeClass}">${stockBadgeText}</span>
            <div class="card-actions">
                <button class="btn-add-cart" data-id="${p.id}" ${isOutOfStock ? 'disabled' : ''}>
                    <i data-lucide="plus"></i> Add to Calc
                </button>
            </div>
        `;
        
        container.appendChild(card);
        
        card.querySelector('.btn-add-cart').addEventListener('click', () => {
            addToCart(p.id);
        });
    });
    
    lucide.createIcons();
}

// ==========================================
// INVENTORY MANAGEMENT TAB
// ==========================================

function renderInventory() {
    const searchVal = document.getElementById('inventory-search').value.toLowerCase();
    const brandVal = document.getElementById('inventory-filter-brand').value;
    const tableBody = document.getElementById('inventory-table-body');
    
    tableBody.innerHTML = '';
    
    // Filter
    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchVal) || p.brand.toLowerCase().includes(searchVal);
        
        let matchesBrand = false;
        if (brandVal === 'all') {
            matchesBrand = true;
        } else if (brandVal === 'Other') {
            matchesBrand = !brands.some(b => b.toLowerCase() === p.brand.toLowerCase());
        } else {
            matchesBrand = p.brand === brandVal;
        }
        
        return matchesSearch && matchesBrand;
    });
    
    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center" style="color: var(--text-muted); padding: 40px;">
                    <i data-lucide="package-x" style="width:32px; height:32px; display:block; margin: 0 auto 10px;"></i>
                    No products found in inventory. ${products.length === 0 ? 'Click "Add New Product" or "Add Stock Lot" to get started!' : ''}
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }
    
    filtered.forEach(p => {
        const isOutOfStock = p.stock === 0;
        const isLowStock = p.stock <= p.alertLevel;
        
        let statusBadge = `<span class="badge badge-success">In Stock</span>`;
        if (isOutOfStock) {
            statusBadge = `<span class="badge badge-danger">Out of Stock</span>`;
        } else if (isLowStock) {
            statusBadge = `<span class="badge badge-warning">Low Stock</span>`;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${p.name}</strong></td>
            <td><span class="badge badge-secondary">${p.brand}</span></td>
            <td class="text-right">LKR ${p.buyingPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="text-right">LKR ${p.sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="text-right"><strong>${p.stock}</strong></td>
            <td class="text-center">${p.alertLevel}</td>
            <td>${statusBadge}</td>
            <td class="text-center">
                <div class="table-row-actions">
                    <button class="btn-icon edit-prod-btn" data-id="${p.id}" title="Edit product details">
                        <i data-lucide="edit"></i>
                    </button>
                    <button class="btn-icon delete-prod-btn delete-action" data-id="${p.id}" title="Delete product">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
        
        row.querySelector('.edit-prod-btn').addEventListener('click', () => {
            editProductModal(p.id);
        });
        
        row.querySelector('.delete-prod-btn').addEventListener('click', () => {
            deleteProduct(p.id);
        });
    });
    
    lucide.createIcons();
}

// Open modal for editing existing sheet
function editProductModal(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    
    document.getElementById('modal-product-title').textContent = 'Edit Roofing Sheet Details';
    document.getElementById('product-id-val').value = prod.id;
    document.getElementById('product-name-val').value = prod.name;
    
    renderBrandControls();
    document.getElementById('product-brand-val').value = prod.brand;
    
    document.getElementById('product-buying-val').value = prod.buyingPrice;
    document.getElementById('product-selling-val').value = prod.sellingPrice;
    document.getElementById('product-stock-val').value = prod.stock;
    document.getElementById('product-alert-val').value = prod.alertLevel;
    
    document.getElementById('product-modal').classList.add('active');
}

// Save adding or editing product details
function saveProductFromForm() {
    const id = document.getElementById('product-id-val').value;
    const name = document.getElementById('product-name-val').value;
    const brand = document.getElementById('product-brand-val').value;
    const buyingPrice = parseFloat(document.getElementById('product-buying-val').value) || 0;
    const sellingPrice = parseFloat(document.getElementById('product-selling-val').value) || 0;
    const stock = parseInt(document.getElementById('product-stock-val').value) || 0;
    const alertLevel = parseInt(document.getElementById('product-alert-val').value) || 10;
    
    if (id) {
        // Edit mode
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            products[index] = { id, name, brand, buyingPrice, sellingPrice, stock, alertLevel };
            showToast('Product updated successfully!');
        }
    } else {
        // Create mode
        const newId = 'prod_' + Date.now();
        products.push({ id: newId, name, brand, buyingPrice, sellingPrice, stock, alertLevel });
        showToast('New product added to inventory!');
    }
    
    saveProducts();
    renderInventory();
    renderCatalog();
}

// Delete product
function deleteProduct(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    
    if (confirm(`Are you sure you want to delete ${prod.name} from inventory?`)) {
        products = products.filter(p => p.id !== productId);
        saveProducts();
        renderInventory();
        renderCatalog();
        showToast('Product deleted from database', 'warning');
    }
}

// Download inventory details as Excel CSV report
function downloadInventoryCSV() {
    if (products.length === 0) {
        showToast('No inventory data to export!', 'warning');
        return;
    }
    
    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "Product ID,Product Name,Brand,Buying Price (Cost LKR),Selling Price (LKR),Current Stock,Min Stock Alert,Total Stock Value (Cost LKR),Total Stock Value (Selling LKR)\r\n";
    
    products.forEach(p => {
        const valCost = p.buyingPrice * p.stock;
        const valSelling = p.sellingPrice * p.stock;
        const row = `"${p.id}","${p.name.replace(/"/g, '""')}","${p.brand}",${p.buyingPrice},${p.sellingPrice},${p.stock},${p.alertLevel},${valCost},${valSelling}`;
        csvContent += row + "\r\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `perera_inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Inventory spreadsheet downloaded!');
}

// ==========================================
// SALES HISTORIES & LOGS
// ==========================================

function renderSalesLogs() {
    const searchVal = document.getElementById('sales-search').value.toLowerCase();
    const dateVal = document.getElementById('sales-filter-date').value;
    const tableBody = document.getElementById('sales-table-body');
    
    tableBody.innerHTML = '';
    
    // Filter
    const filtered = salesLogs.filter(log => {
        const matchesSearch = log.id.toLowerCase().includes(searchVal) || 
                              log.items.some(item => item.name.toLowerCase().includes(searchVal));
                              
        let matchesDate = true;
        if (dateVal) {
            const logDate = log.timestamp.split('T')[0];
            matchesDate = logDate === dateVal;
        }
        
        return matchesSearch && matchesDate;
    });
    
    calculateSalesBubbles();
    
    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center" style="color: var(--text-muted); padding: 40px;">
                    <i data-lucide="receipt-text" style="width:32px; height:32px; display:block; margin: 0 auto 10px;"></i>
                    No sales logs found
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }
    
    filtered.forEach(log => {
        const dateObj = new Date(log.timestamp);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
                              ' ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                              
        const productsSummary = log.items.map(item => `${item.name} (${item.qty})`).join(', ');
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${log.id}</strong></td>
            <td><span class="text-muted" style="font-size:12px;">${formattedDate}</span></td>
            <td><div style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${productsSummary}">${productsSummary}</div></td>
            <td class="text-right">LKR ${log.totals.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="text-right" style="font-weight: 700;">LKR ${log.totals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="text-right text-secondary">LKR ${log.totals.totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="text-right text-success-highlight" style="font-weight: 700;">LKR ${log.totals.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="text-center">
                <div class="table-row-actions">
                    <button class="btn-icon reprint-sale-btn" data-id="${log.id}" title="Re-print Invoice">
                        <i data-lucide="printer"></i>
                    </button>
                    <button class="btn-icon refund-sale-btn delete-action" data-id="${log.id}" title="Refund/Cancel Transaction">
                        <i data-lucide="corner-up-left"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
        
        row.querySelector('.reprint-sale-btn').addEventListener('click', () => {
            reprintInvoice(log.id);
        });
        
        row.querySelector('.refund-sale-btn').addEventListener('click', () => {
            refundSale(log.id);
        });
    });
    
    lucide.createIcons();
}

// Calculate the summary bubble cards in the top header of sales history
function calculateSalesBubbles() {
    let today = 0;
    let week = 0;
    let month = 0;
    let total = 0;
    
    const now = new Date();
    
    salesLogs.forEach(log => {
        const logDate = new Date(log.timestamp);
        const profit = log.totals.netProfit;
        
        total += profit;
        
        if (logDate.toDateString() === now.toDateString()) {
            today += profit;
        }
        
        const msDiff = now.getTime() - logDate.getTime();
        const daysDiff = msDiff / (1000 * 3600 * 24);
        if (daysDiff <= 7) {
            week += profit;
        }
        
        if (logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear()) {
            month += profit;
        }
    });
    
    document.getElementById('stat-today-profit').textContent = `LKR ${today.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('stat-week-profit').textContent = `LKR ${week.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('stat-month-profit').textContent = `LKR ${month.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('stat-total-profit').textContent = `LKR ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

// Re-print invoice from historical logs
function reprintInvoice(saleId) {
    const log = salesLogs.find(l => l.id === saleId);
    if (!log) return;
    
    const totals = log.totals;
    const dateObj = new Date(log.timestamp);
    const dateStr = dateObj.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    // Populate printable elements
    document.getElementById('print-inv-id').textContent = log.id;
    document.getElementById('print-inv-date').textContent = dateStr;
    
    const rowsContainer = document.getElementById('print-invoice-rows');
    rowsContainer.innerHTML = '';
    
    log.items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.brand}</td>
            <td class="text-right">LKR ${item.sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="text-right">${item.qty}</td>
            <td class="text-right">${item.itemDiscount > 0 ? 'LKR ' + item.itemDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
            <td class="text-right">LKR ${item.finalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        `;
        rowsContainer.appendChild(row);
    });
    
    document.getElementById('print-subtotal').textContent = `LKR ${totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    
    const discountRow = document.getElementById('print-discount-row');
    if (totals.totalDiscount > 0) {
        discountRow.style.display = 'table-row';
        document.getElementById('print-discount').textContent = `-LKR ${totals.totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    } else {
        discountRow.style.display = 'none';
    }
    
    document.getElementById('print-total').textContent = `LKR ${totals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    
    window.print();
}

// Refund sale transaction & return stock back to inventory database
function refundSale(saleId) {
    const log = salesLogs.find(l => l.id === saleId);
    if (!log) return;
    
    if (confirm(`Are you sure you want to refund/cancel sale ${saleId}? This will return all quantities back to the stock inventory.`)) {
        // Return stock
        log.items.forEach(item => {
            const prod = products.find(p => p.id === item.productId);
            if (prod) {
                prod.stock += item.qty;
            }
        });
        saveProducts();
        
        // Remove log
        salesLogs = salesLogs.filter(l => l.id !== saleId);
        saveSales();
        
        renderSalesLogs();
        showToast(`Transaction ${saleId} refunded. Stock restored.`, 'info');
    }
}

// Download sales log as Excel CSV report
function downloadSalesCSV() {
    if (salesLogs.length === 0) {
        showToast('No sales records to export!', 'warning');
        return;
    }
    
    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "Invoice ID,Date & Time,Products Sold (Qty),Total Buying Cost (LKR),Total Charged (Selling LKR),Discount Given (LKR),Net Profit (LKR),Margin %\r\n";
    
    salesLogs.forEach(log => {
        const dateObj = new Date(log.timestamp);
        const formattedDate = dateObj.toLocaleDateString('en-US') + ' ' + dateObj.toLocaleTimeString('en-US');
        const itemsSummary = log.items.map(item => `${item.name} (${item.qty})`).join('; ');
        
        const row = `"${log.id}","${formattedDate}","${itemsSummary.replace(/"/g, '""')}",${log.totals.totalCost},${log.totals.grandTotal},${log.totals.totalDiscount},${log.totals.netProfit},${log.totals.profitMargin.toFixed(2)}`;
        csvContent += row + "\r\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `perera_sales_report_${new Date().toISOString().split('T')[0]}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Sales spreadsheet report downloaded!');
}

// ==========================================
// DASHBOARD ANALYTICS PANEL
// ==========================================

function renderDashboard() {
    let totalRevenue = 0;
    let totalCostCovered = 0;
    let totalProfit = 0;
    
    salesLogs.forEach(log => {
        totalRevenue += log.totals.grandTotal;
        totalCostCovered += log.totals.totalCost;
        totalProfit += log.totals.netProfit;
    });
    
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    // Populate KPIs
    document.getElementById('kpi-revenue').textContent = `LKR ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('kpi-cost').textContent = `LKR ${totalCostCovered.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('kpi-profit').textContent = `LKR ${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('kpi-margin').textContent = `Profit Margin: ${profitMargin.toFixed(1)}%`;
    document.getElementById('kpi-sales-count').textContent = salesLogs.length;
    
    renderStockAlerts();
    updateDashboardCharts('daily');
}

function renderStockAlerts() {
    const alertsList = document.getElementById('stock-alerts-list');
    alertsList.innerHTML = '';
    
    const lowStockItems = products.filter(p => p.stock <= p.alertLevel);
    document.getElementById('alert-count-badge').textContent = lowStockItems.length;
    
    if (lowStockItems.length === 0) {
        alertsList.innerHTML = `
            <div class="no-alerts-placeholder">
                <i data-lucide="check-circle-2"></i>
                <p>All items are in stock. No alerts!</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    lowStockItems.forEach(p => {
        const isOutOfStock = p.stock === 0;
        const alertEl = document.createElement('div');
        alertEl.className = `alert-item ${isOutOfStock ? 'danger-item' : 'warning-item'}`;
        
        let iconName = 'alert-triangle';
        let stockText = `${p.stock} sheets remaining in inventory`;
        if (isOutOfStock) {
            iconName = 'alert-octagon';
            stockText = 'Out of Stock! Cannot make sales.';
        }
        
        alertEl.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <div class="alert-details">
                <p>${p.name}</p>
                <span>Brand: ${p.brand} | ${stockText}</span>
            </div>
            <button class="btn-primary" style="padding: 4px 8px; font-size: 11px; border-radius: 4px;" onclick="switchTab('inventory'); editProductModal('${p.id}');">
                Restock
            </button>
        `;
        alertsList.appendChild(alertEl);
    });
    
    lucide.createIcons();
}

// Generate graphics using ChartJS CDN
function updateDashboardCharts(period) {
    const ctx = document.getElementById('analytics-chart').getContext('2d');
    
    if (activeChart) {
        activeChart.destroy();
    }
    
    const labels = [];
    const revenueData = [];
    const profitData = [];
    
    const now = new Date();
    
    if (period === 'daily') {
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            labels.push(dateStr);
            
            let dateRev = 0;
            let dateProf = 0;
            salesLogs.forEach(log => {
                const logDate = new Date(log.timestamp);
                if (logDate.toDateString() === d.toDateString()) {
                    dateRev += log.totals.grandTotal;
                    dateProf += log.totals.netProfit;
                }
            });
            
            revenueData.push(dateRev);
            profitData.push(dateProf);
        }
    } else if (period === 'weekly') {
        for (let i = 3; i >= 0; i--) {
            const labelStr = `Week -${i}`;
            labels.push(i === 0 ? 'This Week' : labelStr);
            
            let weekRev = 0;
            let weekProf = 0;
            salesLogs.forEach(log => {
                const logDate = new Date(log.timestamp);
                const msDiff = now.getTime() - logDate.getTime();
                const daysDiff = msDiff / (1000 * 3600 * 24);
                
                if (daysDiff >= i * 7 && daysDiff < (i + 1) * 7) {
                    weekRev += log.totals.grandTotal;
                    weekProf += log.totals.netProfit;
                }
            });
            
            revenueData.push(weekRev);
            profitData.push(weekProf);
        }
    } else if (period === 'monthly') {
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(now.getMonth() - i);
            const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
            labels.push(monthStr);
            
            let monthRev = 0;
            let monthProf = 0;
            salesLogs.forEach(log => {
                const logDate = new Date(log.timestamp);
                if (logDate.getMonth() === d.getMonth() && logDate.getFullYear() === d.getFullYear()) {
                    monthRev += log.totals.grandTotal;
                    monthProf += log.totals.netProfit;
                }
            });
            
            revenueData.push(monthRev);
            profitData.push(monthProf);
        }
    }
    
    activeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Revenue (LKR)',
                    data: revenueData,
                    backgroundColor: '#0f2942',
                    borderColor: '#0f2942',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Net Profit (LKR)',
                    data: profitData,
                    backgroundColor: '#9e1a1a',
                    borderColor: '#9e1a1a',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            family: "'Outfit', sans-serif",
                            weight: '600'
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'LKR ' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// ==========================================
// DATA BACKUP & RESTORE UTILITIES
// ==========================================

// Download Database as JSON Backup
function exportDatabase() {
    const dataStr = JSON.stringify({
        products: products,
        salesLogs: salesLogs,
        brands: brands
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `perera_roofing_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
    
    showToast('Database exported/backed up successfully!');
}

// Upload/Restore Database from JSON Backup
function importDatabase(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.products && Array.isArray(data.products) && data.salesLogs && Array.isArray(data.salesLogs)) {
                if (confirm('Are you sure you want to import this database? This will completely overwrite your current products list, brands, and transaction history.')) {
                    products = data.products;
                    salesLogs = data.salesLogs;
                    brands = data.brands || ['Sigiri', 'Rhino'];
                    
                    saveProducts();
                    saveSales();
                    saveBrands();
                    
                    renderBrandControls();
                    
                    const activeNav = document.querySelector('.nav-item.active');
                    const currentTab = activeNav ? activeNav.getAttribute('data-tab') : 'dashboard';
                    switchTab(currentTab);
                    
                    showToast('Database restored successfully from backup!', 'success');
                }
            } else {
                showToast('Import failed. Invalid database file structure.', 'danger');
            }
        } catch (err) {
            showToast('Import failed. Could not parse database file.', 'danger');
        }
    };
    reader.readAsText(file);
    
    event.target.value = '';
}
