@echo off
setlocal enableextensions
REM Go to repo root (parent of /scripts)
pushd "%~dp0\.." 2>nul
if errorlevel 1 (
  echo FAILED: cannot change directory to repo root from "%~dp0\.."
  exit /b 1
)

echo === 1) Syncing data ===
node "scripts\sync-data.mjs"
if errorlevel 1 goto :err

echo.
echo === 2) Running Node validator (app-facing) ===
if exist "tools\validator.mjs" (
  node "tools\validator.mjs"
  if errorlevel 1 goto :err
) else (
  echo (skip) tools\validator.mjs not found
)

echo.
echo === 3) Running Python validator (schema-level) ===
python -m scripts.validator
if errorlevel 1 goto :err

echo.
echo === OK: All validation steps completed ===
popd >nul
exit /b 0

:err
echo.
echo === FAILED: See error above ===
popd >nul
exit /b 1
