"""Text to speech with Microsoft Edge neural voices (edge-tts). Free, no API key, one native voice per language."""
import asyncio

import edge_tts

VOICES = {"en": "en-IN-NeerjaNeural", "ta": "ta-IN-PallaviNeural", "hi": "hi-IN-SwaraNeural",
          "te": "te-IN-ShrutiNeural", "kn": "kn-IN-SapnaNeural", "ml": "ml-IN-SobhanaNeural"}


async def _run(text: str, voice: str) -> bytes:
    return b"".join([c["data"] async for c in edge_tts.Communicate(text, voice, rate="-10%").stream() if c["type"] == "audio"])


def speak_text(text: str, lang: str) -> bytes:
    # ponytail: unofficial Edge endpoint, no SLA. Swap to Azure Speech (same voices) for production.
    data = asyncio.run(_run(text, VOICES.get(lang, VOICES["en"])))
    if not data:
        raise RuntimeError("no audio")
    return data
