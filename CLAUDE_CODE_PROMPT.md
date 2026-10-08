# Build: CareBridge, an agentic discharge and follow-up coordinator

You are building a hackathon prototype in this folder. It must run end to end on Windows with one command per side (backend and frontend). Read this whole prompt before writing code, then follow the build order at the bottom. Do not skip the verification steps.

## 1. What the product does

A family caregiver (or the patient) uploads a **synthetic** hospital discharge summary. A pipeline of small agents turns it into a clear, trackable follow-up plan:

- Extract: follow-up appointments, tests, referrals, medication instructions, care instructions (wound care, diet, activity, rehab), dates, and warning-sign text.
- Turn them into tasks, reminders, and a timeline with statuses: `Pending`, `Completed`, `Needs Review`, `Approved`.
- Rewrite every item in plain, patient-friendly English (about Class 6 reading level), and translate to **Tamil** and **Hindi**.
- Match referrals and tests to synthetic providers/facilities.
- Escalate unclear instructions, symptoms, medication questions, and anything clinically sensitive to a human reviewer.
- Produce a **one-page printable fridge sheet** with icons and a QR code.
- Let the patient **share the plan with family** through a link/QR, giving the family member a caregiver view and escalation alerts.

### Hard safety boundary (enforce in code and in prompts)
The system organizes and explains. It must never diagnose, change or suggest changing a medication, recommend treatment, or present a provider match as a guarantee. Every extracted item must cite the source line(s) it came from. When unsure, the item becomes `Needs Review` and the patient sees "Your care team will confirm this" instead of a guess. Only synthetic data is used anywhere.

## 2. Stack (do not substitute)

- **Backend:** Python 3.11+, FastAPI, Uvicorn, SQLModel on **SQLite** (`backend/carebridge.db`), Pydantic v2, `groq` Python SDK, `python-dotenv`, `pdfplumber` (PDF text), `qrcode[pil]`, `pytest`.
- **Frontend:** React 18 + Vite + TypeScript, Tailwind CSS, `motion` (Framer Motion) for animation, `@phosphor-icons/react` for icons, `react-router-dom`, `qrcode.react`.
- **LLM:** Groq. Key lives only in `backend/.env` as `GROQ_API_KEY` (create `backend/.env.example`, never hardcode or log the key, never send it to the frontend).
  - Default models, stored in the SQLite `settings` table so they can be changed without code edits: `extract_model = llama-3.3-70b-versatile`, `rewrite_model = llama-3.1-8b-instant`. On startup call `client.models.list()` and log a clear warning if a configured model is not available.
  - Always `temperature=0` for extraction/triage, `response_format={"type": "json_object"}`, validate output with Pydantic, retry once with the validation error appended, and if it still fails mark affected items `Needs Review` rather than crashing.
  - `MOCK_LLM=1` env flag: return hand-written fixture JSON for the sample summaries so the demo works with no key or no network. The fixtures double as gold labels for tests.

## 3. SQLite: store every required value

Use SQLModel tables. Create them on startup and seed if empty.

| Table | Key fields |
|---|---|
| `settings` | key, value (model names, enabled languages, escalation thresholds in hours, simulated "today" date, app base URL for QR codes) |
| `documents` | id, title, patient_alias (synthetic), discharge_date, city, pincode, preferred_language, raw_text, created_at, pii_check_passed |
| `source_lines` | id, document_id, line_no, text |
| `items` | id, document_id, category (appointment, test, referral, medication, wound_care, diet, activity, rehab, warning_sign, other), title, original_text, source_line_ids (JSON), date_raw, date_resolved, time_of_day (morning/afternoon/night, for meds), confidence, status, review_reason |
| `item_texts` | item_id, language (en/ta/hi), simple_text, numbers_verified (bool) |
| `tasks` | id, item_id, document_id, title, due_at, status, completed_at |
| `reminders` | id, task_id, remind_at, channel (in_app / sms_simulated), sent |
| `review_queue` | id, item_id, reason, severity, state (open/approved/edited/rejected), reviewer_note, resolved_at |
| `audit_log` | id, document_id, actor (system/agent name/reviewer/caregiver), action, detail JSON, created_at |
| `providers` | id, name, type (hospital/clinic/lab/pharmacy/physio/home_care), specialties, city, pincode, lat, lng, languages, insurance, open_days, phone (fake format), synthetic=true |
| `provider_matches` | id, item_id, provider_id, score, reasons JSON |
| `share_links` | id, document_id, token (random, url-safe), role (caregiver), caregiver_name, created_at, revoked |
| `caregiver_alerts` | id, document_id, task_id, message, level, created_at, acknowledged_at |
| `pipeline_runs` | id, document_id, step, state, started_at, finished_at, message |

Every agent writes to `audit_log`. Nothing important lives only in memory.

## 4. Agent pipeline (backend/app/agents/)

Run as a sequence, streamed to the UI via **Server-Sent Events** (`GET /api/documents/{id}/run` streams step events). Each step updates `pipeline_runs`.

