"""Medicine lines come from a fixed template filled with extracted fields. No free rewriting."""
import re

LANGS = ["en", "ta", "hi", "te", "kn", "ml"]
FREQ = {
    "en": {1: "once a day", 2: "twice a day", 3: "three times a day"},
    "ta": {1: "தினமும் ஒரு முறை", 2: "தினமும் இரண்டு முறை", 3: "தினமும் மூன்று முறை"},
    "hi": {1: "दिन में एक बार", 2: "दिन में दो बार", 3: "दिन में तीन बार"},
    "te": {1: "రోజుకు ఒకసారి", 2: "రోజుకు రెండుసార్లు", 3: "రోజుకు మూడుసార్లు"},
    "kn": {1: "ದಿನಕ್ಕೆ ಒಮ್ಮೆ", 2: "ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ", 3: "ದಿನಕ್ಕೆ ಮೂರು ಬಾರಿ"},
    "ml": {1: "ദിവസം ഒരു തവണ", 2: "ദിവസം രണ്ടു തവണ", 3: "ദിവസം മൂന്നു തവണ"},
}
SLOT = {
    "en": {"morning": "in the morning", "afternoon": "in the afternoon", "night": "at night"},
    "ta": {"morning": "காலையில்", "afternoon": "மதியம்", "night": "இரவில்"},
    "hi": {"morning": "सुबह", "afternoon": "दोपहर को", "night": "रात को"},
    "te": {"morning": "ఉదయం", "afternoon": "మధ్యాహ్నం", "night": "రాత్రి"},
    "kn": {"morning": "ಬೆಳಿಗ್ಗೆ", "afternoon": "ಮಧ್ಯಾಹ್ನ", "night": "ರಾತ್ರಿ"},
    "ml": {"morning": "രാവിലെ", "afternoon": "ഉച്ചയ്ക്ക്", "night": "രാത്രി"},
}
AND = {"en": " and ", "ta": " மற்றும் ", "hi": " और ", "te": " మరియు ", "kn": " ಮತ್ತು ", "ml": " ഒപ്പം "}
FOOD = {
    "en": {"after": "after food", "before": "before food"},
    "ta": {"after": "உணவுக்குப் பிறகு", "before": "உணவுக்கு முன்"},
    "hi": {"after": "खाने के बाद", "before": "खाने से पहले"},
    "te": {"after": "భోజనం తర్వాత", "before": "భోజనానికి ముందు"},
    "kn": {"after": "ಊಟದ ನಂತರ", "before": "ಊಟದ ಮೊದಲು"},
    "ml": {"after": "ഭക്ഷണത്തിനു ശേഷം", "before": "ഭക്ഷണത്തിനു മുമ്പ്"},
}
DUR = {"en": "for {n} days", "ta": "{n} நாட்களுக்கு", "hi": "{n} दिन तक", "te": "{n} రోజులు", "kn": "{n} ದಿನಗಳು", "ml": "{n} ദിവസം"}
SENTENCE = {
    "en": "Take {name} {rest}.", "ta": "{name} மாத்திரையை {rest} சாப்பிடவும்.", "hi": "{name} की गोली {rest} लें।",
    "te": "{name} మాత్రను {rest} వేసుకోండి.", "kn": "{name} ಮಾತ್ರೆಯನ್ನು {rest} ತೆಗೆದುಕೊಳ್ಳಿ.",
    "ml": "{name} ഗുളിക {rest} കഴിക്കുക.",
}
ORDER = {"en": ["freq", "slot", "food", "dur"]}  # other languages use the same order


def parse(title: str, original: str, time_of_day: str | None) -> dict | None:
    t = original.lower()
    freq = 2 if re.search(r"twice|two times|\bbd\b|\bbid\b", t) else 3 if re.search(r"three times|thrice|\btds\b", t) else \
        1 if re.search(r"once|\bod\b|daily|every day", t) else None
    if freq is None:
        return None
    if re.search(r"as needed|if required|if needed|\bprn\b|\bsos\b", t):
        return None
    food = "before" if re.search(r"before (food|meals?|breakfast|lunch|dinner)", t) else \
        "after" if re.search(r"after (food|meals?|breakfast|lunch|dinner)", t) else None
    m = re.search(r"for (\d+) days?", t)
    slots = [s for s in ("morning", "afternoon", "night") if s in (time_of_day or "")]
    dose = re.search(r"\d+(?:\.\d+)?\s*(?:mg|ml|mcg|units?|g)\b", original, re.I)
    name = title if not dose or dose[0].lower() in title.lower() else f"{title} {dose[0]}"
    return {"name": name, "freq": freq, "slots": slots, "food": food, "days": m[1] if m else None}


def build(f: dict) -> dict[str, str]:
    out = {}
    for lang in LANGS:
        parts = [FREQ[lang][f["freq"]]]
        if f["slots"] and f["freq"] < 3 and len(f["slots"]) == f["freq"]:
            parts.append(AND[lang].join(SLOT[lang][s] for s in f["slots"]))
        if f["food"]:
            parts.append(FOOD[lang][f["food"]])
        if f["days"]:
            parts.append(DUR[lang].format(n=f["days"]))
        sep = ", " if lang == "en" else " "
        out[lang] = SENTENCE[lang].format(name=f["name"], rest=sep.join(parts))
    return out


def med_texts(title: str, original: str, time_of_day: str | None) -> dict[str, str]:
    """Template text in every language, or the original line when the fields are not clear enough."""
    f = parse(title, original, time_of_day)
    if f:
        built = build(f)
        nums = lambda x: set(re.findall(r"\d+(?:\.\d+)?", x))  # noqa: E731
        if nums(built["en"]) == nums(original):
            return built
    return {lang: original for lang in LANGS}
