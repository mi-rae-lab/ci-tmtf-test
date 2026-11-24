@echo off
rem Full check (stimulus + staircase JS = Python, screen flow check, result-file rebuild, Lean 4 build + axiom audit + JS = Lean). Double-click, or run from a console. Writes 검증_통과.json when all pass.
chcp 65001 >nul
cd /d "%~dp0.."
python -I -X utf8 tools\run_checks.py %*
set RC=%ERRORLEVEL%
if "%~1"=="" pause
exit /b %RC%
