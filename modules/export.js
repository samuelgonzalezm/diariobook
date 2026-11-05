// ==========================================
// OMNIMAPP - Exportar datos (CSV / PDF)
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

// --- 1. BACKUP COMPLETO (ZIP con CSVs) ---
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
            reg: currentUserData.reg || '', tieneHash: currentUserData.passHash ? 'Sí' : 'No',
            dineroRecibido: receivedMoney || 0
        }], ['firstName', 'lastName', 'reg', 'tieneHash', 'dineroRecibido']));

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

        // 7. Súper
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

// --- 2. INFORME DE GASTOS (PDF) ---
async function downloadExpensesPDF() {
    if (!userKey || !currentUserData) return toastAlert('Debes iniciar sesión.', 'warning');
    if (typeof window.jspdf === 'undefined') return toastAlert('Error: recarga la página.', 'error');

    showToast('Generando reporte de gastos...', 'info', 2000);

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let fontName = 'helvetica';
        if (typeof dmSansRegularBase64 !== 'undefined' && dmSansRegularBase64) {
            doc.addFileToVFS('DMSans-Regular.ttf', dmSansRegularBase64);
            doc.addFont('DMSans-Regular.ttf', 'DMSans', 'normal');
            doc.addFileToVFS('DMSans-Bold.ttf', dmSansBoldBase64);
            doc.addFont('DMSans-Bold.ttf', 'DMSans', 'bold');
            fontName = 'DMSans';
        }

        const userName = `${currentUserData.firstName || ''} ${currentUserData.lastName || ''}`.trim() || 'Usuario';
        const storeNames = { 
            mercado: 'Mercado', costco: 'Costco', sams: "Sam's", 
            zorro: 'El Zorro', monarca: 'Monarca', extras: 'Extras',
            farmacia: 'Farmacia', thanksgiving: 'Thanksgiving' 
        };

        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont(fontName, 'bold');
        doc.setFontSize(22);
        doc.text('Reporte de Gastos', 15, 15);
        doc.setFont(fontName, 'normal');
        doc.setFontSize(12);
        doc.text('Mi Súper — Omniapp', 15, 23);
        doc.setFontSize(9);
        doc.text('Generado: ' + new Date().toLocaleString('es-ES'), 15, 30);

        doc.setTextColor(30, 41, 59);
        doc.setFont(fontName, 'bold');
        doc.setFontSize(11);
        doc.text('Usuario:', 15, 50);
        doc.setFont(fontName, 'normal');
        doc.text(userName, 40, 50);

        doc.setFont(fontName, 'bold');
        doc.text('N° Registro:', 15, 57);
        doc.setFont(fontName, 'normal');
        doc.text(currentUserData.reg || '--', 45, 57);

        let granTotal = 0;
        const storeTotals = {};
        const allItems = [];

        Object.keys(storeNames).forEach(storeKey => {
            const items = stores[storeKey] || {};
            let storeTotal = 0;
            
            Object.keys(items).forEach(k => {
                const item = items[k];
                const price = parseFloat(item.price) || 0;
                storeTotal += price;
                
                if (item.name) {
                    allItems.push({
                        tienda: storeNames[storeKey],
                        producto: item.name,
                        cantidad: item.qty || '-',
                        precio: price
                    });
                }
            });
            
            storeTotals[storeKey] = storeTotal;
            granTotal += storeTotal;
        });

        const balance = receivedMoney - granTotal;
        const isPositive = balance >= 0;

        doc.setFont(fontName, 'bold');
        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Resumen Financiero', 15, 75);

        doc.setFont(fontName, 'normal');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(`Total Recibido: $${receivedMoney.toFixed(2)}`, 15, 85);
        doc.text(`Gasto Total: $${granTotal.toFixed(2)}`, 15, 92);
        
        if (isPositive) {
            doc.setTextColor(16, 185, 129);
            doc.setFont(fontName, 'bold');
            doc.text(`Sobrante: $${balance.toFixed(2)}`, 15, 99);
        } else {
            doc.setTextColor(239, 68, 68);
            doc.setFont(fontName, 'bold');
            doc.text(`Faltante: $${Math.abs(balance).toFixed(2)}`, 15, 99);
        }

        doc.setTextColor(30, 41, 59);
        doc.setFont(fontName, 'bold');
        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Desglose por Tienda', 15, 115);

        let yPos = 125;
        Object.keys(storeTotals).forEach(storeKey => {
            if (storeTotals[storeKey] > 0) {
                doc.setFont(fontName, 'normal');
                doc.setFontSize(10);
                doc.setTextColor(30, 41, 59);
                doc.text(storeNames[storeKey], 15, yPos);
                doc.text(`$${storeTotals[storeKey].toFixed(2)}`, 70, yPos);
                yPos += 7;
            }
        });

        if (allItems.length > 0) {
            doc.setFont(fontName, 'bold');
            doc.setFontSize(14);
            doc.setTextColor(99, 102, 241);
            doc.text('Detalle de Productos', 15, yPos + 10);

            const tableData = allItems.map(item => [
                item.tienda,
                item.producto,
                item.cantidad,
                `$${item.precio.toFixed(2)}`
            ]);

            doc.autoTable({
                startY: yPos + 15,
                head: [['Tienda', 'Producto', 'Cant.', 'Precio']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [99, 102, 241], fontSize: 9, fontStyle: 'bold', font: fontName },
                bodyStyles: { fontSize: 8, cellPadding: 2, font: fontName },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 15, right: 15 },
                columnStyles: {
                    0: { cellWidth: 40 },
                    1: { cellWidth: 80 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 30 }
                }
            });
        } else {
            doc.setFont(fontName, 'normal');
            doc.setFontSize(11);
            doc.setTextColor(150, 150, 150);
            doc.text('No hay productos registrados aún.', 15, yPos + 10);
        }

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont(fontName, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Omniapp  |  Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
        }

        const fileName = `reporte-gastos-${getBackupTimestamp()}.pdf`;
        doc.save(fileName);
        showToast('Reporte de gastos generado', 'success', 3000);
        
    } catch (err) {
        console.error('Error al generar PDF de gastos:', err);
        toastAlert('Error al generar el reporte de gastos.', 'error');
    }
}
