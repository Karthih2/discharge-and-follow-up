"""Simplifier and translator. Numbers must survive translation exactly. Medicines use a fixed template."""
import logging
import re

from pydantic import BaseModel

from .. import llm, settings
from . import samples
from .med_template import LANGS, med_texts

log = logging.getLogger("carebridge.simplifier")
NUM = re.compile(r"\d+(?:\.\d+)?")
LANG_NAMES = {"ta": "Tamil", "hi": "Hindi", "te": "Telugu", "kn": "Kannada", "ml": "Malayalam"}


def numbers_match(original: str, translated: str) -> bool:
    return set(NUM.findall(original)) == set(NUM.findall(translated))


class Rewrite(BaseModel):
    id: int
    en: str
    ta: str = ""
    hi: str = ""
    te: str = ""
    kn: str = ""
    ml: str = ""


class RewriteOut(BaseModel):
    items: list[Rewrite]


SYSTEM = """You rewrite hospital discharge instructions for a patient and family.
- English: plain words, short sentences, about Class 6 reading level.
- Then translate that English into Tamil (ta), Hindi (hi), Telugu (te), Kannada (kn) and Malayalam (ml).
- Keep drug names, doses, units, and every number exactly as written. Keep drug names in Latin letters.
- Never add advice, never diagnose, never change a medicine or dose, never add numbers.
- If the text is unclear, keep it unclear. Do not guess.
Return JSON: {"items": [{"id": int, "en": str, "ta": str, "hi": str, "te": str, "kn": str, "ml": str}]}"""


def rewrite(items: list[dict], model: str, text: str) -> dict[int, dict[str, str]]:
    """items: [{id, category, title, original_text, time_of_day}] -> {id: {lang: text}}.
    A missing id or language means that rewrite failed, and the caller falls back to the original line."""
    out: dict[int, dict[str, str]] = {}
    free = []
    for it in items:
        if it["category"] == "medication":
            out[it["id"]] = med_texts(it["title"], it["original_text"], it.get("time_of_day"))
        else:
            free.append(it)
    if settings.mock_llm():
        key = samples.match_sample(text)
        if key:
            by_text = {f["original_text"]: f.get("simple", {}) for f in samples.fixture(key)["items"]}
            out.update({it["id"]: by_text[it["original_text"]] for it in free if it["original_text"] in by_text})
        return out
    for i in range(0, len(free), 6):
        batch = free[i:i + 6]
        try:
            payload = "\n".join(f'{{"id": {b["id"]}, "text": {b["original_text"]!r}}}' for b in batch)
            res = llm.call_json(model, SYSTEM, payload, RewriteOut)
            out.update({r.id: {l: getattr(r, l) for l in LANGS if getattr(r, l)} for r in res.items})
        except Exception as e:
            log.warning("Rewrite batch failed: %s", e)
    return out


def translate_edit(item_id: int, english: str, model: str) -> dict[str, str]:
    """After a doctor edits the English, translate it again. Mock mode returns English only."""
    if settings.mock_llm():
        return {}
    try:
        res = llm.call_json(model, SYSTEM, f'{{"id": {item_id}, "text": {english!r}}}', RewriteOut)
        r = res.items[0]
        return {l: getattr(r, l) for l in LANGS if l != "en" and getattr(r, l)}
    except Exception as e:
        log.warning("Translate after edit failed: %s", e)
        return {}
