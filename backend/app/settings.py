import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

DATA_DIR = ROOT / "data"
DB_URL = os.getenv("CB_DB_URL") or f"sqlite:///{(ROOT / 'carebridge.db').as_posix()}"

DEFAULT_SETTINGS = {
    "extract_model": "openai/gpt-oss-120b",
    "rewrite_model": "openai/gpt-oss-20b",
    "enabled_languages": "en,ta,hi",
    "remind_threshold_hours": "6",
    "caregiver_threshold_hours": "24",
    "reviewer_threshold_hours": "48",
    "simulated_today": "2026-10-12",
    "app_base_url": "http://localhost:5173",
    "patient_insurance": "Ayushman Bharat",
}


def mock_llm() -> bool:
    return os.getenv("MOCK_LLM", "0") == "1" or not os.getenv("GROQ_API_KEY")


def step_delay() -> float:
    return float(os.getenv("PIPELINE_DELAY", "0.35"))
