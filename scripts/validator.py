# scripts/validator.py
# Strict schema + enum validation for the Harmonic History Timeline data.
# Writes data/validation_report.csv with ERROR/WARN rows.

import csv, json, os
from pathlib import Path

from normalization import (
    canonical_cycle,
    normalize_category,
    normalize_aspect,
    normalize_sign,
    normalize_planet,
    normalize_wave_id,
)

BASE = str(Path(__file__).resolve().parents[1] / "data")


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_csv(path):
    # Strip UTF-8 BOM and normalize newlines to avoid \ufeff header bugs
    with open(path, "r", encoding="utf-8", newline="") as f:
        txt = f.read().lstrip("\ufeff")
    return list(csv.DictReader(txt.splitlines()))


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

    # Canonical enums from reference.json (single source of truth)
    cycles_ref      = set(ref.get("cycles", []))
    categories_ref  = set(ref.get("categories", []))
    aspects_ref     = set(ref.get("aspects", []))
    signs_ref       = set(ref.get("signs", []))
    planets_ref     = set(ref.get("planets", []))
    waves_ref       = ref.get("waves", {})  # {"1":{"name": "...", "anchors":[...]}, ...}
    rules           = ref.get("rules", {}) or {}
    orb_limit       = float(rules.get("orb_deg_exact_window", 1.0))

    # Optional enums for wave windows/linking
    window_strengths = set(ref.get("window_strengths", ["anchor", "field"]))
    window_relations = set(ref.get("window_relations", ["in_window", "near_window"]))
    link_strengths   = set(ref.get("link_strengths", []))  # optional if you later formalize

    # Build {int(wave_id): set(anchors)}
    wave_anchors = {}
    for k, v in waves_ref.items():
        try:
            wave_id_int = int(k)
        except Exception:
            continue
        wave_anchors[wave_id_int] = set(v.get("anchors", []))

    # Load CSVs
    events         = load_csv(os.path.join(BASE, "events.csv"))
    aspects_rows   = load_csv(os.path.join(BASE, "aspects.csv"))
    waves_rows     = load_csv(os.path.join(BASE, "waves.csv"))
    eclipses       = load_csv(os.path.join(BASE, "eclipses.csv"))
    wave_windows   = load_csv(os.path.join(BASE, "wave_windows.csv"))
    wave_links     = load_csv(os.path.join(BASE, "wave_window_event_links.csv"))

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

        if eid and eid not in seen_event_ids:
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

        # Cycle key normalization/requirement
        if not cyc_raw and rules.get("require_cycle_key_for_aspects", False):
            problems.append(f"aspects.csv:{i} missing cycle_key (required by rules)")
        elif cyc_raw:
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
        wave_name = (row.get("wave_name", "") or "").strip()
        anchor_deg_raw = (row.get("anchor_deg", "") or "").strip()
        anchor_sign = (row.get("anchor_sign", "") or "").strip()

        if not wtag:
            problems.append(f"waves.csv:{i} missing wave_tag_id")
        elif wtag in seen_wavetag_ids:
            problems.append(f"waves.csv:{i} duplicate wave_tag_id {wtag}")
        else:
            seen_wavetag_ids.add(wtag)

        if eid and eid not in seen_event_ids:
            problems.append(f"waves.csv:{i} event_id '{eid}' does not exist in events.csv")

        # wave_id normalization ("Wave 9" → "9")
        wave_id_ok, w7 = normalize_wave_id(wave_id_raw)
        warnings.extend([f"waves.csv:{i} {w}" for w in w7])

        wave_id_int = None
        try:
            wave_id_int = int(wave_id_ok)
        except Exception:
            problems.append(f"waves.csv:{i} wave_id '{wave_id_raw}' not an integer-ish")

        # anchor degree as integer-ish (accept "19.0")
        anchor_deg_int = None
        try:
            anchor_deg_int = int(float(anchor_deg_raw))
        except Exception:
            problems.append(f"waves.csv:{i} anchor_deg '{anchor_deg_raw}' must be integer-ish")

        if wave_id_int is not None:
            wave_def = waves_ref.get(str(wave_id_int))
            if not wave_def:
                problems.append(f"waves.csv:{i} wave_id {wave_id_ok} not in reference.json waves")
            else:
                # name must match expected
                expected = (wave_def.get("name") or "").strip()
                if wave_name and wave_name != expected:
                    problems.append(
                        f"waves.csv:{i} wave_name '{wave_name}' != '{expected}' for wave_id {wave_id_ok}"
                    )
                # anchor must be valid for that wave
                if anchor_deg_int is not None:
                    valid_set = set(wave_def.get("anchors", []))
                    if anchor_deg_int not in valid_set:
                        problems.append(
                            f"waves.csv:{i} anchor_deg {anchor_deg_int} not valid for wave_id {wave_id_ok} "
                            f"(valid: {sorted(list(valid_set))})"
                        )

        # Allow dual-sign opposition like "Virgo/Pisces", else must be a canonical sign
        if anchor_sign and ("/" not in anchor_sign) and (anchor_sign not in signs_ref):
            problems.append(
                f"waves.csv:{i} anchor_sign '{anchor_sign}' not in reference.json signs (or dual-sign opposition)"
            )

    # ───────────────────────────────────────────────────────────────────────────
    # ECLIPSES (light checks; expand later as you formalize enums)
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
    # WAVE WINDOWS
    for i, row in enumerate(wave_windows, start=2):
        aid  = (row.get("aspect_id","") or "").strip()
        widr = (row.get("wave_id","") or "").strip()
        wname= (row.get("wave_name","") or "").strip()
        asn  = (row.get("anchor_sign","") or "").strip()
        cad  = (row.get("center_anchor_deg","") or "").strip()
        strength = (row.get("strength","") or "").strip()
        start = (row.get("coverage_start","") or "").strip()
        end   = (row.get("coverage_end","") or "").strip()
        mdd   = (row.get("max_delta_deg","") or "").strip()

        need = ["aspect_id","wave_id","wave_name","anchor_sign","center_anchor_deg","strength","coverage_start","coverage_end","max_delta_deg"]
        for k in need:
            if not (row.get(k, "") or "").strip():
                problems.append(f"wave_windows.csv:{i} missing {k}")

        # wave id/name/sign checks
        try:
            wid = int(widr)
        except Exception:
            problems.append(f"wave_windows.csv:{i} wave_id '{widr}' not int")
            wid = None

        if wid is not None:
            wdef = waves_ref.get(str(wid))
            if not wdef:
                problems.append(f"wave_windows.csv:{i} wave_id {wid} not in reference.json")
            else:
                expected = (wdef.get("name") or "").strip()
                if wname and wname != expected:
                    problems.append(f"wave_windows.csv:{i} wave_name '{wname}' != '{expected}'")
        if asn and asn not in signs_ref:
            problems.append(f"wave_windows.csv:{i} anchor_sign '{asn}' not in signs")

        # numbers / dates
        try:
            float(cad)
        except Exception:
            problems.append(f"wave_windows.csv:{i} center_anchor_deg '{cad}' not float")
        if strength and strength not in window_strengths:
            problems.append(f"wave_windows.csv:{i} strength '{strength}' not in {sorted(window_strengths)}")
        if start and not is_iso_date(start):
            problems.append(f"wave_windows.csv:{i} coverage_start '{start}' bad date")
        if end and not is_iso_date(end):
            problems.append(f"wave_windows.csv:{i} coverage_end '{end}' bad date")
        try:
            float(mdd)
        except Exception:
            problems.append(f"wave_windows.csv:{i} max_delta_deg '{mdd}' not float")

    # ───────────────────────────────────────────────────────────────────────────
    # WAVE WINDOW EVENT LINKS
    for i, row in enumerate(wave_links, start=2):
        aid = (row.get("aspect_id","") or "").strip()
        eid = (row.get("event_id","") or "").strip()
        wid = (row.get("wave_id","") or "").strip()
        rel = (row.get("relation","") or "").strip()
        strength = (row.get("strength","") or "").strip()

        need = ["aspect_id","event_id","wave_id","relation","strength"]
        for k in need:
            if not (row.get(k, "") or "").strip():
                problems.append(f"wave_window_event_links.csv:{i} missing {k}")

        if eid and eid not in seen_event_ids:
            problems.append(f"wave_window_event_links.csv:{i} event_id '{eid}' not in events.csv")

        try:
            int(wid)
        except Exception:
            problems.append(f"wave_window_event_links.csv:{i} wave_id '{wid}' not int")

        if rel and rel not in window_relations:
            problems.append(f"wave_window_event_links.csv:{i} relation '{rel}' not in {sorted(window_relations)}")

        # allow numeric OR enum strength for now
        try:
            float(strength)
        except Exception:
            if strength and strength not in link_strengths:
                warnings.append(
                    f"wave_window_event_links.csv:{i} strength '{strength}' not numeric and not in link_strengths"
                )

    # ───────────────────────────────────────────────────────────────────────────
    # Report
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
