
import os
import base64
from openai import AzureOpenAI

import azure.cognitiveservices.speech as speechsdk
endpoint = os.getenv("ENDPOINT_URL", "https://robinopenaii.openai.azure.com/")
deployment = os.getenv("DEPLOYMENT_NAME", "gpt-4.1")
search_endpoint = os.getenv("SEARCH_ENDPOINT", "https://robinsearch.search.windows.net")
search_key = os.getenv("SEARCH_KEY", "put your Azure AI Search admin key here")
  search_index = os.getenv("SEARCH_INDEX_NAME", "azureblob-index")
subscription_key = os.getenv("AZURE_OPENAI_API_KEY", "REPLACE_WITH_YOUR_KEY_VALUE_HERE")


# setup speech configuration 
# SPEECH_API_KEY is they key of the speech resource
speech_config = speechsdk.SpeechConfig(
  subscription=os.getenv("SPEECH_API_KEY"),
  region="eastus2"
)

# Get the text from the microphone
audio_config = speechsdk.audio.AudioConfig(
  use_default_microphone=True)
speech_config.speech_recognition_language="en-US"
speech_recognizer = speechsdk.SpeechRecognizer(
  speech_config,
  audio_config)

print("Say something...")
speech_result = speech_recognizer.recognize_once_async().get()

# Initialize Azure OpenAI client with key-based authentication
client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=subscription_key,
    api_version="2025-01-01-preview",
)

# IMAGE_PATH = "YOUR_IMAGE_PATH"
# encoded_image = base64.b64encode(open(IMAGE_PATH, 'rb').read()).decode('ascii')

# Prepare the chat prompt
chat_prompt = [
    {
        "role": "system",
        "content": [
            {
                "type": "text",
                "text": "You are an AI assistant that helps people find information."
            }
        ]
    }
]

# Include speech result if speech is enabled
messages = chat_prompt + [{"role": "user", "content": speech_result.text}]

# Generate the completion
completion = client.chat.completions.create(
    model=deployment,
    messages=messages,
    max_tokens=13107,
    temperature=0.7,
    top_p=0.95,
    frequency_penalty=0,
    presence_penalty=0,
    stop=None,
    stream=False,
    extra_body={
      "data_sources": [{
          "type": "azure_search",
          "parameters": {
            "endpoint": f"{search_endpoint}",
            "index_name": "azureblob-index",
            "semantic_configuration": "default",
            "query_type": "semantic",
            "fields_mapping": {},
            "in_scope": True,
            "role_information": "You are an AI assistant that helps people find information.",
            "filter": None,
            "strictness": 3,
            "top_n_documents": 5,
            "authentication": {
              "type": "api_key",
              "key": f"{search_key}"
            }
          }
        }]
    }
)

print(completion.to_json())
    

# Play the result on the computer's speaker
speech_config.speech_synthesis_voice_name = "en-US-AndrewNeural"
speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config)
speech_synthesizer.speak_text(
  completion.choices[0].message.content)
