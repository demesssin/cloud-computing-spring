import json
from google import genai

API_KEY = "AIzaSyArzvskgxUhX9e2dD6QrKYKQ610phh-5Bs"

client = genai.Client(api_key=API_KEY)

with open("prd.txt", "r", encoding="utf-8") as f:
    prd = f.read()

with open("code_submission.py", "r", encoding="utf-8") as f:
    code = f.read()

system_prompt = """
You are a Senior Software Architect and QA Judge Agent.

Your task:
1. Compare the PRD with the submitted code.
2. Score compliance from 0 to 100.
3. Check functionality, error handling, and security.
4. Output ONLY valid JSON.

Required JSON schema:

{
  "compliance_score": number,
  "status": "PASS" or "FAIL",
  "audit_log": [
    {
      "requirement": string,
      "met": true or false,
      "comment": string
    }
  ],
  "security_check": "Safe" or "Unsafe"
}
"""

prompt = f"""
PRD:
{prd}

CODE:
{code}
"""

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=system_prompt + prompt
)

output_text = response.text.strip()

if output_text.startswith("```json"):
    output_text = output_text[len("```json"):].strip()
if output_text.endswith("```"):
    output_text = output_text[:-3].strip()

try:
    parsed = json.loads(output_text)
except Exception as e:
    print("Model did not return valid JSON:")
    print(output_text)
    exit()

with open("compliance_report.json", "w", encoding="utf-8") as f:
    json.dump(parsed, f, indent=4)

print("✅ Compliance report generated successfully!")
