"""Orchestrates the agents in order and yields progress events (used by the SSE route)."""
import logging
import time
from datetime import datetime

from sqlmodel import Session, delete, select

from .. import settings
from ..db import audit, engine, get_setting
from ..models import (CaregiverAlert, Document, Item, ItemText, PipelineRun, ProviderMatch, Reminder,
                      ReviewQueue, SourceLine, Task)
from .. import routing
from . import extractor, matcher, planner, simplifier, triage, verifier
from .med_template import LANGS
from .escalation import run_escalation
from .ingest import to_lines
from .privacy import mask_pii

log = logging.getLogger("carebridge.pipeline")

STEPS = [
    ("privacy", "Privacy guard"),
    ("ingest", "Reading the summary"),
    ("extract", "Finding the instructions"),
    ("verify", "Checking each one against the source"),
    ("triage", "Safety check"),
    ("plan", "Building tasks and reminders"),
    ("simplify", "Plain language and translation"),
    ("match", "Matching providers"),
    ("escalate", "Checking reminders"),
]


def reset_document(s: Session, doc_id: int) -> None:
    item_ids = [i.id for i in s.exec(select(Item).where(Item.document_id == doc_id))]
    task_ids = [t.id for t in s.exec(select(Task).where(Task.document_id == doc_id))]
    if task_ids:
        s.exec(delete(Reminder).where(Reminder.task_id.in_(task_ids)))
    if item_ids:
        s.exec(delete(ItemText).where(ItemText.item_id.in_(item_ids)))
        s.exec(delete(ProviderMatch).where(ProviderMatch.item_id.in_(item_ids)))
    for model in (Task, ReviewQueue, CaregiverAlert, Item, SourceLine, PipelineRun):
        s.exec(delete(model).where(model.document_id == doc_id))
    s.commit()


def _counts(s: Session, doc_id: int) -> tuple[int, int]:
    items = s.exec(select(Item).where(Item.document_id == doc_id)).all()
    return len(items), sum(1 for i in items if i.status == "Needs Review")


# Each step returns (message, flagged).
def step_privacy(s, doc, ctx):
    text, found = mask_pii(doc.raw_text)
    if found:
        doc.raw_text = text
    doc.pii_check_passed = True
    s.add(doc)
    s.commit()
    audit(s, doc.id, "privacy_guard", "scan", {"masked": [{"kind": f["kind"], "masked": f["masked"]} for f in found]})
    return (f"Masked {len(found)} personal detail(s)" if found else "No personal details found"), bool(found)


def step_ingest(s, doc, ctx):
    ctx["lines"], ctx["line_ids"] = {}, {}
    for no, text in to_lines(doc.raw_text):
        row = SourceLine(document_id=doc.id, line_no=no, text=text)
        s.add(row)
        s.commit()
        s.refresh(row)
        ctx["lines"][no] = text
        ctx["line_ids"][no] = row.id
    return f"{len(ctx['lines'])} lines numbered", False


def step_extract(s, doc, ctx):
    ctx["extracted"] = extractor.extract(list(ctx["lines"].items()), get_setting(s, "extract_model"), doc.raw_text)
    audit(s, doc.id, "extractor", "extracted", {"count": len(ctx["extracted"])})
    if not ctx["extracted"] and settings.mock_llm():
        return "Mock mode only knows the sample summaries. Add a Groq key to read other documents", True
    return f"Found {len(ctx['extracted'])} instructions", False


def step_verify(s, doc, ctx):
    ctx["dicts"] = []
    bad = 0
    for ex in ctx["extracted"]:
        v = verifier.verify(ex.original_text, ex.source_line_numbers, ctx["lines"], ex.date_raw, doc.discharge_date)
        item = Item(document_id=doc.id, category=ex.category, title=ex.title, original_text=ex.original_text,
                    source_line_ids=[ctx["line_ids"][n] for n in v["valid_lines"]], date_raw=ex.date_raw,
                    date_resolved=v["date_resolved"], time_of_day=ex.time_of_day, confidence=ex.confidence)
        s.add(item)
        s.commit()
        s.refresh(item)
        bad += bool(v["reasons"])
        ctx["dicts"].append({"id": item.id, "category": ex.category, "original_text": ex.original_text,
                             "date_raw": ex.date_raw, "date_resolved": v["date_resolved"],
                             "confidence": ex.confidence, "verify_reasons": v["reasons"]})
    audit(s, doc.id, "verifier", "verified", {"failed": bad})
    return f"{len(ctx['dicts']) - bad} of {len(ctx['dicts'])} quotes confirmed in the source", bool(bad)


