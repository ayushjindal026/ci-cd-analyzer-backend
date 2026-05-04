import json
from openai import OpenAI
from app.config import settings

# Initialize client (works for OpenAI + Groq)
client = OpenAI(
    api_key=settings.openai_api_key,
    base_url=settings.openai_base_url
)

def analyze_log(log: str):
    prompt = f"""
You are a CI/CD failure analysis assistant.

STRICT RULES:
- Return ONLY valid JSON
- No explanation
- No markdown
- No extra text

Format:
{{
  "category": "...",
  "root_cause": "...",
  "suggested_fix": "..."
}}

LOG:
{log}
"""

    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": "You are a DevOps expert."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )

        content = response.choices[0].message.content

        # Try parsing JSON
        try:
            return json.loads(content)
        except Exception:
            return {
                "category": "UNKNOWN",
                "root_cause": content,
                "suggested_fix": "Check logs manually"
            }

    except Exception as e:
        return {
            "category": "UNKNOWN",
            "root_cause": f"LLM call failed: {str(e)}",
            "suggested_fix": "Check API key, model, or network"
        }