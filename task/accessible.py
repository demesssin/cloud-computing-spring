from google import genai

client = genai.Client(api_key="AIzaSyArzvskgxUhX9e2dD6QrKYKQ610phh-5Bs")
models = client.models.list()
for m in models:
    print(m.name, m.supported_actions)
