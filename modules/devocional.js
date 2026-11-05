// ==========================================
// OMNIMAPP - Devocional (Categorías y Acordeón)
// ==========================================

let devotionals = [];

function toggleDevForm() {
    const formContainer = document.getElementById('dev-form-container');
    const btn = document.getElementById('dev-toggle-btn');
    if (formContainer.classList.contains('hidden')) {
        formContainer.classList.remove('hidden');
        btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Cerrar formulario';
    } else {
        formContainer.classList.add('hidden');
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> Añadir Reflexión u Oración';
    }
}

function handleDevCategoryChange() {
    const select = document.getElementById('dev-category');
    const newInput = document.getElementById('dev-new-category');
    if (select.value === '__new__') {
        newInput.classList.remove('hidden');
        newInput.focus();
    } else {
        newInput.classList.add('hidden');
        newInput.value = '';
    }
}

function handleAddDevotional(e) {
    e.preventDefault();
    const categorySelect = document.getElementById('dev-category').value;
    const newCategory = document.getElementById('dev-new-category').value.trim();
    let category = '';

    if (categorySelect === '__new__') {
        if (!newCategory) return toastAlert('Escribe el nombre de la nueva categoría.', 'warning');
        category = newCategory;
    } else if (categorySelect) {
        category = categorySelect;
    } else {
        return toastAlert('Selecciona o crea una categoría.', 'warning');
    }

    const title = document.getElementById('dev-title').value.trim() || 'Sin título';
    const body = document.getElementById('dev-text').value.trim();
    if (!body) return toastAlert('Escribe el contenido.', 'warning');

    db.ref(`${userKey}/notes`).push({
        title, body, category,
        date: new Date().toLocaleDateString('es-ES'),
        timestamp: Date.now()
    });

    document.getElementById('dev-title').value = '';
    document.getElementById('dev-text').value = '';
    document.getElementById('dev-category').value = '';
    document.getElementById('dev-new-category').value = '';
    document.getElementById('dev-new-category').classList.add('hidden');
    
    toggleDevForm();
    showToast('Reflexión guardada', 'success');
}

function deleteDevotional(id) {
    if (confirm('¿Eliminar esta entrada?')) {
        db.ref(`${userKey}/notes/${id}`).remove();
        showToast('Entrada eliminada', 'info', 2000);
    }
}

// Lógica visual del acordeón
function toggleCategoryGroup(catKey) {
    const header = document.querySelector(`.category-header[data-cat="${catKey}"]`);
    const items = document.querySelector(`.category-items[data-cat="${catKey}"]`);
    if (header && items) {
        header.classList.toggle('open');
        items.classList.toggle('open');
    }
}

function toggleDevotionalItem(itemId) {
    const header = document.querySelector(`.devotional-item-header[data-item="${itemId}"]`);
    const body = document.querySelector(`.devotional-item-body[data-item="${itemId}"]`);
    if (header && body) {
        header.classList.toggle('open');
        body.classList.toggle('open');
    }
}

// Renderizar lista agrupada por categoría
function renderDevotionals() {
    const container = document.getElementById('devotional-entries-container');
    if (!container) return;

    if (devotionals.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Sin entradas guardadas.</p>`;
        return;
    }

    // Agrupar por categoría
    const grouped = {};
    devotionals.forEach(d => {
        const cat = d.category || 'Sin categoría';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(d);
    });

    // Ordenar cada grupo por fecha (más recientes primero)
    Object.keys(grouped).forEach(cat => {
        grouped[cat].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    });

    // Ordenar categorías alfabéticamente
    const sortedCategories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    container.innerHTML = sortedCategories.map(cat => {
        const items = grouped[cat];
        // Sanitizar el nombre para usarlo en atributos HTML
        const catKey = cat.replace(/[^a-zA-Z0-9]/g, '_');
        const catEsc = escapeHtml(cat);

        return `
            <div class="category-group">
                <div class="category-header" data-cat="${catKey}" onclick="toggleCategoryGroup('${catKey}')">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-folder text-indigo-500"></i>
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-100">${catEsc}</span>
                        <span class="text-[10px] font-bold text-white bg-indigo-500 rounded-full px-2 py-0.5">${items.length}</span>
                    </div>
                    <i class="fa-solid fa-chevron-down text-slate-400 chevron"></i>
                </div>
                <div class="category-items" data-cat="${catKey}">
                    ${items.map(d => {
                        const itemId = escapeAttr(d.id);
                        return `
                            <div class="devotional-item">
                                <div class="devotional-item-header" data-item="${itemId}" onclick="toggleDevotionalItem('${itemId}')">
                                    <div class="flex items-center gap-2 flex-1 min-w-0">
                                        <i class="fa-solid fa-bookmark text-purple-400 text-xs"></i>
                                        <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">${escapeHtml(d.title || 'Sin título')}</span>
                                    </div>
                                    <i class="fa-solid fa-chevron-down text-slate-400 text-[10px] chevron-small"></i>
                                </div>
                                <div class="devotional-item-body" data-item="${itemId}">
                                    <p class="text-xs text-slate-700 dark:text-slate-200 leading-relaxed mb-2">${escapeHtml(d.body || d.text || '')}</p>
                                    <div class="flex justify-between items-center">
                                        <span class="text-[10px] text-slate-400">${escapeHtml(d.date || '')}</span>
                                        <button onclick="event.stopPropagation(); deleteDevotional('${itemId}')" class="text-slate-300 hover:text-red-500 text-xs">
                                            <i class="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}
