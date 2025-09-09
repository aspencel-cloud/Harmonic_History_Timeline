# Session Notes — Harmonic Waves History Timeline

**Date:** <YYYY-MM-DD>

## What we set up
- Clean repo structure: `data/`, `scripts/`, `docs/`, `templates/`, `outputs/`, `data/schema/`.
- Canonical data files in `data/`: `events.csv`, `aspects.csv`, `eclipses.csv`, `waves.csv`, `reference.json`.
- Validator in `scripts/validator.py`.
- `.gitignore` to keep generated artifacts (like `outputs/validation_report.csv`) out of version control.

## Current conventions
- Dates: ISO `YYYY-MM-DD`.
- Aspect window (exact): **±1.0°** orb.
- Enums: signs/planets/aspects/cycles/categories defined in `data/reference.json`.
- Wave anchors enforced per wave (e.g., Wave 9 = 8/18/28).

## Next actions
- Populate key cycle events (Saturn–Neptune, Saturn–Uranus, Saturn–Pluto).
- Add sources for each event row.
- Run `python scripts/validator.py` and review `outputs/validation_report.csv`.

## Notes/decisions
- Keep `README.md` at repo root for newcomers.
- Use `event_id` stable slugs (e.g., `E1989_BERLIN_WALL`).
- Use `waves.csv` sparingly — only tag anchors that are exact or narratively essential.
