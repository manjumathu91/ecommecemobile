
import os
from groq import Groq


SYSTEM_PROMPT = """
You are a Smart E-commerce Shopping Assistant.

Your responsibilities:

1. Answer e-commerce related questions.
2. Help customers understand products.
3. Explain mobile phones, RAM, processors,
   laptops, cameras, batteries and technology.
4. Give shopping advice and product comparisons.
5. Explain online shopping, payments and delivery.
6. Help customers make informed buying decisions.

IMPORTANT RULES:

- Answer in the same language as the customer.
- Support Tamil, English and Tanglish.
- Give simple, friendly and useful answers.
- Never invent product prices or stock availability.
- For actual store information, use verified database data.
- Do not answer unrelated general knowledge questions.
- Politely explain that you only handle shopping,
  e-commerce and technology-related questions.
"""


def get_ai_response(message, user=None):

    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv(
        "GROQ_MODEL",
        "llama-3.3-70b-versatile"
    )

    if not api_key:
        raise ValueError("Groq API key is not configured.")

    client = Groq(api_key=api_key)

    completion = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": message
            }
        ],
        temperature=0.4,
        max_completion_tokens=700
    )

    reply = completion.choices[0].message.content

    return {
        "reply": reply or "Sorry, I couldn't generate a response."
    }