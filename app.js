// ============================================================
// STATE
// ============================================================
const SHEET_SIZES = [
    { value: '6ft',   label: '6 ft' },
    { value: '8ft',   label: '8 ft' },
    { value: '10ft',  label: '10 ft' },
    { value: '12ft',  label: '12 ft' },
    { value: '4x4',   label: '4 × 4 ft' },
];

let products  = JSON.parse(localStorage.getItem('pr_products'))    || [];
let salesLogs = JSON.parse(localStorage.getItem('pr_sales_logs'))  || [];
let stockLogs = JSON.parse(localStorage.getItem('pr_stock_logs'))  || [];
let brands    = JSON.parse(localStorage.getItem('pr_brands'))      || ['Sigiri', 'Rhino'];
let cart      = [];
let activeChart = null;

function saveProducts()  { localStorage.setItem('pr_products',   JSON.stringify(products));  }
function saveSales()     { localStorage.setItem('pr_sales_logs', JSON.stringify(salesLogs)); }
function saveStockLogs() { localStorage.setItem('pr_stock_logs', JSON.stringify(stockLogs)); }
function saveBrands()    { localStorage.setItem('pr_brands',     JSON.stringify(brands));    }

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    const icons = { success:'check-circle-2', danger:'alert-octagon', warning:'alert-triangle', info:'info' };
    t.innerHTML = `<i data-lucide="${icons[type]||'check-circle-2'}"></i><span>${msg}</span>`;
    c.appendChild(t);
    lucide.createIcons();
    setTimeout(() => { t.classList.add('fade-out'); t.addEventListener('animationend', () => t.remove()); }, 3500);
}

// ============================================================
// HELPERS
// ============================================================
function sizeLabel(val) {
    const s = SHEET_SIZES.find(s => s.value === val);
    return s ? s.label : val || '—';
}

function productFullName(p) {
    return `${sizeLabel(p.size)} ${p.brand} Roofing Sheet`;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

function fmt(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// ============================================================
// BRAND CONTROLS
// ============================================================
function renderBrandControls() {
    // Catalog brand tabs
    const tabs = document.getElementById('catalog-brand-tabs');
    if (tabs) {
        const active = tabs.querySelector('.brand-tab.active');
        const cur    = active ? active.getAttribute('data-brand') : 'all';
        tabs.innerHTML =
            `<button class="brand-tab ${cur==='all'?'active':''}" data-brand="all">All</button>` +
            brands.map(b => `<button class="brand-tab ${cur===b?'active':''}" data-brand="${b}">${b}</button>`).join('') +
            `<button class="brand-tab ${cur==='other'?'active':''}" data-brand="other">Other</button>`;
        tabs.querySelectorAll('.brand-tab').forEach(btn => {
            btn.addEventListener('click', e => {
                tabs.querySelectorAll('.brand-tab').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                renderCatalog();
            });
        });
    }

    // Inventory filter
    const invF = document.getElementById('inventory-filter-brand');
    if (invF) {
        const prev = invF.value || 'all';
        invF.innerHTML = `<option value="all">All Brands</option>` +
            brands.map(b => `<option value="${b}">${b}</option>`).join('') +
            `<option value="Other">Other</option>`;
        if (invF.querySelector(`option[value="${prev}"]`)) invF.value = prev;
    }

    // Product modal brand select
    const ps = document.getElementById('product-brand-val');
    if (ps) {
        const prev = ps.value;
        ps.innerHTML = brands.map(b => `<option value="${b}">${b}</option>`).join('') + `<option value="Other">Other</option>`;
        if (ps.querySelector(`option[value="${prev}"]`)) ps.value = prev;
    }

    // Stock entry brand select
    const se = document.getElementById('se-brand');
    if (se) {
        const prev = se.value;
        se.innerHTML = `<option value="" disabled selected>-- Select Brand --</option>` +
            brands.map(b => `<option value="${b}">${b}</option>`).join('') + `<option value="Other">Other</option>`;
        if (se.querySelector(`option[value="${prev}"]`)) se.value = prev;
    }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    updateLiveDate();
    setInterval(updateLiveDate, 60000);
    renderBrandControls();
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', e => switchTab(e.currentTarget.getAttribute('data-tab')));
    });
    setupEventListeners();
    switchTab('dashboard');
    lucide.createIcons();
});

function updateLiveDate() {
    const el = document.getElementById('live-date');
    if (el) el.textContent = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === tabId));

    const titles = {
        'dashboard':        ['Dashboard Overview',       'Real-time sales statistics and stock statuses'],
        'calculator':       ['Quotation Calculator',     'Select roofing sheets, add quantity/discounts, and make sales'],
        'stock-management': ['Stock Management',         'Log incoming stock, track purchase costs, and update inventory automatically'],
        'inventory':        ['Inventory Management',     'View and manage all products, prices and stock levels'],
        'sales':            ['Sales Transaction Logs',   'Full history of completed customer purchases, costs, and profits'],
    };
    if (titles[tabId]) {
        document.getElementById('current-tab-title').textContent    = titles[tabId][0];
        document.getElementById('current-tab-subtitle').textContent = titles[tabId][1];
    }

    if (tabId === 'dashboard')        renderDashboard();
    if (tabId === 'calculator')       { renderCatalog(); renderCart(); }
    if (tabId === 'stock-management') renderStockHistory();
    if (tabId === 'inventory')        renderInventory();
    if (tabId === 'sales')            renderSalesLogs();

    lucide.createIcons();
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function setupEventListeners() {

    // Catalog search
    document.getElementById('catalog-search').addEventListener('input', renderCatalog);

    // Extra discount
    document.getElementById('extra-discount-val').addEventListener('input', calculateCartTotals);
    document.getElementById('extra-discount-type').addEventListener('change', calculateCartTotals);

    // View tabs
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.addEventListener('click', e => {
            document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const v = e.currentTarget.getAttribute('data-view');
            document.getElementById('summary-customer-view').classList.toggle('active', v === 'customer');
            document.getElementById('summary-internal-view').classList.toggle('active', v === 'internal');
        });
    });

    // Cart actions
    document.getElementById('clear-cart-btn').addEventListener('click', () => {
        if (cart.length > 0) { cart = []; document.getElementById('extra-discount-val').value = 0; renderCart(); showToast('Cart cleared!', 'info'); }
    });
    document.getElementById('confirm-sale-btn').addEventListener('click', checkoutQuotation);
    document.getElementById('print-invoice-btn').addEventListener('click', triggerInvoicePrint);

    // Inventory search & filters
    document.getElementById('inventory-search').addEventListener('input', renderInventory);
    document.getElementById('inventory-filter-brand').addEventListener('change', renderInventory);
    document.getElementById('inventory-filter-size').addEventListener('change', renderInventory);

    // Product Modal
    const productModal = document.getElementById('product-modal');
    const productForm  = document.getElementById('product-form');
    const sizeSelect   = document.getElementById('product-size-val');
    const customGroup  = document.getElementById('product-custom-name-group');
    const nameInput    = document.getElementById('product-name-val');

    sizeSelect.addEventListener('change', () => {
        const isCustom = sizeSelect.value === 'custom';
        customGroup.style.display = isCustom ? 'block' : 'none';
        nameInput.required = isCustom;
    });

    document.getElementById('add-product-btn').addEventListener('click', () => {
        document.getElementById('modal-product-title').textContent = 'Add New Roofing Sheet';
        document.getElementById('product-id-val').value = '';
        productForm.reset();
        customGroup.style.display = 'none';
        nameInput.required = false;
        renderBrandControls();
        productModal.classList.add('active');
    });

    const closeProductModal = () => productModal.classList.remove('active');
    document.getElementById('close-product-modal').addEventListener('click', closeProductModal);
    document.getElementById('cancel-product-modal').addEventListener('click', closeProductModal);
    productForm.addEventListener('submit', e => { e.preventDefault(); saveProductFromForm(); closeProductModal(); });

    // Add Brand quick
    document.getElementById('add-brand-quick-btn').addEventListener('click', () => {
        const raw = prompt('Enter new brand name:');
        if (!raw || !raw.trim()) return;
        const clean = raw.trim();
        if (brands.some(b => b.toLowerCase() === clean.toLowerCase())) { showToast(`Brand "${clean}" already exists!`, 'warning'); return; }
        brands.push(clean);
        saveBrands();
        renderBrandControls();
        document.getElementById('product-brand-val').value = clean;
        showToast(`Brand "${clean}" added!`);
    });

    // CSV Downloads
    document.getElementById('download-inventory-csv-btn').addEventListener('click', downloadInventoryCSV);
    document.getElementById('download-sales-csv-btn').addEventListener('click', downloadSalesCSV);
    document.getElementById('download-stock-csv-btn').addEventListener('click', downloadStockCSV);

    // ── STOCK MANAGEMENT FORM ──────────────────────────────
    const seForm        = document.getElementById('stock-entry-form');
    const seStockNum    = document.getElementById('se-stock-number');
    const seTotalCost   = document.getElementById('se-total-cost');
    const addSeItemBtn  = document.getElementById('add-se-item-btn');

    if (addSeItemBtn) {
        addSeItemBtn.addEventListener('click', () => addSeItemRow());
    }

    if (seStockNum) {
        seStockNum.addEventListener('input', updateStockEntryPreview);
    }
    if (seTotalCost) {
        seTotalCost.addEventListener('input', updateStockEntryPreview);
    }

    seForm.addEventListener('submit', e => {
        e.preventDefault();
        saveStockEntry();
    });

    document.getElementById('stock-history-search').addEventListener('input', renderStockHistory);

    // Initial default row in stock management form
    const seItemsContainer = document.getElementById('se-items-container');
    if (seItemsContainer && seItemsContainer.children.length === 0) {
        addSeItemRow();
    }

    // Modal close and confirm pricing handlers
    document.getElementById('close-lot-modal').addEventListener('click', closeStockLotModal);
    document.getElementById('cancel-lot-btn').addEventListener('click', closeStockLotModal);
    document.getElementById('lot-prices-form').addEventListener('submit', confirmStockLotPrices);

    // Sales log controls
    document.getElementById('sales-search').addEventListener('input', renderSalesLogs);
    document.getElementById('sales-filter-date').addEventListener('change', renderSalesLogs);
    document.getElementById('clear-date-filter').addEventListener('click', () => { document.getElementById('sales-filter-date').value = ''; renderSalesLogs(); });
    document.getElementById('reset-sales-btn').addEventListener('click', () => {
        if (confirm('Clear ALL sales logs permanently?')) { salesLogs = []; saveSales(); renderSalesLogs(); showToast('All logs deleted!', 'danger'); }
    });

    // Backup/Restore
    document.getElementById('export-db-btn').addEventListener('click', exportDatabase);
    document.getElementById('import-db-btn').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', importDatabase);

    // Dashboard chart filters
    document.querySelectorAll('.chart-filter-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            document.querySelectorAll('.chart-filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            updateDashboardCharts(e.currentTarget.getAttribute('data-period'));
        });
    });
}

