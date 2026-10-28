"""In-memory rate limiter. No external services."""
import time
from collections import defaultdict

_attempts: dict[str, list[float]] = defaultdict(list)
WINDOW = 900  # 15 minutes
MAX_PER_EMAIL = 5
MAX_PER_IP = 20


def _prune(key: str) -> list[float]:
    cutoff = time.monotonic() - WINDOW
    _attempts[key] = [t for t in _attempts[key] if t > cutoff]
    return _attempts[key]


def check(email: str, ip: str) -> str | None:
    """Return error message if rate limited, None if OK."""
    msg = "Too many tries. Please wait 15 minutes."
    if len(_prune(f"email:{email}")) >= MAX_PER_EMAIL:
        return msg
    if len(_prune(f"ip:{ip}")) >= MAX_PER_IP:
        return msg
    return None


def record_failure(email: str, ip: str) -> None:
    now = time.monotonic()
    _attempts[f"email:{email}"].append(now)
    _attempts[f"ip:{ip}"].append(now)


def reset() -> None:
    """For tests."""
    _attempts.clear()
