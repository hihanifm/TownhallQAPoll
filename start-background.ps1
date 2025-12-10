# PowerShell script to start both backend and frontend servers in the background
# Usage: .\start-background.ps1 [-Prod]  (use -Prod for production mode)

param(
    [switch]$Prod
)

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if ($Prod) {
    Write-Host "Starting Townhall Q&A Poll servers in PRODUCTION mode..." -ForegroundColor Green
} else {
    Write-Host "Starting Townhall Q&A Poll servers in DEVELOPMENT mode..." -ForegroundColor Green
}
Write-Host ""

# Check if servers are already running
$backendProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*server.js*" }
$frontendProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" }

if ($backendProcess -or $frontendProcess) {
    Write-Host "Warning: Servers may already be running!" -ForegroundColor Yellow
    Write-Host "Use stop-background.ps1 to stop them first." -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Continue anyway? (y/n)"
    if ($response -ne "y") {
        exit
    }
}

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:scriptDir\backend
    npm start
}

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend server
Write-Host "Starting frontend server..." -ForegroundColor Cyan

if ($Prod) {
    Write-Host "Building frontend for production..." -ForegroundColor Yellow
    Set-Location "$scriptDir\frontend"
    $buildResult = npm run build 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Frontend build failed!" -ForegroundColor Red
        Write-Host $buildResult -ForegroundColor Red
        exit 1
    }
    Write-Host "Starting frontend production server..." -ForegroundColor Cyan
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:scriptDir\frontend
        npm run preview
    }
} else {
    Write-Host "Starting frontend development server..." -ForegroundColor Cyan
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:scriptDir\frontend
        npm run dev
    }
}

# Save job IDs to file for stopping later
$jobsFile = Join-Path $scriptDir "server-jobs.txt"
"$($backendJob.Id),$($frontendJob.Id)" | Out-File -FilePath $jobsFile -Encoding ASCII

Write-Host ""
Write-Host "Servers started in background!" -ForegroundColor Green
if ($Prod) {
    Write-Host "  Mode: PRODUCTION (optimized build)" -ForegroundColor Yellow
} else {
    Write-Host "  Mode: DEVELOPMENT (hot reload enabled)" -ForegroundColor Yellow
}
Write-Host "Backend: http://localhost:3001" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop the servers, run: .\stop-background.ps1" -ForegroundColor Cyan
Write-Host "Or check status with: Get-Job" -ForegroundColor Cyan
if (-not $Prod) {
    Write-Host ""
    Write-Host "To start in production mode, run: .\start-background.ps1 -Prod" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Note: This window can be closed. Servers will continue running." -ForegroundColor Gray
