import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from . import llm, settings
from .db import get_setting, init_db, new_session
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routes import admin, auth_routes, clinical, demo, documents, family, home
from .seed import load_demo_data, seed_users
from .seed_demo import seed_demo_extras

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("carebridge")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with new_session() as s:
        seed_users(s)
        if demo.demo_on():
            load_demo_data(s)
            seed_demo_extras(s)
            log.warning("DEMO mode: demo accounts and plans are loaded. Open http://localhost:8000")
    if settings.mock_llm():
        log.warning("MOCK mode: using fixtures for the sample summaries. Add GROQ_API_KEY to backend/.env for real runs.")
    else:
        with new_session() as s:
            llm.check_models([get_setting(s, "extract_model"), get_setting(s, "rewrite_model")])
    yield


app = FastAPI(title="CareBridge", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"], allow_methods=["*"], allow_headers=["*"])
for r in (auth_routes, documents, family, home, clinical, admin, demo):
    app.include_router(r.router)
app.include_router(auth_routes.staff)


@app.get("/api/health")
def health():
    return {"ok": True, "mock_llm": settings.mock_llm(), "hospital": "Code2Care"}


# One port: when the frontend is built, the API also serves the three apps (patient site, /doctor, /management).
DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if (DIST / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api"):
            raise HTTPException(404, "Not found")
        f = (DIST / path).resolve()
        if path and f.is_file() and DIST in f.parents:
            return FileResponse(f)
        return FileResponse(DIST / "index.html")
