"""Groq wrapper: temperature 0, JSON mode, Pydantic validation, one retry with the error appended."""
import logging
import os

from pydantic import BaseModel, ValidationError

log = logging.getLogger("carebridge.llm")
_client = None


class LLMError(Exception):
    pass


def client():
    global _client
    if _client is None:
        from groq import Groq

        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client


def call_json(model: str, system: str, user: str, schema: type[BaseModel]) -> BaseModel:
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    err = None
    for _ in range(2):
        extra = {"reasoning_effort": "low", "max_completion_tokens": 8000} if "gpt-oss" in model else {}
        resp = client().chat.completions.create(
            model=model, messages=messages, temperature=0,
            response_format={"type": "json_object"}, **extra,
        )
        text = resp.choices[0].message.content or ""
        try:
            return schema.model_validate_json(text)
        except ValidationError as e:
            err = e
            messages += [
                {"role": "assistant", "content": text},
                {"role": "user", "content": f"Your JSON failed validation:\n{e}\nReturn corrected JSON only."},
            ]
    raise LLMError(f"Validation failed twice: {err}")


def check_models(wanted: list[str]) -> None:
    """Warn at startup when a configured model is not available to this key."""
    try:
        available = {m.id for m in client().models.list().data}
    except Exception as e:  # network, bad key
        log.warning("Could not list Groq models: %s", e)
        return
    for m in wanted:
        if m not in available:
            log.warning("Configured model %r is not available on Groq. Change it in the settings table.", m)
