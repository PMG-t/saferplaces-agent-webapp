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

    subview = views.AgentPrompt(session["session_id"], prompt)
    return subview.send_response()