import json

from .ingest import to_lines
from ..settings import DATA_DIR

SAMPLES_DIR = DATA_DIR / "samples"
FIXTURES_DIR = DATA_DIR / "fixtures"


def sample_index() -> list[dict]:
    return json.loads((SAMPLES_DIR / "index.json").read_text(encoding="utf-8"))


def sample_text(key: str) -> str:
    meta = next(s for s in sample_index() if s["key"] == key)
    return (SAMPLES_DIR / meta["file"]).read_text(encoding="utf-8")


DEPARTMENT = {"a": "cardiology", "b": "orthopaedics", "c": "diabetology", "d": "general medicine",
              "e": "neurology", "f": "pulmonology", "g": "general medicine", "h": "pulmonology"}
_PERSONAL = ("Patient:", "Date of admission:", "Date of discharge:")


def _core(text: str) -> list[str]:
    """Lines that decide which fixture applies. The hospital line, name and dates may differ per patient."""
    return [t for n, t in to_lines(text) if n > 1 and not t.startswith(_PERSONAL)]


def match_sample(text: str) -> str | None:
    n = _core(text)
    for s in sample_index():
        if _core(sample_text(s["key"])) == n:
            return s["key"]
    return None


def fixture(key: str) -> dict:
    return json.loads((FIXTURES_DIR / f"{key}.json").read_text(encoding="utf-8"))
