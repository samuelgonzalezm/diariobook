// ==========================================
// OMNIMAPP - Agenda, Tareas y Horario
// ==========================================

let editingHorarioId = null;
let taskFilter = 'all';
let tasks = [];
let horario = [];

// Variables para el modal
let selectedDayChipsModal = ['1']; // Lunes por defecto

// --- TAREAS ---
function handleAddTask(e) {
    e.preventDefault();
    const desc = document.getElementById('task-title').value.trim();
    const priority = document.getElementById('task-priority').value;
    const category = document.getElementById('task-category').value;
    const date = document.getElementById('task-date').value;
    if (!desc) return;
    
    db.ref(`${userKey}/tasks`).push({ desc, priority, category, date, completed: false });
    document.getElementById('form-add-task').reset();
    
    // initDates() está en app.js
    if (typeof initDates === 'function') initDates();
    
    showToast('Tarea agregada', 'success');
}

function filterTasks(type) {
    taskFilter = type;
    document.querySelectorAll('.filter-task-btn').forEach(b => {
        b.classList.replace('bg-brand-500', 'bg-slate-200');
        b.classList.replace('text-white', 'text-slate-600');
    });
    const activeBtn = document.getElementById('ftask-' + type);
    if (activeBtn) {
        activeBtn.classList.replace('bg-slate-200', 'bg-brand-500');
        activeBtn.classList.replace('text-slate-600', 'text-white');
    }
    renderTasks();
}

function toggleTaskComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) db.ref(`${userKey}/tasks/${id}`).update({ completed: !task.completed });
}

function deleteTask(id) {
    if (confirm('¿Eliminar esta tarea?')) {
        db.ref(`${userKey}/tasks/${id}`).remove();
        showToast('Tarea eliminada', 'info', 2000);
    }
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    if (!container) return;
    
    let list = tasks;
    if (taskFilter === 'pending') list = list.filter(t => !t.completed);
    if (taskFilter === 'completed') list = list.filter(t => t.completed);
    
    if (list.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">No hay tareas pendientes.</p>`;
        return;
    }
    container.innerHTML = list.map((t, idx) => `
        <div class="stagger-item hover-card bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3" style="animation-delay: ${Math.min(idx * 30, 300)}ms">
            <div class="flex items-center space-x-3 flex-1 min-w-0">
                <button onclick="toggleTaskComplete('${escapeAttr(t.id)}')" class="text-lg text-slate-400 hover:text-brand-purple transition shrink-0">
                    <i class="fa-${t.completed ? 'solid fa-circle-check text-brand-purple' : 'regular fa-circle'}"></i>
                </button>
                <div class="truncate">
                    <p class="text-xs sm:text-sm font-medium ${t.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'} truncate">${escapeHtml(t.desc)}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30">${escapeHtml(t.priority || 'Media')}</span>
                        <span class="text-[10px] text-slate-400">${escapeHtml(t.category || 'General')} • ${escapeHtml(t.date || 'Sin fecha')}</span>
                    </div>
                </div>
            </div>
            <button onclick="deleteTask('${escapeAttr(t.id)}')" class="text-slate-300 hover:text-red-500 transition p-1">
                <i class="fa-solid fa-trash-can text-sm"></i>
            </button>
        </div>
    `).join('');
}

// --- HORARIO ---
function toggleAgendaView(view) {
    const pBtn = document.getElementById('btn-view-planner');
    const hBtn = document.getElementById('btn-view-horario');
    if (view === 'planner') {
        document.getElementById('subview-planner').classList.remove('hidden');
        document.getElementById('subview-horario').classList.add('hidden');
        pBtn.className = "flex-1 py-1.5 text-xs font-semibold rounded-lg transition shadow bg-white dark:bg-slate-700 text-brand-purple";
        hBtn.className = "flex-1 py-1.5 text-xs font-semibold rounded-lg transition text-slate-600 dark:text-slate-400";
    } else {
        document.getElementById('subview-planner').classList.add('hidden');
        document.getElementById('subview-horario').classList.remove('hidden');
        hBtn.className = "flex-1 py-1.5 text-xs font-semibold rounded-lg transition shadow bg-white dark:bg-slate-700 text-brand-purple";
        pBtn.className = "flex-1 py-1.5 text-xs font-semibold rounded-lg transition text-slate-600 dark:text-slate-400";
    }
}

function openModalHorario() {
    editingHorarioId = null;
    document.getElementById('modal-horario-title').innerHTML = '<i class="fa-solid fa-clock text-brand-purple"></i> Agregar Bloque';
    document.getElementById('horario-submit-btn').innerText = 'Agregar Bloque';
    document.getElementById('horario-title').value = '';
    document.getElementById('horario-start-time').value = '08:00';
    document.getElementById('horario-end-time').value = '09:00';
    
    document.querySelectorAll('#modal-days-box .day-chip[data-day]').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.day === '1');
    });
    updateAllDaysChipState();
    document.getElementById('modal-horario').classList.remove('hidden');
}

