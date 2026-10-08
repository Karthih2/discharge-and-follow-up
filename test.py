import os
from groq import Groq

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError("GROQ_API_KEY is not set")

client = Groq(api_key=api_key)

try:
    models = client.models.list()

    print("\nModels available to your Groq API key:\n")

    for model in models.data:
        print(f"Model ID       : {model.id}")
        print(f"Owned by       : {model.owned_by}")
        print(f"Active         : {model.active}")
        print(f"Context window : {model.context_window}")
        print("-" * 60)

except Exception as e:
    print("Failed to access Groq API")
    print("Error:", e)