// ============================================================
// STOCK ENTRY FORM PREVIEW
// ============================================================
// ============================================================
// DYNAMIC ROW MANAGEMENT FOR STOCK LOT
// ============================================================
function addSeItemRow(brand='', size='', customName='', qty='', weight='') {
    const container = document.getElementById('se-items-container');
    if (!container) return;
    
    const rowId = 'se_row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const row = document.createElement('div');
    row.className = 'se-item-row';
    row.id = rowId;
    row.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 10px; background: var(--bg-body);';
    
    // Brand options
    const brandOpts = brands.map(b => `<option value="${b}" ${b===brand?'selected':''}>${b}</option>`).join('') + `<option value="Other" ${brand==='Other'?'selected':''}>Other</option>`;
    
    row.innerHTML = `
        <div class="form-group" style="flex: 1; min-width: 120px; margin-bottom: 0;">
            <label style="font-size: 11px; margin-bottom: 4px;">Brand *</label>
            <select class="se-item-brand" required style="height: 38px; font-size: 13px;">
                <option value="" disabled ${!brand?'selected':''}>-- Brand --</option>
                ${brandOpts}
            </select>
        </div>
        <div class="form-group" style="flex: 1; min-width: 110px; margin-bottom: 0;">
            <label style="font-size: 11px; margin-bottom: 4px;">Size *</label>
            <select class="se-item-size" required style="height: 38px; font-size: 13px;">
                <option value="" disabled ${!size?'selected':''}>-- Size --</option>
                <option value="6ft" ${size==='6ft'?'selected':''}>6 ft</option>
                <option value="8ft" ${size==='8ft'?'selected':''}>8 ft</option>
                <option value="10ft" ${size==='10ft'?'selected':''}>10 ft</option>
                <option value="12ft" ${size==='12ft'?'selected':''}>12 ft</option>
                <option value="4x4" ${size==='4x4'?'selected':''}>4 × 4 ft</option>
                <option value="custom" ${size==='custom'?'selected':''}>Custom / Other</option>
            </select>
        </div>
        <div class="form-group se-item-custom-group" style="display: ${size==='custom'?'block':'none'}; flex: 1.5; min-width: 140px; margin-bottom: 0;">
            <label style="font-size: 11px; margin-bottom: 4px;">Custom Name *</label>
            <input type="text" class="se-item-custom-name" value="${customName}" placeholder="e.g. Ridge Cap, 14ft..." style="height: 38px; font-size: 13px;">
        </div>
        <div class="form-group" style="width: 70px; margin-bottom: 0;">
            <label style="font-size: 11px; margin-bottom: 4px;">Qty *</label>
            <input type="number" class="se-item-qty" value="${qty}" required min="1" placeholder="Qty" style="height: 38px; font-size: 13px;">
        </div>
        <div class="form-group" style="width: 70px; margin-bottom: 0;">
            <label style="font-size: 11px; margin-bottom: 4px;">Weight (T)</label>
            <input type="number" class="se-item-weight" value="${weight}" min="0" step="0.001" placeholder="Ton" style="height: 38px; font-size: 13px;">
        </div>
        <button type="button" class="btn-remove-row" style="height: 38px; padding: 0 10px; border-radius: var(--radius-md); border: 1px solid var(--border); background: transparent; color: var(--danger); cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Remove Row">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>
    `;
    
    container.appendChild(row);
    lucide.createIcons();
    
    // Event listeners
    const sizeSelect = row.querySelector('.se-item-size');
    const customGroup = row.querySelector('.se-item-custom-group');
    const customInput = row.querySelector('.se-item-custom-name');
    
    sizeSelect.addEventListener('change', () => {
        const isCustom = sizeSelect.value === 'custom';
        customGroup.style.display = isCustom ? 'block' : 'none';
        customInput.required = isCustom;
        updateStockEntryPreview();
    });
    
    row.querySelector('.se-item-brand').addEventListener('change', updateStockEntryPreview);
    row.querySelector('.se-item-qty').addEventListener('input', updateStockEntryPreview);
    row.querySelector('.se-item-weight').addEventListener('input', updateStockEntryPreview);
    if (customInput) customInput.addEventListener('input', updateStockEntryPreview);
    
    row.querySelector('.btn-remove-row').addEventListener('click', () => {
        if (container.querySelectorAll('.se-item-row').length > 1) {
            row.remove();
            updateStockEntryPreview();
        } else {
            showToast('At least one item row is required!', 'warning');
        }
    });
    
    updateStockEntryPreview();
}

function updateStockEntryPreview() {
    const container = document.getElementById('se-items-container');
    const stockNum = document.getElementById('se-stock-number').value.trim() || '—';
    const totalCost = parseFloat(document.getElementById('se-total-cost').value) || 0;
    
    let totalQty = 0;
    let totalItems = 0;
    
    if (container) {
        const rows = container.querySelectorAll('.se-item-row');
        totalItems = rows.length;
        rows.forEach(row => {
            const qty = parseInt(row.querySelector('.se-item-qty').value) || 0;
            totalQty += qty;
        });
    }
    
    document.getElementById('se-prev-items').textContent = `${totalItems} size${totalItems===1?'':'s'}`;
    document.getElementById('se-prev-qty').textContent = `${totalQty} sheet${totalQty===1?'':'s'}`;
    document.getElementById('se-prev-stock-num').textContent = stockNum;
    document.getElementById('se-prev-total').textContent = `LKR ${fmt(totalCost)}`;
}

