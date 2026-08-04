// ==========================================
// STATE MANAGEMENT & LOCAL STORAGE
// ==========================================

let products = JSON.parse(localStorage.getItem('pr_products')) || [];
let salesLogs = JSON.parse(localStorage.getItem('pr_sales_logs')) || [];
let brands = JSON.parse(localStorage.getItem('pr_brands')) || ['Sigiri', 'Rhino'];
let cart = [];
let activeChart = null;

function saveProducts() { localStorage.setItem('pr_products', JSON.stringify(products)); }
function saveSales()    { localStorage.setItem('pr_sales_logs', JSON.stringify(salesLogs)); }
function saveBrands()   { localStorage.setItem('pr_brands', JSON.stringify(brands)); }

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'check-circle-2', danger: 'alert-octagon', warning: 'alert-triangle', info: 'info' };
    toast.innerHTML = `<i data-lucide="${icons[type] || 'check-circle-2'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
}

// ==========================================
// BRAND CONTROLS RENDER
// ==========================================
function renderBrandControls() {
    // Calculator brand tabs
    const catalogTabs = document.getElementById('catalog-brand-tabs');
    if (catalogTabs) {
        const prevActive = catalogTabs.querySelector('.brand-tab.active');
        let catalogActiveBrand = prevActive ? prevActive.getAttribute('data-brand') : 'all';
        let tabsHTML = `<button class="brand-tab ${catalogActiveBrand === 'all' ? 'active' : ''}" data-brand="all">All Brands</button>`;
        brands.forEach(b => {
            tabsHTML += `<button class="brand-tab ${catalogActiveBrand === b ? 'active' : ''}" data-brand="${b}">${b}</button>`;
        });
        tabsHTML += `<button class="brand-tab ${catalogActiveBrand === 'other' ? 'active' : ''}" data-brand="other">Other</button>`;
        catalogTabs.innerHTML = tabsHTML;
        catalogTabs.querySelectorAll('.brand-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                catalogTabs.querySelectorAll('.brand-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                renderCatalog();
            });
        });
    }

    // Inventory filter select
    const invFilter = document.getElementById('inventory-filter-brand');
    if (invFilter) {
        const prev = invFilter.value || 'all';
        invFilter.innerHTML = `<option value="all">All Brands</option>` +
            brands.map(b => `<option value="${b}">${b}</option>`).join('') +
            `<option value="Other">Other</option>`;
        invFilter.value = (invFilter.querySelector(`option[value="${prev}"]`)) ? prev : 'all';
    }

    // Product modal brand select
    const prodSelect = document.getElementById('product-brand-val');
    if (prodSelect) {
        const prev = prodSelect.value;
        prodSelect.innerHTML = brands.map(b => `<option value="${b}">${b}</option>`).join('') + `<option value="Other">Other</option>`;
        if (prodSelect.querySelector(`option[value="${prev}"]`)) prodSelect.value = prev;
    }

    // Lot modal brand select
    const lotSelect = document.getElementById('lot-brand-val');
    if (lotSelect) {
        const prev = lotSelect.value;
        lotSelect.innerHTML = brands.map(b => `<option value="${b}">${b}</option>`).join('') + `<option value="Other">Other</option>`;
        if (lotSelect.querySelector(`option[value="${prev}"]`)) lotSelect.value = prev;
    }
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateLiveDate();
    setInterval(updateLiveDate, 60000);
    renderBrandControls();

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            switchTab(e.currentTarget.getAttribute('data-tab'));
        });
    });

    switchTab('dashboard');
    lucide.createIcons();
    setupEventListeners();
});

function updateLiveDate() {
    const el = document.getElementById('live-date');
    if (el) el.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
    });

    const titles = {
        dashboard: ['Dashboard Overview', 'Real-time sales statistics and stock statuses'],
        calculator: ['Quotation Calculator', 'Select roofing sheets, add quantity/discounts, and make sales'],
        inventory: ['Inventory Management', 'Add products, update buying/selling prices, and adjust stock counts'],
        sales: ['Sales Transaction Logs', 'Full history of completed customer purchases, costs, and profits']
    };

    if (titles[tabId]) {
        document.getElementById('current-tab-title').textContent = titles[tabId][0];
        document.getElementById('current-tab-subtitle').textContent = titles[tabId][1];
    }

    if (tabId === 'dashboard')  renderDashboard();
    if (tabId === 'calculator') { renderCatalog(); renderCart(); }
    if (tabId === 'inventory')  renderInventory();
    if (tabId === 'sales')      renderSalesLogs();

    lucide.createIcons();
}

// ==========================================
// EVENT LISTENERS SETUP
// ==========================================
function setupEventListeners() {

    // Catalog search
    document.getElementById('catalog-search').addEventListener('input', renderCatalog);

    // Extra discount
    document.getElementById('extra-discount-val').addEventListener('input', calculateCartTotals);
    document.getElementById('extra-discount-type').addEventListener('change', calculateCartTotals);

    // Customer vs Internal view tabs
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const v = e.currentTarget.getAttribute('data-view');
            document.getElementById('summary-customer-view').classList.toggle('active', v === 'customer');
            document.getElementById('summary-internal-view').classList.toggle('active', v === 'internal');
        });
    });

    // Cart action buttons
    document.getElementById('clear-cart-btn').addEventListener('click', () => {
        if (cart.length > 0) {
            cart = [];
            document.getElementById('extra-discount-val').value = 0;
            renderCart();
            showToast('Quotation cart cleared!', 'info');
        }
    });
    document.getElementById('confirm-sale-btn').addEventListener('click', checkoutQuotation);
    document.getElementById('print-invoice-btn').addEventListener('click', triggerInvoicePrint);

    // Inventory search & filter
    document.getElementById('inventory-search').addEventListener('input', renderInventory);
    document.getElementById('inventory-filter-brand').addEventListener('change', renderInventory);

    // Product modal
    const productModal = document.getElementById('product-modal');
    const productForm  = document.getElementById('product-form');

    document.getElementById('add-product-btn').addEventListener('click', () => {
        document.getElementById('modal-product-title').textContent = 'Add New Roofing Sheet';
        document.getElementById('product-id-val').value = '';
        productForm.reset();
        renderBrandControls();
        productModal.classList.add('active');
    });

    const closeProductModal = () => productModal.classList.remove('active');
    document.getElementById('close-product-modal').addEventListener('click', closeProductModal);
    document.getElementById('cancel-product-modal').addEventListener('click', closeProductModal);

    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProductFromForm();
        closeProductModal();
    });

    // Add Brand quick button (inside product modal)
    document.getElementById('add-brand-quick-btn').addEventListener('click', () => {
        const rawBrand = prompt('Enter new brand name (e.g. Lanka, Metrix):');
        if (!rawBrand || !rawBrand.trim()) return;
        const clean = rawBrand.trim();
        if (brands.some(b => b.toLowerCase() === clean.toLowerCase())) {
            showToast(`Brand "${clean}" already exists!`, 'warning');
            return;
        }
        brands.push(clean);
        saveBrands();
        renderBrandControls();
        document.getElementById('product-brand-val').value = clean;
        showToast(`Brand "${clean}" added!`, 'success');
    });

    // CSV downloads
    document.getElementById('download-inventory-csv-btn').addEventListener('click', downloadInventoryCSV);
    document.getElementById('download-sales-csv-btn').addEventListener('click', downloadSalesCSV);

    // ── Stock Lot Modal ──────────────────────────────────────
    const lotModal = document.getElementById('lot-modal');
    const lotForm  = document.getElementById('lot-form');

    document.getElementById('add-lot-btn').addEventListener('click', () => {
        lotForm.reset();
        document.getElementById('lot-items-container').innerHTML = '';
        renderBrandControls();
        addLotItemRow();          // start with one blank row
        lotModal.classList.add('active');
        lucide.createIcons();
    });

    const closeLotModal = () => lotModal.classList.remove('active');
    document.getElementById('close-lot-modal').addEventListener('click', closeLotModal);
    document.getElementById('cancel-lot-modal').addEventListener('click', closeLotModal);

    lotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveLotToStock();
    });

    document.getElementById('add-lot-row-btn').addEventListener('click', addLotItemRow);

    document.getElementById('lot-brand-val').addEventListener('change', () => {
        const brand = document.getElementById('lot-brand-val').value;
        document.querySelectorAll('.lot-item-product-select').forEach(sel => {
            const prev = sel.value;
            populateRowProductsSelect(sel, brand);
            if (sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
        });
        calculateLotCosts();
    });

    document.getElementById('lot-cost-val').addEventListener('input', calculateLotCosts);

    // Sales log controls
    document.getElementById('sales-search').addEventListener('input', renderSalesLogs);
    document.getElementById('sales-filter-date').addEventListener('change', renderSalesLogs);
    document.getElementById('clear-date-filter').addEventListener('click', () => {
        document.getElementById('sales-filter-date').value = '';
        renderSalesLogs();
    });
    document.getElementById('reset-sales-btn').addEventListener('click', () => {
        if (confirm('WARNING: Clear ALL sales logs permanently?')) {
            salesLogs = [];
            saveSales();
            renderSalesLogs();
            showToast('All transaction logs deleted!', 'danger');
        }
    });

    // Backup/Restore
    document.getElementById('export-db-btn').addEventListener('click', exportDatabase);
    document.getElementById('import-db-btn').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', importDatabase);

    // Dashboard chart filters
    document.querySelectorAll('.chart-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            updateDashboardCharts(e.currentTarget.getAttribute('data-period'));
        });
    });
}

// ==========================================
// STOCK LOT FUNCTIONS
// ==========================================
function addLotItemRow() {
    const container = document.getElementById('lot-items-container');
    const brand = document.getElementById('lot-brand-val').value;

    const row = document.createElement('div');
    row.className = 'lot-item-row';
    row.style.cssText = 'display:flex;gap:8px;align-items:flex-start;margin-top:4px;';

    row.innerHTML = `
        <div style="flex:2;display:flex;flex-direction:column;gap:4px;">
            <select class="lot-item-product-select" style="width:100%;height:38px;padding:0 8px;border:1px solid var(--border);border-radius:var(--radius-sm);font-family:inherit;font-size:13px;background:var(--surface);color:var(--text-primary);">
            </select>
            <input type="text" class="lot-item-new-product-input" placeholder="New size/description..." style="display:none;height:38px;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;font-family:inherit;">
        </div>
        <div style="flex:1;">
            <input type="number" class="lot-item-qty-input" placeholder="Sheets" min="1" style="width:100%;height:38px;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;font-family:inherit;">
        </div>
        <button type="button" class="remove-lot-row-btn" style="height:38px;width:38px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;" title="Remove row">
            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
        </button>
    `;

    container.appendChild(row);
    lucide.createIcons();

    const select   = row.querySelector('.lot-item-product-select');
    const newInput = row.querySelector('.lot-item-new-product-input');
    const qtyInput = row.querySelector('.lot-item-qty-input');
    const removeBtn = row.querySelector('.remove-lot-row-btn');

    populateRowProductsSelect(select, brand);

    select.addEventListener('change', () => {
        const isNew = select.value === '__new__';
        newInput.style.display = isNew ? 'block' : 'none';
        newInput.required = isNew;
        calculateLotCosts();
    });

    qtyInput.addEventListener('input', calculateLotCosts);

    removeBtn.addEventListener('click', () => {
        if (document.querySelectorAll('.lot-item-row').length > 1) {
            row.remove();
            calculateLotCosts();
        } else {
            showToast('Need at least one sheet type in the lot!', 'warning');
        }
    });

    calculateLotCosts();
}

function populateRowProductsSelect(selectEl, brand) {
    const brandProds = products.filter(p => p.brand === brand);
    selectEl.innerHTML =
        `<option value="" disabled selected>-- Select Sheet Size --</option>` +
        brandProds.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.stock})</option>`).join('') +
        `<option value="__new__">+ Add New Size...</option>`;
}

