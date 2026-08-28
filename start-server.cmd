@echo off
cd /d "%~dp0"
echo BRUCHLASTchart wird unter http://localhost:3000 gestartet.
echo Zum Beenden Strg+C druecken.
echo.
call npx.cmd --yes serve . --listen 3000
pause
