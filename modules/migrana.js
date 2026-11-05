// ==========================================
// OMNIMAPP - Control de Migraña y PDF
// ==========================================

let migraines = [];
let selectedPainLevel = 5;

// Cargar fuentes para el PDF
let dmSansRegularBase64 = null;
let dmSansBoldBase64 = null;
let dmSansLoaded = false;

async function loadDMSansForPDF() {
    if (dmSansLoaded) return true;
    try {
        const [resRegular, resBold] = await Promise.all([
            fetch('./fonts/DMSans-Regular.ttf'),
            fetch('./fonts/DMSans-Bold.ttf')
        ]);
        if (!resRegular.ok || !resBold.ok) throw new Error('No se pudieron descargar las fuentes');

        const [bufReg, bufBold] = await Promise.all([
            resRegular.arrayBuffer(),
            resBold.arrayBuffer()
        ]);

        const toBase64 = (buf) => {
            const bytes = new Uint8Array(buf);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                const chunk = bytes.subarray(i, i + chunkSize);
                binary += String.fromCharCode.apply(null, chunk);
            }
            return btoa(binary);
        };

        dmSansRegularBase64 = toBase64(bufReg);
        dmSansBoldBase64 = toBase64(bufBold);
        dmSansLoaded = true;
        return true;
    } catch (err) {
        console.warn('⚠️ No se pudo cargar DM Sans, usando helvetica:', err);
        return false;
    }
}

// --- REGISTRO DE MIGRAÑA ---
function selectPainLevel(level, btn) {
    selectedPainLevel = level;
    document.querySelectorAll('#painScaleBox .pain-btn').forEach(b => b.classList.remove('selected'));
    if(btn) btn.classList.add('selected');
}

function handleSaveMigraineDirect(e) {
    e.preventDefault();
    const date = document.getElementById('migDate').value;
    const time = document.getElementById('migTime').value;
    const duration = parseFloat(document.getElementById('migDuration').value) || 1;
    const meds = document.getElementById('migMeds').value.trim();
    const customTrigger = document.getElementById('migCustomTrigger').value.trim();
    const symptoms = Array.from(document.querySelectorAll('#symptomsChipsBox .tag-chip.active')).map(c => c.innerText);
    const triggers = Array.from(document.querySelectorAll('#triggersChipsBox .tag-chip.active')).map(c => c.innerText);
    
    if(customTrigger) triggers.push(customTrigger);
    if(!date || !time) return toastAlert('Selecciona la fecha y hora.', 'warning');
    
    const episode = { date, time, duration, pain: selectedPainLevel, symptoms, triggers, meds, timestamp: Date.now() };
    
    db.ref(`${userKey}/migraines`).push(episode, (err) => {
        if(!err) {
            toastAlert('Episodio registrado', 'success');
            document.getElementById('migMeds').value = '';
            document.getElementById('migCustomTrigger').value = '';
            document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
        }
    });
}

function deleteMigraine(id) {
    if (confirm('¿Eliminar este episodio?')) {
        db.ref(`${userKey}/migraines/${id}`).remove();
        showToast('Episodio eliminado', 'info', 2000);
    }
}

