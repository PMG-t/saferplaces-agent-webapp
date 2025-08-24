import uuid
from markupsafe import escape

from flask import render_template, request, jsonify, session, current_app as app

from . import views

app.secret_key = "una_chiave_segreta_lunga_e_random"


@app.before_request
def assegna_session_id():
    if "session_id" not in session:
        session["session_id"] = str(uuid.uuid4())

@app.route('/')
def index():
    return render_template('index_lm.html')

@app.route('/agent/prompt', methods=['POST'])
def agent_prompt():
    data = request.get_json()
    if not data or 'prompt' not in data:
        return jsonify({'error': 'Invalid input'}), 400
    prompt = escape(data['prompt'])

    subview = views.AgentPrompt(thread_id=session["session_id"], layer_registry=session.get('layer_registry', []), prompt=prompt)
    return subview.send_response()

@app.route('/layers/add', methods=['POST'])
def add_layers():
    data = request.get_json()
    if not data or 'layers' not in data:
        return jsonify({'error': 'Invalid input'}), 400

    layers = data['layers']
    if not isinstance(layers, list):
        return jsonify({'error': 'Layers should be a list'}), 400

    layer_registry = session.get('layer_registry', list())
    layer_registry.extend(layers)
    session['layer_registry'] = layer_registry
    return jsonify({'status': 'success'})

@app.route('/layers', methods=['GET'])
def get_layers():
    layer_registry = session.get('layer_registry', list())
    return jsonify({'layers': layer_registry})