// ============================================================
// SAVE STOCK ENTRY → log pending stock lot
// ============================================================
function saveStockEntry() {
    const stockNumber = document.getElementById('se-stock-number').value.trim();
    const totalCost   = parseFloat(document.getElementById('se-total-cost').value) || 0;
    const note        = document.getElementById('se-note').value.trim();
    const container   = document.getElementById('se-items-container');
    
    if (!stockNumber) { showToast('Please enter a Stock / Lot Number!', 'warning'); return; }
    if (totalCost <= 0) { showToast('Please enter a valid total cost paid!', 'warning'); return; }
    if (!container) return;
    
    const rows = container.querySelectorAll('.se-item-row');
    if (rows.length === 0) { showToast('Please add at least one item row!', 'warning'); return; }
    
    const items = [];
    let isValid = true;
    
    rows.forEach((row, index) => {
        const brand = row.querySelector('.se-item-brand').value;
        const sizeVal = row.querySelector('.se-item-size').value;
        const customName = row.querySelector('.se-item-custom-name').value.trim();
        const qty = parseInt(row.querySelector('.se-item-qty').value) || 0;
        const weight = parseFloat(row.querySelector('.se-item-weight').value) || 0;
        
        if (!brand) { showToast(`Please select a brand for row ${index+1}!`, 'warning'); isValid = false; return; }
        if (!sizeVal) { showToast(`Please select a size for row ${index+1}!`, 'warning'); isValid = false; return; }
        if (sizeVal === 'custom' && !customName) { showToast(`Please enter custom name for row ${index+1}!`, 'warning'); isValid = false; return; }
        if (qty <= 0) { showToast(`Quantity must be greater than 0 for row ${index+1}!`, 'warning'); isValid = false; return; }
        
        const finalSize = sizeVal === 'custom' ? customName : sizeVal;
        const displayLabel = sizeVal === 'custom' ? customName : sizeLabel(sizeVal);
        
        items.push({
            id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            brand,
            size: finalSize,
            sizeLabel: displayLabel,
            qty,
            weight,
            buyingPrice: 0,
            sellingPrice: 0
        });
    });
    
    if (!isValid) return;
    
    // Check if editing an existing lot
    const seForm = document.getElementById('stock-entry-form');
    const editLotId = seForm.getAttribute('data-edit-lot-id');

    if (editLotId) {
        // Replace existing lot
        const existingIdx = stockLogs.findIndex(l => l.id === editLotId);
        if (existingIdx !== -1) {
            stockLogs[existingIdx] = {
                ...stockLogs[existingIdx],
                stockNumber,
                totalCost,
                note,
                items
            };
        }
        seForm.removeAttribute('data-edit-lot-id');
        showToast(`Stock lot "${stockNumber}" updated!`, 'success');
    } else {
        // Log the purchase as PENDING.
        stockLogs.unshift({
            id: 'SL-' + Date.now(),
            timestamp: new Date().toISOString(),
            stockNumber,
            totalCost,
            note,
            status: 'pending',
            items
        });
        showToast(`Stock lot logged! Lot ${stockNumber} is saved as PENDING. Click it in history to set buying/selling prices and update inventory.`, 'success');
    }

    saveStockLogs();
    
    // Reset form
    seForm.reset();
    container.innerHTML = '';
    addSeItemRow(); // Add one default row
    
    document.getElementById('se-total-cost').value = '';
    document.getElementById('se-prev-items').textContent = '0 types';
    document.getElementById('se-prev-qty').textContent = '0 sheets';
    document.getElementById('se-prev-stock-num').textContent = '—';
    document.getElementById('se-prev-total').textContent = 'LKR 0.00';
    
    renderStockHistory(); // Renders the lot card list
    renderDashboard();
}

// ============================================================
// STOCK LOT CARD HISTORY RENDER
// ============================================================
function renderStockHistory() {
    const search = document.getElementById('stock-history-search').value.toLowerCase();
    const grid = document.getElementById('stock-lots-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const filtered = stockLogs.filter(l =>
        (l.stockNumber || '').toLowerCase().includes(search) ||
        (l.note || '').toLowerCase().includes(search) ||
        l.items.some(item => 
            item.brand.toLowerCase().includes(search) ||
            item.sizeLabel.toLowerCase().includes(search)
        )
    );
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-cart-placeholder" style="grid-column: 1/-1;"><i data-lucide="clock-loader-4"></i><p>No stock entries found.</p></div>`;
        lucide.createIcons();
        return;
    }
    
    filtered.forEach(l => {
        const d = new Date(l.timestamp);
        const ds = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
        
        let totalSheets = 0;
        const brandSet = new Set();
        l.items.forEach(i => {
            totalSheets += i.qty;
            brandSet.add(i.brand);
        });
        const brandsStr = Array.from(brandSet).join(', ');
        
        const card = document.createElement('div');
        card.className = 'stock-lot-card';
        
        const statusBadge = l.status === 'pending' 
            ? `<span class="stock-lot-badge pending"><i data-lucide="clock" style="width:10px;height:10px;vertical-align:middle;margin-right:2px;"></i>Pending Prices</span>` 
            : `<span class="stock-lot-badge completed"><i data-lucide="check-circle-2" style="width:10px;height:10px;vertical-align:middle;margin-right:2px;"></i>Completed</span>`;
            
        card.innerHTML = `
            <div class="stock-lot-card-header">
                <span class="stock-lot-card-title">${l.stockNumber}</span>
                ${statusBadge}
            </div>
            <div class="stock-lot-card-body">
                <div><span class="text-muted">Brands:</span> <strong>${brandsStr || '—'}</strong></div>
                <div><span class="text-muted">Total Qty:</span> <strong>${totalSheets} sheets</strong></div>
                <div><span class="text-muted">Total Cost Paid:</span> <strong class="text-navy">LKR ${fmt(l.totalCost)}</strong></div>
                ${l.note ? `<div style="font-style: italic; font-size:11px; margin-top: 4px; border-left:2px solid var(--border); padding-left: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">"${l.note}"</div>` : ''}
            </div>
            <div class="stock-lot-card-footer">
                <span>Logged on: ${ds}</span>
                <div style="display:flex;gap:6px;align-items:center;">
                    <button class="lot-edit-btn" data-id="${l.id}" style="padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--primary);font-size:11px;display:flex;align-items:center;gap:3px;" title="Edit Lot">
                        <i data-lucide="edit-3" style="width:11px;height:11px;"></i> Edit
                    </button>
                    <button class="lot-delete-btn" data-id="${l.id}" style="padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--danger);font-size:11px;display:flex;align-items:center;gap:3px;" title="Delete Lot">
                        <i data-lucide="trash-2" style="width:11px;height:11px;"></i> Delete
                    </button>
                    <span style="color: var(--primary); font-weight:700; font-size:11px; display:flex; align-items:center; gap:2px; cursor:pointer;" class="lot-view-link">
                        ${l.status === 'pending' ? 'Enter Prices' : 'View Details'} <i data-lucide="chevron-right" style="width:12px;height:12px;"></i>
                    </span>
                </div>
            </div>
        `;
        
        card.querySelector('.lot-view-link').addEventListener('click', (e) => { e.stopPropagation(); openStockLotDetailsModal(l.id); });
        card.querySelector('.lot-edit-btn').addEventListener('click', (e) => { e.stopPropagation(); openEditStockLotModal(l.id); });
        card.querySelector('.lot-delete-btn').addEventListener('click', (e) => { e.stopPropagation(); deleteStockLot(l.id); });
        grid.appendChild(card);
    });
    
    lucide.createIcons();
}

// ============================================================
// STOCK LOT EDIT
// ============================================================
function openEditStockLotModal(lotId) {
    const lot = stockLogs.find(l => l.id === lotId);
    if (!lot) return;

    if (lot.status === 'completed') {
        // Completed lots: open normal view-only details modal
        openStockLotDetailsModal(lotId);
        showToast('Completed lots can be viewed but not edited. Delete and re-enter to change.', 'info');
        return;
    }

    // Populate the stock entry form with existing lot data
    document.getElementById('se-stock-number').value = lot.stockNumber || '';
    document.getElementById('se-total-cost').value   = lot.totalCost || '';
    document.getElementById('se-note').value          = lot.note || '';

    const container = document.getElementById('se-items-container');
    container.innerHTML = '';
    lot.items.forEach(item => {
        const isCustom = !SHEET_SIZES.find(s => s.value === item.size);
        addSeItemRow(
            item.brand,
            isCustom ? 'custom' : item.size,
            isCustom ? (item.sizeLabel || item.size) : '',
            item.qty,
            item.weight || ''
        );
    });
    updateStockEntryPreview();

    // Store the editing lot id so save can replace it
    document.getElementById('stock-entry-form').setAttribute('data-edit-lot-id', lotId);

    // Switch to stock management tab and scroll to form
    switchTab('stock-management');
    document.querySelector('.stock-form-card').scrollIntoView({ behavior: 'smooth' });
    showToast(`Editing lot "${lot.stockNumber}" — make changes and click "Log Stock Lot" to save.`, 'info');
}

// ============================================================
// STOCK LOT DELETE
// ============================================================
function deleteStockLot(lotId) {
    const lot = stockLogs.find(l => l.id === lotId);
    if (!lot) return;

    let msg = `Delete stock lot "${lot.stockNumber}"?`;
    if (lot.status === 'completed') {
        msg += '\n\nWARNING: This lot is already Completed. Stock inventory will be ROLLED BACK (quantities deducted). Are you sure?';
    }

    if (!confirm(msg)) return;

    if (lot.status === 'completed') {
        // Rollback inventory
        lot.items.forEach(item => {
            const prod = products.find(p => p.brand === item.brand && p.size === item.size);
            if (prod) {
                prod.stock = Math.max(0, prod.stock - item.qty);
            }
        });
        saveProducts();
    }

    stockLogs = stockLogs.filter(l => l.id !== lotId);
    saveStockLogs();
    renderStockHistory();
    renderInventory();
    renderDashboard();
    showToast(`Lot "${lot.stockNumber}" deleted!`, 'warning');
}

function downloadStockCSV() {
    if (stockLogs.length === 0) { showToast('No stock logs to export!', 'warning'); return; }
    let csv = '\uFEFFDate,Stock Number,Status,Brand,Size,Qty Added,Buying Price (LKR),Selling Price (LKR),Total Cost Paid (LKR),Weight (Tons),Note\r\n';
    stockLogs.forEach(l => {
        const d = new Date(l.timestamp);
        const dateStr = `${d.toLocaleDateString('en-US')} ${d.toLocaleTimeString('en-US')}`;
        l.items.forEach(item => {
            csv += `"${dateStr}","${l.stockNumber||'—'}","${l.status}","${item.brand}","${item.sizeLabel}",${item.qty},${item.buyingPrice||0},${item.sellingPrice||0},${l.totalCost},${item.weight||0},"${(l.note||'').replace(/"/g,'""')}"\r\n`;
        });
    });
    downloadBlob(csv, `perera_stock_log_${todayStr()}.csv`, 'text/csv');
    showToast('Stock log CSV downloaded!');
}

