# validator.py
import csv, json, os

from normalization import (
    canonical_cycle,
    normalize_category,
    normalize_aspect,
    normalize_sign,
    normalize_planet,
    normalize_wave_id,
)

BASE = os.path.dirname(__file__)

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_csv(path):
    with open(path, "r", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def is_iso_date(s):
    if not s:
        return False
    parts = s.split("-")
    if len(parts) != 3:
        return False
    y, m, d = parts
    if not (len(y) == 4 and len(m) == 2 and len(d) == 2):
        return False
    try:
        yi, mi, di = int(y), int(m), int(d)
    except Exception:
        return False
    if not (1 <= mi <= 12 and 1 <= di <= 31):
        return False
    return True

def main():
    ref = load_json(os.path.join(BASE, "reference.json"))

    # Canonical sets from reference.json (source of truth)
    cycles_ref      = set(ref.get("cycles", []))
    categories_ref  = set(ref.get("categories", []))
    aspects_ref     = set(ref.get("aspects", []))
    signs_ref       = set(ref.get("signs", []))
    planets_ref     = set(ref.get("planets", []))
    waves_ref       = ref.get("waves", {})  # { "1": {"name": "...","anchors":[0,10,20]}, ...}
    rules           = ref.get("rules", {}) or {}
    orb_limit       = float(rules.get("orb_deg_exact_window", 1.0))

    # Precompute wave anchors as {int(wave_id): set(anchors)}
    wave_anchors = {}
    for k, v in waves_ref.items():
        try:
            wave_id_int = int(k)
        except Exception:
            continue
        anchors = set(v.get("anchors", []))
        wave_anchors[wave_id_int] = anchors

    # Load CSVs
    events         = load_csv(os.path.join(BASE, "events.csv"))
    aspects_rows   = load_csv(os.path.join(BASE, "aspects.csv"))
    eclipses       = load_csv(os.path.join(BASE, "eclipses.csv"))
    waves_rows     = load_csv(os.path.join(BASE, "waves.csv"))

    problems = []
    warnings = []

    # ───────────────────────────────────────────────────────────────────────────
    # EVENTS
    seen_event_ids = set()
    for i, row in enumerate(events, start=2):
        eid = (row.get("event_id", "") or "").strip()
        date = (row.get("date", "") or "").strip()
        cat_raw = (row.get("category", "") or "").strip()

        if not eid:
            problems.append(f"events.csv:{i} missing event_id")
        elif eid in seen_event_ids:
            problems.append(f"events.csv:{i} duplicate event_id {eid}")
        else:
            seen_event_ids.add(eid)

        if not is_iso_date(date):
            problems.append(f"events.csv:{i} bad date '{date}' (YYYY-MM-DD)")

        if cat_raw:
            cat_ok, warns_cat = normalize_category(cat_raw, categories_ref)
            warnings.extend([f"events.csv:{i} {w}" for w in warns_cat])
            if cat_ok not in categories_ref:
                problems.append(
                    f"events.csv:{i} category '{cat_raw}' (normalized '{cat_ok}') not in reference.json categories"
                )

    # ───────────────────────────────────────────────────────────────────────────
    # ASPECTS
    seen_aspect_ids = set()
    for i, row in enumerate(aspects_rows, start=2):
        aid = (row.get("aspect_id", "") or "").strip()
        eid = (row.get("event_id", "") or "").strip()
        date = (row.get("date", "") or "").strip()
        pa_raw = (row.get("planet_a", "") or "").strip()
        pb_raw = (row.get("planet_b", "") or "").strip()
        asp_raw = (row.get("aspect", "") or "").strip()
        sa_raw = (row.get("sign_a", "") or "").strip()
        sb_raw = (row.get("sign_b", "") or "").strip()
        orb = (row.get("orb_deg", "") or "").strip()
        cyc_raw = (row.get("cycle_key", "") or "").strip()
        deg_a_raw = (row.get("deg_a", "") or "").strip()
        deg_b_raw = (row.get("deg_b", "") or "").strip()

        if not aid:
            problems.append(f"aspects.csv:{i} missing aspect_id")
        elif aid in seen_aspect_ids:
            problems.append(f"aspects.csv:{i} duplicate aspect_id {aid}")
        else:
            seen_aspect_ids.add(aid)

        if eid not in seen_event_ids:
            problems.append(f"aspects.csv:{i} event_id '{eid}' does not exist in events.csv")

        if not is_iso_date(date):
            problems.append(f"aspects.csv:{i} bad date '{date}'")

        # Normalize planets
        pa_ok, w1 = normalize_planet(pa_raw, planets_ref)
        pb_ok, w2 = normalize_planet(pb_raw, planets_ref)
        warnings.extend([f"aspects.csv:{i} {w}" for w in (w1 + w2)])
        if pa_ok not in planets_ref or pb_ok not in planets_ref:
            problems.append(f"aspects.csv:{i} planet not in reference.json list")

        # Normalize aspect
        asp_ok, w3 = normalize_aspect(asp_raw, aspects_ref)
        warnings.extend([f"aspects.csv:{i} {w}" for w in w3])
        if asp_ok not in aspects_ref:
            problems.append(
                f"aspects.csv:{i} aspect '{asp_raw}' (normalized '{asp_ok}') not in reference.json aspects"
            )

        # Normalize signs
        sa_ok, w4 = normalize_sign(sa_raw, signs_ref)
        sb_ok, w5 = normalize_sign(sb_raw, signs_ref)
        warnings.extend([f"aspects.csv:{i} {w}" for w in (w4 + w5)])
        if sa_ok not in signs_ref or sb_ok not in signs_ref:
            problems.append(f"aspects.csv:{i} sign not in reference.json signs")

        # Orb check
        try:
            orb_val = float(orb)
            if orb_val > orb_limit:
                warnings.append(f"aspects.csv:{i} orb {orb_val} > limit {orb_limit}")
        except Exception:
            problems.append(f"aspects.csv:{i} orb_deg '{orb}' not a float")

        # Degree sanity
        try:
            da = float(deg_a_raw)
            db = float(deg_b_raw)
            if not (0.0 <= da < 30.0 and 0.0 <= db < 30.0):
                problems.append(f"aspects.csv:{i} deg_a/deg_b out of [0,30)")
        except Exception:
            problems.append(f"aspects.csv:{i} deg_a/deg_b must be floats")

        # Normalize cycle key (forgiving dash etc.)
        if cyc_raw:
            cyc_ok, w6 = canonical_cycle(cyc_raw, cycles_ref)
            warnings.extend([f"aspects.csv:{i} {w}" for w in w6])
            if cyc_ok not in cycles_ref:
                problems.append(
                    f"aspects.csv:{i} cycle_key '{cyc_raw}' (normalized '{cyc_ok}') not in reference.json cycles"
                )

    # ───────────────────────────────────────────────────────────────────────────
    # WAVES
    seen_wavetag_ids = set()
    for i, row in enumerate(waves_rows, start=2):
        wtag = (row.get("wave_tag_id", "") or "").strip()
        eid = (row.get("event_id", "") or "").strip()
        wave_id_raw = (row.get("wave_id", "") or "").strip()
        anchor_deg_raw = (row.get("anchor_deg", "") or "").strip()
        anchor_sign = (row.get("anchor_sign", "") or "").strip()

        if not wtag:
            problems.append(f"waves.csv:{i} missing wave_tag_id")
        elif wtag in seen_wavetag_ids:
            problems.append(f"waves.csv:{i} duplicate wave_tag_id {wtag}")
        else:
            seen_wavetag_ids.add(wtag)

        if eid not in seen_event_ids:
            problems.append(f"waves.csv:{i} event_id '{eid}' does not exist in events.csv")

        # Normalize wave_id to a simple number string (accept "Wave 9")
        wave_id_ok, w7 = normalize_wave_id(wave_id_raw)
        warnings.extend([f"waves.csv:{i} {w}" for w in w7])

        # Parse numbers
        wave_id_int = None
        try:
            wave_id_int = int(wave_id_ok)
        except Exception:
            problems.append(f"waves.csv:{i} wave_id '{wave_id_raw}' not an integer-ish")

        anchor_deg_int = None
        try:
            # allow "19.0" but it must be “integer-ish” degree
            anchor_deg_int = int(float(anchor_deg_raw))
        except Exception:
            problems.append(f"waves.csv:{i} anchor_deg '{anchor_deg_raw}' must be integer-ish")

        # Validate anchors against reference
        if wave_id_int is not None and anchor_deg_int is not None:
            valid_set = wave_anchors.get(wave_id_int, set())
            if anchor_deg_int not in valid_set:
                problems.append(
                    f"waves.csv:{i} anchor_deg {anchor_deg_int} not valid for wave_id {wave_id_ok} "
                    f"(valid: {sorted(list(valid_set))})"
                )

        # Allow dual-sign opposition like "Virgo/Pisces", else must be in signs
        if anchor_sign and ("/" not in anchor_sign) and (anchor_sign not in signs_ref):
            problems.append(
                f"waves.csv:{i} anchor_sign '{anchor_sign}' not in reference.json signs (or dual-sign opposition)"
            )

    # ───────────────────────────────────────────────────────────────────────────
    # ECLIPSES (light checks)
    seen_eclipse_ids = set()
    for i, row in enumerate(eclipses, start=2):
        ecid = (row.get("eclipse_id", "") or "").strip()
        date = (row.get("date", "") or "").strip()
        linked = (row.get("event_id", "") or "").strip()

        if not ecid:
            problems.append(f"eclipses.csv:{i} missing eclipse_id")
        elif ecid in seen_eclipse_ids:
            problems.append(f"eclipses.csv:{i} duplicate eclipse_id {ecid}")
        else:
            seen_eclipse_ids.add(ecid)

        if date and not is_iso_date(date):
            problems.append(f"eclipses.csv:{i} bad date '{date}'")

        if linked and linked not in seen_event_ids:
            problems.append(f"eclipses.csv:{i} event_id '{linked}' does not exist in events.csv")

    # ───────────────────────────────────────────────────────────────────────────
    # Write report
    report_path = os.path.join(BASE, "validation_report.csv")
    with open(report_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["level", "message"])
        for msg in problems:
            w.writerow(["ERROR", msg])
        for msg in warnings:
            w.writerow(["WARN", msg])

    print(f"Validation complete. Errors: {len(problems)}, Warnings: {len(warnings)}")
    print(f"Report: {report_path}")

if __name__ == "__main__":
    main()
