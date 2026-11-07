"""Confirms the key works and lists the models it can reach. Never prints the key."""
import json
from pathlib import Path

from adaption import Adaption

key = Path.home().joinpath(".config", "adaption", "key").read_text(encoding="utf-8-sig").strip()
print("key length:", len(key), "| expected prefix:", key.startswith("pt_live_"), "| one line:", "\n" not in key)

client = Adaption(api_key=key)
models = client.models.list(type="hosted")
items = getattr(models, "data", None) or getattr(models, "items", None) or list(models)
for model in items:
    row = model.model_dump() if hasattr(model, "model_dump") else model
    print(json.dumps(row, default=str)[:260])

response = client.responses.create(
    model="deepseek-v4-flash",
    instructions="Reply with one word.",
    input="Reply with OK",
)
print("reply:", response.output_text[:40])
print("response fields:", sorted(response.model_dump().keys()))
print("usage:", json.dumps(response.model_dump().get("usage"), default=str)[:400])
