"""Safety triage. Deterministic rules always run. The LLM may add flags, never remove them."""
import logging
import re
from typing import NamedTuple, Optional

from pydantic import BaseModel

from .. import llm, settings

log = logging.getLogger("carebridge.triage")

VAGUE = re.compile(
    r"\bas needed\b|\bif (?:needed|required|necessary)\b|\bas required\b|\bwhen needed\b|\badjust\w*\b|"
    r"\breview later\b|\bsos\b|\bprn\b|\bsometime\b|\bto be decided\b|\btbd\b|\bas advised\b|"
    r"\bas per comfort\b|\bwhen (?:better|the doctor advises)\b|\bas tolerated\b", re.I)
MED_CHANGE = re.compile(
    r"\b(?:increase|decrease|reduce|double|halve|stop|start(?:ed)?|discontinue|switch(?:ed)?|"
    r"changed?|skip|new medicine)\b", re.I)
NEG = re.compile(r"\b(?:stop|avoid|restrict|do not|don't)\b", re.I)
POS = re.compile(r"\b(?:continue|plenty|increase|start|resume)\b", re.I)
STOP = set("""once twice daily morning night afternoon after before with food days weeks week every each
this that from have their your should until also when then them into over under more less about""".split())
DOSE = re.compile(r"\d+(?:\.\d+)?\s*(?:mg|ml|mcg|units?|iu|g)\b|\d+\s*(?:tab|tablet|cap|capsule|drop|puff)s?\b", re.I)
NEEDS_DATE = {"appointment", "test", "referral"}
RANK = {"high": 3, "medium": 2, "low": 1}


class Flag(NamedTuple):
    reason: str
    severity: str
    code: str = "MODEL_FLAG"


def _words(s: str) -> set[str]:
    return {w for w in re.findall(r"[a-z]{4,}", s.lower()) if w not in STOP}


def triage_rules(items: list[dict]) -> dict[int, list[Flag]]:
    """items: dicts with category, original_text, date_raw, date_resolved, confidence, verify_reasons."""
    out: dict[int, list[Flag]] = {i: [] for i in range(len(items))}
    for i, it in enumerate(items):
        t = it["original_text"]
        for r in it.get("verify_reasons", []):
            out[i].append(Flag(r, "high", "QUOTE_MISMATCH"))
        if VAGUE.search(t) or (it.get("date_raw") and VAGUE.search(it["date_raw"])):
            out[i].append(Flag("Vague wording. The care team must confirm what is meant", "medium", "VAGUE_WORDING"))
        if it["category"] == "medication" and MED_CHANGE.search(t):
            out[i].append(Flag("Medicine start, stop, or dose change language", "high", "MED_CHANGE"))
        if it["category"] in NEEDS_DATE and not it.get("date_resolved"):
            out[i].append(Flag("Date is missing or cannot be worked out", "medium", "MISSING_DATE"))
        if it["category"] == "medication" and not DOSE.search(t):
            out[i].append(Flag("The dose is not written", "medium", "MISSING_DOSE"))
        if it["category"] == "warning_sign":
            out[i].append(Flag("Symptom or warning sign. Reviewer to confirm the wording", "low", "SYMPTOM"))
        if it.get("confidence", 1) < 0.7:
            out[i].append(Flag(f"Low extraction confidence ({it['confidence']:.2f})", "medium", "LOW_CONFIDENCE"))
        if NEG.search(t) and POS.search(t):
            out[i].append(Flag("Conflicting instructions in the same line", "high", "CONFLICT"))
    for i, a in enumerate(items):
        for j in range(i + 1, len(items)):
            b = items[j]
            if a["category"] != b["category"]:
                continue
            opp = (NEG.search(a["original_text"]) and POS.search(b["original_text"])) or \
                  (POS.search(a["original_text"]) and NEG.search(b["original_text"]))
            if opp and _words(a["original_text"]) & _words(b["original_text"]):
                for k in (i, j):
                    out[k].append(Flag("Conflicts with another instruction in this summary", "high", "CONFLICT"))
    return out


class LLMFlag(BaseModel):
    index: int
    reason: str


class LLMFlags(BaseModel):
    flags: list[LLMFlag] = []


SYSTEM = """You are a safety checker for a discharge follow-up tool. You receive numbered care instructions.
Flag an instruction ONLY if it is clinically sensitive, ambiguous, or may conflict with another one.
Never rewrite, diagnose, or advise. Return JSON: {"flags": [{"index": int, "reason": short text}]}. Return an empty list if none."""


def triage_llm(items: list[dict], model: str) -> dict[int, list[Flag]]:
    """Additive only. Any failure returns no extra flags."""
    if settings.mock_llm() or not items:
        return {}
    try:
        text = "\n".join(f"{i}: {it['original_text']}" for i, it in enumerate(items))
        res = llm.call_json(model, SYSTEM, text, LLMFlags)
        extra: dict[int, list[Flag]] = {}
        for f in res.flags:
            if 0 <= f.index < len(items):
                extra.setdefault(f.index, []).append(Flag(f"Model flag: {f.reason}", "medium", "MODEL_FLAG"))
        return extra
    except Exception as e:
        log.warning("LLM triage failed, rules only: %s", e)
        return {}


def top_severity(flags: list[Flag]) -> Optional[str]:
    return max((f.severity for f in flags), key=lambda s: RANK[s], default=None)
