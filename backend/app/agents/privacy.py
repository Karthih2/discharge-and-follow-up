"""Privacy guard: mask real-looking personal data before anything is stored or sent."""
import re

PATTERNS = [
    ("aadhaar", re.compile(r"\b\d{4}[ -]?\d{4}[ -]?\d{4}\b"), "[AADHAAR MASKED]"),
    ("pan", re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"), "[PAN MASKED]"),
    ("email", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b"), "[EMAIL MASKED]"),
    ("mobile", re.compile(r"(?<!\d)(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)"), "[MOBILE MASKED]"),
    ("hospital_id", re.compile(r"\b(?:MRN|UHID|IP\s*No|Reg\s*No)[.:\s]*[A-Z0-9/-]{3,20}\b", re.I), "[HOSPITAL ID MASKED]"),
    ("dob", re.compile(r"\b(?:DOB|Date\s+of\s+birth)[.:\s]*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b", re.I), "[DOB MASKED]"),
    ("address", re.compile(r"\b(?:Door\s*No|No\.)\s*\d+[A-Za-z]?(?:[/,-]\d+[A-Za-z]?)?\b", re.I), "[ADDRESS MASKED]"),
    ("street", re.compile(r"\b(?:Street|Nagar|Road)\s+(?:No\.?\s*)?\d+\b", re.I), "[ADDRESS MASKED]"),
    ("pincode_addr", re.compile(r"\b(?:PIN|Pin\s*code)[.:\s]*\d{6}\b", re.I), "[PIN MASKED]"),
]


def mask_pii(text: str) -> tuple[str, list[dict]]:
    found = []
    for kind, rx, repl in PATTERNS:
        def sub(m, kind=kind, repl=repl):
            found.append({"kind": kind, "original": m.group(0), "masked": repl})
            return repl
        text = rx.sub(sub, text)
    return text, found
