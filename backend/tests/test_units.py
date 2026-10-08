import json
from datetime import date, datetime

import pytest
from sqlmodel import select

from app.agents import samples
from app.agents.dates import resolve_date
from app.agents.ingest import to_lines
from app.agents.matcher import is_open, match_item
from app.agents.pipeline import run_pipeline
from app.agents.privacy import mask_pii
from app.agents.simplifier import numbers_match
from app.agents.triage import triage_rules
from app.agents.verifier import quote_score, verify
from app.models import CaregiverAlert, Document, Item, ItemText, ProviderMatch, ReviewQueue, Task

D = date(2026, 10, 10)


def test_privacy_masks_real_looking_data():
    text = "Aadhaar 1234 5678 9012, phone 98765 43210, mail a.b@x.com, PAN ABCDE1234F"
    out, found = mask_pii(text)
    assert {f["kind"] for f in found} == {"aadhaar", "mobile", "email", "pan"}
    assert "9012" not in out and "ABCDE" not in out


def test_privacy_leaves_clinical_numbers():
    text = "Tab Aspirin 75 mg once daily. Call 108 at once."
    assert mask_pii(text) == (text, [])


@pytest.mark.parametrize("raw,expected", [
    ("after 2 weeks", date(2026, 10, 24)), ("on day 10", date(2026, 10, 20)),
    ("next Monday", date(2026, 10, 12)), ("18 Oct 2026", date(2026, 10, 18)),
    ("within 1 month", date(2026, 11, 10)), ("after 3 months", date(2027, 1, 10)),
    ("sometime next week", None), ("date to be decided", None), (None, None),
])
def test_date_resolution(raw, expected):
    assert resolve_date(raw, D) == expected


def test_verifier_quote_match():
    line = "Tab Aspirin 75 mg once daily in the morning after food"
    assert quote_score(line, line) == 1.0
    assert quote_score("Aspirin 75 mg once daily", line) == 1.0
    assert quote_score("Warfarin 5 mg twice daily at night", line) < 0.85
    r = verify("Tab Warfarin 5 mg", [1], {1: line}, None, D)
    assert r["reasons"]
    assert verify(line, [9], {1: line}, None, D)["reasons"]


def test_numbers_match():
    assert numbers_match("Aspirin 75 mg", "Aspirin 75 mg ஒரு முறை")
    assert not numbers_match("Aspirin 75 mg", "Aspirin 750 mg")


def _dicts(key):
    out = []
    for it in samples.fixture(key)["items"]:
        d = dict(it)
        d["date_resolved"] = resolve_date(it["date_raw"], D)
        out.append(d)
    return out


@pytest.mark.parametrize("key", ["a", "b", "c", "d"])
def test_triage_matches_gold_labels(key):
    dicts = _dicts(key)
    flags = triage_rules(dicts)
    for i, d in enumerate(dicts):
        assert bool(flags[i]) == d["expect_review"], (key, d["title"], flags[i])


def test_triage_flags_cover_each_rule():
    flags = triage_rules(_dicts("d"))
    reasons = " | ".join(f.reason for fl in flags.values() for f in fl)
    for needle in ("Vague", "Medicine start", "Date is missing", "Conflict", "Low extraction"):
        assert needle in reasons


@pytest.mark.parametrize("key", ["a", "b", "c", "d"])
def test_fixtures_quote_source_and_numbers(key):
    lines = dict(to_lines(samples.sample_text(key)))
    for it in samples.fixture(key)["items"]:
        assert quote_score(it["original_text"], lines[it["source_line_numbers"][0]]) == 1.0
        for lang in ("en", "ta", "hi"):
            assert numbers_match(it["original_text"], it["simple"][lang]), (key, lang, it["title"])


def _run(client_session, key):
    from app.agents.samples import sample_index, sample_text
    meta = next(m for m in sample_index() if m["key"] == key)
    doc = Document(title=meta["title"], patient_alias=meta["patient_alias"], discharge_date=date.fromisoformat(meta["discharge_date"]),
                   city=meta["city"], pincode=meta["pincode"], raw_text=sample_text(key))
    client_session.add(doc)
    client_session.commit()
    client_session.refresh(doc)
    events = list(run_pipeline(doc.id))
    return doc, events


