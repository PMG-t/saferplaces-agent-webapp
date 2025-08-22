import os
import numpy as np
import pandas as pd

from flask import render_template, jsonify


class ResponseStatus:
    OK = "OK"
    ERROR = "ERROR"

class View():
    def __init__(self, template, page_name):
        self.template = template
        self.page_name = page_name
        self.view_data = {
            'page_name': self.page_name,
            'page_data': None
        }
        
    def prepare_data(self):
        self.view_data['page_data'] = dict()
        
    def set_page_data(self, page_data):
        self.view_data['page_data'] = page_data
        
    def render(self):
        self.prepare_data()
        return render_template(self.template, data=self.view_data)

  
class SubView():  
    def __init__(self, request_data=None):
        self.request_data = request_data
        
    def prepare_data(self):
        """Prepare data for the response."""
        self.response_data = { 
            "status": ResponseStatus.OK, 
            "response_data": dict()
        }
        
    def set_response_data(self, response_data):
        self.response_data["response_data"] = response_data
        
    def update_response_data(self, response_data):
        self.response_data["response_data"].update(response_data)
        
    def send_response(self):
        self.prepare_data()
        return jsonify(self.response_data)