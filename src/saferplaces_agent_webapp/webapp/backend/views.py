import os
import json
import numpy as np
import pandas as pd
import langgraph.types
from flask import render_template, jsonify

from langgraph.types import Command, interrupt

import agent.graph as graph
from .lga_interface import LGAInterface, get_lga_interface
from . import s3_interface as S3I


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
    

class Projects(View):
    def __init__(self, user_id, template='projects.html', page_name='Projects'):
        super().__init__(template, page_name)
        self.user_id = user_id
        
    def prepare_data(self):
        super().prepare_data()
        project_list = S3I.list_prefixes(S3I._BASE_BUCKET, f'{S3I._BASE_BUCKET_PREFIX}/user=={self.user_id}/')
        project_list = [
            {
                'title': project.split('/')[-2],
                'description': f'S3 URI: {project}',
                'uri': project
            }
            for project in project_list if project.endswith('/')
        ]
        self.set_page_data({'projects': project_list})


class Project(View):
    def __init__(self, thread_id, user_id, project_id, template='project_dashboard.html', page_name='Project Dashboard'):
        super().__init__(template, page_name)
        self.user_id = user_id
        self.project_id = project_id
        self.lga_interface = get_lga_interface(thread_id, user_id)

    def get_layers(self):
        layer_registry = S3I.read_file(S3I._BASE_BUCKET, f'{S3I._BASE_BUCKET_PREFIX}/user=={self.user_id}/{self.project_id}/_layer_registry.json')
        layer_registry = json.loads(layer_registry) if layer_registry else list()
        return layer_registry
    
    def new_layers(self, layers):
        """
        Adds layers to the project by updating the layer registry in S3.
        
        :param layers: List of layers to add
        """
        layer_registry = self.get_layers()
        layer_registry.extend(layers)
        
        S3I.write_file(
            bucket_name=S3I._BASE_BUCKET,
            key=f'{S3I._BASE_BUCKET_PREFIX}/user=={self.user_id}/{self.project_id}/_layer_registry.json',
            content=json.dumps(layer_registry, indent=4)
        )

        return layer_registry

        
    def prepare_data(self):
        super().prepare_data()
        
        layer_registry = self.get_layers()
        new_layer_map_actions = [
            self.lga_interface.agent_common.utils.map_action_new_layer(
                layer_name = layer['name'],
                layer_src = layer['src'],
                layer_styles = layer.get('styles', []),
            ) 
            for layer in layer_registry
        ]

        project_data = {
            'project_id': self.project_id,
            'name': f'Project {self.project_id}',
            'description': 'This is a sample project description.',
            'layer_registry': layer_registry,
            'init_actions': {
                'map_actions': new_layer_map_actions
            }
        }
        self.set_page_data({'project': project_data})

  
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
        try:
            return jsonify(self.response_data)
        except Exception as e:
            print(f"Error views.SubView.send_response. data : {self.response_data}. Error: {e}")
    

class AgentPrompt(SubView):
    def __init__(self, thread_id, user_id, prompt, node_params, layers, avaliable_tools):
        super().__init__({
            'thread_id': thread_id,
            'user_id': user_id,
            'prompt': prompt,
            'node_params': node_params,
            'layers': layers,
            'avaliable_tools': avaliable_tools
        })
        self.thread_id = thread_id
        self.lga_interface = get_lga_interface(thread_id, user_id)
        
    def prepare_data(self):
        super().prepare_data()
        agent_responses = self.lga_interface.prompt(
            prompt=self.request_data['prompt'],
            node_params=self.request_data.get('node_params', dict()),
            layer_registry=self.request_data.get('layers', list()),
            avaliable_tools=self.request_data.get('avaliable_tools', list())
        )
        self.set_response_data(agent_responses)