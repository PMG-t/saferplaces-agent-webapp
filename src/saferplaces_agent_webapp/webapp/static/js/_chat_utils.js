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
const chatContainer = document.getElementById('chat');
const chatMsgs = document.getElementById('chatMsgs');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatWindowResizer = document.getElementById('chat-window-resizer');

chatWindowResizer.addEventListener('click', resizeChat);
function resizeChat() {
    if (chatContainer.classList.contains('maximize')) {
        chatContainer.classList.remove('maximize');
        chatWindowResizer.textContent = 'pip_exit'; // cambia l'icona
    } else {
        chatContainer.classList.add('maximize');
        chatWindowResizer.textContent = 'pip'; // cambia l'icona
    }
}

function appendMsg(role, text) {
    if (!text) return; // evita messaggi vuoti
    const div = createEl('div', {
        class: 'msg ' + (role === 'user' ? 'user' : 'ai'),
        html: marked.parse(text, {
            highlight: function (code, lang) {
                if (hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            }
        })
    });
    if (role == 'interrupt') {
        const btn_resume = createEl('button', {
            class: 'interruptBtn',
            text: 'Confirm',
            onclick: () => { console.log('Resume action confirmed'); resumeInterrupt(); }
        })
        div.appendChild(btn_resume);
    }
    chatMsgs.appendChild(div);
    div.querySelectorAll('pre code').forEach((block) => { hljs.highlightElement(block); });
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
}
function processAgentMsg(state) {
    let message = state.message
    let msg_type = message.kwargs.type
    let msg_content = message.kwargs.content
    switch (msg_type) {
        case 'ai':
            appendMsg('ai', msg_content);
            break;
        case 'interrupt':
            appendMsg('interrupt', msg_content);
            break;
        case 'tool':
            if (message.kwargs.content) { //} && message.kwargs.name != "geospatial_ops_tool") {
                let content = JSON.parse(msg_content.replace(/'/g, '"'));
                if (content.map_actions) {
                    content.map_actions.map(action => handleMapActions(action));
                }
                console.log("Tool message content:", content);
            }
    }
}

async function handleSend() {
    const prompt = chatInput.value.trim();
    if (!prompt) return;

    appendMsg('user', prompt);

    chatInput.value = '';

    let layers_state = document.getElementById("chat-option-layers").checked ? { layers: layerRegistry } : {};
    // !!!: ugly asf
    let avaliable_tools = document.getElementById("chat-option-api").checked ? { avaliable_tools: ['digital_twin_tool', 'safer_rain_tool', 'saferbuildings_tool'] } : [];
    avaliable_tools = document.getElementById("chat-option-geo-ops").checked ? { avaliable_tools: ['geospatial_ops_tool'] } : avaliable_tools;

    fetch('/agent/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: prompt,
            ...layers_state,
            ...avaliable_tools
        })
    })
    .then(r => { if (!r.ok) throw new Error('Errore'); return r.json(); })
    .then(d => {
        (d.response_data || []).forEach(m => {
            console.log(m);
            processAgentMsg(m);
        });
    })
    // .catch(() => appendMsg('bot', 'Si è verificato un errore.'));
}
sendBtn.onclick = handleSend;
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });


async function resumeInterrupt() {
    let default_msg = 'I confirm. You can proceed.'

    // TODO: Move this to a function
    let layers_state = document.getElementById("chat-option-layers").checked ? { layers: layerRegistry } : {};
    // !!!: ugly asf
    let avaliable_tools = document.getElementById("chat-option-api").checked ? { avaliable_tools: ['digital_twin_tool', 'safer_rain_tool', 'saferbuildings_tool'] } : [];
    avaliable_tools = document.getElementById("chat-option-geo-ops").checked ? { avaliable_tools: ['geospatial_ops_tool'] } : avaliable_tools;

    fetch('/agent/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: default_msg,
            ...layers_state,
            ...avaliable_tools
        })
    })
    .then(r => { if (!r.ok) throw new Error('Errore'); return r.json(); })
    .then(d => {
        (d.response_data || []).forEach(m => {
            console.log(m);
            processAgentMsg(m);
        });
    })
}


function toggleChatOptions(event) {
    const apiCheckboxId = 'chat-option-api';
    const geoOpsCheckboxId = 'chat-option-geo-ops';
    const layersCheckboxId = 'chat-option-layers';

    // TODO: si potrebbe fare route per update state grafo subito anzi che dopo il submit del messaggio di prompt

    if (event.target.checked) {
        switch (event.target.id) {
            case apiCheckboxId:
                document.getElementById(geoOpsCheckboxId).checked = false;
                break;
            case geoOpsCheckboxId:
                document.getElementById(apiCheckboxId).checked = false;
                break;
            case layersCheckboxId:
                break;
        }
    }
}