// ============================================================
// MODAL: STOCK LOT PRICING & CONFIRMATION
// ============================================================
function openStockLotDetailsModal(lotId) {
    const lot = stockLogs.find(l => l.id === lotId);
    if (!lot) return;
    
    document.getElementById('modal-lot-id').value = lot.id;
    document.getElementById('modal-lot-number').textContent = lot.stockNumber;
    
    const d = new Date(lot.timestamp);
    document.getElementById('modal-lot-date').textContent = d.toLocaleString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
    document.getElementById('modal-lot-cost').textContent = `LKR ${fmt(lot.totalCost)}`;
    document.getElementById('modal-lot-note').textContent = lot.note || '—';
    
    const badge = document.getElementById('modal-lot-status-badge');
    badge.className = `stock-lot-badge ${lot.status}`;
    badge.textContent = lot.status === 'pending' ? 'Pending Prices' : 'Completed';
    
    const container = document.getElementById('modal-lot-items-container');
    container.innerHTML = '';
    
    lot.items.forEach((item, idx) => {
        const itemRow = document.createElement('div');
        itemRow.style.cssText = 'padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-card); display: flex; flex-direction: column; gap: 8px;';
        
        const isPending = lot.status === 'pending';
        let inputsHtml = '';
        
        if (isPending) {
            inputsHtml = `
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px;">
                    <div class="form-group" style="flex: 1; min-width: 140px; margin-bottom: 0;">
                        <label style="font-size: 11px; margin-bottom: 4px; display: block; font-weight:600;">Buying Price per Sheet *</label>
                        <div class="price-input-wrapper">
                            <span class="currency-label" style="padding: 4px 8px; font-size:12px;">LKR</span>
                            <input type="number" class="item-modal-buy-price" required min="0" step="0.01" value="${item.buyingPrice || ''}" placeholder="0.00" style="height: 34px; font-size: 13px; padding-left: 45px; width: 100%; border: 1px solid var(--border); border-radius: var(--radius-md);">
                        </div>
                    </div>
                    <div class="form-group" style="flex: 1; min-width: 140px; margin-bottom: 0;">
                        <label style="font-size: 11px; margin-bottom: 4px; display: block; font-weight:600;">Selling Price per Sheet *</label>
                        <div class="price-input-wrapper">
                            <span class="currency-label" style="padding: 4px 8px; font-size:12px;">LKR</span>
                            <input type="number" class="item-modal-sell-price" required min="0" step="0.01" value="${item.sellingPrice || ''}" placeholder="0.00" style="height: 34px; font-size: 13px; padding-left: 45px; width: 100%; border: 1px solid var(--border); border-radius: var(--radius-md);">
                        </div>
                    </div>
                </div>
            `;
        } else {
            inputsHtml = `
                <div style="display: flex; gap: 20px; margin-top: 4px; font-size: 12px; color: var(--text-secondary); background: var(--bg-body); padding: 8px 12px; border-radius: var(--radius-md);">
                    <div><span>Buying Price:</span> <strong style="color: var(--primary);">LKR ${fmt(item.buyingPrice)}</strong></div>
                    <div><span>Selling Price:</span> <strong style="color: var(--primary);">LKR ${fmt(item.sellingPrice)}</strong></div>
                    <div><span>Markup:</span> <strong style="color: var(--success);">${(item.buyingPrice > 0 ? (item.sellingPrice - item.buyingPrice)/item.buyingPrice * 100 : 0).toFixed(1)}%</strong></div>
                </div>
            `;
        }
        
        itemRow.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border); padding-bottom: 6px;">
                <span style="font-weight: 700; font-size: 13.5px; color: var(--primary);">${item.brand} ${item.sizeLabel}</span>
                <span style="font-size: 12px; color: var(--text-secondary);">Qty: <strong>${item.qty} sheets</strong> ${item.weight ? `&bull; Weight: <strong>${item.weight} T</strong>` : ''}</span>
            </div>
            ${inputsHtml}
        `;
        container.appendChild(itemRow);
    });
    
    const footer = document.getElementById('modal-lot-footer');
    if (lot.status === 'pending') {
        footer.innerHTML = `
            <button type="button" class="btn-secondary" id="close-lot-btn-2">Close</button>
            <button type="submit" class="btn-primary" id="confirm-lot-prices-btn"><i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Confirm Prices & Update Inventory</button>
        `;
        document.getElementById('close-lot-btn-2').addEventListener('click', closeStockLotModal);
    } else {
        footer.innerHTML = `
            <button type="button" class="btn-secondary" id="close-lot-btn-2" style="width: 100%;">Close</button>
        `;
        document.getElementById('close-lot-btn-2').addEventListener('click', closeStockLotModal);
    }
    
    lucide.createIcons();
    document.getElementById('stock-lot-modal').classList.add('active');
}

function closeStockLotModal() {
    document.getElementById('stock-lot-modal').classList.remove('active');
}

function confirmStockLotPrices(e) {
    e.preventDefault();
    const lotId = document.getElementById('modal-lot-id').value;
    const lot = stockLogs.find(l => l.id === lotId);
    if (!lot || lot.status !== 'pending') return;
    
    const container = document.getElementById('modal-lot-items-container');
    const rows = container.children;
    
    let isValid = true;
    const updatedPrices = [];
    
    for (let idx = 0; idx < lot.items.length; idx++) {
        const row = rows[idx];
        const buyInput = row.querySelector('.item-modal-buy-price');
        const sellInput = row.querySelector('.item-modal-sell-price');
        
        const buyingPrice = parseFloat(buyInput.value) || 0;
        const sellingPrice = parseFloat(sellInput.value) || 0;
        
        if (buyingPrice <= 0) { showToast(`Please enter a valid buying price for row ${idx+1}!`, 'warning'); isValid = false; break; }
        if (sellingPrice <= 0) { showToast(`Please enter a valid selling price for row ${idx+1}!`, 'warning'); isValid = false; break; }
        
        updatedPrices.push({ index: idx, buyingPrice, sellingPrice });
    }
    
    if (!isValid) return;
    
    updatedPrices.forEach(up => {
        const item = lot.items[up.index];
        item.buyingPrice = up.buyingPrice;
        item.sellingPrice = up.sellingPrice;
        
        let prod = products.find(p => p.brand === item.brand && p.size === item.size);
        if (prod) {
            prod.stock += item.qty;
            prod.buyingPrice = item.buyingPrice;
            prod.sellingPrice = item.sellingPrice;
        } else {
            prod = {
                id:           'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                name:         item.sizeLabel + ' Roofing Sheet',
                size:         item.size,
                brand:        item.brand,
                buyingPrice:  item.buyingPrice,
                sellingPrice: item.sellingPrice,
                stock:        item.qty,
                alertLevel:   10,
            };
            products.push(prod);
        }
    });
    
    lot.status = 'completed';
    
    saveProducts();
    saveStockLogs();
    
    closeStockLotModal();
    
    renderStockHistory();
    renderInventory();
    renderCatalog();
    renderDashboard();
    
    showToast(`Stock lot ${lot.stockNumber} prices confirmed and inventory successfully updated!`, 'success');
}

// ============================================================
// CATALOG (CALCULATOR TAB)
// ============================================================
function renderCatalog() {
    const search      = document.getElementById('catalog-search').value.toLowerCase();
    const activeTab   = document.getElementById('catalog-brand-tabs')?.querySelector('.brand-tab.active');
    const activeBrand = activeTab ? activeTab.getAttribute('data-brand').toLowerCase() : 'all';
    const container   = document.getElementById('catalog-container');
    container.innerHTML = '';

    const filtered = products.filter(p => {
        const name = productFullName(p).toLowerCase();
        const matchSearch = name.includes(search) || p.brand.toLowerCase().includes(search) || (p.name||'').toLowerCase().includes(search);
        const matchBrand  = activeBrand === 'all' ? true
            : activeBrand === 'other' ? !brands.some(b => b.toLowerCase() === p.brand.toLowerCase())
            : p.brand.toLowerCase() === activeBrand;
        return matchSearch && matchBrand;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-cart-placeholder" style="grid-column:1/-1"><i data-lucide="package-search"></i><p>${products.length === 0 ? 'No products yet — add stock from Stock Management tab!' : 'No matches.'}</p></div>`;
        lucide.createIcons(); return;
    }

    filtered.forEach(p => {
        const oos      = p.stock <= 0;
        const lowStock = p.stock > 0 && p.stock <= p.alertLevel;
        let badgeTxt = 'In Stock', badgeCls = 'in-stock';
        if (oos)      { badgeTxt = 'Out of Stock'; badgeCls = 'out-stock'; }
        else if (lowStock) { badgeTxt = `Low: ${p.stock}`; badgeCls = 'low-stock'; }

        const brandCls = p.brand.toLowerCase() === 'sigiri' ? 'sigiri' : p.brand.toLowerCase() === 'rhino' ? 'rhino' : 'other';
        const displayName = p.size ? sizeLabel(p.size) : (p.name || '—');

        const card = document.createElement('div');
        card.className = `product-card${oos ? ' out-of-stock-card' : ''}`;
        card.innerHTML = `
            <span class="card-brand-badge ${brandCls}">${p.brand}</span>
            <h4>${displayName}</h4>
            <div class="price-box">
                <div class="price-row-item text-muted">
                    <span>Buying cost:</span>
                    <span class="val">LKR ${fmt(p.buyingPrice)}</span>
                </div>
                <div class="price-row-item">
                    <span>Selling price:</span>
                    <span class="val text-navy">LKR ${fmt(p.sellingPrice)}</span>
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

// ============================================================
// CART
// ============================================================
function addToCart(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const existing = cart.find(c => c.productId === productId);
    if (existing) {
        if (existing.qty < prod.stock) { existing.qty++; }
        else { showToast(`Only ${prod.stock} in stock!`, 'warning'); return; }
    } else {
        cart.push({ productId, name: productFullName(prod), brand: prod.brand, buyingPrice: prod.buyingPrice, sellingPrice: prod.sellingPrice, qty: 1, itemDiscount: 0, itemDiscountType: 'flat' });
    }
    renderCart();
}

function removeFromCart(productId) { cart = cart.filter(c => c.productId !== productId); renderCart(); }

// Helper: compute discount amount for one cart item
function computeItemDiscount(item) {
    const line = item.sellingPrice * item.qty;
    if (item.itemDiscountType === 'flat')       return item.itemDiscount;                         // flat LKR off total line
    if (item.itemDiscountType === 'percent')    return line * (item.itemDiscount / 100);          // % of line total
    if (item.itemDiscountType === 'per-sheet')  return item.itemDiscount * item.qty;              // LKR per sheet
    return 0;
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const printBtn  = document.getElementById('print-invoice-btn');
    const saleBtn   = document.getElementById('confirm-sale-btn');
    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = `<div class="empty-cart-placeholder"><i data-lucide="shopping-bag"></i><p>Select roofing sheets from the catalog</p></div>`;
        lucide.createIcons();
        if (printBtn) printBtn.disabled = true;
        if (saleBtn)  saleBtn.disabled  = true;
        calculateCartTotals();
        return;
    }

    if (printBtn) printBtn.disabled = false;
    if (saleBtn)  saleBtn.disabled  = false;

    cart.forEach((item, idx) => {
        const discAmt = computeItemDiscount(item);
        const lineTotal = Math.max(0, item.sellingPrice * item.qty - discAmt);
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <div class="cart-item-details">
                <strong>${item.name}</strong>
                <small class="text-muted">${item.brand} &bull; LKR ${fmt(item.sellingPrice)}/sheet &bull; <span class="cart-item-linetotal">Line: LKR ${fmt(lineTotal)}</span></small>
            </div>
            <div class="cart-item-controls">
                <div class="qty-control">
                    <button type="button" class="qty-btn qty-minus" data-idx="${idx}">−</button>
                    <input type="number" class="qty-input" value="${item.qty}" min="1" data-idx="${idx}" style="width:52px;text-align:center;border:1px solid var(--border);border-radius:4px;padding:4px;">
                    <button type="button" class="qty-btn qty-plus" data-idx="${idx}">+</button>
                </div>
                <div class="item-discount-control" style="display:flex;gap:4px;align-items:center;">
                    <input type="number" class="item-disc-val" value="${item.itemDiscount}" min="0" placeholder="Disc" data-idx="${idx}" style="width:60px;border:1px solid var(--border);border-radius:4px;padding:4px;font-size:12px;">
                    <select class="item-disc-type" data-idx="${idx}" style="border:1px solid var(--border);border-radius:4px;padding:4px;font-size:12px;font-family:inherit;">
                        <option value="flat"      ${item.itemDiscountType==='flat'     ?'selected':''}>LKR</option>
                        <option value="percent"   ${item.itemDiscountType==='percent'  ?'selected':''}>%</option>
                        <option value="per-sheet" ${item.itemDiscountType==='per-sheet'?'selected':''}>LKR/Sheet</option>
                    </select>
                </div>
                <button type="button" class="remove-cart-item" data-idx="${idx}" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:transparent;cursor:pointer;color:var(--danger);" title="Remove">
                    <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                </button>
            </div>`;
        container.appendChild(row);
    });

    lucide.createIcons();

    container.querySelectorAll('.qty-minus').forEach(b => b.addEventListener('click', () => { const i=parseInt(b.getAttribute('data-idx')); if(cart[i].qty>1){cart[i].qty--;renderCart();} }));
    container.querySelectorAll('.qty-plus').forEach(b => b.addEventListener('click', () => {
        const i=parseInt(b.getAttribute('data-idx'));
        const prod=products.find(p=>p.id===cart[i].productId);
        if(prod&&cart[i].qty<prod.stock){cart[i].qty++;renderCart();}
        else showToast('Not enough stock!','warning');
    }));
    container.querySelectorAll('.qty-input').forEach(inp => inp.addEventListener('change', () => {
        const i=parseInt(inp.getAttribute('data-idx'));
        const prod=products.find(p=>p.id===cart[i].productId);
        let v=parseInt(inp.value)||1; if(v<1)v=1;
        if(prod&&v>prod.stock){v=prod.stock;showToast('Not enough stock!','warning');}
        cart[i].qty=v; renderCart();
    }));
    container.querySelectorAll('.item-disc-val').forEach(inp => inp.addEventListener('input', () => { const i=parseInt(inp.getAttribute('data-idx')); cart[i].itemDiscount=parseFloat(inp.value)||0; calculateCartTotals(); }));
    container.querySelectorAll('.item-disc-type').forEach(sel => sel.addEventListener('change', () => { const i=parseInt(sel.getAttribute('data-idx')); cart[i].itemDiscountType=sel.value; calculateCartTotals(); }));
    container.querySelectorAll('.remove-cart-item').forEach(b => b.addEventListener('click', () => { removeFromCart(cart[parseInt(b.getAttribute('data-idx'))].productId); }));

    calculateCartTotals();
}

