@echo off
REM Run from project root: C:\Users\aspen\Documents\Harmonic_History_Timeline
REM Double-click to sync data, then run Node + Python validators.

REM Always run from the folder this .bat lives in:
cd /d "%~dp0"

echo.
echo === 1) Syncing /data -> /public/data ===
call node scripts\sync-data.mjs
if errorlevel 1 (
  echo [ERROR] Sync step failed. Check scripts\sync-data.mjs and try again.
  goto :end
)

echo.
echo === 2) Running Node validator (app-facing) ===
call npm run validate
if errorlevel 1 (
  echo [ERROR] npm validator reported an issue.
  goto :end
)

echo.
echo === 3) Running Python validator (schema-level) ===
call python -m scripts.validator
if errorlevel 1 (
  echo [ERROR] Python validator reported an issue.
  goto :end
)

echo.
echo === ✅ All validation steps completed ===

:end
echo.
pause