1. **Privacy guard** (code): scan input for real-looking personal data (12-digit Aadhaar patterns, Indian mobile numbers, emails, PAN format). If found, mask it and show the user what was masked before continuing. Store `pii_check_passed`.
2. **Ingest** (code): PDF or pasted text into numbered lines saved in `source_lines`.
3. **Extractor** (Groq, extract_model): returns items with `category, title, original_text, source_line_ids, date_raw, time_of_day, confidence`. System prompt must forbid inventing anything not in the text and require quoting.
4. **Verifier** (code, the anti-hallucination step): confirm each `original_text` actually appears in the cited lines (normalized fuzzy match, threshold 0.85). Resolve relative dates ("after 2 weeks", "on day 10", "next Monday") against `discharge_date`. Failure of either rule sets `Needs Review` with a specific `review_reason`.
5. **Safety triage** (rules first, then Groq): deterministic rules always run, even if the LLM fails. Flag: vague wording (as needed, if required, adjust, review later, SOS, PRN), missing or unresolvable dates, medication start/stop/dose-change language, conflicting instructions, any symptom or warning sign, confidence < 0.7. Rules decide; the LLM may only add flags, never remove them. Flagged items go to `review_queue`.
6. **Planner** (code): create tasks, reminders (default: 1 day before and morning of each appointment/test; daily per med time_of_day), and timeline entries.
7. **Simplifier + translator** (Groq, rewrite_model): plain English, then Tamil and Hindi. Drug names, doses, units, and all numbers must stay exactly as in the original. A code check compares the set of numbers in each translation to the original; on mismatch, keep English only for that item and flag it.
8. **Provider matcher** (code scoring): for referrals and tests, score providers by specialty/type match, distance from the user's pincode, language match, insurance, and open on the due date. Store top 3 with human-readable reasons. Always display "Suggestion only. Please call to confirm availability."
9. **Escalation engine** (code, runs on demand and on every page load): using the simulated "today" from settings, a task past due by `remind_threshold_hours` gets an in-app reminder; past `caregiver_threshold_hours` creates a `caregiver_alerts` row; past `reviewer_threshold_hours` adds a review_queue entry. Provide `POST /api/demo/clock` to move simulated today forward (demo control).

## 5. Required features

### Patient plan
Timeline (by date), task list with status changes, medicine schedule by morning/afternoon/night, warning-signs panel that shows the doctor's exact words, language toggle (EN / தமிழ் / हिंदी), and a "See source" action on every item that opens the original summary with the cited lines highlighted. Download reminders as `.ics`.

### Reviewer dashboard
Queue sorted by severity, side-by-side original text vs extracted item, Approve / Edit / Reject with a note, and the full audit log per document. Approved items become visible as normal to the patient.

### Fridge sheet (`/plan/:id/print`)
One A4 page designed for print with `@media print`: patient alias, discharge date, medicine grid with custom SVG icons for morning (sunrise), afternoon (sun), night (moon), upcoming appointments/tests with a calendar icon, warning signs in a bordered block with "Call your doctor or go to the hospital if:" heading, emergency number 108, the selected language, and a QR code to the live plan. A "Print / Save as PDF" button triggers `window.print()`. Browser printing handles Tamil and Hindi shaping correctly, so do not generate the PDF server-side.

### Family sharing
"Share with family" creates a `share_links` token and shows a link plus QR. `/c/:token` opens a caregiver view: same plan, read-only except they can mark tasks complete and acknowledge alerts, plus an alerts feed from the escalation engine. Links can be revoked. Every caregiver action is audited.

### Pages
Landing, Upload, Live pipeline run, Patient plan, Providers, Reviewer, Caregiver view, Fridge sheet, **Terms of Use**, **Privacy Policy**, **Safety & Limitations** (what the system does not do, that data is synthetic, human review). Link all three from the footer.

## 6. Synthetic data to create (backend/data/)

- 4 synthetic discharge summaries as `.txt` (and one also as `.pdf`): (a) post heart attack with angioplasty, (b) knee replacement with physiotherapy and wound care, (c) type 2 diabetes with new insulin and diet plan, (d) a deliberately messy one with vague wording, a missing date, and conflicting instructions, so escalation is visible. Indian context (Chennai and Delhi), invented names, invented hospitals, dates in Oct–Nov 2026.
- `providers.csv`: about 60 invented providers across Chennai and Delhi with all `providers` fields. If a `Care Provider Finder` dataset file is later placed in `backend/data/`, the loader should use it instead (map its columns, log any unmapped ones).
- `fixtures/*.json`: expected extraction for each sample (used by MOCK_LLM and tests).

## 7. Design (frontend). Follow strictly.

Use the assets in this folder: `colors.jpeg` (palette) and `hero page image.jpeg` (hero illustration). Copy the illustration to `frontend/public/hero.jpeg` and use it on the landing page.

