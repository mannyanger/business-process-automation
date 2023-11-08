import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanMessage, AIMessage } from "langchain/schema";
import { BufferMemory, ChatMessageHistory  } from "langchain/memory";
import { ConversationChain } from "langchain/chains";


process.env.OPENAI_API_TYPE = "azure"
process.env.AZURE_OPENAI_API_KEY = process.env.OPENAI_KEY
process.env.AZURE_OPENAI_API_INSTANCE_NAME = `oai${process.env.COSMOS_DB_CONTAINER}`
process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME = process.env.OPENAI_DEPLOYMENT_TEXT
process.env.AZURE_OPENAI_API_VERSION = "2023-03-15-preview"
process.env.AZURE_OPENAI_API_BASE = process.env.OPENAI_ENDPOINT

const getInputs = (history) => {
    const messages = []
    let input = ""
    for(const h of history){
        if(h?.user && h?.assistant){
            messages.push(new HumanMessage(h.user))
            messages.push(new AIMessage(h.assistant))
        } else if(h?.user && !h?.assistant)
        if(h?.user){
            input = h.user
        }
    }

    const memory = new BufferMemory({
        chatHistory: new ChatMessageHistory(messages),
      });
    return {memory : memory, input : input}
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {

    try {
        context.log('HTTP trigger function processed a request.');

        const inputs = getInputs(context.req.body.options.history)

        const model = new ChatOpenAI({ temperature: 1.0, stop: ['<stop>'] });
        const chain = new ConversationChain({ llm: model, memory: inputs.memory });
        const prompt = `
        [Inputs]

        name : pdf
        
        name : text
        
        name : wav
        
        name : video
        
        [FUNCTIONS]
        
        name : sttBatch
        descriptions : Converts wav files into readable text
        inputs : [wav]
        outputs: [stt]
        
        name : sttToText
        descriptions : Converts sttBatch json output into plain text
        inputs : [stt]
        outputs: [text]
        
        name : ocrBatch
        descriptions : Converts PDFs and other documents to text
        inputs : [pdf]
        outputs: [ocr]
        
        name : ocrToText
        descriptions : Converts ocr json output into plain text
        inputs : [ocr]
        outputs: [text]
        
        name : layoutBatch
        descriptions : Same as the ocrBatch service but it can also normalize tables into structured data.
        inputs : [pdf]
        outputs: [layout]
        
        name : splitPdf
        descriptions : Splits a large PDF by page for further processing
        inputs : [pdf]
        outputs: [pdf]
        
        name : openaiRest
        descriptions : Extract insights from text, generates new text, translates to another language, or summarize.
        inputs : [text]
        outputs: [text]
        
        name : imageAnalysis
        descriptions : Create text that describes images
        inputs : [image]
        outputs: [imageAnalysis]
        
        name : recognizePiiEntitiesBatch
        descriptions : Remove PII (Personally Identifiable Information) from text. PII could be names, telephone numbers, etc.
        inputs : [text]
        outputs: [pii]
        
        name : openaiEmbeddings
        descriptions : Embeddings are applied to text to use vector search
        inputs : [text]
        outputs: [openaiEmbeddings]
        
        
        
        [RULES]
        
        - All pipelines MUST start with an Input (pdf, text, wav, video)
        - If the input type is not clear, respond with "Rephrase the request and include the input type.  Types include : pdf, text, wav, video"
        - Response will be in the format : "Input Name -> Name 2 -> Name 3", Example : "pdf -> splitPdf -> ocrBatch -> openaiRest"
        - The input of a function must match the output of the previous function.  **MUST** verify that the inputs match the previous output.  
        - All stages MUST use an existing function.  If the task cannot be done with the existing functions, state that "I cant complete this process"
        
        Matching Inputs and Outputs:
        - pdf -> ocrBatch
        - wav -> sttBatch
        - pdf -> splitPdf -> ocrBatch
        
        BAD and not matching Inputs and Outputs:
        - pdf -> sttBatch (sttBatch takes an wav input, not pdf)
        - wav -> sttBatch -> ocrBatch (ocrBatch takes a pdf input, not text)
        
        
        
        [REQUEST]
        I have a folder of wav files.  I need to know if the file contains the quote "ask not what your country can do for you".
        
        [RESPONSE]
        wav -> sttBatch -> sttToText -> openaiRest<stop>
        
        [REQUEST]
        I have a PDF of a book.  I need to split the PDF by page, then convert each page to text.
        
        [RESPONSE]
        pdf -> splitPdf -> ocrBatch -> ocrToText<stop>
        
        [REQUEST]
        I have a PDF of a table.  I need to convert the PDF to structured data.
        
        [RESPONSE]
        pdf -> Layout<stop>
        
        [REQUEST]
        I have a folder of images.  I need to generate a description of each image.
        
        [RESPONSE]
        image -> imageAnalysis<stop>
        
        [REQUEST]
        I have a text file.  I need to remove all PII from the text.
        
        [RESPONSE]
        text -> PII<stop>
        
        [REQUEST]
        I have a text file.  I need to generate a vector embedding for each sentence.
        
        [RESPONSE]
        text -> openaiEmbeddings<stop>
        
        [REQUEST]
        I have a text file.  I need to classify the text as either safe or not safe for work.
        
        [RESPONSE]
        text -> Content Moderator (Text)<stop>
        
        [REQUEST]
        I have a video file.  I need to classify the video as either safe or not safe for work.
        
        [RESPONSE]
        video -> Content Moderator (Video)<stop>
        
        [REQUEST]
        I have a folder of wav files.  I need to know if the file contains the word "coffee".
        
        [RESPONSE]
        wav -> sttBatch -> sttToText -> openaiRest<stop>

        [REQUEST]
        I need to do some translations

        [RESPONSE]
        Rephrase the request and include the input type.  Types include : pdf, text, wav, video

        [REQUEST]
        I want to convert this data to json

        [RESPONSE]
        Rephrase the request and include the input type.  Types include : pdf, text, wav, video

        [REQUEST]
        Hello.  Tell me a joke.

        [RESPONSE]
        I cant complete this process
        
        [REQUEST]
        ${inputs.input}
        [RESPONSE]
        `
        const res1 = await chain.call({ input: prompt });

        const verificationPrompt = `
        [RULES]
        - The PREVIOUS OUTPUT should be an INPUT type followed by a series of functions separated by an arrow (->). Example : wav -> sttBatch -> sttToText -> openaiRest<stop>.  
        - DO NOT allow a regular text response.  If the output is not in the correct format, respond "Please rephrase the request and be sure to include the input type."

        [PREVIOUS OUTPUT]
        wav -> sttBatch -> sttToText -> openaiRest<stop>

        [RESPONSE]
        wav -> sttBatch -> sttToText -> openaiRest<stop>

        [PREVIOUS OUTPUT]
        pdf -> splitPdf -> ocrBatch -> ocrToText<stop>

        [RESPONSE]
        pdf -> splitPdf -> ocrBatch -> ocrToText<stop>

        [PREVIOUS OUTPUT]
        I'm sorry, I don't understand how to respond to that.<stop>

        [RESPONSE]
        Please rephrase the request and be sure to include the input type.

        [PREVIOUS OUTPUT]
        I cant complete this process<stop>

        [RESPONSE]
        Please rephrase the request and be sure to include the input type.

        [PREVIOUS OUTPUT]
        ${res1.response}

        [RESPONSE]

        `
        
        const res2 = await chain.call({ input: verificationPrompt });

        context.res = {
            body: {
                answer: res2.response,
                data_points: [],
                thoughts: "thoughts"
            }
        }

    } catch (err) {
        context.log(err)
        context.res = {
            body: err
        }
    }
    return
}

export default httpTrigger;
