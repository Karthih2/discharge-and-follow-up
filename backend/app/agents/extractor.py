import logging
from typing import Optional

from pydantic import BaseModel, field_validator

from .. import llm, settings
from . import samples

log = logging.getLogger("carebridge.extractor")

CATEGORIES = ["appointment", "test", "referral", "medication", "wound_care", "diet",
              "activity", "rehab", "warning_sign", "other"]


class ExtractedItem(BaseModel):
    category: str
    title: str
    original_text: str
    source_line_numbers: list[int]
    date_raw: Optional[str] = None
    time_of_day: Optional[str] = None
    confidence: float = 0.5

    @field_validator("category")
    @classmethod
    def _cat(cls, v):
        v = v.strip().lower()
        return v if v in CATEGORIES else "other"


class ExtractOut(BaseModel):
    items: list[ExtractedItem]


SYSTEM = f"""You extract follow-up instructions from a hospital discharge summary.
Rules you must never break:
- Use ONLY what is written in the text. Never invent, infer, diagnose, or add medical advice.
- original_text must be copied word for word from the cited line(s).
- source_line_numbers lists the [number] of each line you copied from.
- Do not change or suggest changing any medicine, dose, or treatment.
- If you are unsure, lower the confidence (0 to 1). Do not guess.
Categories: {", ".join(CATEGORIES)}.
For each actionable line (medicines, appointments, tests, referrals, wound care, diet, activity, rehab, warning signs, daily checks) return one item:
{{"category": str, "title": short label (for medicines: drug name and dose, e.g. "Aspirin 75 mg"), "original_text": exact quote, "source_line_numbers": [int],
"date_raw": the date words as written (e.g. "after 2 weeks", "on day 5", "20 Oct 2026") or null,
"time_of_day": for medicines or daily checks a comma list of morning, afternoon, night or null,
"confidence": number}}
Skip headers, names, ages, diagnoses and procedure history.
Return JSON: {{"items": [ ... ]}}"""


def extract(lines: list[tuple[int, str]], model: str, text: str) -> list[ExtractedItem]:
    """Raises on LLM failure; the pipeline then reports the step as failed."""
    if settings.mock_llm():
        key = samples.match_sample(text)
        if not key:
            log.warning("MOCK mode: no fixture for this text, returning no items")
            return []
        return [ExtractedItem(**{k: v for k, v in it.items() if k in ExtractedItem.model_fields})
                for it in samples.fixture(key)["items"]]
    numbered = "\n".join(f"[{n}] {t}" for n, t in lines)
    return llm.call_json(model, SYSTEM, numbered, ExtractOut).items
