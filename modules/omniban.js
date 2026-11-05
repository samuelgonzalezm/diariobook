// ==========================================
// OMNIMAPP - OmniBan (Peticiones de Oración)
// ==========================================

let omniban = [];

function toggleOmniBanForm() {
    const formContainer = document.getElementById('omniban-form-container');
    const btn = document.getElementById('omniban-toggle-btn');
    if (formContainer.classList.contains('hidden')) {
        formContainer.classList.remove('hidden');
        btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Cerrar formulario';
    } else {
        formContainer.classList.add('hidden');
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> Agregar nueva intención';
    }
}

function toggleOmniBanAllDays() {
    const allDays = document.getElementById('omniban-alldays').checked;
    const datesBox = document.getElementById('omniban-dates-box');
    const startInput = document.getElementById('omniban-start');
    const endInput = document.getElementById('omniban-end');
    
    if (allDays) {
        datesBox.classList.add('hidden');
        startInput.required = false;
        endInput.required = false;
    } else {
        datesBox.classList.remove('hidden');
        startInput.required = true;
        endInput.required = true;
    }
}

function handleAddOmniBan(e) {
    e.preventDefault();
    const name = document.getElementById('omniban-name').value.trim();
    const reason = document.getElementById('omniban-reason').value.trim();
    const allDays = document.getElementById('omniban-alldays').checked;
    const start = document.getElementById('omniban-start').value;
    const end = allDays ? null : document.getElementById('omniban-end').value;
    
    if (!name) return toastAlert('Escribe el nombre o intención.', 'warning');
    if (!allDays && (!start || !end)) return toastAlert('Selecciona fechas.', 'warning');
    if (!allDays && start > end) return toastAlert('Fecha fin no puede ser antes de inicio.', 'warning');
    
    const newOmniban = {
        name, reason, allDays,
        start: start || new Date().toISOString().split('T')[0],
        end, timestamp: Date.now(), completed: false
    };
    
    db.ref(`${userKey}/omniban`).push(newOmniban, (err) => {
        if (!err) {
            document.getElementById('omniban-name').value = '';
            document.getElementById('omniban-reason').value = '';
            document.getElementById('omniban-alldays').checked = false;
            toggleOmniBanAllDays();
            
            if (typeof initDates === 'function') initDates(); 
            toggleOmniBanForm();
            showToast('Petición agregada', 'success');
        }
    });
}

function toggleOmniBanCompleted(id) {
    const item = omniban.find(o => o.id === id);
    if (item) db.ref(`${userKey}/omniban/${id}`).update({ completed: !item.completed });
}

function deleteOmniBan(id) {
    if (confirm('¿Eliminar esta petición?')) {
        db.ref(`${userKey}/omniban/${id}`).remove();
        showToast('Petición eliminada', 'info', 2000);
    }
}

function calcularDiasOmniBan(item) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(item.start + 'T00:00:00');
    if (item.allDays) {
        const diff = Math.floor((today - start) / 86400000) + 1;
        return diff > 0 ? diff : 0;
    } else {
        const end = new Date(item.end + 'T00:00:00');
        const diff = Math.floor((end - start) / 86400000) + 1;
        return diff > 0 ? diff : 0;
    }
}

function estaVigenteOmniBan(item) {
    if (item.allDays) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(item.start + 'T00:00:00');
    const end = new Date(item.end + 'T00:00:00');
    return today >= start && today <= end;
}

function renderOmniBan() {
    const container = document.getElementById('omniban-container');
    const countEl = document.getElementById('omniban-active-count');
    
    if (omniban.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400">
                <i class="fa-solid fa-hands-praying text-4xl mb-3 opacity-30"></i>
                <p class="text-xs">Aún no hay peticiones guardadas.</p>
            </div>
        `;
        if (countEl) countEl.innerText = '';
        return;
    }
    
    const activos = omniban.filter(o => !o.completed && estaVigenteOmniBan(o)).length;
    if (countEl) countEl.innerText = `${activos} activa(s)`;
    
    container.innerHTML = omniban.map((o, idx) => {
        const dias = calcularDiasOmniBan(o);
        const vigente = estaVigenteOmniBan(o);
        const completado = o.completed;
        let estadoBadge = '';
        
        if (completado) {
            estadoBadge = `<span class="text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold">COMPLETADA</span>`;
        } else if (!vigente) {
            estadoBadge = `<span class="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md font-bold">VENCIDA</span>`;
        } else if (o.allDays) {
            estadoBadge = `<span class="text-[9px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md font-bold">TODOS LOS DIAS</span>`;
        } else {
            estadoBadge = `<span class="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded-md font-bold">${dias} DIA(S)</span>`;
        }
        
        return `
            <div class="omniban-card ${completado ? 'completed' : ''} stagger-item hover-card bg-white dark:bg-slate-900 p-4 pl-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2" style="animation-delay: ${Math.min(idx * 40, 300)}ms">
                <div class="flex justify-between items-start gap-2">
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100 ${completado ? 'line-through' : ''}">${escapeHtml(o.name)}</h4>
                        ${o.reason ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(o.reason)}</p>` : ''}
                        <div class="flex flex-wrap items-center gap-2 mt-2">
                            ${estadoBadge}
                            ${o.allDays ? `<span class="text-[9px] text-slate-400">Desde ${escapeHtml(o.start)}</span>` : `<span class="text-[9px] text-slate-400">${escapeHtml(o.start)} → ${escapeHtml(o.end || '')}</span>`}
                        </div>
                    </div>
                    <div class="flex flex-col gap-1 shrink-0">
                        <button onclick="toggleOmniBanCompleted('${escapeAttr(o.id)}')" class="text-slate-400 hover:text-emerald-500 transition p-1">
                            <i class="fa-${completado ? 'solid fa-circle-check text-emerald-500' : 'regular fa-circle'}"></i>
                        </button>
                        <button onclick="deleteOmniBan('${escapeAttr(o.id)}')" class="text-slate-300 hover:text-red-500 transition p-1">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
