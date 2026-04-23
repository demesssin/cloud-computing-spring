from openai import OpenAI
import json

def extract_invoice_data(raw_text: str, api_key: str) -> dict:
    client = OpenAI(api_key=api_key)
    prompt = "Extract information from the invoice text below. Output null if missing.\n\n" + raw_text
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": "You carefully extract data into JSON format."}, {"role": "user", "content": prompt}],
        response_format={"type": "json_schema", "json_schema": {"name": "invoice", "schema": {"type": "object", "properties": {"company_name": {"type": ["string", "null"]}, "invoice_number": {"type": ["string", "null"]}, "date": {"type": ["string", "null"]}, "total_amount": {"type": ["string", "null"]}}, "required": ["company_name", "invoice_number", "date", "total_amount"], "additionalProperties": False}, "strict": True}}
    )
    return json.loads(response.choices[0].message.content)
