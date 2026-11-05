@echo off
cd /d "%~dp0"
echo Starting WhatsApp chatbot dev server...
echo Open http://localhost:3000/admin once it says Ready
call npm.cmd run dev
pause
