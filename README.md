<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0ea5e9,100:10b981&height=220&section=header&text=CareBridge&fontSize=70&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=From%20Discharge%20to%20Recovery&descAlignY=58&descSize=20" width="100%"/>

<a href="https://git.io/typing-svg">
<img src="https://readme-typing-svg.demolab.com?font=Poppins&weight=600&size=24&pause=1000&color=0EA5E9&center=true&vCenter=true&width=700&lines=AI-powered+discharge+follow-up+%F0%9F%8F%A5;Safe+%E2%80%A2+Simple+%E2%80%A2+Multilingual+%F0%9F%8C%90;Every+item+traced+to+its+source+%E2%9C%85;Doctors+review+anything+unclear+%F0%9F%A9%BA" alt="Typing SVG" />
</a>

<br/>

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-AI-F55036?style=for-the-badge)

</div>

---

## 📖 About

CareBridge turns a hospital discharge summary into a simple, trackable follow-up plan with tasks, medicine reminders, appointments and alerts, in 6 Indian languages. Anything unclear is held for a doctor to review before the patient sees it.

> ⚠️ It organizes and explains. It never diagnoses, changes a medicine or recommends treatment. All data is synthetic.

## ✨ Features

- 🤖 **AI extraction** pulls instructions from text or PDF summaries, and each one links to its exact source line
- 🚦 **Safety first:** vague, risky or conflicting items are locked until a doctor reviews them
- 🌐 **6 languages:** English, Tamil, Hindi, Telugu, Kannada, Malayalam, with read-aloud
- 💊 **Medicine schedule** split into morning, afternoon and night slots, with tap to mark taken
- 🔔 **Reminders and escalation** go to the patient, then family, then a doctor when tasks are missed
- 📍 **Provider suggestions** list nearby labs and clinics by specialty, distance, language and insurance
- 🧾 **Printable fridge sheet** with a QR code

## 🏥 Three apps, one server

| App | Users | Path |
|---|---|---|
| 👤 Patient & Family | Patients, family hubs | `/` |
| 🩺 Doctor Workspace | Hospital doctors | `/doctor` |
| 📊 Management Console | Hospital admin | `/management` |

## 🛠️ Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Motion |
| Backend | Python, FastAPI, Uvicorn, SQLModel, Pydantic |
| Database | SQLite (WAL mode) |
| AI | Groq API (`gpt-oss-120b` for extraction, `gpt-oss-20b` for rewriting and translation) |
| Other | pdfplumber, ReportLab, edge-tts, PyJWT, pytest |

## 🔄 Agent pipeline

```
Privacy Guard → Read → Extract (AI) → Verify → Safety Check
   → Plan → Simplify & Translate (AI) → Match Providers → Escalate
```

1. 🔒 **Privacy Guard** masks Aadhaar, PAN, phone numbers and emails
2. 📖 **Read** numbers every line of the summary
3. 🤖 **Extract** finds the instructions and quotes them word for word
4. ✅ **Verify** confirms each quote exists in the source and works out the dates
5. 🚦 **Safety Check** uses rules to flag vague, risky or conflicting items for doctor review
6. 📅 **Plan** creates tasks and reminders
7. 🌐 **Simplify** rewrites in plain language and translates (medicines use a fixed template)
8. 📍 **Match** suggests nearby providers
9. 🔔 **Escalate** sends overdue reminders, then a family alert, then a doctor alert

## 🚀 Getting started

### Prerequisites
- Python 3.10+
- Node.js 18+

### Setup

```bash
git clone https://github.com/<your-username>/carebridge.git
cd carebridge
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_key   # optional, mock mode runs without it
MOCK_LLM=0
JWT_SECRET=your_long_random_secret
```

### Run (Windows, one command)

```powershell
.\run_demo.bat
```

Opens **http://localhost:8000/demo**

### Run (development)

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate        # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
set DEMO=1                    # Linux/Mac: export DEMO=1
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Frontend: **http://localhost:5173**

## 🔑 Demo accounts

Password: `demo1234`. All emails end in `@code2care.test`.

| Role | Accounts |
|---|---|
| Patient | `ramesh`, `sunita`, `karthik`, `lakshmi` |
| Hub Manager | `priya`, `sanjay`, `latha` |
| Family Viewer | `arun`, `pooja`, `kiran` |
| Doctor | `meera`, `arjun`, `sana`, `kavya` |
| Management | `admin` |

## 📁 Project structure

```
carebridge/
├── backend/
│   ├── app/
│   │   ├── agents/      # 9-step AI pipeline
│   │   ├── routes/      # API endpoints
│   │   ├── auth.py      # JWT + role-based access
│   │   ├── db.py        # SQLite setup
│   │   └── main.py      # FastAPI app
│   ├── data/            # Synthetic samples & providers
│   └── tests/           # pytest suite
├── frontend/
│   └── src/
│       ├── apps/        # Patient, Doctor, Management
│       ├── components/
│       ├── i18n/        # Translations
│       └── pages/
└── run_demo.bat
```

## 🧪 Tests

```bash
cd backend
pytest
```

## ⚠️ Limitations

- SQLite with no encryption; access is checked in the API
- Callbacks are simulated, with no real calls or SMS
- Regional-language translations need a native speaker review
- Demo accounts share one password, so **do not deploy as is**

---

## 👥 Team

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Poppins&weight=700&size=22&pause=800&color=10B981&center=true&vCenter=true&width=500&lines=Karthikeyan+S;Karthick+S;Vidhursh+Kumar+V;Giridharan+R;Janani+V+R" alt="Team" />

<br/>

| 👨‍💻 | 👨‍💻 | 👨‍💻 | 👨‍💻 | 👩‍💻 |
|:---:|:---:|:---:|:---:|:---:|
| **Karthikeyan S** | **Karthick S** | **Vidhursh Kumar V** | **Giridharan R** | **Janani V R** |

<br/>

**Made with ❤️ for better patient care**

</div>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:10b981,100:0ea5e9&height=120&section=footer" width="100%"/>

## 📄 License

MIT
