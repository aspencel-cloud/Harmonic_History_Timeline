
import csv, json, sys, os

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
    if not (len(y)==4 and len(m)==2 and len(d)==2):
        return False
    try:
        yi, mi, di = int(y), int(m), int(d)
    except:
        return False
    if not (1 <= mi <= 12 and 1 <= di <= 31):
        return False
    return True

def main():
    ref = load_json(os.path.join(BASE, "reference.json"))
    waves = ref["waves"]
    wave_anchors = {int(k): set(v["anchors"]) for k, v in waves.items()}
    signs = set(ref["signs"])
    planets = set(ref["planets"])
    aspects = set(ref["aspects"])
    cycles = set(ref["cycles"])
    categories = set(ref["categories"])
    orb_limit = float(ref["rules"]["orb_deg_exact_window"])

    events = load_csv(os.path.join(BASE, "events.csv"))
    aspects_rows = load_csv(os.path.join(BASE, "aspects.csv"))
    eclipses = load_csv(os.path.join(BASE, "eclipses.csv"))
    waves_rows = load_csv(os.path.join(BASE, "waves.csv"))

    problems = []
    warnings = []

    # Events
    seen_event_ids = set()
    for i, row in enumerate(events, start=2):
        eid = row.get("event_id","").strip()
        date = row.get("date","").strip()
        cat = row.get("category","").strip()

        if not eid:
            problems.append(f"events.csv:{i} missing event_id")
        elif eid in seen_event_ids:
            problems.append(f"events.csv:{i} duplicate event_id {eid}")
        else:
            seen_event_ids.add(eid)

        if not is_iso_date(date):
            problems.append(f"events.csv:{i} bad date '{date}' (YYYY-MM-DD)")

        if cat and cat not in categories:
            problems.append(f"events.csv:{i} category '{cat}' not in reference.json categories")

    # Aspects
    seen_aspect_ids = set()
    for i, row in enumerate(aspects_rows, start=2):
        aid = row.get("aspect_id","").strip()
        eid = row.get("event_id","").strip()
        date = row.get("date","").strip()
        pa = row.get("planet_a","").strip()
        pb = row.get("planet_b","").strip()
        asp = row.get("aspect","").strip()
        sa = row.get("sign_a","").strip()
        sb = row.get("sign_b","").strip()
        orb = row.get("orb_deg","").strip()
        cyc = row.get("cycle_key","").strip()

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

        if pa not in planets or pb not in planets:
            problems.append(f"aspects.csv:{i} planet not in reference.json list")

        if asp not in aspects:
            problems.append(f"aspects.csv:{i} aspect '{asp}' not in reference.json aspects")

        if sa not in signs or sb not in signs:
            problems.append(f"aspects.csv:{i} sign not in reference.json signs")

        try:
            orb_val = float(orb)
            if orb_val > orb_limit:
                warnings.append(f"aspects.csv:{i} orb {orb_val} > limit {orb_limit}")
        except:
            problems.append(f"aspects.csv:{i} orb_deg '{orb}' not a float")

        if cyc and cyc not in cycles:
            problems.append(f"aspects.csv:{i} cycle_key '{cyc}' not in reference.json cycles")

        # Degree sanity
        try:
            da = float(row.get("deg_a",""))
            db = float(row.get("deg_b",""))
            if not (0.0 <= da < 30.0 and 0.0 <= db < 30.0):
                problems.append(f"aspects.csv:{i} deg_a/deg_b out of [0,30)")
        except:
            problems.append(f"aspects.csv:{i} deg_a/deg_b must be floats")

    # Waves
    seen_wavetag_ids = set()
    for i, row in enumerate(waves_rows, start=2):
        wid = row.get("wave_tag_id","").strip()
        eid = row.get("event_id","").strip()
        wave_id = row.get("wave_id","").strip()
        anchor_deg = row.get("anchor_deg","").strip()
        anchor_sign = row.get("anchor_sign","").strip()

        if not wid:
            problems.append(f"waves.csv:{i} missing wave_tag_id")
        elif wid in seen_wavetag_ids:
            problems.append(f"waves.csv:{i} duplicate wave_tag_id {wid}")
        else:
            seen_wavetag_ids.add(wid)

        if eid not in seen_event_ids:
            problems.append(f"waves.csv:{i} event_id '{eid}' does not exist in events.csv")

        try:
            wave_id_int = int(wave_id)
        except:
            problems.append(f"waves.csv:{i} wave_id '{wave_id}' not an integer")
            wave_id_int = None

        try:
            anchor_deg_int = int(float(anchor_deg))
        except:
            problems.append(f"waves.csv:{i} anchor_deg '{anchor_deg}' must be integer-ish")
            anchor_deg_int = None

        if wave_id_int is not None and anchor_deg_int is not None:
            valid_set = wave_anchors.get(wave_id_int, set())
            if anchor_deg_int not in valid_set:
                problems.append(f"waves.csv:{i} anchor_deg {anchor_deg_int} not valid for wave_id {wave_id} (valid: {sorted(list(valid_set))})")

        if anchor_sign and anchor_sign not in signs and "/" not in anchor_sign:
            problems.append(f"waves.csv:{i} anchor_sign '{anchor_sign}' not in reference.json signs (or dual-sign opposition)")

    # Eclipses (light checks)
    seen_eclipse_ids = set()
    for i, row in enumerate(eclipses, start=2):
        eid = row.get("eclipse_id","").strip()
        if not eid:
            problems.append(f"eclipses.csv:{i} missing eclipse_id")
        elif eid in seen_eclipse_ids:
            problems.append(f"eclipses.csv:{i} duplicate eclipse_id {eid}")
        else:
            seen_eclipse_ids.add(eid)

        date = row.get("date","").strip()
        if date and not is_iso_date(date):
            problems.append(f"eclipses.csv:{i} bad date '{date}'")

        linked = row.get("event_id","").strip()
        if linked and linked not in seen_event_ids:
            problems.append(f"eclipses.csv:{i} event_id '{linked}' does not exist in events.csv")

    # Write report
    report_path = os.path.join(BASE, "validation_report.csv")
    with open(report_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["level","message"])
        for msg in problems:
            w.writerow(["ERROR", msg])
        for msg in warnings:
            w.writerow(["WARN", msg])

    # Print summary
    print(f"Validation complete. Errors: {len(problems)}, Warnings: {len(warnings)}")
    print(f"Report: {report_path}")

if __name__ == "__main__":
    main()