function calculateLotCosts() {
    const lotCost = parseFloat(document.getElementById('lot-cost-val').value) || 0;
    let total = 0;
    document.querySelectorAll('.lot-item-qty-input').forEach(inp => {
        total += parseInt(inp.value) || 0;
    });
    const perSheet = total > 0 ? lotCost / total : 0;
    document.getElementById('lot-preview-total-sheets').textContent = total.toLocaleString('en-US');
    document.getElementById('lot-preview-cost-per-sheet').textContent =
        `LKR ${perSheet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function saveLotToStock() {
    const brand   = document.getElementById('lot-brand-val').value;
    const lotCost = parseFloat(document.getElementById('lot-cost-val').value) || 0;
    const rows    = document.querySelectorAll('.lot-item-row');

    if (lotCost <= 0) { showToast('Enter a valid lot cost!', 'warning'); return; }

    let totalSheets = 0;
    const items = [];

    for (const row of rows) {
        const select = row.querySelector('.lot-item-product-select');
        const qty    = parseInt(row.querySelector('.lot-item-qty-input').value) || 0;

        if (!select.value) { showToast('Select or specify a sheet for every row!', 'warning'); return; }
        if (qty <= 0)       { showToast('Enter valid sheet quantity for every row!', 'warning'); return; }

        totalSheets += qty;

        if (select.value === '__new__') {
            const newName = row.querySelector('.lot-item-new-product-input').value.trim();
            if (!newName) { showToast('Enter a name for the new sheet size!', 'warning'); return; }
            items.push({ isNew: true, name: newName, qty });
        } else {
            items.push({ isNew: false, productId: select.value, qty });
        }
    }

    if (totalSheets <= 0) { showToast('Total sheet count must be greater than zero!', 'warning'); return; }

    const costPerSheet = lotCost / totalSheets;

    items.forEach(item => {
        if (item.isNew) {
            products.push({
                id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                name: item.name,
                brand: brand,
                buyingPrice: costPerSheet,
                sellingPrice: Math.round(costPerSheet * 1.2 * 100) / 100,
                stock: item.qty,
                alertLevel: 10
            });
        } else {
            const prod = products.find(p => p.id === item.productId);
            if (prod) {
                prod.stock += item.qty;
                prod.buyingPrice = costPerSheet;
            }
        }
    });

    saveProducts();
    document.getElementById('lot-modal').classList.remove('active');
    renderInventory();
    renderCatalog();
    renderDashboard();
    showToast(`Stock Lot added! Buying Cost/Sheet: LKR ${costPerSheet.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'success');
}

