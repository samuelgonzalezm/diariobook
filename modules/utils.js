// ==========================================
// OMNIMAPP - Utilidades generales
// ==========================================

// --- TOASTS ---
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    toast.innerHTML = `
        <span style="font-size:1.1rem; flex-shrink:0;">${icons[type] || icons.info}</span>
        <span style="flex:1;">${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function toastAlert(message, type = 'info') { showToast(message, type, 3500); }

// --- SEGURIDAD Y SANITIZACIÓN ---
const FIREBASE_FORBIDDEN_CHARS = /[.#$\[\]\/\u0000-\u001F\u007F]/g;

function sanitizeForKey(str) {
    if (str == null) return '';
    return String(str).replace(FIREBASE_FORBIDDEN_CHARS, '_');
}

function isValidPassKey(pass) { return /^[a-z0-9]{4,}$/.test(pass); }
function isValidRegNumber(reg) { return /^\d{8}$/.test(reg); }

function buildUserKeyFromHash(reg, passHash) {
    const safeReg = sanitizeForKey(reg);
    const safeHash = sanitizeForKey(passHash);
    return `user_${safeReg}_${safeHash.substring(0, 24)}`;
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- HORAS (Formato y Parseo) ---
function formatTime12h(time24) {
    if (!time24 || !time24.includes(':')) return '';
    const [hh, mm] = time24.split(':').map(Number);
    const ampm = hh >= 12 ? 'p.m' : 'a.m';
    let h12 = hh % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}

function buildHourLabel(startTime24, endTime24) {
    const start = formatTime12h(startTime24);
    const end = formatTime12h(endTime24);
    if (!start || !end) return '';
    if (start === end) return start;
    return `${start} a ${end}`;
}

function parseHourLabelToInputs(label) {
    if (!label) return { start: '', end: '' };
    const parts = label.split(' a ');
    const parsePart = (str) => {
        if (!str) return '';
        const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(a\.m|p\.m|am|pm)?/i);
        if (!match) return '';
        let h = parseInt(match[1]);
        const m = parseInt(match[2]);
        const ap = (match[3] || '').toLowerCase().replace(/\./g, '');
        if (ap.includes('pm') && h < 12) h += 12;
        if (ap.includes('am') && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    if (parts.length === 1) {
        const t = parsePart(parts[0]);
        return { start: t, end: t };
    }
    return {
        start: parsePart(parts[0]),
        end: parsePart(parts[1])
    };
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
}
