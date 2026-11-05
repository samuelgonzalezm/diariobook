// ==========================================
// OMNIMAPP - OmniChat (Notas y Mensajes)
// ==========================================

let chat = [];

function handleChatKeydown(e) {
    // Enviar con Enter (sin Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendChatMessage(e);
    }
}

function handleSendChatMessage(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    db.ref(`${userKey}/chat`).push({
        text,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('es-ES')
    });

    input.value = '';
    input.style.height = 'auto';
}

function deleteChatMessage(id) {
    if (confirm('¿Eliminar este mensaje?')) {
        db.ref(`${userKey}/chat/${id}`).remove();
        showToast('Mensaje eliminado', 'info', 2000);
    }
}

function renderChat() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    if (chat.length === 0) {
        container.innerHTML = `
            <div class="chat-empty">
                <i class="fa-solid fa-comment-dots text-4xl mb-3 opacity-30"></i>
                <p>Aún no hay mensajes.</p>
                <p class="text-xs mt-1">Escribe tu primera nota abajo 👇</p>
            </div>
        `;
        return;
    }

    container.innerHTML = chat.map(msg => `
        <div class="chat-bubble mine">
            <div>${escapeHtml(msg.text).replace(/\n/g, '<br>')}</div>
            <div class="chat-bubble-time">
                ${escapeHtml(msg.time || '')} • ${escapeHtml(msg.date || '')}
                <button onclick="deleteChatMessage('${escapeAttr(msg.id)}')" class="ml-2 text-white/60 hover:text-white transition">
                    <i class="fa-solid fa-xmark text-[10px]"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Auto-scroll al final
    setTimeout(() => { 
        container.scrollTop = container.scrollHeight; 
    }, 50);
}
