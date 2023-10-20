import azure.functions as func
import os
import semantic_kernel as sk
import json
from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion, AzureChatCompletion

def main(req: func.HttpRequest) -> func.HttpResponse:
    print('Python HTTP trigger function processed a request.')
    out = {}
    try:
        deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")

        kernel = sk.Kernel()

        # Prepare OpenAI service using credentials stored in the `.env` file
        #deployment, api_key, endpoint, version = sk.azure_openai_settings_from_dot_env()
        completion = AzureChatCompletion(deployment, endpoint, api_key)

        kernel.add_chat_service("chat-gpt", completion)

        # Alternative using Azure:
        # deployment, api_key, endpoint = sk.azure_openai_settings_from_dot_env()
        # kernel.add_chat_service("dv", AzureChatCompletion(deployment, endpoint, api_key))

        # Wrap your prompt in a function
        prompt = kernel.create_semantic_function("""
        1) A robot may not injure a human being or, through inaction,
        allow a human being to come to harm.

        2) A robot must obey orders given it by human beings except where
        such orders would conflict with the First Law.

        3) A robot must protect its own existence as long as such protection
        does not conflict with the First or Second Law.

        Give me the TLDR in exactly 5 words.""")

        # Run your prompt
        #print(prompt()) # => Robots must not harm humans.

        return json.dumps({"foo" : prompt()})

    except ValueError:
        print(ValueError)

    return json.dumps(out)





