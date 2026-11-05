// ==========================================
// OMNIMAPP - Exportar datos (ZIP con CSVs)
// ==========================================

function arrayToCSV(rows, headers) {
    if (!rows || rows.length === 0) return headers ? headers.join(',') + '\n' : '';
    const allHeaders = headers || Object.keys(rows[0]);
    const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };
    const headerLine = allHeaders.map(escapeCSV).join(',');
    const dataLines = rows.map(row => allHeaders.map(h => escapeCSV(row[h])).join(','));
    return [headerLine, ...dataLines].join('\n');
}

function getBackupTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function exportAllData() {
    if (!userKey || !currentUserData) return toastAlert('Debes iniciar sesión.', 'warning');
    if (typeof JSZip === 'undefined') return toastAlert('Error: recarga la página.', 'error');
    
    showToast('Generando backup...', 'info', 2000);
    
    try {
        const zip = new JSZip();
        const folder = zip.folder(`omniapp-backup-${getBackupTimestamp()}`);
        
        // 1. Usuario
        folder.file('usuario.csv', '\uFEFF' + arrayToCSV([{
            firstName: currentUserData.firstName || '', lastName: currentUserData.lastName || '',
            reg: currentUserData.reg || '', tieneHash: currentUserData.passHash ? 'Sí' : 'No'
        }], ['firstName', 'lastName', 'reg', 'tieneHash']));

        // 2. Tareas
        folder.file('tareas.csv', '\uFEFF' + (tasks.length ? arrayToCSV(tasks.map(t => ({
            descripcion: t.desc || '', prioridad: t.priority || '', categoria: t.category || '',
            fecha: t.date || '', completada: t.completed ? 'Sí' : 'No'
        })), ['descripcion', 'prioridad', 'categoria', 'fecha', 'completada']) : 'descripcion,prioridad,categoria,fecha,completada\n'));

        // 3. Horario
        const dayNames = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
        folder.file('horario.csv', '\uFEFF' + (horario.length ? arrayToCSV(horario.map(h => ({
            dia: dayNames[h.day] || h.day, hora: h.hour || '', actividad: h.activity || ''
        })), ['dia', 'hora', 'actividad']) : 'dia,hora,actividad\n'));

        // 4. Pastillas
        folder.file('pastillas.csv', '\uFEFF' + (pills.length ? arrayToCSV(pills.map(p => ({
            nombre: p.name || '', dosis: p.dose || '', intervalo_horas: p.interval || '', hora_inicio: p.startTime || ''
        })), ['nombre', 'dosis', 'intervalo_horas', 'hora_inicio']) : 'nombre,dosis,intervalo_horas,hora_inicio\n'));

        // 5. Migraña
        folder.file('migrana.csv', '\uFEFF' + (migraines.length ? arrayToCSV(migraines.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).map(m => ({
            fecha: m.date || '', hora: m.time || '', dolor: m.pain || '', duracion_horas: m.duration || '',
            sintomas: Array.isArray(m.symptoms) ? m.symptoms.join(' | ') : '',
            desencadenantes: Array.isArray(m.triggers) ? m.triggers.join(' | ') : '',
            medicamento: m.meds || ''
        })), ['fecha', 'hora', 'dolor', 'duracion_horas', 'sintomas', 'desencadenantes', 'medicamento']) : 'fecha,hora,dolor,duracion_horas,sintomas,desencadenantes,medicamento\n'));

        // 6. Devocional
        folder.file('devocional.csv', '\uFEFF' + (devotionals.length ? arrayToCSV(devotionals.map(d => ({
            categoria: d.category || '', titulo: d.title || '', texto: d.body || d.text || '', fecha: d.date || ''
        })), ['categoria', 'titulo', 'texto', 'fecha']) : 'categoria,titulo,texto,fecha\n'));

        // 7. Súper (incluye las nuevas tiendas)
        const superRows = [];
        const storeNames = { 
            mercado: 'Mercado', costco: 'Costco', sams: "Sam's", 
            zorro: 'El Zorro', monarca: 'Monarca', extras: 'Extras',
            farmacia: 'Farmacia', thanksgiving: 'Thanksgiving' 
        };
        Object.keys(stores || {}).forEach(storeKey => {
            const items = stores[storeKey] || {};
            Object.keys(items).forEach(itemKey => {
                const item = items[itemKey];
                superRows.push({
                    tienda: storeNames[storeKey] || storeKey,
                    producto: item.name || '', cantidad: item.qty || '',
                    precio: item.price || '', comprado: item.done ? 'Sí' : 'No'
                });
            });
        });
        folder.file('super.csv', '\uFEFF' + (superRows.length ? arrayToCSV(superRows, ['tienda', 'producto', 'cantidad', 'precio', 'comprado']) : 'tienda,producto,cantidad,precio,comprado\n'));

        // 8. Leeme
        folder.file('LEEME.txt', `Omniapp - Backup\nUsuario: ${currentUserData.firstName || ''} ${currentUserData.lastName || ''}\nReg: ${currentUserData.reg || ''}\nFecha: ${new Date().toLocaleString('es-ES')}\n`);

        // Generar y descargar
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omniapp-backup-${getBackupTimestamp()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('¡Backup descargado!', 'success', 4000);
        
    } catch (err) {
        console.error('Error:', err);
        toastAlert('Error al generar el backup.', 'error');
    }
}
