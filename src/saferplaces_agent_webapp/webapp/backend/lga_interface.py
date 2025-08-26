from langgraph.types import Command, Interrupt

import agent.graph as graph


# DOC: LangGraph Agent Interface
class LGAInterface():

    is_in_interrupt: bool = False

    def __init__(self, thread_id: str):
        self.thread_id = thread_id
        self.config = { "configurable": { "thread_id": self.thread_id } }
        
    def prompt(self, prompt: str, node_params: dict = dict(), layer_registry: dict = dict(), avaliable_tools: list = list()):

        def get_stream_object():
            if self.is_in_interrupt:
                self.is_in_interrupt = False
                return Command(resume={ "response": prompt })
            else:
                return {
                    "messages": [
                        { "role": "user", "content": prompt }
                    ], 
                    'user_id': 'tommaso',   # TODO: replace with session user_id when wiil be implemented
                    'layer_registry': layer_registry,
                    'node_params': node_params,
                    'avaliable_tools': avaliable_tools
                }

        print('\n', '=' * 40, '\n')

        agent_messages = []
        for event in graph.stream(get_stream_object(), config=self.config, stream_mode="updates"):
            for value in event.values():
                print('\n', value, '\n')
                if type(value) is tuple and type(value[0]) is Interrupt:
                    interrupt = value[0].value
                    agent_messages.append({
                        "kwargs": {
                            "type": "ai",
                            "content": interrupt['content'],
                            "name": interrupt['interrupt_type'],
                        }
                    })
                    self.is_in_interrupt = True
                else:
                    agent_messages.append(value["messages"][-1].to_json())

        print('\n', '=' * 40, '\n')
        
        return agent_messages

        

# DOC: Registry for LGAInterface instances

LGA_INTERFACES_REGISTRY = dict()

def get_lga_interface(thread_id: str) -> LGAInterface:
    if thread_id not in LGA_INTERFACES_REGISTRY:
        LGA_INTERFACES_REGISTRY[thread_id] = LGAInterface(thread_id)
    return LGA_INTERFACES_REGISTRY[thread_id]