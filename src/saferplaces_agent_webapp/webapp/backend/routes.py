from flask import render_template, request, jsonify, current_app as app

from markupsafe import escape

from . import views



@app.route('/')
def index():
    return render_template('index.html')