// ==========================================
// CATALOG (CALCULATOR TAB)
// ==========================================
function renderCatalog() {
    const searchVal = document.getElementById('catalog-search').value.toLowerCase();
    const activeTab = document.getElementById('catalog-brand-tabs')?.querySelector('.brand-tab.active');
    const activeBrand = activeTab ? activeTab.getAttribute('data-brand').toLowerCase() : 'all';
    const container = document.getElementById('catalog-container');
    container.innerHTML = '';

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchVal) || p.brand.toLowerCase().includes(searchVal);
        let matchBrand = activeBrand === 'all' ||
            (activeBrand === 'other' ? !brands.some(b => b.toLowerCase() === p.brand.toLowerCase()) : p.brand.toLowerCase() === activeBrand);
        return matchSearch && matchBrand;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-cart-placeholder" style="grid-column:1/-1"><i data-lucide="package-search"></i><p>No products found. ${products.length === 0 ? 'Add products in Inventory first!' : 'Try a different filter.'}</p></div>`;
        lucide.createIcons();
        return;
    }

    filtered.forEach(p => {
        const oos = p.stock <= 0;
        let badgeTxt = 'In Stock', badgeCls = 'in-stock';
        if (p.stock === 0)               { badgeTxt = 'Out of Stock'; badgeCls = 'out-stock'; }
        else if (p.stock <= p.alertLevel){ badgeTxt = `Low: ${p.stock} left`; badgeCls = 'low-stock'; }

        let brandCls = p.brand.toLowerCase() === 'sigiri' ? 'sigiri' : p.brand.toLowerCase() === 'rhino' ? 'rhino' : 'other';

        const card = document.createElement('div');
        card.className = `product-card ${oos ? 'out-of-stock-card' : ''}`;
        card.innerHTML = `
            <span class="card-brand-badge ${brandCls}">${p.brand}</span>
            <h4>${p.name}</h4>
            <div class="price-box">
                <div class="price-row-item text-muted">
                    <span>Buying cost:</span>
                    <span class="val">LKR ${p.buyingPrice.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
                </div>
                <div class="price-row-item">
                    <span>Selling price:</span>
                    <span class="val text-navy">LKR ${p.sellingPrice.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
                </div>
            </div>
            <span class="stock-indicator-badge ${badgeCls}">${badgeTxt}</span>
            <div class="card-actions">
                <button class="btn-add-cart" data-id="${p.id}" ${oos ? 'disabled' : ''}>
                    <i data-lucide="plus"></i> Add to Calc
                </button>
            </div>`;
        container.appendChild(card);
        if (!oos) card.querySelector('.btn-add-cart').addEventListener('click', () => addToCart(p.id));
    });
    lucide.createIcons();
}

