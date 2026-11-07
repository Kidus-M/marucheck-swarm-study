"""Model calls for the study. Every call is logged, so each number can be traced to a run."""
import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path

from adaption import Adaption

STUDY = Path(__file__).resolve().parent.parent
LOG = STUDY / "runs" / "llm-calls.jsonl"


def _key() -> str:
    return Path.home().joinpath(".config", "adaption", "key").read_text(encoding="utf-8-sig").strip()


_client = None


def client() -> Adaption:
    global _client
    if _client is None:
        _client = Adaption(api_key=_key())
    return _client


def call(model: str, instructions: str, prompt: str, purpose: str, retries: int = 4) -> str:
    """Return the model's text, and log the full exchange with its usage."""
    last_error = None
    for attempt in range(retries):
        started = time.monotonic()
        try:
            response = client().responses.create(model=model, instructions=instructions, input=prompt)
            dumped = response.model_dump()
            LOG.parent.mkdir(parents=True, exist_ok=True)
            with LOG.open("a", encoding="utf-8") as log:
                log.write(
                    json.dumps(
                        {
                            "at": datetime.now(timezone.utc).isoformat(),
                            "id": dumped.get("id"),
                            "input": prompt,
                            "input_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
                            "instructions": instructions,
                            "latency_s": round(time.monotonic() - started, 2),
                            "model": model,
                            "output": response.output_text,
                            "purpose": purpose,
                            "usage": dumped.get("usage"),
                        },
                        default=str,
                    )
                    + "\n"
                )
            return response.output_text
        except Exception as error:  # Network and rate errors are retried, then raised.
            last_error = error
            time.sleep(2**attempt)
    raise RuntimeError(f"Model call failed after {retries} attempts: {last_error}") from last_error


def json_from(text: str):
    """Pull the JSON value out of a reply that may be wrapped in a code fence or prose."""
    starts = [index for index in (text.find("["), text.find("{")) if index != -1]
    if not starts:
        raise ValueError("No JSON in the reply.")
    start = min(starts)
    closer = "]" if text[start] == "[" else "}"
    return json.loads(text[start : text.rfind(closer) + 1])
