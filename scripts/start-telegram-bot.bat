@echo off
title TataDana Telegram Bot Auto-Responder Daemon (Long Polling)
setlocal enabledelayedexpansion

:: 1. Atur runtime PATH untuk Node.js v20 jika tersedia di scratch folder
if exist "C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\nodejs\node-v20.18.0-win-x64" (
  set "PATH=C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\nodejs\node-v20.18.0-win-x64;%PATH%"
)

:: 2. Navigasi ke direktori root proyek tatadana
cd /d "%~dp0.."
if not exist "scripts\telegram-daemon.mjs" (
  cd /d "C:\Users\Laptop Acer Nitro 5\.gemini\antigravity\scratch\tatadana"
)

echo ==============================================================================
echo   TATADANA FINTECH SAAS - BACKGROUND TELEGRAM BOT AUTO-RESPONDER
echo ==============================================================================
echo  Service: Telegram Long-Polling Daemon (scripts/telegram-daemon.mjs)
echo  Mode: Pure Long-Polling (HTTP Timeout: 25 detik)
echo  Forward Target: http://localhost:3000/api/telegram/webhook
echo  Offset Tracking: .telegram-offset.json
echo  Auto-Restart: AKTIF (Recover otomatis jika daemon terminated)
echo  Tekan Ctrl+C untuk menghentikan daemon.
echo ==============================================================================
echo.

:LOOP
node scripts/telegram-daemon.mjs
set EXIT_CODE=%ERRORLEVEL%

echo.
echo [DAEMON] Bot process terminated (Exit code: %EXIT_CODE%).
echo [DAEMON] Menunggu 3 detik sebelum restart otomatis...
timeout /t 3 /nobreak >nul
echo [DAEMON] Memulai ulang daemon Telegram...
echo.
GOTO LOOP
