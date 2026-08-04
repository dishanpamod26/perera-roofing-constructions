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
    const seSizeSelect  = document.getElementById('se-size');
    const seCustomGroup = document.getElementById('se-custom-name-group');
    const seCustomName  = document.getElementById('se-custom-name');
    const seQty         = document.getElementById('se-qty');
    const seStockNum    = document.getElementById('se-stock-number');
    const seTotalCost   = document.getElementById('se-total-cost');

    seSizeSelect.addEventListener('change', () => {
        seCustomGroup.style.display = seSizeSelect.value === 'custom' ? 'block' : 'none';
        seCustomName.required = seSizeSelect.value === 'custom';
        updateStockEntryPreview();
    });
    seQty.addEventListener('input', () => { updateStockEntryPreview(); });
    seStockNum.addEventListener('input', () => { updateStockEntryPreview(); });
    seTotalCost.addEventListener('input', () => { updateStockEntryPreview(); });

    seForm.addEventListener('submit', e => {
        e.preventDefault();
        saveStockEntry();
    });

    document.getElementById('stock-history-search').addEventListener('input', renderStockHistory);

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
function updateStockEntryPreview() {
    const brand    = document.getElementById('se-brand').value || '—';
    const sizeVal  = document.getElementById('se-size').value;
    const sizeTxt  = sizeVal === 'custom' ? (document.getElementById('se-custom-name').value || '—') : sizeLabel(sizeVal);
    const qty      = parseInt(document.getElementById('se-qty').value) || 0;
    const stockNum = document.getElementById('se-stock-number').value.trim() || '—';
    const total    = parseFloat(document.getElementById('se-total-cost').value) || 0;

    document.getElementById('se-prev-name').textContent  = `${brand} ${sizeTxt}`;
    document.getElementById('se-prev-qty').textContent   = `${qty} sheets`;
    document.getElementById('se-prev-stock-num').textContent = stockNum;
    document.getElementById('se-prev-total').textContent = `LKR ${fmt(total)}`;
}

// ============================================================
// SAVE STOCK ENTRY → auto-create/update inventory
// ============================================================
function saveStockEntry() {
    const brand       = document.getElementById('se-brand').value;
    const sizeVal     = document.getElementById('se-size').value;
    const customName  = document.getElementById('se-custom-name').value.trim();
    const qty         = parseInt(document.getElementById('se-qty').value) || 0;
    const weight      = parseFloat(document.getElementById('se-weight').value) || 0;
    const stockNumber = document.getElementById('se-stock-number').value.trim();
    const totalCost   = parseFloat(document.getElementById('se-total-cost').value) || 0;
    const note        = document.getElementById('se-note').value.trim();

    if (!stockNumber) { showToast('Please enter a Stock / Lot Number!', 'warning'); return; }
    if (!brand)       { showToast('Please select a brand!', 'warning'); return; }
    if (!sizeVal)     { showToast('Please select a size!', 'warning'); return; }
    if (sizeVal === 'custom' && !customName) { showToast('Please enter the custom size name!', 'warning'); return; }
    if (qty <= 0)     { showToast('Quantity must be greater than 0!', 'warning'); return; }
    if (totalCost <= 0) { showToast('Please enter a valid total cost paid!', 'warning'); return; }

    const finalSize = sizeVal === 'custom' ? customName : sizeVal;

    // Find or create inventory product for this brand+size
    let prod = products.find(p => p.brand === brand && p.size === finalSize);
    if (prod) {
        // Update stock only — do NOT override buying/selling price
        prod.stock += qty;
    } else {
        // Product not found, prompt for buying and selling prices
        const displayLabel = sizeVal === 'custom' ? customName : sizeLabel(sizeVal);
        const buyStr = prompt(`Product "${brand} ${displayLabel}" not found in inventory.\nPlease enter its Buying Price (Cost) per sheet (LKR):`, "0");
        if (buyStr === null) return; // user cancelled
        const sellStr = prompt(`Please enter its Selling Price per sheet (LKR):`, "0");
        if (sellStr === null) return; // user cancelled

        const buyingPrice = parseFloat(buyStr) || 0;
        const sellingPrice = parseFloat(sellStr) || 0;

        prod = {
            id:           'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name:         sizeVal === 'custom' ? customName : sizeLabel(sizeVal) + ' Roofing Sheet',
            size:         finalSize,
            brand:        brand,
            buyingPrice:  buyingPrice,
            sellingPrice: sellingPrice,
            stock:        qty,
            alertLevel:   10,
        };
        products.push(prod);
    }
    saveProducts();

    // Log the purchase
    stockLogs.unshift({
        id:           'SL-' + Date.now(),
        timestamp:    new Date().toISOString(),
        stockNumber,
        brand,
        size:         finalSize,
        sizeLabel:    sizeVal === 'custom' ? customName : sizeLabel(sizeVal),
        qty,
        weight,
        totalCost,
        note,
        productId:    prod.id,
    });
    saveStockLogs();

    // Reset form
    document.getElementById('stock-entry-form').reset();
    document.getElementById('se-custom-name-group').style.display = 'none';
    document.getElementById('se-total-cost').value = '';
    document.getElementById('se-prev-name').textContent  = '—';
    document.getElementById('se-prev-qty').textContent   = '0 sheets';
    document.getElementById('se-prev-stock-num').textContent = '—';
    document.getElementById('se-prev-total').textContent = 'LKR 0.00';
    renderBrandControls();

    renderStockHistory();
    renderInventory();
    renderDashboard();

    showToast(`Stock added! ${brand} ${sizeLabel(finalSize)} +${qty} sheets logged under ${stockNumber}.`, 'success');
}

