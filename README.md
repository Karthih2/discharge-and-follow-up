# CareBridge by Code2Care Hospital

CareBridge turns a **synthetic** discharge summary into a trackable follow-up plan: tasks, dates, reminders, a timeline, medicine cards, six languages, provider suggestions and a printable fridge sheet. Anything unclear is held for a hospital doctor.

It organizes and explains. It never diagnoses, changes a medicine, recommends treatment, or promises that a provider is available. Every item shows the exact source line. All data is synthetic.

**Code2Care Hospital owns the system.** Its management team creates the doctors and assigns the reviews. Only patients and family hubs can sign up.

## Run the demo (one command, one address)

```powershell
.un_demo.bat
```

It sets everything up the first time (Python packages, app packages, build), starts one server and opens **http://localhost:8000/demo**. Close the window to stop. Add `rebuild` (`.un_demo.bat rebuild`) after changing the frontend.

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

For development with hot reload, run `.un_backend.bat` and `.un_frontend.bat` (http://localhost:5173, same paths).

## What each app has

- **Patient and hub site:** a website landing page (process, who it is for, plan preview, safety, questions), then create account (patient or hub manager only). Signed in: plans, add summary, live run, plan with **Cards / Two panels / Timeline** displays, large text mode, medicine cards, locked Needs Review cards, listen, callback, flag, provider map, fridge sheet, sharing controls, activity log. Hub managers and family viewers see only what the patient shares.
- **Doctor workspace:** review queue (oldest first, reason codes, unclear words marked, a form to fill missing medicine values, safety gate re-check), callbacks, availability toggle.
- **Management console:** overview, review queue assignment, reviewers (create doctors with a starting password, availability and backup handling), callbacks (start call, mark completed), audit log. It never shows clinical text.

Statuses are only **Pending**, **Completed** and **Needs Review**.

## Demo accounts (invented people)

Password for all: `demo1234`.

- Patients: `ramesh@code2care.test`, `sunita@…`, `karthik@…`, `lakshmi@…`
- Hub manager: `priya@code2care.test`. Family viewer: `arun@code2care.test`
- Doctors (doctor app): `meera@`, `arjun@`, `sana@`, `vikram@code2care.test`
- Management (management app): `admin@code2care.test`

## Demo script

1. Open /demo and follow the seven steps. Management already has demo plans loaded.
2. Patient site: sign in as Ramesh. Open the plan, try the three displays, switch language, **Show original**, **Listen**, **Request callback**, **Ask a doctor to check**, **Find provider**.
3. Sharing: Priya has the full plan, Arun appointments only.
4. Sign in as Priya, then Arun, to see the filtered views and the grey locked cards.
5. Doctor workspace: confirm one item and correct a medicine. The patient plan updates.
6. Mark a doctor unavailable. Their items move to the backup.
7. Move the demo clock +3 days. Priya gets alerts. Management runs a callback.

## Keys (`backend\.env`)

```
GROQ_API_KEY=        # extraction, safety check, translation. No key or MOCK_LLM=1 uses fixtures for the samples.
ELEVENLABS_API_KEY=  # optional. Voice reads approved text aloud. Without it the browser voice is used.
JWT_SECRET=          # set a long random value for anything beyond a demo
```

Models live in the SQLite `settings` table (`openai/gpt-oss-120b` for extraction, `openai/gpt-oss-20b` for rewriting). Medicine lines never use the model: they come from a fixed template.

## Tests

```powershell
cd backend; .venv\Scripts\python -m pytest     # 51 tests, including portal separation
cd ..\frontend; npm run build                  # builds all three apps, zero TypeScript errors
```

Regenerate samples, fixtures and the 60 invented providers with `backend\.venv\Scripts\python backend\data\make_data.py`. An older demo database is recreated automatically.

## Limits

- SQLite, no encryption and no row level security. Access is checked in the API.
- Groq instead of Claude. No Celery, Redis or Docker: reminders and escalation run in the backend and are safe to repeat.
- Callback is a simulation with invented masked numbers. No real call or SMS.
- Telugu, Kannada, Malayalam (and the Tamil and Hindi UI text) need a native speaker check.
- Demo accounts share one published password. Do not deploy as is.
