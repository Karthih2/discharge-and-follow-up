<div align="center">

# CareBridge

**From Discharge to Recovery**

Turn hospital discharge summaries into simple, trackable follow-up plans — in 6 Indian languages.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_AI-F55036?style=flat-square)

</div>

---

## The Problem

When patients leave a hospital, they receive a discharge summary — a dense medical document with medications, follow-up appointments, lifestyle changes, and warning signs. Most patients and families struggle to understand it, miss critical follow-ups, or misinterpret dosage instructions. This is especially challenging in India where patients speak different languages and may have limited medical literacy.

## The Solution

CareBridge uses AI to read discharge summaries and convert them into clear, actionable follow-up plans. Every extracted instruction is traced back to its exact source line, and anything unclear or risky is held for a doctor to review before the patient sees it.

> **Important:** CareBridge organizes and explains. It never diagnoses, changes a medicine, or recommends treatment. All data in the demo is synthetic.

---

## Features

### AI-Powered Extraction
Upload a discharge summary (text or PDF). The AI extracts every instruction — medications, appointments, tests, lifestyle changes — and links each one to its exact source line for full traceability.

### Safety First
Vague, risky, or conflicting instructions are automatically flagged and locked until a doctor reviews and approves them. Patients never see unverified medical guidance.

### 6 Indian Languages
English, Tamil, Hindi, Telugu, Kannada, and Malayalam. Instructions are rewritten in plain language and translated, with text-to-speech read-aloud support.

### Medicine Schedule
Medications are organized into morning, afternoon, and night slots with tap-to-mark-taken tracking and automated reminders.

### Smart Reminders & Escalation
Missed tasks trigger a reminder chain: patient first, then family members, then the assigned doctor.

### Provider Directory
Nearby labs, clinics, hospitals, and pharmacies suggested by specialty, distance, language, and insurance — with a schematic map view.

### Printable Fridge Sheet
A one-page summary with QR code that families can print and stick on the fridge.

### Three Apps, One Server

| App | For | Path |
|---|---|---|
| Patient & Family | View plans, track tasks, share with family | `/` |
| Doctor Workspace | Review flagged items, manage patients | `/doctor` |
| Management Console | Hospital-wide analytics and oversight | `/management` |

---

## How It Works

```
Upload Summary → AI Pipeline → Doctor Review → Patient Plan
```

The AI pipeline runs 9 steps in sequence:

1. **Privacy Guard** — masks Aadhaar, PAN, phone numbers, and emails
2. **Read** — numbers every line of the summary
3. **Extract** — AI finds instructions and quotes them word-for-word
4. **Verify** — confirms each quote exists in the source, resolves dates
5. **Safety Check** — flags vague, risky, or conflicting items for doctor review
6. **Plan** — creates dated tasks and reminders
7. **Simplify & Translate** — rewrites in plain language across 6 languages
8. **Match Providers** — suggests nearby providers by specialty and distance
9. **Escalate** — sets up reminder chains for overdue tasks

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### Setup

```bash
git clone https://github.com/Karthih2/discharge-and-follow-up.git
cd discharge-and-follow-up
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_key
MOCK_LLM=0
JWT_SECRET=your_long_random_secret
```

### Run

**Quick start (Windows):**
```powershell
.\run_demo.bat
```

**Development:**

```bash
# Terminal 1 — Backend
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
DEMO=1 python -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

### Demo Accounts

All passwords: `demo1234` · All emails: `<name>@code2care.test`

| Role | Accounts |
|---|---|
| Patient | ramesh, sunita, karthik, lakshmi |
| Family Hub | priya, sanjay, latha |
| Doctor | meera, arjun, sana, kavya |
| Admin | admin |

---

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Motion, Recharts |
| Backend | Python, FastAPI, SQLModel, Pydantic |
| Database | SQLite (WAL mode) |
| AI | Groq API (LLM extraction + translation) |

---

## Team

<div align="center">

| 👨‍💻 | 👨‍💻 | 👨‍💻 | 👨‍💻 | 👩‍💻 |
|:---:|:---:|:---:|:---:|:---:|
| **Karthikeyan S** | **Karthick S** | **Vidhursh Kumar V** | **Giridharan R** | **Janani V R** |

<br/>

**Made with ❤️ for better patient care**

</div>

---

## License

MIT