// ==========================================
// CART FUNCTIONS
// ==========================================
function addToCart(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const existing = cart.find(c => c.productId === productId);
    if (existing) {
        if (existing.qty < prod.stock) {
            existing.qty++;
            showToast(`${prod.name} quantity increased`, 'info');
        } else {
            showToast(`Not enough stock! Only ${prod.stock} available.`, 'warning');
            return;
        }
    } else {
        cart.push({ productId, name: prod.name, brand: prod.brand, buyingPrice: prod.buyingPrice, sellingPrice: prod.sellingPrice, qty: 1, itemDiscount: 0, itemDiscountType: 'flat' });
    }
    renderCart();
}

function removeFromCart(productId) {
    cart = cart.filter(c => c.productId !== productId);
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = `<div class="empty-cart-placeholder"><i data-lucide="shopping-cart"></i><p>Cart is empty. Select a product from the catalog.</p></div>`;
        lucide.createIcons();
        calculateCartTotals();
        return;
    }

    cart.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <div class="cart-item-details">
                <strong>${item.name}</strong>
                <small class="text-muted">${item.brand} &bull; LKR ${item.sellingPrice.toLocaleString('en-US',{minimumFractionDigits:2})} each</small>
            </div>
            <div class="cart-item-controls">
                <div class="qty-control">
                    <button type="button" class="qty-btn qty-minus" data-idx="${idx}">-</button>
                    <input type="number" class="qty-input" value="${item.qty}" min="1" data-idx="${idx}" style="width:52px;text-align:center;border:1px solid var(--border);border-radius:4px;padding:4px;">
                    <button type="button" class="qty-btn qty-plus" data-idx="${idx}">+</button>
                </div>
                <div class="item-discount-control" style="display:flex;gap:4px;align-items:center;">
                    <input type="number" class="item-disc-val" value="${item.itemDiscount}" min="0" placeholder="Disc" data-idx="${idx}" style="width:60px;border:1px solid var(--border);border-radius:4px;padding:4px;font-size:12px;">
                    <select class="item-disc-type" data-idx="${idx}" style="border:1px solid var(--border);border-radius:4px;padding:4px;font-size:12px;font-family:inherit;">
                        <option value="flat"   ${item.itemDiscountType==='flat'  ?'selected':''}>LKR</option>
                        <option value="percent"${item.itemDiscountType==='percent'?'selected':''}>%</option>
                    </select>
                </div>
                <button type="button" class="btn-icon delete-action remove-cart-item" data-idx="${idx}" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:transparent;cursor:pointer;">
                    <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                </button>
            </div>`;
        container.appendChild(row);
    });

    lucide.createIcons();

    // Bind controls
    container.querySelectorAll('.qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            if (cart[idx].qty > 1) { cart[idx].qty--; renderCart(); }
        });
    });
    container.querySelectorAll('.qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            const prod = products.find(p => p.id === cart[idx].productId);
            if (prod && cart[idx].qty < prod.stock) { cart[idx].qty++; renderCart(); }
            else showToast('Not enough stock!', 'warning');
        });
    });
    container.querySelectorAll('.qty-input').forEach(inp => {
        inp.addEventListener('change', () => {
            const idx = parseInt(inp.getAttribute('data-idx'));
            const prod = products.find(p => p.id === cart[idx].productId);
            let val = parseInt(inp.value) || 1;
            if (val < 1) val = 1;
            if (prod && val > prod.stock) { val = prod.stock; showToast('Not enough stock!', 'warning'); }
            cart[idx].qty = val;
            renderCart();
        });
    });
    container.querySelectorAll('.item-disc-val').forEach(inp => {
        inp.addEventListener('input', () => {
            const idx = parseInt(inp.getAttribute('data-idx'));
            cart[idx].itemDiscount = parseFloat(inp.value) || 0;
            calculateCartTotals();
        });
    });
    container.querySelectorAll('.item-disc-type').forEach(sel => {
        sel.addEventListener('change', () => {
            const idx = parseInt(sel.getAttribute('data-idx'));
            cart[idx].itemDiscountType = sel.value;
            calculateCartTotals();
        });
    });
    container.querySelectorAll('.remove-cart-item').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(cart[parseInt(btn.getAttribute('data-idx'))].productId));
    });

    calculateCartTotals();
}

function calculateCartTotals() {
    let subtotal = 0, totalCost = 0, itemDiscountTotal = 0;

    cart.forEach(item => {
        const lineSubtotal = item.sellingPrice * item.qty;
        const lineCost     = item.buyingPrice  * item.qty;
        let   lineDisc     = 0;

        if (item.itemDiscountType === 'flat')    lineDisc = item.itemDiscount * item.qty;
        else if (item.itemDiscountType === 'percent') lineDisc = lineSubtotal * (item.itemDiscount / 100);

        subtotal         += lineSubtotal;
        totalCost        += lineCost;
        itemDiscountTotal+= lineDisc;
    });

    const extraDiscVal  = parseFloat(document.getElementById('extra-discount-val').value)  || 0;
    const extraDiscType = document.getElementById('extra-discount-type').value;
    let   extraDiscount = 0;
    if (extraDiscType === 'flat')    extraDiscount = extraDiscVal;
    else if (extraDiscType === 'percent') extraDiscount = subtotal * (extraDiscVal / 100);

    const totalDiscount = itemDiscountTotal + extraDiscount;
    const grandTotal    = Math.max(0, subtotal - totalDiscount);
    const netProfit     = grandTotal - totalCost;
    const profitMargin  = grandTotal > 0 ? (netProfit / grandTotal) * 100 : 0;

    // Customer view
    document.getElementById('cust-subtotal').textContent = `LKR ${subtotal.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    document.getElementById('cust-discount').textContent = `- LKR ${totalDiscount.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    document.getElementById('cust-grand-total').textContent = `LKR ${grandTotal.toLocaleString('en-US',{minimumFractionDigits:2})}`;

    // Internal view
    document.getElementById('int-subtotal').textContent    = `LKR ${subtotal.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    document.getElementById('int-total-cost').textContent  = `LKR ${totalCost.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    document.getElementById('int-discount').textContent    = `- LKR ${totalDiscount.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    document.getElementById('int-grand-total').textContent = `LKR ${grandTotal.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    document.getElementById('int-net-profit').textContent  = `LKR ${netProfit.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    document.getElementById('int-profit-margin').textContent = `${profitMargin.toFixed(1)}%`;

    // Colour profit
    const profitEl = document.getElementById('int-net-profit');
    profitEl.style.color = netProfit >= 0 ? 'var(--success)' : 'var(--secondary)';

    return { subtotal, totalCost, totalDiscount, grandTotal, netProfit, profitMargin };
}

function checkoutQuotation() {
    if (cart.length === 0) { showToast('Cart is empty!', 'warning'); return; }
    const totals = calculateCartTotals();

    // Check stock availability
    for (const item of cart) {
        const prod = products.find(p => p.id === item.productId);
        if (!prod || prod.stock < item.qty) {
            showToast(`Insufficient stock for ${item.name}!`, 'danger'); return;
        }
    }

    // Deduct stock
    const saleItems = cart.map(item => {
        const prod = products.find(p => p.id === item.productId);
        prod.stock -= item.qty;
        const lineSubtotal = item.sellingPrice * item.qty;
        let lineDisc = item.itemDiscountType === 'flat' ? item.itemDiscount * item.qty : lineSubtotal * (item.itemDiscount / 100);
        return {
            productId: item.productId,
            name: item.name,
            brand: item.brand,
            buyingPrice: item.buyingPrice,
            sellingPrice: item.sellingPrice,
            qty: item.qty,
            itemDiscount: lineDisc,
            finalPrice: lineSubtotal - lineDisc
        };
    });
    saveProducts();

    const saleId = 'INV-' + Date.now().toString().slice(-6);
    const saleLog = { id: saleId, timestamp: new Date().toISOString(), items: saleItems, totals };
    salesLogs.unshift(saleLog);
    saveSales();

    // Print invoice
    populateInvoiceForPrint(saleLog);

    cart = [];
    document.getElementById('extra-discount-val').value = 0;
    renderCart();
    renderCatalog();
    renderDashboard();
    showToast(`Sale ${saleId} completed! Printing invoice...`, 'success');
    setTimeout(() => window.print(), 400);
}

function triggerInvoicePrint() {
    if (cart.length === 0) { showToast('Cart is empty — nothing to print!', 'warning'); return; }
    const totals = calculateCartTotals();
    const previewLog = {
        id: 'QUOTE-' + Date.now().toString().slice(-6),
        timestamp: new Date().toISOString(),
        items: cart.map(item => {
            const lineSubtotal = item.sellingPrice * item.qty;
            const lineDisc = item.itemDiscountType === 'flat' ? item.itemDiscount * item.qty : lineSubtotal * (item.itemDiscount / 100);
            return { productId: item.productId, name: item.name, brand: item.brand, buyingPrice: item.buyingPrice, sellingPrice: item.sellingPrice, qty: item.qty, itemDiscount: lineDisc, finalPrice: lineSubtotal - lineDisc };
        }),
        totals
    };
    populateInvoiceForPrint(previewLog);
    window.print();
}

function populateInvoiceForPrint(log) {
    const dateObj = new Date(log.timestamp);
    document.getElementById('print-inv-id').textContent   = log.id;
    document.getElementById('print-inv-date').textContent = dateObj.toLocaleString('en-US',{ year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });

    const rowsCont = document.getElementById('print-invoice-rows');
    rowsCont.innerHTML = '';
    log.items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.brand}</td>
            <td class="text-right">LKR ${item.sellingPrice.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
            <td class="text-right">${item.qty}</td>
            <td class="text-right">${item.itemDiscount > 0 ? 'LKR ' + item.itemDiscount.toLocaleString('en-US',{minimumFractionDigits:2}) : '-'}</td>
            <td class="text-right">LKR ${item.finalPrice.toLocaleString('en-US',{minimumFractionDigits:2})}</td>`;
        rowsCont.appendChild(tr);
    });

    document.getElementById('print-subtotal').textContent = `LKR ${log.totals.subtotal.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    const discRow = document.getElementById('print-discount-row');
    if (log.totals.totalDiscount > 0) {
        discRow.style.display = 'table-row';
        document.getElementById('print-discount').textContent = `- LKR ${log.totals.totalDiscount.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    } else {
        discRow.style.display = 'none';
    }
    document.getElementById('print-total').textContent = `LKR ${log.totals.grandTotal.toLocaleString('en-US',{minimumFractionDigits:2})}`;
}

// ==========================================
// INVENTORY TAB — CARD GRID
// ==========================================
function renderInventory() {
    const searchVal = document.getElementById('inventory-search').value.toLowerCase();
    const brandVal  = document.getElementById('inventory-filter-brand').value;
    const grid      = document.getElementById('inventory-cards-grid');
    grid.innerHTML  = '';

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchVal) || p.brand.toLowerCase().includes(searchVal);
        const matchBrand  = brandVal === 'all' ? true
            : brandVal === 'Other' ? !brands.some(b => b.toLowerCase() === p.brand.toLowerCase())
            : p.brand === brandVal;
        return matchSearch && matchBrand;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-cart-placeholder" style="grid-column:1/-1;">
                <i data-lucide="package-x"></i>
                <p>${products.length === 0 ? 'No products yet. Click "Add Stock Lot" or "Add New Product" to get started!' : 'No products match your filter.'}</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    filtered.forEach(p => {
        const margin = p.buyingPrice > 0 ? ((p.sellingPrice - p.buyingPrice) / p.sellingPrice * 100) : 0;

        let statusBadgeTxt = 'In Stock';
        let statusBadgeCls = 'in-stock';
        let stockColor     = '';
        if (p.stock === 0)                { statusBadgeTxt = 'Out of Stock'; statusBadgeCls = 'out-stock'; stockColor = 'color:var(--danger);'; }
        else if (p.stock <= p.alertLevel) { statusBadgeTxt = 'Low Stock';    statusBadgeCls = 'low-stock'; stockColor = 'color:var(--warning);'; }

        let brandBadgeCls = p.brand.toLowerCase() === 'sigiri' ? 'sigiri'
            : p.brand.toLowerCase() === 'rhino' ? 'rhino' : 'other';

        const card = document.createElement('div');
        card.className = 'inv-card';
        card.innerHTML = `
            <span class="inv-card-brand card-brand-badge ${brandBadgeCls}">${p.brand}</span>
            <h4>${p.name}</h4>

            <div class="inv-card-prices">
                <div class="inv-price-row">
                    <span class="label">Buying cost</span>
                    <span class="value">LKR ${p.buyingPrice.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
                </div>
                <div class="inv-price-row">
                    <span class="label">Selling price</span>
                    <span class="value sell">LKR ${p.sellingPrice.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
                </div>
                <div class="inv-price-row" style="border-top:1px dashed var(--border);padding-top:4px;margin-top:2px;">
                    <span class="label">Profit margin</span>
                    <span class="value profit">${margin.toFixed(1)}%</span>
                </div>
            </div>

            <div class="inv-stock-row">
                <div>
                    <div class="inv-stock-count" style="${stockColor}">${p.stock}</div>
                    <div class="inv-stock-label">sheets in stock</div>
                </div>
                <div style="text-align:right;">
                    <span class="stock-indicator-badge ${statusBadgeCls}">${statusBadgeTxt}</span>
                    <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">Alert at ${p.alertLevel}</div>
                </div>
            </div>

            <div class="inv-card-actions">
                <button class="inv-edit-btn" data-id="${p.id}">
                    <i data-lucide="edit-3"></i> Edit
                </button>
                <button class="inv-delete-btn" data-id="${p.id}">
                    <i data-lucide="trash-2"></i> Delete
                </button>
            </div>`;

        grid.appendChild(card);

        card.querySelector('.inv-edit-btn').addEventListener('click', () => editProductModal(p.id));
        card.querySelector('.inv-delete-btn').addEventListener('click', () => deleteProduct(p.id));
    });

    lucide.createIcons();
}


function editProductModal(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    document.getElementById('modal-product-title').textContent = 'Edit Roofing Sheet Details';
    document.getElementById('product-id-val').value    = prod.id;
    document.getElementById('product-name-val').value  = prod.name;
    renderBrandControls();
    document.getElementById('product-brand-val').value   = prod.brand;
    document.getElementById('product-buying-val').value  = prod.buyingPrice;
    document.getElementById('product-selling-val').value = prod.sellingPrice;
    document.getElementById('product-stock-val').value   = prod.stock;
    document.getElementById('product-alert-val').value   = prod.alertLevel;
    document.getElementById('product-modal').classList.add('active');
}

function saveProductFromForm() {
    const id           = document.getElementById('product-id-val').value;
    const name         = document.getElementById('product-name-val').value.trim();
    const brand        = document.getElementById('product-brand-val').value;
    const buyingPrice  = parseFloat(document.getElementById('product-buying-val').value)  || 0;
    const sellingPrice = parseFloat(document.getElementById('product-selling-val').value) || 0;
    const stock        = parseInt(document.getElementById('product-stock-val').value)      || 0;
    const alertLevel   = parseInt(document.getElementById('product-alert-val').value)      || 10;

    if (id) {
        const idx = products.findIndex(p => p.id === id);
        if (idx !== -1) { products[idx] = { id, name, brand, buyingPrice, sellingPrice, stock, alertLevel }; }
        showToast('Product updated!');
    } else {
        products.push({ id: 'prod_' + Date.now(), name, brand, buyingPrice, sellingPrice, stock, alertLevel });
        showToast('Product added!');
    }
    saveProducts();
    renderInventory();
    renderCatalog();
}

function deleteProduct(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    if (confirm(`Delete "${prod.name}" from inventory?`)) {
        products = products.filter(p => p.id !== productId);
        saveProducts();
        renderInventory();
        renderCatalog();
        showToast('Product deleted', 'warning');
    }
}

function downloadInventoryCSV() {
    if (products.length === 0) { showToast('No inventory to export!', 'warning'); return; }
    let csv = "\uFEFFProduct Name,Brand,Buying Price (LKR),Selling Price (LKR),Stock,Min Alert,Cost Value (LKR),Selling Value (LKR)\r\n";
    products.forEach(p => {
        csv += `"${p.name.replace(/"/g,'""')}","${p.brand}",${p.buyingPrice},${p.sellingPrice},${p.stock},${p.alertLevel},${p.buyingPrice*p.stock},${p.sellingPrice*p.stock}\r\n`;
    });
    downloadBlob(csv, `perera_inventory_${todayStr()}.csv`, 'text/csv');
    showToast('Inventory CSV downloaded!');
}

// ==========================================
// SALES LOGS TAB
// ==========================================
function renderSalesLogs() {
    const searchVal = document.getElementById('sales-search').value.toLowerCase();
    const dateVal   = document.getElementById('sales-filter-date').value;
    const tbody     = document.getElementById('sales-table-body');
    tbody.innerHTML = '';

    const filtered = salesLogs.filter(log => {
        const matchSearch = log.id.toLowerCase().includes(searchVal) || log.items.some(i => i.name.toLowerCase().includes(searchVal));
        const matchDate   = dateVal ? log.timestamp.split('T')[0] === dateVal : true;
        return matchSearch && matchDate;
    });

    calculateSalesBubbles();

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:40px;color:var(--text-muted);">
            <i data-lucide="receipt-text" style="width:32px;height:32px;display:block;margin:0 auto 10px;"></i>No sales logs found.
        </td></tr>`;
        lucide.createIcons(); return;
    }

    filtered.forEach(log => {
        const d = new Date(log.timestamp);
        const dateStr = d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' ' + d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
        const summary = log.items.map(i => `${i.name} (${i.qty})`).join(', ');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${log.id}</strong></td>
            <td><span class="text-muted" style="font-size:12px;">${dateStr}</span></td>
            <td><div style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${summary}">${summary}</div></td>
            <td class="text-right">LKR ${log.totals.totalCost.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
            <td class="text-right" style="font-weight:700;">LKR ${log.totals.grandTotal.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
            <td class="text-right text-secondary">LKR ${log.totals.totalDiscount.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
            <td class="text-right" style="font-weight:700;color:var(--success);">LKR ${log.totals.netProfit.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
            <td class="text-center">
                <div class="table-row-actions">
                    <button class="btn-icon reprint-btn" data-id="${log.id}" title="Reprint"><i data-lucide="printer"></i></button>
                    <button class="btn-icon delete-action refund-btn" data-id="${log.id}" title="Refund"><i data-lucide="corner-up-left"></i></button>
                </div>
            </td>`;
        tbody.appendChild(tr);
        tr.querySelector('.reprint-btn').addEventListener('click', () => reprintInvoice(log.id));
        tr.querySelector('.refund-btn').addEventListener('click', () => refundSale(log.id));
    });
    lucide.createIcons();
}

function calculateSalesBubbles() {
    let today=0, week=0, month=0, total=0;
    const now = new Date();
    salesLogs.forEach(log => {
        const d = new Date(log.timestamp), p = log.totals.netProfit;
        total += p;
        if (d.toDateString() === now.toDateString()) today += p;
        if ((now - d) / 864e5 <= 7) week += p;
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) month += p;
    });
    const fmt = v => `LKR ${v.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    document.getElementById('stat-today-profit').textContent = fmt(today);
    document.getElementById('stat-week-profit').textContent  = fmt(week);
    document.getElementById('stat-month-profit').textContent = fmt(month);
    document.getElementById('stat-total-profit').textContent = fmt(total);
}

function reprintInvoice(saleId) {
    const log = salesLogs.find(l => l.id === saleId);
    if (!log) return;
    populateInvoiceForPrint(log);
    window.print();
}

function refundSale(saleId) {
    const log = salesLogs.find(l => l.id === saleId);
    if (!log) return;
    if (confirm(`Refund sale ${saleId}? Stock will be restored.`)) {
        log.items.forEach(item => {
            const prod = products.find(p => p.id === item.productId);
            if (prod) prod.stock += item.qty;
        });
        saveProducts();
        salesLogs = salesLogs.filter(l => l.id !== saleId);
        saveSales();
        renderSalesLogs();
        showToast(`${saleId} refunded. Stock restored.`, 'info');
    }
}

function downloadSalesCSV() {
    if (salesLogs.length === 0) { showToast('No sales to export!', 'warning'); return; }
    let csv = "\uFEFFInvoice ID,Date,Products,Cost (LKR),Revenue (LKR),Discount (LKR),Profit (LKR),Margin %\r\n";
    salesLogs.forEach(log => {
        const d = new Date(log.timestamp);
        const items = log.items.map(i => `${i.name}(${i.qty})`).join('; ');
        csv += `"${log.id}","${d.toLocaleDateString('en-US')} ${d.toLocaleTimeString('en-US')}","${items.replace(/"/g,'""')}",${log.totals.totalCost},${log.totals.grandTotal},${log.totals.totalDiscount},${log.totals.netProfit},${log.totals.profitMargin.toFixed(2)}\r\n`;
    });
    downloadBlob(csv, `perera_sales_${todayStr()}.csv`, 'text/csv');
    showToast('Sales CSV downloaded!');
}