function openModalHorarioEdit(blockId) {
    const block = horario.find(b => b.id === blockId);
    if (!block) return;
    
    editingHorarioId = blockId;
    document.getElementById('modal-horario-title').innerHTML = '<i class="fa-solid fa-pen text-brand-purple"></i> Editar Bloque';
    document.getElementById('horario-submit-btn').innerText = 'Guardar Cambios';
    document.getElementById('horario-title').value = block.activity || '';
    
    const times = parseHourLabelToInputs(block.hour || '');
    document.getElementById('horario-start-time').value = times.start || '08:00';
    document.getElementById('horario-end-time').value = times.end || '09:00';

    document.querySelectorAll('#modal-days-box .day-chip[data-day]').forEach(chip => {
        chip.classList.toggle('active', parseInt(chip.dataset.day) === block.day);
    });
    updateAllDaysChipState();
    document.getElementById('modal-horario').classList.remove('hidden');
}

function closeModalHorario() { 
    document.getElementById('modal-horario').classList.add('hidden'); 
    editingHorarioId = null;
}

function toggleModalDayChip(btn) {
    btn.classList.toggle('active');
    updateAllDaysChipState();
}

function toggleAllDaysModal() {
    const dayChips = document.querySelectorAll('#modal-days-box .day-chip[data-day]');
    const allChip = document.getElementById('chip-all-days');
    const shouldActivateAll = !allChip.classList.contains('active');
    dayChips.forEach(chip => {
        if (shouldActivateAll) chip.classList.add('active');
        else chip.classList.remove('active');
    });
    if (shouldActivateAll) allChip.classList.add('active');
    else allChip.classList.remove('active');
}

function updateAllDaysChipState() {
    const dayChips = document.querySelectorAll('#modal-days-box .day-chip[data-day]');
    const activeChips = document.querySelectorAll('#modal-days-box .day-chip[data-day].active');
    const allChip = document.getElementById('chip-all-days');
    if (dayChips.length === activeChips.length) allChip.classList.add('active');
    else allChip.classList.remove('active');
}

function handleSaveHorario(e) {
    e.preventDefault();
    const activity = document.getElementById('horario-title').value.trim();
    const startTime = document.getElementById('horario-start-time').value;
    const endTime = document.getElementById('horario-end-time').value;

    if (!activity) return toastAlert('Escribe el título.', 'warning');
    if (!startTime || !endTime) return toastAlert('Selecciona hora inicio y fin.', 'warning');
    if (startTime === endTime) return toastAlert('La hora inicio y fin no pueden ser iguales.', 'warning');

    const hourLabel = buildHourLabel(startTime, endTime);
    const selectedDayChips = document.querySelectorAll('#modal-days-box .day-chip[data-day].active');
    if (selectedDayChips.length === 0) return toastAlert('Selecciona al menos un día.', 'warning');

    if (editingHorarioId) {
        const day = parseInt(selectedDayChips[0].getAttribute('data-day'));
        db.ref(`${userKey}/timeblocks/${editingHorarioId}`).update({
            activity, hour: hourLabel, day
        });
        showToast('Bloque actualizado', 'success');
    } else {
        selectedDayChips.forEach(chip => {
            const day = parseInt(chip.getAttribute('data-day'));
            db.ref(`${userKey}/timeblocks`).push({ activity, hour: hourLabel, day });
        });
        showToast(`Bloque agregado a ${selectedDayChips.length} día(s)`, 'success');
    }
    closeModalHorario();
}

function deleteHorarioItem(id) { 
    if (confirm('¿Eliminar este bloque?')) {
        db.ref(`${userKey}/timeblocks/${id}`).remove();
        showToast('Bloque eliminado', 'info', 2000);
    }
}

function renderHorario() {
    const container = document.getElementById('horario-grid-body');
    if (!container) return;
    
    const days = [1, 2, 3, 4, 5, 6, 0];
    // Esta constante viene de app.js
    const CUSTOM_HOURS = window.CUSTOM_HOURS || []; 
    
    let html = '';
    CUSTOM_HOURS.forEach(h => {
        html += `<div class="p-2 font-bold text-slate-500 dark:text-slate-400 text-[10px] bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center justify-center text-center leading-tight">${escapeHtml(h)}</div>`;
        days.forEach(d => {
            const blocksForThisCell = horario.filter(item => item.day == d && item.hour == h);

            if (blocksForThisCell.length > 0) {
                const block = blocksForThisCell[0];
                html += `
                    <div class="horario-block p-1.5 rounded-lg grad-bg text-white text-[10px] font-semibold shadow-sm flex flex-col justify-between relative"
                         onclick="openModalHorarioEdit('${escapeAttr(block.id)}')">
                        <i class="fa-solid fa-pen edit-indicator text-white"></i>
                        <span class="truncate">${escapeHtml(block.activity)}</span>
                        <button onclick="event.stopPropagation(); deleteHorarioItem('${escapeAttr(block.id)}')" class="text-white/70 hover:text-white text-[9px] text-right mt-1">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>`;
            } else {
                html += `<div class="p-2 rounded-lg bg-slate-100/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800"></div>`;
            }
        });
    });
    container.innerHTML = html;
}
