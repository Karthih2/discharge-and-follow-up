import io


def to_lines(text: str) -> list[tuple[int, str]]:
    """Numbered non-empty lines, 1-based."""
    return [(i, l.strip()) for i, l in enumerate((l for l in text.splitlines() if l.strip()), 1)]


def pdf_to_text(data: bytes) -> str:
    import pdfplumber

    with pdfplumber.open(io.BytesIO(data)) as pdf:
        return "\n".join((p.extract_text() or "") for p in pdf.pages)