def step_triage(s, doc, ctx):
    dicts = ctx["dicts"]
    flags = triage.triage_rules(dicts)
    for i, extra in triage.triage_llm(dicts, get_setting(s, "extract_model")).items():
        flags[i] += extra
    for i, d in enumerate(dicts):
        if not flags[i]:
            continue
        item = s.get(Item, d["id"])
        reasons = list(dict.fromkeys(f.reason for f in flags[i]))
        item.status = "Needs Review"
        item.review_reason = "; ".join(reasons)
        item.review_codes = sorted({f.code for f in flags[i]})
        s.add(item)
        entry = ReviewQueue(item_id=item.id, document_id=doc.id, reason=item.review_reason,
                            severity=triage.top_severity(flags[i]), codes=item.review_codes)
        s.add(entry)
        s.commit()
        s.refresh(entry)
        routing.assign(s, entry)
    s.commit()
    n, flagged = _counts(s, doc.id)
    audit(s, doc.id, "safety_triage", "triaged", {"needs_review": flagged})
    return f"{flagged} of {n} sent to a human reviewer", flagged > 0


def step_plan(s, doc, ctx):
    n = planner.plan_document(s, doc)
    audit(s, doc.id, "planner", "planned", {"tasks": n})
    return f"{n} tasks created", False


def step_simplify(s, doc, ctx):
    items = s.exec(select(Item).where(Item.document_id == doc.id)).all()
    out = simplifier.rewrite([{"id": i.id, "category": i.category, "title": i.title, "original_text": i.original_text,
                               "time_of_day": i.time_of_day} for i in items],
                             get_setting(s, "rewrite_model"), doc.raw_text)
    fallbacks = 0
    for it in items:
        r = out.get(it.id, {})
        for lang in LANGS:
            text = r.get(lang)
            if lang == "en" and (not text or not simplifier.numbers_match(it.original_text, text)):
                s.add(ItemText(item_id=it.id, language="en", simple_text=it.original_text, numbers_verified=True))
                fallbacks += 1
                continue
            if not text:
                continue
            ok = simplifier.numbers_match(it.original_text, text)
            fallbacks += (not ok)
            s.add(ItemText(item_id=it.id, language=lang, simple_text=text, numbers_verified=ok))
            if not ok:
                entry = ReviewQueue(item_id=it.id, document_id=doc.id, severity="low",
                                    reason=f"Numbers changed in the {lang} translation. English is shown instead")
                s.add(entry)
                s.commit()
                s.refresh(entry)
                routing.assign(s, entry)
    s.commit()
    audit(s, doc.id, "simplifier", "rewritten", {"fallbacks": fallbacks})
    return f"{len(items)} instructions rewritten in {len(LANGS)} languages", fallbacks > 0


def step_match(s, doc, ctx):
    n = matcher.match_document(s, doc)
    audit(s, doc.id, "provider_matcher", "matched", {"matches": n})
    return f"{n} provider suggestions", False


def step_escalate(s, doc, ctx):
    c = run_escalation(s, doc.id)
    return "Reminders and alerts are up to date", False


FUNCS = {"privacy": step_privacy, "ingest": step_ingest, "extract": step_extract, "verify": step_verify,
         "triage": step_triage, "plan": step_plan, "simplify": step_simplify, "match": step_match,
         "escalate": step_escalate}


def run_pipeline(doc_id: int):
    with Session(engine) as s:
        doc = s.get(Document, doc_id)
        if not doc:
            yield {"step": "error", "message": "Document not found"}
            return
        reset_document(s, doc_id)
        audit(s, doc_id, "system", "pipeline_started", {"mock": settings.mock_llm()})
        ctx: dict = {}
        yield {"step": "start", "steps": [{"key": k, "label": l} for k, l in STEPS]}
        for key, label in STEPS:
            run = PipelineRun(document_id=doc_id, step=key, state="running")
            s.add(run)
            s.commit()
            yield {"step": key, "state": "running", "label": label}
            time.sleep(settings.step_delay())
            try:
                message, flagged = FUNCS[key](s, doc, ctx)
            except Exception as e:
                log.exception("Step %s failed", key)
                run.state, run.message, run.finished_at = "failed", str(e)[:300], datetime.now()
                s.add(run)
                s.commit()
                audit(s, doc_id, "system", "pipeline_failed", {"step": key, "error": str(e)[:300]})
                yield {"step": key, "state": "failed", "label": label, "message": "This step failed. Please try again."}
                yield {"step": "error", "message": f"Step '{label}' failed"}
                return
            run.state, run.message, run.finished_at = ("flagged" if flagged else "done"), message, datetime.now()
            s.add(run)
            s.commit()
            n, nr = _counts(s, doc_id)
            yield {"step": key, "state": run.state, "label": label, "message": message, "items": n, "flagged": nr}
        n, nr = _counts(s, doc_id)
        audit(s, doc_id, "system", "pipeline_finished", {"items": n, "needs_review": nr})
        yield {"step": "complete", "document_id": doc_id, "items": n, "flagged": nr}
