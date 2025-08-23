import os
import numpy as np
import pandas as pd

from flask import render_template, jsonify

import agent.graph as graph


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
    

class AgentPrompt(SubView):
    def __init__(self, thread_id, prompt):
        super().__init__()
        super().__init__({
            'thread_id': thread_id,
            'prompt': prompt
        })
        self.thread_id = thread_id
        self.prompt = prompt
        self.config = {"configurable": {"thread_id": self.thread_id}}

    def prepare_data(self):
        super().prepare_data()
        agent_messages = []
        print("Thread ID:", self.thread_id, '-'*40)
        for event in graph.stream({"messages": [{"role": "user", "content": self.prompt}]}, config=self.config):
            for value in event.values():
                print(value)
                print()
                print('\n', '-'*40)
                agent_messages.append(value["messages"][-1].to_json())
        print('\n', '=' * 40, '\n')
        self.set_response_data(agent_messages)
        print(self.response_data)

    
class SubViewSchemaFields(SubView):
    def __init__(self, field_name, field_value):
        super().__init__({
            'field_name': field_name,
            'field_value': field_value
        })
        self.field_name = field_name
        self.field_value = field_value
        
    def prepare_data(self):
        super().prepare_data()
        capi_records = dal.query_capi_by_field_value(self.field_name, self.field_value, projection={'_id': 0})
        capi = pd.DataFrame(list(map(lambda capo: DBS.models.Capo.factory(capo).to_dict(json_format=True), capi_records)))
        capi.drop(columns = [ col for col in capi.columns if col in dal.get_capo_fields() ], inplace=True)
        fields = capi.to_dict(orient='list')
        fields = { fk: list(sorted(filter(lambda v: pd.notnull(v), fv))) for fk,fv in fields.items()}
        fields = { fk: fv for fk,fv in fields.items() if len(fv)>0 }
        self.update_response_data({ 'fields': fields })
    
    

# class Accounts(View):
#     def __init__(self):
#         super().__init__(template = 'accounts.html', page_name='Accounts')
        
#     def prepare_data(self):
#         accounts_info = dal.accounts_info()
#         for ai in accounts_info:
#             ai['_id'] = str(ai['_id'])
#             ai['first_post'] = _utils.date_to_str(ai['first_post'], keep_time=False)
#             ai['latest_post'] = _utils.date_to_str(ai['latest_post'], keep_time=False)
#         self.set_page_data({'accounts': accounts_info})