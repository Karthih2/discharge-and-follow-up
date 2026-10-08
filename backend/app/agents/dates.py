"""Resolve relative or explicit date phrases against the discharge date."""
import calendar
import re
from datetime import date, timedelta
from typing import Optional

MONTHS = {m.lower(): i for i, m in enumerate(calendar.month_abbr) if m}
WORDS = {"a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
         "seven": 7, "eight": 8, "ten": 10, "twelve": 12}
WEEKDAYS = [d.lower() for d in calendar.day_name]


def add_months(d: date, n: int) -> date:
    m = d.month - 1 + n
    y, m = d.year + m // 12, m % 12 + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def resolve_date(raw: Optional[str], discharge: date) -> Optional[date]:
    if not raw:
        return None
    s = raw.lower().strip()
    if "sometime" in s or "decided" in s:
        return None
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return date(int(m[1]), int(m[2]), int(m[3]))
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        return date(int(m[3]), int(m[2]), int(m[1]))
    m = re.search(r"(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3})[a-z]*\.?,?\s*(\d{4})?", s)
    if m and m[2] in MONTHS:
        try:
            return date(int(m[3] or discharge.year), MONTHS[m[2]], int(m[1]))
        except ValueError:
            return None
    m = re.search(r"\b(?:after|in|within)\s+(\d+|[a-z]+)\s*(day|week|month)s?\b", s)
    if m:
        n = int(m[1]) if m[1].isdigit() else WORDS.get(m[1])
        if n is None:
            return None
        if m[2] == "day":
            return discharge + timedelta(days=n)
        if m[2] == "week":
            return discharge + timedelta(weeks=n)
        return add_months(discharge, n)
    m = re.search(r"\bday\s+(\d+)\b", s)
    if m:
        return discharge + timedelta(days=int(m[1]))
    m = re.search(r"\bnext\s+([a-z]+day)\b", s)
    if m and m[1] in WEEKDAYS:
        ahead = (WEEKDAYS.index(m[1]) - discharge.weekday()) % 7 or 7
        return discharge + timedelta(days=ahead)
    if "tomorrow" in s:
        return discharge + timedelta(days=1)
    return None