function calculateCartTotals() {
    let subtotal=0, totalCost=0, itemDiscTotal=0;
    cart.forEach(item => {
        const line=item.sellingPrice*item.qty;
        const cost=item.buyingPrice*item.qty;
        const disc=computeItemDiscount(item);
        subtotal+=line; totalCost+=cost; itemDiscTotal+=disc;
    });
    const extVal=parseFloat(document.getElementById('extra-discount-val').value)||0;
    const extType=document.getElementById('extra-discount-type').value;
    const extDisc=extType==='flat'?extVal:subtotal*(extVal/100);
    const totalDiscount=itemDiscTotal+extDisc;
    const grandTotal=Math.max(0,subtotal-totalDiscount);
    const netProfit=grandTotal-totalCost;
    const margin=grandTotal>0?(netProfit/grandTotal)*100:0;

    // Customer view
    const custSub  = document.getElementById('cust-subtotal');
    const custTotal = document.getElementById('cust-grand-total');
    if (custSub)   custSub.textContent   = `LKR ${fmt(subtotal)}`;
    if (custTotal) custTotal.textContent = `LKR ${fmt(grandTotal)}`;

    // Per-item breakdown (customer view)
    let breakdownEl = document.getElementById('cart-items-breakdown');
    if (!breakdownEl) {
        breakdownEl = document.createElement('div');
        breakdownEl.id = 'cart-items-breakdown';
        breakdownEl.style.cssText = 'margin-bottom:6px;';
        const custView = document.getElementById('summary-customer-view');
        const subLine = custView ? custView.querySelector('.summary-line') : null;
        if (subLine) custView.insertBefore(breakdownEl, subLine);
    }
    if (cart.length > 1) {
        breakdownEl.innerHTML = `<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;">Per Sheet Breakdown</div>` +
            cart.map(item => {
                const disc = computeItemDiscount(item);
                const lineNet = Math.max(0, item.sellingPrice * item.qty - disc);
                return `<div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0;border-bottom:1px dashed var(--border);">
                    <span style="color:var(--text-secondary);">${item.name} × ${item.qty}</span>
                    <span style="font-weight:600;">LKR ${fmt(lineNet)}${disc>0?` <span style="color:var(--danger);font-size:10px;">(-${fmt(disc)})</span>`:''}</span>
                </div>`;
            }).join('');
        breakdownEl.style.display = 'block';
    } else {
        breakdownEl.style.display = 'none';
    }

    // Internal view
    const intCost   = document.getElementById('int-total-cost');
    const intSub    = document.getElementById('int-subtotal');
    const intDisc   = document.getElementById('int-discount');
    const intProfit = document.getElementById('int-net-profit');
    const intMargin = document.getElementById('int-profit-margin');
    if (intCost)   intCost.textContent   = `LKR ${fmt(totalCost)}`;
    if (intSub)    intSub.textContent    = `LKR ${fmt(subtotal)}`;
    if (intDisc)   intDisc.textContent   = `- LKR ${fmt(totalDiscount)}`;
    if (intProfit) { intProfit.textContent = `LKR ${fmt(netProfit)}`; intProfit.style.color = netProfit >= 0 ? 'var(--success)' : 'var(--secondary)'; }
    if (intMargin) intMargin.textContent = `${margin.toFixed(1)}%`;

    return { subtotal, totalCost, totalDiscount, grandTotal, netProfit, profitMargin: margin };
}

function checkoutQuotation() {
    if (cart.length === 0) { showToast('Cart is empty!', 'warning'); return; }
    const totals = calculateCartTotals();
    for (const item of cart) {
        const prod = products.find(p => p.id === item.productId);
        if (!prod || prod.stock < item.qty) { showToast(`Insufficient stock for ${item.name}!`, 'danger'); return; }
    }
    const saleItems = cart.map(item => {
        const prod = products.find(p => p.id === item.productId);
        prod.stock -= item.qty;
        const line=item.sellingPrice*item.qty;
        const disc=computeItemDiscount(item);
        return { productId:item.productId, name:item.name, brand:item.brand, buyingPrice:item.buyingPrice, sellingPrice:item.sellingPrice, qty:item.qty, itemDiscount:disc, finalPrice:line-disc };
    });
    saveProducts();
    const saleId = 'INV-' + Date.now().toString().slice(-6);
    salesLogs.unshift({ id:saleId, timestamp:new Date().toISOString(), items:saleItems, totals });
    saveSales();
    populateInvoiceForPrint({ id:saleId, timestamp:new Date().toISOString(), items:saleItems, totals });
    cart = [];
    document.getElementById('extra-discount-val').value = 0;
    renderCart(); renderCatalog(); renderDashboard();
    showToast(`Sale ${saleId} completed!`, 'success');
    setTimeout(() => window.print(), 400);
}

function triggerInvoicePrint() {
    if (cart.length === 0) { showToast('Cart is empty!', 'warning'); return; }
    const totals = calculateCartTotals();
    const items = cart.map(item => {
        const line=item.sellingPrice*item.qty;
        const disc=computeItemDiscount(item);
        return { name:item.name, brand:item.brand, sellingPrice:item.sellingPrice, qty:item.qty, itemDiscount:disc, finalPrice:line-disc };
    });
    populateInvoiceForPrint({ id:'QUOTE-'+Date.now().toString().slice(-6), timestamp:new Date().toISOString(), items, totals });
    window.print();
}

