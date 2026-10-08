import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
_tmp = tempfile.mkdtemp()
os.environ["CB_DB_URL"] = f"sqlite:///{Path(_tmp, 'test.db').as_posix()}"
os.environ["MOCK_LLM"] = "1"
os.environ["PIPELINE_DELAY"] = "0"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session")
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture()
def session(client):
    from sqlmodel import Session

    from app.db import engine

    with Session(engine) as s:
        yield s
