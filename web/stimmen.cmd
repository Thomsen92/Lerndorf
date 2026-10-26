@echo off
setlocal
cd /d "%~dp0"
node scripts/generate-listening.ts
set "stimmen_result=%errorlevel%"
if not "%stimmen_result%"=="0" echo Stimmen konnten nicht vollstaendig erzeugt werden. Bitte die Fehlermeldung oben beachten.
pause
exit /b %stimmen_result%