function populateInvoiceForPrint(log) {
    const d = new Date(log.timestamp);
    document.getElementById('print-inv-id').textContent   = log.id;
    document.getElementById('print-inv-date').textContent = d.toLocaleString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
    const rows = document.getElementById('print-invoice-rows');
    rows.innerHTML = '';
    log.items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.name}</td><td>${item.brand}</td><td class="text-right">LKR ${fmt(item.sellingPrice)}</td><td class="text-right">${item.qty}</td><td class="text-right">${item.itemDiscount>0?'LKR '+fmt(item.itemDiscount):'-'}</td><td class="text-right">LKR ${fmt(item.finalPrice)}</td>`;
        rows.appendChild(tr);
    });
    document.getElementById('print-subtotal').textContent = `LKR ${fmt(log.totals.subtotal)}`;
    const dr = document.getElementById('print-discount-row');
    if (log.totals.totalDiscount > 0) { dr.style.display='table-row'; document.getElementById('print-discount').textContent=`- LKR ${fmt(log.totals.totalDiscount)}`; }
    else dr.style.display = 'none';
    document.getElementById('print-total').innerHTML = `<strong>LKR ${fmt(log.totals.grandTotal)}</strong>`;
}

// ============================================================
// INVENTORY CARD GRID
// ============================================================
function renderInventory() {
    const search    = document.getElementById('inventory-search').value.toLowerCase();
    const brandVal  = document.getElementById('inventory-filter-brand').value;
    const sizeVal   = document.getElementById('inventory-filter-size').value;
    const grid      = document.getElementById('inventory-cards-grid');
    grid.innerHTML  = '';

    const filtered = products.filter(p => {
        const name = productFullName(p).toLowerCase();
        const matchSearch = name.includes(search) || p.brand.toLowerCase().includes(search) || (p.name||'').toLowerCase().includes(search);
        const matchBrand  = brandVal === 'all' ? true : brandVal === 'Other' ? !brands.some(b=>b.toLowerCase()===p.brand.toLowerCase()) : p.brand === brandVal;
        const matchSize   = sizeVal === 'all' ? true : p.size === sizeVal;
        return matchSearch && matchBrand && matchSize;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-cart-placeholder" style="grid-column:1/-1;"><i data-lucide="package-x"></i><p>${products.length===0?'No products yet. Use Stock Management to add stock!':'No products match your filter.'}</p></div>`;
        lucide.createIcons(); return;
    }

    filtered.forEach(p => {
        const margin = p.buyingPrice > 0 ? (p.sellingPrice - p.buyingPrice) / p.buyingPrice * 100 : 0;
        let badgeTxt='In Stock', badgeCls='in-stock', stockColor='';
        if (p.stock === 0)               { badgeTxt='Out of Stock'; badgeCls='out-stock'; stockColor='color:var(--danger);'; }
        else if (p.stock<=p.alertLevel)  { badgeTxt='Low Stock';    badgeCls='low-stock'; stockColor='color:var(--warning);'; }
        const brandCls = p.brand.toLowerCase()==='sigiri'?'sigiri':p.brand.toLowerCase()==='rhino'?'rhino':'other';
        const displayName = p.size ? sizeLabel(p.size) : (p.name||'—');

        const card = document.createElement('div');
        card.className = 'inv-card';
        card.innerHTML = `
            <span class="inv-card-brand card-brand-badge ${brandCls}">${p.brand}</span>
            <h4>${displayName}</h4>
            <div class="inv-card-prices">
                <div class="inv-price-row"><span class="label">Buying cost</span><span class="value">LKR ${fmt(p.buyingPrice)}</span></div>
                <div class="inv-price-row"><span class="label">Selling price</span><span class="value sell">LKR ${fmt(p.sellingPrice)}</span></div>
                <div class="inv-price-row" style="border-top:1px dashed var(--border);padding-top:4px;margin-top:2px;">
                    <span class="label">Markup</span>
                    <span class="value profit">${margin.toFixed(1)}%</span>
                </div>
            </div>
            <div class="inv-stock-row">
                <div>
                    <div class="inv-stock-count" style="${stockColor}">${p.stock}</div>
                    <div class="inv-stock-label">sheets in stock</div>
                </div>
                <div style="text-align:right;">
                    <span class="stock-indicator-badge ${badgeCls}">${badgeTxt}</span>
                    <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">Alert at ${p.alertLevel}</div>
                </div>
            </div>
            <div class="inv-card-actions">
                <button class="inv-edit-btn" data-id="${p.id}"><i data-lucide="edit-3"></i> Edit</button>
                <button class="inv-delete-btn" data-id="${p.id}"><i data-lucide="trash-2"></i> Delete</button>
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
    document.getElementById('modal-product-title').textContent = 'Edit Roofing Sheet';
    document.getElementById('product-id-val').value    = prod.id;
    renderBrandControls();
    document.getElementById('product-brand-val').value   = prod.brand;
    document.getElementById('product-buying-val').value  = prod.buyingPrice;
    document.getElementById('product-selling-val').value = prod.sellingPrice;
    document.getElementById('product-stock-val').value   = prod.stock;
    document.getElementById('product-alert-val').value   = prod.alertLevel;

    const sizeSelect  = document.getElementById('product-size-val');
    const customGroup = document.getElementById('product-custom-name-group');
    const nameInput   = document.getElementById('product-name-val');

    const knownSize = SHEET_SIZES.find(s => s.value === prod.size);
    if (knownSize) {
        sizeSelect.value = prod.size;
        customGroup.style.display = 'none';
        nameInput.required = false;
    } else {
        sizeSelect.value = 'custom';
        customGroup.style.display = 'block';
        nameInput.value = prod.name || prod.size || '';
        nameInput.required = true;
    }
    document.getElementById('product-modal').classList.add('active');
}

function saveProductFromForm() {
    const id           = document.getElementById('product-id-val').value;
    const brand        = document.getElementById('product-brand-val').value;
    const sizeVal      = document.getElementById('product-size-val').value;
    const customName   = document.getElementById('product-name-val').value.trim();
    const buyingPrice  = parseFloat(document.getElementById('product-buying-val').value) || 0;
    const sellingPrice = parseFloat(document.getElementById('product-selling-val').value) || 0;
    const stock        = parseInt(document.getElementById('product-stock-val').value) || 0;
    const alertLevel   = parseInt(document.getElementById('product-alert-val').value) || 10;

    const finalSize = sizeVal === 'custom' ? customName : sizeVal;
    const finalName = sizeVal === 'custom' ? customName : sizeLabel(sizeVal) + ' Roofing Sheet';

    if (id) {
        const idx = products.findIndex(p => p.id === id);
        if (idx !== -1) { products[idx] = { id, name:finalName, size:finalSize, brand, buyingPrice, sellingPrice, stock, alertLevel }; }
        showToast('Product updated!');
    } else {
        products.push({ id:'prod_'+Date.now(), name:finalName, size:finalSize, brand, buyingPrice, sellingPrice, stock, alertLevel });
        showToast('Product added!');
    }
    saveProducts(); renderInventory(); renderCatalog();
}

function deleteProduct(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    if (confirm(`Delete "${productFullName(prod)}" from inventory?`)) {
        products = products.filter(p => p.id !== productId);
        saveProducts(); renderInventory(); renderCatalog();
        showToast('Product deleted', 'warning');
    }
}

function downloadInventoryCSV() {
    if (products.length === 0) { showToast('No inventory to export!', 'warning'); return; }
    let csv = '\uFEFFProduct,Brand,Size,Buying Price (LKR),Selling Price (LKR),Stock,Min Alert,Cost Value (LKR),Selling Value (LKR)\r\n';
    products.forEach(p => {
        csv += `"${productFullName(p).replace(/"/g,'""')}","${p.brand}","${sizeLabel(p.size)||p.size||'—'}",${p.buyingPrice},${p.sellingPrice},${p.stock},${p.alertLevel},${(p.buyingPrice*p.stock).toFixed(2)},${(p.sellingPrice*p.stock).toFixed(2)}\r\n`;
    });
    downloadBlob(csv, `perera_inventory_${todayStr()}.csv`, 'text/csv');
    showToast('Inventory CSV downloaded!');
}

// ============================================================
// SALES LOGS
// ============================================================
function renderSalesLogs() {
    const search  = document.getElementById('sales-search').value.toLowerCase();
    const dateVal = document.getElementById('sales-filter-date').value;
    const tbody   = document.getElementById('sales-table-body');
    tbody.innerHTML = '';

    const filtered = salesLogs.filter(log => {
        const matchSearch = log.id.toLowerCase().includes(search) || log.items.some(i => i.name.toLowerCase().includes(search));
        const matchDate   = dateVal ? log.timestamp.split('T')[0] === dateVal : true;
        return matchSearch && matchDate;
    });

    calculateSalesBubbles();

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:40px;color:var(--text-muted);"><i data-lucide="receipt-text" style="width:32px;height:32px;display:block;margin:0 auto 10px;"></i>No sales found.</td></tr>`;
        lucide.createIcons(); return;
    }

    filtered.forEach(log => {
        const d   = new Date(log.timestamp);
        const ds  = d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+' '+d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
        const sum = log.items.map(i=>`${i.name}(${i.qty})`).join(', ');
        const tr  = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${log.id}</strong></td>
            <td><span class="text-muted" style="font-size:12px;">${ds}</span></td>
            <td><div style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${sum}">${sum}</div></td>
            <td class="text-right">LKR ${fmt(log.totals.totalCost)}</td>
            <td class="text-right" style="font-weight:700;">LKR ${fmt(log.totals.grandTotal)}</td>
            <td class="text-right" style="color:var(--secondary);">LKR ${fmt(log.totals.totalDiscount)}</td>
            <td class="text-right" style="font-weight:700;color:var(--success);">LKR ${fmt(log.totals.netProfit)}</td>
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
        const d=new Date(log.timestamp), p=log.totals.netProfit;
        total+=p;
        if(d.toDateString()===now.toDateString()) today+=p;
        if((now-d)/864e5<=7) week+=p;
        if(d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()) month+=p;
    });
    document.getElementById('stat-today-profit').textContent = `LKR ${fmt(today)}`;
    document.getElementById('stat-week-profit').textContent  = `LKR ${fmt(week)}`;
    document.getElementById('stat-month-profit').textContent = `LKR ${fmt(month)}`;
    document.getElementById('stat-total-profit').textContent = `LKR ${fmt(total)}`;
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
        log.items.forEach(item => { const p=products.find(pr=>pr.id===item.productId); if(p) p.stock+=item.qty; });
        saveProducts();
        salesLogs = salesLogs.filter(l => l.id !== saleId);
        saveSales(); renderSalesLogs(); showToast(`${saleId} refunded.`, 'info');
    }
}

