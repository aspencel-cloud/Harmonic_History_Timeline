# normalization.py
# A small, explicit "forgiving layer" that maps loose human input → canonical values.

import re

# ── Canonical enums come from reference.json; these are just helpers/aliases ──

# Accept hyphen, en-dash, em-dash, minus sign → en dash
EN_DASH = "\u2013"
DASH_RX = re.compile(r"[\u2012\u2013\u2014\u2212\-]")

def normalize_dashes(s: str) -> str:
    if not s:
        return s
    out = DASH_RX.sub(EN_DASH, s)
    out = re.sub(r"\s*"+EN_DASH+r"\s*", EN_DASH, out)  # tighten spaces around dash
    out = re.sub(r"\s+", " ", out).strip()
    return out

def canonical_cycle(value: str, canonical_set: set) -> tuple[str, list[str]]:
    """
    Normalize dash and capitalization, then try to match canonical cycles
    (exact match after dash normalization). Returns (canonical_value, warns).
    """
    warns = []
    raw = value or ""
    norm = normalize_dashes(raw)
    # Try exact (case-sensitive) then case-insensitive match
    if norm in canonical_set:
        if norm != raw:
            warns.append(f"cycle_key normalized '{raw}' -> '{norm}'")
        return norm, warns
    # case-insensitive fallback
    lower_map = {c.lower(): c for c in canonical_set}
    if norm.lower() in lower_map:
        canon = lower_map[norm.lower()]
        if canon != raw:
            warns.append(f"cycle_key normalized '{raw}' -> '{canon}'")
        return canon, warns
    # no match
    return raw, warns

# Common aliases → canonical (your reference.json is the source of truth)
CATEGORY_ALIASES = {
    "econ": "Economy/Finance",
    "economy": "Economy/Finance",
    "finance": "Economy/Finance",
    "health": "Public Health",
    "tech": "Science/Tech",
    "science": "Science/Tech",
    "culture": "Culture/Society",
    "society": "Culture/Society",
    "env": "Environment",
    "environmental": "Environment",
    "geo": "Geopolitics",
    "politics": "Geopolitics",
}

ASPECT_ALIASES = {
    "conj": "conjunction",
    "opp": "opposition",
    "square": "square",
    "sq": "square",
    "tri": "trine",
    "tr": "trine",
    "sext": "sextile",
    "quin": "quincunx",
    "quinc": "quincunx",
    "quincunx": "quincunx",
}

SIGN_ALIASES = {
    # initials
    "ar": "Aries", "ta": "Taurus", "ge": "Gemini", "cn": "Cancer",
    "le": "Leo", "vi": "Virgo", "li": "Libra", "sc": "Scorpio",
    "sg": "Sagittarius", "cp": "Capricorn", "aq": "Aquarius", "pi": "Pisces",
    # full lowercase → Title
    "aries":"Aries","taurus":"Taurus","gemini":"Gemini","cancer":"Cancer",
    "leo":"Leo","virgo":"Virgo","libra":"Libra","scorpio":"Scorpio",
    "sagittarius":"Sagittarius","capricorn":"Capricorn","aquarius":"Aquarius","pisces":"Pisces",
}

PLANET_ALIASES = {
    "sun":"Sun","moon":"Moon",
    "mer":"Mercury","merc":"Mercury","mercury":"Mercury",
    "ven":"Venus","venus":"Venus",
    "mar":"Mars","mars":"Mars",
    "jup":"Jupiter","jupiter":"Jupiter",
    "sat":"Saturn","saturn":"Saturn",
    "ura":"Uranus","uranus":"Uranus",
    "nep":"Neptune","neptune":"Neptune",
    "plu":"Pluto","pluto":"Pluto",
    "nn":"North Node","north node":"North Node",
    "sn":"South Node","south node":"South Node",
}

def titleize(s: str) -> str:
    return s[:1].upper() + s[1:].lower() if s else s

def normalize_category(raw: str, canonical_set: set) -> tuple[str, list[str]]:
    warns = []
    if not raw: return raw, warns
    key = raw.strip()
    alias = CATEGORY_ALIASES.get(key.lower())
    if alias:
        warns.append(f"category alias '{raw}' -> '{alias}'")
        return alias, warns
    # case-insensitive match
    for c in canonical_set:
        if key.lower() == c.lower():
            if key != c:
                warns.append(f"category case-normalized '{raw}' -> '{c}'")
            return c, warns
    return key, warns

def normalize_aspect(raw: str, canonical_set: set) -> tuple[str, list[str]]:
    warns = []
    if not raw: return raw, warns
    key = raw.strip().lower()
    alias = ASPECT_ALIASES.get(key)
    if alias:
        warns.append(f"aspect alias '{raw}' -> '{alias}'")
        return alias, warns
    # case-insensitive exact
    for a in canonical_set:
        if key == a.lower():
            if raw != a:
                warns.append(f"aspect case-normalized '{raw}' -> '{a}'")
            return a, warns
    return raw, warns

def normalize_sign(raw: str, canonical_set: set) -> tuple[str, list[str]]:
    warns = []
    if not raw: return raw, warns
    key = raw.strip()
    alias = SIGN_ALIASES.get(key.lower())
    if alias:
        warns.append(f"sign alias '{raw}' -> '{alias}'")
        return alias, warns
    # case-insensitive exact
    for s in canonical_set:
        if key.lower() == s.lower():
            if key != s:
                warns.append(f"sign case-normalized '{raw}' -> '{s}'")
            return s, warns
    return key, warns

def normalize_planet(raw: str, canonical_set: set) -> tuple[str, list[str]]:
    warns = []
    if not raw: return raw, warns
    key = raw.strip()
    alias = PLANET_ALIASES.get(key.lower())
    if alias:
        warns.append(f"planet alias '{raw}' -> '{alias}'")
        return alias, warns
    # case-insensitive exact
    for p in canonical_set:
        if key.lower() == p.lower():
            if key != p:
                warns.append(f"planet case-normalized '{raw}' -> '{p}'")
            return p, warns
    return key, warns

def normalize_wave_id(raw: str) -> tuple[str, list[str]]:
    """Accept 'Wave 9' or '9' → '9' (string)"""
    warns = []
    if not raw: return raw, warns
    m = re.match(r"^\s*(?:wave\s*)?(\d{1,2})\s*$", raw, flags=re.I)
    if m:
        num = m.group(1)
        if raw.strip() != num:
            warns.append(f"wave_id normalized '{raw}' -> '{num}'")
        return num, warns
    return raw, warns
