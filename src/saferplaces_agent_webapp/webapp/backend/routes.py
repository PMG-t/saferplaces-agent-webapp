import uuid
from markupsafe import escape

from flask import render_template, request, jsonify, session, current_app as app

from . import views

app.secret_key = "una_chiave_segreta_lunga_e_random"


@app.before_request
def session_values_init():
    if "session_id" not in session:
        session["session_id"] = str(uuid.uuid4())
    if "user_id" not in session:
        session["user_id"] = "default_user"


@app.route('/')
def index():
    return render_template('index.html')    # TODO: will be login page


@app.route('/projects')
def projects():
    view = views.Projects(
        user_id = session['user_id'],
        template = 'projects.html',
        page_name = 'Projects',
    )
    return view.render()


@app.route('/project/<project_id>')
def project_open(project_id):
    session['session_id'] = str(uuid.uuid4())  # DOC: Reset session ID for new project
    view = views.Project(
        thread_id = session['session_id'],
        user_id = session['user_id'],
        project_id = project_id,
        template='project_dashboard.html',
        page_name='Project Dashboard'
    )
    return view.render()


@app.route('/project/<project_id>/layers')
def project_layers(project_id):
    view = views.Project(
        thread_id = session['session_id'],
        user_id = session['user_id'],
        project_id = project_id
    )
    layers = view.get_layers()
    return jsonify({'layers': layers})


@app.route('/project/<project_id>/layers/new', methods=['POST'])
def project_layers_new(project_id):
    data = request.get_json()
    if not data or 'layers' not in data:
        return jsonify({'error': 'Invalid input'}), 400

    layers = data['layers']
    if not isinstance(layers, list):
        return jsonify({'error': 'Layers should be a list'}), 400
    
    view = views.Project(
        thread_id = session['session_id'],
        user_id = session['user_id'],
        project_id = project_id
    )
    view.new_layers(layers)
    return jsonify({'status': 'success'})


@app.route('/agent/prompt', methods=['POST'])
def agent_prompt():
    data = request.get_json()
    if not data or 'prompt' not in data:
        return jsonify({'error': 'Invalid input'}), 400
    prompt = escape(data['prompt'])

    subview = views.AgentPrompt(
        thread_id = session["session_id"], 
        user_id = session["user_id"],
        prompt = prompt,
        node_params = data.get('node_params', dict()),
        layers = data.get('layers', list()),
        avaliable_tools = data.get('avaliable_tools', dict())
    )
    return subview.send_response()


# @app.route('/layers/add', methods=['POST'])
# def add_layers():
#     data = request.get_json()
#     if not data or 'layers' not in data:
#         return jsonify({'error': 'Invalid input'}), 400

#     layers = data['layers']
#     if not isinstance(layers, list):
#         return jsonify({'error': 'Layers should be a list'}), 400

#     # TODO: Update state graph 'layer_registry' + include meta info such as px-res, totalbounds, width, height, attribute names
#     layer_registry = session.get('layer_registry', list())
#     layer_registry.extend(layers)
#     session['layer_registry'] = layer_registry

    
#     return jsonify({'status': 'success'})

# @app.route('/layers', methods=['GET'])
# def get_layers():
#     layer_registry = session.get('layer_registry', list())
#     return jsonify({'layers': layer_registry})