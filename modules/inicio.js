// ==========================================
// OMNIMAPP - Dashboard Inicio
// ==========================================

let homeTimer = null;

// Convertir "8:30 a.m" a minutos totales del día (ej: 8:30 = 510)
function parseHourLabel(label) {
    if (!label) return null;
    const part = label.split(' a ')[0].trim();
    const match = part.match(/^(\d{1,2}):(\d{2})\s*(a\.m|p\.m|am|pm)?/i);
    if (!match) return null;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const ap = (match[3] || '').toLowerCase();
    if (ap.includes('p') && h < 12) h += 12;
    if (ap.includes('a') && h === 12) h = 0;
    return h * 60 + m;
}

// Convertir la hora de fin "9:00 a.m" a minutos
function parseHourEndLabel(label) {
    if (!label) return null;
    const parts = label.split(' a ');
    if (parts.length < 2) return null;
    const part = parts[1].trim();
    const match = part.match(/^(\d{1,2}):(\d{2})\s*(a\.m|p\.m|am|pm)?/i);
    if (!match) return null;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const ap = (match[3] || '').toLowerCase();
    if (ap.includes('p') && h < 12) h += 12;
    if (ap.includes('a') && h === 12) h = 0;
    return h * 60 + m;
}

function renderHome() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';

    // Actualizar reloj y saludo
    const homeHourEl = document.getElementById('home-hour');
    if (!homeHourEl) return; // Si no estamos en la vista correcta, no hacemos nada

    homeHourEl.innerText = `${hh}:${mm}`;
    document.getElementById('home-ampm').innerText = ampm;
    
    if (typeof getGreeting === 'function') {
        document.getElementById('home-greeting').innerText = `${getGreeting()}, ${currentUserData.firstName || 'Usuario'}!`;
    }
    document.getElementById('home-date').innerText = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    const today = now.getDay();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    // 1. Actividad AHORA y SIGUIENTE
    const todayBlocks = horario.filter(b => b.day == today);
    const withTime = todayBlocks.map(b => ({
        ...b,
        startMin: parseHourLabel(b.hour),
        endMin: parseHourEndLabel(b.hour) || (parseHourLabel(b.hour) + 60)
    })).filter(b => b.startMin !== null).sort((a,b) => a.startMin - b.startMin);

    const currentBlock = withTime.find(b => nowMinutes >= b.startMin && nowMinutes < b.endMin);
    const nextBlock = withTime.find(b => b.startMin > nowMinutes);

    const nowCard = document.getElementById('home-now-content');
    if (currentBlock) {
        nowCard.innerHTML = `
            <p class="text-lg font-black leading-tight">${escapeHtml(currentBlock.activity)}</p>
            <p class="text-xs opacity-90 mt-1">${escapeHtml(currentBlock.hour)}</p>
        `;
    } else {
        nowCard.innerHTML = `
            <p class="text-sm opacity-80">Sin actividad programada</p>
            <p class="text-[10px] opacity-70 mt-1">Añade bloques en Agenda → Horario</p>
        `;
    }

    const nextCard = document.getElementById('home-next-content');
    if (nextBlock) {
        const diffMin = nextBlock.startMin - nowMinutes;
        const diffText = diffMin < 60 ? `En ${diffMin} min` : `En ${Math.floor(diffMin/60)}h ${diffMin%60}min`;
        nextCard.innerHTML = `
            <p class="text-base font-bold text-slate-800 dark:text-white leading-tight">${escapeHtml(nextBlock.activity)}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(nextBlock.hour)} • <span class="text-indigo-500 font-bold">${diffText}</span></p>
        `;
    } else {
        nextCard.innerHTML = `<p class="text-sm text-slate-400">No hay más actividades hoy</p>`;
    }

    // 2. Próxima pastilla
    const pillCard = document.getElementById('home-pill-content');
    if (pills.length === 0) {
        pillCard.innerHTML = `<p class="text-sm text-slate-400">Sin medicamentos programados</p>`;
    } else {
        let closest = null;
        pills.forEach(p => {
            // getNextPillTime viene de pastillero.js
            const n = getNextPillTime(p.startTime, p.interval);
            if (!closest || n.nextDateObj < closest.nextPill.nextDateObj) {
                closest = { pill: p, nextPill: n };
            }
        });
        if (closest) {
            const diffMs = closest.nextPill.nextDateObj - now;
            const diffMin = Math.round(diffMs / 60000);
            const diffText = diffMin < 60 ? `En ${diffMin} min` : `En ${Math.floor(diffMin/60)}h ${diffMin%60}min`;
            pillCard.innerHTML = `
                <p class="text-base font-bold text-slate-800 dark:text-white leading-tight">${escapeHtml(closest.pill.name)}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(closest.pill.dose)}</p>
                <p class="text-xs text-red-500 font-bold mt-1">${diffText} • ${escapeHtml(closest.nextPill.formattedTime)} hrs</p>
            `;
        }
    }
}

function startHomeTimer() {
    if (homeTimer) clearInterval(homeTimer);
    homeTimer = setInterval(() => {
        if (window.currentTab === 'inicio') renderHome();
    }, 30000);
}