function renderMigraines() {
    const total = migraines.length;
    document.getElementById('stat-total-migraines').innerText = total;
    
    if (total > 0) {
        const totalPain = migraines.reduce((acc, m) => acc + (parseInt(m.pain) || 0), 0);
        const totalHours = migraines.reduce((acc, m) => acc + (parseFloat(m.duration) || 0), 0);
        const avgPain = (totalPain / total).toFixed(1);
        const avgHours = (totalHours / total).toFixed(1);
        document.getElementById('stat-avg-pain').innerText = avgPain + ' / 10';
        document.getElementById('stat-avg-hours').innerText = avgHours + 'h';
        
        const triggerCounts = {};
        migraines.forEach(m => {
            if(m.triggers && Array.isArray(m.triggers)) {
                m.triggers.forEach(t => triggerCounts[t] = (triggerCounts[t] || 0) + 1);
            }
        });
        const topTrig = Object.keys(triggerCounts).sort((a,b) => triggerCounts[b] - triggerCounts[a])[0] || 'N/A';
        document.getElementById('stat-top-trigger').innerText = topTrig.length > 15 ? topTrig.substring(0, 15) + '...' : topTrig;
        document.getElementById('migPatternInsight').innerHTML = `Se han registrado <strong>${total} episodios</strong>. Detonante más recurrente: <strong>${escapeHtml(topTrig)}</strong>.`;
    } else {
        document.getElementById('stat-avg-pain').innerText = '0.0';
        document.getElementById('stat-avg-hours').innerText = '0h';
        document.getElementById('stat-top-trigger').innerText = 'N/A';
        document.getElementById('migPatternInsight').innerText = 'Registra episodios para analizar patrones.';
    }
    
    const container = document.getElementById('migraine-history-container');
    if (total === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">No hay episodios registrados.</p>`;
        return;
    }
    
    container.innerHTML = migraines.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).map((m, idx) => `
        <div class="stagger-item hover-card bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2" style="animation-delay: ${Math.min(idx * 30, 300)}ms">
            <div class="flex justify-between items-start">
                <div class="flex items-center space-x-2">
                    <span class="w-8 h-8 rounded-xl font-bold text-xs text-white flex items-center justify-center ${m.pain >= 7 ? 'bg-red-500' : m.pain >= 4 ? 'bg-amber-500' : 'bg-blue-500'}">${escapeHtml(m.pain)}</span>
                    <div>
                        <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">Crisis de Migraña</h4>
                        <p class="text-[10px] text-slate-400">${escapeHtml(m.date)} • ${escapeHtml(m.time || '')} (${escapeHtml(m.duration || 1)} hrs)</p>
                    </div>
                </div>
                <button onclick="deleteMigraine('${escapeAttr(m.id)}')" class="text-slate-300 hover:text-red-500 text-xs">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
            ${m.symptoms && m.symptoms.length ? `<p class="text-[11px] text-slate-500"><strong>Síntomas:</strong> ${m.symptoms.map(escapeHtml).join(', ')}</p>` : ''}
            ${m.triggers && m.triggers.length ? `<div class="flex flex-wrap gap-1 text-[10px]">${m.triggers.map(t => `<span class="bg-purple-50 dark:bg-purple-950/40 text-brand-purple px-2 py-0.5 rounded-md font-medium">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            ${m.meds ? `<p class="text-xs text-slate-600 dark:text-slate-300"><i class="fa-solid fa-pills text-brand-blue mr-1"></i> ${escapeHtml(m.meds)}</p>` : ''}
        </div>
    `).join('');
}

// --- GENERACIÓN DE PDF ---
function buildMigrainePDFFileName() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    let h = now.getHours();
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12;
    if (h === 0) h = 12;
    const hh = String(h).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const reg = currentUserData.reg || 'usuario';
    return `${reg}_${day}-${month}-${year}-h${hh}-${mm}${ampm}.pdf`;
}

