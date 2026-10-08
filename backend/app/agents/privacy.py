"""Privacy guard: mask real-looking personal data before anything is stored or sent."""
import re

PATTERNS = [
    ("aadhaar", re.compile(r"\b\d{4}[ -]?\d{4}[ -]?\d{4}\b"), "[AADHAAR MASKED]"),
    ("pan", re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"), "[PAN MASKED]"),
    ("email", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b"), "[EMAIL MASKED]"),
    ("mobile", re.compile(r"(?<!\d)(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)"), "[MOBILE MASKED]"),
]


def mask_pii(text: str) -> tuple[str, list[dict]]:
    found = []
    for kind, rx, repl in PATTERNS:
        def sub(m, kind=kind, repl=repl):
            found.append({"kind": kind, "original": m.group(0), "masked": repl})
            return repl
        text = rx.sub(sub, text)
    return text, found
