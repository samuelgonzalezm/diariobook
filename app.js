// ==========================================
// OMNIMAPP - Lógica principal y Navegación
// ==========================================

let currentTab = 'inicio';

// Horas personalizadas para el Horario
const CUSTOM_HOURS = [
    "6:00 a.m", "6:30 a.m", "7:30 a.m", "8:00 a.m",
    "8:30 a.m a 9:00 a.m", "9:00 a.m a 10:00 a.m",
    "10:00 a.m a 10:15 a.m", "10:15 a.m a 10:55 a.m",
    "10:55 a.m a 11:10 a.m", "11:10 a.m a 11:50 a.m",
    "11:50 a.m a 12:00 p.m", "12:00 p.m",
    "12:10 p.m a 1:10 p.m", "1:10 p.m a 2:00 p.m",
    "2:00 p.m a 2:10 p.m", "2:10 p.m", "2:20 p.m",
    "3:00 p.m a 3:45 p.m", "3:45 p.m a 4:00 p.m",
    "4:00 p.m a 4:50 p.m", "4:50 p.m a 5:00 p.m",
    "5:00 p.m a 5:55 p.m", "6:00 p.m a 7:00 p.m",
    "7:00 p.m a 7:15 p.m", "7:15 p.m a 8:30 p.m",
    "8:30 p.m", "9:00 a 9:40 pm", "9:40 p.m", "10:00 p.m"
];
window.CUSTOM_HOURS = CUSTOM_HOURS;

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('omniapp_theme', isDark ? 'dark' : 'light');
}

function requestNotificationPermission() {
    if (!("Notification" in window)) return toastAlert("Este navegador no soporta notificaciones.", 'warning');
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            toastAlert("¡Notificaciones activadas!", 'success');
            sendSystemNotification("Omniapp", "Notificaciones activadas.");
        } else toastAlert("Habilita los permisos en tu navegador.", 'warning');
    });
}

function sendSystemNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body: body,
                    icon: './icons/web-app-manifest-192x192.png',
                    badge: './icons/web-app-manifest-192x192.png',
                    vibrate: [200, 100, 200]
                });
            });
        } else {
            new Notification(title, {
                body: body, icon: './icons/web-app-manifest-192x192.png'
            });
        }
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW:', err));
}

function toggleMobileDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('mobile-drawer-overlay');
    const fab = document.getElementById('fab-menu');
    if (drawer.classList.contains('open')) {
        closeMobileDrawer();
    } else {
        drawer.classList.add('open');
        overlay.classList.add('open');
        fab.classList.add('rotated');
        fab.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        updateDrawerActive();
    }
}

function closeMobileDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('mobile-drawer-overlay');
    const fab = document.getElementById('fab-menu');
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    fab.classList.remove('rotated');
    fab.innerHTML = '<i class="fa-solid fa-bars"></i>';
}

function switchTabAndClose(tabName) {
    switchTab(tabName);
    closeMobileDrawer();
}

function updateDrawerActive() {
    document.querySelectorAll('.drawer-nav-btn[data-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentTab);
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    window.currentTab = tabName; 
    
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('tab-' + tabName);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-brand-purple', 'bg-brand-50', 'dark:bg-slate-800', 'font-bold');
    });
    const dBtn = document.getElementById('d-nav-' + tabName);
    if (dBtn) dBtn.classList.add('text-brand-purple', 'bg-brand-50', 'dark:bg-slate-800', 'font-bold');

    const viewport = document.getElementById('app-viewport');
    if (viewport) viewport.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabName === 'chat') {
        setTimeout(() => {
            const chatBox = document.getElementById('chat-messages');
            if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        }, 100);
    }

    // --- LÓGICA PARA EL BOTÓN FLOTANTE DEL SÚPER ---
    const fabStore = document.getElementById('fab-store-menu');
    const menuStore = document.getElementById('store-menu-dropdown');

    if (tabName === 'super') {
        if (fabStore) fabStore.classList.remove('hidden');
        if (fabStore) fabStore.classList.add('flex');
    } else {
        if (fabStore) fabStore.classList.add('hidden');
        if (fabStore) fabStore.classList.remove('flex');
        if (menuStore) menuStore.classList.add('hidden'); // Cerrar menú al salir
    }
    // -----------------------------------------------

    if (tabName === 'inicio' && typeof renderHome === 'function') renderHome();
    if (tabName === 'super' && typeof renderSuper === 'function') renderSuper();
}

function initDates() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const todayStr = new Date().toLocaleDateString('es-ES', options);
    const dateEl = document.getElementById('current-date-display');
    if (dateEl) dateEl.innerText = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);
    
    const devDateEl = document.getElementById('dev-today-date');
    if (devDateEl) devDateEl.innerText = new Date().toLocaleDateString('es-ES');
    
    const todayInput = new Date().toISOString().split('T')[0];
    
    if (document.getElementById('task-date')) document.getElementById('task-date').value = todayInput;
    if (document.getElementById('migDate')) document.getElementById('migDate').value = todayInput;
    if (document.getElementById('migTime')) document.getElementById('migTime').value = new Date().toTimeString().substring(0,5);
    if (document.getElementById('pillStartTime')) document.getElementById('pillStartTime').value = new Date().toTimeString().substring(0,5);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    if (document.getElementById('omniban-start')) document.getElementById('omniban-start').value = todayInput;
    if (document.getElementById('omniban-end')) document.getElementById('omniban-end').value = tomorrowStr;
}

function listenToDatabase() {
    db.ref(`${userKey}/tasks`).on('value', snapshot => {
        const data = snapshot.val() || {};
        tasks = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        if (typeof renderTasks === 'function') renderTasks();
        if (typeof renderHome === 'function') renderHome();
    });

    db.ref(`${userKey}/timeblocks`).on('value', snapshot => {
        const data = snapshot.val() || {};
        horario = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        if (typeof renderHorario === 'function') renderHorario();
        if (typeof renderHome === 'function') renderHome();
    });

    db.ref(`${userKey}/pills`).on('value', snapshot => {
        const data = snapshot.val() || {};
        pills = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        if (typeof renderPills === 'function') renderPills();
        if (typeof renderHome === 'function') renderHome();
    });

    db.ref(`${userKey}/migraines`).on('value', snapshot => {
        const data = snapshot.val() || {};
        migraines = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        if (typeof renderMigraines === 'function') renderMigraines();
    });

    db.ref(`${userKey}/notes`).on('value', snapshot => {
        const data = snapshot.val() || {};
        devotionals = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        if (typeof renderDevotionals === 'function') renderDevotionals();
    });

    db.ref(`${userKey}/stores`).on('value', snapshot => {
        stores = snapshot.val() || {};
        if (typeof renderSuper === 'function') renderSuper();
    });

    db.ref(`${userKey}/chat`).on('value', snapshot => {
        const data = snapshot.val() || {};
        chat = Object.keys(data).map(k => ({ id: k, ...data[k] }))
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        if (typeof renderChat === 'function') renderChat();
    });

    db.ref(`${userKey}/omniban`).on('value', snapshot => {
        const data = snapshot.val() || {};
        omniban = Object.keys(data).map(k => ({ id: k, ...data[k] }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (typeof renderOmniBan === 'function') renderOmniBan();
    });
}

function unlockApp() {
    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('appLayout').classList.remove('hidden');
    
    initDates();
    if (typeof updateProfileUI === 'function') updateProfileUI();
    
    listenToDatabase();
    switchTab('inicio');
    
    if (typeof startHomeTimer === 'function') startHomeTimer();
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkActiveSession === 'function') checkActiveSession();
});
