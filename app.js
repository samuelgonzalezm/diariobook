// ==========================================
// OMNIMAPP - Mi Súper
// ==========================================

let currentStoreKey = "mercado";
let stores = {};

function toggleStoreMenu() {
    const menu = document.getElementById('store-menu-dropdown');
    if (!menu) return;
    
    // Usamos classList porque el HTML ya tiene la clase 'hidden' inicial
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

// Cierra el menú si se hace clic fuera de él
document.addEventListener('click', function(event) {
    const menu = document.getElementById('store-menu-dropdown');
    const btn = document.getElementById('fab-store-menu');
    
    if (menu && !menu.classList.contains('hidden')) {
        if (!menu.contains(event.target) && (!btn || !btn.contains(event.target))) {
            closeStoreMenu();
        }
    }
});

function selectStore(storeKey) {
    currentStoreKey = storeKey;
    
    // Actualizar botones en Desktop
    document.querySelectorAll('.store-btn').forEach(b => {
        b.className = "store-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none shrink-0 transition-all";
    });
    const activeBtn = document.getElementById('btn-store-' + storeKey);
    if(activeBtn) {
        activeBtn.className = "store-btn px-4 py-2 rounded-xl text-xs font-bold bg-white text-indigo-600 shadow border border-indigo-100 dark:bg-indigo-600 dark:text-white dark:border-none shrink-0 transition-all";
    }

    // Actualizar botones en Móvil (Menú)
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

function renderSuper() {
    const container = document.getElementById('super-items-container');
    if (!container) return;
    
    const items = stores[currentStoreKey] || {};
    if (Object.keys(items).length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Lista de tienda vacía.</p>`;
        return;
    }
    
    container.innerHTML = Object.keys(items).map(key => {
        const p = items[key];
        const safeKey = escapeAttr(key);
        return `
            <div class="super-product-item-wrapper bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2 ${p.done ? 'opacity-60' : ''}">
                <div class="product-row-pill flex items-center gap-3 flex-1">
                    <div class="pill-name-wrapper flex items-center gap-2 flex-1">
                        <input type="checkbox" class="custom-circle-check" ${p.done ? 'checked' : ''} onchange="toggleSuperItem('${safeKey}', ${p.done})">
                        <input type="text" class="pill-input pill-name-box flex-1 text-left ${p.done ? 'line-through' : ''}" value="${escapeAttr(p.name || '')}" onchange="updateStoreField('${safeKey}', 'name', this.value)">
                    </div>
                    <div class="pill-sub-group flex gap-2">
                        <input type="text" class="pill-input pill-qty-box w-24" placeholder="Cant." value="${escapeAttr(p.qty || '')}" onchange="updateStoreField('${safeKey}', 'qty', this.value)">
                        <input type="text" class="pill-input pill-price-box w-24" placeholder="Precio" value="${escapeAttr(p.price || '')}" onchange="updateStoreField('${safeKey}', 'price', this.value)">
                    </div>
                </div>
                <button onclick="deleteSuperItem('${safeKey}')" class="text-red-500 font-bold px-2 text-sm">✕</button>
            </div>
        `;
    }).join('');
}