function downloadSalesCSV() {
    if (salesLogs.length === 0) { showToast('No sales to export!', 'warning'); return; }
    let csv = '\uFEFFInvoice ID,Date,Products,Cost (LKR),Revenue (LKR),Discount (LKR),Profit (LKR),Margin %\r\n';
    salesLogs.forEach(log => {
        const d = new Date(log.timestamp);
        const items = log.items.map(i=>`${i.name}(${i.qty})`).join('; ');
        csv += `"${log.id}","${d.toLocaleDateString('en-US')} ${d.toLocaleTimeString('en-US')}","${items.replace(/"/g,'""')}",${log.totals.totalCost},${log.totals.grandTotal},${log.totals.totalDiscount},${log.totals.netProfit},${log.totals.profitMargin.toFixed(2)}\r\n`;
    });
    downloadBlob(csv, `perera_sales_${todayStr()}.csv`, 'text/csv');
    showToast('Sales CSV downloaded!');
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
    let rev=0, cost=0, profit=0;
    salesLogs.forEach(l => { rev+=l.totals.grandTotal; cost+=l.totals.totalCost; profit+=l.totals.netProfit; });
    const margin = rev > 0 ? (profit/rev)*100 : 0;
    document.getElementById('kpi-revenue').textContent     = `LKR ${fmt(rev)}`;
    document.getElementById('kpi-cost').textContent        = `LKR ${fmt(cost)}`;
    document.getElementById('kpi-profit').textContent      = `LKR ${fmt(profit)}`;
    document.getElementById('kpi-margin').textContent      = `Profit Margin: ${margin.toFixed(1)}%`;
    document.getElementById('kpi-sales-count').textContent = salesLogs.length;

    // Current inventory KPIs
    let stockCost = 0;
    let stockSelling = 0;
    products.forEach(p => {
        const qty = p.stock || 0;
        stockCost += (p.buyingPrice || 0) * qty;
        stockSelling += (p.sellingPrice || 0) * qty;
    });
    const stockProfit = stockSelling - stockCost;
    const stockMargin = stockSelling > 0 ? (stockProfit / stockSelling) * 100 : 0;

    document.getElementById('kpi-stock-cost').textContent = `LKR ${fmt(stockCost)}`;
    document.getElementById('kpi-stock-selling').textContent = `LKR ${fmt(stockSelling)}`;
    document.getElementById('kpi-stock-profit').textContent = `LKR ${fmt(stockProfit)}`;
    document.getElementById('kpi-stock-margin').textContent = `Margin: ${stockMargin.toFixed(1)}%`;

    renderStockAlerts();
    renderProfitabilityTable();
    updateDashboardCharts('daily');
}

function renderProfitabilityTable() {
    const tbody = document.getElementById('profitability-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding:24px;color:var(--text-muted);">No products added yet.</td></tr>`;
        return;
    }

    // Sort by brand then size
    const sorted = [...products].sort((a, b) => {
        const bc = a.brand.localeCompare(b.brand);
        if (bc !== 0) return bc;
        return (a.size || '').localeCompare(b.size || '');
    });

    sorted.forEach(p => {
        const profitPerSheet = p.sellingPrice - p.buyingPrice;
        const margin         = p.sellingPrice > 0 ? (profitPerSheet / p.sellingPrice) * 100 : 0;
        const stockValue     = p.buyingPrice * p.stock;
        const displaySize    = p.size ? sizeLabel(p.size) : '—';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${productFullName(p)}</strong></td>
            <td><span class="badge badge-secondary">${p.brand}</span></td>
            <td>${displaySize}</td>
            <td class="text-right">LKR ${fmt(p.buyingPrice)}</td>
            <td class="text-right">LKR ${fmt(p.sellingPrice)}</td>
            <td class="text-right" style="font-weight:700;color:${profitPerSheet>=0?'var(--success)':'var(--danger)'};">LKR ${fmt(profitPerSheet)}</td>
            <td class="text-right"><span class="badge ${margin>=0?'badge-success':'badge-danger'}">${margin.toFixed(1)}%</span></td>
            <td class="text-right"><strong>${p.stock}</strong></td>
            <td class="text-right">LKR ${fmt(stockValue)}</td>`;
        tbody.appendChild(tr);
    });
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
        const el  = document.createElement('div');
        el.className = `alert-item ${oos?'danger-item':'warning-item'}`;
        el.innerHTML = `
            <i data-lucide="${oos?'alert-octagon':'alert-triangle'}"></i>
            <div class="alert-details"><p>${productFullName(p)}</p><span>${p.brand} &bull; ${oos?'Out of Stock!':p.stock+' sheets left'}</span></div>
            <button class="btn-primary" style="padding:4px 8px;font-size:11px;border-radius:4px;" onclick="switchTab('stock-management');">+ Stock</button>`;
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
        for (let i=6;i>=0;i--) {
            const d=new Date(); d.setDate(now.getDate()-i);
            labels.push(d.toLocaleDateString('en-US',{month:'short',day:'numeric'}));
            let r=0,p=0; salesLogs.forEach(l=>{if(new Date(l.timestamp).toDateString()===d.toDateString()){r+=l.totals.grandTotal;p+=l.totals.netProfit;}});
            revenue.push(r); profit.push(p);
        }
    } else if (period === 'weekly') {
        for (let i=3;i>=0;i--) {
            labels.push(i===0?'This Week':`Week -${i}`);
            let r=0,p=0; salesLogs.forEach(l=>{const diff=(now-new Date(l.timestamp))/864e5;if(diff>=i*7&&diff<(i+1)*7){r+=l.totals.grandTotal;p+=l.totals.netProfit;}});
            revenue.push(r); profit.push(p);
        }
    } else {
        for (let i=5;i>=0;i--) {
            const d=new Date(); d.setMonth(now.getMonth()-i);
            labels.push(d.toLocaleDateString('en-US',{month:'short'}));
            let r=0,p=0; salesLogs.forEach(l=>{const ld=new Date(l.timestamp);if(ld.getMonth()===d.getMonth()&&ld.getFullYear()===d.getFullYear()){r+=l.totals.grandTotal;p+=l.totals.netProfit;}});
            revenue.push(r); profit.push(p);
        }
    }

    activeChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [
            { label:'Revenue (LKR)', data:revenue, backgroundColor:'#0f2942', borderRadius:4 },
            { label:'Net Profit (LKR)', data:profit, backgroundColor:'#9e1a1a', borderRadius:4 }
        ]},
        options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ position:'top', labels:{ font:{ family:"'Outfit',sans-serif", weight:'600' } } } },
            scales:{ y:{ beginAtZero:true, ticks:{ callback: v=>'LKR '+v.toLocaleString() } } }
        }
    });
}

// ============================================================
// BACKUP & RESTORE
// ============================================================
function exportDatabase() {
    const data = JSON.stringify({ products, salesLogs, stockLogs, brands }, null, 2);
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
            if (!Array.isArray(data.products)||!Array.isArray(data.salesLogs)) throw new Error('invalid');
            if (!confirm('Overwrite current data with this backup?')) return;
            products  = data.products;
            salesLogs = data.salesLogs;
            stockLogs = data.stockLogs || [];
            brands    = data.brands || ['Sigiri','Rhino'];
            saveProducts(); saveSales(); saveStockLogs(); saveBrands();
            renderBrandControls();
            const tab = document.querySelector('.nav-item.active')?.getAttribute('data-tab') || 'dashboard';
            switchTab(tab);
            showToast('Database restored!');
        } catch { showToast('Invalid backup file!', 'danger'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}