// ============================================================
// STOCK HISTORY TABLE
// ============================================================
function renderStockHistory() {
    const search = document.getElementById('stock-history-search').value.toLowerCase();
    const tbody  = document.getElementById('stock-history-body');
    tbody.innerHTML = '';

    const filtered = stockLogs.filter(l =>
        l.brand.toLowerCase().includes(search) ||
        l.sizeLabel.toLowerCase().includes(search) ||
        (l.stockNumber || '').toLowerCase().includes(search) ||
        (l.note || '').toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:32px;color:var(--text-muted);">No stock entries found.</td></tr>`;
        return;
    }

    filtered.forEach(l => {
        const d  = new Date(l.timestamp);
        const ds = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="text-muted" style="font-size:12px;">${ds}</span></td>
            <td><strong>${l.stockNumber || '—'}</strong></td>
            <td><span class="badge badge-secondary">${l.brand}</span></td>
            <td><strong>${l.sizeLabel}</strong></td>
            <td class="text-right"><strong>+${l.qty}</strong></td>
            <td class="text-right" style="color:var(--secondary);font-weight:700;">LKR ${fmt(l.totalCost)}</td>
            <td style="font-size:12px;color:var(--text-muted);">${l.note || '—'}</td>`;
        tbody.appendChild(tr);
    });
}

function downloadStockCSV() {
    if (stockLogs.length === 0) { showToast('No stock logs to export!', 'warning'); return; }
    let csv = '\uFEFFDate,Stock Number,Brand,Size,Qty Added,Total Cost Paid (LKR),Weight (Tons),Note\r\n';
    stockLogs.forEach(l => {
        const d = new Date(l.timestamp);
        csv += `"${d.toLocaleDateString('en-US')} ${d.toLocaleTimeString('en-US')}","${l.stockNumber||'—'}","${l.brand}","${l.sizeLabel}",${l.qty},${l.totalCost},${l.weight||0},"${(l.note||'').replace(/"/g,'""')}"\r\n`;
    });
    downloadBlob(csv, `perera_stock_log_${todayStr()}.csv`, 'text/csv');
    showToast('Stock log CSV downloaded!');
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
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <div class="cart-item-details">
                <strong>${item.name}</strong>
                <small class="text-muted">${item.brand} &bull; LKR ${fmt(item.sellingPrice)} each</small>
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
                        <option value="flat"    ${item.itemDiscountType==='flat'   ?'selected':''}>LKR</option>
                        <option value="percent" ${item.itemDiscountType==='percent'?'selected':''}>%</option>
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
        const disc=item.itemDiscountType==='flat'?item.itemDiscount*item.qty:line*(item.itemDiscount/100);
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
        const disc=item.itemDiscountType==='flat'?item.itemDiscount*item.qty:line*(item.itemDiscount/100);
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
        const disc=item.itemDiscountType==='flat'?item.itemDiscount*item.qty:line*(item.itemDiscount/100);
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
