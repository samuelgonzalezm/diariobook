// ==========================================
// OMNIMAPP - Autenticación (Login, Registro, Sesión)
// ==========================================

let userKey = "";
let currentUserData = {};

function switchAuthTab(tab) {
    if(tab === 'login') {
        document.getElementById('tabBtnLogin').classList.replace('text-slate-500', 'text-indigo-600');
        document.getElementById('tabBtnLogin').classList.add('bg-white', 'shadow');
        document.getElementById('tabBtnRegister').classList.remove('bg-white', 'shadow');
        document.getElementById('tabBtnRegister').classList.replace('text-indigo-600', 'text-slate-500');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    } else {
        document.getElementById('tabBtnRegister').classList.replace('text-slate-500', 'text-indigo-600');
        document.getElementById('tabBtnRegister').classList.add('bg-white', 'shadow');
        document.getElementById('tabBtnLogin').classList.remove('bg-white', 'shadow');
        document.getElementById('tabBtnLogin').classList.replace('text-indigo-600', 'text-slate-500');
        document.getElementById('registerForm').classList.remove('hidden');
        document.getElementById('loginForm').classList.add('hidden');
    }
}

async function handleLogin() {
    const reg = document.getElementById('loginRegNumber').value.trim();
    const pass = document.getElementById('loginPassKey').value.trim();
    const remember = document.getElementById('rememberMe').checked;
    if (!isValidRegNumber(reg)) return toastAlert('El N° de registro debe tener 8 dígitos.', 'error');
    if (!isValidPassKey(pass)) return toastAlert('La clave debe tener mínimo 4 caracteres.', 'error');

    const passHash = await hashPassword(pass);
    db.ref(`users/${reg}`).once('value', async snapshot => {
        const val = snapshot.val();
        if (!val) return toastAlert('N° de registro o clave incorrecta.', 'error');
        
        if (val.pass && !val.passHash) {
            if (val.pass === pass) {
                await db.ref(`users/${reg}`).update({ passHash, pass: null });
                delete val.pass; val.passHash = passHash;
            } else return toastAlert('N° de registro o clave incorrecta.', 'error');
        } else if (val.passHash) {
            if (val.passHash !== passHash) return toastAlert('N° de registro o clave incorrecta.', 'error');
        } else return toastAlert('N° de registro o clave incorrecta.', 'error');

        userKey = buildUserKeyFromHash(reg, passHash);
        currentUserData = val;
        if (remember) {
            localStorage.setItem('omniapp_saved_reg', reg);
            localStorage.setItem('omniapp_saved_pass', pass);
        } else {
            localStorage.removeItem('omniapp_saved_reg');
            localStorage.removeItem('omniapp_saved_pass');
        }
        localStorage.setItem('omniapp_active_userKey', userKey);
        localStorage.setItem('omniapp_active_userReg', reg);
        
        // Esta función viene de app.js
        if (typeof unlockApp === 'function') unlockApp();
        showToast(`¡Bienvenido, ${val.firstName}!`, 'success');
    });
}

async function handleRegister() {
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const reg = document.getElementById('regRegNumber').value.trim();
    const pass = document.getElementById('regPassKey').value.trim();
    
    if (!firstName || !lastName || !reg || !pass) return toastAlert('Completa todos los campos.', 'error');
    if (!isValidRegNumber(reg)) return toastAlert('El N° de registro debe tener 8 dígitos.', 'error');
    if (!isValidPassKey(pass)) return toastAlert('La clave debe tener mínimo 4 caracteres.', 'error');

    const passHash = await hashPassword(pass);
    db.ref(`users/${reg}`).once('value', snapshot => {
        if(snapshot.exists()) return toastAlert('Este N° de registro ya existe.', 'error');
        const newUser = { firstName, lastName, reg, passHash };
        db.ref(`users/${reg}`).set(newUser, (err) => {
            if(!err) {
                toastAlert('¡Registro exitoso!', 'success');
                switchAuthTab('login');
            } else toastAlert('Error al registrar.', 'error');
        });
    });
}

function checkActiveSession() {
    const savedReg = localStorage.getItem('omniapp_saved_reg');
    const savedPass = localStorage.getItem('omniapp_saved_pass');
    if(savedReg && savedPass) {
        document.getElementById('loginRegNumber').value = savedReg;
        document.getElementById('loginPassKey').value = savedPass;
        document.getElementById('rememberMe').checked = true;
    }
    const activeKey = localStorage.getItem('omniapp_active_userKey');
    const activeReg = localStorage.getItem('omniapp_active_userReg');
    if (activeKey && activeReg) {
        userKey = activeKey;
        db.ref(`users/${activeReg}`).once('value', snapshot => {
            currentUserData = snapshot.val() || {};
            if (typeof unlockApp === 'function') unlockApp();
        });
    }
}

function confirmLogout() {
    if (confirm('¿Seguro que quieres cerrar sesión?')) logout();
}

function logout() {
    localStorage.removeItem('omniapp_active_userKey');
    localStorage.removeItem('omniapp_active_userReg');
    location.reload();
}

function updateProfileUI() {
    const firstName = currentUserData.firstName || 'Usuario';
    const sidebar = document.getElementById('sidebarUserReg');
    const drawer = document.getElementById('drawer-user-reg');
    const greeting = document.getElementById('userGreeting');
    
    if (greeting) greeting.innerText = `¡Hola, ${firstName}!`;
    if (sidebar) sidebar.innerText = `Reg: ${currentUserData.reg || '--------'}`;
    if (drawer) drawer.innerText = `Reg: ${currentUserData.reg || '--------'}`;
}
