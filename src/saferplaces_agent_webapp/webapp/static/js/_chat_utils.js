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
    const div = createEl('div', { class: 'msg ' + (role === 'user' ? 'user' : 'ai'), html: marked.parse(text) });
    chatMsgs.appendChild(div); 
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
}
function processAgentMsg(message) {
    let msg_type = message.kwargs.type
    let msg_content = message.kwargs.content
    switch (msg_type) {
        case 'ai':
            appendMsg('ai', msg_content);
            break;
        case 'tool':
            // load json from json string content
            if (message.kwargs.content && message.kwargs.name != "geospatial_ops_tool") {
                content = JSON.parse(msg_content.replace(/'/g, '"'));
                // content = msg_content
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

    layers_state = document.getElementById("chat-option-layers").checked ? { layers: layerRegistry } : {};
    // !!!: ugly asf
    tool_choice = document.getElementById("chat-option-api").checked ? { node_params: { chatbot: { tool_choice: [ 'digital_twin_tool', 'safer_rain_tool', 'saferbuildings_tool' ] } } } : {};
    tool_choice = document.getElementById("chat-option-geo-ops").checked ? { node_params: { chatbot: { tool_choice: [ 'geospatial_ops_tool' ] } } } : tool_choice;

    fetch('/agent/prompt', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: prompt,
            ... layers_state,
            ... tool_choice
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

function toggleChatOptions(event) {
    const apiCheckboxId = 'chat-option-api';
    const geoOpsCheckboxId = 'chat-option-geo-ops';
    const layersCheckboxId = 'chat-option-layers';

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