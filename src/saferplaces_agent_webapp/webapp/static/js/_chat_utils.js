function handleMapActions(action) {
    debugger
    switch (action.action) {
        case 'new_layer':   // TODO: Should check in a registry of layer if layer_data.src is already present before to add it
            layer_data = action.layer_data;
            if (layer_data.type === 'vector') {
                addVectorLayer(layer_data);
            }
            else if (layer_data.type === 'raster') {
                addRasterLayer(layer_data);
            }
    }
}

// ——— Chat UI minimale (come originale, mock) ———
const chatMsgs = document.getElementById('chatMsgs');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
function appendMsg(role, text) {
    if (!text) return; // evita messaggi vuoti
    const div = createEl('div', { class: 'msg ' + (role === 'user' ? 'user' : 'bot'), html: marked.parse(text) });
    chatMsgs.appendChild(div); 
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
}
function processAgentMsg(message) {
    let msg_type = message.kwargs.type
    let msg_content = message.kwargs.content
    switch (msg_type) {
        case 'ai':
            appendMsg('bot', msg_content);
            break;
        case 'tool':
            // load json from json string content
            content = JSON.parse(msg_content.replace(/'/g, '"'));
            if (content.map_actions) {
                content.map_actions.map(action => handleMapActions(action));
            }
            console.log("Tool message content:", content);
            break;
    }
}

async function handleSend() {
    const t = chatInput.value.trim(); if (!t) return; appendMsg('user', t); chatInput.value = '';
    fetch('/agent/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: t }) })
        .then(r => { if (!r.ok) throw new Error('Errore'); return r.json(); })
        .then(d => {
            (d.response_data || []).forEach(m => {
                console.log(m);
                processAgentMsg(m); 
            });
        })
        .catch(() => appendMsg('bot', 'Si è verificato un errore.'));
}
sendBtn.onclick = handleSend;
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });