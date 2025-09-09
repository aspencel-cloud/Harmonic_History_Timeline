# Harmonic Waves History Timeline — Data Pack (Starter)

This pack gives you clean, normalized tables to map world events to mundane astrology cycles and Harmonic Waves.

## Files
- **events.csv** — canonical events
- **aspects.csv** — linked planetary aspects (outer-planet focus)
- **eclipses.csv** — eclipse metadata (optional link to events)
- **waves.csv** — Harmonic Wave tags for events (using anchor degrees per wave)
- **reference.json** — normalized enums + wave anchors
- **validator.py** — sanity checker with a CSV report

## Conventions
- **Dates:** `YYYY-MM-DD` (ISO)
- **Categories:** Geopolitics, Economy/Finance, Public Health, Science/Tech, Culture/Society, Environment
- **Aspects:** conjunction, opposition, square, trine, sextile, quincunx
- **Cycles:** Saturn–Neptune, Saturn–Uranus, Saturn–Pluto, Jupiter–Saturn, Jupiter–Uranus, Jupiter–Neptune
- **Signs:** Aries → Pisces (capitalized)
- **Wave anchors:** From `reference.json` (e.g., Wave 9 = 8/18/28).

### Orb
- Default **exact window** = `1.0°`
- Put numeric `orb_deg` in `aspects.csv`. The validator will warn if > window.

## Workflow
1. **Add events** to `events.csv` (one row per event).
2. **Link aspects** in `aspects.csv` via `event_id` (use outer planets first).
3. **(Optional) Add eclipses** in `eclipses.csv` and link via `event_id`.
4. **Tag waves** in `waves.csv` only when the anchor degree matches the aspect’s degree (or a narratively important anchor).
5. **Run validation**:

```bash
cd /mnt/data/harmonic_waves_timeline
python validator.py
```

This will print errors/warnings and write `validation_report.csv`.

## Notes on the seeds
- **1989 Berlin Wall:** tagged to **Saturn–Neptune** conjunction (11° Cap → **Wave 10** anchor).
- **2008 Lehman Collapse:** linked to **Saturn–Uranus** opposition (18° Virgo/Pisces → **Wave 9** anchor).
- **2020 WHO Pandemic:** within **Saturn–Pluto** conjunction (22° Cap → **Wave 6** anchor).

## Editing Tips
- Keep `event_id` stable. If you rename an event’s title, do not change its `event_id`.
- Prefer one **primary source URL** per event (you can add more in notes).
- Use short, reader-friendly summaries.
