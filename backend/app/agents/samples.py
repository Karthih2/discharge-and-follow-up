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


def match_sample(text: str) -> str | None:
    n = to_lines(text)
    for s in sample_index():
        if to_lines(sample_text(s["key"])) == n:
            return s["key"]
    return None


def fixture(key: str) -> dict:
    return json.loads((FIXTURES_DIR / f"{key}.json").read_text(encoding="utf-8"))
