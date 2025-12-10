@echo off
echo Installing dependencies for Townhall Q&A Poll...
echo.
echo Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo Backend installation failed!
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo Frontend installation failed!
    pause
    exit /b 1
)

cd ..
echo.
echo Installation complete!
echo.
echo To run the application:
echo 1. Double-click start-backend.bat (in one window)
echo 2. Double-click start-frontend.bat (in another window)
echo 3. Open http://localhost:3000 in your browser
echo.
pause