// ==========================================
// DASHBOARD
// ==========================================
function renderDashboard() {
    let totalRevenue=0, totalCost=0, totalProfit=0;
    salesLogs.forEach(log => {
        totalRevenue += log.totals.grandTotal;
        totalCost    += log.totals.totalCost;
        totalProfit  += log.totals.netProfit;
    });
    const margin = totalRevenue > 0 ? (totalProfit/totalRevenue)*100 : 0;

    document.getElementById('kpi-revenue').textContent    = `LKR ${totalRevenue.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    document.getElementById('kpi-cost').textContent       = `LKR ${totalCost.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    document.getElementById('kpi-profit').textContent     = `LKR ${totalProfit.toLocaleString('en-US',{minimumFractionDigits:2})}`;
    document.getElementById('kpi-margin').textContent     = `Profit Margin: ${margin.toFixed(1)}%`;
    document.getElementById('kpi-sales-count').textContent = salesLogs.length;

    renderStockAlerts();
    updateDashboardCharts('daily');
}

function renderStockAlerts() {
    const list  = document.getElementById('stock-alerts-list');
    const badge = document.getElementById('alert-count-badge');
    list.innerHTML = '';
    const low = products.filter(p => p.stock <= p.alertLevel);
    badge.textContent = low.length;

    if (low.length === 0) {
        list.innerHTML = `<div class="no-alerts-placeholder"><i data-lucide="check-circle-2"></i><p>All stock levels are fine!</p></div>`;
        lucide.createIcons(); return;
    }
    low.forEach(p => {
        const oos = p.stock === 0;
        const el = document.createElement('div');
        el.className = `alert-item ${oos ? 'danger-item' : 'warning-item'}`;
        el.innerHTML = `
            <i data-lucide="${oos ? 'alert-octagon' : 'alert-triangle'}"></i>
            <div class="alert-details">
                <p>${p.name}</p>
                <span>${p.brand} &bull; ${oos ? 'Out of Stock!' : p.stock + ' sheets left'}</span>
            </div>
            <button class="btn-primary" style="padding:4px 8px;font-size:11px;border-radius:4px;" onclick="switchTab('inventory');editProductModal('${p.id}');">Restock</button>`;
        list.appendChild(el);
    });
    lucide.createIcons();
}

function updateDashboardCharts(period) {
    const ctx = document.getElementById('analytics-chart').getContext('2d');
    if (activeChart) { activeChart.destroy(); activeChart = null; }

    const labels=[], revenue=[], profit=[];
    const now = new Date();

    if (period === 'daily') {
        for (let i=6; i>=0; i--) {
            const d = new Date(); d.setDate(now.getDate()-i);
            labels.push(d.toLocaleDateString('en-US',{month:'short',day:'numeric'}));
            let r=0, p=0;
            salesLogs.forEach(log => { if (new Date(log.timestamp).toDateString()===d.toDateString()) { r+=log.totals.grandTotal; p+=log.totals.netProfit; } });
            revenue.push(r); profit.push(p);
        }
    } else if (period === 'weekly') {
        for (let i=3; i>=0; i--) {
            labels.push(i===0 ? 'This Week' : `Week -${i}`);
            let r=0, p=0;
            salesLogs.forEach(log => {
                const diff=(now - new Date(log.timestamp))/864e5;
                if (diff >= i*7 && diff < (i+1)*7) { r+=log.totals.grandTotal; p+=log.totals.netProfit; }
            });
            revenue.push(r); profit.push(p);
        }
    } else {
        for (let i=5; i>=0; i--) {
            const d = new Date(); d.setMonth(now.getMonth()-i);
            labels.push(d.toLocaleDateString('en-US',{month:'short'}));
            let r=0, p=0;
            salesLogs.forEach(log => {
                const ld = new Date(log.timestamp);
                if (ld.getMonth()===d.getMonth() && ld.getFullYear()===d.getFullYear()) { r+=log.totals.grandTotal; p+=log.totals.netProfit; }
            });
            revenue.push(r); profit.push(p);
        }
    }

    activeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label:'Revenue (LKR)', data:revenue, backgroundColor:'#0f2942', borderRadius:4 },
                { label:'Net Profit (LKR)', data:profit, backgroundColor:'#9e1a1a', borderRadius:4 }
            ]
        },
        options: {
            responsive:true, maintainAspectRatio:false,
            plugins: { legend:{ position:'top', labels:{ font:{ family:"'Outfit',sans-serif", weight:'600' } } } },
            scales: { y:{ beginAtZero:true, ticks:{ callback: v => 'LKR '+v.toLocaleString() } } }
        }
    });
}

// ==========================================
// DATABASE BACKUP & RESTORE
// ==========================================
function exportDatabase() {
    const data = JSON.stringify({ products, salesLogs, brands }, null, 2);
    downloadBlob(data, `perera_backup_${todayStr()}.json`, 'application/json');
    showToast('Database backup downloaded!');
}

function importDatabase(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data.products) || !Array.isArray(data.salesLogs)) throw new Error('Invalid');
            if (!confirm('Overwrite current data with this backup?')) return;
            products  = data.products;
            salesLogs = data.salesLogs;
            brands    = data.brands || ['Sigiri','Rhino'];
            saveProducts(); saveSales(); saveBrands();
            renderBrandControls();
            const tab = document.querySelector('.nav-item.active')?.getAttribute('data-tab') || 'dashboard';
            switchTab(tab);
            showToast('Database restored!');
        } catch { showToast('Invalid backup file!', 'danger'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==========================================
// UTILITY HELPERS
// ==========================================
function todayStr() { return new Date().toISOString().split('T')[0]; }

function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
