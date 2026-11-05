// ==========================================
// OMNIMAPP - Mi Súper (con Resumen Financiero)
// ==========================================

let currentStoreKey = "mercado";
let stores = {};
let receivedMoney = 0;

// --- MENÚ FLOTANTE MÓVIL ---
function toggleStoreMenu() {
    const menu = document.getElementById('store-menu-dropdown');
    if (!menu) return;
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        menu.classList.add('flex');
    } else {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
    }
}

function closeStoreMenu() {
    const menu = document.getElementById('store-menu-dropdown');
    if (menu) {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
    }
}

document.addEventListener('click', function(event) {
    const menu = document.getElementById('store-menu-dropdown');
    const btn = document.getElementById('fab-store-menu');
    if (menu && !menu.classList.contains('hidden')) {
        if (!menu.contains(event.target) && (!btn || !btn.contains(event.target))) {
            closeStoreMenu();
        }
    }
});

// --- SELECCIÓN DE TIENDA ---
function selectStore(storeKey) {
    currentStoreKey = storeKey;
    
    document.querySelectorAll('.store-btn').forEach(b => {
        b.className = "store-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none shrink-0 transition-all";
    });
    const activeBtn = document.getElementById('btn-store-' + storeKey);
    if(activeBtn) {
        activeBtn.className = "store-btn px-4 py-2 rounded-xl text-xs font-bold bg-white text-indigo-600 shadow border border-indigo-100 dark:bg-indigo-600 dark:text-white dark:border-none shrink-0 transition-all";
    }

    document.querySelectorAll('.mobile-store-btn').forEach(b => {
        b.classList.remove('bg-indigo-50', 'text-indigo-600', 'dark:bg-indigo-900/40', 'dark:text-indigo-300');
        b.classList.add('text-slate-700', 'dark:text-slate-300');
    });
    const activeMobileBtn = document.getElementById('m-store-' + storeKey);
    if (activeMobileBtn) {
        activeMobileBtn.classList.remove('text-slate-700', 'dark:text-slate-300');
        activeMobileBtn.classList.add('bg-indigo-50', 'text-indigo-600', 'dark:bg-indigo-900/40', 'dark:text-indigo-300');
    }

    closeStoreMenu();
    renderSuper();
}

// --- CRUD DE PRODUCTOS ---
function handleAddSuperItem(e) {
    e.preventDefault();
    const name = document.getElementById('super-item-name').value.trim();
    if(!name) return;
    db.ref(`${userKey}/stores/${currentStoreKey}`).push({ name, qty: "", price: "", done: false });
    document.getElementById('super-item-name').value = '';
}

function toggleSuperItem(key, currentDone) {
    db.ref(`${userKey}/stores/${currentStoreKey}/${key}`).update({ done: !currentDone });
}

function updateStoreField(key, field, val) {
    if (field === 'price') {
        val = String(val).replace(/[^0-9.]/g, ''); 
    }
    db.ref(`${userKey}/stores/${currentStoreKey}/${key}`).update({ [field]: val });
}

function deleteSuperItem(key) {
    db.ref(`${userKey}/stores/${currentStoreKey}/${key}`).remove();
}

function clearCurrentStore() {
    if(confirm('¿Deseas limpiar esta tienda?')) {
        const storeData = stores[currentStoreKey] || {};
        Object.keys(storeData).forEach(key => {
            db.ref(`${userKey}/stores/${currentStoreKey}/${key}`).update({ qty: "", price: "", done: false });
        });
        showToast('Tienda limpiada', 'success');
    }
}

