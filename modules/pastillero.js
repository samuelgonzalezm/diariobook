// ==========================================
// OMNIMAPP - Pastillero
// ==========================================

let pills = [];
let notifiedPills = {}; // Evitar notificaciones duplicadas

// Calcula la próxima hora de toma
function getNextPillTime(startTime, intervalHours) {
    const now = new Date();
    const [startH, startM] = startTime.split(':').map(Number);
    const interval = parseInt(intervalHours) || 8;
    let pillDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0, 0);
    
    while (pillDate <= now) {
        pillDate.setHours(pillDate.getHours() + interval);
    }
    
    const formattedTime = pillDate.toTimeString().substring(0,5);
    const isTomorrow = pillDate.getDate() !== now.getDate();
    
    return {
        nextDateObj: pillDate, 
        formattedTime,
        displayLabel: isTomorrow ? `${formattedTime} hrs (Mañana)` : `${formattedTime} hrs`
    };
}

// Guardar medicamento
function handleSavePill(e) {
    e.preventDefault();
    const name = document.getElementById('pillName').value.trim();
    const dose = document.getElementById('pillDose').value.trim();
    const interval = document.getElementById('pillInterval').value;
    const startTime = document.getElementById('pillStartTime').value;
    
    if(!name || !dose || !startTime) return;
    
    db.ref(`${userKey}/pills`).push({ name, dose, interval, startTime }, (err) => {
        if(!err) {
            document.getElementById('pillName').value = '';
            document.getElementById('pillDose').value = '';
            showToast('Medicamento agregado', 'success');
        }
    });
}

// Eliminar medicamento
function deletePill(id) {
    if (confirm('¿Eliminar este medicamento?')) {
        db.ref(`${userKey}/pills/${id}`).remove();
        showToast('Medicamento eliminado', 'info', 2000);
    }
}

// Renderizar lista
function renderPills() {
    const container = document.getElementById('pills-container');
    if (!container) return;
    
    if (pills.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">No tienes medicamentos registrados.</p>`;
        return;
    }
    
    container.innerHTML = pills.map((p, idx) => {
        const nextPill = getNextPillTime(p.startTime, p.interval);
        return `
            <div class="stagger-item hover-card bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3" style="animation-delay: ${Math.min(idx * 40, 300)}ms">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-lg font-bold shrink-0">💊</div>
                    <div>
                        <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">${escapeHtml(p.name)}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(p.dose)} • Cada ${escapeHtml(p.interval)} hrs</p>
                        <div class="flex items-center gap-1.5 mt-1">
                            <span id="pill-next-${escapeAttr(p.id)}" class="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                <i class="fa-solid fa-bell text-indigo-500"></i> Próxima toma: <span class="pill-next-label">${escapeHtml(nextPill.displayLabel)}</span>
                            </span>
                        </div>
                    </div>
                </div>
                <button onclick="deletePill('${escapeAttr(p.id)}')" class="text-slate-300 hover:text-red-500 transition p-2">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </div>
        `;
    }).join('');
}

// Actualizar solo las etiquetas de "Próxima toma" (para no re-renderizar todo)
function updatePillLabels() {
    pills.forEach(p => {
        const container = document.getElementById(`pill-next-${p.id}`);
        if (!container) return;
        const label = container.querySelector('.pill-next-label');
        if (!label) return;
        const nextPill = getNextPillTime(p.startTime, p.interval);
        label.textContent = nextPill.displayLabel;
    });
}

// Revisión periódica para notificaciones
function checkPillNotifications() {
    const now = new Date();
    pills.forEach(pill => {
        const nextPill = getNextPillTime(pill.startTime, pill.interval);
        const timeDiff = Math.abs(now - nextPill.nextDateObj);
        const pillKey = `${pill.id}_${nextPill.formattedTime}_${now.toDateString()}`;
        
        if (timeDiff <= 60000 && !notifiedPills[pillKey]) {
            notifiedPills[pillKey] = true;
            if (typeof sendSystemNotification === 'function') {
                sendSystemNotification("Hora de tomar medicamento", `Te toca tomar: ${pill.name} (${pill.dose})`);
            }
        }
    });
}

// Iniciar el intervalo de revisión
setInterval(() => {
    checkPillNotifications();
    // Si estamos en la pestaña del pastillero, actualizamos los textos sin re-renderizar
    if (window.currentTab === 'pastillero') {
        updatePillLabels();
    }
}, 30000);
