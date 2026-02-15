@echo off
setlocal

echo Starting Visit Platform services...

REM Set environment variables from .env file
for /f "tokens=*" %%i in ('type ".env" ^| findstr /v "^#"') do (
    for /f "delims== tokens=1,2" %%a in ("%%i") do (
        set "%%a=%%b"
    )
)

REM Start the API server in a new window
echo Starting API server...
start "Visit Platform API" cmd /k "cd /d %~dp0api && go run main.go"

REM Wait a moment for the API to start
timeout /t 3 /nobreak >nul

REM Start the bot in a new window (always start to monitor database for bot tokens)
echo Starting Bot Service (monitoring for visit cards with bot tokens)...
start "Visit Platform Bot" cmd /k "cd /d %~dp0bot && go run main.go"

REM Start the frontend in a new window
echo Starting Frontend...
start "Visit Platform Frontend" cmd /k "cd /d %~dp0frontend && set PORT=3000 && npm start"

echo.
echo All services started!
echo - API: http://localhost:8080
echo - Frontend: http://localhost:3000
echo.
echo Press Ctrl+C in each window to stop individual services.
pause