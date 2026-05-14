import json
import re
from typing import Any


def extract_json_payload(content: str) -> dict[str, Any]:
    fenced_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
    raw = fenced_match.group(1) if fenced_match else content
    object_match = re.search(r"\{[\s\S]*\}", raw)
    if not object_match:
        raise ValueError("AI response did not contain a JSON object")
    return json.loads(object_match.group(0))
