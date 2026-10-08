"""Anti-hallucination check: every quote must really appear in the lines it cites."""
import re
from datetime import date
from difflib import SequenceMatcher

from .dates import resolve_date

THRESHOLD = 0.85


def _norm(s: str) -> list[str]:
    return re.sub(r"[^\w\s]", " ", s.lower()).split()


def quote_score(quote: str, cited: str) -> float:
    q, c = _norm(quote), _norm(cited)
    if not q or not c:
        return 0.0
    qs = " ".join(q)
    if qs in " ".join(c):
        return 1.0
    n, best = len(q), 0.0
    for size in {max(1, n - 1), n, n + 1}:
        for i in range(0, max(1, len(c) - size + 1)):
            best = max(best, SequenceMatcher(None, qs, " ".join(c[i:i + size])).ratio())
    return best


def verify(original_text: str, line_numbers: list[int], lines: dict[int, str],
           date_raw: str | None, discharge: date) -> dict:
    """Returns {valid_lines, score, date_resolved, reasons}."""
    reasons = []
    valid = [n for n in line_numbers if n in lines]
    if len(valid) != len(line_numbers) or not valid:
        reasons.append("Cited source line does not exist")
    score = quote_score(original_text, " ".join(lines[n] for n in valid)) if valid else 0.0
    if score < THRESHOLD:
        reasons.append(f"Quote not found in the cited lines (match {score:.2f})")
    resolved = resolve_date(date_raw, discharge)
    return {"valid_lines": valid, "score": score, "date_resolved": resolved, "reasons": reasons}
