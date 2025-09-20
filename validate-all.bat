@echo off
setlocal enabledelayedexpansion

REM ── Resolve repo root to the folder this BAT lives in ────────────────────────
set "ROOT=%~dp0"
REM Normalize trailing backslash issues
if "%ROOT:~-1%"=="\" (set "ROOT=%ROOT:~0,-1%")

echo.
echo === Repo root: %ROOT%
cd /d "%ROOT%"

echo.
echo === Checking toolchain ===
where node >nul 2>&1 || (echo [ERROR] Node.js not found in PATH & goto :fail)
where python >nul 2>&1 || (echo [WARN] 'python' not found, trying 'py -3' & set "PYEXE=py -3")
if not defined PYEXE set "PYEXE=python"
for /f "tokens=*" %%V in ('node --version') do set "NODEV=%%V"
for /f "tokens=*" %%V in ('%PYEXE% --version 2^>^&1') do set "PYV=%%V"
echo Node:   %NODEV%
echo Python: %PYV%

echo.
echo === 1) Syncing data to public\data ===
if not exist "%ROOT%\scripts\sync-data.mjs" (
  echo [ERROR] Missing file: "%ROOT%\scripts\sync-data.mjs"
  goto :fail
)
node "%ROOT%\scripts\sync-data.mjs"
if errorlevel 1 goto :fail

echo.
echo === 2) Running Node validator (app-facing) ===
if not exist "%ROOT%\tools\validator.mjs" (
  echo [ERROR] Missing file: "%ROOT%\tools\validator.mjs"
  goto :fail
)
node "%ROOT%\tools\validator.mjs"
if errorlevel 1 goto :fail

echo.
echo === 3) Running Python validator (schema-level) ===
%PYEXE% -m scripts.validator
if errorlevel 1 goto :fail

echo.
echo === ✓ All validation steps completed ===
goto :end

:fail
echo.
echo *** VALIDATION FAILED (exit code %errorlevel%) ***
echo (Working dir: %CD%)
echo.

:end
echo.
pause
endlocal
