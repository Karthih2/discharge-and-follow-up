# CareBridge by Code2Care Hospital

CareBridge turns a **synthetic** discharge summary into a trackable follow-up plan: tasks, dates, reminders, a timeline, medicine cards, six languages, provider suggestions and a printable fridge sheet. Anything unclear is held for a hospital doctor.

It organizes and explains. It never diagnoses, changes a medicine, recommends treatment, or promises that a provider is available. Every item shows the exact source line. All data is synthetic.

**Code2Care Hospital owns the system.** Its management team creates the doctors and assigns the reviews. Only patients and family hubs can sign up.

## Run the demo (one command, one address)

```powershell
.
un_demo.bat
```

It sets everything up the first time (Python packages, app packages, build), starts one server and opens **http://localhost:8000/demo**. Close the window to stop. Add `rebuild` (`.
un_demo.bat rebuild`) after changing the frontend.

Demo mode loads two sample plans, so every screen has content, and adds two helpers:

- **/demo** is a guide: seven steps, each one signs you in as the right person and opens the right screen, plus Move clock +3 days and Reset.
- **Demo button** (bottom right of every screen) switches between people in one click without leaving the page.

## Three apps, one address

| App | Who | Path |
|---|---|---|
| Patient and hub site | Patients, hub managers, family viewers | `/` |
| Doctor workspace | Hospital doctors | `/doctor` |
| Management console | Hospital management | `/management` |

They are separate apps. Each has its own sign in page and keeps its own login (a separate storage key), so one browser can hold a patient, a doctor and management at once. The patient site never links to the staff apps, the staff sign in pages accept only staff, and the patient sign in rejects staff with the same "wrong email or password" message. The API checks the role on every doctor and management route, and there is no staff sign up. The Demo button and /demo exist only when the server starts with `DEMO=1` (what `run_demo.bat` does).

For development with hot reload, run `.
un_backend.bat` and `.
un_frontend.bat` (http://localhost:5173, same paths).

## What each app has

- **Patient and family site:** sign in with demo chips, a three step welcome on first sign in, a **Today** home (medicines by morning, afternoon and night with tap to mark taken, next visit and place, items waiting for a doctor, progress, next 7 days, quick actions), plans, live run, three plan displays, medicine cards, locked Needs Review cards, listen, callback, provider map, fridge sheet and sharing. Hub managers and family viewers get a hub home (status, overdue count, open alerts per patient) and an alert list, limited by what each patient shares.
- **Doctor workspace:** **My day** (open, overdue, callbacks, patients with late tasks, availability and backup), a two pane review queue (source lines marked beside the extracted item, Confirm, Correct, Send back with note, keys J K C E S, filters and search), patients (read only plan and review history) and callbacks (notes, completed, no answer, reschedule). The safety gate re-check is unchanged.
- **Management console:** overview with 7, 30 and 90 day ranges and a department filter (8 numbers and 4 charts, each with a plain table, all from SQL), review assignment and bulk reassign, doctors (create, department, availability, backup, deactivate, reset password), callbacks (assign, start, complete, no answer), patients (no clinical text), settings and an audit log with filters and CSV export. Every action is audited. It never shows clinical text.

Statuses are only **Pending**, **Completed** and **Needs Review**. Review states show as Open, Confirmed, Corrected and Sent back.

## Demo accounts (invented people)

Password for all: `demo1234`. Emails end in `@code2care.test`.

- Patients: ramesh, sunita, karthik, lakshmi, and ten more in Chennai, Bengaluru, Hyderabad, Kochi and Delhi (murugan, kavitha, deepak, shreya, venkat, farah, thomas, reshma, rohit, neha)
- Hub managers: priya, sanjay, latha. Family viewers: arun, pooja, kiran
- Doctors: meera, arjun, sana, vikram (away, backup arjun), kavya (neurology), imran (pulmonology)
- Management: admin

Demo mode seeds a month of history (about 20 plans, reviews in every state, callbacks in every state, alerts, 30 days of audit). It is deterministic, takes about 2.5 seconds and is rebuilt by **Reset**.

## Demo script

1. Patient site: sign in as ramesh (Today view), priya (hub home, alerts) and arun (appointments only, grey locked cards).
2. /doctor: sign in as meera. Open the queue and clear three reviews with C, E and S.
3. /management: sign in as admin. Reassign a review, create a doctor, export the audit log.
4. Move the demo clock +3 days. Alerts and dashboard numbers change.

## Keys (`backend\.env`)

```
GROQ_API_KEY=        # extraction, safety check, translation. No key or MOCK_LLM=1 uses fixtures for the samples.
ELEVENLABS_API_KEY=  # optional. Voice reads approved text aloud. Without it the browser voice is used.
JWT_SECRET=          # set a long random value for anything beyond a demo
```

Models live in the SQLite `settings` table (`openai/gpt-oss-120b` for extraction, `openai/gpt-oss-20b` for rewriting). Medicine lines never use the model: they come from a fixed template.

## Tests

```powershell
cd backend; .venv\Scripts\python -m pytest     # 67 tests, including role separation and seed determinism
cd ..\frontend; npm run build                  # builds all three apps, zero TypeScript errors
```

Regenerate samples, fixtures and the 60 invented providers with `backend\.venv\Scripts\python backend\data\make_data.py`. An older demo database is recreated automatically.

## Limits

- SQLite, no encryption and no row level security. Access is checked in the API.
- Groq instead of Claude. No Celery, Redis or Docker: reminders and escalation run in the backend and are safe to repeat.
- Callback is a simulation with invented masked numbers. No real call or SMS.
- Telugu, Kannada, Malayalam (and the Tamil and Hindi UI text) need a native speaker check.
- Demo accounts share one published password. Do not deploy as is.

## Speed (before and after)

| Measure | Before | After |
|---|---|---|
| Patient site first page JS (gzip) | about 180 KB | about 135 KB |
| Doctor workspace first page JS (gzip) | about 180 KB | about 140 KB |
| Management first page JS (gzip, with Recharts) | n/a | about 225 KB |
| List endpoints, demo data | not measured | under 25 ms each |

Every screen is its own chunk, so the patient site never downloads doctor or management code. Lists are paged (X-Total-Count header), related rows load in batches, and SQLite has indexes on every foreign key and filter column.
