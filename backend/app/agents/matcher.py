"""Provider matcher: transparent scoring, suggestions only."""
import math
import re
from datetime import date

from sqlmodel import Session, select

from ..db import get_setting
from ..models import Document, Item, Provider, ProviderMatch

DISCLAIMER = "Suggestion only. Please call to confirm availability."

# Approximate centres of the synthetic pincodes (used when the user's pincode is known).
PINCODES = {
    "600017": (13.0418, 80.2341), "600020": (13.0012, 80.2565), "600040": (13.0850, 80.2101),
    "600042": (12.9815, 80.2180), "600004": (13.0368, 80.2676), "600045": (12.9249, 80.1000),
    "600032": (13.0067, 80.2206), "600010": (13.0827, 80.2420),
    "110001": (28.6315, 77.2167), "110024": (28.5677, 77.2433), "110075": (28.5921, 77.0460),
    "110085": (28.7495, 77.0565), "110017": (28.5245, 77.2066), "110005": (28.6519, 77.1909),
    "110070": (28.5200, 77.1590), "110058": (28.6219, 77.0878),
}
CITY_CENTRE = {"chennai": (13.0418, 80.2341), "delhi": (28.6315, 77.2167)}

# (regex on item text, provider types, specialty keywords)
NEEDS = [
    (r"cardiac rehab|walking program", ["physio", "hospital"], ["cardiac rehabilitation"]),
    (r"physio", ["physio"], ["physiotherapy", "orthopaedic rehabilitation"]),
    (r"eye|retina|ophthalm", ["clinic", "hospital"], ["ophthalmology"]),
    (r"dietician|diet plan", ["clinic", "hospital"], ["dietetics"]),
    (r"x-ray|xray|scan|ultrasound", ["lab"], ["radiology"]),
    (r"\becg\b", ["lab", "hospital"], ["cardiac diagnostics"]),
    (r"blood|lipid|hba1c|kidney|cbc|sugar|urine", ["lab"], ["pathology"]),
    (r"chest specialist|pulmon", ["clinic", "hospital"], ["pulmonology"]),
]
DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def km(a, b) -> float:
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dl = math.radians(b[1] - a[1])
    dp = p2 - p1
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def is_open(open_days: str, d: date | None) -> bool:
    if d is None:
        return True
    m = re.match(r"(\w{3})-(\w{3})", open_days.lower())
    if not m or m[1] not in DAYS or m[2] not in DAYS:
        return True
    a, b, w = DAYS.index(m[1]), DAYS.index(m[2]), d.weekday()
    return a <= w <= b if a <= b else (w >= a or w <= b)


def needs_for(text: str):
    t = text.lower()
    for rx, types, specs in NEEDS:
        if re.search(rx, t):
            return types, specs
    return ["clinic", "hospital"], ["general medicine"]


def score_provider(p: Provider, item: Item, doc: Document, origin, language: str, insurance: str):
    types, specs = needs_for(f"{item.title} {item.original_text}")
    score, reasons = 0.0, []
    have = [s.strip().lower() for s in p.specialties.split(";")]
    if any(s in have for s in specs):
        score += 40
        reasons.append(f"Offers {specs[0]}")
    elif p.type in types:
        score += 15
        reasons.append(f"Is a {p.type}, but does not list {specs[0]}")
    else:
        return 0.0, []
    if p.type in types:
        score += 10
    d = km(origin, (p.lat, p.lng))
    pts = 25 if d <= 3 else 18 if d <= 8 else 10 if d <= 15 else 3
    score += pts
    reasons.append(f"About {d:.0f} km from pincode {doc.pincode}" if d >= 1 else f"Less than 1 km from pincode {doc.pincode}")
    if language in p.languages.split(";"):
        score += 10
        reasons.append("Speaks " + {"en": "English", "ta": "Tamil", "hi": "Hindi"}.get(language, language))
    if insurance and insurance.lower() in p.insurance.lower():
        score += 10
        reasons.append(f"Accepts {insurance}")
    if item.date_resolved:
        if is_open(p.open_days, item.date_resolved):
            score += 5
            reasons.append(f"Open on {item.date_resolved:%A} ({p.open_days})")
        else:
            reasons.append(f"May be closed on {item.date_resolved:%A} ({p.open_days})")
    return score, reasons


def match_item(session: Session, item: Item, doc: Document, top: int = 3) -> int:
    origin = PINCODES.get(doc.pincode) or CITY_CENTRE.get(doc.city.lower(), (13.0418, 80.2341))
    insurance = get_setting(session, "patient_insurance")
    scored = []
    for p in session.exec(select(Provider).where(Provider.city == doc.city)):
        s, r = score_provider(p, item, doc, origin, doc.preferred_language, insurance)
        if s > 0:
            scored.append((s, p, r))
    scored.sort(key=lambda x: -x[0])
    for s, p, r in scored[:top]:
        session.add(ProviderMatch(item_id=item.id, provider_id=p.id, score=s, reasons=r))
    session.commit()
    return min(top, len(scored))


def match_document(session: Session, doc: Document) -> int:
    items = session.exec(select(Item).where(Item.document_id == doc.id,
                                            Item.category.in_(["referral", "test"]))).all()
    return sum(match_item(session, i, doc) for i in items)