async function downloadMigrainePDF() {
    if (migraines.length === 0) return toastAlert('No hay episodios para exportar.', 'warning');
    if (typeof window.jspdf === 'undefined') return toastAlert('Error: recarga la página.', 'error');

    showToast('Generando PDF...', 'info', 2000);
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const hasDM = await loadDMSansForPDF();
        let fontName = 'helvetica';
        
        if (hasDM && dmSansRegularBase64 && dmSansBoldBase64) {
            doc.addFileToVFS('DMSans-Regular.ttf', dmSansRegularBase64);
            doc.addFont('DMSans-Regular.ttf', 'DMSans', 'normal');
            doc.addFileToVFS('DMSans-Bold.ttf', dmSansBoldBase64);
            doc.addFont('DMSans-Bold.ttf', 'DMSans', 'bold');
            fontName = 'DMSans';
        }

        const userName = `${currentUserData.firstName || ''} ${currentUserData.lastName || ''}`.trim() || 'Usuario';

        // Encabezado
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont(fontName, 'bold');
        doc.setFontSize(22);
        doc.text('Informe Médico', 15, 15);
        doc.setFont(fontName, 'normal');
        doc.setFontSize(12);
        doc.text('Control de Migraña — Omniapp', 15, 23);
        doc.setFontSize(9);
        doc.text('Generado: ' + new Date().toLocaleString('es-ES'), 15, 30);

        // Datos
        doc.setTextColor(30, 41, 59);
        doc.setFont(fontName, 'bold');
        doc.setFontSize(11);
        doc.text('Paciente:', 15, 50);
        doc.setFont(fontName, 'normal');
        doc.text(userName, 45, 50);
        doc.setFont(fontName, 'bold');
        doc.text('N° Registro:', 15, 57);
        doc.setFont(fontName, 'normal');
        doc.text(currentUserData.reg || '--', 48, 57);
        doc.setFont(fontName, 'bold');
        doc.text('Fecha informe:', 15, 64);
        doc.setFont(fontName, 'normal');
        doc.text(new Date().toLocaleDateString('es-ES'), 55, 64);

        // Estadísticas
        const total = migraines.length;
        const totalPain = migraines.reduce((acc, m) => acc + (parseInt(m.pain) || 0), 0);
        const totalHours = migraines.reduce((acc, m) => acc + (parseFloat(m.duration) || 0), 0);
        const avgPain = (totalPain / total).toFixed(1);
        const avgHours = (totalHours / total).toFixed(1);
        const triggerCounts = {};
        
        migraines.forEach(m => {
            if (m.triggers && Array.isArray(m.triggers)) {
                m.triggers.forEach(t => triggerCounts[t] = (triggerCounts[t] || 0) + 1);
            }
        });
        const topTriggers = Object.keys(triggerCounts).sort((a, b) => triggerCounts[b] - triggerCounts[a]).slice(0, 3);

        doc.setFont(fontName, 'bold');
        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Resumen Estadístico', 15, 80);
        doc.setFont(fontName, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`Total de episodios: ${total}`, 15, 90);
        doc.text(`Promedio de dolor: ${avgPain} / 10`, 15, 97);
        doc.text(`Duración promedio: ${avgHours} horas`, 15, 104);
        doc.text(`Detonantes más frecuentes: ${topTriggers.length > 0 ? topTriggers.join(', ') : 'Sin datos'}`, 15, 111);

        // Tabla
        doc.setFont(fontName, 'bold');
        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text('Historial de Episodios', 15, 128);

        const sorted = [...migraines].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const tableData = sorted.map(m => [
            m.date || '--',
            m.time || '--',
            `${m.pain || 0}/10`,
            `${m.duration || 1}h`,
            (Array.isArray(m.symptoms) ? m.symptoms.join(', ') : '').substring(0, 35),
            (Array.isArray(m.triggers) ? m.triggers.join(', ') : '').substring(0, 35),
            (m.meds || '').substring(0, 30)
        ]);

        doc.autoTable({
            startY: 133,
            head: [['Fecha', 'Hora', 'Dolor', 'Dur.', 'Síntomas', 'Detonantes', 'Medicamento']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', font: fontName },
            bodyStyles: { fontSize: 7, cellPadding: 2, font: fontName },
            alternateRowStyles: { fillColor: [240, 243, 255] },
            margin: { left: 15, right: 15 }
        });

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont(fontName, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Omniapp  |  Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
        }

        doc.save(buildMigrainePDFFileName());
        showToast('PDF generado exitosamente', 'success', 3000);
    } catch (err) {
        console.error('Error PDF:', err);
        toastAlert('Error al generar el PDF.', 'error');
    }
}