// --- RENDERIZADO Y TOTALES ---
function renderSuper() {
    const container = document.getElementById('super-items-container');
    if (!container) return;
    
    // INYECCIÓN DEL BOTÓN Y RESUMEN EN EL HTML (Si no existen)
    let financialSection = document.getElementById('financial-summary-section');
    if (!financialSection) {
        financialSection = document.createElement('div');
        financialSection.id = 'financial-summary-section';
        financialSection.className = 'bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900 shadow-sm space-y-4 mt-6';
        financialSection.innerHTML = `
            <h3 class="font-bold text-indigo-600 dark:text-indigo-400 text-base flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <i class="fa-solid fa-calculator"></i> Resumen Financiero
            </h3>
            <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Total Recibido (Dinero que tienes)</label>
                <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input type="number" id="super-received-money" step="0.01" min="0" placeholder="0.00" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-4 py-3 text-lg font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" onchange="saveReceivedMoney(this.value)">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 pt-2">
                <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Gasto Total</p>
                    <p id="total-spent" class="text-xl font-extrabold text-slate-700 dark:text-slate-200">$0.00</p>
                </div>
                <div id="balance-box" class="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <p class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1" id="balance-label">Sobrante</p>
                    <p id="total-balance" class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">$0.00</p>
                </div>
            </div>
            <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 class="text-[11px] font-bold text-slate-500 uppercase mb-2">Desglose por Tienda</h4>
                <div id="store-breakdown" class="space-y-1 text-sm text-slate-600 dark:text-slate-400"></div>
            </div>
            
            <!-- BOTÓN INYECTADO POR JS -->
            <button onclick="downloadExpensesPDF()" class="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow flex items-center justify-center gap-2 mt-4">
                <i class="fa-solid fa-file-invoice-dollar"></i> Descargar Reporte de Gastos (PDF)
            </button>
        `;
        
        const sectionSuper = document.getElementById('tab-super');
        const clearBtn = sectionSuper.querySelector('button[onclick="clearCurrentStore()"]');
        
        // ¡ESTA ES LA CLAVE! Solo lo insertamos si el clearBtn existe y no está ya insertado
        if (clearBtn && !clearBtn.nextElementSibling?.classList.contains('bg-white')) {
            clearBtn.parentNode.insertBefore(financialSection, clearBtn.nextSibling);
        } else if (!clearBtn) {
            sectionSuper.appendChild(financialSection);
        }
    }

    // Actualizar etiqueta de tienda (móvil)
    const storeNames = { 
        mercado: 'Mercado', costco: 'Costco', sams: "Sam's", 
        zorro: 'El Zorro', monarca: 'Monarca', extras: 'Extras',
        farmacia: 'Farmacia', thanksgiving: 'Thanksgiving' 
    };
    const labelEl = document.getElementById('current-store-label');
    if (labelEl) labelEl.innerText = storeNames[currentStoreKey] || currentStoreKey;

    // Renderizar productos
    const items = stores[currentStoreKey] || {};
    if (Object.keys(items).length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Lista de tienda vacía.</p>`;
    } else {
        container.innerHTML = Object.keys(items).map(key => {
            const p = items[key];
            const safeKey = escapeAttr(key);
            let priceVal = p.price || '';
            if (priceVal && !isNaN(priceVal)) priceVal = parseFloat(priceVal).toFixed(2);

            return `
                <div class="super-product-item-wrapper bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2 ${p.done ? 'opacity-60' : ''}">
                    <div class="product-row-pill flex items-center gap-3 flex-1">
                        <div class="pill-name-wrapper flex items-center gap-2 flex-1">
                            <input type="checkbox" class="custom-circle-check" ${p.done ? 'checked' : ''} onchange="toggleSuperItem('${safeKey}', ${p.done})">
                            <input type="text" class="pill-input pill-name-box flex-1 text-left ${p.done ? 'line-through' : ''}" value="${escapeAttr(p.name || '')}" onchange="updateStoreField('${safeKey}', 'name', this.value)">
                        </div>
                        <div class="pill-sub-group flex gap-2">
                            <input type="text" class="pill-input pill-qty-box w-24" placeholder="Cant." value="${escapeAttr(p.qty || '')}" onchange="updateStoreField('${safeKey}', 'qty', this.value)">
                            <input type="number" step="0.01" min="0" class="pill-input pill-price-box w-24" placeholder="Precio" value="${escapeAttr(priceVal)}" onchange="updateStoreField('${safeKey}', 'price', this.value)">
                        </div>
                    </div>
                    <button onclick="deleteSuperItem('${safeKey}')" class="text-red-500 font-bold px-2 text-sm">✕</button>
                </div>
            `;
        }).join('');
    }

    updateFinancialSummary();
}

// --- RESUMEN FINANCIERO ---
function updateFinancialSummary() {
    let totalSpent = 0;
    const breakdownContainer = document.getElementById('store-breakdown');
    const storeNames = { 
        mercado: 'Mercado', costco: 'Costco', sams: "Sam's", 
        zorro: 'El Zorro', monarca: 'Monarca', extras: 'Extras',
        farmacia: 'Farmacia', thanksgiving: 'Thanksgiving' 
    };
    
    let breakdownHTML = '';

    Object.keys(storeNames).forEach(storeKey => {
        const items = stores[storeKey] || {};
        let storeTotal = 0;
        
        Object.keys(items).forEach(k => {
            const item = items[k];
            if (item.price) {
                const p = parseFloat(item.price);
                if (!isNaN(p)) storeTotal += p;
            }
        });

        totalSpent += storeTotal;
        
        if (storeTotal > 0) {
            breakdownHTML += `
                <div class="flex justify-between items-center">
                    <span class="flex items-center gap-1"><span class="text-xs">${storeKey === 'mercado' ? '🥬' : storeKey === 'costco' ? '🛒' : storeKey === 'sams' ? '📦' : storeKey === 'zorro' ? '🦊' : storeKey === 'monarca' ? '👑' : storeKey === 'farmacia' ? '💊' : storeKey === 'thanksgiving' ? '🦃' : '⭐'}</span> ${storeNames[storeKey]}</span>
                    <span class="font-bold text-slate-800 dark:text-slate-200">$${storeTotal.toFixed(2)}</span>
                </div>
            `;
        }
    });

    if (breakdownHTML === '') {
        breakdownHTML = '<p class="text-xs text-slate-400 italic text-center">No hay gastos registrados aún.</p>';
    }
    if (breakdownContainer) breakdownContainer.innerHTML = breakdownHTML;

    const receivedInput = document.getElementById('super-received-money');
    if (receivedInput) {
        receivedMoney = parseFloat(receivedInput.value) || 0;
    }

    const balance = receivedMoney - totalSpent;
    const isPositive = balance >= 0;
    
    const totalSpentEl = document.getElementById('total-spent');
    const totalBalanceEl = document.getElementById('total-balance');
    const balanceLabelEl = document.getElementById('balance-label');
    const balanceBox = document.getElementById('balance-box');

    if (totalSpentEl) totalSpentEl.innerText = `$${totalSpent.toFixed(2)}`;
    if (totalBalanceEl) totalBalanceEl.innerText = `$${Math.abs(balance).toFixed(2)}`;
    
    if (balanceLabelEl && balanceBox) {
        if (isPositive) {
            balanceLabelEl.innerText = 'Sobrante';
            balanceLabelEl.className = 'text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1';
            totalBalanceEl.className = 'text-xl font-extrabold text-emerald-600 dark:text-emerald-400';
            balanceBox.className = 'bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center';
        } else {
            balanceLabelEl.innerText = 'Faltante';
            balanceLabelEl.className = 'text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-1';
            totalBalanceEl.className = 'text-xl font-extrabold text-red-600 dark:text-red-400';
            balanceBox.className = 'bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800 text-center';
        }
    }
}

// --- GUARDAR/RECUPERAR DINERO RECIBIDO EN FIREBASE ---
function loadReceivedMoney() {
    db.ref(`${userKey}/receivedMoney`).on('value', snapshot => {
        const val = snapshot.val();
        receivedMoney = val || 0;
        const input = document.getElementById('super-received-money');
        if (input) {
            input.value = receivedMoney > 0 ? receivedMoney : '';
            updateFinancialSummary();
        }
    });
}

function saveReceivedMoney(val) {
    const num = parseFloat(val) || 0;
    db.ref(`${userKey}/receivedMoney`).set(num);
    updateFinancialSummary();
}