**Tokens**
- Primary `#0E7C7B` (actions, links, active states)
- Secondary `#5ED6C3` (progress, completed accents, used sparingly)
- Background `#EAFBF6` (page background)
- Surface `#F6FCFA` (cards and panels; never pure #FFFFFF)
- Ink `#0B2E2D` (text), Muted ink `#4A6563`, Line `#C9E6DF` (1px borders)
- Review/attention `#B5452F` (muted terracotta, for Needs Review and warning signs only), with tint `#F7E9E5`
- Define all as CSS variables and Tailwind theme colors. No other hues.

**Type:** Headings in **Fraunces** (serif, matches the palette card). Body in **Source Sans 3**. Tamil in **Noto Sans Tamil**, Hindi in **Noto Sans Devanagari**. Load from Google Fonts. Base size 17px, line-height 1.6, generous spacing for older readers.

**Shape and depth:** corner radius 2px to 4px maximum. No drop shadows anywhere; separate with 1px borders and background tone. Flat solid fills.

**Banned (do not use any of these):** harsh gradients, Lucide icons, pure white backgrounds, rainbow or multicolor accents, drop shadows, a row of 3 feature cards, emojis, glassmorphism/liquid glass, em dashes in any UI copy, Inter/Geist/Space Grotesk, terminal-window graphics, testimonials, bento grids, neon colors, "it's not X, it's Y" phrasing, checkmark bullet lists, pricing tiers, radial glow orbs, dot-grid backgrounds, sparkle icons, animated arrows, hover-movement animations (hover may only change color or underline), colored left-stripe cards, generic pastel palettes, purple and black.

**Landing page:** full-height hero with the illustration on one side and a plain, specific headline on the other (example: "Leaving hospital comes with a lot of instructions. We turn them into a plan your family can follow."). Primary action: "Try with a sample summary", which runs the real pipeline on sample (a) and lands on the live run screen. Below the hero, "How it works" as a numbered vertical sequence of 5 steps (no card grid). Then a real embedded preview of a generated plan (actual component, not a screenshot). Footer with Terms, Privacy, Safety & Limitations, and a line stating all data is synthetic.

**Animation and effects (purposeful only), using `motion`:**
- Live pipeline screen: each agent step appears in sequence as SSE events arrive, with a progress line that fills in secondary color, step state transitions (waiting, running, done, flagged), and a running count of items found.
- Timeline items reveal with a short staggered fade-and-rise (180ms, 40ms stagger) on first load.
- Status changes animate with a layout transition (task moves between groups smoothly).
- Skeleton loaders on every async view (shapes matching the final layout, soft pulse in Line color).
- "See source" scrolls to and briefly highlights cited lines with a background fade.
- Page transitions: 150ms opacity crossfade.
- Respect `prefers-reduced-motion` (disable all of the above except instant state changes).

**Copy:** plain, warm, short sentences. No marketing filler. Tamil/Hindi UI strings in a simple i18n dictionary file.

## 8. Project layout

```
backend/
  app/ main.py, db.py, models.py, settings.py, llm.py, agents/*.py, routes/*.py
  data/ samples/, providers.csv, fixtures/
  tests/
  .env.example, requirements.txt
frontend/
  src/ pages/, components/, lib/api.ts, i18n/, styles/
run_backend.bat, run_frontend.bat, README.md
```

`run_backend.bat` creates a venv if missing, installs requirements, and starts Uvicorn on port 8000. `run_frontend.bat` runs `npm install` if needed and starts Vite on 5173 with a proxy to `/api`. README covers setup, adding the Groq key, MOCK mode, the demo script, and limitations.

## 9. Build order (verify each before moving on)

1. Backend skeleton, SQLite models, seeding (settings, providers, samples). Verify: DB file created, tables populated.
2. Privacy guard, ingest, verifier, triage rules, planner, escalation engine with unit tests that pass using MOCK_LLM fixtures.
3. Groq client wrapper with validation and retry, extractor, simplifier/translator. Verify with a real key if present; otherwise confirm MOCK path.
4. Provider matcher and all REST + SSE routes. Verify every route with a pytest API test.
5. Frontend design tokens, fonts, layout shell, footer pages.
6. Upload, live pipeline, patient plan, see-source, language toggle, .ics.
7. Reviewer dashboard and audit log.
8. Fridge sheet with QR and print styles. Verify print preview fits one A4 page in English and Tamil.
9. Family sharing, caregiver view, alerts, demo clock.
10. Landing page last.
11. Final check: run `pytest`, run `npm run build` with zero TypeScript errors, start both servers, and walk the full demo: sample (d) must produce visible Needs Review items; moving the demo clock must create a caregiver alert visible on the caregiver link. Fix anything that fails. Then scan the frontend for every banned item in section 7 and remove any you find.

## 10. Demo script (put in README)
Landing, run sample, watch agents work, open plan, switch to Tamil, click See source, open a provider match, open reviewer and approve an item, print the fridge sheet, share with family, move the clock forward 3 days, show the caregiver alert.