@pytest.mark.parametrize("key", ["a", "b", "c", "d"])
def test_pipeline_end_to_end(session, key):
    doc, events = _run(session, key)
    assert events[-1]["step"] == "complete"
    items = session.exec(select(Item).where(Item.document_id == doc.id)).all()
    gold = samples.fixture(key)["items"]
    assert len(items) == len(gold)
    for it, g in zip(items, gold):
        assert (it.status == "Needs Review") == g["expect_review"], (it.title, it.review_reason)
        assert session.exec(select(ItemText).where(ItemText.item_id == it.id, ItemText.language == "ta")).first().numbers_verified
    queue = session.exec(select(ReviewQueue).where(ReviewQueue.document_id == doc.id)).all()
    assert len(queue) >= sum(g["expect_review"] for g in gold)
    if key == "d":
        assert sum(i.status == "Needs Review" for i in items) >= 10


def test_planner_tasks_and_provider_matches(session):
    doc, _ = _run(session, "a")
    tasks = session.exec(select(Task).where(Task.document_id == doc.id)).all()
    assert any(t.title == "Heart doctor visit with ECG" and t.due_at == datetime(2026, 10, 24, 10) for t in tasks)
    assert any("Morning medicines" in t.title for t in tasks)
    ref = session.exec(select(Item).where(Item.document_id == doc.id, Item.category == "referral")).first()
    ms = session.exec(select(ProviderMatch).where(ProviderMatch.item_id == ref.id)).all()
    assert 1 <= len(ms) <= 3 and all(m.reasons for m in ms)


def test_is_open():
    assert is_open("Mon-Sat", date(2026, 10, 12)) and not is_open("Mon-Fri", date(2026, 10, 17))


def test_escalation_creates_alert_after_clock_moves(session):
    from app.db import get_setting, set_setting
    from app.agents.escalation import run_escalation

    start = get_setting(session, "simulated_today")
    try:
        set_setting(session, "simulated_today", "2026-10-12")
        doc, _ = _run(session, "a")
        assert not session.exec(select(CaregiverAlert).where(CaregiverAlert.document_id == doc.id)).all()
        set_setting(session, "simulated_today", "2026-10-15")
        counts = run_escalation(session, doc.id)
        assert counts["alerts"] > 0 and counts["reviews"] > 0
        assert run_escalation(session, doc.id)["alerts"] == 0  # idempotent
    finally:
        set_setting(session, "simulated_today", start)


def test_medicine_template_is_fixed_and_keeps_numbers():
    from app.agents.med_template import LANGS, med_texts

    out = med_texts("Metoprolol 25 mg", "Tab Metoprolol 25 mg twice daily, morning and night", "morning,night")
    assert set(out) == set(LANGS)
    assert out["en"] == "Take Metoprolol 25 mg twice a day, in the morning and at night."
    assert all("25" in t and "Metoprolol" in t for t in out.values())
    # unclear lines are never reworded: the original line is used
    vague = "Tab Paracetamol 650 mg if required for fever"
    assert med_texts("Paracetamol 650 mg", vague, None)["ta"] == vague
    # a number that the template would drop falls back to the original line
    amlo = "Tab Amlodipine 5 mg once daily in the morning, may increase to 10 mg if BP stays high"
    assert med_texts("Amlodipine 5 mg", amlo, "morning")["en"] == amlo


def test_template_adds_dose_when_model_title_has_none():
    from app.agents.med_template import med_texts

    out = med_texts("Aspirin", "Tab Aspirin 75 mg once daily in the morning after food", "morning")
    assert out["en"] == "Take Aspirin 75 mg once a day, in the morning, after food."


def test_missing_dose_rule_and_codes():
    items = [{"category": "medication", "original_text": "Tab. Aspirin once daily. Continue as advised.", "date_raw": None,
              "date_resolved": None, "confidence": 0.9, "verify_reasons": []}]
    flags = triage_rules(items)[0]
    assert {f.code for f in flags} >= {"MISSING_DOSE", "VAGUE_WORDING"}
