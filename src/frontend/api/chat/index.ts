import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import axios from "axios"

import { ChatMessageHistory } from "langchain/memory";


process.env.OPENAI_API_TYPE = "azure"
process.env.AZURE_OPENAI_API_KEY = process.env.OPENAI_KEY
process.env.AZURE_OPENAI_API_INSTANCE_NAME = `oai${process.env.COSMOS_DB_CONTAINER}`
process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME = process.env.OPENAI_DEPLOYMENT_TEXT
// process.env.AZURE_OPENAI_API_COMPLETIONS_DEPLOYMENT_NAME="gpt-35-turbo"
// process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME="gpt-35-turbo"
process.env.AZURE_OPENAI_API_VERSION = "2023-03-15-preview"
process.env.AZURE_OPENAI_API_BASE = process.env.OPENAI_ENDPOINT



const convertToMessage = (history) => {
  const messages = []
  for (const h of history) {
    if (h?.user) {
      messages.push({ role: "user", content: h.user })
    } if (h?.assistant) {
      messages.push({ role: "assistant", content: h.assistant })
    } if (h?.tool) {
      messages.push({ role: "tool", content: h.tool })
    }
  }

  return messages
}

const convertToLangChainMessage = (history) => {
  const messages = new ChatMessageHistory();
  //messages.addAIChatMessage(aiMessage)
  for (let i = 0; i < history.length - 1; i++) {  //ignore most recent user utterance
    //for (const h of history) {
    const h = history[i]
    if (h?.user) {
      messages.addUserMessage(h.user)
    } if (h?.assistant) {
      messages.addAIChatMessage(h.assistant)
    } if (h?.tool) {
      messages.addMessage(h.tool)
    }
  }

  return messages
}

const defaultChat = async (context, req) => {
  const url = `${process.env.OPENAI_ENDPOINT}openai/deployments/${process.env.OPENAI_DEPLOYMENT_TEXT}/extensions/chat/completions?api-version=2023-06-01-preview`
  const headers = {
    "Content-Type": "application/json",
    "api-key": process.env.OPENAI_KEY,
    "chatgpt_url": `${process.env.OPENAI_ENDPOINT}openai/deployments/${process.env.OPENAI_DEPLOYMENT_TEXT}/chat/completions?api-version=2023-03-15-preview`,
    "chatgpt_key": process.env.OPENAI_KEY,
    "accept": "*/*"

  }
  if(req.body.index?.searchableFields ){
    req.body.index.searchableFields = req.body.index.searchableFields.filter(sf => {
      if(!sf.toLowerCase().includes('vector') && !sf.toLowerCase().includes('/')){
        return sf
      }
    })
  }
  const body = {
    "dataSources": [
      {
        "type": "AzureCognitiveSearch",
        "parameters": {
          "endpoint": process.env.COGSEARCH_URL,
          "key": process.env.COGSEARCH_APIKEY,
          "indexName": req.body.index.name,
          "semanticConfiguration": req.body.index?.semanticConfigurations && req.body.index?.semanticConfigurations.length > 0 ? req.body.index?.semanticConfigurations[0].name : null,
          "queryType": req.body.index?.semanticConfigurations && req.body.index?.semanticConfigurations.length > 0 ? "semantic" : "simple",
          "fieldsMapping": {
            "contentFieldsSeparator": "\n",
            "contentFields": req.body.index.searchableFields,
            "filepathField": "filename",
            "titleField": "filename",
            "urlField": "filename"
          },
          "inScope": true,
          "roleInformation": "You are an AI assistant that helps people find information."
        }
      }
    ],
    "messages": convertToMessage(req.body.history),
    "deployment": process.env.OPENAI_DEPLOYMENT_TEXT,
    "temperature": 0,
    "top_p": 1,
    "max_tokens": 800,
    "stop": null,
    "stream": false
  }
  try {
    const { data } = await axios.post(url, body, { headers: headers })

    let answer = ''
    let citations = []
    for (const c of data.choices) {
      for (const m of c.messages) {
        if (m.role === 'tool') {
          const contentObj = JSON.parse(m.content)
          citations = contentObj.citations
        } else if (m.role === 'assistant') {
          answer = m.content
        }
      }
    }

    context.res = {
      body: { "data_points": citations, "answer": answer, "thoughts": JSON.stringify(data.choices) }
    }

  } catch (err) {
    context.res = {
      body: JSON.stringify(err)
    }
  }

}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {

  try {
      return defaultChat(context, req)
  } catch (err) {
    context.res = {
      body: { "data_points": [], "answer": `Something went wrong. ${err.message}`, "thoughts": "" }
    }
  }

};


export default httpTrigger;
